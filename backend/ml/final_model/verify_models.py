#!/usr/bin/env python3
"""
verify_models.py — load the saved models and reproduce the reported metrics.

Why this exists
---------------
A repository can contain a `final_report.json` full of numbers and a folder of
`.joblib` files with no guarantee the two have anything to do with each other.
This script closes that gap: it loads the committed model bundles, rebuilds the
same held-out test split, scores it, and compares the result against the
committed report.

It trains nothing. If it prints OK, the numbers in the report, the documentation
and the running application all come from the weights in this folder.

Usage
-----
    python verify_models.py                 # verify against final_report.json
    python verify_models.py --tolerance 0   # require exact agreement

Exit code 0 on success, 1 on any mismatch.
"""

import argparse
import json
import sys
from pathlib import Path

import joblib
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split

from data import TARGETS, load, xy

HERE = Path(__file__).resolve().parent
SEED = 42          # must match train_final.py
TEST_SIZE = 0.20   # must match train_final.py


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tolerance", type=float, default=0.005,
                    help="allowed absolute difference per metric (default 0.005)")
    ap.add_argument("--report", default=str(HERE / "final_report.json"))
    args = ap.parse_args()

    report_path = Path(args.report)
    if not report_path.exists():
        print(f"ERROR: {report_path.name} not found.")
        return 1
    report = json.loads(report_path.read_text())

    import sklearn
    trained_with = json.loads((HERE / "thresholds.json").read_text()).get("sklearn")
    if trained_with and sklearn.__version__ != trained_with:
        print(f"WARNING: scikit-learn {sklearn.__version__} differs from the "
              f"training version {trained_with}.")
        print("         Calibrated probabilities shift between versions, so the "
              "stored thresholds may no longer be valid.\n")

    # Rebuild the identical split used by train_final.py: raw frame, stratified
    # on overall CAD, same seed and size. xy() applies the feature engineering,
    # so the exact training-time transform is reused rather than reimplemented.
    df = load()
    strat = (df["Cath"].astype(str) == "CAD").astype(int)
    _, test_df = train_test_split(df, test_size=TEST_SIZE, stratify=strat,
                                  random_state=SEED)
    print(f"Held-out test set: {len(test_df)} patients "
          f"(report says {report.get('n_test')})\n")

    header = f"{'target':<7}{'metric':<11}{'reported':>10}{'recomputed':>12}{'diff':>9}"
    print(header)
    print("-" * len(header))

    failures = 0
    for target in TARGETS:
        bundle = joblib.load(HERE / "models" / f"{target}.joblib")
        pipe = bundle["pipeline"]
        thr = bundle["threshold"]

        X, y = xy(test_df, target)
        X = X[bundle["feature_columns"]]      # same column order as training

        proba = pipe.predict_proba(X)[:, 1]
        pred = (proba >= thr).astype(int)

        got = {
            "accuracy":  accuracy_score(y, pred),
            "f1":        f1_score(y, pred, zero_division=0),
            "precision": precision_score(y, pred, zero_division=0),
            "recall":    recall_score(y, pred, zero_division=0),
            "roc_auc":   roc_auc_score(y, proba),
        }

        said = report["targets"][target]
        if abs(said["threshold"] - thr) > 1e-9:
            print(f"{target:<7}{'threshold':<11}{said['threshold']:>10.3f}"
                  f"{thr:>12.3f}{abs(said['threshold'] - thr):>9.3f}  MISMATCH")
            failures += 1

        for name, value in got.items():
            diff = abs(value - said[name])
            bad = diff > args.tolerance
            failures += bad
            print(f"{target:<7}{name:<11}{said[name]:>10.3f}{value:>12.3f}"
                  f"{diff:>9.3f}{'  MISMATCH' if bad else ''}")
        print()

    if failures:
        print(f"FAILED — {failures} metric(s) outside tolerance {args.tolerance}.")
        print("The committed models do not reproduce the committed report.")
        return 1

    print(f"OK — all metrics reproduce within {args.tolerance}.")
    print("The committed weights produce the numbers reported in "
          f"{report_path.name}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
