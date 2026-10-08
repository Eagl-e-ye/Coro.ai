#!/usr/bin/env python3
"""
tune.py — find the decision threshold for each target, honestly.

Why thresholds matter here:
  LCX and RCA are ~38% positive. A model forced to decide at p=0.5 will play it
  safe and call almost everyone negative, which keeps accuracy respectable while
  F1 collapses. Moving the cutoff down trades a little accuracy for a lot of
  recall. That is the right trade for a screening tool — missing a stenosis is
  worse than flagging one for a second look.

Why NESTED cross-validation:
  The obvious approach is: get probabilities by CV, sweep the threshold, keep
  the best F1. That number is a lie. The threshold was chosen by looking at the
  same predictions it is then scored on, so it has peeked at the answers.

  Instead, for each outer fold:
     - take the 4/5 training portion
     - run an INNER CV inside it to get out-of-fold probabilities
     - choose the threshold that maximises F1 on those
     - apply that threshold to the outer 1/5, which the threshold never saw
  The reported score is then what you would actually get on new patients.

  The gap printed between "naive" and "nested" is the size of the self-deception
  you avoided.
"""

import argparse
import json
import platform
import warnings
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from data import TARGETS, load, make_pipeline, model_for, xy

warnings.filterwarnings("ignore")
SEED = 42
GRID = np.arange(0.20, 0.81, 0.01)

# Threshold OBJECTIVE differs by target, because the clinical use differs.
#   Cath, LAD  -> F1-optimal. These are strong models; balance precision/recall.
#   LCX, RCA   -> recall floor. These are weak (AUC ~0.72); chasing F1 is
#                 pointless, so instead guarantee we catch most true stenoses
#                 (recall >= RECALL_FLOOR) and accept lower precision. Missing a
#                 blockage is worse than a false alarm in a screening tool.
RECALL_FLOOR = 0.85
RECALL_TARGETS = {"LCX", "RCA"}


def best_threshold(y_true, proba, target):
    preds = {t: (proba >= t).astype(int) for t in GRID}
    if target in RECALL_TARGETS:
        # highest threshold (best precision) that still clears the recall floor;
        # fall back to F1-optimal if the floor is unreachable on this fold
        ok = [t for t in GRID
              if recall_score(y_true, preds[t], zero_division=0) >= RECALL_FLOOR]
        if ok:
            t = max(ok)
            return float(t), float(f1_score(y_true, preds[t], zero_division=0))
    f1s = [f1_score(y_true, preds[t], zero_division=0) for t in GRID]
    best = GRID[int(np.argmax(f1s))]
    return float(best), float(np.max(f1s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--inner-folds", type=int, default=5)
    args = ap.parse_args()

    df = load()
    print(f"Nested CV: {args.folds} outer folds, {args.inner_folds} inner folds\n")
    print(f"{'target':<8}{'thresh':>8}{'accuracy':>11}{'F1':>10}{'precision':>11}"
          f"{'recall':>9}   {'F1 @0.5':>8}{'naive F1':>10}")
    print("-" * 78)

    chosen = {}
    for target in TARGETS:
        X, y = xy(df, target)
        model = model_for(target)
        outer = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=SEED)

        accs, f1s, precs, recs, thrs, half_f1s = [], [], [], [], [], []

        for tr_idx, te_idx in outer.split(X, y):
            X_tr, y_tr = X.iloc[tr_idx], y.iloc[tr_idx]
            X_te, y_te = X.iloc[te_idx], y.iloc[te_idx]

            # --- pick the threshold using ONLY the training portion ---------
            inner = StratifiedKFold(n_splits=args.inner_folds, shuffle=True,
                                    random_state=SEED)
            oof = cross_val_predict(make_pipeline(model, X_tr), X_tr, y_tr,
                                    cv=inner, method="predict_proba", n_jobs=2)[:, 1]
            thr, _ = best_threshold(y_tr, oof, target)

            # --- now score the untouched outer fold -------------------------
            pipe = make_pipeline(model, X_tr).fit(X_tr, y_tr)
            p_te = pipe.predict_proba(X_te)[:, 1]
            pred = (p_te >= thr).astype(int)

            thrs.append(thr)
            accs.append(accuracy_score(y_te, pred))
            f1s.append(f1_score(y_te, pred, zero_division=0))
            precs.append(precision_score(y_te, pred, zero_division=0))
            recs.append(recall_score(y_te, pred, zero_division=0))
            half_f1s.append(f1_score(y_te, (p_te >= 0.5).astype(int), zero_division=0))

        # The optimistic number you'd have reported without nesting.
        full_oof = cross_val_predict(make_pipeline(model, X), X, y,
                                     cv=StratifiedKFold(args.folds, shuffle=True,
                                                        random_state=SEED),
                                     method="predict_proba", n_jobs=2)[:, 1]
        _, naive_f1 = best_threshold(y, full_oof, target)

        thr_final = float(np.median(thrs))
        chosen[target] = thr_final
        print(f"{target:<8}{thr_final:>8.2f}"
              f"{np.mean(accs)*100:>8.1f} ±{np.std(accs)*100:<3.1f}"
              f"{np.mean(f1s)*100:>7.1f} ±{np.std(f1s)*100:<3.1f}"
              f"{np.mean(precs)*100:>10.1f}{np.mean(recs)*100:>9.1f}"
              f"   {np.mean(half_f1s)*100:>8.1f}{naive_f1*100:>10.1f}")

    print("-" * 78)
    print("\nF1 @0.5   = what you get leaving the threshold at the default")
    print("naive F1  = what you'd have reported by tuning and scoring on the same data")
    print("F1 column = the honest number: threshold chosen without seeing the fold\n")
    # Write them to disk. train_final.py READS this file and keeps no copy of
    # its own. A threshold that lives only in a terminal scrollback is one that
    # will drift out of sync with the model it was tuned for, and nothing will
    # error when it does.
    import sklearn
    out = Path(__file__).resolve().parent / "thresholds.json"
    out.write_text(json.dumps({
        "thresholds": {k: round(v, 3) for k, v in chosen.items()},
        "model": "CalibratedClassifierCV(RandomForest 500, sigmoid, cv=3)",
        "method": f"nested CV {args.folds}x{args.inner_folds}; F1-optimal for Cath/LAD, recall-floor {RECALL_FLOOR} for LCX/RCA",
        "sklearn": sklearn.__version__,
        "python": platform.python_version(),
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }, indent=2))

    print("thresholds:", {k: round(v, 2) for k, v in chosen.items()})
    print(f"\nwrote {out.name} — train_final.py reads this. "
          f"Re-run tune.py whenever you change the model.")


if __name__ == "__main__":
    main()
