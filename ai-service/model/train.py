"""
Run this once to train and save the placement prediction model.
Usage: python model/train.py
"""
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# ── Generate synthetic training data ──────────────────────────────────────────
np.random.seed(42)
n = 2000

cgpa         = np.round(np.random.uniform(5.0, 10.0, n), 1)
skill_match  = np.round(np.random.uniform(0.0, 1.0, n), 2)
num_skills   = np.random.randint(1, 20, n)
experience   = np.random.randint(0, 24, n)  # months

# Realistic placement probability formula
prob = (
    0.30 * (cgpa / 10) +
    0.40 * skill_match +
    0.15 * (np.minimum(experience, 12) / 12) +
    0.15 * (np.minimum(num_skills, 10) / 10)
)
# Add noise
prob = np.clip(prob + np.random.normal(0, 0.05, n), 0, 1)
placed = (prob >= 0.55).astype(int)

df = pd.DataFrame({
    "cgpa": cgpa,
    "skill_match": skill_match,
    "num_skills": num_skills,
    "experience": experience,
    "placed": placed,
})

print(f"Dataset: {n} samples | Placed: {placed.sum()} ({placed.mean()*100:.1f}%)")

# ── Train model ────────────────────────────────────────────────────────────────
X = df[["cgpa", "skill_match", "num_skills", "experience"]]
y = df["placed"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = GradientBoostingClassifier(
    n_estimators=150,
    learning_rate=0.1,
    max_depth=4,
    random_state=42,
)
model.fit(X_train, y_train)

# ── Evaluate ───────────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {acc*100:.2f}%")
print(classification_report(y_test, y_pred, target_names=["Not Placed", "Placed"]))

# Feature importances
for feat, imp in zip(X.columns, model.feature_importances_):
    print(f"  {feat:20s}: {imp:.3f}")

# ── Save model ─────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(__file__), exist_ok=True)
save_path = os.path.join(os.path.dirname(__file__), "placement_model.pkl")
joblib.dump(model, save_path)
print(f"\n✅ Model saved to {save_path}")
