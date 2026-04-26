const express = require("express");
const router = express.Router();
const Interview = require("../models/Interview");
const Application = require("../models/Application");
const { protect, authorize } = require("../middleware/auth");
const { sendEmail, emailTemplates } = require("../services/emailService");
const { log } = require("../utils/activityLogger");

// ─── POST /api/interviews — Company schedules an interview ───────────────────
router.post("/", protect, authorize("company"), async (req, res) => {
  const { applicationId, scheduledAt, mode, meetLink, venue, round, duration } = req.body;

  const application = await Application.findById(applicationId)
    .populate("student", "name email")
    .populate("job", "title company");

  if (!application) return res.status(404).json({ error: "Application not found." });

  // Verify company owns this job
  if (application.job.company.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Not authorized." });
  }

  if (!["shortlisted", "interviewed"].includes(application.status)) {
    return res.status(400).json({ error: "Student must be shortlisted before scheduling interview." });
  }

  const interview = await Interview.create({
    application: applicationId,
    student: application.student._id,
    company: req.user._id,
    job: application.job._id,
    scheduledAt,
    mode,
    meetLink,
    venue,
    round: round || "technical",
    duration: duration || 60,
  });

  // Update application status to interviewed
  application.status = "interviewed";
  application.statusHistory.push({ status: "interviewed", changedBy: req.user._id });
  await application.save();

  // Socket + Email notification
  req.app.get("io").to(application.student._id.toString()).emit("notification", {
    type: "interview_scheduled",
    message: `Interview scheduled for ${application.job.title} on ${new Date(scheduledAt).toLocaleDateString()}`,
    interviewId: interview._id,
  });

  const tpl = emailTemplates.interviewScheduled(
    application.student.name,
    application.job.title,
    req.user.companyName,
    scheduledAt, mode, meetLink, venue
  );
  await sendEmail({ to: application.student.email, ...tpl });

  await log({
    actor: req.user._id, actorRole: "company", action: "INTERVIEW_SCHEDULED",
    entity: "Interview", entityId: interview._id,
    meta: { studentName: application.student.name, scheduledAt, mode },
  });

  res.status(201).json({ interview, message: "Interview scheduled successfully." });
});

// ─── GET /api/interviews/student — Student sees their interviews ──────────────
router.get("/student", protect, authorize("student"), async (req, res) => {
  const interviews = await Interview.find({ student: req.user._id })
    .populate("company", "companyName")
    .populate("job", "title ctc location")
    .sort({ scheduledAt: 1 });

  res.json({ interviews });
});

// ─── GET /api/interviews/company — Company sees all their interviews ──────────
router.get("/company", protect, authorize("company"), async (req, res) => {
  const interviews = await Interview.find({ company: req.user._id })
    .populate("student", "name email branch cgpa")
    .populate("job", "title")
    .sort({ scheduledAt: 1 });

  res.json({ interviews });
});

// ─── PATCH /api/interviews/:id — Update interview status or add feedback ──────
router.patch("/:id", protect, authorize("company", "admin"), async (req, res) => {
  const { status, feedback } = req.body;
  const interview = await Interview.findById(req.params.id)
    .populate("student", "name email")
    .populate("job", "title");

  if (!interview) return res.status(404).json({ error: "Interview not found." });

  if (req.user.role === "company" && interview.company.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Not authorized." });
  }

  if (status) interview.status = status;
  if (feedback) interview.feedback = feedback;
  await interview.save();

  // If cancelled, notify student
  if (status === "cancelled") {
    req.app.get("io").to(interview.student._id.toString()).emit("notification", {
      type: "interview_cancelled",
      message: `Your interview for ${interview.job.title} has been cancelled.`,
    });
  }

  await log({
    actor: req.user._id, actorRole: req.user.role, action: "INTERVIEW_UPDATED",
    entity: "Interview", entityId: interview._id, meta: { status, feedback },
  });

  res.json({ interview });
});

// ─── GET /api/interviews/:id — Single interview detail ───────────────────────
router.get("/:id", protect, async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate("student", "name email branch cgpa")
    .populate("company", "companyName")
    .populate("job", "title ctc location");

  if (!interview) return res.status(404).json({ error: "Interview not found." });
  res.json({ interview });
});

module.exports = router;
