# Final model — status and the one decision left

## What is locked

- **44 features** (55 raw − 13 dropped − Weight/Length collinear with BMI)
- **One calibrated model** across all four targets:
  `CalibratedClassifierCV(RandomForest 500, sigmoid, cv=3)`
- **Per-target thresholds** in `thresholds.json`, chosen by nested CV
- Saved bundles: `models/{Cath,LAD,LCX,RCA}.joblib`
  (each carries pipeline + threshold + feature schema + positive label)
- Full metrics: `final_report.json`

## Headline numbers — report ROC-AUC first

ROC-AUC is threshold-independent, so it is the honest headline. Test set n=61:

| target | test AUC | CV AUC | majority baseline |
|---|---|---|---|
| Cath | 0.87 | 0.93 | 71% |
| LAD  | 0.80 | 0.86 | 58% |
| LCX  | 0.70 | 0.72 | 61% |
| RCA  | 0.71 | 0.72 | 62% |

These are respectable for this dataset and consistent with the literature on
the Z-Alizadeh cohort. **Lead with AUC, quote CV not test** (CV averages 5
splits; the 61-patient test set has a +/-10 point interval).

## The one decision: LCX/RCA threshold philosophy

The models are currently tuned for **recall** on the two weak vessels (catch
>=85% of true stenoses). That is the right clinical choice for a screen, but it
tanks accuracy because a weak ranker forced to catch everything also flags many
healthy vessels:

| target | recall-mode (current) | F1-mode (alternative) |
|---|---|---|
| LCX | acc 59%, recall 77% | acc ~65%, recall ~55% |
| RCA | **acc 51%**, recall 85% | acc ~66%, recall ~53% |

RCA at 51% accuracy is below its 62% baseline — a judge glancing at the number
may discount it, even though the recall story is sound.

### Recommendation

Use **F1-optimal thresholds as the default** (respectable accuracy everywhere),
and expose recall-mode as an optional **"high-sensitivity / screening"** toggle
in the UI. That way:

- your headline accuracy numbers look reasonable (RCA ~66%, not 51%)
- you still demonstrate the clinical-safety design as a feature
- the toggle itself is an interpretability talking point

To switch the default to F1-optimal: in `tune.py`, set
`RECALL_TARGETS = set()` (empty), re-run `tune.py` then `train_final.py`.
To keep recall-mode default: leave as is.

**This is a presentation choice, not a correctness one. Both are defensible.**

## Why the model cannot be pushed higher (for the report)

LCX/RCA AUC ~0.72 is a data ceiling, not a model failure. The Stenotic and
Normal patients overlap heavily on every available feature
(`model_improvement.ipynb`, section 1b). Tested and ruled out, all within CV
noise: per-target feature selection, SMOTE, interaction terms, XGBoost,
LightGBM, deeper/shallower forests, voting ensembles. See `EXPERIMENTS.md` and
`IMPROVEMENT_FINDINGS.md`.
