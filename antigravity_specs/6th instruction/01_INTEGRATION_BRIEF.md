# 01_INTEGRATION_BRIEF.md — read this before TASKS_v2.md

**This file supersedes parts of `00_START_HERE.md`.** The situation changed: a
teammate (Jahanvi) built a different, better frontend on branch `jahanvi`. That
frontend is now the base. Your job is no longer "build a frontend" — it is
"connect the real backend to hers, then add what hers is missing."

---

## 1. The priority rule (the most important rule in this file)

When Jahanvi's frontend and the markdown specs disagree, **her frontend wins** —
but only in the areas where she has authority. Split it this way:

### Her code wins — do not rewrite to match the spec
- Layout, column order, spacing, grid
- Colour palette, typography, dark/light treatment
- Component structure, file names, state management style
- Component naming, CSS approach (modules / Tailwind / styled — whatever she used)
- Interaction patterns she already implemented (how a card expands, how a
  dropdown opens, animation timing)
- Her wording and labels, where she wrote them

If a spec item describes a visual that already exists in her build in a different
form, **her form stays.** Do not "fix" her design toward the spec. Log that you
chose hers and move on.

### The spec wins — these are not style opinions
1. **`API_CONTRACT.md` field names.** The backend is already written to them.
   If her mock uses different names, write a thin adapter in the frontend, or
   rename on her side — do not change the backend contract without logging it.
2. **Preprocessing order in the backend.** fill → BMI/Obesity → `engineer()` →
   drop → align. Non-negotiable; getting it wrong produces silently wrong
   predictions.
3. **Never best-case fill.** Missing continuous → dataset median. Missing binary
   → absent. Measured: best-case fill understates LAD risk by 29 points.
4. **The clinical disclaimer must be on screen in every frame.** Hackathon
   requirement 9.7. If her design has no space for it, find one — a thin strip is
   enough. This is a pass/fail item, not a preference.
5. **No treatment advice anywhere in the UI copy.** Describe what the model
   weighed. Never suggest care.
6. **The true catheterisation label must never reach the model's input**, and
   must not appear in the patient dropdown. It may only appear *after* a
   prediction, as the "actual vs predicted" reveal.

Everything not in that list of six: **her code wins.**

### When you genuinely cannot tell
Write the question in `QUESTIONS.md`, pick the option that changes less of her
code, log the choice, and keep moving. Do not stall waiting for an answer.

---

## 2. How to get her branch — do NOT download a zip

The human asked whether to download her files into a separate folder. **No.** It
is the same repository, so git already has the relationship; a zip throws it away
and turns the merge into manual copy-paste.

Run this from the repo root:

```bash
git fetch origin jahanvi
git switch -c integration origin/jahanvi
```

You are now standing on her frontend, with full history, in the real working
tree. There is nothing to copy.

### The two branches

**There is nothing on `main`.** All work lives on two feature branches:

| branch | owner | holds |
|---|---|---|
| `indranil` | the human you are working with | backend, ML training scripts, trained `.joblib` models, `dataset.xlsx`, the markdown specs |
| `jahanvi` | teammate | the frontend you are integrating onto |

Do not reference `main` anywhere. It is empty or absent.

### Bringing the backend and ML across

Her branch does not have the trained models or the backend — those are on
`indranil`. Pull those folders in **by path**, which cannot conflict because the
folders are disjoint from her frontend:

```bash
# confirm both branches exist and see what each contains
git branch -a
git ls-tree --name-only origin/indranil
git ls-tree --name-only origin/jahanvi

# then, from the integration branch:
git checkout origin/indranil -- backend/
git checkout origin/indranil -- ml/      # only if this path exists; check first
git status                               # review what arrived before committing
git commit -m "bring backend + trained models onto Jahanvi's frontend"
```

Use `origin/indranil`, not a bare `indranil` — a local branch of that name may be
stale or may not exist in this clone.

The top-level folder names may differ from `backend/` and `ml/`. The `ls-tree`
output above tells you the real ones. Take **everything on `indranil` that is not
frontend**, and leave her `frontend/` untouched.

**Do not `git merge indranil` into her branch.** If both branches touched
`frontend/src/App.jsx` you will get conflicts in exactly the file you least want
to resolve by hand. Path-scoped checkout avoids this entirely.

If `indranil` turns out to contain a frontend too, **ignore it completely** — do
not diff it, do not port pieces of it across, do not try to reconcile the two.
Hers is the base. Mixing the two frontends is how this project loses a day.

Verify `*.joblib` files actually arrived — if the repo uses Git LFS they may be
pointer files. Check with `ls -lh` and confirm the size is megabytes, not bytes.
If they are pointers, run `git lfs pull`.

### Commit discipline on the integration branch
- Commit after each completed task, not in one giant commit at the end.
- Message format: `[task id] what changed` — e.g. `[J.1] abort in-flight predict`.
- Never force-push `integration`. Another agent may have pulled it.

---

## 3. What this milestone is

A human opens the app on Jahanvi's design, picks a patient from a short
dropdown, and sees real probabilities from the real `.joblib` models with the
3D heart recoloured to match. Rapid input changes feel instant and never produce
a stale or mismatched result.

**Not in this milestone:** What-If sliders, globe callouts, uncertainty band,
rules explanation panel. Phase L lists them; do not start them.

---

## 4. Logging — unchanged and still mandatory

`PROGRESS_LOG.md` rules from the previous spec set still apply in full:

- Read the whole log before doing anything.
- Append, never overwrite.
- Log when you finish a task **and** before you run out of context or limit. If
  you feel the session ending, stop coding and write the entry first.
- Be concrete: files changed, commands run, actual pasted output.
- Record blockers, with your best guess at the cause.
- Keep `TASKS_v2.md` checkboxes in sync in the same session.
- End every entry with `NEXT AGENT STARTS AT: <task id> — <one line>`.

New requirement for this phase: the **first** thing you do on the integration
branch is fill in `BRANCH_INVENTORY.md`. Every later task depends on it, and
re-deriving it burns a whole session of context. Treat it as task I.1 and log it.

---

## 5. Asking the human

`QUESTIONS.md` exists for this. Append questions there with an id, and say in
your log entry that questions are waiting. The human reads it between sessions.

Ask when: a decision is irreversible, affects the demo narrative, or needs a
clinical judgement you cannot make. Do not ask about code style, file placement,
or anything `BRANCH_INVENTORY.md` would tell you if you just read her code.

---

## 6. Credits and context budget

The human is watching cost. Concretely:

- **Read before you write.** One careful pass over her `App.jsx` beats three
  rounds of edit-and-revert.
- **Do not re-run the full test suite or rebuild after every edit.** Batch.
- **Do not re-derive the inventory** — it is in `BRANCH_INVENTORY.md`.
- **Do not reformat, lint-fix, or refactor files you were not asked to touch.**
  A diff full of whitespace noise costs tokens to review and hides real changes.
- **Never retrain the model.** The `.joblib` files are frozen. Loading takes
  milliseconds; training takes minutes and would invalidate the thresholds.
