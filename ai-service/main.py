import logging
import os

# Load ai-service/.env (LLM_API_KEY, AI_SERVICE_API_KEY, ...) when it exists.
# python-dotenv ships with uvicorn[standard]; real environment variables win over the file.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
import uvicorn

from scorer import rank_candidates
from resume_parser import parse_resume_from_url
from security import assert_allowed_file_url, verify_internal_key
from llm import LLMError, get_llm_client
import copilot

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("placeit.ai")

app = FastAPI(title="Campus Placement AI Service", version="1.1.0")

# This service is called server-to-server by the Express backend, never by browsers.
# CORS only matters for local debugging; real protection is the X-Internal-Key header.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.getenv("CORS_ORIGINS", "http://localhost:5000,http://localhost:5173").split(",") if o],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ────────────────────────────────────────────────────────────

class Candidate(BaseModel):
    applicationId: str
    studentId: str
    name: str
    cgpa: float
    skills: List[str]
    experience: int  # months
    resumeText: Optional[str] = ""

class JobPayload(BaseModel):
    title: str
    description: str
    requiredSkills: List[str]
    minCGPA: float

class ShortlistRequest(BaseModel):
    candidates: List[Candidate]
    job: JobPayload

class ParseResumeRequest(BaseModel):
    fileUrl: str = Field(max_length=2048)
    fileType: str = Field(max_length=200)

# ── Career Copilot request models (strict size limits = cost + abuse control) ──
class CopilotJob(BaseModel):
    title: str = Field(max_length=150)
    description: str = Field(max_length=8000)
    requiredSkills: List[str] = Field(max_length=40)

class ExtractSkillsRequest(BaseModel):
    resumeText: str = Field(min_length=1, max_length=60000)
    vocabulary: List[str] = Field(default_factory=list, max_length=300)

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=3000)

class ChatStudent(BaseModel):
    firstName: Optional[str] = Field(default=None, max_length=60)
    skills: List[str] = Field(default_factory=list, max_length=60)
    cgpa: Optional[float] = None
    branch: Optional[str] = Field(default=None, max_length=20)
    graduationYear: Optional[int] = None

class ChatJob(BaseModel):
    title: str = Field(max_length=150)
    company: Optional[str] = Field(default=None, max_length=100)
    description: str = Field(default="", max_length=4000)
    requiredSkills: List[str] = Field(default_factory=list, max_length=40)
    minCGPA: Optional[float] = None
    allowedBranches: List[str] = Field(default_factory=list, max_length=12)
    ctc: Optional[str] = Field(default=None, max_length=40)
    location: Optional[str] = Field(default=None, max_length=80)
    jobType: Optional[str] = Field(default=None, max_length=30)
    deadline: Optional[str] = Field(default=None, max_length=40)

class ChatGap(BaseModel):
    matchedSkills: List[str] = Field(default_factory=list, max_length=60)
    missingSkills: List[str] = Field(default_factory=list, max_length=60)
    matchPercentage: Optional[float] = None

class ChatEligibility(BaseModel):
    cgpaEligible: bool
    branchEligible: bool
    overallEligible: bool

class ChatApplication(BaseModel):
    jobTitle: str = Field(max_length=150)
    company: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(max_length=30)
    appliedAt: Optional[str] = Field(default=None, max_length=40)

class ChatOpenJob(BaseModel):
    title: str = Field(max_length=150)
    company: Optional[str] = Field(default=None, max_length=100)
    jobType: Optional[str] = Field(default=None, max_length=30)
    ctc: Optional[str] = Field(default=None, max_length=40)
    location: Optional[str] = Field(default=None, max_length=80)
    deadline: Optional[str] = Field(default=None, max_length=40)
    requiredSkills: List[str] = Field(default_factory=list, max_length=40)

class ChatContext(BaseModel):
    # Everything here was loaded by the Express backend for the authenticated student.
    student: Optional[ChatStudent] = None
    job: Optional[ChatJob] = None
    gap: Optional[ChatGap] = None
    eligibility: Optional[ChatEligibility] = None
    applications: Optional[List[ChatApplication]] = Field(default=None, max_length=10)
    openJobs: Optional[List[ChatOpenJob]] = Field(default=None, max_length=8)
    resumeExcerpt: Optional[str] = Field(default=None, max_length=4000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[ChatTurn] = Field(default_factory=list, max_length=12)
    context: ChatContext = Field(default_factory=ChatContext)

class StudyPlanRequest(BaseModel):
    job: CopilotJob
    matchedSkills: List[str] = Field(default_factory=list, max_length=60)
    missingSkills: List[str] = Field(default_factory=list, max_length=60)
    days: Literal[7, 14] = 7
    focus: str = Field(default="", max_length=300)

class InterviewQuestionsRequest(BaseModel):
    job: CopilotJob
    matchedSkills: List[str] = Field(default_factory=list, max_length=60)
    missingSkills: List[str] = Field(default_factory=list, max_length=60)
    count: int = Field(default=5, ge=3, le=8)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "campus-placement-ai", "version": "1.1.0"}


@app.post("/shortlist", dependencies=[Depends(verify_internal_key)])
def shortlist(payload: ShortlistRequest):
    if not payload.candidates:
        raise HTTPException(status_code=400, detail="No candidates provided.")

    try:
        ranked = rank_candidates(
            candidates=[c.dict() for c in payload.candidates],
            job=payload.job.dict()
        )
        return {"ranked": ranked, "total": len(ranked)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.post("/parse-resume", dependencies=[Depends(verify_internal_key)])
async def parse_resume(payload: ParseResumeRequest):
    assert_allowed_file_url(payload.fileUrl)  # SSRF guard: only our storage hosts
    try:
        text = await parse_resume_from_url(payload.fileUrl, payload.fileType)
        return {"text": text, "length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


# ── Career Copilot (LLM) ───────────────────────────────────────────────────────
# Logging policy: task, latency, token counts and flags only. Never log resumes,
# job text, prompts or model answers.
def _log_call(task: str, meta: dict, flags: list):
    log.info("copilot task=%s latencyMs=%s model=%s promptTokens=%s outputTokens=%s flags=%s",
             task, meta.get("latencyMs"), meta.get("model"), meta.get("promptTokens"),
             meta.get("outputTokens"), flags)


def _client():
    """Resolve the LLM client, turning config problems into a clean 503."""
    try:
        return get_llm_client()
    except LLMError as e:
        raise HTTPException(status_code=e.status, detail=e.public_message)


@app.post("/extract-skills", dependencies=[Depends(verify_internal_key)])
async def extract_skills(payload: ExtractSkillsRequest, client=Depends(_client)):
    try:
        result, meta = await copilot.extract_skills(client, payload.resumeText, payload.vocabulary)
    except LLMError as e:
        raise HTTPException(status_code=e.status, detail=e.public_message)
    _log_call("extract_skills", meta, result["flags"])
    return {**result, "meta": meta}


@app.post("/study-plan", dependencies=[Depends(verify_internal_key)])
async def study_plan(payload: StudyPlanRequest, client=Depends(_client)):
    try:
        result, meta = await copilot.build_study_plan(
            client, payload.job.model_dump(), payload.matchedSkills, payload.missingSkills,
            payload.days, payload.focus)
    except LLMError as e:
        raise HTTPException(status_code=e.status, detail=e.public_message)
    _log_call("study_plan", meta, result["flags"])
    return {**result, "meta": meta}


@app.post("/interview-questions", dependencies=[Depends(verify_internal_key)])
async def interview_questions(payload: InterviewQuestionsRequest, client=Depends(_client)):
    try:
        result, meta = await copilot.build_interview_questions(
            client, payload.job.model_dump(), payload.matchedSkills, payload.missingSkills,
            payload.count)
    except LLMError as e:
        raise HTTPException(status_code=e.status, detail=e.public_message)
    _log_call("interview_questions", meta, result["flags"])
    return {**result, "meta": meta}


@app.post("/chat", dependencies=[Depends(verify_internal_key)])
async def chat(payload: ChatRequest, client=Depends(_client)):
    try:
        result, meta = await copilot.build_chat_reply(
            client, payload.message,
            [t.model_dump() for t in payload.history],
            payload.context.model_dump(exclude_none=False),
        )
    except LLMError as e:
        raise HTTPException(status_code=e.status, detail=e.public_message)
    _log_call("chat", meta, result["flags"])
    return {**result, "meta": meta}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
