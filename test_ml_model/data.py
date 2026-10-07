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
