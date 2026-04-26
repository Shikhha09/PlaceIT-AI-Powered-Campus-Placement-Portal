require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("🌱 Connected to MongoDB. Seeding...");

  // Clear existing data
  await Promise.all([User.deleteMany(), Job.deleteMany(), Application.deleteMany()]);
  console.log("🗑️  Cleared existing data");

  // ── Create Admin ──────────────────────────────────────────────────────────
  const admin = await User.create({
    name: "Admin TPO",
    email: "admin@campus.local",
    password: "Password@123",
    role: "admin",
    isApproved: true,
  });

  // ── Create Companies ──────────────────────────────────────────────────────
  const [technova, infosys, google] = await User.create([
    {
      name: "HR Manager",
      email: "hr@technova.com",
      password: "Password@123",
      role: "company",
      isApproved: true,
      companyName: "TechNova Solutions",
      industry: "Software Development",
      website: "https://technova.example.com",
      location: "Bangalore",
      description: "Leading software company specializing in cloud solutions.",
    },
    {
      name: "Recruiter",
      email: "recruit@infosys.com",
      password: "Password@123",
      role: "company",
      isApproved: true,
      companyName: "Infosys Ltd",
      industry: "IT Services",
      website: "https://infosys.com",
      location: "Pune",
      description: "Global leader in IT services and consulting.",
    },
    {
      name: "Hiring Manager",
      email: "jobs@google-demo.com",
      password: "Password@123",
      role: "company",
      isApproved: true,
      companyName: "Google (Demo)",
      industry: "Technology",
      website: "https://google.com",
      location: "Hyderabad",
      description: "Demo Google account for testing.",
    },
  ]);

  // ── Create Students ───────────────────────────────────────────────────────
  const [aarav, priya, rohan, neha, arjun] = await User.create([
    {
      name: "Aarav Shah",
      email: "aarav@student.edu",
      password: "Password@123",
      role: "student",
      isApproved: true,
      branch: "CSE",
      cgpa: 8.7,
      graduationYear: 2025,
      skills: ["React", "Node.js", "MongoDB", "JavaScript", "Python"],
      experience: 3,
      resumeText: "Aarav Shah CSE student with experience in React Node.js MongoDB JavaScript Python. Built multiple web applications and REST APIs. Internship at startup.",
      linkedIn: "https://linkedin.com/in/aarav",
      bio: "Passionate full-stack developer with 3 months internship experience.",
    },
    {
      name: "Priya Menon",
      email: "priya@student.edu",
      password: "Password@123",
      role: "student",
      isApproved: true,
      branch: "CSE",
      cgpa: 9.1,
      graduationYear: 2025,
      skills: ["Java", "Spring Boot", "MySQL", "AWS", "Docker"],
      experience: 6,
      resumeText: "Priya Menon CSE student specializing in Java Spring Boot MySQL AWS Docker. 6 months internship at MNC. Strong in backend development and cloud deployments.",
      bio: "Backend developer with strong Java skills.",
    },
    {
      name: "Rohan Desai",
      email: "rohan@student.edu",
      password: "Password@123",
      role: "student",
      isApproved: true,
      branch: "IT",
      cgpa: 7.4,
      graduationYear: 2025,
      skills: ["Python", "Machine Learning", "TensorFlow", "SQL"],
      experience: 2,
      resumeText: "Rohan Desai IT student with skills in Python Machine Learning TensorFlow SQL. Working on ML projects.",
      bio: "Aspiring ML engineer.",
    },
    {
      name: "Neha Kapoor",
      email: "neha@student.edu",
      password: "Password@123",
      role: "student",
      isApproved: true,
      branch: "ECE",
      cgpa: 8.2,
      graduationYear: 2025,
      skills: ["Embedded C", "IoT", "Python", "MATLAB"],
      experience: 0,
      resumeText: "Neha Kapoor ECE student with expertise in Embedded C IoT Python MATLAB. Final year project on smart irrigation.",
      bio: "Embedded systems enthusiast.",
    },
    {
      name: "Arjun Verma",
      email: "arjun@student.edu",
      password: "Password@123",
      role: "student",
      isApproved: true,
      branch: "CSE",
      cgpa: 6.8,
      graduationYear: 2025,
      skills: ["HTML", "CSS", "JavaScript"],
      experience: 0,
      resumeText: "Arjun Verma CSE student with basic frontend skills HTML CSS JavaScript.",
      bio: "Frontend developer in progress.",
    },
  ]);

  // ── Create Jobs ───────────────────────────────────────────────────────────
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);

  const [job1, job2, job3, job4] = await Job.create([
    {
      title: "Full Stack Developer",
      description: "We are looking for a Full Stack Developer proficient in React and Node.js to build scalable web applications. You will work with MongoDB, design REST APIs, and deploy on AWS. Experience with Docker is a plus.",
      company: technova._id,
      requiredSkills: ["React", "Node.js", "MongoDB", "JavaScript"],
      minCGPA: 7.5,
      allowedBranches: ["CSE", "IT"],
      ctc: "8-12 LPA",
      location: "Bangalore",
      jobType: "full-time",
      deadline,
      applicantCount: 0,
    },
    {
      title: "Backend Engineer - Java",
      description: "Join Infosys as a Backend Engineer working with Java Spring Boot and microservices. MySQL and AWS knowledge required. You will design and implement enterprise-grade APIs for large-scale systems.",
      company: infosys._id,
      requiredSkills: ["Java", "Spring Boot", "MySQL", "AWS"],
      minCGPA: 7.0,
      allowedBranches: ["CSE", "IT", "ECE"],
      ctc: "6-8 LPA",
      location: "Pune",
      jobType: "full-time",
      deadline,
      applicantCount: 0,
    },
    {
      title: "Software Engineering Intern",
      description: "6-month internship at Google (Demo). Work on real products with senior engineers. Python, algorithms, and data structures knowledge required. Excellent learning opportunity.",
      company: google._id,
      requiredSkills: ["Python", "Algorithms", "Data Structures"],
      minCGPA: 8.0,
      allowedBranches: ["ALL"],
      ctc: "80,000/month stipend",
      location: "Hyderabad",
      jobType: "internship",
      deadline,
      applicantCount: 0,
    },
    {
      title: "ML Engineer",
      description: "TechNova is looking for ML Engineers to build AI-powered features. Proficiency in Python, TensorFlow or PyTorch, and SQL required. You'll work on recommendation systems and NLP pipelines.",
      company: technova._id,
      requiredSkills: ["Python", "Machine Learning", "TensorFlow", "SQL"],
      minCGPA: 7.5,
      allowedBranches: ["CSE", "IT"],
      ctc: "10-15 LPA",
      location: "Bangalore",
      jobType: "full-time",
      deadline,
      applicantCount: 0,
    },
  ]);

  // ── Create Applications ───────────────────────────────────────────────────
  await Application.create([
    { student: aarav._id, job: job1._id, status: "shortlisted", aiScore: 87, aiBreakdown: { skillMatch: 91, cgpaScore: 82, mlConfidence: 88 }, statusHistory: [{ status: "applied" }, { status: "shortlisted" }] },
    { student: priya._id, job: job2._id, status: "offered", aiScore: 94, aiBreakdown: { skillMatch: 96, cgpaScore: 91, mlConfidence: 95 }, statusHistory: [{ status: "applied" }, { status: "shortlisted" }, { status: "interviewed" }, { status: "offered" }] },
    { student: rohan._id, job: job4._id, status: "applied", aiScore: null, statusHistory: [{ status: "applied" }] },
    { student: aarav._id, job: job3._id, status: "applied", aiScore: null, statusHistory: [{ status: "applied" }] },
    { student: arjun._id, job: job1._id, status: "rejected", aiScore: 42, aiBreakdown: { skillMatch: 30, cgpaScore: 55, mlConfidence: 41 }, statusHistory: [{ status: "applied" }, { status: "rejected" }] },
  ]);

  // Update applicant counts
  await Job.findByIdAndUpdate(job1._id, { applicantCount: 2 });
  await Job.findByIdAndUpdate(job2._id, { applicantCount: 1 });
  await Job.findByIdAndUpdate(job3._id, { applicantCount: 1 });
  await Job.findByIdAndUpdate(job4._id, { applicantCount: 1 });

  console.log("\n✅ Seed complete!\n");
  console.log("─────────────────────────────────────");
  console.log("🔑 Demo Accounts:");
  console.log("  Admin:   admin@campus.local    / Password@123");
  console.log("  Company: hr@technova.com       / Password@123");
  console.log("  Company: recruit@infosys.com   / Password@123");
  console.log("  Student: aarav@student.edu     / Password@123");
  console.log("  Student: priya@student.edu     / Password@123");
  console.log("  Student: rohan@student.edu     / Password@123");
  console.log("─────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
