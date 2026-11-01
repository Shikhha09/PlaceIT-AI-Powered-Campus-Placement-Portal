// Skill comparison helpers. The alias table mirrors ai-service/skill_utils.py -
// keep the two in sync (both test suites check the same examples).
const ALIASES = {
  reactjs: "react",
  nodejs: "node",
  expressjs: "express",
  vuejs: "vue",
  nextjs: "next",
  angularjs: "angular",
  js: "javascript",
  ts: "typescript",
  py: "python",
  golang: "go",
  postgres: "postgresql",
  mongo: "mongodb",
  k8s: "kubernetes",
  tailwindcss: "tailwind",
  restapis: "restapi",
  restfulapi: "restapi",
  restfulapis: "restapi",
  oops: "oop",
  objectorientedprogramming: "oop",
  ml: "machinelearning",
};

// "React.js" / "ReactJS" / "react" -> "react". Keeps + and # so c++ / c# survive.
const skillKey = (skill) => {
  const s = String(skill || "").trim().toLowerCase().replace(/[^a-z0-9+#]/g, "");
  return ALIASES[s] || s;
};

// Deterministic skill-gap: this is the "source of truth" the LLM is given. The
// model explains and plans around it; it never gets to change it.
const computeSkillGap = (studentSkills, requiredSkills) => {
  const have = new Set((studentSkills || []).map(skillKey).filter(Boolean));
  const required = requiredSkills || [];
  const matchedSkills = required.filter((r) => have.has(skillKey(r)));
  const missingSkills = required.filter((r) => !have.has(skillKey(r)));
  const matchPercentage = required.length
    ? Math.round((matchedSkills.length / required.length) * 100)
    : 100; // nothing required -> nothing missing
  return { matchedSkills, missingSkills, matchPercentage };
};

module.exports = { skillKey, computeSkillGap };
