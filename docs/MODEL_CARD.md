# Model card — Coro.ai coronary risk models

Four classifiers: overall coronary artery disease (`Cath`) and stenosis in the
left anterior descending (`LAD`), left circumflex (`LCX`) and right coronary
(`RCA`) arteries.

Version: `calibrated-rf-2026-10-08` · scikit-learn 1.9.1 · Python 3.13

---

## Intended use

**What this is.** A research prototype built for the Multimodal AI Hackathon 2026
(Track A), demonstrating risk prediction from routine clinical data mapped onto
an interactive 3D anatomical model. It is intended for education and for
exploring how a model weighs clinical inputs.

**What this is not.** Not a medical device. Not validated for clinical use. Not a
substitute for diagnostic imaging or catheterisation. No output should inform the
care of a real patient.

**Out of scope.** Treatment decisions; screening in any population; use on
patients unlike the training cohort; any claim about a patient's condition
changing over time — the dataset holds one snapshot per patient and the model has
no time dimension.

---

## Training data

**Z-Alizadeh Sani extension**, UCI Machine Learning Repository. 303 patients
referred for coronary angiography at a single centre in Iran. 55 attributes
spanning demographics, history, physical examination, ECG, laboratory results and
echocardiography. Ground truth is catheterisation.

| | Cath | LAD | LCX | RCA |
|---|---|---|---|---|
| positive | 216 | 177 | 119 | 114 |
| prevalence | 71.3% | 58.4% | 39.3% | 37.6% |

Split 242 train / 61 test, stratified on overall CAD. The test set was scored
once, after thresholds were fixed.

**This cohort was already referred for angiography.** Prevalence is therefore far
higher than in the general population, and the model's probabilities are
calibrated to that population — not to an unselected one.

---

## Performance

Held-out test set, n = 61.

| target | accuracy | 95% CI | precision | recall | F1 | ROC-AUC | majority baseline |
|---|---|---|---|---|---|---|---|
| Cath | 86.9% | 78.4–95.4 | 85.7% | 97.7% | 0.913 | 0.873 | 71.3% |
| LAD | 72.1% | 60.9–83.4 | 68.1% | 94.1% | 0.790 | 0.798 | 58.4% |
| LCX | 59.0% | 46.7–71.4 | 51.3% | 76.9% | 0.615 | 0.698 | 60.7% |
| RCA | 50.8% | 38.3–63.4 | 38.6% | 85.0% | 0.531 | 0.712 | 62.4% |

Decision thresholds: Cath 0.48, LAD 0.40, LCX 0.32, RCA 0.30 — chosen by nested
5×5 cross-validation, F1-optimal for Cath and LAD, recall floor 0.85 for LCX and
RCA.

`verify_models.py` reproduces every figure above from the committed weights.

### Reading these numbers honestly

**The test set is 61 patients.** Confidence intervals are 12–25 points wide. A
point estimate from a sample this size, reported alone, would overstate what is
known. Every accuracy above carries its interval for that reason.

**Accuracy is the wrong headline for LCX and RCA.** Both sit at thresholds chosen
for recall, not accuracy. ROC-AUC is threshold-independent and is the fairer
summary: 0.698 and 0.712 respectively — modest, but above chance.

**RCA performs below its majority baseline on accuracy, and this is a deliberate
trade.** At threshold 0.30 the model identifies 85% of true RCA stenoses at 38.6%
precision. A classifier that called every vessel normal would score 62.4%
accuracy and miss every stenosis. For a screening tool we judged the missed
blockage more costly than the false alarm. The confidence interval (38.3–63.4%)
spans the baseline, so on this test set the two are not statistically
distinguishable.

**This is a data ceiling, not an untried model.** Per-target feature selection,
SMOTE, interaction terms, XGBoost, LightGBM, varied forest depths and voting
ensembles were all evaluated; every result fell within cross-validation noise.
Stenotic and normal patients overlap heavily on every available feature for the
two weaker vessels.

---

## How the predictions are produced

`ColumnTransformer` (StandardScaler on 36 numeric, OneHotEncoder on 10
categorical) → `RandomForestClassifier(n_estimators=500,
class_weight="balanced")` → `CalibratedClassifierCV(method="sigmoid", cv=3)`,
all inside one scikit-learn `Pipeline` so preprocessing is fitted on training
folds only.

44 features. All four label columns are excluded from every model's inputs, so a
vessel label can never leak into another vessel's prediction.

Missing fields are filled with the dataset median (continuous) or treated as
absent (binary), never with best-case values. The application reports how many
fields were entered versus assumed.

---

## Explanations

Per-patient attributions come from SHAP `TreeExplainer` on a separate
uncalibrated forest per target, since the calibration wrapper is not traversable.
Global importance uses permutation importance rather than impurity importance,
which is biased toward high-cardinality features.

**Explanations describe association, not cause.** A feature shown as raising risk
is one the model weighted upward for this patient. It is not evidence that
changing it would change the patient's disease.

---

## Limitations

- Single centre, single country, 303 patients. No external validation.
- The cohort was pre-selected for angiography; probabilities do not transfer to
  an unselected population.
- Cross-sectional. The model cannot describe progression or response to
  treatment.
- LCX and RCA are materially weaker than Cath and LAD.
- Probabilities are calibrated estimates, not diagnoses.
- The what-if controls show how the model's output responds to different inputs.
  They do not predict the effect of an intervention.
- Fairness across sex, age or comorbidity subgroups has not been assessed. With
  61 test patients, subgroup estimates would not be meaningful.

---

## Ethical considerations

The failure that matters here is a **false negative** — telling someone their
vessels look clear when they are not. Thresholds for the two weaker vessels were
set to limit that, accepting more false alarms in exchange.

The interface states on every screen that it is a research prototype and not a
diagnostic tool, never offers treatment advice, and never presents a prediction
as a finding.
