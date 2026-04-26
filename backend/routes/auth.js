const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize, generateToken } = require("../middleware/auth");
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");
const { sendEmail, emailTemplates } = require("../services/emailService");
const { log } = require("../utils/activityLogger");
const axios = require("axios");

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password, role, branch, cgpa, graduationYear, companyName, industry } = req.body;

  if (!["student", "company"].includes(role)) {
    return res.status(400).json({ error: "Role must be student or company." });
  }

  const user = await User.create({
    name, email, password, role,
    ...(role === "student" && { branch, cgpa, graduationYear }),
    ...(role === "company" && { companyName, industry }),
  });

  await log({ actor: user._id, actorRole: role, action: "USER_REGISTERED", entity: "User", entityId: user._id });

  res.status(201).json({
    message: "Registration successful. Awaiting admin approval.",
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });

  if (!user.isApproved) {
    return res.status(403).json({ error: "Your account is pending admin approval." });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "Your account has been deactivated." });
  }

  const token = generateToken(user._id);

  await log({ actor: user._id, actorRole: user.role, action: "USER_LOGIN", entity: "User", entityId: user._id, ip: req.ip });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      ...(user.role === "student" && { branch: user.branch, cgpa: user.cgpa }),
      ...(user.role === "company" && { companyName: user.companyName }),
    },
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
});

// ─── GET /api/auth/pending — Admin sees unapproved users ──────────────────────
router.get("/pending", protect, authorize("admin"), async (req, res) => {
  const pending = await User.find({ isApproved: false, role: { $ne: "admin" } })
    .select("name email role companyName branch cgpa createdAt")
    .sort({ createdAt: -1 });
  res.json({ pending });
});

// ─── PATCH /api/auth/approve/:id — Admin approves/rejects ────────────────────
router.patch("/approve/:id", protect, authorize("admin"), async (req, res) => {
  const { action } = req.body; // "approve" or "reject"
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  if (action === "approve") {
    user.isApproved = true;
    await user.save();

    // Real-time notification + email
    req.app.get("io").to(user._id.toString()).emit("notification", {
      type: "account_approved",
      message: "Your account has been approved! You can now log in.",
    });

    const tpl = emailTemplates.accountApproved(user.name, user.role);
    await sendEmail({ to: user.email, ...tpl });

    await log({ actor: req.user._id, actorRole: "admin", action: "USER_APPROVED", entity: "User", entityId: user._id });
    return res.json({ message: `${user.name} approved successfully.` });
  }

  if (action === "reject") {
    await User.findByIdAndDelete(req.params.id);
    await log({ actor: req.user._id, actorRole: "admin", action: "USER_REJECTED", entity: "User", entityId: user._id });
    return res.json({ message: `${user.name} rejected and removed.` });
  }

  res.status(400).json({ error: "action must be 'approve' or 'reject'." });
});

// ─── PATCH /api/auth/student-profile — Student updates profile ───────────────
router.patch("/student-profile", protect, authorize("student"), async (req, res) => {
  const allowed = ["name", "branch", "cgpa", "graduationYear", "skills", "experience", "linkedIn", "github", "bio"];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  await log({ actor: req.user._id, actorRole: "student", action: "PROFILE_UPDATED", entity: "User", entityId: req.user._id });
  res.json({ user });
});

// ─── PATCH /api/auth/student-resume — Upload resume (multipart) ──────────────
router.patch("/student-resume", protect, authorize("student"), upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  // Delete old resume from Cloudinary if exists
  const existing = await User.findById(req.user._id);
  if (existing.resumePublicId) {
    await deleteFromCloudinary(existing.resumePublicId);
  }

  // Upload new file — pass original filename so extension (.pdf/.docx) is preserved
  const cloudResult = await uploadToCloudinary(req.file.buffer, "resumes", req.file.originalname);

  // Parse resume text by calling AI service
  let resumeText = "";
  try {
    const parseRes = await axios.post(
      `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/parse-resume`,
      { fileUrl: cloudResult.secure_url, fileType: req.file.mimetype },
      { timeout: 20000 }
    );
    resumeText = parseRes.data.text || "";
  } catch {
    console.log("Resume parsing unavailable, storing URL only.");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { resumeUrl: cloudResult.secure_url, resumePublicId: cloudResult.public_id, resumeText },
    { new: true }
  );

  await log({ actor: req.user._id, actorRole: "student", action: "RESUME_UPLOADED", entity: "User", entityId: req.user._id });
  res.json({ resumeUrl: user.resumeUrl, message: "Resume uploaded successfully." });
});

module.exports = router;
