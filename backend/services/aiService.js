const axios = require("axios");

const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Call FastAPI to rank applicants for a job
const shortlistCandidates = async (candidates, job) => {
  try {
    const response = await axios.post(
      `${AI_BASE}/shortlist`,
      { candidates, job },
      { timeout: 30000 } // 30 seconds for ML inference
    );
    return response.data.ranked;
  } catch (err) {
    console.error("AI Service error:", err.message);
    throw new Error("AI service unavailable. Please try again later.");
  }
};

// Check AI service health
const checkAIHealth = async () => {
  try {
    const res = await axios.get(`${AI_BASE}/health`, { timeout: 5000 });
    return res.data;
  } catch {
    return { status: "unavailable" };
  }
};

module.exports = { shortlistCandidates, checkAIHealth };
