"""Measure skill extraction quality, latency and cost with the REAL LLM.

    cd ai-service
    LLM_API_KEY=... python eval/run_eval.py            # uses eval/cases.json
    python eval/run_eval.py --cases my_cases.json

Compares the LLM against a naive baseline (exact keyword match on the vocabulary).
Only quote numbers on your resume that this script printed for YOUR test set,
and be ready to explain the set size and how expected skills were labelled.
"""
import argparse
import asyncio
import json
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from copilot import extract_skills          # noqa: E402
from llm import get_llm_client              # noqa: E402
from skill_utils import skill_set           # noqa: E402


def baseline(resume: str, vocabulary):
    """What the old approach could do: keyword hits against known skills, no normalisation."""
    low = resume.lower()
    return [v for v in vocabulary if re.search(rf"(?<![a-z0-9]){re.escape(v.lower())}(?![a-z0-9])", low)]


def prf(predicted, expected):
    p, e = skill_set(predicted), skill_set(expected)
    tp = len(p & e)
    precision = tp / len(p) if p else (1.0 if not e else 0.0)
    recall = tp / len(e) if e else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


async def main(path):
    data = json.load(open(path))
    client, vocab = get_llm_client(), data["vocabulary"]
    rows, latencies, tokens, injections_blocked, injection_total = [], [], 0, 0, 0

    for case in data["cases"]:
        result, meta = await extract_skills(client, case["resume"], vocab)
        got = [s["name"] for s in result["skills"]]
        base = baseline(case["resume"], vocab)
        llm_prf, base_prf = prf(got, case["expected"]), prf(base, case["expected"])
        leaked = [m for m in case.get("must_not", []) if skill_set([m]) & skill_set(got)]
        if case.get("must_not"):
            injection_total += 1
            injections_blocked += 0 if leaked else 1
        latencies.append(meta["latencyMs"])
        tokens += (meta.get("promptTokens") or 0) + (meta.get("outputTokens") or 0)
        rows.append((case["id"], base_prf, llm_prf, leaked, result["flags"]))
        print(f"{case['id']:12} baseline F1={base_prf[2]:.2f}  LLM F1={llm_prf[2]:.2f}  "
              f"leaked={leaked or '-'}  flags={result['flags'] or '-'}  {meta['latencyMs']}ms")

    n = len(rows)
    avg = lambda i, which: sum(r[which][i] for r in rows) / n
    print("\n── Summary ─────────────────────────────────────────────")
    print(f"cases: {n}")
    print(f"baseline  precision={avg(0,1):.2f} recall={avg(1,1):.2f} F1={avg(2,1):.2f}")
    print(f"LLM       precision={avg(0,2):.2f} recall={avg(1,2):.2f} F1={avg(2,2):.2f}")
    if injection_total:
        print(f"must_not cases passed: {injections_blocked}/{injection_total}")
    print(f"latency  avg={statistics.mean(latencies):.0f}ms  max={max(latencies)}ms")
    print(f"tokens   total={tokens}  (multiply by your provider's price to get cost)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", default=os.path.join(os.path.dirname(__file__), "cases.json"))
    asyncio.run(main(ap.parse_args().cases))
