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
