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

### [2026-10-09] seeded by planning — layout balance
Added `05_LAYOUT_BALANCE.md`. The slider work (R.2) is APPROVED and stays. It
added ~430px to the left column while the canvas card kept a fixed height, so the
left card now overhangs by ~140px and the section background seams mid-card.
SCOPE IS SIZING ONLY — no redesign, no palette change, nothing moves between
columns. Order: S.1 compact sliders (62px -> 44px, saves ~126px, nearly enough on
its own) -> MEASURE -> S.2 grid align-items:stretch so the canvas matches the left
column -> S.3 scale the heart up into the taller canvas.
Standing rule introduced: left column and canvas are one row and must end at the
same height, enforced in the grid, never by a hardcoded px height. More left-column
content is queued (completeness counter, assumed warning, Reset), so a hardcoded
height will break again.
NEVER solve a height problem by shrinking the heart — 3D Visualization is 25%.
Watch out: an R3F <Canvas> at height:100% inside a parent with no resolved height
renders BLANK. Check the heart still draws after S.2.
NEXT AGENT STARTS AT: S.1 — compact sliders, then measure both card heights in
devtools and paste the numbers before continuing.

### [2026-10-09] seeded by planning — 05_LAYOUT_BALANCE.md REWRITTEN (supersedes earlier version)
Human reviewed the scale-up result and rejected it. Corrections:
  S.3 "let the heart fill its new space" is CANCELLED. If an agent already scaled
      the heart or changed camera distance/position, REVERT IT. The latest
      screenshot shows the heart at a tilted, non-anatomical angle that it did not
      have before — put the camera back and check against the earlier screenshot.
  Two-column sliders promoted from fallback to PRIMARY fix (was S.4, now S.2).
      Pair semantically: LDL|HDL / TG|FBS / BP|Pulse / Weight alone, normal width.
  NEW S.0: delete the subtitle "Select a curated demo patient or enter clinical
      values to evaluate coronary stenosis risk." Frees ~70px.
  NEW S.5: nudge the heart right ~20-30px via camera target or model x-position,
      NOT a CSS margin (a margin shifts the orbit centre and makes dragging feel
      off-axis).
  NEW S.6: DEFAULT EMPTY STATE. No patient selected on load or refresh. No
      /api/predict call fires. No sliders (nothing to slide against, so the
      overhang does not exist in this state). Heart muted anatomical RED-BROWN —
      not grey, which reads as "low risk" rather than "not assessed". Right column
      shows "—" placeholders.
Standing rule unchanged: never shrink the heart to fix a height problem.
NEXT AGENT STARTS AT: S.0 — remove the subtitle, then S.1/S.2 sliders, then
measure both card heights in devtools and paste the numbers.

### [2026-10-10] seeded by planning — editable slider values
Layout work from 05 is APPROVED (two-column sliders, subtitle removed). Added
`06_EDITABLE_SLIDER_VALUES.md`: the number above each track becomes typeable.
Scope is the 7 What-If sliders only — do not touch the track, labels, pairing,
caveat line or card.
Core pattern: while focused the input holds a STRING DRAFT that is not validated;
clamping and parsing happen on commit (blur/Enter), never on keystroke. Typing
"121" into a min=18 field passes through "1" — clamping per keystroke makes the
field unusable.
Two traps written up:
  - A returning prediction must NOT overwrite a focused input. The
    `draft ?? String(value)` pattern prevents it; do not later "fix" it with an
    effect that syncs draft from value, which reintroduces the bug.
  - TG slider is capped at 400 but the dataset reaches 1050. Clamping a loaded
    patient's value to the track would silently alter the record and move the
    baseline. Rule: the track ADAPTS per patient —
    trackMin = min(rangeMin, patientValue), trackMax = max(rangeMax, patientValue).
HDL needs step=0.1 (dataset has 15.9, 38.5); an integer step silently rounds every
HDL value on first interaction.
Build ONE NumberSliderField component and reuse its input half in the R.3 manual
entry dialog — two implementations of "parse a clinical number" will diverge, and
the dialog's copy is the one that feeds the model.
NEXT AGENT STARTS AT: T.1 — build the component, then T.3 wire the commit triggers
through the existing abort + sequence guard.
