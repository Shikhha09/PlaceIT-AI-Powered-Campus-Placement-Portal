const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_placement_test"
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany();
  await Job.deleteMany();
  await Application.deleteMany();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const createApprovedStudent = async (overrides = {}) => {
  return User.create({
    name: "Test Student",
    email: "student@test.com",
    password: "Password@123",
    role: "student",
    branch: "CSE",
    cgpa: 8.5,
    graduationYear: 2025,
    skills: ["React", "Node.js"],
    isApproved: true,
    ...overrides,
  });
};

const createApprovedCompany = async (overrides = {}) => {
  return User.create({
    name: "HR Manager",
    email: "hr@company.com",
    password: "Password@123",
    role: "company",
    companyName: "TechCorp",
    isApproved: true,
    ...overrides,
  });
};

const loginUser = async (email, password) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
};

const createJob = async (companyId, overrides = {}) => {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);
  return Job.create({
    title: "Full Stack Developer",
    description: "Build scalable web apps using React and Node.js. Experience with MongoDB required.",
    company: companyId,
    requiredSkills: ["React", "Node.js", "MongoDB"],
    minCGPA: 7.0,
    allowedBranches: ["ALL"],
    ctc: "8 LPA",
    location: "Bangalore",
    jobType: "full-time",
    deadline,
    ...overrides,
  });
};

// ─── POST /api/applications ───────────────────────────────────────────────────
describe("POST /api/applications", () => {
  it("student can apply to an eligible job", async () => {
    const student = await createApprovedStudent();
    const company = await createApprovedCompany();
    const job = await createJob(company._id);
    const token = await loginUser("student@test.com", "Password@123");

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe("applied");
  });

  it("blocks student below minimum CGPA", async () => {
    const student = await createApprovedStudent({ email: "low@test.com", cgpa: 6.0 });
    const company = await createApprovedCompany({ email: "co2@test.com" });
    const job = await createJob(company._id, { minCGPA: 7.5 });
    const token = await loginUser("low@test.com", "Password@123");

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/below the required/i);
  });

  it("blocks duplicate applications", async () => {
    const student = await createApprovedStudent();
    const company = await createApprovedCompany();
    const job = await createJob(company._id);
    const token = await loginUser("student@test.com", "Password@123");

    await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already applied/i);
  });

  it("blocks company from applying", async () => {
    const company = await createApprovedCompany();
    const job = await createJob(company._id);
    const token = await loginUser("hr@company.com", "Password@123");

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(403);
  });

  it("blocks application to expired job", async () => {
    const student = await createApprovedStudent();
    const company = await createApprovedCompany();
    const pastDeadline = new Date();
    pastDeadline.setDate(pastDeadline.getDate() - 1);
    const job = await createJob(company._id, { deadline: pastDeadline });
    const token = await loginUser("student@test.com", "Password@123");

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer accepting/i);
  });

  it("blocks branch-ineligible student", async () => {
    const student = await createApprovedStudent({ email: "mech@test.com", branch: "MECH" });
    const company = await createApprovedCompany({ email: "co3@test.com" });
    const job = await createJob(company._id, { allowedBranches: ["CSE", "IT"] });
    const token = await loginUser("mech@test.com", "Password@123");

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not eligible/i);
  });
});

// ─── GET /api/applications/mine ───────────────────────────────────────────────
describe("GET /api/applications/mine", () => {
  it("returns student's own applications", async () => {
    const student = await createApprovedStudent();
    const company = await createApprovedCompany();
    const job = await createJob(company._id);
    await Application.create({ student: student._id, job: job._id });
    const token = await loginUser("student@test.com", "Password@123");

    const res = await request(app)
      .get("/api/applications/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].status).toBe("applied");
  });

  it("blocks company from accessing student applications", async () => {
    const company = await createApprovedCompany();
    const token = await loginUser("hr@company.com", "Password@123");

    const res = await request(app)
      .get("/api/applications/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/applications/:id/status ──────────────────────────────────────
describe("PATCH /api/applications/:id/status", () => {
  it("company can update application status", async () => {
    const student = await createApprovedStudent();
    const company = await createApprovedCompany();
    const job = await createJob(company._id);
    const application = await Application.create({
      student: student._id,
      job: job._id,
      statusHistory: [{ status: "applied" }],
    });
    const token = await loginUser("hr@company.com", "Password@123");

    const res = await request(app)
      .patch(`/api/applications/${application._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shortlisted" });

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe("shortlisted");
  });

  it("rejects invalid status value", async () => {
    const student = await createApprovedStudent();
    const company = await createApprovedCompany();
    const job = await createJob(company._id);
    const application = await Application.create({ student: student._id, job: job._id });
    const token = await loginUser("hr@company.com", "Password@123");

    const res = await request(app)
      .patch(`/api/applications/${application._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "hired" });

    expect(res.status).toBe(400);
  });
});
