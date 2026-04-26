from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from scorer import rank_candidates
from resume_parser import parse_resume_from_url

app = FastAPI(title="Campus Placement AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
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
    fileUrl: str
    fileType: str

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "campus-placement-ai", "version": "1.0.0"}


@app.post("/shortlist")
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


@app.post("/parse-resume")
async def parse_resume(payload: ParseResumeRequest):
    try:
        text = await parse_resume_from_url(payload.fileUrl, payload.fileType)
        return {"text": text, "length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
