const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const User = require("../models/User");

// Use a separate test DB
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_placement_test");
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany();
});

describe("POST /api/auth/register", () => {
  it("registers a student successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Student",
      email: "student@test.com",
      password: "Password@123",
      role: "student",
      branch: "CSE",
      cgpa: 8.5,
      graduationYear: 2025,
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/awaiting admin approval/i);
    expect(res.body.user.role).toBe("student");
  });

  it("registers a company successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "HR Manager",
      email: "hr@company.com",
      password: "Password@123",
      role: "company",
      companyName: "TechCorp",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("company");
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "User One",
      email: "dup@test.com",
      password: "Password@123",
      role: "student",
      branch: "CSE",
      cgpa: 8.0,
      graduationYear: 2025,
    });
    const res = await request(app).post("/api/auth/register").send({
      name: "User Two",
      email: "dup@test.com",
      password: "Password@123",
      role: "student",
      branch: "IT",
      cgpa: 7.5,
      graduationYear: 2025,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("rejects invalid role", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Bad Actor",
      email: "bad@test.com",
      password: "Password@123",
      role: "superuser",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Create and approve a test user
    const user = await User.create({
      name: "Approved User",
      email: "approved@test.com",
      password: "Password@123",
      role: "student",
      branch: "CSE",
      cgpa: 8.0,
      graduationYear: 2025,
      isApproved: true,
    });
  });

  it("returns JWT for valid approved user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "approved@test.com",
      password: "Password@123",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("approved@test.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "approved@test.com",
      password: "WrongPassword",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("rejects unapproved user", async () => {
    await User.create({
      name: "Pending User",
      email: "pending@test.com",
      password: "Password@123",
      role: "student",
      branch: "IT",
      cgpa: 7.0,
      graduationYear: 2025,
      isApproved: false,
    });
    const res = await request(app).post("/api/auth/login").send({
      email: "pending@test.com",
      password: "Password@123",
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending admin approval/i);
  });

  it("rejects missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "approved@test.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns user for valid token", async () => {
    const user = await User.create({
      name: "Me User",
      email: "me@test.com",
      password: "Password@123",
      role: "student",
      branch: "CSE",
      cgpa: 8.5,
      graduationYear: 2025,
      isApproved: true,
    });
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "me@test.com",
      password: "Password@123",
    });
    const token = loginRes.body.token;
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@test.com");
  });

  it("rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
