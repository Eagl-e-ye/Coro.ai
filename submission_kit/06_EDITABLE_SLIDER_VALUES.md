# 06_EDITABLE_SLIDER_VALUES.md — make the slider readouts typeable

The two-column slider layout (05) is approved and stays exactly as it is. This
file changes one thing: the number above each track becomes an editable input, so
a value can be typed as well as dragged.

**Scope: the seven What-If sliders only.** Do not change the track, the labels,
the pairing, the caveat line, the card, or anything outside this component.

---

## Why this is fiddly

A number that is both driven by a slider and typed into has a conflict: the
slider wants to own the value continuously, and the keyboard needs the value to
be temporarily invalid while someone types.

Typing `121` into a field with `min=18` passes through `1`, which is below the
minimum. If the component clamps on every keystroke, `1` becomes `18` and the
user ends up with `18121` or an input that fights them. Clearing the field to
start fresh produces `""`, which parses to `NaN`.

**The rule that avoids all of it:** while the input is focused, it holds a
*string draft* that is not validated. Validation and clamping happen on commit,
not on keystroke.

---

# [ ] T.1 — The component

Build one `NumberSliderField` and use it for all seven. Do not write seven
variants.

```jsx
function NumberSliderField({
  label, unit, value, min, max, step, baseline, onCommit,
}) {
  const [draft, setDraft] = useState(null);        // string while focused, else null
  const shown = draft ?? String(value);

  function commit(raw) {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) { setDraft(null); return; }   // revert to last good
    onCommit(Math.min(max, Math.max(min, n)));          // clamp only here
    setDraft(null);
  }

  return (
    <div className="nsf">
      <div className="nsf-row">
        <label htmlFor={`nsf-${label}`}>{label}</label>
        <span className="nsf-value">
          <input
            id={`nsf-${label}`}
            type="number"
            value={shown}
            min={min} max={max} step={step}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { commit(e.currentTarget.value); e.currentTarget.blur(); }
              if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
            }}
          />
          <span className="nsf-unit">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onCommit(parseFloat(e.target.value))}
      />
    </div>
  );
}
```

Key points, all of which matter:

- **`draft` is a string, not a number.** Half-typed input is not a number yet.
- **`draft ?? String(value)`** — when not focused the input follows the slider;
  when focused it follows the keyboard. One field, two owners, no conflict.
- **Clamping happens only in `commit`.** Never on change.
- **`NaN` reverts to the last good value** rather than writing zero. An empty
  field becoming `0` would send a real prediction for a patient with zero LDL.
- **Escape cancels** the edit and restores the committed value.
- **The unit is a sibling `<span>`, never inside the input.** Putting `mg/dL` in
  the editable text means parsing it back out, which is how `121 mg/dL` becomes
  `121` on a good day and `NaN` on a bad one.

---

# [ ] T.2 — Do not overwrite a focused input

When a prediction returns, the parent re-renders. If that write reaches a focused
input, whatever is half-typed is destroyed mid-keystroke.

The `draft ?? String(value)` pattern above already prevents this — while focused,
`draft` wins and the incoming `value` is ignored. **Do not "fix" this later by
syncing `draft` from `value` in an effect.** That reintroduces the bug.

**Verify:** start typing in LDL, and while still typing, let a prediction come
back from a previous change. The typed text must survive untouched.

---

# [ ] T.3 — When to fire a prediction

Dragging and typing are different interactions and must not share a trigger.

| action | fires |
|---|---|
| slider drag | debounce ~150ms after the last movement (unchanged) |
| arrow keys on the slider | same debounce |
| **Enter in the input** | immediately |
| **blur the input** | immediately |
| **typing, paused** | after ~700ms **only if the parsed value is already in range** |

That last row is what makes typing feel live without firing on garbage. Typing
`121` into LDL pauses at `1` — below `min=18`, so nothing fires — then commits
once `121` is complete. Typing `50` when `500` was intended does fire at `50`,
which is harmless: it is an exploration tool, and the next keystroke supersedes
it.

All of these go through the same abort + sequence guard as the sliders (task
J.1). A typed commit must cancel an in-flight slider request exactly like a drag
does.

**Verify:** type a new LDL value and watch the Network tab. One request, not one
per keystroke.

---

# [ ] T.4 — Range, and the trap in it

The TG slider is capped at **400** for usability, but the dataset contains
patients with TG up to **1050**. The moment the number is typeable, this becomes
a real problem — and it is already a latent one for any recorded patient whose
value is above the track.

**Clamping a loaded patient's value to the slider range is not acceptable.** It
silently alters the record, moves the baseline, and produces a prediction for a
patient who does not exist.

**Rule: the track adapts to contain the patient's real value.**

```js
const trackMin = Math.min(RANGE[field].min, patientValue);
const trackMax = Math.max(RANGE[field].max, patientValue);
```

A patient with TG 1050 gets a 37–1050 track. Everyone else keeps the comfortable
37–400 one. No clamping of real data, no thumb pinned off the end, no special
case to explain.

Recompute whenever the patient changes. Reset returns to the patient's value, so
the track stays valid.

Base ranges, unchanged from `04_INPUT_REBUILD.md`:

| field | min | max | step |
|---|---|---|---|
| LDL | 18 | 232 | 1 |
| HDL | 16 | 111 | 0.1 |
| TG | 37 | 400 | 1 |
| BP | 90 | 190 | 1 |
| FBS | 62 | 400 | 1 |
| Weight | 48 | 120 | 0.5 |
| PR | 50 | 110 | 1 |

`step` matters: HDL carries one decimal in the dataset (39.0, 15.9), and an
integer step would quietly round every HDL value on first interaction.

---

# [ ] T.5 — Styling

The number currently renders as bold text with a lighter unit beside it. **Keep
exactly that appearance when the field is not focused.** An input that looks like
an input adds seven boxes to a card that is currently clean.

- Default: no border, no background, transparent, inherits the bold weight and
  current size, right-aligned, width sized to content (~5ch) so the unit does not
  shift as digits change
- Hover: a faint underline or background tint — the only hint that it is editable
- Focus: her standard input treatment (border/ring), matching the rest of the form
- Hide the native spinner, which is inconsistent across browsers and visually
  heavy at this size:

```css
.nsf-value input::-webkit-outer-spin-button,
.nsf-value input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.nsf-value input[type=number] { -moz-appearance: textfield; }
```

Arrow-key stepping still works with the spinner hidden — that is why
`type="number"` is used rather than a text input.

Keep the whole field at the ~44px height from 05. This must not reopen the layout
work.

---

# [ ] T.6 — Interaction with existing behaviour

- **Ghost tick** stays at the patient's recorded value. A typed value moves the
  thumb, never the tick.
- **MODIFIED badge** behaves identically whether the change came from a drag or
  the keyboard — it is about the value differing from baseline, not how it got
  there.
- **Reset** restores every field to its ghost tick, clears any draft, and clears
  the badge.
- **Empty state** (no patient selected): the whole slider group is hidden, so
  there is nothing to type into. Unchanged.
- **Weight** still drives BMI and Obesity **server-side**. A typed weight must
  send `Weight` and let the backend recompute. Never compute BMI client-side.

---

# [ ] T.7 — Reuse in the manual entry dialog

The dialog from `04_INPUT_REBUILD.md` R.3 has ~25 numeric fields. Use this same
component there for any field with a sensible range, minus the slider track where
a track adds nothing (lab values like Na, K, PLT).

Extract the input half so both share validation, clamping and parsing. Two
implementations of "parse a clinical number" will diverge, and the one in the
dialog is the one that feeds the model.

---

# Verification

- [ ] type `121` into LDL from empty — no fighting, no premature clamp, commits once
- [ ] clear a field entirely and blur — reverts to the last good value, not `0`
- [ ] type letters — rejected, reverts on blur
- [ ] type `9999` into LDL — clamps to 232 on commit
- [ ] Escape restores the previous value
- [ ] Enter commits and blurs
- [ ] type while a previous prediction returns — typed text survives
- [ ] drag a slider — number follows live
- [ ] HDL accepts `38.5` and does not round to `38`
- [ ] load a patient with TG > 400 (find one in the dataset) — track extends, the
      value is untouched, the ghost tick is on the track
- [ ] one network request per committed change, not one per keystroke
- [ ] field height unchanged at ~44px; layout still balanced
- [ ] console clean

---

# Logging

Append to `PROGRESS_LOG.md`:

- the component's file path, so the next agent reuses it instead of rebuilding
- the TG > 400 patient id used for the adaptive-range test, with the result
- whether T.7 reuse was done or deferred
- `NEXT AGENT STARTS AT: <task id> — <one line>`
