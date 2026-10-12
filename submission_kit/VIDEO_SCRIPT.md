# Demonstration video — script and shot list

**Target: 6:30–7:00.** The brief allows 3–10 minutes. Shorter than 5 looks thin
for a project this size; longer than 8 and judges start skipping.

**Time is allocated by rubric weight, not by what is fun to show.** Predictive
Performance is 30% and it is the least visual part of the app, so it gets a full
90 seconds. Resist the urge to spend four minutes rotating the heart.

The brief names four things the video must contain: **the working system, the
feature input workflow, the 3D visualization interactions, and the technical
implementation.** All four are covered below — do not cut one to save time.

---

## Before you record

- Hard-refresh so the app is in its empty state. Starting mid-session looks like
  a rehearsal that went wrong.
- Pick your demo patient in advance and know its numbers. Fumbling the dropdown
  on camera costs more than a retake.
- Close other tabs. A notification popping up mid-recording means starting over.
- Record at 1920×1080. The SHAP values and the metrics table must be legible when
  compressed by YouTube.
- Do a 20-second test recording and actually watch it back. Check that your mic
  is not clipping and the heart does not stutter.
- Have the `/model` page loaded in a second tab so you can cut to it instantly.

---

## 0:00–0:30 — The problem

**Screen:** app in its empty state, heart slowly rotating.

> "Cardiovascular disease is the leading cause of death globally. Models can
> output a risk percentage — but a number on its own doesn't tell a clinician
> *where* the problem is. This is Coro.ai. It predicts coronary artery disease
> and per-vessel stenosis from clinical data, and paints the result onto the
> anatomy it actually refers to."

Keep this short. Judges have read the problem statement.

---

## 0:30–1:45 — Feature input workflow *(named requirement)*

**Screen:** open the patient dropdown.

> "Nothing is selected on load — the app doesn't assume a patient. There are five
> curated demo patients, and a manual entry path."

**Select a recorded patient.** Let the prediction land.

> "The record's clinical facts are read-only. A patient's age and history aren't
> things a clinician adjusts — so they're displayed, not editable."

**Open the manual entry dialog.** Scroll through the groups, don't fill it all.

> "For a new patient, this dialog takes all 38 inputs the model uses, grouped by
> how they're collected — demographics, history, symptoms, exam, ECG, labs, echo.
> Five are mandatory: age, sex, typical chest pain, hypertension, diabetes. Those
> are the fields where a default would actively mislead. Everything else is
> optional and filled with the dataset median — and the interface tells you which
> values were assumed rather than entered."

**Point at the completeness counter.**

> "Twelve entered, thirty-two assumed. We never fill missing fields with
> best-case values — we measured that, and it understates LAD risk by 29 points
> against 13 for median fill. False reassurance is the worst failure mode a
> screening tool has."

That last sentence is worth saying slowly. It shows a measured decision, not a
default.

---

## 1:45–3:15 — 3D visualization *(25%)*

**Screen:** the heart, full attention.

**Drag to rotate. Scroll to zoom.** Let it breathe — a few seconds of silence
while the model turns is fine.

> "The heart is a BodyParts3D anatomical mesh — the LAD, LCX and RCA are separate
> named nodes, so each artery is coloured by its own predicted probability.
> Green, amber, red. The colour comes straight from the backend; the frontend
> never recomputes risk, so what you see always matches what the model decided."

**Click a vessel.** Callout appears.

> "Clicking an artery inspects it — the probability, what that vessel supplies,
> and the factors driving its estimate."

**Point out the beat.**

> "The heartbeat uses an asymmetric envelope — fast systolic squeeze, slow
> diastolic release — and high-risk vessels pulse in time with it. Motion catches
> the eye before a number does."

**Hit Reset View.**

> "Camera resets, and the vertical orbit is clamped so the heart can never end up
> inverted."

---

## 3:15–4:30 — Clinical interpretability *(20%)*

**Screen:** the SHAP panel for a vessel.

> "Every prediction is explained. These are SHAP contributions for this artery —
> and crucially, each one carries the patient's *own measured value*, not just
> the feature name. LDL of 155 milligrams per decilitre pushed this estimate up
> by 0.12."

**Point at the baseline line.**

> "Contributions are deviations from the model's base rate, so the numbers
> reconcile: base rate 38%, this patient 41%. And these top three account for 61%
> of the total movement — we say so rather than implying three features explain
> everything."

**Switch to global importance.**

> "That's why *this* patient. This is what the model weighs in general —
> permutation importance, not impurity importance, which would overstate the
> continuous lab values. Typical chest pain dominates at 7.9%."

**If a feature has negative importance, point at it:**

> "Negative means shuffling the feature *improved* accuracy — the model gains
> nothing from it on that target. We show those rather than clipping them to
> zero."

---

## 4:30–6:00 — Validation and honesty *(30% — the most important 90 seconds)*

**Screen:** the `/model` performance page.

> "Here's where the model actually stands."

**Walk the metrics table.**

> "Overall CAD: [X]% accuracy, ROC-AUC [X]. LAD [X]%. And every accuracy carries
> its 95% confidence interval, because the test set is 61 patients and the
> intervals are 12 to 25 points wide. A point estimate from 61 patients, reported
> alone, would be misleading."

**Now the RCA row. Do not skip this.**

> "RCA is our weakest target, and I want to be direct about it. Accuracy is [X]%.
> A majority-class classifier — calling every vessel normal — would score 62%.
> So on raw accuracy we're below baseline.
>
> That's deliberate. The threshold is set to a recall floor, not to maximise
> accuracy: the model catches [X]% of true RCA stenoses at [X]% precision. For a
> screening tool, a missed blockage costs more than a false alarm.
>
> And the confidence interval on that accuracy is [X] to [X]% — with 61 test
> patients, this model isn't statistically distinguishable from baseline. We
> report the interval rather than the point estimate."

**Then methodology.**

> "Thresholds were chosen by nested cross-validation — five outer folds, five
> inner. The threshold is picked inside the training portion and applied to a
> fold it never saw. Tuning and scoring on the same predictions would have
> reported [X] instead of [X]; that gap is the self-deception we avoided.
>
> Probabilities are calibrated with sigmoid calibration — this curve shows it.
> When the model says 70%, roughly 70% of those patients turn out positive.
> That's what makes the probability a usable number rather than just a ranking."

**Fill the `[X]`s from your `/model` page as you record.** Never from memory.

---

## 6:00–6:40 — System integration and architecture *(15% + 10%)*

**Screen:** back to the main view. Drag an LDL slider.

> "The what-if sliders are limited to factors that can actually change — lipids,
> blood pressure, glucose, weight, pulse. Never age, never family history. You
> can also type a value directly."

**Drag it fast, several times.**

> "Every change re-predicts live. Requests are debounced and the previous one is
> aborted, so rapid changes never queue up or land out of order."

**Caveat line on screen.**

> "And it says plainly: this shows how the model's output changes with different
> inputs. It does not predict the effect of treatment. The model learned
> association, not causation."

**Cut to the repo.**

> "FastAPI backend serving four calibrated random forests, React Three Fiber
> frontend, scikit-learn pinned so the calibrated probabilities reproduce exactly.
> Training scripts, model weights and the 3D pipeline are all in the public repo."

---

## 6:40–7:00 — Close

**Screen:** full app, disclaimer visible.

> "Coro.ai — coronary risk prediction mapped onto the anatomy it describes, with
> every prediction explained and every limitation stated. It's a research
> prototype, not a medical device, and the interface says so on every screen."

---

## Things to avoid

- **Don't say "accurate" or "reliable" without a number beside it.**
- **Don't claim the tool diagnoses anything.** It estimates.
- **Don't hide the RCA result.** A judge who finds it themselves trusts
  everything else less. A team that raises it first looks rigorous.
- **Don't narrate every click.** Let the UI speak where it can.
- **Don't read the disclaimer aloud in full.** Show it; mention it once.

## Upload settings

- **Title:** `Coro.ai — Cardiovascular Risk Visualization & Prediction | Multimodal AI Hackathon 2026 Track A`
- **Visibility:** Unlisted or Public. **Not Private** — judges can't open a
  private video, and this is the single most common way a submission fails.
- **Description:** one-paragraph summary, the repo link, the live URL, and a
  timestamp index so judges can jump to the section they're scoring.
- **Check the link in an incognito window before submitting.**
