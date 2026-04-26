import os
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import MinMaxScaler

# Try to load trained model, fall back to rule-based scoring
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "placement_model.pkl")

def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

model = load_model()


def skill_match_score(resume_text: str, skills: list, job_description: str, required_skills: list) -> float:
    """
    Combines two signals:
    1. TF-IDF cosine similarity between resume text and job description
    2. Exact skill keyword overlap between student skills and required skills
    Returns a score from 0-100.
    """
    tfidf_score = 0.0
    if resume_text and resume_text.strip():
        try:
            docs = [resume_text, job_description]
            vectorizer = TfidfVectorizer(stop_words="english", max_features=1000)
            matrix = vectorizer.fit_transform(docs)
            tfidf_score = float(cosine_similarity(matrix[0], matrix[1])[0][0])
        except Exception:
            tfidf_score = 0.0

    # Keyword overlap score
    student_skills_lower = {s.lower() for s in skills}
    required_skills_lower = {s.lower() for s in required_skills}
    if required_skills_lower:
        overlap = len(student_skills_lower & required_skills_lower)
        keyword_score = overlap / len(required_skills_lower)
    else:
        keyword_score = 0.0

    # Weighted combination: 40% TF-IDF, 60% keyword overlap
    combined = (tfidf_score * 0.4) + (keyword_score * 0.6)
    return round(combined * 100, 2)


def cgpa_score(cgpa: float, min_cgpa: float) -> float:
    """Normalize CGPA to 0-100 score, with bonus for exceeding minimum."""
    if cgpa < min_cgpa:
        return 0.0
    base = (cgpa / 10) * 100
    # Bonus for exceeding minimum CGPA
    excess = cgpa - min_cgpa
    bonus = min(excess * 5, 15)  # max 15 bonus points
    return round(min(base + bonus, 100), 2)


def ml_confidence(cgpa: float, skill_score: float, num_skills: int, experience: int) -> float:
    """
    Use trained model if available, else use weighted formula.
    Returns probability 0-100.
    """
    if model:
        try:
            features = np.array([[cgpa, skill_score / 100, min(num_skills, 20), min(experience, 24)]])
            prob = model.predict_proba(features)[0][1]
            return round(prob * 100, 2)
        except Exception:
            pass

    # Fallback weighted formula
    cgpa_component = (cgpa / 10) * 35
    skill_component = (skill_score / 100) * 40
    exp_component = min(experience / 12, 1) * 15  # max 1 year normalized
    breadth_component = min(num_skills / 10, 1) * 10
    return round(cgpa_component + skill_component + exp_component + breadth_component, 2)


def rank_candidates(candidates: list, job: dict) -> list:
    """
    Main ranking function.
    Returns candidates sorted by final_score desc with full breakdown.
    """
    results = []

    for candidate in candidates:
        s_score = skill_match_score(
            resume_text=candidate.get("resumeText", ""),
            skills=candidate.get("skills", []),
            job_description=job["description"],
            required_skills=job["requiredSkills"],
        )

        c_score = cgpa_score(
            cgpa=candidate.get("cgpa", 0),
            min_cgpa=job["minCGPA"],
        )

        ml_score = ml_confidence(
            cgpa=candidate.get("cgpa", 0),
            skill_score=s_score,
            num_skills=len(candidate.get("skills", [])),
            experience=candidate.get("experience", 0),
        )

        # Final weighted score: Skills 40% + CGPA 30% + ML Confidence 30%
        final_score = round((s_score * 0.4) + (c_score * 0.3) + (ml_score * 0.3), 2)

        results.append({
            "applicationId": candidate["applicationId"],
            "studentId": candidate["studentId"],
            "name": candidate["name"],
            "score": final_score,
            "breakdown": {
                "skillMatch": s_score,
                "cgpaScore": c_score,
                "mlConfidence": ml_score,
            },
        })

    # Sort highest score first
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
