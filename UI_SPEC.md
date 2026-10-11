# Webpage spec — load to visualization

Numbered reference for the cardiac risk viewer. Refer to items by ID.

Status key: `done` built · `partial` built against mock data · `todo` not started

---

## 1. Page load / empty state

| id | item | status |
|---|---|---|
| 1.1 | No patient auto-loaded. Page opens with nothing selected. | todo |
| 1.2 | Heart renders in **muted anatomical red-brown**, not grey. Grey sits too close to green on the risk scale and reads as "low risk" rather than "not assessed". | todo |
| 1.3 | Heart is larger than in the working state and slowly auto-rotates. It is the hero until there is data to compete with it. | todo |
| 1.4 | Right column shows `—` placeholders with a one-line hint of what will appear. | todo |
| 1.5 | "Not assessed" label on the canvas. | todo |
| 1.6 | Left column: patient dropdown + "Add new patient" as the single focal action. | todo |
| 1.7 | Disclaimer strip visible from the first paint, not after scrolling. | done |

---

## 2. Patient selection and input

| id | item | status |
|---|---|---|
| 2.1 | Dropdown structure: `+ Add new patient` at top, divider, then `RECORDED PATIENTS`. | todo |
| 2.2 | Each row shows id, age, sex. **Not** the true CAD label — that would give away the answer before the model speaks. | todo |
| 2.3 | Selecting a recorded patient fills every field; all remain editable. One surface, not two separate doors. | todo |
| 2.4 | Form tiers: required fields always visible, the rest in collapsible sections. | todo |
| 2.5 | **Required** (never defaulted): Age, Sex, Typical Chest Pain, HTN, DM. These are the fields where the dataset median disagrees with "healthy", and Typical Chest Pain is the single most important feature at 8.9%. | todo |
| 2.6 | Collapsible sections: History / Exam / ECG / Labs / Echo. | todo |
| 2.7 | `BMI` and `Obesity` computed from Weight and Length. Computed **server-side**, so What-If changes cannot leave them stale. | todo |
| 2.8 | Missing values: continuous → dataset median; binary findings → absent. For 28 of 31 binary fields the mode *is* "absent", so there is no conflict. | todo |
| 2.9 | **Never best-case fill.** Measured: understates LAD risk by 29 points vs 13 for median. False reassurance is the worst failure mode for a screening tool. | — |
| 2.10 | Three visual tiers so provenance is always visible: entered (normal) · computed (`ƒ` tag) · assumed (dimmed italic + `median` tag). | todo |
| 2.11 | Completeness counter: `12 entered · 31 assumed`. | todo |
| 2.12 | Named warning when a high-importance field is assumed. Ranked list: Typical Chest Pain 8.9%, Age 4.3%, Atypical 4.2%, Region RWMA 3.4%, HTN 2.9%, DM 2.8%, EF-TTE 2.7%. | todo |
| 2.13 | Feature set is **43, not 55**. 12 dropped: 11 rare findings + `Diastolic Murmur` (direction clinically backwards) + `Exertional CP` (constant). `St Elevation` retained on clinical grounds. | todo |
| 2.14 | **Open decision:** do new patients persist across refresh? In-memory is fine for the demo; anything more needs backend storage. | open |

---

## 3. Prediction request lifecycle

| id | item | status |
|---|---|---|
| 3.1 | Debounce ~150ms after the last change before sending. | todo |
| 3.2 | **Inputs never lock.** A slider that stops following your thumb reads as a frozen app. Input is always live; the output catches up. | todo |
| 3.3 | Sequence number on every request; discard any reply older than the latest. This is what prevents value/result mismatch — not locking the input. | todo |
| 3.4 | Waiting state renders on the **output** (right column dims, or a thin progress line), never on the input. | todo |
| 3.5 | On any patient or field change, mark results stale **immediately**. | todo |
| 3.6 | On error: heart goes grey, message shown. **Never** leave the previous patient's colours on screen. | todo |
| 3.7 | Two predictions per request — median fill and best-case fill — to form the uncertainty range (4.3). | todo |

---

## 4. Results display

| id | item | status |
|---|---|---|
| 4.1 | Overall CAD gauge, animated count-up rather than a jump. | partial |
| 4.2 | Threshold tick marked on the gauge track. | partial |
| 4.3 | **Uncertainty band** rather than a point estimate when fields are missing: `51% ──── 73%`. Band narrows visibly as more fields are entered; collapses to a point at full data. | todo |
| 4.4 | Band labelled "range given missing data" — it is a sensitivity range over unknown inputs, **not** a statistical confidence interval. | todo |
| 4.5 | Honest line under the band: *"Missing values are assumed. Estimates from incomplete data tend to understate risk."* | todo |
| 4.6 | Three vessel rows: colour dot, name, probability, status. | partial |
| 4.7 | **Actual vs predicted reveal** after prediction for recorded patients: `Predicted 85% · Actual catheterisation: CAD ✓ agreed`. Strongest credibility moment available, and the labels are already in the spreadsheet. | todo |

---

## 5. 3D visualization

| id | item | status |
|---|---|---|
| 5.1 | Vessel colour driven by `vessels[name].color_hex` from the payload. | done |
| 5.2 | Heartbeat uses an asymmetric envelope — fast systolic squeeze, slow diastolic release, small atrial kick. Not a sine wave; the asymmetry is what reads as alive. | done |
| 5.3 | High-risk vessels pulse their emissive in time with the beat. The eye catches motion before it reads a number. | done |
| 5.4 | Colour eases toward its target over several frames, never snaps. | done |
| 5.5 | Orbit controls: drag to rotate, scroll to zoom. | done |
| 5.6 | **Vertical orbit clamped to ±80°** so the heart can never end up inverted. Prevent the confusion rather than cure it. | todo |
| 5.7 | **Reset view** button — eases back over ~600ms. Snapping is disorienting. | todo |
| 5.8 | **Fit to heart** button for when the user has zoomed into empty space. | todo |
| 5.9 | Standard anatomical views: Front / Left / Posterior. | todo |
| 5.10 | Auto-rotate pauses on user interaction and whenever callout labels are shown. | partial |
| 5.11 | **Open decision:** does the heart keep beating while a vessel is focused? Suggest slowing to ~40bpm rather than stopping — stillness reads as broken. | open |

---

## 6. Vessel inspection

| id | item | status |
|---|---|---|
| 6.1 | Hover: emissive bump, pointer cursor, small tooltip. **No camera movement** — moving the camera on hover makes the scene twitchy. | partial |
| 6.2 | Hover syncs bidirectionally with the right-column list. Hover the 3D, the row highlights; hover the row, the vessel highlights. | todo |
| 6.3 | Click: camera eases to frame that vessel over ~0.8s. | todo |
| 6.4 | Other vessels drop to ~30% opacity, heart muscle to ~15%. **The dimming matters more than the camera move** — without it you just get a closer view of the same clutter. | todo |
| 6.5 | **Globe-style callouts.** Four fixed slots around the canvas; leader lines terminate at the projected 2D screen position of an anchor on the vessel. Panels never move, lines track. This is why the reference infographics work — fixed panels, moving lines. | todo |
| 6.6 | Callout content: probability + status · what the vessel supplies anatomically · top 2 SHAP drivers **with the patient's actual values**. | todo |
| 6.7 | Leader line fades and panel dims when the anchor is occluded behind the mesh. | todo |
| 6.8 | Labels appear only in the focused state. Three permanent tags clutter the overview. | todo |
| 6.9 | Escape, or re-clicking the same vessel, returns to overview. | todo |

---

## 7. What-If simulator

| id | item | status |
|---|---|---|
| 7.1 | Sliders only for **modifiable** factors: LDL, HDL, TG, BP, FBS, Weight, PR. | todo |
| 7.2 | **Never** sliders for Age, Sex, FH, Q Wave, Region RWMA. You cannot intervene on family history; a clinician judge will spot it instantly. | todo |
| 7.3 | Baseline snapshot taken when the patient loads. | todo |
| 7.4 | Delta badge: `85% → 71%  ▼14`. Without the before-number people watch a bar move and shrug. | todo |
| 7.5 | Ghost tick on the slider track marking the patient's real value. | todo |
| 7.6 | Reset button. Without it people drag, lose the thread, and reload the page. | todo |
| 7.7 | Derived features (`BMI`, `Obesity`, any ratio) recomputed server-side on every request. | todo |
| 7.8 | Caveat line: *"Shows how the model's output changes with different inputs. It does not predict the effect of treatment."* The model learned association, not causation. | todo |
| 7.9 | **Open decision:** live update, or an explicit Apply button? Live is more impressive; explicit is safer if `/api/predict` turns out slow. Measure once it exists. | open |

---

## 8. Explanation panel

| id | item | status |
|---|---|---|
| 8.1 | **Rules engine, not an LLM.** Deterministic (same patient, same words, every demo run), no API key in a public repo, no latency, works offline, and cannot hallucinate a medical claim. | todo |
| 8.2 | Four-part structure: LEAD (overall probability + status) · DRIVERS (top 2–3 SHAP features in plain words) · MODIFIABLE (which of those can change) · CAVEAT (data completeness and model limits). | todo |
| 8.3 | **Describe the model, never prescribe care.** "LDL is the strongest modifiable factor in this model's assessment" is fine. "Consider a statin" is medical advice and a causal claim the data cannot support. | todo |
| 8.4 | Styled as part of the instrument — same palette, no chat bubble, no "AI" badge. | todo |
| 8.5 | Rules live in a readable config (JSON or table), not buried in component code. | todo |

---

## 9. Mandatory — Track A requirements

| id | requirement | where | status |
|---|---|---|---|
| 9.1 | Interactive 3D heart (Three.js / R3F) | centre canvas | done |
| 9.2 | Vessel colour from predicted probability | `color_hex` → node material | done |
| 9.3 | Rotate, zoom, **select anatomical regions** | OrbitControls + 6.3 | partial |
| 9.4 | CAD status + vessel probabilities beside the canvas | right column | partial |
| 9.5 | **Interpretable breakdown (SHAP or LIME)** | 6.6 + SHAP list | mock only |
| 9.6 | **Physiological measurements with their relative contribution** — the patient's *actual value* next to its impact (`LDL 155 mg/dL → +0.12`), not just the feature name. Distinct from 9.5; easy to miss. | SHAP rows | mock only |
| 9.7 | Clear, visible clinical disclaimer, on screen in every frame | persistent strip | done |
| 9.8 | Public GitHub repo with training scripts, backend, frontend | repo | partial |
| 9.9 | **AI coding assistant disclosure in README** | README | todo |
| 9.10 | BodyParts3D CC BY-SA 2.1 Japan attribution (meshes + derived `.glb`) | README + ATTRIBUTION + UI | todo |
| 9.11 | Trained model weights committed | `models/` | todo |
| 9.12 | Documentation PDF, max 6 pages | docs | todo |
| 9.13 | Demo video, 3–10 min, YouTube | — | todo |

---

## 10. Build order

| id | step | unlocks |
|---|---|---|
| 10.1 | FastAPI `/api/predict` returning the agreed JSON shape | everything below |
| 10.2 | Swap `mockPredict.js` for the real call — one line in `App.jsx` | pipeline is genuinely end-to-end |
| 10.3 | Empty state (§1) + patient picker + form fill (§2) | 9.4 |
| 10.4 | Real SHAP in the payload | 9.5, 9.6 |
| 10.5 | Hover, click, dim-and-focus, globe callouts (§6) | 9.3 |
| 10.6 | What-If sliders (§7) | the moment that wins the room |
| 10.7 | Uncertainty band (4.3–4.5) + completeness panel (2.10–2.12) | interpretability score |
| 10.8 | Explanation panel (§8) | |
| 10.9 | Camera controls (5.6–5.9) | |
| 10.10 | Deploy, docs, video (9.8–9.13) | |

Each step is usable on its own. Stopping after 10.3 still leaves a working demo.

---

## Layout rule

> **Left = what you change. Centre = the picture. Right = what you read.**

A doctor's desk: patient notes left, scan centre, findings right. Every new
feature has an obvious home. Note that What-If sliders live on the **left**
despite feeling like results — they are inputs, and keeping the rule clean
matters more than the association.
