// Decides WHICH PlaceIT data (if any) a chat message needs, then loads it for the
// authenticated student only. The LLM never queries the database: this module is the
// only code path, every query is scoped by the JWT user id, and only a small
// whitelist of fields is ever selected (no email, phone, password, tokens).
const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");
const { computeSkillGap } = require("../utils/skills");
const { computeEligibility } = require("../utils/eligibility");
const { maskPII } = require("../utils/pii");

// ── What does this message need? (deterministic keyword intent, no LLM involved) ──
const RE = {
  resume: /\b(resume|cv|curriculum vitae)\b/i,
  applications: /\b(applications?|applied|shortlist(?:ed)?|offers?|rejected|status of|my status|application status)\b/i,
  eligibility: /\b(eligib\w*|can i apply|am i allowed|qualif\w+ (?:for|to apply)|cgpa (?:cutoff|requirement|criteria)|criteria)\b/i,
  gap: /\b(missing|skill gaps?|gaps?|lack(?:ing)?|need to learn|what (?:should|do) i (?:learn|study)|good fit|suitable|how (?:well )?do i match|do i match)\b/i,
  openJobs: /\b(openings?|vacanc\w+|upcoming (?:drives?|jobs?)|which (?:jobs?|companies|drives?|roles?)|jobs? (?:for me|i can apply|available|open)|available (?:jobs?|drives?|internships?)|(?:any|what) (?:jobs?|drives?|internships?) )/i,
  thisJob: /\b(this|the|selected)\s+(?:job|role|internship|position|company|drive|opening|posting|jd|job description)\b|\b(?:requirements?|required skills?|responsibilit\w+|jd)\b/i,
  profile: /\b(?:my|i)\b.{0,30}\b(?:skills?|cgpa|gpa|profile|branch|background|experience|projects?)\b|\bam i\b|\bi know\b|\bi have\b/i,
};

const detectNeeds = (message, { jobId, personalized }) => {
  const m = String(message || "");
  const needs = {
    resume: RE.resume.test(m),
    applications: RE.applications.test(m),
    eligibility: RE.eligibility.test(m),
    gap: RE.gap.test(m),
    openJobs: RE.openJobs.test(m),
    job: false,
    profile: RE.profile.test(m),
  };
  if (jobId) needs.job = RE.thisJob.test(m) || needs.gap || needs.eligibility;
  if (personalized) {
    needs.profile = true;
    if (jobId) needs.job = true;
  }
  // These answers are computed from the student's profile, so they need it too.
  if (needs.gap || needs.eligibility || needs.openJobs || needs.resume) needs.profile = true;
  // Skill gap / eligibility only make sense against a job.
  if (!jobId) { needs.gap = false; needs.eligibility = false; }
  return needs;
};

const JOB_FIELDS = "title description requiredSkills minCGPA allowedBranches ctc location jobType deadline company";

// Returns { data, used, jobMissing }. `data` is exactly what gets sent to the AI service.
const buildChatContext = async ({ userId, message, jobId, contextMode }) => {
  const needs = detectNeeds(message, { jobId, personalized: contextMode === "personalized" });
  const used = [];
  const data = {};

  let student = null;
  if (needs.profile) {
    student = await User.findById(userId)
      .select("name skills cgpa branch graduationYear" + (needs.resume ? " resumeText" : ""))
      .lean();
    if (student) {
      data.student = {
        firstName: String(student.name || "").split(" ")[0] || null,
        skills: (student.skills || []).slice(0, 60),
        cgpa: student.cgpa ?? null,
        branch: student.branch || null,
        graduationYear: student.graduationYear ?? null,
      };
      used.push("profile");
      if (needs.resume) {
        data.resumeExcerpt = student.resumeText ? maskPII(student.resumeText).slice(0, 3500) : "";
        used.push("resume");
      }
    }
  }

  let job = null;
  if (needs.job) {
    job = await Job.findOne({ _id: jobId, isActive: true })
      .populate("company", "companyName")
      .select(JOB_FIELDS)
      .lean();
    if (!job) return { jobMissing: true };
    data.job = {
      title: job.title,
      company: job.company?.companyName || null,
      description: String(job.description || "").slice(0, 3000),
      requiredSkills: job.requiredSkills || [],
      minCGPA: job.minCGPA,
      allowedBranches: job.allowedBranches || [],
      ctc: job.ctc,
      location: job.location,
      jobType: job.jobType,
      deadline: job.deadline || null,
    };
    used.push("job");
    if (student && needs.gap) {
      data.gap = computeSkillGap(student.skills, job.requiredSkills);
      used.push("skill-gap");
    }
    if (student && needs.eligibility) {
      data.eligibility = computeEligibility(student, job);
      used.push("eligibility");
    }
  }

  if (needs.applications) {
    const apps = await Application.find({ student: userId })
      .populate({ path: "job", select: "title company", populate: { path: "company", select: "companyName" } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("job status createdAt")
      .lean();
    data.applications = apps.map((a) => ({
      jobTitle: a.job?.title || "(job no longer available)",
      company: a.job?.company?.companyName || null,
      status: a.status,
      appliedAt: a.createdAt || null,
    }));
    used.push("applications");
  }

  if (needs.openJobs && student) {
    // Same visibility rule as the Jobs page: active, not past deadline, and the student meets CGPA + branch.
    const open = await Job.find({
      isActive: true,
      deadline: { $gte: new Date() },
      minCGPA: { $lte: student.cgpa || 0 },
      $or: [{ allowedBranches: "ALL" }, { allowedBranches: student.branch }],
    })
      .populate("company", "companyName")
      .sort({ createdAt: -1 })
      .limit(8)
      .select("title company jobType ctc location deadline minCGPA requiredSkills")
      .lean();
    data.openJobs = open.map((j) => ({
      title: j.title,
      company: j.company?.companyName || null,
      jobType: j.jobType,
      ctc: j.ctc,
      location: j.location,
      deadline: j.deadline || null,
      requiredSkills: j.requiredSkills || [],
    }));
    used.push("open-jobs");
  }

  return { data, used, jobMissing: false };
};

module.exports = { buildChatContext, detectNeeds };
