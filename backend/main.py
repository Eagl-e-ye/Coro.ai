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
            feats[c] = float(val)
        else:
            feats[c] = str(val)

    actual = {t: str(r[t]) for t in TARGETS}
    return {"id": pid, "features": feats, "actual": actual}
