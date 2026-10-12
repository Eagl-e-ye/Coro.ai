# TASKS_v2.md — ordered checklist, integration phase

Read `01_INTEGRATION_BRIEF.md` and `PROGRESS_LOG.md` first. Work top to bottom.
Tick a box only after its **Verify** step produced real output you pasted into
the log.

Phases: **I** integration · **J** the four named defects · **K** missing features
· **L** deferred (do not start).

---

# Phase I — get her frontend talking to the real backend

## [ ] I.0 — Branch setup

**Nothing is on `main`.** Work lives on two branches: `indranil` (the human's —
backend, ML, trained models) and `jahanvi` (teammate's — the frontend).

```bash
git fetch origin
git branch -a
git ls-tree --name-only origin/indranil   # see the real top-level folder names
git ls-tree --name-only origin/jahanvi

git switch -c integration origin/jahanvi
git checkout origin/indranil -- backend/  # use the real names from ls-tree
ls -lh backend/ml/**/final_model/models/*.joblib
```

**Verify:** the four `.joblib` files exist and are megabytes, not ~130-byte LFS
pointers. If they are pointers, `git lfs pull`.

Also confirm `dataset.xlsx` sits inside `final_model/` next to `data.py`. If it
is one level up, copy it in — `data.py` looks for it beside itself, and the
backend needs it to compute median fill values.

**Log:** the real branch names, the paths you confirmed, file sizes.

---

## [ ] I.1 — Fill in `BRANCH_INVENTORY.md`

Read her frontend and complete every `<fill in>` in that file. This is a reading
task, not a coding task. **Change no code during I.1.**

**Verify:** `npm install && npm run dev` on her branch, heart renders, console
clean. Paste the output.

**Log:** that the inventory is complete; note anything surprising.

---

## [ ] I.2 — Reconcile the data shape

From the table in `BRANCH_INVENTORY.md` §I.1.b. If her shape differs from
`API_CONTRACT.md`, write one adapter:

```js
// frontend/src/adaptPrediction.js
// Maps the API_CONTRACT response into the shape Jahanvi's components expect.
// One function, one file — delete it if the shapes ever converge.
export function adaptPrediction(apiResponse) {
  // <shape it to match BRANCH_INVENTORY §I.1.b>
  return apiResponse;
}
```

If the shapes already match, this file is a pass-through and that is fine — keep
it anyway as the single seam between backend and her components.

**Verify:** unit-free check — log the adapter's output next to her mock's output
and confirm the keys match.

---

## [ ] I.3 — Backend running and reachable

Start the FastAPI backend (from the previous spec set's `main.py` / `predictor.py`
reference code — build them if they do not exist yet).

```bash
cd backend && uvicorn main:app --reload --port 8000
curl -s localhost:8000/api/health
curl -s -X POST localhost:8000/api/predict \
  -H 'Content-Type: application/json' \
  -d '{"Age":58,"Sex":"Male","Typical Chest Pain":1,"HTN":1,"DM":0}'
```

Pin `scikit-learn==1.9.1` in `requirements.txt`. A different version shifts the
calibrated probabilities and silently invalidates the stored thresholds.

**Verify:** paste the real JSON response. Confirm the four probabilities are in
[0,1] and `threshold_used` matches `thresholds.json`.

---

## [ ] I.4 — Vite proxy and the swap

Add the dev proxy so the frontend's `/api` calls reach port 8000 (check her
`vite.config.js` first — she may already have one):

```js
server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } }
```

Replace her mock call with the real one, through the adapter from I.2. Change as
few lines as possible — ideally one import and one function call.

**Verify:** in the browser, select a patient, see real numbers, and confirm in
the Network tab that `/api/predict` returned 200. Paste the probabilities and
confirm they differ from the mock's.

**This is the milestone.** Commit and log before starting Phase J.

---

# Phase J — the four defects the human named

## [ ] J.1 — Cancel in-flight predictions

**The problem.** Changing inputs quickly fires a request per change. They queue,
every one is computed, replies arrive out of order, and the UI flickers through
stale results.

**Three layers, all required:**

**1. Debounce** — wait ~150ms after the last change before sending at all. This
alone removes most of the traffic.

**2. Abort the previous request.** `AbortController` cancels the fetch and closes
the connection, which is what actually stops the browser queueing.

**3. Sequence guard.** Abort is not instant — a response can already be in
flight. The sequence number is what guarantees you never render a stale result.

```js
// frontend/src/api.js
let inFlight = null;
let seq = 0;

export async function predict(payload) {
  if (inFlight) inFlight.abort();          // layer 2
  const ctrl = new AbortController();
  inFlight = ctrl;
  const mySeq = ++seq;                     // layer 3

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (mySeq !== seq) return null;        // a newer request started; drop this
    if (!res.ok) throw new Error(`predict failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') return null;   // expected, not an error
    throw err;
  } finally {
    if (inFlight === ctrl) inFlight = null;
  }
}
```

Callers must treat `null` as "superseded — do nothing", **not** as an error and
**not** as empty results. Leave the previous render in place and keep the stale
marker on.

**Inputs never lock.** A field that stops responding while the model thinks reads
as a frozen app. The waiting state goes on the *output* side — dim the results
column or show a thin progress line. Never disable an input.

**Server side:** measure before building anything. Time a prediction:

```bash
curl -o /dev/null -s -w '%{time_total}\n' -X POST localhost:8000/api/predict \
  -H 'Content-Type: application/json' -d '{"Age":58,"Sex":"Male","Typical Chest Pain":1,"HTN":1,"DM":0}'
```

Four small random forests should answer in well under 100ms. **If p95 is under
300ms, do nothing more** — the client-side abort is sufficient and server-side
cancellation is wasted complexity. Only if it is slower, add a disconnect check
before the expensive section:

```python
from fastapi import Request
from fastapi.concurrency import run_in_threadpool

@app.post("/api/predict")
async def predict_endpoint(payload: dict, request: Request):
    if await request.is_disconnected():
        return Response(status_code=499)
    return await run_in_threadpool(run_prediction, payload)
```

**Verify:** change a value ten times in two seconds. Confirm in the Network tab
that earlier requests show as cancelled, and that the final displayed numbers
match the final input values. Paste the request list.

---

## [ ] J.2 — Short patient dropdown + manual entry

**The problem.** Every patient in the dataset is listed. 303 rows in a dropdown
is a data dump, not a demo.

**Target structure:**

```
+ Add patient details          <- manual entry, at the top
─────────────────────────
SAMPLE PATIENTS
  Patient 12 · 58 · Male
  Patient 47 · 45 · Female
  Patient 93 · 67 · Male
  Patient 130 · 52 · Female
  Patient 201 · 61 · Male
```

**Curate 5, do not take the first 5.** The set should tell a story on stage. Pick
one of each, by running the model over the dataset and reading the outputs:

1. Clear CAD, high confidence, multi-vessel — the dramatic one
2. Clear normal, low across all three — proves it does not just say "red"
3. Borderline, probability near the threshold — shows the band of uncertainty
4. Single-vessel disease — shows the three vessels move independently
5. One where the model is **wrong** against the catheterisation label

Include number 5 deliberately. Judges trust a team that shows a failure case far
more than one that shows five wins, and it is the honest thing to do.

Write the chosen ids into a small config the backend reads, so the curation is
visible and editable rather than buried:

```json
// backend/demo_patients.json
{ "ids": [12, 47, 93, 130, 201],
  "note": "curated for the demo; see TASKS_v2 J.2 for the selection rationale" }
```

`GET /api/patients` returns only these. Still **no CAD label in the list** — that
gives away the answer before the model speaks. The label is revealed only after
prediction (task K.4).

"Add patient details" opens her form with every field empty, required fields
first. New patients are in-memory only; they do not survive a refresh. That is
fine for a demo and needs no storage layer.

**Verify:** dropdown shows exactly 6 entries (5 + add). Each of the 5 loads and
predicts. Paste the five probability sets and confirm they span the range you
intended.

---

## [ ] J.3 — Heart rotation axis

**The problem.** The heart tumbles sideways instead of spinning upright. Its
anatomical vertical axis is not aligned with the world's up axis, while
`OrbitControls` auto-rotate always spins about the camera's up vector — `(0,1,0)`
by default.

**Diagnose first, do not guess.** Log the bounding box once after load:

```js
import { Box3, Vector3 } from 'three';
// after the GLB scene is available:
const box = new Box3().setFromObject(scene);
const size = box.getSize(new Vector3());
console.log('[heart] bbox size', size.x, size.y, size.z);
```

A heart is clearly longest along apex→base. **Whichever axis has the largest
extent is the anatomical vertical.** If that is `z`, the model is Z-up and needs
a −90° rotation about X to become Y-up:

```jsx
<group rotation={[-Math.PI / 2, 0, 0]}>
  <primitive object={scene} />
</group>
```

If it comes out upside down, use `+Math.PI / 2` instead. If the largest extent is
already `y`, the axis is not the problem — look at a stray rotation already
applied to the group, or at `autoRotate` settings.

**Fix at the model, not the camera.** Setting `camera.up = (0,0,1)` would also
make it spin correctly, but it breaks the polar-angle clamp (task K.6), makes the
Front/Left/Posterior view presets counter-intuitive, and leaves every future
camera calculation in a rotated frame. Rotate the model once, at load, and the
rest of the scene stays in ordinary Y-up world space.

**Verify:** auto-rotate the heart a full turn. The apex stays down and the base
stays up throughout — it spins like a globe, not like a tumbling die. Describe
what you saw in the log; a screenshot if you can produce one.

---

## [ ] J.4 — Required inputs: editable, but not casually

**The problem the human raised.** For a *recorded* patient, Age / Sex / Typical
Chest Pain / HTN / DM are facts from the record. Having them freely editable
invites someone to change a patient's age by accident and never notice the
prediction moved.

**Do not remove editability** — these are the five fields that can never be
defaulted, and manual entry depends on them. Make editing deliberate instead:

- **Manual entry ("Add patient details"):** all five fully editable, required,
  empty by default. Nothing changes here.
- **Recorded patient selected:** render the five as read-only values with a small
  `Edit` affordance. Clicking it unlocks the field and marks the patient as
  `modified` in the UI — a quiet label such as "modified from Patient 12", so
  nobody demos an edited record thinking it is the original.
- Once modified, **hide the actual-vs-predicted reveal** (K.4). Comparing a
  prediction against a catheterisation result for a patient whose inputs you
  changed is a false comparison, and a clinician judge will notice.

Keep her styling for the locked and unlocked states. If her design already has a
read-only treatment, use it.

**Verify:** select a recorded patient, confirm the five are read-only, unlock
one, change it, confirm the prediction updates and the "modified" label appears
and the actual-vs-predicted reveal disappears.

---

# Phase K — features her build is missing

Do these **only** for items `BRANCH_INVENTORY.md` §I.1.e marked as absent.
Skip anything she already built, in whatever form she built it.

## [ ] K.1 — Disclaimer check (pass/fail requirement)
Requirement 9.7: a clear clinical disclaimer visible in every frame, not behind a
scroll. If hers has one, done — tick and move on. If not, add a thin persistent
strip in her palette. Suggested text: *"Research prototype. Not a medical device.
Not for clinical decision-making."*

## [ ] K.2 — Stale-result marking
On any input or patient change, mark the displayed results stale **immediately** —
before the request even returns. Dim them, or show a "updating" marker. Never let
a number sit on screen looking authoritative while it describes different inputs.
On error: heart goes grey, message shown, and the previous patient's colours are
cleared. Showing the last patient's colours during an error is the worst
available failure.

## [ ] K.3 — Provenance tiers and completeness counter
Three visual tiers so the user always knows where a number came from: **entered**
(normal), **computed** (`ƒ` tag — BMI, Obesity), **assumed** (dimmed italic +
`median` tag). Plus a counter: `12 entered · 31 assumed`.

Then the named warning: when an *assumed* field is high-importance, say which.
Ranked list — Typical Chest Pain 8.9%, Age 4.3%, Atypical 4.2%, Region RWMA 3.4%,
HTN 2.9%, DM 2.8%, EF-TTE 2.7%. The backend returns these in
`meta.assumed_important`; render them, do not recompute the ranking client-side.

## [ ] K.4 — Actual vs predicted reveal
After prediction, for an unmodified recorded patient only:
`Predicted 85% · Actual catheterisation: CAD ✓ agreed`. This is the strongest
credibility moment in the demo and the labels are already in the spreadsheet.
Hidden for manual-entry and modified patients (see J.4).

## [ ] K.5 — SHAP rows with the patient's own values
Requirement 9.6, and easy to half-do. The row must carry the **actual value**
next to the impact — `LDL 155 mg/dL → +0.12`, not just `LDL → +0.12`. The feature
name alone does not satisfy the requirement.

SHAP comes from a separate **uncalibrated** RF (`build_explainers.py`), not the
calibrated model — `CalibratedClassifierCV` wraps the estimator and TreeExplainer
cannot see through it. Until that exists the backend returns
`top_shap_features: []`, and the frontend must render that gracefully — show
"explanation unavailable", never crash.

## [ ] K.6 — Camera controls
Clamp the vertical orbit to ±80° so the heart can never end up inverted — prevent
the confusion rather than cure it. Add **Reset view**, easing back over ~600ms
(snapping is disorienting), and **Fit to heart** for when someone has zoomed into
empty space.

---

# Phase L — deferred. Do NOT start these.

Listed so you recognise them and leave them alone: What-If sliders, globe-style
callouts with leader lines, the uncertainty band, the rules-engine explanation
panel, vessel click-to-focus with dimming.

**On the What-If sliders specifically** — the human asked which parameters may
have a slider, so the answer is recorded here for when Phase L starts:

**Sliders allowed** (modifiable by treatment or behaviour):
`LDL`, `HDL`, `TG`, `BP`, `FBS`, `Weight`, `PR`

**Never sliders:**
`Age`, `Sex`, `FH` (family history), `Q Wave`, `Region RWMA`, `EF-TTE`, and every
categorical diagnosis field.

The rule is not "is it a number" — it is **can a patient or a treatment actually
change it.** You cannot intervene on family history, and a Q wave is evidence of
an infarct that already happened. A clinician judge spots a family-history slider
immediately, and it undermines everything else on the screen.

`Weight` moves `BMI` and `Obesity`, which are **recomputed server-side** on every
request so they can never go stale.

Mandatory caveat line beside any slider: *"Shows how the model's output changes
with different inputs. It does not predict the effect of treatment."* The model
learned association, not causation, and that sentence is the difference between
an interpretability feature and a false medical claim.
