const axios = require("axios");

const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Fallback scorer when AI service is down
// Ranks by CGPA + skill overlap — simple but fair
const fallbackRank = (candidates, job) => {
  const requiredSkills = (job.requiredSkills || []).map((s) => s.toLowerCase());

  return candidates
    .map((c) => {
      const studentSkills = (c.skills || []).map((s) => s.toLowerCase());
      const matched = requiredSkills.filter((s) => studentSkills.includes(s));
      const skillScore = requiredSkills.length
        ? Math.round((matched.length / requiredSkills.length) * 100)
        : 0;
      const cgpaScore = Math.round(((c.cgpa || 0) / 10) * 100);
      const finalScore = Math.round(skillScore * 0.5 + cgpaScore * 0.5);

      return {
        applicationId: c.applicationId,
        studentId: c.studentId,
        name: c.name,
        score: finalScore,
        fallback: true, // flag so frontend can show notice
        breakdown: {
          skillMatch: skillScore,
          cgpaScore: cgpaScore,
          mlConfidence: null,
        },
      };
    })
    .sort((a, b) => b.score - a.score);
};

// Call FastAPI to rank applicants — falls back gracefully if service is down
const shortlistCandidates = async (candidates, job) => {
  try {
    const response = await axios.post(
      `${AI_BASE}/shortlist`,
      { candidates, job },
      { timeout: 30000 }
    );
    return { ranked: response.data.ranked, usedFallback: false };
  } catch (err) {
    console.warn(`⚠️ AI Service unavailable (${err.message}) — using fallback ranker`);
    return {
      ranked: fallbackRank(candidates, job),
      usedFallback: true,
    };
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
