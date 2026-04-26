const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { log } = require("../utils/activityLogger");

// ─── GET /api/jobs — Browse all active jobs (with filters + pagination) ───────
router.get("/", protect, async (req, res) => {
  const { page = 1, limit = 10, search, branch, jobType, minCTC } = req.query;
  const query = { isActive: true, deadline: { $gte: new Date() } };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { requiredSkills: { $regex: search, $options: "i" } },
    ];
  }
  if (jobType) query.jobType = jobType;

  // If student — auto-filter by eligibility
  if (req.user.role === "student") {
    query.minCGPA = { $lte: req.user.cgpa || 0 };
    query.$or = [
      { allowedBranches: "ALL" },
      { allowedBranches: req.user.branch },
    ];
  }

  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate("company", "companyName industry location")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    jobs,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /api/jobs/recommended — AI-style recommendations for student ─────────
router.get("/recommended", protect, authorize("student"), async (req, res) => {
  const student = await User.findById(req.user._id);
  if (!student.skills?.length) {
    return res.json({ jobs: [], message: "Add skills to your profile to get recommendations." });
  }

  const jobs = await Job.find({
    isActive: true,
    deadline: { $gte: new Date() },
    minCGPA: { $lte: student.cgpa || 0 },
    $or: [{ allowedBranches: "ALL" }, { allowedBranches: student.branch }],
  }).populate("company", "companyName industry");

  // Score each job by skill overlap
  const scored = jobs.map((job) => {
    const studentSkillsLower = student.skills.map((s) => s.toLowerCase());
    const jobSkillsLower = job.requiredSkills.map((s) => s.toLowerCase());
    const matched = jobSkillsLower.filter((s) => studentSkillsLower.includes(s));
    const matchPct = Math.round((matched.length / jobSkillsLower.length) * 100);
    return { ...job.toObject(), matchPercentage: matchPct, matchedSkills: matched };
  });

  // Sort by match percentage desc, return top 10
  scored.sort((a, b) => b.matchPercentage - a.matchPercentage);

  res.json({ jobs: scored.slice(0, 10) });
});

// ─── GET /api/jobs/:id — Single job detail ────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  const job = await Job.findById(req.params.id).populate("company", "companyName industry website location description");
  if (!job) return res.status(404).json({ error: "Job not found." });

  // If student, check if already applied
  let hasApplied = false;
  if (req.user.role === "student") {
    const app = await Application.findOne({ student: req.user._id, job: job._id });
    hasApplied = !!app;
  }

  res.json({ job, hasApplied });
});

// ─── GET /api/jobs/:id/skill-gap — Skill gap for student ─────────────────────
router.get("/:id/skill-gap", protect, authorize("student"), async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });

  const student = await User.findById(req.user._id);
  const studentSkills = (student.skills || []).map((s) => s.toLowerCase());
  const requiredSkills = job.requiredSkills.map((s) => s.toLowerCase());

  const matched = requiredSkills.filter((s) => studentSkills.includes(s));
  const missing = requiredSkills.filter((s) => !studentSkills.includes(s));
  const matchPercentage = Math.round((matched.length / requiredSkills.length) * 100);

  const cgpaEligible = (student.cgpa || 0) >= job.minCGPA;
  const branchEligible = job.allowedBranches.includes("ALL") || job.allowedBranches.includes(student.branch);

  res.json({
    job: { title: job.title, requiredSkills: job.requiredSkills, minCGPA: job.minCGPA },
    student: { skills: student.skills, cgpa: student.cgpa, branch: student.branch },
    analysis: {
      matchPercentage,
      matchedSkills: matched,
      missingSkills: missing,
      cgpaEligible,
      branchEligible,
      overallEligible: cgpaEligible && branchEligible,
    },
  });
});

// ─── POST /api/jobs — Company posts a new job ─────────────────────────────────
router.post("/", protect, authorize("company"), async (req, res) => {
  const { title, description, requiredSkills, minCGPA, allowedBranches, ctc, location, jobType, deadline } = req.body;

  const job = await Job.create({
    title, description, requiredSkills, minCGPA,
    allowedBranches: allowedBranches || ["ALL"],
    ctc, location, jobType, deadline,
    company: req.user._id,
  });

  await log({ actor: req.user._id, actorRole: "company", action: "JOB_POSTED", entity: "Job", entityId: job._id, meta: { title } });

  // Notify all eligible students via socket
  const io = req.app.get("io");
  const eligibleStudents = await User.find({
    role: "student",
    isApproved: true,
    cgpa: { $gte: minCGPA },
    $or: [{ branch: { $in: allowedBranches || [] } }],
  }).select("_id");

  eligibleStudents.forEach((s) => {
    io.to(s._id.toString()).emit("notification", {
      type: "new_job",
      message: `New job posted: ${title} at ${req.user.companyName}`,
      jobId: job._id,
    });
  });

  res.status(201).json({ job });
});

// ─── PUT /api/jobs/:id — Company updates their job ────────────────────────────
router.put("/:id", protect, authorize("company"), async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, company: req.user._id });
  if (!job) return res.status(404).json({ error: "Job not found or not yours." });

  const allowed = ["title", "description", "requiredSkills", "ctc", "location", "jobType", "deadline", "isActive", "minCGPA", "allowedBranches"];
  allowed.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });

  await job.save();
  await log({ actor: req.user._id, actorRole: "company", action: "JOB_UPDATED", entity: "Job", entityId: job._id });
  res.json({ job });
});

// ─── DELETE /api/jobs/:id — Company deletes their job ────────────────────────
router.delete("/:id", protect, authorize("company", "admin"), async (req, res) => {
  const query = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, company: req.user._id };
  const job = await Job.findOneAndDelete(query);
  if (!job) return res.status(404).json({ error: "Job not found." });

  await log({ actor: req.user._id, actorRole: req.user.role, action: "JOB_DELETED", entity: "Job", entityId: job._id });
  res.json({ message: "Job deleted." });
});

// ─── GET /api/jobs/company/mine — Company sees their own jobs ─────────────────
router.get("/company/mine", protect, authorize("company"), async (req, res) => {
  const jobs = await Job.find({ company: req.user._id }).sort({ createdAt: -1 });
  res.json({ jobs });
});

module.exports = router;
