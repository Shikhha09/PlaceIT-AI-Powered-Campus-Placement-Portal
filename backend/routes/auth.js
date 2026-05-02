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

  const crypto = require("crypto");
  const verifyToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    name, email, password, role,
    emailVerified: false,
    emailVerifyToken: verifyToken,
    ...(role === "student" && { branch, cgpa, graduationYear }),
    ...(role === "company" && { companyName, industry }),
  });

  // Send verification email
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  const { sendEmail } = require("../services/emailService");
  await sendEmail({
    to: user.email,
    subject: "Verify your PlaceIT email",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#2563eb">Verify Your Email ✅</h2>
        <p>Hi <strong>${user.name}</strong>, welcome to PlaceIT!</p>
        <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px">After verifying, your account will be reviewed by the admin for approval.</p>
        <hr/>
        <small style="color:#888">PlaceIT — AI-Powered Campus Placement Portal</small>
      </div>`,
  });

  await log({ actor: user._id, actorRole: role, action: "USER_REGISTERED", entity: "User", entityId: user._id });

  res.status(201).json({
    message: "Registration successful. Please check your email to verify your account.",
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
  const userObj = user.toObject();
  // Don't send full resumeText to frontend — just a flag
  userObj.resumeText = user.resumeText ? true : false;
  res.json({ user: userObj });
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

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = await User.findOne({ email });
  // Always return success — don't reveal if email exists (security)
  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  // Generate secure random token
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetToken = token;
  user.resetTokenExpiry = expiry;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const { sendEmail } = require("../services/emailService");
  await sendEmail({
    to: user.email,
    subject: "Reset Your PlaceIT Password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#2563eb">Reset Your Password</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>You requested a password reset. Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px">If you didn't request this, ignore this email. Your password won't change.</p>
        <hr/>
        <small style="color:#888">PlaceIT — AI-Powered Campus Placement Portal</small>
      </div>`,
  });

  res.json({ message: "If that email exists, a reset link has been sent." });
});

// ─── POST /api/auth/reset-password/:token ────────────────────────────────────
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpiry: { $gt: new Date() }, // not expired
  });

  if (!user) {
    return res.status(400).json({ error: "Reset link is invalid or has expired. Request a new one." });
  }

  // Update password and clear token
  user.password = password;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: "Password reset successfully. You can now log in." });
});

// ─── GET /api/auth/verify-email/:token ───────────────────────────────────────
router.get("/verify-email/:token", async (req, res) => {
  const user = await User.findOne({ emailVerifyToken: req.params.token });

  if (!user) {
    return res.status(400).json({ error: "Verification link is invalid or already used." });
  }

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ message: "Email verified successfully! Your account is now pending admin approval." });
});