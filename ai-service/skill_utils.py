"""Skill-name normalisation shared by the scorer, the copilot and the eval harness.

Problem it solves: skills were compared by exact lowercase string, so "ReactJS",
"React.js" and "react" were three different skills. We reduce every skill to a
comparison key. The ALIASES table is mirrored in backend/utils/skills.js - keep
the two in sync (tests on both sides check the same examples).
"""
import re

ALIASES = {
    "reactjs": "react",
    "nodejs": "node",
    "expressjs": "express",
    "vuejs": "vue",
    "nextjs": "next",
    "angularjs": "angular",
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "golang": "go",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "tailwindcss": "tailwind",
    "restapis": "restapi",
    "restfulapi": "restapi",
    "restfulapis": "restapi",
    "oops": "oop",
    "objectorientedprogramming": "oop",
    "ml": "machinelearning",
}


def skill_key(skill: str) -> str:
    """Return a comparison key: lowercase, punctuation/space removed, aliases folded."""
    s = (skill or "").strip().lower()
    # keep + and # so "c++" and "c#" don't collapse into "c"
    s = re.sub(r"[^a-z0-9+#]", "", s)
    return ALIASES.get(s, s)


def skill_set(skills) -> set:
    return {k for k in (skill_key(s) for s in (skills or [])) if k}
