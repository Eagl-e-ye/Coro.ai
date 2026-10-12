# Prediction pipeline — coronary artery disease and per-vessel stenosis

Four calibrated classifiers predicting overall coronary artery disease (CAD) and
stenosis in the three major coronary vessels, from routine clinical, laboratory,
ECG and echocardiographic measurements.

This folder is self-contained: the training code, the trained weights, the
decision thresholds, the evaluation report, and a script that checks the weights
actually reproduce that report.

---

## Contents

| file | what it is |
|---|---|
| `data.py` | loading, feature engineering, and the preprocessing pipeline. **The single source of truth** — the serving backend imports this module rather than reimplementing any of it |
| `tune.py` | nested cross-validation to select a decision threshold per target → writes `thresholds.json` |
| `train_final.py` | fits the final models on the training split, scores the held-out test set once → writes `models/*.joblib` and `final_report.json` |
| `verify_models.py` | loads the committed weights and checks they reproduce `final_report.json` |
| `thresholds.json` | the chosen thresholds, plus the exact library versions they were selected under |
| `final_report.json` | held-out test metrics per target |
| `models/{target}.joblib` | the calibrated model bundles used for prediction |
| `models/{target}_explainer.joblib` | uncalibrated forests used for SHAP (see *Explainability*) |
| `dataset.xlsx` | the Z-Alizadeh Sani extension dataset (303 patients) |
| `MODEL_CARD.md` | intended use, performance, and limitations |

---

## Reproducing

```bash
pip install -r requirements.txt

python tune.py          # nested CV  -> thresholds.json      (~5 min)
python train_final.py   # fit + score -> models/, final_report.json
python verify_models.py # confirm the weights match the report
```

`verify_models.py` trains nothing. It loads the committed `.joblib` files,
rebuilds the identical held-out split, and compares every metric against
`final_report.json`. Current output: **all 20 metrics reproduce to within
0.0005.**

> **scikit-learn is pinned to 1.9.1.** Calibrated probabilities shift between
> versions, which silently invalidates the stored thresholds — the model would
> still load and still predict, just at the wrong operating point. If you install
> a different version, `verify_models.py` warns and the thresholds must be
> re-tuned.

---

## The data

**Z-Alizadeh Sani extension** (UCI Machine Learning Repository) — 303 patients,
55 raw attributes, four labels.

| target | positive class | prevalence | majority-class baseline |
|---|---|---|---|
| Cath (overall CAD) | `CAD` | 71.3% | 71.3% |
| LAD | `Stenotic` | 58.4% | 58.4% |
| LCX | `Stenotic` | 39.3% | 60.7% |
| RCA | `Stenotic` | 37.6% | 62.4% |

**Target leakage is excluded explicitly.** All four label columns are dropped
from the feature matrix for every target. Leaving `LAD` in while predicting
`RCA` would leak: the vessels are correlated, and the model would score well on
information a real patient does not have at prediction time.

### Features: 55 raw → 44 model features

**15 columns dropped.** Eleven are findings so rare they cannot support a split
(`CHF`, `Edema`, `Lung rales`, `Weak Peripheral Pulse`, `CRF`, `CVA`,
`Airway disease`, `Thyroid Disease`, `EX-Smoker`, `LowTH Ang`,
`Poor R Progression`). `Diastolic Murmur` was dropped because its learned
direction is clinically backwards. `Exertional CP` is constant. `Weight` and
`Length` are dropped as model inputs because they are collinear with `BMI` —
they are still *collected*, and `BMI` and `Obesity` are derived from them.

`St Elevation` is retained despite being rare, on clinical grounds.

**4 engineered features added**, each a composite of columns already present:
`Anterior_Risk_Score`, `Lipid_Risk_Ratio`, `ECG_Abnormality_Count`, `Any_Angina`.

### Missing values

Continuous → dataset median. Binary findings → absent. The serving API reports
how many fields were entered versus assumed, and names any assumed field that
carries high importance.

**Never best-case fill.** Measured on this dataset, filling unknown fields with
healthy values understates LAD risk by 29 percentage points, against 13 for
median fill. For a screening tool, false reassurance is the worst failure mode.

---

## The model

```
CalibratedClassifierCV(
    RandomForestClassifier(n_estimators=500, class_weight="balanced"),
    method="sigmoid", cv=3)
```

wrapped in a scikit-learn `Pipeline` with a `ColumnTransformer`:
`StandardScaler` on 36 numeric columns, `OneHotEncoder(handle_unknown="ignore")`
on 10 categorical ones. Scaling and encoding sit **inside** the pipeline, so they
are fitted on training folds only and never see held-out data.

Three choices did most of the work:

**Calibration mattered more than the model family.** XGBoost, LightGBM, deeper
and shallower forests, and voting ensembles all landed within cross-validation
noise of each other. Sigmoid calibration is what makes the output a usable
probability rather than a ranking — when the model says 70%, roughly 70% of
those patients are positive.

**`class_weight="balanced"` covered what resampling would have added.** SMOTE was
tested and did not improve on it.

**Thresholds are per target, not 0.5.** See below.

---

## Thresholds and how they were chosen

A model forced to decide at p = 0.5 on a 38%-positive target plays it safe and
calls almost everyone negative — accuracy stays respectable while recall
collapses.

Thresholds were selected by **nested cross-validation**, 5 outer × 5 inner folds.
Within each outer fold, the threshold is chosen using only the training portion,
then applied to a fold it has never seen. The obvious alternative — sweeping the
threshold and scoring on the same predictions — reports a number that has already
seen the answers.

The objective differs by target, because the clinical use differs:

- **Cath, LAD** — F1-optimal. These are the stronger models; balance precision
  and recall.
- **LCX, RCA** — a recall floor of 0.85. At AUC ≈ 0.70 chasing F1 is not
  meaningful, so the model instead guarantees it catches most true stenoses and
  accepts lower precision. In a screening context a missed blockage costs more
  than a false alarm.

| target | threshold |
|---|---|
| Cath | 0.48 |
| LAD | 0.40 |
| LCX | 0.32 |
| RCA | 0.30 |

---

## Results — held-out test set, n = 61

Scored once, after thresholds were fixed.

| target | accuracy | 95% CI | precision | recall | F1 | ROC-AUC | baseline |
|---|---|---|---|---|---|---|---|
| Cath | 86.9% | 78.4–95.4 | 85.7% | 97.7% | 0.913 | 0.873 | 71.3% |
| LAD | 72.1% | 60.9–83.4 | 68.1% | 94.1% | 0.790 | 0.798 | 58.4% |
| LCX | 59.0% | 46.7–71.4 | 51.3% | 76.9% | 0.615 | 0.698 | 60.7% |
| RCA | 50.8% | 38.3–63.4 | 38.6% | 85.0% | 0.531 | 0.712 | 62.4% |

**Read ROC-AUC first.** It is threshold-independent, so it describes the model
rather than the operating point chosen for it. On that measure every target is
above chance, including RCA at 0.712.

**On RCA specifically.** Accuracy is below the 62.4% majority baseline. That is
the direct consequence of the recall floor: the model catches 85% of true RCA
stenoses at 38.6% precision, where a majority-class classifier would score 62.4%
accuracy by calling every vessel normal — and would miss every stenosis. The 95%
confidence interval on that accuracy is 38.3–63.4%, so with 61 test patients this
model is not statistically distinguishable from baseline in either direction. We
report the interval rather than the point estimate.

`MODEL_CARD.md` covers the limits in full.

---

## Explainability

SHAP runs against a **separate, uncalibrated** random forest per target
(`models/{target}_explainer.joblib`), fitted on the same features.
`CalibratedClassifierCV` wraps its estimator, and `TreeExplainer` cannot see
through the wrapper — so the explainer mirrors the calibrated model rather than
being extracted from it. Contributions describe the forest's own reasoning and
are reported as deviations from its base rate.

Global importance uses **permutation importance**, not impurity importance.
Impurity importance is biased toward high-cardinality features and would
overstate the continuous laboratory values.

---

## Licence and attribution

Dataset: Z-Alizadeh Sani extension, UCI Machine Learning Repository — see the
original terms of use.
