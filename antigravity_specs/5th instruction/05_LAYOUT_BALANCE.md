# 05_LAYOUT_BALANCE.md — layout balance + empty state

**This file replaces an earlier version of itself.** If an agent already acted on
a version containing "S.3 — let the heart fill its new space", that step is
**cancelled and must be reverted**. See S.3 below.

Scope: sizing, spacing, and the default empty state. Do not redesign, do not
change the palette, do not move anything between columns, do not touch the gauge,
vessel rows, SHAP cards, or the colour mapping.

---

## Diagnosis

Measured at 1759px wide:

| element | height |
|---|---|
| left column card | ≈ 770px |
| heart canvas card | ≈ 630px |
| **overhang** | **≈ 140px** |

Seven sliders at ~62px each added ~430px to the left column. The canvas card has
a fixed height and did not adapt, so the left card overhangs its row — which is
also why the page background seams partway down.

**The fix is to shorten the left column, not to grow the heart.**

---

## The standing rule

> **The left column and the heart canvas are one row and must end at the same
> height.** Enforce it in the grid, never with a hardcoded pixel height.

More left-column content is queued (completeness counter, assumed-field warning,
MODIFIED badge, Reset button). A hardcoded height fixes today and breaks next
week.

---

# [x] S.0 — Remove the subtitle

Delete this line entirely:

> *"Select a curated demo patient or enter clinical values to evaluate coronary
> stenosis risk."*

The dropdown directly below it says the same thing by existing. Removing it also
reclaims ~70px from the top of the left column, which is free progress on the
overhang.

Keep the page heading above it.

---

# [x] S.1 — Compact the sliders

Each slider is ~62px. Target ~44px. Seven sliders × 18px ≈ 126px saved.

Keep her layout — label left, value right, track beneath. Only tighten:

- gap between label row and track → ~6px
- vertical margin between sliders → ~10px
- track height unchanged
- **thumb stays ≥ 20px.** It is the hit target; a smaller thumb is hard to grab
  during a live demo, and that is the moment it matters most
- label font size unchanged — do not shrink text to win pixels

The caveat line at the bottom stays at its current size. It is a required
disclosure, not padding.

---

# [x] S.2 — Two sliders side by side

Promoted from a fallback to the primary fix, at the human's direction.

Seven sliders in two columns = four rows instead of seven. Combined with S.1 this
removes roughly 250px, which more than closes the gap.

```css
.slider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}
```

**Pair them semantically**, so the grid reads as grouped rather than merely
wrapped:

| row | left | right |
|---|---|---|
| 1 | LDL cholesterol | HDL cholesterol |
| 2 | Triglycerides | Fasting blood sugar |
| 3 | Systolic BP | Pulse rate |
| 4 | Weight | *(empty)* |

Weight sits alone in the last row at **normal single-column width**. Do not
stretch it across both columns — a double-width control reads as more important
than its neighbours, and it is not.

### If labels wrap at this width

The left column is ~440px, so each cell gets ~190px. `Fasting blood sugar` plus
`130 mg/dL` may not fit on one line. In order of preference:

1. Widen the left column to ~470px. The canvas has slack, and S.5 moves the heart
   right anyway — this costs nothing visually.
2. Shorten labels, keeping units on the value: `LDL`, `HDL`, `Triglycerides`,
   `Systolic BP`, `Fasting glucose`, `Weight`, `Pulse`.
3. Only if both fail: value on its own line beneath the label.

Do not shrink the font to avoid wrapping.

**Verify:** no label wraps at 1440px or 1920px. Every thumb is still draggable.

---

# [x] S.3 — REVERT the heart scale-up

An earlier version of this file said to scale the heart into a taller canvas.
**That was wrong and the human has rejected it.** Making the heart bigger is not
how the height mismatch gets fixed.

In the latest screenshot the heart also now sits at an odd camera angle — tilted,
with the aorta pointing up-left — which is not the anatomical front view it had
before. If a camera distance, model scale, or default position was changed for
the scale-up, **put it back to what it was** and confirm against the earlier
screenshot the human supplied.

The heart's size and default camera are approved as they were. Leave them alone.

---

# [x] S.4 — Equal height via the grid

With S.0–S.2 done, the left column is now likely **shorter** than the canvas.
That is the better arrangement — the hero element sets the height. Either way,
the two must end level.

```css
.main-row {
  display: grid;
  grid-template-columns: minmax(400px, 470px) 1fr;
  gap: 24px;
  align-items: stretch;
}
```

The canvas card fills the row height. Inside it, the R3F `<Canvas>` wrapper needs
`height: 100%` **and** a parent with a resolved height.

> ⚠ A `<Canvas>` at `height: 100%` whose parent has no resolved height collapses
> to zero and renders **blank**. If the heart disappears right after this step,
> that is the cause — not a broken GLB.

Floor the canvas at `min-height: 520px` so a short viewport cannot squash it.

**Verify:** both cards end on the same line. Paste both measured heights.

---

# [x] S.5 — Nudge the heart right

The heart sits slightly left of its canvas centre. Move it right by a small
amount — start at ~20–30px and look.

Do this by shifting the **camera target or the model's x-position**, not by
adding a CSS margin to the canvas. A margin shrinks the drawing surface and
shifts the orbit centre, so dragging the heart then feels off-axis.

Pure translation. Do not change scale, distance, or rotation.

---

# [x] S.6 — Default empty state on reload

**No patient is selected on load.** The page currently opens with Patient #7
already chosen, which hides the fact that choosing a patient is the first action.

On a fresh load and on refresh:

- Dropdown reads `Select a patient` with nothing chosen
- **No prediction call fires.** Nothing is sent to `/api/predict` until a patient
  is picked or a manual entry is submitted
- **No sliders.** There is no baseline to slide against. The What-If group is
  hidden entirely, not disabled — which is also why the overhang does not exist
  in this state
- No recorded-facts line

### The heart in the empty state

- **Muted anatomical red-brown, not grey and not green.** Grey sits too close to
  green on the risk scale and reads as "low risk" rather than "not assessed" —
  the one misreading that actually matters here
- Slow auto-rotate. It is the hero while there is nothing competing with it
- A small `Not assessed` label on the canvas
- No vessel colours, no emissive pulse, no heartbeat-driven risk animation

### The right column in the empty state

`—` placeholders with a one-line hint of what will appear. Not an empty box, and
not a spinner — nothing is loading.

### Leaving the empty state

Selecting a patient, or submitting a manual entry, transitions to the loaded
state: sliders appear, vessels colour, right column fills. Picking
`Select a patient` again returns to empty, clears the colours, and fires no
request.

**Verify:** hard-refresh. No patient selected, no network call to `/api/predict`
in the Network tab, heart muted red-brown and rotating, no sliders. Then pick a
patient and confirm the full state appears.

---

# [x] S.7 — Background seam

The page background changes colour partway down while the left card continues
over it. S.0–S.4 should remove the overhang and the seam with it.

If it persists, the section wrapper has a fixed height, or the background is
painted on an inner element instead of the section. Put the background on the
element containing both columns.

**Verify:** scroll the full page at each test width. No band where the background
shifts mid-card.

---

# [x] S.8 — Floating controls

- The `70 bpm` chip and `Reset View` button have different insets from the canvas
  edge. Give both the same (~16px) so they read as one layer.
- The `Hover over the heart…` hint collides with the vessel callout panel. Move
  it to bottom-centre with a fixed inset, or fade it after a few seconds.
- The vessel callout panel overflows the canvas edge on the right. Constrain it
  inside the canvas bounds.
- In the empty state, hide the `bpm` chip — there is no patient and no heartbeat
  to report.

---

# Overflow policy for future additions

When the left column grows again:

1. Tighten spacing (S.1)
2. Let the row grow and the canvas follow (S.4 does this automatically — the
   reason to do it properly rather than hardcode)
3. Internal scroll on the **left card only**, never the canvas. The patient
   dropdown must stay pinned and visible
4. Collapse a section

**Never** shrink the heart to solve a height problem.

---

# Verification

| width | expectation |
|---|---|
| 1920px | cards level, no label wrap |
| 1440px | cards level, no horizontal page scroll |
| 1280px | may stack; if so, left column first, canvas below |

- [x] subtitle removed
- [x] sliders in 2 columns, no wrapped labels, thumbs ≥ 20px
- [x] heart scale and camera reverted to the approved view
- [x] card heights measured, within ~10px
- [x] heart still renders after the canvas height change
- [x] hard refresh → no patient, no predict call, muted heart, no sliders
- [x] Reset View and the ±80° orbit clamp still work
- [x] console clean

---

# Logging

Append to `PROGRESS_LOG.md`:

- measured heights before and after, as real numbers
- whether the left column was widened, and to what
- **confirmation that the heart scale/camera was reverted**, with what the values
  were changed back to
- which steps were unnecessary
- `NEXT AGENT STARTS AT: <task id> — <one line>`

Do not tick a box without a measurement behind it. "Looks level" is not level —
this phase exists because a 140px mismatch went unnoticed until it was pointed
out.
