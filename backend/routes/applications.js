const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { sendEmail, emailTemplates } = require("../services/emailService");
const { sendWhatsApp, whatsappTemplates } = require("../services/whatsappService");
const { log } = require("../utils/activityLogger");

// ─── POST /api/applications — Student applies to a job ───────────────────────
router.post("/", protect, authorize("student"), async (req, res) => {
  const { jobId, coverNote } = req.body;

  const job = await Job.findById(jobId).populate("company", "companyName");
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (!job.isActive || job.deadline < new Date()) {
    return res.status(400).json({ error: "This job is no longer accepting applications." });
  }

  const student = await User.findById(req.user._id);

  // Eligibility check
  if (student.cgpa < job.minCGPA) {
    return res.status(400).json({ error: `Your CGPA (${student.cgpa}) is below the required ${job.minCGPA}.` });
  }
  if (!job.allowedBranches.includes("ALL") && !job.allowedBranches.includes(student.branch)) {
    return res.status(400).json({ error: `Your branch (${student.branch}) is not eligible for this job.` });
  }

  // Check duplicate application
  const existing = await Application.findOne({ student: req.user._id, job: jobId });
  if (existing) return res.status(409).json({ error: "You have already applied to this job." });

  const application = await Application.create({
    student: req.user._id,
    job: jobId,
    coverNote,
    statusHistory: [{ status: "applied", changedBy: req.user._id }],
  });

  // Increment applicant count
  await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

  // Email confirmation
  const tpl = emailTemplates.applicationReceived(student.name, job.title, job.company.companyName);
  await sendEmail({ to: student.email, ...tpl });

  // Socket notification to company
  req.app.get("io").to(job.company._id.toString()).emit("notification", {
    type: "new_application",
    message: `${student.name} applied to ${job.title}`,
    applicationId: application._id,
  });

  await log({ actor: req.user._id, actorRole: "student", action: "APPLICATION_SUBMITTED", entity: "Application", entityId: application._id, meta: { jobId, jobTitle: job.title } });

  res.status(201).json({ application, message: "Application submitted successfully." });
});

// ─── GET /api/applications/mine — Student sees their applications ─────────────
router.get("/mine", protect, authorize("student"), async (req, res) => {
  const applications = await Application.find({ student: req.user._id })
    .populate({ path: "job", populate: { path: "company", select: "companyName industry" } })
    .sort({ createdAt: -1 });

  res.json({ applications });
});

// ─── GET /api/applications/job/:jobId — Company sees applicants for a job ─────
router.get("/job/:jobId", protect, authorize("company", "admin"), async (req, res) => {
  // Company can only see their own job's applicants
  if (req.user.role === "company") {
    const job = await Job.findOne({ _id: req.params.jobId, company: req.user._id });
    if (!job) return res.status(403).json({ error: "Not authorized to view these applications." });
  }

  const applications = await Application.find({ job: req.params.jobId })
    .populate("student", "name email branch cgpa skills resumeUrl graduationYear experience linkedIn github")
    .sort({ aiScore: -1, createdAt: 1 }); // AI scored first, else by apply date

  res.json({ applications, total: applications.length });
});

// ─── PATCH /api/applications/:id/status — Company updates application status ──
router.patch("/:id/status", protect, authorize("company", "admin"), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["applied", "under_review", "shortlisted", "interviewed", "offered", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const application = await Application.findById(req.params.id)
    .populate("student", "name email phone")
    .populate({ path: "job", populate: { path: "company", select: "companyName" } });

  if (!application) return res.status(404).json({ error: "Application not found." });

  // Company can only update their own job's applications
  if (req.user.role === "company" && application.job.company._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Not authorized." });
  }

  const oldStatus = application.status;
  application.status = status;
  application.statusHistory.push({ status, changedBy: req.user._id });
  await application.save();

  // Notify student via socket + email
  const io = req.app.get("io");
  io.to(application.student._id.toString()).emit("notification", {
    type: "status_update",
    message: `Your application for ${application.job.title} is now: ${status.toUpperCase().replace("_", " ")}`,
    applicationId: application._id,
    status,
  });

  const tpl = emailTemplates.statusUpdated(
    application.student.name,
    application.job.title,
    status,
    application.job.company.companyName
  );
  await sendEmail({ to: application.student.email, ...tpl });

  // WhatsApp notification if student has phone number
  console.log(`📱 Student phone: ${application.student.phone || "not set"}`);
  if (application.student.phone) {
    const msg = whatsappTemplates.statusUpdated(
      application.student.name,
      application.job.title,
      status,
      application.job.company.companyName
    );
    await sendWhatsApp(application.student.phone, msg);
  } else {
    console.log("📱 WhatsApp skipped — student has no phone number saved in profile");
  }

  await log({
    actor: req.user._id, actorRole: req.user.role, action: "STATUS_UPDATED",
    entity: "Application", entityId: application._id,
    meta: { oldStatus, newStatus: status, jobTitle: application.job.title },
  });

  res.json({ application, message: `Status updated to ${status}.` });
});

// ─── GET /api/applications/:id — Single application detail ───────────────────
router.get("/:id", protect, async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate("student", "name email branch cgpa skills resumeUrl")
    .populate({ path: "job", populate: { path: "company", select: "companyName" } });

  if (!application) return res.status(404).json({ error: "Application not found." });

  // Only the student themselves, the company, or admin can view
  const isOwner = application.student._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  const isCompany = req.user.role === "company" && application.job.company._id.toString() === req.user._id.toString();

  if (!isOwner && !isAdmin && !isCompany) {
    return res.status(403).json({ error: "Not authorized." });
  }

  res.json({ application });
});

module.exports = router;
