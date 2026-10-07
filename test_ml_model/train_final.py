#!/usr/bin/env python3
"""
train_final.py — fit the chosen models, save them, and score the test set ONCE.

Run this when model choice and thresholds are settled. Every run touches the
held-out test set, and each look costs you a little of its honesty. If you find
yourself running this repeatedly and keeping the best result, you have turned
your test set into a validation set and the number you report means nothing.

Saves one bundle per target containing the fitted pipeline, its threshold, and
the exact feature schema. Inference must rebuild the feature frame from that
schema or column order will silently drift and predictions will be wrong in a
way nothing errors on.
"""

import argparse
import warnings
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, classification_report, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split

from data import TARGETS, load, make_pipeline, xy

warnings.filterwarnings("ignore")
SEED = 42
OUT = Path(__file__).resolve().parent / "models"

# Settled in tune.py by nested CV. Not re-derived here, and never from the test set.
THRESHOLDS = {"Cath": 0.46, "LAD": 0.40, "LCX": 0.42, "RCA": 0.39}


def model_for(target: str):
    """One model family for all four targets.

    compare.py showed every candidate within noise of every other, so claiming
    a different winner per target would be fitting the noise. class_weight
    matters more than the family: it reweights the loss for the 38%-positive
    targets, which is most of what a tuned threshold would otherwise fix.
    """
    return RandomForestClassifier(n_estimators=500, class_weight="balanced",
                                  random_state=SEED, n_jobs=-1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test-size", type=float, default=0.2)
    ap.add_argument("--report", default="final_report.json")
    args = ap.parse_args()

    df = load()
    OUT.mkdir(exist_ok=True)

    # One split, shared by all four targets, stratified on overall CAD so the
    # test set has a representative case mix.
    strat = (df["Cath"].astype(str) == "CAD").astype(int)
    train_df, test_df = train_test_split(df, test_size=args.test_size,
                                         stratify=strat, random_state=SEED)
    print(f"train {len(train_df)}   test {len(test_df)}\n")

    report = {"n_train": len(train_df), "n_test": len(test_df), "targets": {}}

    print(f"{'target':<8}{'thr':>6}{'acc':>8}{'F1':>8}{'prec':>8}{'rec':>8}{'AUC':>8}"
          f"{'  (CV acc)':>12}")
    print("-" * 68)

    for target in TARGETS:
        X_tr, y_tr = xy(train_df, target)
        X_te, y_te = xy(test_df, target)
        thr = THRESHOLDS[target]

        pipe = make_pipeline(model_for(target), X_tr).fit(X_tr, y_tr)

        # Cross-validated score on the TRAINING data — the number to trust and
        # to lead with in your write-up, because it averages 5 splits.
        oof = cross_val_predict(make_pipeline(model_for(target), X_tr), X_tr, y_tr,
                                cv=StratifiedKFold(5, shuffle=True, random_state=SEED),
                                method="predict_proba", n_jobs=-1)[:, 1]
        cv_acc = accuracy_score(y_tr, (oof >= thr).astype(int))

        # The single look at the test set.
        proba = pipe.predict_proba(X_te)[:, 1]
        pred = (proba >= thr).astype(int)
        m = {
            "threshold": thr,
            "accuracy": accuracy_score(y_te, pred),
            "f1": f1_score(y_te, pred, zero_division=0),
            "precision": precision_score(y_te, pred, zero_division=0),
            "recall": recall_score(y_te, pred, zero_division=0),
            "roc_auc": roc_auc_score(y_te, proba),
            "cv_accuracy_train": cv_acc,
            "model": type(model_for(target)).__name__,
        }
        # 61 patients means the interval around any of these is roughly +/-10
        # points. Report it so nobody reads 88.5% as a precise claim.
        se = np.sqrt(m["accuracy"] * (1 - m["accuracy"]) / len(y_te))
        m["accuracy_95ci"] = [round(m["accuracy"] - 1.96 * se, 3),
                              round(m["accuracy"] + 1.96 * se, 3)]
        report["targets"][target] = m

        print(f"{target:<8}{thr:>6.2f}{m['accuracy']*100:>8.1f}{m['f1']*100:>8.1f}"
              f"{m['precision']*100:>8.1f}{m['recall']*100:>8.1f}"
              f"{m['roc_auc']*100:>8.1f}{cv_acc*100:>12.1f}")

        joblib.dump(
            {
                "pipeline": pipe,
                "threshold": thr,
                "feature_columns": list(X_tr.columns),
                "target": target,
                "positive_label": {"Cath": "CAD"}.get(target, "Stenotic"),
            },
            OUT / f"{target}.joblib",
        )

    print("-" * 68)
    for t, m in report["targets"].items():
        lo, hi = m["accuracy_95ci"]
        print(f"  {t:<6} test accuracy {m['accuracy']*100:.1f}%  "
              f"(95% CI {lo*100:.0f}–{hi*100:.0f}%)")

    Path(args.report).write_text(json.dumps(report, indent=2))
    print(f"\nmodels -> {OUT}/*.joblib")
    print(f"metrics -> {args.report}")


if __name__ == "__main__":
    main()
