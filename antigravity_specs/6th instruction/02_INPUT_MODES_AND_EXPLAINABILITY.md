# 02_INPUT_MODES_AND_EXPLAINABILITY.md

Read after `01_INTEGRATION_BRIEF.md`. Two subjects: how patient data gets in
(Phase M), and what the explanation panels must show (Phase N).

**This file supersedes task J.4 in `TASKS_v2.md`.** J.4 proposed making required
fields read-only with an "Edit" unlock. That is cancelled. The correct design is
below. Strike J.4 from the checklist and do not build it.

---

# Part 1 — the principle behind the input redesign

The current UI has collapsed two unrelated actions into one surface. Separating
them is the whole point of this phase.

| | **Correcting the record** | **Exploring an intervention** |
|---|---|---|
| question being asked | what is true about this patient? | what if this value were different? |
| when | once, before any prediction | repeatedly, after the prediction |
| applies to | every field | only modifiable factors |
| affordance | a form, submitted once | sliders, live |
| where | entry dialog | main screen, left column |

A recorded patient's age is **a fact, not a knob**. Putting it behind the same
affordance as an LDL slider implies you could intervene on it. You cannot. A
clinician judge reads that as the team not understanding what their own model
does, and it costs more than the feature is worth.

So: **facts are entered once and then locked. Only modifiable factors get
sliders.**

---

# Phase M — the two input modes

## [ ] M.1 — Mode A: recorded patient (from the dropdown)

When a patient is chosen from the dropdown, **every clinical field is read-only.**
No edit affordance, no unlock, no pencil icon. These are facts from the record.

Render them as values, not form controls. Her existing card layout is fine —
strip the inputs, keep the labels and values. Remove the number spinner and the
checkboxes entirely in this mode; a checkbox that cannot be ticked is worse than
plain text, because it invites a click that does nothing.

**The only interactive controls in Mode A are the seven What-If sliders:**

`LDL` · `HDL` · `TG` · `BP` · `FBS` · `Weight` · `PR`

Everything else — Age, Sex, Typical Chest Pain, HTN, DM, and all remaining
fields — is display-only.

The sliders live in the left column (inputs belong on the left, even though they
feel like results). Each slider carries a **ghost tick at the patient's real
value**, so the baseline is always visible and recoverable.

### The MODIFIED badge now means something
In the current build it appears whenever a required field is touched, which is
why it felt arbitrary. New rule: **MODIFIED appears only when a What-If slider
has moved off its recorded value.** It means *"these are no longer this patient's
actual values."*

While MODIFIED is showing:
- Hide the actual-vs-predicted catheterisation reveal. Comparing a prediction
  against a real catheterisation result for values you invented is a false
  comparison, and it is the kind of thing a judge catches.
- Show a **Reset** control that returns every slider to its ghost tick and
  clears the badge.

### Required caveat beside the sliders
*"Shows how the model's output changes with different inputs. It does not predict
the effect of treatment."*

The model learned association, not causation. That sentence is the difference
between an interpretability feature and a false medical claim. It is not
optional and it does not get shortened.

**Verify:** select a recorded patient. Confirm no clinical field accepts input.
Move an LDL slider, confirm the prediction updates, MODIFIED appears, and the
catheterisation reveal disappears. Hit Reset, confirm everything returns.

---

## [ ] M.2 — Mode B: manual entry dialog

"Add patient details" opens a **separate dialog**, not an inline form. A modal or
a full-screen panel — follow whatever modal pattern Jahanvi already uses; if she
has none, a centred modal with a dimmed backdrop.

Fields start **empty**. Do not prefill with medians — a prefilled field reads as
data the user supplied, and the whole provenance system (entered / computed /
assumed) depends on that distinction staying honest.

### Field tiers in the dialog

**Mandatory — cannot submit without these five.** Block the submit button and
mark the empty ones.

| field | control | why mandatory |
|---|---|---|
| Age | number | 4.3% importance; no sane default |
| Sex | select | changes baseline risk substantially |
| Typical Chest Pain | yes/no | **the single most important feature, 8.9%** |
| HTN | yes/no | 2.9% |
| DM | yes/no | 2.8% |

These five are the fields where the dataset median actively disagrees with
"healthy", so a default would mislead rather than merely approximate.

**Recommended — submit is allowed, but warn if left blank.** High-importance
fields whose absence meaningfully widens the uncertainty:

`Atypical` (4.2%) · `Region RWMA` (3.4%) · `EF-TTE` (2.7%)

Warning text names them specifically: *"EF-TTE and Region RWMA were assumed.
Both carry weight in this model."* A generic "some fields missing" tells the user
nothing actionable.

**Optional — everything else**, in collapsed sections:

`History` · `Symptoms` · `Exam & Vitals` · `ECG` · `Labs` · `Echo`

Collapsed by default so the dialog opens short and non-threatening. The five
mandatory fields are visible without scrolling.

### Rules inside the dialog
- **Weight and Length are entered; BMI and Obesity are not.** They are computed
  server-side on every request so they can never go stale. Show the computed BMI
  as a read-only `ƒ` value if you want, but never as an input.
- **Never best-case fill.** Blank continuous → dataset median. Blank binary →
  absent. Measured: best-case fill understates LAD risk by 29 points against 13
  for median. False reassurance is the worst failure mode a screening tool has.
- No prediction fires while the dialog is open. Submit once, close, predict.
- Units on every numeric label — `LDL (mg/dL)`, `BP (mmHg)`, `TG (mg/dL)`,
  `ESR (mm/hr)`, `FBS (mg/dL)`, `PR (bpm)`, `Weight (kg)`, `Length (cm)`.

### After submit
The entered patient becomes the working patient. It then behaves like Mode A —
entered values are now the record, locked, with the seven sliders live against
them and ghost ticks at what was entered.

No catheterisation reveal for a manual patient: there is no ground truth for
someone who was invented thirty seconds ago.

Manual patients are **in-memory only** and do not survive a refresh. That is
correct for a demo and needs no storage layer.

**Verify:** open the dialog, confirm submit is blocked with a mandatory field
empty, fill the five, submit, confirm a prediction appears and the completeness
counter reads something like `5 entered · 39 assumed`.

---

## [ ] M.3 — Provenance must stay visible

Three tiers, wherever a value is displayed:

- **entered** — normal weight
- **computed** — `ƒ` tag (BMI, Obesity, engineered features)
- **assumed** — dimmed italic + `median` tag

Plus the counter: `12 entered · 32 assumed`.

This is what makes the uncertainty honest rather than decorative. A user looking
at a 71% probability deserves to know it rests on 32 guesses.

---

# Phase N — the explanation panels

The current SHAP card is closer than most teams get — it shows the patient's
actual value next to the contribution, which is what requirement 9.6 asks for and
what most entries miss. These are corrections and additions to it.

## [ ] N.1 — Fix the bar direction (this one is a defect, not a polish)

Current bars all extend rightward with length proportional to `|contribution|`.
So `ESR −0.04` renders as a long rightward bar — visually identical to a strong
*positive* driver. The chart contradicts the number beside it, and the chart is
read first.

**Fix:** a centre line. Positive contributions extend right, negative extend
left. Length is `|contribution|` scaled against the largest contribution in the
card. Colour matches the sign, same palette as the numbers.

This is the single highest-value change in Phase N. A misleading chart is worse
than no chart.

## [ ] N.2 — Show the baseline

`+0.05` is meaningless without a reference. SHAP contributions are additive
deviations from the model's average prediction, so the relationship is:

```
baseline + sum(all 44 contributions) = final probability
```

Put one line at the top of each card:

```
Base rate 38%  →  this patient 41%
```

Without it, a judge asks "+0.05 of what?" and the explanation collapses. With it,
the card visibly reconciles with the probability shown elsewhere on screen.

The backend already has the baseline — it is `explainer.expected_value` from the
TreeExplainer. Add it to the payload as `vessels[name].shap_base_value`.

## [ ] N.3 — Make values readable

- **Binary features as words.** `Typical Chest Pain · 1` becomes
  `Typical Chest Pain · Present`. Nobody reads `1` as a clinical finding.
- **Units on every value.** `TG · 122 mg/dL`, `ESR · 15 mm/hr`, `Age · 68 yrs`.
  Requirement 9.6 says *physiological measurements*; a bare integer is not one.
- **Plain-language feature names** where the dataset's column name is cryptic.
  `EF-TTE` → `Ejection fraction (echo)`. `Region RWMA` → `Regional wall motion
  abnormality`. Keep a lookup table in a config file, not inline in components.

## [ ] N.4 — Coverage line

Three features out of 44 are shown. Say how much of the story that is:

```
Top 3 of 44 features · 61% of total contribution
```

Computed as `sum(|top 3 shap|) / sum(|all shap|)`. One line, and it turns a list
into a claim you can defend.

## [ ] N.5 — Honest framing when the signal is weak

In the attached example the largest RCA driver moves the probability by 5 points.
That is the model saying *I am not confident* — entirely consistent with RCA's
cross-validated AUC of 0.72, which we know and have documented.

Do not hide this. When the largest `|contribution|` in a card is below ~0.08, add
a line:

*"No single factor dominates this vessel's estimate. The model's confidence here
is lower than for LAD."*

Showing a weak explanation honestly reads as competence. Showing it without
comment reads as not having noticed.

**Note for the human, not a build task:** expect a judge to ask why ESR — a
nonspecific inflammation marker — ranks second for RCA stenosis. The honest
answer is that it is what the model learned from this dataset, and it is a
finding about the data rather than a clinical insight. Worth having ready; do not
suppress the feature to avoid the question.

## [ ] N.6 — Overall CAD explanation, not just per-vessel

Three vessel cards with no synthesis is a list, not a dashboard. Add one card for
the overall CAD prediction, same structure, above the vessel cards.

## [ ] N.7 — Legend

One line, once, near the cards:

*"Red pushes risk up · green pushes risk down · bar length shows how much"*

Red and green with `+`/`−` is inferable, but inferable is not the same as
labelled, and the people you most need to convince will be reading it for the
first time under time pressure.

## [ ] N.8 — Empty state

The "Select a vessel to see which factors push its risk up or down" state is
good — keep it, keep her wording. Make sure it also covers the case where SHAP is
genuinely unavailable (Phase A returns `top_shap_features: []`): show
"explanation unavailable", never a crash and never an empty card that looks
broken.

---

## Does this meet the interpretability requirement?

After N.1–N.7, the panel shows: the patient's own measured values with units, the
signed contribution of each, correct directional encoding, the baseline it
departs from, how much of the total those features cover, and an honest note
when the model is uncertain.

**Re-read the PS wording for "Clinical Interpretability" and "Clinical
Explanation Dashboard" before calling this done.** The specs in this repo capture
those requirements second-hand, and if the PS names specific elements —
a global feature-importance view, a per-patient waterfall, a cohort comparison —
they are not in this file and would need adding. Check the source, not the
summary.

---

# Build order

M.1 → M.2 → N.1 → N.2 → N.3 → M.3 → N.4 → N.6 → N.5 → N.7 → N.8

N.1 is early because it is a correctness fix, not a feature. Everything after N.3
is additive and can be cut under time pressure without leaving anything broken.
