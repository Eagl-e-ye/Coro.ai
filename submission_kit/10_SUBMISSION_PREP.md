# 10_SUBMISSION_PREP.md — arrange the repo for submission

Phase letter: **W**. Task ids `W.0` … `W.8`.

The build is finished. This phase does no feature work. It arranges the
repository so a judge can find all five deliverables without asking, removes what
should not ship, and fixes the small defects listed in `W.7`.

**Nothing here changes behaviour.** If a task would require editing component
logic beyond the five named fixes, stop and log instead.

---

## The one thing this phase is for

A judge opens the repository and has about ninety seconds of patience. The root
`README.md` must answer, immediately and without scrolling:

1. What is this?
2. Where do I see it running?
3. Where is each of the five deliverables?

Everything below serves that.

---

# [ ] W.0 — Inventory before moving anything

**Change nothing in W.0.** Produce a list and log it.

```bash
git branch -a
git status
find . -type d -name node_modules -prune -o -type f -print | grep -v '/\.git/' | sort
du -sh */ 2>/dev/null
```

Record in `PROGRESS_LOG.md`:
- the current default branch, and which branch holds the finished app
- every top-level directory and what it contains
- any **duplicated** model/ML folder (there were previously two copies of
  `test_ml_model/final_model` — one at the repo root and one under `backend/ml/`)
- whether `EXPERIMENTS.md`, `IMPROVEMENT_FINDINGS.md` and
  `model_improvement.ipynb` exist anywhere, and where
- whether the 3D asset pipeline scripts (OBJ classification / GLB merge) are
  committed, and where

The last two matter: both are scored evidence, and both are easy to leave
uncommitted on someone's laptop.

---

# [ ] W.1 — Make the finished work the default branch

**This is the highest-risk item in the whole submission.** The work lives on a
feature branch (`integration`, built from `jahanvi` with the backend from
`indranil`). If the repository's default branch does not contain the finished
app, a judge lands on an empty or stale page and scores what they see.

```bash
git switch integration
git push -u origin integration
```

Then either merge it into the default branch, or change the default branch to
`integration` in GitHub → Settings → Branches.

**Verify:** open the repository's plain URL in a logged-out browser. The README
you see must be the submission README from `W.3`. Paste what you saw into the log.

---

# [ ] W.2 — Remove what should not ship

Use `git rm` and commit, so everything stays recoverable.

### Delete

| path | why |
|---|---|
| `**/__pycache__/`, `*.pyc` | build artefacts |
| `**/node_modules/` | never committed |
| `**/dist/`, `**/build/` | regenerable |
| `.DS_Store`, `Thumbs.db` | noise |
| `frontend/src/mockPredict.js` and any other dead mock | the real API replaced it; a mock predictor in a submitted repo invites the question of which one runs |
| `final_model/FINAL_MODEL.md` | internal decision memo. It contains lines about how a judge might read the RCA number and which thresholds make the headline look better. It is strategy notes, not documentation, and it undercuts the honest framing that is in `MODEL_CARD.md`. Keep it locally if useful; do not publish it |
| the **duplicate** ML folder, if W.0 found two | pick the one the backend actually imports, confirm the backend still starts, delete the other. Two copies means a judge cannot tell which weights are live |
| stale screenshots, scratch files, `*.bak`, `nul`, editor leftovers | noise |

### Do NOT delete — these are scored evidence

- `models/*.joblib` (both the model and the `_explainer` bundles)
- `dataset.xlsx`
- `tune.py`, `train_final.py`, `data.py`, `verify_models.py`
- `EXPERIMENTS.md`, `IMPROVEMENT_FINDINGS.md`, `model_improvement.ipynb` — the
  evidence that XGBoost, LightGBM, SMOTE and feature selection were tried and
  ruled out. This is validation methodology, inside the 30% criterion
- the 3D asset pipeline scripts — evidence for the 25% criterion
- the `.glb` and the attribution files

Add a root `.gitignore`:

```gitignore
__pycache__/
*.pyc
node_modules/
dist/
build/
.DS_Store
.env
.venv/
*.log
```

**Verify:** `git status` clean; backend starts; frontend builds; a prediction
still returns. Paste the output.

---

# [ ] W.3 — The root README is the submission index

Rewrite the root `README.md`. This is the single most important file in the
repository for scoring, because it is the only one guaranteed to be read.

Required structure, in this order:

```markdown
# Coro.ai — Cardiovascular Risk Visualization & Prediction

Multimodal AI Hackathon 2026 · Track A

Predicts coronary artery disease and per-vessel stenosis (LAD / LCX / RCA) from
routine clinical data, and maps each prediction onto an interactive 3D heart with
per-patient explanations.

> **Research prototype. Not a medical device. Not for clinical decision-making
> or formal diagnosis.**

## Live demo
**TODO_LIVE_URL**

## Demonstration video
**TODO_VIDEO_URL**

## Where to find each deliverable

| # | Deliverable | Where |
|---|---|---|
| 1 | Working software prototype | TODO_LIVE_URL · run locally: *Quick start* below |
| 2 | Trained prediction pipeline | [`<ml path>/`](<ml path>/) — code, weights, `MODEL_CARD.md`, `verify_models.py` |
| 3 | Clinical explanation dashboard | In the app: vessel cards, SHAP drivers, global importance, and the **Model performance** page |
| 4 | Project documentation (6 pp.) | [`docs/Coro_ai_Documentation.pdf`](docs/Coro_ai_Documentation.pdf) |
| 5 | Demonstration video | TODO_VIDEO_URL |

## Results

| target | accuracy | 95% CI | recall | ROC-AUC | majority baseline |
|---|---|---|---|---|---|
| Cath (overall CAD) | 86.9% | 78.4–95.4 | 97.7% | 0.873 | 71.3% |
| LAD | 72.1% | 60.9–83.4 | 94.1% | 0.798 | 58.4% |
| LCX | 59.0% | 46.7–71.4 | 76.9% | 0.698 | 60.7% |
| RCA | 50.8% | 38.3–63.4 | 85.0% | 0.712 | 62.4% |

Held-out test set, n = 61. Thresholds for LCX and RCA are set to a recall floor
rather than to maximise accuracy — see `MODEL_CARD.md` for what that trades away,
including why RCA sits below its baseline on accuracy.

Reproduce every figure above from the committed weights:
`python verify_models.py`

## Quick start
<backend commands>
<frontend commands>
Open http://localhost:5173

## Architecture
<three or four lines: FastAPI + four calibrated RFs; React Three Fiber; the
contract between them>

## Licence · Attribution · AI disclosure
<the blocks from README_BLOCKS.md>
```

**Use the literal tokens `TODO_LIVE_URL` and `TODO_VIDEO_URL`.** They are
greppable, so the human can fill both in with one search and nothing is missed:

```bash
grep -rn "TODO_LIVE_URL\|TODO_VIDEO_URL" --include='*.md' .
```

Fill the real paths from `W.0`. Do not invent a directory layout.

---

# [ ] W.4 — Arrange the directories

Target shape. **Adapt to what W.0 actually found — do not move a folder just to
match this diagram**, since every move breaks imports.

```
README.md                  ← the index (W.3)
LICENSE                    ← code licence
ATTRIBUTION.md             ← BodyParts3D CC BY-SA 2.1 JP
.gitignore
docs/
  Coro_ai_Documentation.pdf   ← deliverable 4
  MODEL_CARD.md
  build-process/              ← optional, see W.5
backend/                   ← FastAPI + the ML folder it imports
frontend/                   ← React app
anatomy/                    ← 3D pipeline: OBJ → classified → merged .glb
```

If moving a directory is needed, move it with `git mv`, then **start the backend
and the frontend and run one prediction before committing.** A broken import
discovered after submission is unrecoverable.

If a move looks risky, leave the folder where it is and make the README table
point at its real path. **A correct link to an oddly-placed folder scores the
same as a tidy tree. A tidy tree that no longer runs scores zero.**

---

# [ ] W.5 — The build specs

The phased spec files (`01_…` to `10_…`) describe how the system was built. They
are good evidence of process and they support the AI disclosure.

**Publish these** under `docs/build-process/`:
`01_INTEGRATION_BRIEF` · `02_INPUT_MODES_AND_EXPLAINABILITY` ·
`04_INPUT_REBUILD` · `05_LAYOUT_BALANCE` · `06_EDITABLE_SLIDER_VALUES` ·
`07_PATIENT_REPORT` · `08_PATIENT_HISTORY` · `09_COMPAT_AND_CORRECTIONS`

**Do not publish** these four:
- `03_SCORING_ALIGNMENT.md` — it is written in terms of marks per hour and which
  criterion each task serves. True and useful internally; in a public repo it
  reads as optimising the rubric rather than the work.
- `PROGRESS_LOG.md`, `QUESTIONS.md`, `BRANCH_INVENTORY.md` — agent working
  scratch, full of handoff notes and half-answered questions.

Add `docs/build-process/README.md`, two sentences: these are the specifications
the AI coding agents worked from, kept under version control alongside the code.

If in doubt, leave the whole folder out. Nothing is lost — the AI disclosure in
the root README already describes the process.

---

# [ ] W.6 — Make the scored features reachable

A feature a judge cannot find scores nothing.

- **The Model performance page must have a visible link** in the header or
  footer. It currently appears to have no entry point. That page is the primary
  evidence for Predictive Performance — **30%, the largest single criterion**.
  Label it `Model performance`, not `/model` or an icon alone.
- **Global feature importance** must be reachable in two clicks or fewer from the
  main view.
- **The disclaimer** must be visible in every frame without scrolling, in both
  the main view and the model page. This is an explicit pass/fail requirement.
- **Export PDF Report** and **Saved Snapshots** are already in the header. Leave
  them.

**Verify:** hard refresh, then reach the model performance page, the SHAP panel
and the global importance view using only what is on screen. Log the click path
for each.

---

# [ ] W.7 — Five defects to fix before submission

Small, specific, each verifiable.

1. **Engineered features show `N/A` as their value** in the SHAP panels
   (`Anterior_Risk_Score N/A +0.06`, `ECG_Abnormality_Count N/A +0.05`). They are
   computed server-side and do have values; the lookup is failing for engineered
   features. Requirement 9.6 asks for the measurement beside the contribution, so
   these rows currently fail it. **20% criterion.**
2. **Raw column names leak into the UI.** `Anterior_Risk_Score` →
   `Anterior risk score`; `ECG_Abnormality_Count` → `ECG abnormality count`. Use
   the display-name lookup, do not rename anything in the model.
3. **BMI prints unrounded** — `26.813590449954088`. Round to one decimal in both
   the report and the UI.
4. **The exported PDF carries the browser's print header and footer**, including
   `localhost:5173` and the date. This cannot be suppressed from CSS. Add one
   line of helper text beside the Export button: *"In the print dialog, open More
   settings and untick Headers and footers."*
5. **Overall CAD and the vessel probabilities can contradict each other** — one
   sample report shows 33% overall (Low Risk) beside LAD at 94% Stenotic. Add a
   line under the vessel table, in the app and in the report: *"Overall CAD
   status and per-vessel stenosis are predicted by four independent models
   trained on separate labels. They can disagree."* Do not change any model
   logic.

---

# [ ] W.8 — Final verification

Run in a **logged-out / incognito** browser.

1. Repository URL → the submission README loads, on the default branch
2. Every link in the deliverables table resolves (no 404, no private-repo page)
3. `git clone` into a clean directory → backend starts, frontend builds, one
   prediction returns
4. `python verify_models.py` → prints OK
5. `ls -lh <ml path>/models/*.joblib` → **megabytes, not ~130 bytes.** A
   130-byte file is a Git LFS pointer and will not load for anyone cloning
6. `grep -rn "TODO_LIVE_URL\|TODO_VIDEO_URL" --include='*.md' .` → only the
   placeholders the human will fill, nothing else
7. `git log --all --full-history -- '*.env' '*secret*' '*key*'` → empty
8. Disclaimer visible on every screen
9. One female patient predicted — the dataset spells it `Fmale`; confirm the
   probability differs from the same patient as `Male`. Identical numbers mean
   the encoding is silently broken and every female prediction in the demo is
   wrong

Paste every result into the log.

---

# Left for the human

Do not attempt these; note them in the log as outstanding:

- The live deployment URL → replaces `TODO_LIVE_URL`
- The YouTube video → replaces `TODO_VIDEO_URL`
- `docs/Coro_ai_Documentation.pdf` → being prepared separately
- Making the repository **public**
- Final read-through of the README wording

---

# Logging

Same rules as `01_INTEGRATION_BRIEF.md` §4. Commit per task as `[W.n] …`.
End every entry with `NEXT AGENT STARTS AT: <task id> — <one line>`.

**W.1 and W.2 are destructive or hard to reverse.** Log before and after each,
including the exact commands run.
