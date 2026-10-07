#!/usr/bin/env python3
"""
compare.py — honest model comparison for all four targets.

Why repeated cross-validation instead of a single train/test split:
  303 patients means a 20% test set is 61 people. One person flipping from
  wrong to right moves accuracy by 1.6 points, and the 95% interval around any
  score is roughly +/- 10 points. Picking a model because it scored 2 points
  higher on that split is picking noise.

  5-fold CV repeated 5 times gives 25 estimates per model. The spread it
  reports tells you whether a difference between two models is real.

The held-out test set is NOT touched here. Model and threshold selection happen
on CV only; the test set is scored once, at the very end, by final_eval.py.
"""

import argparse
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import (ExtraTreesClassifier, GradientBoostingClassifier,
                              RandomForestClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold, cross_validate
from sklearn.svm import SVC

from data import TARGETS, load, make_pipeline, xy

warnings.filterwarnings("ignore")

SEED = 42

CANDIDATES = {
    "LogReg":      LogisticRegression(max_iter=3000, class_weight="balanced", random_state=SEED),
    "LogReg-L1":   LogisticRegression(max_iter=3000, penalty="l1", solver="liblinear",
                                      class_weight="balanced", random_state=SEED),
    "ExtraTrees":  ExtraTreesClassifier(n_estimators=500, class_weight="balanced",
                                        random_state=SEED, n_jobs=-1),
    "RandomForest": RandomForestClassifier(n_estimators=500, class_weight="balanced",
                                           random_state=SEED, n_jobs=-1),
    "GradBoost":   GradientBoostingClassifier(random_state=SEED),
    "SVM-RBF":     SVC(probability=True, class_weight="balanced", random_state=SEED),
}

SCORING = ["accuracy", "f1", "roc_auc", "precision", "recall"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeats", type=int, default=5)
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--no-engineered", action="store_true",
                    help="turn off the derived features, to check they help")
    args = ap.parse_args()

    df = load()
    cv = RepeatedStratifiedKFold(n_splits=args.folds, n_repeats=args.repeats,
                                 random_state=SEED)
    print(f"{args.folds}-fold CV x{args.repeats} repeats = "
          f"{args.folds * args.repeats} estimates per model\n")

    all_rows = []
    for target in TARGETS:
        X, y = xy(df, target, use_engineered=not args.no_engineered)
        majority = max(y.mean(), 1 - y.mean())
        print(f"{'=' * 78}\n{target}   n={len(y)}  positives={y.sum()} "
              f"({y.mean()*100:.0f}%)   majority baseline={majority*100:.1f}%\n{'=' * 78}")
        print(f"{'model':<14}{'accuracy':>16}{'F1':>16}{'ROC-AUC':>16}")

        rows = []
        for name, model in CANDIDATES.items():
            res = cross_validate(make_pipeline(model, X), X, y, cv=cv,
                                 scoring=SCORING, n_jobs=-1)
            row = {"target": target, "model": name}
            for s in SCORING:
                row[s] = res[f"test_{s}"].mean()
                row[s + "_sd"] = res[f"test_{s}"].std()
            rows.append(row)
            print(f"{name:<14}"
                  f"{row['accuracy']*100:>9.1f} ±{row['accuracy_sd']*100:<5.1f}"
                  f"{row['f1']*100:>9.1f} ±{row['f1_sd']*100:<5.1f}"
                  f"{row['roc_auc']*100:>9.1f} ±{row['roc_auc_sd']*100:<5.1f}")

        best = max(rows, key=lambda r: r["roc_auc"])
        gain = best["accuracy"] - majority
        print(f"\n  best by ROC-AUC: {best['model']}  "
              f"(accuracy {gain*100:+.1f} pts vs majority baseline)")

        # Is the winner actually distinguishable from the runner-up?
        ranked = sorted(rows, key=lambda r: -r["roc_auc"])
        a, b = ranked[0], ranked[1]
        sep = abs(a["roc_auc"] - b["roc_auc"])
        pooled = (a["roc_auc_sd"] + b["roc_auc_sd"]) / 2
        verdict = "a real difference" if sep > pooled else "INSIDE the noise — treat as a tie"
        print(f"  {a['model']} vs {b['model']}: AUC gap {sep*100:.1f} pts, "
              f"typical fold spread {pooled*100:.1f} pts -> {verdict}\n")
        all_rows += rows

    pd.DataFrame(all_rows).to_csv("cv_results.csv", index=False)
    print("full table -> cv_results.csv")


if __name__ == "__main__":
    main()
