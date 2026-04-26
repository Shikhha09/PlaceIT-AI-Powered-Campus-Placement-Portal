const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const ActivityLog = require("../models/ActivityLog");
const { protect, authorize } = require("../middleware/auth");

// All admin routes require admin role
router.use(protect, authorize("admin"));

// ─── GET /api/admin/analytics — Full placement analytics ─────────────────────
router.get("/analytics", async (req, res) => {
  const [
    totalStudents, totalCompanies, totalJobs, totalApplications,
    statusBreakdown, branchStats, offerStats, recentActivity,
  ] = await Promise.all([
    User.countDocuments({ role: "student", isApproved: true }),
    User.countDocuments({ role: "company", isApproved: true }),
    Job.countDocuments({ isActive: true }),
    Application.countDocuments(),

    // Application status funnel
    Application.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Branch-wise placement rate
    Application.aggregate([
      { $match: { status: "offered" } },
      { $lookup: { from: "users", localField: "student", foreignField: "_id", as: "studentData" } },
      { $unwind: "$studentData" },
      { $group: { _id: "$studentData.branch", placed: { $sum: 1 } } },
    ]),

    // Offers by company
    Application.aggregate([
      { $match: { status: "offered" } },
      { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "jobData" } },
      { $unwind: "$jobData" },
      { $lookup: { from: "users", localField: "jobData.company", foreignField: "_id", as: "companyData" } },
      { $unwind: "$companyData" },
      { $group: { _id: "$companyData.companyName", offers: { $sum: 1 } } },
      { $sort: { offers: -1 } },
      { $limit: 10 },
    ]),

    // Recent 10 activity logs
    ActivityLog.find().sort({ createdAt: -1 }).limit(10)
      .populate("actor", "name role"),
  ]);

  // Build funnel map
  const funnelMap = {};
  statusBreakdown.forEach((s) => { funnelMap[s._id] = s.count; });

  res.json({
    overview: { totalStudents, totalCompanies, totalJobs, totalApplications },
    funnel: {
      applied: funnelMap.applied || 0,
      under_review: funnelMap.under_review || 0,
      shortlisted: funnelMap.shortlisted || 0,
      interviewed: funnelMap.interviewed || 0,
      offered: funnelMap.offered || 0,
      rejected: funnelMap.rejected || 0,
    },
    branchStats,
    offersByCompany: offerStats,
    recentActivity,
  });
});

// ─── GET /api/admin/users — All users with filters ───────────────────────────
router.get("/users", async (req, res) => {
  const { role, isApproved, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isApproved !== undefined) query.isApproved = isApproved === "true";

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select("-password -resumeText")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ users, total, pages: Math.ceil(total / limit) });
});

// ─── GET /api/admin/activity-logs — Audit trail ───────────────────────────────
router.get("/activity-logs", async (req, res) => {
  const { page = 1, limit = 50, action, actorRole } = req.query;
  const query = {};
  if (action) query.action = action;
  if (actorRole) query.actorRole = actorRole;

  const total = await ActivityLog.countDocuments(query);
  const logs = await ActivityLog.find(query)
    .populate("actor", "name email role")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ logs, total, pages: Math.ceil(total / limit) });
});

// ─── GET /api/admin/export/applications.csv ───────────────────────────────────
router.get("/export/applications.csv", async (req, res) => {
  const applications = await Application.find()
    .populate("student", "name email branch cgpa")
    .populate({ path: "job", populate: { path: "company", select: "companyName" } });

  const header = "Student Name,Email,Branch,CGPA,Job Title,Company,Status,AI Score,Applied At\n";
  const rows = applications.map((a) =>
    [
      a.student?.name || "",
      a.student?.email || "",
      a.student?.branch || "",
      a.student?.cgpa || "",
      a.job?.title || "",
      a.job?.company?.companyName || "",
      a.status,
      a.aiScore !== null ? a.aiScore : "",
      new Date(a.createdAt).toLocaleDateString("en-IN"),
    ].join(",")
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=applications.csv");
  res.send(header + rows);
});

// ─── GET /api/admin/export/activity-logs.csv ─────────────────────────────────
router.get("/export/activity-logs.csv", async (req, res) => {
  const logs = await ActivityLog.find()
    .populate("actor", "name email role")
    .sort({ createdAt: -1 })
    .limit(5000);

  const header = "Actor Name,Email,Role,Action,Entity,Timestamp\n";
  const rows = logs.map((l) =>
    [
      l.actor?.name || "",
      l.actor?.email || "",
      l.actorRole,
      l.action,
      l.entity || "",
      new Date(l.createdAt).toLocaleString("en-IN"),
    ].join(",")
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=activity-logs.csv");
  res.send(header + rows);
});

// ─── PATCH /api/admin/users/:id/toggle — Activate/deactivate user ────────────
router.patch("/users/:id/toggle", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}.`, isActive: user.isActive });
});

module.exports = router;
