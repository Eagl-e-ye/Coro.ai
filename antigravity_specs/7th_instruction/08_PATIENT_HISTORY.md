# 08_PATIENT_HISTORY.md — saved snapshots, history and comparison

Read `01_INTEGRATION_BRIEF.md` first. Its priority rule applies unchanged: **her
frontend wins on layout, palette, components and wording; the six spec-wins items
win over everything.**

Phase letter: **V**. Task ids `V.0` … `V.7`.

---

## 1. Priority: LOW — read this before anything else

This feature carries **no direct weight in the scoring rubric**, and it is the only
feature in the project that touches **stored user data**, so getting it wrong
costs more than leaving it out.

It falls under step 10, "Everything else", of the re-weighted order in
`03_SCORING_ALIGNMENT.md`, and comes **after** the report (`07_PATIENT_REPORT.md`).

**Do not start Phase V until all of these are ticked:**
`I` (real API wired) · `J.1` · `N.1` · `M`/`R` (input modes and sliders) · `T`
(editable values) · `P.1`, `P.4`, `P.5` · `U` (report).

**If time is short, build the cut-down version:** `V.1`, `V.3`, `V.4`, `V.5` with
**in-memory storage only**. Skip `V.2` and `V.6`. Nothing is persisted, so no
consent dialog is needed. The history then reads *"Cleared when you close or
refresh this tab."* That is a complete, honest feature.

**Cost discipline** (`01_INTEGRATION_BRIEF.md` §6 applies): read before you write,
batch your verification, do not reformat files you were not asked to touch.

---

## 2. What "history" can and cannot mean here (the honesty rule)

The dataset is **cross-sectional**: one snapshot per patient. The model has **no
concept of time** and cannot say how a patient's disease progressed.

So in this app, "predictions changed over time" means exactly one thing:
**the model's output changed because the inputs were edited (or the model
changed).** It does not mean the disease got better or worse.

Therefore:
- Call the feature **"Saved snapshots"** or **"Run history"**. Never "progression",
  "trend of the patient's health" or "recovery".
- Show the **inputs that differ** between two snapshots next to every change in
  output, so the reader sees *why* the number moved.
- Use **neutral wording and neutral colour** for changes: `+12 pts`, `−8 pts`,
  arrows. **No green-for-good / red-for-bad on deltas** and no words like
  "improved" or "worsened" — that reads as a clinical judgement.
- Mandatory caveat line inside the view: *"Compares model outputs for different
  inputs. It does not show how a patient's condition changed over time."*

**MODIFIED means what `02` `M.1` says:** a What-If slider has moved off its
recorded value (`J.4` was superseded). A snapshot taken in that state is tagged
`What-if values — not the patient's recorded values`, in the list and in the
compare view. Otherwise a saved what-if could later be mistaken for a real
patient.

---

## 3. The rules (non-negotiable)

1. **Nothing is stored until the user says yes.** Default is in-memory only.
2. **Saving is an explicit act.** A `Save snapshot` button. No automatic recording
   of every slider tick — that produces junk and stores data nobody chose to keep.
3. **No identifiers.** No names, no free text, no date of birth. A snapshot's
   patient is `Patient 12` or `Manual entry 3`.
4. **Treat every patient the same.** Sample patients come from a public dataset,
   but manual entry could be real data. Do not special-case: consent applies to
   saving either.
5. **Never store** the catheterisation label, the heart image, or fields that were
   *assumed*. Only values the record supplied or the user entered are stored.
   What-if values are stored, and tagged (§2).
6. **Storage is on this device only.** No server, no network call from any history
   code. A hosted database is explicitly out of scope — list it as future work in
   the docs, do not build it.
7. **Delete is always one click away** — a visible `Delete all` in the history
   view, plus delete per entry. Revoking consent deletes everything immediately.
8. **Storage can fail** (private mode, quota, disabled). Wrap every read and write
   in `try/catch`; on failure fall back to memory and show a quiet notice.
9. **No treatment advice** and no clinical-judgement words anywhere in this view.
10. **Retention:** entries older than 30 days are purged on app load; at most 20
    are kept (oldest dropped, with the count shown).
11. **Build snapshots from the adapted prediction object** (the output of
    `adaptPrediction.js`) and her inputs state. Use her field names; invent none.
    No API call is made to save or view a snapshot.

---

## 4. What a snapshot contains

Values below are **illustrative**. Real thresholds come from the payload and
`thresholds.json` (for reference: Cath 0.48, LAD 0.40, LCX 0.32, RCA 0.30 in
`03` §P.1).

```jsonc
{
  "schema": 1,
  "id": "a1b2c3d4",
  "savedAt": "2026-10-11T09:41:00.000Z",
  "patientRef": "Patient 12",           // or "Manual entry 3"
  "mode": "recorded",                   // or "manual"
  "whatIf": false,                      // true if any What-If slider moved (M.1)
  "inputs": { "Age": 58, "LDL": 155 },  // entered + slider values ONLY
  "result": {
    "overall": { "p": 0.85, "threshold": 0.48 },
    "LAD":     { "p": 0.88, "threshold": 0.40 },
    "LCX":     { "p": 0.15, "threshold": 0.32 },
    "RCA":     { "p": 0.42, "threshold": 0.30 }
  }
}
```

Thresholds are stored **per snapshot** on purpose. If two snapshots have different
thresholds, the model was different when they were made, and the compare view says
so (V.5). This needs no backend change.

Generate ids with the same `newId()` helper as the report
(`frontend/src/report/utils.js`, task `U.1`) — `crypto.randomUUID` does not exist
outside secure contexts, and a demo over a LAN IP is not one.

---

## 5. Tasks

### [ ] V.0 — Check the prerequisites
Confirm the list in §1 is ticked. Read `BRANCH_INVENTORY.md` for where
`prediction`, the inputs state and the What-If state live. **Change no code in
V.0.**

### [ ] V.1 — The store
`frontend/src/history/historyStore.js` — one module, no React, no DOM beyond
`localStorage`:

```js
historyStore.list()                    // newest first
historyStore.add(snapshot)             // enforces max 20, drops identical consecutive
historyStore.remove(id)
historyStore.clear()
historyStore.isPersistent()            // false until consent
historyStore.enablePersistence()       // after consent: copies memory -> storage
historyStore.disablePersistence({ wipe: true })
```

Default backing is a plain in-memory array. Persistent backing uses the key
`coro.history.v1`; every access in `try/catch`; on load, drop entries older than
30 days and any whose `schema` is unknown. Wrap it in a small `useHistory()` hook
so components re-render on change.

**Verify:** in the console, `add` three snapshots, `list` returns them newest
first, `add` a fourth identical to the third → count unchanged, `clear()` → empty.

### [ ] V.2 — Consent (skip in the cut-down version)
Shown **once**, the first time the user asks to keep snapshots across refreshes —
a small dialog in her dialog style, **not** on page load.

Plain-language copy (adapt to her tone, keep the four facts):
- **What is saved:** the inputs you entered, the model's results, and the time.
- **Where:** only in this browser on this device. Nothing is sent anywhere.
- **What is not saved:** names, identifiers, catheterisation results, images.
- **How to remove it:** `Delete all` in the history panel, at any time.

Buttons: `Keep on this device` · `Keep for this session only`, **equal visual
weight**; neither is the pre-selected, dominant "accept".

Store the decision as `coro.consent.v1 = { version: 1, grantedAt }`. Declining, or
never answering, means in-memory. A `Storage` toggle in the history panel lets the
user change their mind; turning it off calls `disablePersistence({ wipe: true })`.

**Verify (in a fresh or private window, so no earlier session leaves keys behind):**
Application → Local Storage shows **no `coro.*` keys** before consent; both keys
after accepting and saving; **both gone** after revoking.

### [ ] V.3 — `Save snapshot`
A button in the **results (right) column**, her secondary-button style — never in
the left column (`05_LAYOUT_BALANCE.md` overflow policy). Disabled in the same
four states as the report button (`07` U.5). Builds a snapshot from the on-screen
state (rule 11) and calls `historyStore.add`. Confirm with a short inline `Saved`,
not a modal.

**Verify:** save, move the LDL slider, save again → two entries; the second carries
the new LDL and new probabilities and the what-if tag.

### [ ] V.4 — History panel
A **drawer or popover that overlays** the page — it must not change the height of
the left column or the canvas (the equal-height rule from `05` still holds), and it
must stay inside the viewport. Opened from a small `History` button with the entry
count. This button is **always enabled**, including in the empty state, because
viewing saved snapshots needs no selected patient.

Contents, in order:
1. The caveat line from §2.
2. **A small trend strip:** one inline-SVG line each for overall, LAD, LCX, RCA,
   fixed 0–100% scale, x-axis = snapshot order, labelled *"saved snapshots"* and
   not as a time axis (timestamps appear on hover). **No chart library.**
3. **The list:** time, patient ref, overall %, the what-if tag where relevant, and
   a delta vs the previous snapshot (`+12 pts`, neutral colour). Per-row `Delete`.
4. A `Compare` checkbox on each row (max two) and a `Compare` button.
5. Footer: the `Storage: this device / this session only` toggle, and `Delete all`.

Empty state: *"No snapshots yet. Use Save snapshot to keep a result here."*

### [ ] V.5 — Compare view
Opens from the panel with exactly two snapshots selected.

- **Honest title:** same `patientRef` → *"Two runs for Patient 12"*; different →
  *"Two patients"*.
- **Side by side:** overall + LAD / LCX / RCA bars for A and B, with the
  difference in percentage points. Neutral colour for the difference. A what-if tag
  on either snapshot that has one.
- **Inputs that differ:** a table of only the fields whose values differ
  (`LDL  155 → 180`), max 10 rows, then `+N more`. This is the explanation of the
  change; it must be there.
- **Threshold warning:** if any threshold differs between A and B, show *"These
  snapshots were made with different model settings, so the probabilities are not
  directly comparable."*
- The caveat line from §2.

**Verify:** two snapshots of one patient with only LDL changed → the differing-
inputs table has exactly one row. Two different patients → title reads "Two
patients".

### [ ] V.6 — Delete and retention (skip in the cut-down version)
Per-entry delete, `Delete all` with a one-step confirm, the 30-day purge on load,
the 20-entry cap with *"Showing the latest 20"*. All paths must work for both
memory and persistent backing.

**Verify:** set a stored snapshot's `savedAt` to 31 days ago in the JSON, reload →
it is gone.

### [ ] V.7 — Final verification
1. In a fresh/private window, hard refresh → **no `coro.*` keys**; History shows `0`.
2. Save two snapshots **without** consent → they survive navigation inside the app
   but are gone after refresh.
3. Accept consent → refresh → snapshots remain.
4. Network tab through the whole flow → **no request from history code.**
5. Block storage (private window or DevTools) → the app still works, with the quiet
   notice and the in-memory fallback.
6. Treatment / judgement language check:
   `grep -riE "improv|worse|recover|progression|should|recommend|consult|treatment" frontend/src/history`
   → no matches in user-facing strings. (Identifiers in code may match; judge by
   what the user can read.)
7. The report (Phase U) is unchanged.

Paste a description of the Local Storage state at each step and the grep output
into the log.

---

## 6. Not in scope — do not build

- A server-side database, accounts or login.
- Sync between devices, or export/import of history.
- History inside the PDF report. (May be added later, only for consented, persisted
  snapshots.)
- Real time-series modelling. The model has no time dimension.

---

## 7. Logging

Same rules as `01_INTEGRATION_BRIEF.md` §4. Commit per task as `[V.n] …`. Tick
boxes here in the same session. If a decision touches consent wording or what is
stored, **write it in `QUESTIONS.md`** and take the more conservative option
(store less, ask first) while waiting. End every entry with
`NEXT AGENT STARTS AT: <task id> — <one line>`.
