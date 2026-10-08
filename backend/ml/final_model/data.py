"""
Loading and preprocessing for the Z-Alizadeh Sani dataset.

One rule drives this file: every transform that LEARNS something from the data
(scaling, encoding, imputation) must live inside a sklearn Pipeline so it is
re-fitted on each training fold only. Fitting a scaler on the whole dataset
before cross-validation leaks test information into training and inflates every
score you then report.
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

TARGETS = ["Cath", "LAD", "LCX", "RCA"]

# Dropped after measuring that removal leaves CV AUC unchanged (<=0.2 pts vs a
# 3-6 pt fold spread). Reasons differ:
#   - 10 rare findings: >95% single class, no measurable signal
#   - Diastolic Murmur: nominally significant (p=0.019) but the direction is
#     PROTECTIVE (33% CAD when present vs 72% absent), which contradicts
#     pathophysiology and almost certainly reflects valve-disease referral bias.
#     A clinically wrong learned direction is worse than a missing feature.
#   - Exertional CP: constant ('N' for all 303 patients), zero information.
# St Elevation is deliberately KEPT despite 95.4% single class: it is the
# defining ECG sign of acute MI, and the data direction agrees (14/14 with CAD).
DROP_COLUMNS = [
    "EX-Smoker", "CRF", "CVA", "Airway disease", "Thyroid Disease", "CHF",
    "Edema", "Weak Peripheral Pulse", "Lung rales", "LowTH Ang",
    "Poor R Progression", "Diastolic Murmur", "Exertional CP",
    # Weight and Length (height) are collinear with BMI (BMI = weight/height^2),
    # which engineer() keeps. Dropping them moved CV AUC by -0.8..+0.3 (noise)
    # but removes two correlated columns that split SHAP importance three ways,
    # which muddies the explanation panel. The UI still COLLECTS weight+height
    # and computes BMI from them; only the model inputs drop them.
    "Weight", "Length",
]

# Positive class for each target, so "1" always means "disease present".
POSITIVE = {"Cath": "CAD", "LAD": "Stenotic", "LCX": "Stenotic", "RCA": "Stenotic"}

DATA = Path(__file__).resolve().parent / "dataset.xlsx"


def load(path: Path = DATA) -> pd.DataFrame:
    df = pd.read_excel(path)
    df.columns = [str(c).strip() for c in df.columns]
    return df


def flag(col: pd.Series) -> pd.Series:
    """Coerce a yes/no column to 0.0/1.0 regardless of how it is spelled.

    This dataset mixes conventions: 'Q Wave' is int 0/1, 'LVH' is str 'Y'/'N'.
    Assuming either one breaks on the other.
    """
    if pd.api.types.is_numeric_dtype(col):
        return col.astype(float).clip(0, 1)
    return col.astype(str).str.strip().str.upper().isin({"Y", "YES", "1", "TRUE"}).astype(float)


def engineer(df: pd.DataFrame) -> pd.DataFrame:
    """Clinically motivated derived features.

    These are pure functions of other columns — no fitting, no data-dependent
    constants — so they are safe to compute before splitting. The FastAPI
    service must call this exact function on incoming patients, or a What-If
    slider that changes LDL will leave Lipid_Risk_Ratio stale.
    """
    df = df.copy()

    # Anterior ECG burden. LAD supplies the anterior wall, so anterior-territory
    # ECG changes should carry more weight for LAD than a generic ECG flag.
    df["Anterior_Risk_Score"] = (
        flag(df["Q Wave"]) + flag(df["St Elevation"]) + flag(df["Poor R Progression"])
    )

    # Atherogenic ratio. Standard clinical index, more informative than LDL alone.
    df["Lipid_Risk_Ratio"] = df["LDL"] / df["HDL"].replace(0, np.nan)
    df["Lipid_Risk_Ratio"] = df["Lipid_Risk_Ratio"].fillna(df["Lipid_Risk_Ratio"].median())

    # Total ischaemic ECG burden across all territories.
    df["ECG_Abnormality_Count"] = (
        flag(df["Q Wave"]) + flag(df["St Elevation"]) + flag(df["St Depression"])
        + flag(df["Tinversion"]) + flag(df["LVH"]) + flag(df["Poor R Progression"])
    )

    # Any anginal presentation, since the four chest-pain columns are related.
    df["Any_Angina"] = np.maximum.reduce([
        flag(df["Typical Chest Pain"]).values, flag(df["Atypical"]).values,
        flag(df["Nonanginal"]).values, flag(df["Exertional CP"]).values,
    ])

    return df


def xy(df: pd.DataFrame, target: str, use_engineered: bool = True):
    """Split into features and a 0/1 label.

    All four target columns are dropped from X. Leaving LAD in while predicting
    RCA would leak — the vessels are correlated, and the model would score well
    on information a real patient has not got yet.
    """
    work = engineer(df) if use_engineered else df.copy()
    X = work.drop(columns=TARGETS)
    X = X.drop(columns=[c for c in DROP_COLUMNS if c in X.columns])
    y = (df[target].astype(str) == POSITIVE[target]).astype(int)
    return X, y


def build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    num = X.select_dtypes(include=["number"]).columns.tolist()
    cat = [c for c in X.columns if c not in num]
    return ColumnTransformer(
        [
            ("num", StandardScaler(), num),
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), cat),
        ],
        remainder="drop",
    )


def make_pipeline(model, X: pd.DataFrame) -> Pipeline:
    return Pipeline([("prep", build_preprocessor(X)), ("clf", model)])


# ---------------------------------------------------------------------------
# The model, defined ONCE.
#
# tune.py and train_final.py both import this. Previously each kept its own
# copy, which meant changing one and not the other produced thresholds tuned
# for a model that was never the one deployed — and nothing errored.
# ---------------------------------------------------------------------------
from sklearn.calibration import CalibratedClassifierCV          # noqa: E402
from sklearn.ensemble import RandomForestClassifier             # noqa: E402

SEED = 42


def model_for(target: str = None):
    """RandomForest wrapped in Platt (sigmoid) calibration.

    Why RandomForest: compare.py found every candidate — including XGBoost and
    LightGBM — tied within fold-to-fold noise. Boosting needs more rows than
    303 for its advantage to appear; at this size, bagging's variance reduction
    is the better fit, and XGBoost on default settings is actively worse
    (AUC 90.7 vs 93.0 on Cath) because those defaults assume far more data.

    Why calibration: a RandomForest probability is the fraction of trees that
    voted yes. That ranks patients well but is a poor estimate of actual risk —
    raw, this model's stated probability is off by ~13 percentage points on
    average. Since the UI prints that number as a percentage and colours
    arteries by thresholding it, the number has to mean what it says.

        Cath   raw RF: AUC 92.6, calibration error 12.9%
               +sigmoid: AUC 92.4, calibration error  4.0%

    Sigmoid over isotonic: isotonic calibrates as well but costs more AUC on
    this little data, and it emits exact 0.00 and 1.00 — printing "0% risk"
    to a clinician is a claim no model on 303 patients can support.
    """
    return CalibratedClassifierCV(
        RandomForestClassifier(n_estimators=500, class_weight="balanced",
                               random_state=SEED, n_jobs=-1),
        method="sigmoid", cv=3,
    )
