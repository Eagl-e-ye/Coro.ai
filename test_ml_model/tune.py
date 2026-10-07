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
import warnings

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from data import TARGETS, load, make_pipeline, xy

warnings.filterwarnings("ignore")
SEED = 42
GRID = np.arange(0.20, 0.81, 0.01)


def model_for(target: str):
    """One model family for all four targets.

    compare.py showed every candidate within noise of every other (AUC gaps of
    0.2-1.2 points against fold-to-fold spreads of 3.6-6.4). Claiming a
    different winner per target would be fitting the noise. One family is
    simpler to explain, simpler to serve, and no worse.

    class_weight="balanced" matters more than the family choice: it reweights
    the loss for the 38%-positive targets, which is most of what a tuned
    decision threshold would otherwise have to fix.
    """
    return RandomForestClassifier(n_estimators=500, class_weight="balanced",
                                  random_state=SEED, n_jobs=-1)


def best_threshold(y_true, proba, metric=f1_score):
    scores = [metric(y_true, (proba >= t).astype(int), zero_division=0) for t in GRID]
    return float(GRID[int(np.argmax(scores))]), float(np.max(scores))


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
                                    cv=inner, method="predict_proba", n_jobs=-1)[:, 1]
            thr, _ = best_threshold(y_tr, oof)

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
                                     method="predict_proba", n_jobs=-1)[:, 1]
        _, naive_f1 = best_threshold(y, full_oof)

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
    print("thresholds:", {k: round(v, 2) for k, v in chosen.items()})
    print("\nThese go into the saved model bundle so inference reproduces evaluation.")


if __name__ == "__main__":
    main()
