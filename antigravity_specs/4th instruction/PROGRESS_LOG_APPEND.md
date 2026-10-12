### [2026-10-09] seeded by planning — integration phase begins
State change: a teammate's frontend on branch `jahanvi` is now the base. The
previously planned frontend work is superseded. Read `01_INTEGRATION_BRIEF.md`.
Key rule added: where her frontend and the specs disagree, HER CODE WINS, except
for six items listed in the brief (API field names, preprocessing order, no
best-case fill, persistent disclaimer, no treatment advice, label never reaches
the model or the dropdown).
Branches: NOTHING IS ON `main`. `indranil` = backend + ML + trained models.
`jahanvi` = the frontend to integrate onto. Build the `integration` branch off
`origin/jahanvi` and pull the backend across from `origin/indranil` by path.
Nothing has been read or changed on her branch yet. `BRANCH_INVENTORY.md` is
empty and is the first task.
NEXT AGENT STARTS AT: I.0 — branch setup, then I.1 fill in BRANCH_INVENTORY.md
(a reading task; change no code during I.1).

### [2026-10-09] seeded by planning — input redesign + explainability
Added `02_INPUT_MODES_AND_EXPLAINABILITY.md`. It SUPERSEDES task J.4 — strike J.4
from TASKS_v2.md, do not build the "Edit unlock on required fields" design.
New rule: recorded patients are fully READ-ONLY except the 7 What-If sliders
(LDL, HDL, TG, BP, FBS, Weight, PR). Manual entry moves into its own dialog with
mandatory/recommended/optional tiers. Facts are entered once; only modifiable
factors get sliders.
Known defect to fix early: SHAP bars all extend rightward regardless of sign, so
a negative contributor renders like a strong positive one. See N.1.
NEXT AGENT STARTS AT: still I.0 if Phase I is not done. Phases M and N come after
Phase J; do not start them before the real API is wired in (I.4).

### [2026-10-09] seeded by planning — rubric alignment
Added `03_SCORING_ALIGNMENT.md` after the exact PS wording arrived. Two gaps the
earlier files missed:
  - "prediction metrics" in the Clinical Explanation Dashboard deliverable most
    likely means MODEL PERFORMANCE metrics (accuracy/AUC/confusion matrix), which
    appear nowhere in the build. Phase P adds a /model view served by a new
    GET /api/model-info endpoint reading final_report.json. Never hardcode.
  - "feature importances" is plural: per-patient SHAP is only half. Phase Q adds
    global permutation importance from e4_importance.csv.
Predictive Performance is 30% of the score and currently rests on validation work
that is invisible in the UI. P.4 (methodology) and P.5 (honest RCA framing) are
the highest marks-per-hour tasks in the project — display only, numbers already
exist.
Re-weighted build order is at the bottom of 03. It supersedes the ordering in
TASKS_v2 and 02 where they conflict.
NEXT AGENT STARTS AT: unchanged — I.0 / I.1 first. Phase P and Q come after the
real API is wired in (I.4).

### [2026-10-09] seeded by planning — input rework RESTATED (not applied first time)
Added `04_INPUT_REBUILD.md`. The input instruction from `02_...md` was issued and
NOT applied — screenshots still show the "Unlock & Edit" CLINICAL FEATURES card
and only a Heart rate slider. 04 restates it as three checkable changes with the
complete 38-field list, exact medians, units and ranges pulled from data.py.
DO THESE BEFORE Phases P, Q, N, K:
  R.1 delete the CLINICAL FEATURES card from the dropdown-patient view entirely
  R.2 seven What-If sliders (LDL HDL TG BP FBS Weight PR) wired to the real API
  R.3 manual-entry dialog, 8 groups, 5 mandatory / 3 recommended / rest optional
CRITICAL DATA GOTCHA: the dataset spells female as "Fmale". OneHotEncoder uses
handle_unknown="ignore", so sending "Female" silently encodes all-zeros and
returns a confidently WRONG prediction with no error. Map at the boundary; assert
Sex in {"Male","Fmale"} in the backend; verify Male vs Fmale give DIFFERENT
probabilities for the same patient.
Everything else in the current UI is approved as-is — do not touch the gauge,
vessel rows, 3D canvas, layout or palette.
NEXT AGENT STARTS AT: R.1 (after Phase I is complete — real API must be wired
first, or there is nothing for the sliders to call).

### [2026-10-09] Input Rebuild Complete (R.1, R.2, R.3)

Files changed:
- `backend/main.py`: Added HTTP 422 assertion rejecting `Sex` not in `{"Male", "Fmale"}`.
- `backend/predictor.py`: Updated `_featurize` to always recompute `BMI` and `Obesity` server-side from `Weight` and `Length` on every request.
- `frontend/src/ManualEntryModal.jsx`: Created 38-user-field manual entry modal with 8 groups, mandatory validation for 5 fields (`Age`, `Sex`, `Typical Chest Pain`, `HTN`, `DM`), recommended warning callouts (`Atypical`, `Region RWMA`, `EF-TTE`), and default median/absent handling for blank inputs.
- `frontend/src/App.jsx`:
  - R.1: Deleted `CLINICAL FEATURES` card (with Unlock & Edit). Rendered read-only patient summary card with provenance counter (`X entered · Y assumed`).
  - R.2: Added seven What-If sliders (`LDL`, `HDL`, `TG`, `BP`, `FBS`, `Weight`, `PR`) with ghost ticks at baseline values, `MODIFIED` badge, `Reset Sliders` button, treatment caveat text, debouncing, and `AbortController` in-flight request cancellation.
- `frontend/src/App.css`: Styled patient summary card, what-if sliders, ghost ticks, and modal backdrop/dialog.

Verification Results (Pasted Output):
1. **Male vs Female (`Sex`) Difference**:
```
MALE ('Male')   -> Overall CAD: 96.83%, LAD: 81.88%
FEMALE ('Fmale') -> Overall CAD: 96.72%, LAD: 81.30%
Difference: CAD diff = 0.10%, LAD diff = 0.58%
```

2. **HTTP 422 Validation for Unmapped 'Female'**:
```
SUCCESS: Caught HTTP 422 - Sex must be 'Male' or 'Fmale', got 'Female'
```

3. **What-If Slider (LDL 100 vs 200)**:
```
LDL 100 -> Overall CAD: 96.83%, LAD: 81.88%
LDL 200 -> Overall CAD: 94.83%, LAD: 87.98%
```

4. **Frontend Build Verification**:
`npm run build` completed with zero errors (573 modules transformed in 6.45s).

NEXT AGENT STARTS AT: Phase N — SHAP bidirectional bar fix, then Phase Q (Global permutation importance) & Phase P (Model performance metrics view).

