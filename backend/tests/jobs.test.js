const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const User = require("../models/User");
const Job = require("../models/Job");

let companyToken, studentToken, companyId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_placement_test_jobs");

  // Create and approve company
  const company = await User.create({
    name: "Test Company",
    email: "company@test.com",
    password: "Password@123",
    role: "company",
    companyName: "TestCorp",
    isApproved: true,
  });
  companyId = company._id;

  const companyLogin = await request(app).post("/api/auth/login").send({
    email: "company@test.com", password: "Password@123",
  });
  companyToken = companyLogin.body.token;

  // Create and approve student
  await User.create({
    name: "Test Student",
    email: "student@test.com",
    password: "Password@123",
    role: "student",
    branch: "CSE",
    cgpa: 8.5,
    graduationYear: 2025,
    skills: ["React", "Node.js"],
    isApproved: true,
  });

  const studentLogin = await request(app).post("/api/auth/login").send({
    email: "student@test.com", password: "Password@123",
  });
  studentToken = studentLogin.body.token;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Job.deleteMany();
});

const validJob = {
  title: "Backend Engineer",
  description: "We need a backend engineer with Node.js and MongoDB experience for building REST APIs and microservices.",
  requiredSkills: ["Node.js", "MongoDB", "Express"],
  minCGPA: 7.0,
  allowedBranches: ["CSE", "IT"],
  ctc: "8-12 LPA",
  location: "Bangalore",
  jobType: "full-time",
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("POST /api/jobs", () => {
  it("company can post a job", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${companyToken}`)
      .send(validJob);
    expect(res.status).toBe(201);
    expect(res.body.job.title).toBe("Backend Engineer");
    expect(res.body.job.company).toBe(companyId.toString());
  });

  it("student cannot post a job", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${studentToken}`)
      .send(validJob);
    expect(res.status).toBe(403);
  });

  it("rejects job without required fields", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ title: "Incomplete Job" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/jobs", () => {
  beforeEach(async () => {
    await Job.create({ ...validJob, company: companyId });
  });

  it("student can browse jobs filtered by eligibility", async () => {
    const res = await request(app)
      .get("/api/jobs")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.jobs).toBeDefined();
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });

  it("returns paginated results", async () => {
    const res = await request(app)
      .get("/api/jobs?page=1&limit=5")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/jobs/:id/skill-gap", () => {
  let jobId;
  beforeEach(async () => {
    const job = await Job.create({ ...validJob, company: companyId });
    jobId = job._id;
  });

  it("returns skill gap analysis for student", async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/skill-gap`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.analysis).toBeDefined();
    expect(res.body.analysis.matchPercentage).toBeDefined();
    expect(res.body.analysis.missingSkills).toBeDefined();
    expect(res.body.analysis.matchedSkills).toBeDefined();
  });
});
