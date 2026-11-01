const { skillKey, computeSkillGap } = require("../utils/skills");

describe("skillKey", () => {
  test("folds common spelling variants together", () => {
    expect(skillKey("React.js")).toBe("react");
    expect(skillKey("ReactJS")).toBe("react");
    expect(skillKey(" react ")).toBe("react");
    expect(skillKey("Node.js")).toBe(skillKey("NodeJS"));
    expect(skillKey("Node.js")).toBe("node");
  });
  test("keeps c++ and c# distinct from c", () => {
    expect(skillKey("C++")).toBe("c++");
    expect(skillKey("C#")).toBe("c#");
    expect(skillKey("C")).toBe("c");
  });
  test("handles junk input", () => {
    expect(skillKey(undefined)).toBe("");
    expect(skillKey("")).toBe("");
  });
});

describe("computeSkillGap", () => {
  test("matches variants and keeps the job's original spelling", () => {
    const gap = computeSkillGap(["ReactJS", "python"], ["React", "Node.js", "Python"]);
    expect(gap.matchedSkills).toEqual(["React", "Python"]);
    expect(gap.missingSkills).toEqual(["Node.js"]);
    expect(gap.matchPercentage).toBe(67);
  });
  test("empty requirements do not produce NaN", () => {
    expect(computeSkillGap(["x"], []).matchPercentage).toBe(100);
  });
  test("no student skills", () => {
    const gap = computeSkillGap(undefined, ["A", "B"]);
    expect(gap.matchPercentage).toBe(0);
    expect(gap.missingSkills).toEqual(["A", "B"]);
  });
});
