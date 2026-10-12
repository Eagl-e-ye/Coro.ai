# 09_COMPAT_AND_CORRECTIONS.md — reconciling 07, 08 and vesselInfo.js

`07_PATIENT_REPORT.md` (Phase U), `08_PATIENT_HISTORY.md` (Phase V) and
`vesselInfo.js` came from a second author. They are **accepted into the spec set**
with the corrections below.

**Read this file before U.0 or V.0.** Where it disagrees with 07 or 08, this file
wins — it is the later document and it has the real threshold numbers.

---

## Verdict

Compatible. Phase letters `U` and `V` collide with nothing (`I J K M N P Q R S T`
are taken). Both files correctly cite `02` M.1 for MODIFIED, correctly place
themselves last in the build order, and correctly treat the report and history as
**not directly scored**.

Nine corrections. **C.2 is a real bug** that will show on stage.

---

## C.1 — "Select a disease above" is wrong copy

`vesselInfo.js` has, in all three vessels:

> `none: "Select a disease above to see the model's estimate for this artery."`

The user selects a **patient**, not a disease, and there is nothing "above" to
select it from — the dropdown is in the left column. In the empty state (`05` S.6)
this is the first sentence a judge reads.

**Replace with:** `"Select a patient to see the model's estimate for this artery."`

Corrected file supplied alongside this one.

---

## C.2 — `tierOf()` contradicts the heart's colour ⚠ real bug

The fallback branch:

```js
return v.probability >= 0.6 ? "high" : v.probability >= 0.3 ? "mod" : "low";
```

Those constants are not this model's. Thresholds are **per vessel**, from
`thresholds.json`, and the backend's `risk_from_prob` is:

```
High     if p >= threshold + 0.15
Moderate if p >= threshold - 0.05
Low      otherwise
```

| vessel | threshold | High at | Moderate at | disagrees with 0.6/0.3 across |
|---|---|---|---|---|
| Cath | 0.48 | ≥ 0.63 | ≥ 0.43 | 16% of the range |
| LAD | 0.40 | ≥ 0.55 | ≥ 0.35 | 11% |
| LCX | 0.32 | ≥ 0.47 | ≥ 0.27 | 16% |
| RCA | 0.30 | ≥ 0.45 | ≥ 0.25 | **20%** |

Concretely: **RCA at 0.50** → the backend returns `High` and paints the artery
red; `tierOf` returns `mod` and the bubble says *"borderline chance of
narrowing."* **RCA at 0.28** → backend `Moderate`, amber; bubble says *"low
chance."* The picture and the words contradict each other, in front of judges
scoring Clinical Interpretability.

This also breaks `API_CONTRACT.md`: the frontend applies `color_hex` **directly**
and never recomputes risk. `tierOf` is a second, divergent implementation.

**Fix:** trust `risk_level` from the payload. If it is absent, mirror the backend
rule using **that vessel's own `threshold_used`**, never a fixed constant.

**Also drop `status` from the chain.** `status` is `Stenotic` whenever
`p >= threshold`, but risk is `High` only at `threshold + 0.15`. Mapping
`Stenotic → high` overstates every borderline vessel. RCA at 0.33 is `Stenotic`
and `Moderate` — the bubble must say borderline.

Corrected implementation is in the supplied `vesselInfo.js`.

**Verify:** for each vessel, compare the bubble tier against `color_hex` across
probabilities 0.00–1.00 in 0.05 steps. Zero disagreements. Paste the check.

---

## C.3 — "WATCH FOR" reads as monitoring advice

The symptom lists are fine as anatomy. The framing is the problem: a heading of
**WATCH FOR** attached to a high-risk prediction tells the reader to monitor
themselves for those symptoms. That is health guidance, and rule 5 of
`01_INTEGRATION_BRIEF.md` says describe the model, never prescribe care.

**Fix the label, keep the content:**
`WATCH FOR:` → `Symptoms associated with this territory:`

An earlier screenshot also showed, in red: *"Chest pain lasting more than a few
minutes. Call emergency help now."* That is explicit emergency advice. It is not
in this config file, which is correct — **confirm it is also gone from the
component**, not merely absent from the config.

```
grep -rniE "call (emergency|911|an ambulance)|seek (help|care)|see a doctor" frontend/src
```
→ must return nothing in user-facing strings.

`ALERT = "Model estimate only. Not a diagnosis."` is good. Keep it.

---

## C.4 — Phase `M` vs Phase `R`: R supersedes

Both files say "M/R", which is a fair reading of an ambiguity in our own set.
Settle it:

| task | status |
|---|---|
| `02` M.1 (recorded patient read-only) | **superseded by `04` R.1 + R.2** |
| `02` M.2 (manual entry dialog) | **superseded by `04` R.3** |
| `02` M.3 (provenance tiers + counter) | **still live** — it has no R equivalent. Also tracked as `K.3` |
| `02` M.1's *definition* of MODIFIED | **still live and authoritative** |

So the prerequisite list for U and V reads **R.1, R.2, R.3, plus M.3/K.3**, not
"M/R". `04` R-tasks carry the real field list, medians and ranges; `02` M-tasks
were written before those were extracted.

---

## C.5 — `K.2` is an unlisted prerequisite of Phase U

`07` rule 2 requires "the stale flag from `K.2`", and `U.5` disables the button on
`stale`. But `K.2` is not in `07` §1's prerequisite list.

**Add `K.2` (stale-result marking) to the Phase U prerequisites.** Without it
there is no stale flag, and the report will happily print numbers that describe
inputs the user has already changed — the exact failure rule 2 exists to prevent.

---

## C.6 — `Sex` display in the report

The dataset stores female as `"Fmale"` (see `04`). The payload carries that
spelling. **The report must print `Female`, not `Fmale`** — a typo in a PDF a
judge takes away reads as carelessness about the data.

Map at the display boundary in `buildReport`, the same single place the input
mapping lives. Do not fix it by renaming anything in the payload or the model.

---

## C.7 — The trend strip needs a floor

`08` V.4 item 2 specifies four inline-SVG trend lines. With the typical demo
holding two or three snapshots, a "trend line" through two points is a straight
segment that implies a pattern from nothing — which is exactly the false-time
reading §2 of that file spends a page avoiding.

**Hide the trend strip until there are at least 3 snapshots.** Below that, show
the list only. No placeholder, no empty axes.

---

## C.8 — vesselInfo.js housekeeping

- **Path:** `frontend/src/vesselInfo.js`, unless `BRANCH_INVENTORY.md` shows a
  config or content folder already in use. Follow her convention.
- **`tierOf` returned `null`** for a missing vessel while `VESSEL_INFO.says` has a
  `none` key. The corrected version returns `"none"`, so the lookup
  `VESSEL_INFO[v].says[tier]` never lands on `undefined`.
- The copy describes **what the model estimated**, never a finding as fact. That
  is correct and must stay correct if the wording is edited.

---

## C.9 — Priority reality check

Both files say they are low priority and not directly scored. **That is correct
and it must be honoured.**

The scored rubric (`03`) is: Predictive Performance 30%, 3D Visualization 25%,
Clinical Interpretability 20%, System Integration 15%, Technical Implementation
10%. Neither a PDF report nor saved snapshots appears anywhere in it.

**Do not start U or V while any of these is unfinished:**

`I` (real API) · `J.1` (abort) · `N.1` (SHAP bar direction) · `R.1–R.3` ·
`T` (editable values) · `S` (layout) · `K.2` (stale) · `P.1`, `P.4`, `P.5`
(metrics table, methodology, the RCA note)

`P.1/P.4/P.5` in particular are **display-only work against numbers that already
exist**, landing in the 30% criterion. They outrank both of these phases by a wide
margin. A polished PDF attached to an unexplained 50.8% RCA accuracy scores worse
than a plain app with the methodology on screen.

If time runs short, build the **cut-down V** that `08` §1 already describes
(in-memory only, no consent dialog) or skip V entirely. `08`'s own guidance here
is sound.

---

## What needs no change

- `07`'s print-to-PDF decision over `html2canvas` + `jsPDF` — correct, and the
  reasoning is right.
- `#report-root` outside `#root` — correct; without it the print rule hiding
  `#root` hides the report too.
- `<tfoot>` for the repeating footer rather than `position: fixed` — correct.
- The `newId` helper with a non-secure-context fallback — correct, and a LAN-IP
  demo is exactly when `crypto.randomUUID` is missing.
- `document.title` restored in effect cleanup for StrictMode — correct.
- `SnapshotBridge` rendering on demand instead of `preserveDrawingBuffer` —
  correct, and failing to `null` so the report still prints is the right call.
- All of `08`'s privacy rules — consent before storage, explicit save, no
  identifiers, never storing the catheterisation label or assumed fields,
  device-only, always-visible delete, try/catch on every access. Keep every one.
- `08`'s honesty framing — "Saved snapshots" not "progression", neutral delta
  colour, showing the differing inputs beside every change. This is the right
  call and the reasoning is correct: the dataset is cross-sectional and the model
  has no time dimension.

---

## Logging

Append one entry recording that 07, 08 and vesselInfo.js were adopted with
corrections C.1–C.9, and that C.2 is a live bug to fix whenever `vesselInfo.js`
is first wired in — **not deferred to Phase U**, since the vessel bubbles are on
screen now.
