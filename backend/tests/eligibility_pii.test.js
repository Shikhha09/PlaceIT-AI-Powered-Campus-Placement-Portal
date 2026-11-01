const { computeEligibility } = require("../utils/eligibility");
const { maskPII } = require("../utils/pii");
const { detectNeeds } = require("../services/chatContextService");

describe("computeEligibility", () => {
  const job = { minCGPA: 8, allowedBranches: ["CSE", "IT"] };
  test("both rules must pass", () => {
    expect(computeEligibility({ cgpa: 8.5, branch: "CSE" }, job)).toEqual({ cgpaEligible: true, branchEligible: true, overallEligible: true });
    expect(computeEligibility({ cgpa: 7.9, branch: "CSE" }, job).overallEligible).toBe(false);
    expect(computeEligibility({ cgpa: 9, branch: "ECE" }, job).overallEligible).toBe(false);
  });
  test("ALL allows any branch; missing data does not crash", () => {
    expect(computeEligibility({ cgpa: 8, branch: "ECE" }, { minCGPA: 8, allowedBranches: ["ALL"] }).overallEligible).toBe(true);
    expect(computeEligibility(undefined, { minCGPA: 5 }).overallEligible).toBe(false);
  });
});

describe("maskPII", () => {
  test("masks emails, links and phone numbers but keeps years and scores", () => {
    const out = maskPII("Mail a.b@x.com, +91 98765 43210, 9876543210, 022-123-4567 www.me.dev  2023-2027 CGPA 8.59");
    expect(out).not.toMatch(/a\.b@x\.com|98765|9876543210|www\.me\.dev/);
    expect(out).toContain("2023-2027"); expect(out).toContain("8.59");
  });
});

describe("detectNeeds (what a message is allowed to pull in)", () => {
  const n = (m, o = {}) => detectNeeds(m, { jobId: null, personalized: false, ...o });
  test("general technical questions need nothing", () => {
    for (const m of ["What is RAG?", "Explain OOP concepts.", "What is Java?", "Explain how photosynthesis works"]) {
      expect(Object.values(n(m)).some(Boolean)).toBe(false);
    }
  });
  test("gap / eligibility need a job id to count", () => {
    expect(n("which skills am I missing?").gap).toBe(false);
    const withJob = n("which skills am I missing for this internship?", { jobId: "x" });
    expect(withJob).toMatchObject({ gap: true, job: true, profile: true });
  });
  test("applications, openings, resume", () => {
    expect(n("what is my application status").applications).toBe(true);
    expect(n("which jobs are available for me").openJobs).toBe(true);
    expect(n("improve my resume").resume).toBe(true);
  });
});
