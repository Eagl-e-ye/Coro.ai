import { useState } from "react";

export default function NumberSliderField({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  baselineVal,
  onCommit,
  singleCol = false,
}) {
  const [draft, setDraft] = useState(null); // string draft while focused, else null

  const curVal = value ?? min;
  const shown = draft ?? String(curVal);

  // Adapt track bounds if patient value exceeds standard defaults (e.g. TG > 400)
  const trackMin = Math.min(min, curVal, baselineVal ?? min);
  const trackMax = Math.max(max, curVal, baselineVal ?? max);

  const pct = Math.max(0, Math.min(100, ((curVal - trackMin) / (trackMax - trackMin || 1)) * 100));
  const ghostPct =
    baselineVal != null
      ? Math.max(0, Math.min(100, ((baselineVal - trackMin) / (trackMax - trackMin || 1)) * 100))
      : pct;

  function commit(raw) {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) {
      setDraft(null);
      return;
    }
    const clamped = Math.min(trackMax, Math.max(trackMin, n));
    onCommit(clamped);
    setDraft(null);
  }

  return (
    <label className={`slider-field ${singleCol ? "single-col" : ""}`}>
      <div className="slider-row">
        <span className="slider-label">{label}</span>
        <span className="slider-val">
          <input
            type="number"
            className="editable-num-input"
            value={shown}
            min={trackMin}
            max={trackMax}
            step={step}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(e.currentTarget.value);
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setDraft(null);
                e.currentTarget.blur();
              }
            }}
          />
          <span className="nsf-unit">{unit}</span>
          {baselineVal != null && curVal !== baselineVal && (
            <span className="baseline-diff"> (was {baselineVal})</span>
          )}
        </span>
      </div>
      <div className="slider-track-wrap">
        <input
          type="range"
          className="range"
          min={trackMin}
          max={trackMax}
          step={step}
          value={curVal}
          style={{ "--fill": `${pct}%` }}
          onChange={(e) => onCommit(parseFloat(e.target.value))}
        />
        {baselineVal != null && (
          <div
            className="ghost-tick"
            style={{ left: `${ghostPct}%` }}
            title={`Baseline: ${baselineVal} ${unit}`}
          />
        )}
      </div>
    </label>
  );
}
