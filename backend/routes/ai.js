const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const router = express.Router();
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { shortlistCandidates, checkAIHealth } = require("../services/aiService");
const { log } = require("../utils/activityLogger");
const copilot = require("../services/careerCopilotService");
const { computeSkillGap, skillKey } = require("../utils/skills");
const { buildChatContext } = require("../services/chatContextService");

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

  // Call FastAPI AI service (with automatic fallback)
  const { ranked, usedFallback } = await shortlistCandidates(candidates, jobPayload);

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
    meta: { totalCandidates: candidates.length, jobTitle: job.title, usedFallback },
  });

  res.json({
    message: usedFallback
      ? `Ranked ${ranked.length} candidates using fallback (AI service unavailable).`
      : `AI ranked ${ranked.length} candidates.`,
    ranked,
    usedFallback,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AI Career Copilot (student-facing, LLM-powered)
//
//  Rules baked into every route below:
//   - identity comes from the verified JWT (req.user), never from the request body
//   - request bodies are validated with zod; unknown fields (e.g. studentId) are rejected
//   - matched/missing skills are computed HERE, deterministically; the LLM only
//     explains and plans around them
//   - strict per-user rate limits protect cost and abuse
// ═══════════════════════════════════════════════════════════════════════════════
const perUserKey = (req) => String(req.user._id);
const limitMsg = { error: "You're using the AI assistant too quickly. Please wait a moment." };

const copilotPerMinute = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.COPILOT_RATE_PER_MIN) || 8,
  keyGenerator: perUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMsg,
});
const copilotDaily = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: Number(process.env.COPILOT_DAILY_CAP) || 40,
  keyGenerator: perUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You've reached today's AI assistant limit. Try again tomorrow." },
});
const copilotGuards = [protect, authorize("student"), copilotPerMinute, copilotDaily];

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
const studyPlanSchema = z
  .object({
    jobId: objectId,
    days: z.union([z.literal(7), z.literal(14)]).default(7),
    focus: z.string().trim().max(200).optional(),
  })
  .strict();
const questionsSchema = z
  .object({ jobId: objectId, count: z.number().int().min(3).max(8).default(5) })
  .strict();
const emptySchema = z.object({}).strict();

const validate = (schema, body, res) => {
  const parsed = schema.safeParse(body ?? {});
  if (parsed.success) return parsed.data;
  res.status(400).json({
    error: "Invalid request.",
    details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
  });
  return null;
};

// Load an active job + the caller's own profile and compute the verified gap.
const loadGapContext = async (req, res, jobId) => {
  const [job, student] = await Promise.all([
    Job.findOne({ _id: jobId, isActive: true }).select("title description requiredSkills"),
    User.findById(req.user._id).select("skills"),
  ]);
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return null;
  }
  return { job, gap: computeSkillGap(student?.skills, job.requiredSkills) };
};

// Run a copilot task, turn failures into safe responses, and log metadata only.
const runCopilotTask = async (req, res, task, entityId, fn, extraMeta = {}) => {
  try {
    const result = await fn();
    await log({
      actor: req.user._id, actorRole: "student", action: "AI_COPILOT_USED",
      entity: entityId ? "Job" : "User", entityId: entityId || req.user._id,
      meta: { task, ...(result.meta || {}), ...extraMeta, flags: result.flags || [] }, // never prompts, chat text or resume text
    });
    return result;
  } catch (err) {
    if (err instanceof copilot.CopilotError) {
      res.status(err.status).json({ error: err.message });
      return null;
    }
    throw err;
  }
};

// ─── POST /api/ai/copilot/study-plan ─────────────────────────────────────────
router.post("/copilot/study-plan", ...copilotGuards, async (req, res) => {
  const input = validate(studyPlanSchema, req.body, res);
  if (!input) return;
  const ctx = await loadGapContext(req, res, input.jobId);
  if (!ctx) return;

  const result = await runCopilotTask(req, res, "study_plan", ctx.job._id, () =>
    copilot.studyPlan({ job: ctx.job, ...ctx.gap, days: input.days, focus: input.focus })
  );
  if (!result) return;

  res.json({
    task: "study_plan",
    job: { id: ctx.job._id, title: ctx.job.title },
    gap: { matchedSkills: ctx.gap.matchedSkills, missingSkills: ctx.gap.missingSkills },
    plan: result.plan,
  });
});

// ─── POST /api/ai/copilot/interview-questions ────────────────────────────────
router.post("/copilot/interview-questions", ...copilotGuards, async (req, res) => {
  const input = validate(questionsSchema, req.body, res);
  if (!input) return;
  const ctx = await loadGapContext(req, res, input.jobId);
  if (!ctx) return;

  const result = await runCopilotTask(req, res, "interview_questions", ctx.job._id, () =>
    copilot.interviewQuestions({ job: ctx.job, ...ctx.gap, count: input.count })
  );
  if (!result) return;

  res.json({
    task: "interview_questions",
    job: { id: ctx.job._id, title: ctx.job.title },
    questions: result.questions,
  });
});

// ─── POST /api/ai/copilot/extract-skills ─────────────────────────────────────
// Suggests skills from the student's OWN parsed resume. It never writes to the
// profile: the student reviews the suggestions and saves them herself.
router.post("/copilot/extract-skills", ...copilotGuards, async (req, res) => {
  if (!validate(emptySchema, req.body, res)) return;

  const student = await User.findById(req.user._id).select("skills resumeText");
  if (!student?.resumeText?.trim()) {
    return res.status(400).json({ error: "Upload a resume with readable text first." });
  }

  // Canonical spellings already used by job posts, so extracted skills match them.
  const vocabulary = (await Job.distinct("requiredSkills", { isActive: true })).slice(0, 200);

  const result = await runCopilotTask(req, res, "extract_skills", null, () =>
    copilot.extractSkills({ resumeText: student.resumeText, vocabulary })
  );
  if (!result) return;

  const have = new Set((student.skills || []).map(skillKey));
  res.json({
    suggestions: result.skills.map((s) => ({
      name: s.name,
      evidence: s.evidence,
      alreadyInProfile: have.has(skillKey(s.name)),
    })),
  });
});

// ─── POST /api/ai/copilot/chat ───────────────────────────────────────────────
// Free-text conversation. The browser keeps the transcript and sends the recent part
// with each message, so history is isolated per browser session and nothing is stored
// server-side yet (conversationId is reserved for MongoDB persistence later).
// The history is UNTRUSTED (a student can edit it), so it is validated, capped and
// passed to the model as quoted transcript data, never as trusted instructions.
const HISTORY_MAX_MESSAGES = 10;
const HISTORY_MAX_CHARS_EACH = 2500;
const HISTORY_MAX_CHARS_TOTAL = 12000;

const chatSchema = z
  .object({
    message: z.string().trim().min(1, "Message cannot be empty.").max(2000, "Message is too long (max 2000 characters)."),
    conversationHistory: z
      .array(
        z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }).strict()
      )
      .max(40)
      .default([]),
    jobId: objectId.nullish(),
    contextMode: z.enum(["general", "personalized"]).default("general"),
  })
  .strict();

// Keep the most recent, size-bounded part of the transcript, in order, and make sure the
// new message is not sent twice (a retry can leave it as the last history entry).
const prepareHistory = (history, message) => {
  let items = history
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, HISTORY_MAX_CHARS_EACH) }))
    .filter((m) => m.content.length > 0);
  const last = items[items.length - 1];
  if (last && last.role === "user" && last.content === message.trim().slice(0, HISTORY_MAX_CHARS_EACH)) {
    items = items.slice(0, -1);
  }
  items = items.slice(-HISTORY_MAX_MESSAGES);
  let total = 0;
  const kept = [];
  for (let i = items.length - 1; i >= 0; i--) { // newest first, drop the oldest when over budget
    total += items[i].content.length;
    if (total > HISTORY_MAX_CHARS_TOTAL) break;
    kept.unshift(items[i]);
  }
  return kept;
};

router.post("/copilot/chat", ...copilotGuards, async (req, res) => {
  const input = validate(chatSchema, req.body, res);
  if (!input) return;

  const history = prepareHistory(input.conversationHistory, input.message);

  // Identity is always req.user (verified JWT). Only data this message needs is loaded.
  const ctx = await buildChatContext({
    userId: req.user._id,
    message: input.message,
    jobId: input.jobId,
    contextMode: input.contextMode,
  });
  if (ctx.jobMissing) return res.status(404).json({ error: "Job not found." });

  const result = await runCopilotTask(
    req, res, "chat", input.jobId || null,
    () => copilot.chat({ message: input.message, history, context: ctx.data }),
    { contextUsed: ctx.used }
  );
  if (!result) return;

  const reply = typeof result.reply === "string" ? result.reply.trim() : "";
  if (!reply || reply.length > 12000) {
    return res.status(502).json({ error: "The AI assistant couldn't produce a valid answer. Please try again." });
  }

  res.json({
    success: true,
    reply,
    conversationId: null,
    timestamp: new Date().toISOString(),
    contextUsed: ctx.used, // tells the UI what PlaceIT data informed this answer
  });
});

module.exports = router;
