// Route tests for the AI Career Copilot. No MongoDB and no FastAPI needed:
// models, the auth middleware and the AI service client are mocked.
process.env.COPILOT_RATE_PER_MIN = "2"; // must be set before the router is loaded
require("express-async-errors");
const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  // Fake auth: role comes from a test header, user id from another.
  protect: (req, res, next) => {
    if (!req.headers["x-test-user"]) return res.status(401).json({ error: "no token" });
    req.user = { _id: req.headers["x-test-user"], role: req.headers["x-test-role"] || "student" };
    next();
  },
  authorize: (...roles) => (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: "forbidden" }),
}));
jest.mock("../models/Job", () => ({ findOne: jest.fn(), distinct: jest.fn(), findById: jest.fn() }));
jest.mock("../models/User", () => ({ findById: jest.fn() }));
jest.mock("../models/Application", () => ({}));
jest.mock("../utils/activityLogger", () => ({ log: jest.fn().mockResolvedValue() }));
jest.mock("../services/careerCopilotService", () => {
  class CopilotError extends Error {
    constructor(m, status = 503) { super(m); this.status = status; }
  }
  return { CopilotError, studyPlan: jest.fn(), interviewQuestions: jest.fn(), extractSkills: jest.fn() };
});

const Job = require("../models/Job");
const User = require("../models/User");
const { log } = require("../utils/activityLogger");
const copilot = require("../services/careerCopilotService");

const JOB_ID = "64b7f0f0f0f0f0f0f0f0f0f0";
const job = { _id: JOB_ID, title: "Backend Intern", description: "Node + Docker", requiredSkills: ["Node.js", "Docker", "Kubernetes"] };

const selectable = (v) => ({ select: () => Promise.resolve(v) });

// Build the app once (the limiter reads its env at load time). Every test uses its
// own user id so rate-limit counters never leak between tests.
const app = (() => {
  const a = express();
  a.use(express.json());
  a.use("/api/ai", require("../routes/ai"));
  a.use((err, req, res, next) => res.status(500).json({ error: "internal" }));
  return a;
})();
let n = 0;
const as = (r, id = `user-${++n}`, role = "student") => r.set("x-test-user", id).set("x-test-role", role);

beforeEach(() => {
  jest.clearAllMocks();
  Job.findOne.mockReturnValue(selectable(job));
  Job.distinct.mockResolvedValue(["React", "Node.js"]);
  User.findById.mockReturnValue(selectable({ skills: ["NodeJS", "python"], resumeText: "I know NodeJS" }));
});

describe("POST /api/ai/copilot/study-plan", () => {
  const plan = { summary: "s", days: [{ day: 1, focus: "f", tasks: ["t"] }] };

  test("401 without a token, 403 for non-students", async () => {
    await request(app).post("/api/ai/copilot/study-plan").send({ jobId: JOB_ID }).expect(401);
    await as(request(app).post("/api/ai/copilot/study-plan"), "c1", "company").send({ jobId: JOB_ID }).expect(403);
    expect(copilot.studyPlan).not.toHaveBeenCalled();
  });

  test("passes verified (deterministic) gap to the LLM service and returns the plan", async () => {
    copilot.studyPlan.mockResolvedValue({ plan, flags: [], meta: { latencyMs: 12, model: "m" } });
    const res = await as(request(app).post("/api/ai/copilot/study-plan")).send({ jobId: JOB_ID, days: 7 }).expect(200);

    const arg = copilot.studyPlan.mock.calls[0][0];
    expect(arg.matchedSkills).toEqual(["Node.js"]);              // "NodeJS" matched "Node.js"
    expect(arg.missingSkills).toEqual(["Docker", "Kubernetes"]);
    expect(res.body.plan).toEqual(plan);
    expect(res.body.gap.missingSkills).toEqual(["Docker", "Kubernetes"]);
  });

  test("rejects a client-supplied studentId and other unknown fields (identity comes from the JWT)", async () => {
    const res = await as(request(app).post("/api/ai/copilot/study-plan"))
      .send({ jobId: JOB_ID, studentId: "someone-else" }).expect(400);
    expect(res.body.error).toBe("Invalid request.");
    expect(copilot.studyPlan).not.toHaveBeenCalled();
  });

  test.each([
    [{ jobId: "not-an-id" }],
    [{ jobId: JOB_ID, days: 30 }],
    [{ jobId: JOB_ID, focus: "x".repeat(201) }],
    [{}],
  ])("validation rejects %j", async (body) => {
    await as(request(app).post("/api/ai/copilot/study-plan")).send(body).expect(400);
  });

  test("404 when job is missing or inactive", async () => {
    Job.findOne.mockReturnValue(selectable(null));
    await as(request(app).post("/api/ai/copilot/study-plan")).send({ jobId: JOB_ID }).expect(404);
    expect(Job.findOne).toHaveBeenCalledWith({ _id: JOB_ID, isActive: true });
  });

  test("AI outage becomes a friendly 503, not a crash", async () => {
    copilot.studyPlan.mockRejectedValue(new copilot.CopilotError("The AI assistant is temporarily unavailable.", 503));
    const res = await as(request(app).post("/api/ai/copilot/study-plan")).send({ jobId: JOB_ID }).expect(503);
    expect(res.body.error).toMatch(/temporarily unavailable/);
  });

  test("activity log stores metadata only - no prompt, resume or answer text", async () => {
    copilot.studyPlan.mockResolvedValue({ plan, flags: ["possible_prompt_injection"], meta: { latencyMs: 5, model: "m" } });
    await as(request(app).post("/api/ai/copilot/study-plan")).send({ jobId: JOB_ID, focus: "secret focus text" }).expect(200);
    const entry = log.mock.calls[0][0];
    expect(entry.action).toBe("AI_COPILOT_USED");
    expect(entry.meta).toEqual({ task: "study_plan", latencyMs: 5, model: "m", flags: ["possible_prompt_injection"] });
    expect(JSON.stringify(entry)).not.toMatch(/secret focus text/);
  });

  test("per-user rate limit kicks in and is per user, not global", async () => {
    copilot.studyPlan.mockResolvedValue({ plan, flags: [], meta: {} });
    const hit = (id) => as(request(app).post("/api/ai/copilot/study-plan"), id).send({ jobId: JOB_ID });
    await hit("rl-a").expect(200);
    await hit("rl-a").expect(200);
    await hit("rl-a").expect(429);
    await hit("rl-b").expect(200); // a different student is unaffected
  });
});

describe("POST /api/ai/copilot/interview-questions", () => {
  test("returns questions; count is bounded", async () => {
    copilot.interviewQuestions.mockResolvedValue({ questions: [{ question: "q?", topic: "t", hint: "h" }], flags: [], meta: {} });
    const ok = await as(request(app).post("/api/ai/copilot/interview-questions")).send({ jobId: JOB_ID, count: 5 }).expect(200);
    expect(ok.body.questions).toHaveLength(1);
    await as(request(app).post("/api/ai/copilot/interview-questions")).send({ jobId: JOB_ID, count: 50 }).expect(400);
  });
});

describe("POST /api/ai/copilot/extract-skills", () => {
  test("suggests skills from the caller's own resume and flags ones already in the profile", async () => {
    copilot.extractSkills.mockResolvedValue({
      skills: [{ name: "Node.js", evidence: "NodeJS" }, { name: "Docker", evidence: "Docker" }], flags: [], meta: {},
    });
    const res = await as(request(app).post("/api/ai/copilot/extract-skills"), "u-extract").send({}).expect(200);
    expect(res.body.suggestions).toEqual([
      { name: "Node.js", evidence: "NodeJS", alreadyInProfile: true },
      { name: "Docker", evidence: "Docker", alreadyInProfile: false },
    ]);
    expect(copilot.extractSkills.mock.calls[0][0].vocabulary).toEqual(["React", "Node.js"]);
    expect(User.findById).toHaveBeenCalledWith("u-extract");              // own profile only
  });

  test("400 when there is no resume text; body must be empty", async () => {
    User.findById.mockReturnValue(selectable({ skills: [], resumeText: "  " }));
    await as(request(app).post("/api/ai/copilot/extract-skills")).send({}).expect(400);
    await as(request(app).post("/api/ai/copilot/extract-skills")).send({ resumeText: "injected" }).expect(400);
  });
});
