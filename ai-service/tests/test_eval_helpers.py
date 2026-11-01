import json, os
from eval.run_eval import baseline, prf

def test_baseline_misses_spelling_variants_that_normalisation_catches():
    vocab = ["React", "Node.js"]
    assert baseline("Built with ReactJS and NodeJS", vocab) == []        # exact match fails
    assert prf(["React.js", "NodeJS"], ["React", "Node.js"])[2] == 1.0    # normalised compare works

def test_prf_edge_cases():
    assert prf([], [])[2] == 1.0
    assert prf(["Kubernetes"], [])[0] == 0.0

def test_cases_file_is_valid():
    path = os.path.join(os.path.dirname(__file__), "..", "eval", "cases.json")
    data = json.load(open(path))
    assert data["cases"] and all({"id", "resume", "expected"} <= set(c) for c in data["cases"])
