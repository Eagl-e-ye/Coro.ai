import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from predictor import predict, _df, RAW_COLUMNS, TARGETS, POSITIVE

app = FastAPI(title="Cardiac Risk API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUIRED = ["Age", "Sex", "Typical Chest Pain", "HTN", "DM"]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/predict")
def do_predict(payload: dict[str, Any]):
    missing = [f for f in REQUIRED if payload.get(f) in (None, "")]
    if missing:
        raise HTTPException(422, f"missing required fields: {missing}")
    sex = payload.get("Sex")
    if sex not in {"Male", "Fmale"}:
        raise HTTPException(422, f"Sex must be 'Male' or 'Fmale', got '{sex}'")
    return predict(payload)


@app.get("/api/patients")
def patients():
    return {
        "patients": [
            {"id": int(i), "age": int(r["Age"]), "sex": str(r["Sex"])}
            for i, r in _df.iterrows()
        ]
    }


@app.get("/api/patient/{pid}")
def patient(pid: int):
    if pid not in _df.index:
        raise HTTPException(404, "no such patient")
    r = _df.loc[pid]
    feats = {}
    for c in RAW_COLUMNS:
        val = r[c]
        if pd.isna(val):
            feats[c] = None
        elif isinstance(val, (int, np.integer)):
            feats[c] = int(val)
        elif isinstance(val, (float, np.floating)):
            feats[c] = round(float(val), 1) if c == "BMI" else float(val)
        else:
            feats[c] = str(val)

    actual = {t: str(r[t]) for t in TARGETS}
    return {"id": pid, "features": feats, "actual": actual}


@app.get("/api/model-info")
def model_info():
    import json
    report_file = Path(__file__).resolve().parent / "ml" / "final_model" / "final_report.json"
    report_data = json.loads(report_file.read_text()) if report_file.exists() else {}

    return {
        "report": report_data,
        "confusion_matrices": {
            "Cath": {"tn": 11, "fp": 7, "fn": 1, "tp": 42},
            "LAD": {"tn": 12, "fp": 15, "fn": 2, "tp": 32},
            "LCX": {"tn": 16, "fp": 19, "fn": 6, "tp": 20},
            "RCA": {"tn": 14, "fp": 27, "fn": 3, "tp": 17},
        },
        "calibration_curves": {
            "Cath": {
                "prob_true": [0.0, 0.125, 0.6, 0.875, 0.889],
                "prob_pred": [0.157, 0.321, 0.544, 0.697, 0.929],
            },
            "LAD": {
                "prob_true": [0.0, 0.25, 0.533, 0.538, 0.895],
                "prob_pred": [0.135, 0.295, 0.519, 0.692, 0.893],
            },
            "LCX": {
                "prob_true": [0.0, 0.357, 0.444, 0.8],
                "prob_pred": [0.163, 0.299, 0.493, 0.67],
            },
            "RCA": {
                "prob_true": [0.0, 0.167, 0.467, 0.667],
                "prob_pred": [0.165, 0.3, 0.487, 0.65],
            },
        },
        "global_importance": [
            {"feature": "Typical Chest Pain", "Cath": 0.079, "LAD": 0.067, "LCX": 0.030, "RCA": 0.025},
            {"feature": "Age", "Cath": 0.011, "LAD": 0.009, "LCX": 0.062, "RCA": 0.028},
            {"feature": "Region RWMA", "Cath": 0.024, "LAD": 0.033, "LCX": -0.001, "RCA": -0.002},
            {"feature": "EF-TTE", "Cath": 0.008, "LAD": 0.022, "LCX": -0.001, "RCA": -0.004},
            {"feature": "DM", "Cath": 0.001, "LAD": -0.003, "LCX": 0.000, "RCA": 0.022},
        ],
        "methodology": [
            "Nested cross-validation (5x5) for threshold selection: outer-fold validation prevents threshold over-optimism.",
            "Stratified 80/20 train/test split (242 train / 61 test), stratified on overall CAD prevalence.",
            "Sigmoid calibration via CalibratedClassifierCV (cv=3) wrapping 500-tree balanced Random Forests.",
            "Permutation importance on held-out data to avoid high-cardinality bias of standard impurity importance.",
            "Leak-free scikit-learn Pipeline with preprocessor fitting scalers and encoders on training folds only.",
        ],
        "rca_framing": "RCA is our weakest target. The threshold is set to a recall floor (0.30) rather than to maximise accuracy: at 0.30 the model catches 85.0% of true RCA stenoses at 38.6% precision. A majority-class classifier would achieve 62.4% accuracy by calling every vessel normal — missing every stenosis. For a screening tool, missing a severe blockage is clinically far more hazardous than a false positive. The 95% confidence interval on RCA accuracy is 38.3–63.4% on n=61 held-out test cases.",
    }
