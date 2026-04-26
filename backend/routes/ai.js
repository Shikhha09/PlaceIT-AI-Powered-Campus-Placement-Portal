const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { shortlistCandidates, checkAIHealth } = require("../services/aiService");
const { log } = require("../utils/activityLogger");

// ─── GET /api/ai/health — Check AI service status ────────────────────────────
router.get("/health", protect, async (req, res) => {
  const health = await checkAIHealth();
  res.json(health);
});

// ─── POST /api/ai/shortlist/:jobId — Rank all applicants for a job ────────────
router.post("/shortlist/:jobId", protect, authorize("company", "admin"), async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });

  // Company can only shortlist for their own jobs
  if (req.user.role === "company" && job.company.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Not authorized." });
  }

  // Get all non-final applications for this job (can re-run shortlisting)
  const applications = await Application.find({
    job: req.params.jobId,
    status: { $nin: ["offered", "rejected"] },
  }).populate("student", "name email branch cgpa skills resumeText experience");

  if (!applications.length) {
    return res.status(400).json({ error: "No applications found for this job. All may be offered or rejected." });
  }

  // Build candidate payload for AI service
  const candidates = applications.map((app) => ({
    applicationId: app._id.toString(),
    studentId: app.student._id.toString(),
    name: app.student.name,
    cgpa: app.student.cgpa || 0,
    skills: app.student.skills || [],
    experience: app.student.experience || 0,
    resumeText: app.student.resumeText || "",
  }));

  const jobPayload = {
    title: job.title,
    description: job.description,
    requiredSkills: job.requiredSkills,
    minCGPA: job.minCGPA,
  };

  // Call FastAPI AI service
  const ranked = await shortlistCandidates(candidates, jobPayload);

  // Save AI scores back to applications
  const updatePromises = ranked.map((r) =>
    Application.findByIdAndUpdate(r.applicationId, {
      aiScore: r.score,
      aiBreakdown: r.breakdown,
      status: "under_review",
    })
  );
  await Promise.all(updatePromises);

  await log({
    actor: req.user._id, actorRole: req.user.role, action: "AI_SHORTLIST_TRIGGERED",
    entity: "Job", entityId: job._id,
    meta: { totalCandidates: candidates.length, jobTitle: job.title },
  });

  res.json({
    message: `AI ranked ${ranked.length} candidates.`,
    ranked,
  });
});

module.exports = router;
