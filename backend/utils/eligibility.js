// The ONE place eligibility is decided (CGPA + branch). The skill-gap page and the
// AI chat both call this, so the chatbot can never disagree with the platform rules.
const computeEligibility = (student, job) => {
  const cgpaEligible = (student?.cgpa || 0) >= (job?.minCGPA ?? 0);
  const branches = job?.allowedBranches || [];
  const branchEligible = branches.includes("ALL") || branches.includes(student?.branch);
  return { cgpaEligible, branchEligible, overallEligible: cgpaEligible && branchEligible };
};

module.exports = { computeEligibility };
