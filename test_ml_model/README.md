# test_ml_model — sandbox for the CAD / vessel-stenosis models

Self-contained. Nothing here imports from the main project, so experiment
freely and merge into `backend/ml/` when a result is worth keeping.

```
test_ml_model/
├── dataset.xlsx        303 patients, 55 features, 4 targets
├── data.py             loading, derived features, leak-free pipeline
├── compare.py          6 model families, repeated CV
├── tune.py             decision thresholds via NESTED CV
├── train_final.py      fit + save + score the test set once
└── models/             *.joblib bundles (created by train_final.py)
```

## Setup

```bash
pip install -r requirements.txt
```

Close `dataset.xlsx` in Excel first — an open workbook can block pandas on
Windows, and it leaves a `~$dataset.xlsx` lock file lying around.

## Run order

```bash
python compare.py        # which model family? (~3 min)
python tune.py           # which threshold?    (~5 min)
python train_final.py    # fit, save, score    (~1 min)
```

Run with plain `python`, not `python -I` — the isolated flag removes the
script's own folder from the import path and `from data import ...` fails.

## The rule that governs this folder

**`train_final.py` touches the test set. Nothing else does.**

303 patients means a 20% test set is 61 people. One patient flipping moves
accuracy by 1.6 points, and the 95% interval around any score is roughly
±10 points. If you run `train_final.py` twenty times and keep the best, you
have not found a better model — you have found the configuration that got
luckiest on 61 people, and the number you report will not survive contact
with new data.

Model choice and thresholds get decided in `compare.py` and `tune.py`, both of
which use cross-validation on the training data only.

## Results so far

Cross-validated (5-fold × 5 repeats, 25 estimates per model):

| target | CV accuracy | CV ROC-AUC | majority baseline | gain |
|---|---|---|---|---|
| Cath | 87.5 ±3.9 | 92.7 ±3.5 | 71.3% | +16.2 |
| LAD  | 79.1 ±3.8 | 86.1 ±4.4 | 58.4% | +20.7 |
| LCX  | 67.7 ±5.2 | 72.1 ±6.0 | 60.7% | +7.0 |
| RCA  | 66.9 ±4.5 | 72.1 ±5.6 | 62.4% | +4.5 |

Three findings:

1. **All six model families tie.** AUC gaps of 0.2–1.2 points against
   fold-to-fold spreads of 3.6–6.4. Picking a different winner per target
   would be fitting noise, so one family (RandomForest) is used throughout.
2. **The engineered features do nothing.** `Anterior_Risk_Score`,
   `Lipid_Risk_Ratio` and two others change AUC by under 1 point in either
   direction. Keep them for the clinical narrative, but do not claim they
   improved anything.
3. **Threshold tuning adds almost nothing** — because `class_weight="balanced"`
   already does most of the work:

   | target | class_weight | F1 @0.5 | F1 @best | gain |
   |---|---|---|---|---|
   | LCX | none | 47.7 | 64.6 | +16.9 |
   | LCX | balanced | 59.1 | 64.2 | +5.1 |
   | RCA | none | 42.7 | 60.8 | +18.1 |
   | RCA | balanced | 53.0 | 61.6 | +8.6 |

   And nested CV shows even the +5 to +9 above is mostly self-deception: the
   honest gain is about +1 F1.

## Data quirks

- **`Exertional CP` is constant** — every patient is `N`. Zero information.
- **Y/N columns are inconsistently typed.** `Q Wave` is int `0/1`, `LVH` is
  string `'Y'/'N'`. `data.py` has a `flag()` helper that handles both; code
  that assumes one convention breaks silently on the other.
- **Unseen categories at test time.** `BBB` has values the training split may
  not contain. The one-hot encoder uses `handle_unknown="ignore"`, so these
  become all-zeros rather than crashing — correct, but worth knowing.

## Gotcha that cost an hour

**Thresholds are model-specific.** A 0.28 cutoff tuned for logistic regression,
applied to a RandomForest, dropped RCA accuracy to 39% — below the 62% baseline.
Tree probabilities are calibrated differently from linear ones. If you change
the model, re-run `tune.py` before `train_final.py`.

## What to report in the write-up

Lead with the **cross-validated** numbers and their spread. Mention the test-set
numbers as a single confirmation run, with the confidence interval attached.
`final_report.json` carries both plus a 95% CI per target.

Saying "LCX and RCA are weak (AUC ~0.72), and the clinical features in this
dataset simply do not carry much about those territories" is a stronger answer
than four suspiciously precise numbers. It is also true.
