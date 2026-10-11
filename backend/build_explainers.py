import sys
import warnings
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

warnings.filterwarnings("ignore")

ML_DIR = Path(__file__).resolve().parent / "ml" / "final_model"
sys.path.insert(0, str(ML_DIR))
from data import load, xy, make_pipeline, TARGETS  # noqa

for t in TARGETS:
    X, y = xy(load(), t)
    pipe = make_pipeline(
        RandomForestClassifier(
            n_estimators=500, class_weight="balanced", random_state=42
        ),
        X,
    ).fit(X, y)
    joblib.dump(
        {"pipeline": pipe, "feature_columns": list(X.columns)},
        ML_DIR / "models" / f"{t}_explainer.joblib",
    )
    print("wrote", t)
