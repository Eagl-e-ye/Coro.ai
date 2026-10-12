"""Loads the frozen models and turns a raw patient dict into the API payload.
Reuses data.py so preprocessing matches training exactly."""
import sys
import json
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
import shap

warnings.filterwarnings("ignore")

ML_DIR = Path(__file__).resolve().parent / "ml" / "final_model"
MODELS_DIR = ML_DIR / "models"
DATA_PATH = ML_DIR / "dataset.xlsx"
THRESH_PATH = ML_DIR / "thresholds.json"
sys.path.insert(0, str(ML_DIR))  # so `import data` finds data.py

from data import load, engineer, DROP_COLUMNS, TARGETS, POSITIVE  # noqa: E402

IMPORTANT = [
    "Typical Chest Pain",
    "Age",
    "Atypical",
    "Region RWMA",
    "EF-TTE",
    "HTN",
    "DM",
    "ECG_Abnormality_Count",
]

_df = load(DATA_PATH)
RAW_COLUMNS = [c for c in _df.columns if c not in TARGETS]  # 55 raw inputs

DEFAULTS = {}
for c in RAW_COLUMNS:
    s = _df[c]
    if pd.api.types.is_numeric_dtype(s):
        DEFAULTS[c] = float(s.median())
    else:
        DEFAULTS[c] = s.mode()[0]

_bundles = {t: joblib.load(MODELS_DIR / f"{t}.joblib") for t in TARGETS}
FEATURE_COLUMNS = _bundles["Cath"]["feature_columns"]  # identical across targets
_thresholds = json.loads(Path(THRESH_PATH).read_text())["thresholds"]

# Load explainer bundles and pre-initialize TreeExplainers (Phase B)
_explainer_bundles = {}
_explainers = {}
for t in ["LAD", "LCX", "RCA"]:
    exp_path = MODELS_DIR / f"{t}_explainer.joblib"
    if exp_path.exists():
        b = joblib.load(exp_path)
        _explainer_bundles[t] = b
        _explainers[t] = shap.TreeExplainer(b["pipeline"].steps[1][1])


def risk_from_prob(p, thr):
    if p >= thr + 0.15:
        return "High", "#da3633"
    if p >= thr - 0.05:
        return "Moderate", "#e3b341"
    return "Low", "#2ea043"


def _featurize(raw: dict):
    row = {
        c: (raw.get(c) if raw.get(c) not in (None, "") else DEFAULTS[c])
        for c in RAW_COLUMNS
    }
    w = float(row.get("Weight") or DEFAULTS["Weight"])
    l = float(row.get("Length") or DEFAULTS["Length"])
    h = l / 100.0
    row["BMI"] = round(w / (h * h), 1) if h > 0 else round(float(DEFAULTS["BMI"]), 1)
    row["Obesity"] = "Y" if float(row["BMI"]) >= 30 else "N"

    df = pd.DataFrame([row])
    df = engineer(df)
    df = df.drop(columns=[c for c in DROP_COLUMNS if c in df.columns])
    df = df[FEATURE_COLUMNS]  # exact columns, exact order
    return df


def _get_top_shap(target: str, X: pd.DataFrame, raw: dict):
    if target not in _explainers:
        return []
    try:
        pipe = _explainer_bundles[target]["pipeline"]
        prep = pipe.steps[0][1]
        explainer = _explainers[target]

        X_trans = prep.transform(X)
        feat_names = list(prep.get_feature_names_out())
        vals = explainer.shap_values(X_trans)

        if isinstance(vals, list):
            sv = vals[1][0]
        elif vals.ndim == 3:
            sv = vals[0, :, 1]
        else:
            sv = vals[0]

        raw_impacts = {}
        for feat_name, impact in zip(feat_names, sv):
            clean = feat_name.replace("num__", "").replace("cat__", "")
            base_col = clean
            for col in (
                RAW_COLUMNS
                + [
                    "Anterior_Risk_Score",
                    "Lipid_Risk_Ratio",
                    "ECG_Abnormality_Count",
                    "Any_Angina",
                ]
            ):
                if clean.startswith(col):
                    base_col = col
                    break

            if base_col not in raw_impacts or abs(impact) > abs(
                raw_impacts[base_col]
            ):
                raw_impacts[base_col] = impact

        sorted_feats = sorted(
            raw_impacts.items(), key=lambda x: abs(x[1]), reverse=True
        )

        out = []
        for feat, imp in sorted_feats[:3]:
            # Look up feature value: check featurized X first (engineered features), then raw input, then DEFAULTS
            if feat in X.columns:
                val = X[feat].iloc[0]
                if isinstance(val, (float, np.floating)):
                    if feat == "BMI":
                        raw_val = round(float(val), 1)
                    elif float(val).is_integer():
                        raw_val = int(val)
                    else:
                        raw_val = round(float(val), 2)
                elif isinstance(val, (int, np.integer)):
                    raw_val = int(val)
                else:
                    raw_val = val
            elif feat in raw and raw[feat] not in (None, ""):
                val = raw[feat]
                if isinstance(val, (float, np.floating)):
                    raw_val = round(float(val), 1) if feat == "BMI" else round(float(val), 2)
                else:
                    raw_val = val
            else:
                raw_val = DEFAULTS.get(feat, "N/A")
                if isinstance(raw_val, (float, np.floating)):
                    raw_val = round(float(raw_val), 1) if feat == "BMI" else round(float(raw_val), 2)

            out.append(
                {
                    "feature": feat,
                    "value": raw_val,
                    "impact": f"{imp:+.2f}",
                }
            )
        return out
    except Exception:
        return []


def predict(raw: dict) -> dict:
    X = _featurize(raw)
    entered = [c for c in RAW_COLUMNS if raw.get(c) not in (None, "")]
    assumed = [c for c in RAW_COLUMNS if c not in entered]

    out_vessels = {}
    for t in ["LAD", "LCX", "RCA"]:
        p = float(_bundles[t]["pipeline"].predict_proba(X)[0, 1])
        thr = _thresholds[t]
        level, color = risk_from_prob(p, thr)
        status = (
            "Stenotic"
            if p >= thr
            else "Borderline"
            if p >= thr - 0.05
            else "Normal"
        )
        shap_feats = _get_top_shap(t, X, raw)
        out_vessels[t] = {
            "probability": p,
            "status": status,
            "risk_level": level,
            "color_hex": color,
            "threshold_used": thr,
            "top_shap_features": shap_feats,
        }

    pc = float(_bundles["Cath"]["pipeline"].predict_proba(X)[0, 1])
    tc = _thresholds["Cath"]
    return {
        "overall_cad": {
            "probability": pc,
            "status": "High Risk (CAD)" if pc >= tc else "Low Risk (Normal)",
            "threshold_used": tc,
        },
        "vessels": out_vessels,
        "meta": {
            "entered_count": len(entered),
            "assumed_count": len(assumed),
            "assumed_important": [c for c in assumed if c in IMPORTANT],
            "model_version": "calibrated-rf-2026-10-08",
        },
    }
