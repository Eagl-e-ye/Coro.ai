# 04_INPUT_REBUILD.md — the input rework, with exact fields

**This instruction was given once already and was not applied.** The screenshots
still show the "Unlock & Edit" card and a lone Heart rate slider. This file
restates it as three concrete, visually checkable changes with the complete field
list, so nothing has to be inferred.

Read with the screenshots the human attached. They are the current state — the
thing to change, not the target.

Priority: do these **before** Phase P, Q, N and K. The demo video must show the
"feature input workflow" explicitly, so this is scored directly.

---

## The three changes

1. **Delete the CLINICAL FEATURES card** (Age / Sex / Typical Chest Pain / HTN /
   DM with "Unlock & Edit") from the dropdown-patient view. Entirely. Not
   disabled — gone.
2. **Add seven What-If sliders** wired to the real backend.
3. **Build the manual-entry dialog** with all 38 user-entered fields, grouped,
   mandatory vs optional.

Everything else in the current UI is approved as-is. Do not touch the gauge, the
vessel rows, the 3D canvas, the layout, or the palette.

---

# ⚠ Read this before writing any code that sends `Sex`

The dataset spells female **`"Fmale"`** — a typo in the source data that the
model was trained on. The one-hot encoder uses `handle_unknown="ignore"`, so
sending `"Female"` does **not** raise an error. It encodes every Sex column as
zero and returns a confident, wrong prediction. Silently. For every female
patient.

- The value sent to the backend must be exactly `"Male"` or `"Fmale"`.
- The UI may display "Female" — map it at the boundary, in one place.
- Add an assertion in the backend: reject any `Sex` not in `{"Male","Fmale"}`
  with HTTP 422 rather than letting it through.

**Verify this specifically:** predict the same patient as Male and as Female.
The probabilities must differ. If they are identical, the mapping is broken and
every female prediction in the demo is wrong.

---

# [ ] R.1 — Dropdown patient: remove the clinical features card

A recorded patient's age, sex, and history are **facts from the record, not
inputs**. An "Unlock & Edit" button on them implies a doctor would change a
patient's age to diagnose them. Nobody does that.

**Remove the card.** If the record values should stay visible, render them as a
plain read-only summary line — `54y · Male · Typical chest pain · No HTN · No DM`
— with no inputs, no checkboxes, no unlock. A checkbox that cannot be ticked is
worse than text, because it invites a click that does nothing.

The dropdown itself stays exactly as it is in the screenshot — `+ Add patient
details (Manual Entry)` at top, then the five curated patients. That part is
correct.

**Verify:** select any dropdown patient. There is no editable control anywhere in
the left column except the seven sliders from R.2.

---

# [ ] R.2 — The seven sliders, wired to the backend

Replace the single Heart rate slider with these seven. Use her existing slider
styling — it looks right already.

| field | label | unit | min | max | dataset median |
|---|---|---|---|---|---|
| `LDL` | LDL cholesterol | mg/dL | 18 | 232 | 100 |
| `HDL` | HDL cholesterol | mg/dL | 16 | 111 | 39 |
| `TG` | Triglycerides | mg/dL | 37 | 400* | 122 |
| `BP` | Systolic BP | mmHg | 90 | 190 | 130 |
| `FBS` | Fasting blood sugar | mg/dL | 62 | 400 | 98 |
| `Weight` | Weight | kg | 48 | 120 | 74 |
| `PR` | Pulse rate | bpm | 50 | 110 | 70 |

\* dataset max for TG is 1050, a single extreme outlier. Cap the slider at 400 so
the usable range is not compressed into the first 4% of the track. Values above
400 can still arrive from a record; let the slider clamp its display.

**These seven and no others.** Never a slider for Age, Sex, FH, Q Wave, Region
RWMA, EF-TTE, or any diagnosis field. The test is not "is it a number" — it is
whether a patient or a treatment can actually change it. A family-history slider
is the kind of thing a clinician judge spots immediately, and it casts doubt on
everything else on the screen.

### Wiring
- Baseline snapshot when the patient loads. **Ghost tick on each track** at the
  patient's real value, so the baseline is always visible and recoverable.
- On change: debounce ~150ms, then `POST /api/predict` with the **full patient
  object**, slider values overriding the record's. Not just the seven fields —
  the backend needs every field to featurize correctly.
- Abort the in-flight request before firing a new one, and keep the sequence
  guard (task J.1). Without both, dragging a slider queues a request per pixel.
- `BMI` and `Obesity` are **recomputed server-side** from `Weight` and `Length`
  on every request. Never send them; never compute them client-side. Weight moves
  BMI, and a stale BMI is a silently wrong prediction.
- **MODIFIED badge** appears only when a slider is off its ghost tick. While it
  shows, hide the actual-vs-catheterisation reveal — comparing against ground
  truth for values you invented is a false comparison.
- **Reset** returns all seven to their ghost ticks and clears the badge.

### Required caveat, beside the sliders
*"Shows how the model's output changes with different inputs. It does not predict
the effect of treatment."*

The model learned association, not causation. Not optional, not shortened.

**Verify:** drag LDL from 100 to 200 on a dropdown patient. The overall CAD
percentage changes, the vessel bars move, the heart recolours, MODIFIED appears.
Paste the before and after probabilities into the log. If nothing moves, the
request is not reaching the backend.

---

# [ ] R.3 — Manual entry dialog

"+ Add patient details (Manual Entry)" opens a **large modal dialog**, not an
inline form. Fields start **empty** — never prefilled with medians, because a
prefilled field reads as data the user supplied and destroys the entered /
assumed distinction the whole provenance system rests on.

## The model takes 44 features. The user enters 38.

Six are never in the form:

| computed | from |
|---|---|
| `BMI` | Weight and Length |
| `Obesity` | BMI threshold |
| `Anterior_Risk_Score` | engineered, server-side |
| `Lipid_Risk_Ratio` | engineered, server-side |
| `ECG_Abnormality_Count` | engineered, server-side |
| `Any_Angina` | engineered, server-side |

All six are produced by `data.py`'s `engineer()` in the backend. **Do not
reimplement any of them in the frontend.** Show computed BMI live as a read-only
`ƒ` value beside Weight/Length if useful, but what is sent is Weight and Length.

## Group 1 — Demographics & vitals

| field | type | unit | median | required |
|---|---|---|---|---|
| `Age` | number | years | 58 | **yes** |
| `Sex` | select Male / Fmale | — | — | **yes** |
| `Weight` | number | kg | 74 | no |
| `Length` | number | cm | 165 | no |
| `BP` | number | mmHg | 130 | no |
| `PR` | number | bpm | 70 | no |

## Group 2 — Risk factors & history

| field | type | median | required |
|---|---|---|---|
| `HTN` | 0/1 | 0 | **yes** |
| `DM` | 0/1 | 0 | **yes** |
| `Current Smoker` | 0/1 | 0 | no |
| `FH` | 0/1 | 0 | no |
| `DLP` | N/Y | N | no |

## Group 3 — Symptoms

| field | type | median | required |
|---|---|---|---|
| `Typical Chest Pain` | 0/1 | 0 | **yes** |
| `Atypical` | N/Y | N | recommended |
| `Nonanginal` | N/Y | N | no |
| `Dyspnea` | N/Y | N | no |
| `Function Class` | 0–3 | 0 | no |

## Group 4 — Examination

| field | type | median | required |
|---|---|---|---|
| `Systolic Murmur` | N/Y | N | no |

## Group 5 — ECG

| field | type | median | required |
|---|---|---|---|
| `Q Wave` | 0/1 | 0 | no |
| `St Elevation` | 0/1 | 0 | no |
| `St Depression` | 0/1 | 0 | no |
| `Tinversion` | 0/1 | 0 | no |
| `LVH` | N/Y | N | no |
| `BBB` | N / LBBB / RBBB | N | no |

## Group 6 — Labs, metabolic & renal

| field | type | unit | median |
|---|---|---|---|
| `FBS` | number | mg/dL | 98 |
| `TG` | number | mg/dL | 122 |
| `LDL` | number | mg/dL | 100 |
| `HDL` | number | mg/dL | 39 |
| `CR` | number | mg/dL | 1.0 |
| `BUN` | number | mg/dL | 16 |

## Group 7 — Labs, haematology & electrolytes

| field | type | unit | median |
|---|---|---|---|
| `HB` | number | g/dL | 13.2 |
| `WBC` | number | cells/µL | 7100 |
| `Lymph` | number | % | 32 |
| `Neut` | number | % | 60 |
| `PLT` | number | ×10³/µL | 210 |
| `ESR` | number | mm/hr | 15 |
| `K` | number | mEq/L | 4.2 |
| `Na` | number | mEq/L | 141 |

## Group 8 — Echocardiography

| field | type | unit | median | required |
|---|---|---|---|---|
| `EF-TTE` | number | % | 50 | recommended |
| `Region RWMA` | 0–4 | — | 0 | recommended |
| `VHD` | N / mild / Moderate / Severe | — | N | no |

## Dialog behaviour

**Five mandatory fields** — `Age`, `Sex`, `Typical Chest Pain`, `HTN`, `DM`.
Submit is blocked until all five are filled; mark the empty ones. These are the
fields where the dataset median actively disagrees with "healthy", so a default
would mislead rather than approximate. Typical Chest Pain alone carries 8.9%
importance, the highest of any feature.

**Three recommended** — `Atypical` (4.2%), `Region RWMA` (3.4%), `EF-TTE` (2.7%).
Submit is allowed, but warn by name: *"EF-TTE and Region RWMA were assumed. Both
carry weight in this model."* A generic "some fields missing" tells the user
nothing they can act on.

**Everything else optional**, in collapsed sections. Groups 1–3 open by default
so the dialog opens short; groups 4–8 collapsed. The five mandatory fields must
be visible without scrolling.

**Blank handling — never best-case fill.** Blank numeric → the dataset median in
the tables above. Blank binary → absent (0 / N). Measured on this dataset:
best-case fill understates LAD risk by 29 points against 13 for median fill.
False reassurance is the worst failure mode a screening tool has.

**No prediction fires while the dialog is open.** Submit once, close, predict.

**After submit:** the entered values become the working record and lock, exactly
like a dropdown patient, with the seven sliders live against them and ghost ticks
at what was entered. No catheterisation reveal — there is no ground truth for a
patient invented thirty seconds ago. In-memory only; does not survive refresh,
which is correct for a demo and needs no storage.

**Completeness counter** after submit: `5 entered · 33 assumed`.

**Verify:** open the dialog, confirm submit is blocked with any mandatory field
empty, fill only the five, submit, confirm a prediction appears and the counter
reads `5 entered · 33 assumed`. Then fill a full patient and confirm the
probabilities differ from the five-field version.

---

# Logging

Unchanged and still mandatory. Append to `PROGRESS_LOG.md`:

- after each of R.1, R.2, R.3, and before running out of context or limit
- files changed, commands run, **actual pasted output**
- the before/after probabilities from the R.2 verify step
- the Male-vs-Fmale check from the Sex warning
- end with `NEXT AGENT STARTS AT: <task id> — <one line>`

Tick the boxes in this file in the same session you log. The two must agree.

Questions go in `QUESTIONS.md` — ask, pick the option that changes less of
Jahanvi's code, log the choice, keep moving. Do not stall.
