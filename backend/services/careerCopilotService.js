// Calls the private FastAPI service for the LLM features. The browser never talks
// to the LLM (or to FastAPI); this module is the only bridge.
const axios = require("axios");
const { AI_BASE, aiHeaders } = require("./aiService");

class CopilotError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = "CopilotError";
    this.status = status;
  }
}

// Translate every failure into a safe, user-facing message. We deliberately do
// not forward upstream error bodies (they can contain provider details).
const call = async (path, body, timeout = 50000) => {
  try {
    const res = await axios.post(`${AI_BASE}${path}`, body, { timeout, headers: aiHeaders() });
    return res.data;
  } catch (err) {
    const upstream = err.response?.status;
    console.warn(`Copilot call ${path} failed (${upstream || err.code || err.message})`); // no payloads in logs
    if (upstream === 429) {
      throw new CopilotError("The AI assistant is busy right now. Please try again in a minute.", 429);
    }
    if (!err.response || upstream === 503 || upstream === 504) {
      throw new CopilotError(
        "The AI assistant is temporarily unavailable. Your skill-match results are still accurate.",
        503
      );
    }
    throw new CopilotError("The AI assistant couldn't produce a valid answer. Please try again.", 502);
  }
};

const jobPayload = (job) => ({
  title: job.title,
  description: job.description,
  requiredSkills: job.requiredSkills || [],
});

const studyPlan = ({ job, matchedSkills, missingSkills, days, focus }) =>
  call("/study-plan", { job: jobPayload(job), matchedSkills, missingSkills, days, focus: focus || "" });

const interviewQuestions = ({ job, matchedSkills, missingSkills, count }) =>
  call("/interview-questions", { job: jobPayload(job), matchedSkills, missingSkills, count });

const extractSkills = ({ resumeText, vocabulary }) =>
  call("/extract-skills", { resumeText, vocabulary });

const chat = ({ message, history, context }) => call("/chat", { message, history, context });

module.exports = { CopilotError, studyPlan, interviewQuestions, extractSkills, chat };
