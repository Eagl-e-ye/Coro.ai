# 07_PATIENT_REPORT.md — one-click patient report, exported to PDF

Read `01_INTEGRATION_BRIEF.md` first. Its priority rule applies unchanged: **her
frontend wins on layout, palette, components and wording; the six spec-wins items
win over everything.** This file adds report-specific rules on top.

Phase letter: **U**. Task ids `U.0` … `U.7`.

---

## 1. What this is, and where it sits in the build order

A single button that produces a clean, printable document: the patient's inputs,
the predicted outcome, the factors that drove it, the model's limitations, and a
date/time stamp. It is exported as a PDF.

It is a takeaway for a judge and makes the app useful beyond a live demo. It is
**not directly scored**, so it must not delay anything on the critical path.

**Order.** In the re-weighted list in `03_SCORING_ALIGNMENT.md` this falls under
step 10, "Everything else". Build it **after** `N.1` (SHAP bar direction), `R.2`
(sliders), `T` (editable values) and `P.1`/`P.4`/`P.5`, and **before** Phase V
(`08_PATIENT_HISTORY.md`). The report prints what the screen shows; building it
earlier means rebuilding it.

**Cost discipline** (`01_INTEGRATION_BRIEF.md` §6 applies): read before you write,
batch your verification, do not reformat files you were not asked to touch.

---

## 2. The rules (non-negotiable)

1. **One source of truth.** The report is built from the *same* adapted
   prediction object (the output of `adaptPrediction.js`) and the *same* inputs
   state that are on screen. Use her field names; invent none. **No second API
   call** — a refetch can return different numbers than the ones the user is
   looking at.
2. **Never generate from a stale, loading, empty or error state.** Use the stale
   flag from `K.2`. The button is disabled in all four states, with a short reason
   beside it (U.5).
3. **Disclaimer on every printed page** (requirement 9.7, the same pass/fail item
   as on screen). Suggested text: *"Research prototype. Not a medical device. Not
   for clinical decision-making."*
4. **No treatment advice anywhere in the report.** No "should", "recommend",
   "consult", "consider", "follow up". Contributing factors are described as
   *what the model weighed*, never as a suggestion.
5. **MODIFIED means what `02` `M.1` says:** a What-If slider has moved off its
   recorded value. (`J.4` was superseded; do not use its meaning.) When MODIFIED:
   - label every changed value `What-if value — not this patient's recorded value`
     and show `record 120 → what-if 180`;
   - print the mandatory caveat verbatim: *"Shows how the model's output changes
     with different inputs. It does not predict the effect of treatment."*;
   - **omit the catheterisation reference row entirely** (K.4 / M.1).
6. **The catheterisation label** appears only for an **unmodified recorded
   patient**, in a row labelled *"Reference result (not a model input)"*. For
   manual entry and for MODIFIED patients the row is omitted — do not print "N/A".
7. **No names, no identifiers.** The patient is `Patient 12` or `Manual entry`.
   There is no free-text field in the report.
8. **Client-side only.** Nothing is uploaded, stored or sent. The footer says so.
9. **Timestamp is captured at the click**, not at render, and shown as local time
   with timezone *and* ISO-8601 UTC.
10. **No hardcoded metrics in the limitations text.** Pull them from
    `GET /api/model-info` (Phase P). If it does not exist yet, use the static
    fallback in U.6, which contains **no numbers**.

---

## 3. Report anatomy

A4 portrait, **two pages at most**. White paper, dark text, regardless of her
on-screen theme — a report is read on paper or in a PDF viewer.

| # | Section | Contents |
|---|---|---|
| 1 | **Header** | `Coro.ai — Coronary risk assessment`, "Research prototype" tag, generated-at (local + UTC), short report id, patient reference, mode (`Recorded patient` / `Manual entry`), and `What-if values used: yes/no` |
| 2 | **Predicted outcome** | Overall CAD probability, status, decision threshold. Then LAD / LCX / RCA rows: probability, status, threshold used. Beside it: the 3D heart snapshot (U.4) |
| 3 | **Contributing factors** | Per vessel, the top SHAP rows **with the patient's own value**: `LDL 155 mg/dL → +0.12`. Show the baseline if `N.2` exists. If `top_shap_features` is empty: *"Explanation unavailable for this vessel."* — never an empty box |
| 4 | **Patient inputs** | Grouped exactly as the manual-entry dialog groups them (the 8 groups in `04_INPUT_REBUILD.md`). **Entered** values (for a recorded patient, the record's values count as entered) and **computed** values (`ƒ`) are listed with units. Fields **assumed at the dataset median** are collapsed into one line of names plus the counter, e.g. `12 entered · 32 assumed` — read from the payload, never typed in |
| 5 | **Model limitations** | See U.6 |
| 6 | **Footer (every page)** | Disclaimer (rule 3), *"Generated on this device. No data was uploaded."*, and the **BodyParts3D CC BY-SA 2.1 Japan** attribution for the heart image |

**Direction must not depend on colour.** A printed copy may be black and white.
Every SHAP row carries an explicit sign (`+0.12` / `−0.08`) and the word "raises"
or "lowers", in addition to any colour.

---

## 4. Approach decision — the browser's print-to-PDF

**Do this:** render a print-only `ReportView`, call `window.print()`, and let the
user choose *Save as PDF*. Print CSS controls the layout.

**Why:** zero dependencies, real selectable vector text, correct pagination,
works offline on conference wifi, and reuses her CSS tokens.

**Do not use `html2canvas` + `jsPDF` as the first choice.** It rasterises all
text (blurry, not selectable), mishandles `backdrop-filter` and WebGL canvases,
and adds hundreds of KB. Fall back to it **only** if U.7 shows the print route
failing in the browser the judges will use, and log the reason first.

The button label is `Download report (PDF)`. Helper text beside it:
*"Opens your print dialog — choose Save as PDF."*

---

## 5. Tasks

### [ ] U.0 — Locate the state
Read `BRANCH_INVENTORY.md`. Find: the adapted `prediction` object, the current
inputs, where recorded-vs-manual and MODIFIED are tracked, the loading/stale/error
flags, and where her results column header is. **Change no code in U.0.** If any
of these do not exist yet, stop and log.

### [ ] U.1 — `buildReport(state)`
`frontend/src/report/buildReport.js` — a **pure function**, no DOM, no fetch.
Also create `frontend/src/report/utils.js` with two helpers:

```js
// crypto.randomUUID only exists in secure contexts; a demo over a LAN IP is not one.
export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16)).slice(0, 8);

export const stamp = (d) =>
  d.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');   // 20261011-0941
```

`buildReport` returns a plain object:

```js
{
  reportId, generatedAt,              // Date captured at click
  patientRef, mode, modified,         // modified = a What-If slider moved (M.1)
  overall: { probability, status, threshold },
  vessels: { LAD: {...}, LCX: {...}, RCA: {...} },
  drivers: { LAD: [{ feature, value, unit, impact }], ... },
  inputsByGroup: [{ group, rows: [{ label, value, unit, tier, whatIfFrom }] }],
  counts: { entered, computed, assumed },
  assumedNames: [...],
  reference: null | { label, agreed },    // only if unmodified recorded patient
  limitations: [...],                     // U.6
}
```
**Verify:** `console.log(buildReport(state))` for a recorded patient, a MODIFIED
one, and a manual entry. Paste the three objects (trimmed) into the log. Confirm
`reference` is non-null for the first only.

### [ ] U.2 — `ReportView` and the print trigger
`ReportView.jsx` renders through a portal. The target must sit **outside** her
React root, otherwise the print rule that hides `#root` hides the report too:

```html
<!-- frontend/index.html -->
<div id="root"></div>
<div id="report-root" class="report-root"></div>
```

`ReportView` is **mounted only while generating** and unmounted afterwards, so it
costs nothing during normal use and never competes with the 3D canvas.

```jsx
const [report, setReport] = useState(null);

function generateReport() {
  let heartImg = null;
  try { heartImg = snapshotRef.current?.capture() ?? null; } catch { /* report without picture */ }
  setReport({ ...buildReport(state), heartImg });
}

useEffect(() => {
  if (!report) return;
  const prevTitle = document.title;
  document.title = `coro-report-${report.patientRef.replace(/\s+/g, '-')}-${stamp(report.generatedAt)}`;
  const done = () => setReport(null);
  window.addEventListener('afterprint', done, { once: true });
  // two frames so the portal has painted before the print dialog opens
  const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  return () => {
    cancelAnimationFrame(id);
    window.removeEventListener('afterprint', done);
    document.title = prevTitle;        // restored in cleanup, so React StrictMode's
  };                                    // double-run in dev cannot leave it changed
}, [report]);

// in the component tree:
{report && createPortal(<ReportView report={report} />, document.getElementById('report-root'))}
```

`document.title` becomes the suggested PDF filename, which is why it is set
temporarily. If the heart image is present, `await img.decode()` before calling
`window.print()`.

### [ ] U.3 — Print stylesheet and the repeating footer
`frontend/src/report/report.css` (or her CSS approach — match her convention).

```css
.report-root { display: none; }

@media print {
  @page { size: A4; margin: 14mm; }

  #root { display: none !important; }
  body::before, body::after { display: none !important; }   /* any fixed full-page background */
  html, body { background: #fff !important; }
  .report-root { display: block; }

  * { backdrop-filter: none !important; box-shadow: none !important; animation: none !important; }

  .report { background: #fff; color: #111;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-section, .report-row, .report-driver { break-inside: avoid; }

  .report-frame { width: 100%; border-collapse: collapse; }
  .report-frame tfoot { display: table-footer-group; }       /* repeats on every page */
}
```

Structure the report as one table so the footer both **repeats and reserves its
own space**:

```jsx
<table className="report-frame">
  <tbody><tr><td> …sections 1–5… </td></tr></tbody>
  <tfoot><tr><td className="report-footer"> …section 6… </td></tr></tfoot>
</table>
```

Do **not** use a `position: fixed` footer. It repeats on every page, but fixed
elements sit inside the page box, so the footer overprints the body text.

Use **one** accent colour from her palette for the probability bars. Everything
else is neutral grey on white.

**Verify:** print preview shows no dark background, no blurred glass, no cut cards,
and the footer sits **below** the text on both pages without overlap.

### [ ] U.4 — 3D heart snapshot
Inside the `<Canvas>`, add a bridge that exposes a capture function:

```jsx
function SnapshotBridge({ apiRef, backdrop = '#1d1440' }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    apiRef.current = {
      capture: () => {
        const src = gl.domElement;
        if (!src.width || !src.height) return null;
        gl.render(scene, camera);                 // draw now, so no preserveDrawingBuffer
        const out = document.createElement('canvas');
        out.width = src.width; out.height = src.height;
        const ctx = out.getContext('2d');
        ctx.fillStyle = backdrop;                 // shell is translucent; it washes out on white
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(src, 0, 0);                 // same tick, buffer still valid
        return out.toDataURL('image/jpeg', 0.9);
      },
    };
    return () => { apiRef.current = null; };
  }, [gl, scene, camera, apiRef, backdrop]);
  return null;
}
```

`backdrop` should be her dark indigo/heart-glow colour. If `capture()` throws or
returns `null`, **omit the image and carry on** — a report without a picture is
fine; a report that fails to open is not. Do **not** set `preserveDrawingBuffer`
globally; it costs frames on integrated graphics.

### [ ] U.5 — The button
Place it in the **results (right) column**, using **her existing secondary-button
style**. Do not put it in the left column: the left column is the one that
overhangs (`05_LAYOUT_BALANCE.md`), and the overflow policy says never to grow it
at the canvas's expense.

Disabled when `!prediction || stale || loading || error`, with the reason beside
it in small text. Match her dropdown's own wording for the empty case:
`Nothing selected yet` · `Updating…` · `Result unavailable`.

Clicking it must **never trigger a prediction.** It only reads state.

### [ ] U.6 — Limitations text
Source order: (1) `GET /api/model-info`, (2) the static fallback. Plain wording,
no hedging adjectives, no numbers in the fallback.

Static fallback:
- Trained on a single public dataset; not tested on an independent population.
- The dataset is one snapshot per patient. The model does not describe change over
  time.
- Probabilities are calibrated estimates, not diagnoses.
- Explanations show how the model weighed the inputs. They describe association,
  not cause.
- Fields that were not entered were filled with the dataset median or counted as
  absent; the count is in Section 4.
- Right coronary artery (RCA) is the model's weakest target.

When `model-info` exists, add one sentence from the payload: the test-set size, and
for RCA the accuracy **with its 95% interval** and the majority-class baseline, as
`P.5` states it. Read every figure from the payload; never type one.

### [ ] U.7 — Verification
1. Hard refresh, nothing selected → button disabled, reason shown, no request sent.
2. Recorded patient, wait for the result, click → print preview is ≤ 2 pages,
   disclaimer + timestamp on **each** page, heart image, SHAP rows with values and
   signs, reference-result row present.
3. Move an LDL slider, wait, click → `record → what-if` shown, the What-If caveat
   present, reference-result row **gone**.
4. Manual entry → no reference-result row.
5. Click while a request is in flight → button disabled, nothing prints.
6. Network tab during report generation → **zero requests.**
7. Save as PDF → text is selectable; filename starts `coro-report-`; after closing
   the dialog, `document.title` is back to the app's title (run in dev, where
   StrictMode double-runs effects).
8. Footer sits below the text on every page, never over it.
9. Treatment-language check:
   `grep -riE "should|recommend|consult|consider|follow.?up|treatment" frontend/src/report`
   The **only** permitted match in user-facing text is the mandatory What-If caveat
   sentence in rule 5.
10. Chrome and Edge; Firefox as a sanity check. Open once over a LAN IP (not
    `localhost`) to confirm the report id helper works without a secure context.

Paste the page count, the grep output and a description of each preview into the
log.

---

## 6. Logging

Same rules as `01_INTEGRATION_BRIEF.md` §4. Commit per task as `[U.n] …`. Tick
boxes here in the same session. End every entry with
`NEXT AGENT STARTS AT: <task id> — <one line>`.
