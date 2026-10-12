# 03_SCORING_ALIGNMENT.md — building against the actual rubric

The problem statement's exact wording arrived after the earlier spec files were
written. Two requirements are not covered anywhere in the current build. This
file adds Phase P and re-weights what matters.

Read after `02_INPUT_MODES_AND_EXPLAINABILITY.md`.

---

## The rubric, and where the build stands

| criterion | weight | state |
|---|---|---|
| Predictive Performance | **30%** | models done; **validation methodology invisible in the UI** |
| 3D Visualization | **25%** | strongest area; needs camera controls + spatial mapping polish |
| Clinical Interpretability | **20%** | per-patient SHAP exists; **global importance missing** |
| System Integration | **15%** | Phase I + J.1 cover this exactly |
| Technical Implementation | **10%** | needs sklearn pin, attribution, reproducible README |

The two biggest criteria are 55% of the total. Phase P exists because the largest
one is currently being scored on code nobody can see.

---

## What the deliverable text actually demands

> **Clinical Explanation Dashboard:** Interactive display showing **prediction
> metrics**, **feature importances (SHAP/LIME)**, and **patient physiological
> breakdowns**.

Three distinct things, not one.

1. **"prediction metrics"** — in ML, *metrics* means accuracy, AUC, F1,
   sensitivity, specificity, confusion matrix. The patient's probability is
   already covered by item 3, so reading this as "the probability" leaves item 1
   empty. **The reading is ambiguous, so satisfy both:** show the probability
   *and* a model-performance view. The second costs almost nothing — the numbers
   already exist in `final_report.json`.
2. **"feature importances"** — plural, and paired with SHAP/LIME. Per-patient
   SHAP answers *why this patient*. Global importance answers *what the model
   weighs in general*. Phase N only built the first. The second is already
   computed in `e4_importance.csv` and displays nowhere.
3. **"patient physiological breakdowns"** — Phase N.3 covers this.

---

# Phase P — the model performance view

Put this on its own tab or route (`/model`), linked from the dashboard. Keeping
it off the main clinical screen protects the clinical layout and gives judges one
obvious place to look for the validation story.

All numbers below are real, from `final_report.json`. **Do not hardcode them** —
serve them from a new `GET /api/model-info` endpoint that reads the JSON, so the
page can never drift from the model.

## [ ] P.1 — Per-target metrics table

| target | threshold | accuracy | 95% CI | recall | precision | F1 | ROC-AUC |
|---|---|---|---|---|---|---|---|
| Cath | 0.48 | 86.9% | 78.4–95.4 | 97.7% | 85.7% | 91.3 | 0.873 |
| LAD | 0.40 | 72.1% | 60.9–83.4 | 94.1% | 68.1% | 79.0 | 0.798 |
| LCX | 0.32 | 59.0% | 46.7–71.4 | 76.9% | 51.3% | 61.5 | 0.698 |
| RCA | 0.30 | 50.8% | 38.3–63.4 | 85.0% | 38.6% | 53.1 | 0.712 |

n_train = 242 · n_test = 61

**Show the confidence interval next to every accuracy, not as a footnote.** With
61 test patients the intervals are 12–25 points wide. A team that reports
intervals reads as one that understands its own sample size; a team that reports
only point estimates invites someone to work out how small n is and conclude the
numbers were presented carelessly.

## [ ] P.2 — Confusion matrix per target

Four numbers each (TP / FP / FN / TN), rendered as a 2×2. Clicking a target in
P.1 switches the matrix. This is the single clearest way to show *what kind* of
mistakes the model makes, and it directly serves "classification performance".

## [ ] P.3 — Calibration curve

**"Risk estimation quality" is named in the 30% criterion, and this is what it
means.** A model that says 70% should be right about 70% of the time. You used
`CalibratedClassifierCV` with sigmoid calibration specifically for this, and
currently nothing shows it worked.

Plot predicted probability (x) against observed frequency (y) in bins, with the
diagonal as reference. One chart per target, or all four overlaid.

Caption it plainly: *"A well-calibrated model sits near the diagonal: when it
says 70%, roughly 70% of those patients turn out positive. Calibration is what
makes the probability a usable number rather than just a ranking."*

Generate the curve data in the backend from the held-out test set and serve it
through `/api/model-info`. Do not compute it in the browser.

## [ ] P.4 — Validation methodology panel

Prose, not a chart. This is where "validation methodology" gets its marks, and it
is the cheapest item in Phase P.

State plainly:

- **Nested cross-validation (5×5) for threshold selection.** The threshold is
  chosen inside the training portion of each outer fold and then applied to a
  fold it has never seen. The naive approach — sweeping the threshold and scoring
  on the same predictions — reports a number that has peeked at the answers.
  Quote both numbers so the gap is visible.
- **Stratified 80/20 split**, 242 train / 61 test, stratified on Cath.
- **Sigmoid calibration** via `CalibratedClassifierCV` (cv=3) wrapping a
  500-tree random forest with `class_weight="balanced"`.
- **Permutation importance**, not impurity importance — impurity importance is
  biased toward high-cardinality features and would overstate the continuous labs.
- **Leak-free pipeline:** scaling and one-hot encoding live inside the sklearn
  `Pipeline`, so they are fitted on training folds only.

## [ ] P.5 — The RCA problem, stated honestly

Do not bury this. A judge will compute the majority-class baseline (62% for RCA)
and notice 50.8% is below it. Getting there first is worth more than hoping they
do not.

Put this next to the RCA row:

> RCA is our weakest target. The threshold is set to a recall floor rather than
> to maximise accuracy: at 0.30 the model catches **85% of true RCA stenoses**
> at 38.6% precision. A majority-class classifier would score 62% accuracy by
> calling every vessel normal — and would miss every stenosis. For a screening
> tool we judged a missed blockage more costly than a false alarm.
>
> The 95% confidence interval on RCA accuracy is 38.3–63.4%. With 61 test
> patients this model is not statistically distinguishable from baseline, and we
> report the interval rather than the point estimate.

Both sentences are true, both are checkable from the numbers on the page, and
together they convert the weakest result into evidence of judgement. **The second
paragraph matters as much as the first** — it is the difference between an excuse
and a statistical argument.

## [ ] P.6 — Operating point toggle (build only if P.1–P.5 are done)

A switch between **Screening** (current recall-floor thresholds) and **Balanced**
(F1-optimal), with the metrics table updating live.

This demonstrates that threshold choice is a deliberate clinical trade rather
than a default nobody examined — exactly what "validation methodology" rewards.

Requires re-running `tune.py` with `RECALL_TARGETS = set()` to get the F1-optimal
thresholds, then storing **both** sets in `thresholds.json`. **Do not retrain the
models** — only the thresholds change, and the same `.joblib` files serve both
operating points.

If time is short, cut this and keep P.5. One honest paragraph beats a toggle that
half works.

---

# Phase Q — global feature importance

## [ ] Q.1 — Global importance chart

From `e4_importance.csv`, already computed. Horizontal bars, one panel per
target, sorted descending. Real values:

| feature | Cath | LAD | LCX | RCA |
|---|---|---|---|---|
| Typical Chest Pain | 0.079 | 0.067 | 0.030 | 0.025 |
| Age | 0.011 | 0.009 | 0.062 | 0.028 |
| Region RWMA | 0.024 | 0.033 | −0.001 | −0.002 |
| EF-TTE | 0.008 | 0.022 | −0.001 | −0.004 |
| DM | 0.001 | −0.003 | 0.000 | 0.022 |

**Negative values are meaningful and must not be clipped to zero.** Permutation
importance goes negative when shuffling a feature *improves* the score — the
model was being misled by it. Show them below the axis and explain in one line:
*"Negative means shuffling the feature improved accuracy — the model gains
nothing from it on this target."*

Label the axis **"drop in accuracy when this feature is shuffled"**, not
"importance". The concrete phrasing is what makes permutation importance legible
to a clinician.

## [ ] Q.2 — Tie global to local

On a vessel's SHAP card, mark features that also rank in that vessel's global
top 5. One small indicator, no extra panel. It shows the per-patient explanation
is consistent with what the model does in general — and when it is *not*, that is
the genuinely interesting case worth pointing at in the video.

---

# Re-weighted priorities

Current build order across all files, by marks per hour of work:

1. **Phase I** — nothing else counts until real predictions reach the screen
2. **J.1** cancel in-flight requests — this *is* System Integration's "real-time
   visualization updates", 15%
3. **N.1** fix SHAP bar direction — a chart that contradicts its own number
4. **P.1, P.4, P.5** — table, methodology, the honest RCA note. Highest marks per
   hour in the project: the numbers already exist, the work is display only, and
   it lands in the 30% criterion
5. **M.1, M.2** input modes
6. **P.3** calibration curve — the other half of "risk estimation quality"
7. **Q.1** global importance — closes the plural in "feature importances"
8. **N.2, N.3** baseline and units
9. **K.6** camera controls — 3D is 25% and "interactive visualization" is named
10. Everything else

---

# Deliverables not covered by any spec file

Flagged so they do not get discovered on the last day. **These are the human's
job, not Antigravity's** — do not start them, but do not let them be forgotten.

- **Documentation, max 6 pages.** Must cover dataset preprocessing, model
  architecture, 3D pipeline setup, usage instructions, evaluation results. Most
  of it already exists scattered across `FINAL_MODEL.md`, `EXPERIMENTS.md`,
  `IMPROVEMENT_FINDINGS.md` and the heart3d tooling notes — this is an assembly
  job, not a writing job. The page limit is a hard constraint; cut rather than
  shrink the font.
- **Demonstration video, 3–10 min, YouTube.** The text names what it must show:
  working system, **feature input workflow**, **3D visualization interactions**,
  technical implementation. The input workflow being called out explicitly is why
  Phase M matters beyond tidiness.
- **AI coding assistant disclosure in the README.**
- **BodyParts3D CC BY-SA 2.1 Japan attribution** — meshes *and* the derived
  `.glb`, in the README and visible in the UI. "Use of public datasets and
  anatomical resources" is named in Technical Implementation; missing attribution
  is a licence problem as well as a lost mark.
- **Model weights committed** to the public repo.
- **Reproducibility:** pin `scikit-learn==1.9.1` in `requirements.txt`. A
  different version shifts the calibrated probabilities and silently invalidates
  every threshold in `thresholds.json`.
