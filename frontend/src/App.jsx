import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import HeartModel from "./HeartModel";
import ManualEntryModal from "./ManualEntryModal";
import { getPatients, getPatient, postPredict } from "./api";
import "./App.css";

const DEFAULT_REQUIRED = {
  Age: 58,
  Sex: "Male",
  "Typical Chest Pain": 1,
  HTN: 1,
  DM: 0,
};

<<<<<<< Updated upstream
export default function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [features, setFeatures] = useState(DEFAULT_REQUIRED);
=======
const WHAT_IF_SLIDERS = [
  { field: "LDL", label: "LDL cholesterol", unit: "mg/dL", min: 18, max: 232, defaultMedian: 100 },
  { field: "HDL", label: "HDL cholesterol", unit: "mg/dL", min: 16, max: 111, defaultMedian: 39 },
  { field: "TG", label: "Triglycerides", unit: "mg/dL", min: 37, max: 400, defaultMedian: 122 },
  { field: "FBS", label: "Fasting blood sugar", unit: "mg/dL", min: 62, max: 400, defaultMedian: 98 },
  { field: "BP", label: "Systolic BP", unit: "mmHg", min: 90, max: 190, defaultMedian: 130 },
  { field: "PR", label: "Pulse rate", unit: "bpm", min: 50, max: 110, defaultMedian: 70 },
  { field: "Weight", label: "Weight", unit: "kg", min: 48, max: 120, defaultMedian: 74, singleCol: true },
];

/* ---------- count up animation helper ---------- */
function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function riskTone(p, threshold) {
  if (p >= threshold) return "high";
  if (p >= threshold * 0.6) return "mod";
  return "low";
}

/* ---------- empty-state pulse animation ---------- */
function EmptyStatePulse() {
  return (
    <div className="empty-pulse-wrap" aria-hidden="true">
      <svg className="empty-pulse-svg" viewBox="0 0 460 100" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="ecg-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#7a5cff" stopOpacity="0" />
            <stop offset="50%" stopColor="#7a5cff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7a5cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* ECG-style path: flat → spike → flat → bump → flat */}
        <path
          className="ecg-path"
          d="M0,50 L80,50 L90,50 L95,20 L100,80 L105,50 L120,50 L130,42 L140,58 L150,50 L230,50 L310,50 L320,50 L325,20 L330,80 L335,50 L350,50 L360,42 L370,58 L380,50 L460,50"
          stroke="url(#ecg-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glow duplicate */}
        <path
          className="ecg-path ecg-glow"
          d="M0,50 L80,50 L90,50 L95,20 L100,80 L105,50 L120,50 L130,42 L140,58 L150,50 L230,50 L310,50 L320,50 L325,20 L330,80 L335,50 L350,50 L360,42 L370,58 L380,50 L460,50"
          stroke="#a07bff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.25"
        />
      </svg>
      <p className="empty-pulse-hint">Select a patient to begin assessment</p>
    </div>
  );
}

/* ---------- circular SVG risk dial ---------- */
const CX = 100, CY = 100, R = 88;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const point = (t, r) => {
  const a = Math.PI * (1 - t);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};

function RiskGauge({ overall }) {
  const ready = Boolean(overall);
  const p = overall?.probability ?? 0;
  const threshold = overall?.threshold_used ?? 0.5;
  const shown = useCountUp(p * 100);
  const tone = riskTone(p, threshold);
  const [x1, y1] = point(threshold, R - 12);
  const [x2, y2] = point(threshold, R + 12);

  return (
    <div className={`gauge ${ready ? `tone-${tone}` : "is-empty"}`}>
      <div className="gauge-label">Overall CAD probability</div>
      <div className="dial-wrap">
        <svg className="dial" viewBox="0 0 200 106" role="img"
             aria-label={ready ? `Overall CAD probability ${(p * 100).toFixed(0)} percent` : "No result yet"}>
          <path className="dial-track" d={ARC} pathLength="100" />
          <path className="dial-fill" d={ARC} pathLength="100"
                style={{ strokeDasharray: 100, strokeDashoffset: 100 - p * 100 }} />
          {ready && <line className="dial-tick" x1={x1} y1={y1} x2={x2} y2={y2} />}
        </svg>
        <div className="dial-readout">
          {ready ? <>{shown.toFixed(0)}<span>%</span></> : "–"}
        </div>
      </div>
      <div className="gauge-status">{overall?.status ?? "Select a patient to evaluate"}</div>
      <div className="gauge-note">
        {ready
          ? `Decision threshold ${(threshold * 100).toFixed(0)}%`
          : "Select a patient or enter details above"}
      </div>
    </div>
  );
}

/* ---------- comic speech bubble (anchored label) ---------- */
function ComicBubble({ name, vessel, onClose, anchor }) {
  const info = VESSEL_INFO[name];
  if (!info) return null;

  const tier = tierOf(vessel) ?? "none";
  const pct = vessel ? Math.round(vessel.probability * 100) : null;

  // Determine which quadrant the click was in and place bubble accordingly
  let posStyle = { right: 20, top: 60 };
  let corner = "tr";

  if (anchor) {
    const { x, y, w, h } = anchor;
    const NUDGE = 4; // small gap between click point and bubble edge
    const goRight = x <= w * 0.55;
    const goDown  = y <= h * 0.5;
    posStyle = {
      ...(goRight ? { left: x + NUDGE } : { right: (w - x) + NUDGE }),
      ...(goDown  ? { top:  y + NUDGE } : { bottom: (h - y) + NUDGE }),
    };
    corner = `${goDown ? "t" : "b"}${goRight ? "l" : "r"}`;
  }

  return (
    <div
      className={`comic comic--${corner}`}
      style={{ "--c": vessel?.color_hex ?? "#7a5cff", ...posStyle }}
      role="status"
    >
      {/* Glowing dot + corner bracket at the exact click point */}
      <div className={`comic-anchor comic-anchor--${corner}`} />

      <div className="comic-bubble">
        <div className="comic-caption">{name}: {info.feeds}</div>
        <button className="comic-close" onClick={onClose} aria-label="Close">×</button>
        {pct !== null && <div className="comic-badge">{pct}%</div>}

        <p className="comic-says">{info.says[tier]}</p>

        <p className="comic-label">Watch for:</p>
        <ul>{info.symptoms.map((s) => <li key={s}>{s}</li>)}</ul>

        {(tier === "high" || tier === "mod") && <p className="comic-alert">{ALERT}</p>}
      </div>
    </div>
  );
}

/* ---------- main application ---------- */
export default function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [features, setFeatures] = useState(null);
  const [baselineFeatures, setBaselineFeatures] = useState(null);
  const [actualLabels, setActualLabels] = useState(null);
  const [provenance, setProvenance] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

>>>>>>> Stashed changes
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [clickPos, setClickPos] = useState(null); // anchor for label bubble
  const [bpm, setBpm] = useState(72);
  const [isHeartHovered, setIsHeartHovered] = useState(false);

<<<<<<< Updated upstream
  const seq = useRef(0);

  // Load patients list on mount
=======
  const controlsRef = useRef(null);
  const heartRef = useRef(null);   // ref on the .heart div for coord conversion
  const debounceTimer = useRef(null);

  // Load patient list on mount (S.6: no patient selected on load)
>>>>>>> Stashed changes
  useEffect(() => {
    getPatients()
      .then((res) => {
        if (res?.patients && res.patients.length > 0) {
          setPatients(res.patients);
<<<<<<< Updated upstream
          // Pick first patient by default
          loadPatientData(res.patients[0].id);
=======
>>>>>>> Stashed changes
        }
      })
      .catch((err) => {
        setError("Could not load patients list. Make sure backend is running.");
      });
  }, []);

  async function runPredict(featsToPredict) {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await postPredict(featsToPredict);
      if (mine === seq.current) {
        setPrediction(data);
      }
    } catch (e) {
      if (mine === seq.current) {
        setError(e.message || "Prediction failed");
        setPrediction(null);
      }
    } finally {
      if (mine === seq.current) {
        setLoading(false);
      }
    }
  }

<<<<<<< Updated upstream
  async function loadPatientData(pid) {
    setSelectedPatientId(pid);
=======
  async function loadPatientRecord(val) {
    if (val === "") {
      setSelectedPatientId("");
      setFeatures(null);
      setBaselineFeatures(null);
      setActualLabels(null);
      setProvenance(null);
      setPrediction(null);
      setIsModified(false);
      setSelected(null);
      return;
    }

    if (val === "manual") {
      setIsModalOpen(true);
      return;
    }

    setSelectedPatientId(val);
    setIsModified(false);
>>>>>>> Stashed changes
    setSelected(null);
    try {
      const p = await getPatient(val);
      if (p?.features) {
        setFeatures(p.features);
<<<<<<< Updated upstream
        runPredict(p.features);
=======
        setBaselineFeatures(p.features);
        setActualLabels(p.actual || null);
        setProvenance(null);
        if (p.features.PR) setBpm(p.features.PR);
        triggerPrediction(p.features);
>>>>>>> Stashed changes
      }
    } catch (e) {
      setError(e.message || "Failed to load patient record");
    }
  }

  function handleSliderChange(field, val) {
    if (!features || !baselineFeatures) return;
    const updated = { ...features, [field]: val };
    setFeatures(updated);
<<<<<<< Updated upstream
    runPredict(updated);
=======
    if (field === "PR") setBpm(val);

    const modified = WHAT_IF_SLIDERS.some((s) => {
      const cur = updated[s.field] ?? s.defaultMedian;
      const base = baselineFeatures[s.field] ?? s.defaultMedian;
      return cur !== base;
    });
    setIsModified(modified);
    triggerPrediction(updated);
  }

  function resetSliders() {
    if (!baselineFeatures) return;
    const restored = { ...features };
    WHAT_IF_SLIDERS.forEach((s) => {
      restored[s.field] = baselineFeatures[s.field] ?? s.defaultMedian;
    });
    setFeatures(restored);
    if (baselineFeatures.PR) setBpm(baselineFeatures.PR);
    setIsModified(false);
    triggerPrediction(restored);
  }

  function handleManualSubmit(payload, prov) {
    setSelectedPatientId("manual");
    setFeatures(payload);
    setBaselineFeatures(payload);
    setActualLabels(null);
    setProvenance(prov);
    setIsModified(false);
    if (payload.PR) setBpm(payload.PR);
    setIsModalOpen(false);
    triggerPrediction(payload);
  }

  // Smooth 600ms camera reset animation
  function resetCamera() {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;

    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(0, 0.6, camZ);

    const startTarget = controls.target.clone();
    const targetLook = new THREE.Vector3(0, 0, 0);

    const startTime = performance.now();
    const duration = 600; // ms

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, targetLook, ease);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
>>>>>>> Stashed changes
  }

  const active = selected ?? hovered;
  const activeVessel = active ? prediction?.vessels?.[active] : null;

<<<<<<< Updated upstream
=======
  const drivers = activeVessel?.top_shap_features ?? [];
  const maxImpact = Math.max(0.0001, ...drivers.map((f) => Math.abs(parseFloat(f.impact)) || 0));

  const camZ = typeof window !== "undefined" && window.innerWidth <= 900 ? 4.6 : 3.4;

  const showActualReveal = selectedPatientId && !isModified && actualLabels && prediction?.overall_cad;
  const actualCath = actualLabels?.Cath;
  const predStatus = prediction?.overall_cad?.status;
  const isMatch = actualCath && (
    (actualCath === "CAD" && predStatus?.includes("High")) ||
    (actualCath === "Normal" && predStatus?.includes("Low"))
  );

>>>>>>> Stashed changes
  return (
    <div className="app">
      <aside className="panel">
        <header>
          <h1>Coronary Risk Viewer</h1>
          <p className="sub">FastAPI Backend · 3D Heart Visualizer</p>
        </header>

        {error && <div className="error-banner">{error}</div>}

<<<<<<< Updated upstream
        <label className="field">
          <span>Select Patient Dataset Record</span>
          <select
            value={selectedPatientId}
            onChange={(e) => loadPatientData(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                Patient #{p.id} ({p.age}y, {p.sex})
              </option>
            ))}
          </select>
        </label>

        {/* Input Form for required/key features */}
        <div className="form-grid">
          <div className="form-label full-width">Required Patient Inputs</div>

          <label className="field">
            <span>Age</span>
            <input
              type="number"
              value={features.Age ?? 58}
              onChange={(e) => handleFeatureChange("Age", parseInt(e.target.value) || 0)}
=======
      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleManualSubmit}
      />

      <section className="hero">
        <div className="inputs">
          <h2>Check a patient's coronary risk</h2>

          <div className="controls">
            <label className="field">
              <span>Patient record</span>
              <select
                className="select"
                value={selectedPatientId}
                onChange={(e) => loadPatientRecord(e.target.value)}
              >
                <option value="">Select a patient...</option>
                <option value="manual">+ Add patient details (Manual Entry)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    Patient #{p.id} · {p.age}y · {p.sex === "Fmale" ? "Female" : p.sex}
                  </option>
                ))}
              </select>
            </label>

            {/* Read-Only Patient Summary Card (R.1) - Rendered only when patient is loaded */}
            {features && (
              <div className="patient-summary-card">
                <div className="summary-line">
                  <span><b>{features.Age ?? 58}y</b></span> · <span><b>{features.Sex === "Fmale" ? "Female" : (features.Sex || "Male")}</b></span> · <span>{features["Typical Chest Pain"] ? "Typical chest pain" : "No typical chest pain"}</span> · <span>{features.HTN ? "HTN" : "No HTN"}</span> · <span>{features.DM ? "DM" : "No DM"}</span>
                </div>
                {provenance ? (
                  <div className="provenance-tag">
                    {provenance.enteredCount} entered · {provenance.assumedCount} assumed
                  </div>
                ) : (
                  <div className="provenance-tag">Recorded patient facts</div>
                )}
              </div>
            )}

            {/* What-If Intervention Sliders (R.2 & S.2 2-column grid) - Rendered only when patient is loaded */}
            {features && baselineFeatures && (
              <div className="what-if-card">
                <div className="what-if-header">
                  <div className="what-if-title">
                    <span>What-If Intervention Sliders</span>
                    {isModified && <span className="modified-tag">MODIFIED</span>}
                  </div>
                  {isModified && (
                    <button className="btn-reset-sliders" onClick={resetSliders}>
                      Reset Sliders
                    </button>
                  )}
                </div>

                <div className="sliders-grid">
                  {WHAT_IF_SLIDERS.map((s) => {
                    const currentVal = features[s.field] ?? s.defaultMedian;
                    const baselineVal = baselineFeatures[s.field] ?? s.defaultMedian;
                    const pct = Math.max(0, Math.min(100, ((currentVal - s.min) / (s.max - s.min)) * 100));
                    const ghostPct = Math.max(0, Math.min(100, ((baselineVal - s.min) / (s.max - s.min)) * 100));

                    return (
                      <label key={s.field} className={`slider-field ${s.singleCol ? "single-col" : ""}`}>
                        <div className="slider-row">
                          <span className="slider-label">{s.label}</span>
                          <span className="slider-val">
                            <b>{currentVal}</b> {s.unit}
                            {currentVal !== baselineVal && (
                              <span className="baseline-diff"> (was {baselineVal})</span>
                            )}
                          </span>
                        </div>
                        <div className="slider-track-wrap">
                          <input
                            type="range"
                            className="range"
                            min={s.min}
                            max={s.max}
                            value={currentVal}
                            style={{ "--fill": `${pct}%` }}
                            onChange={(e) => handleSliderChange(s.field, Number(e.target.value))}
                          />
                          <div
                            className="ghost-tick"
                            style={{ left: `${ghostPct}%` }}
                            title={`Baseline: ${baselineVal} ${s.unit}`}
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>

                <p className="caveat-text">
                  Shows how the model's output changes with different inputs. It does not predict the effect of treatment.
                </p>
              </div>
            )}
          </div>

          {/* Empty state animation — shown only when no patient is loaded */}
          {!features && <EmptyStatePulse />}
        </div>

        <div className="heart" ref={heartRef}>
          <button className="btn-reset-cam" onClick={resetCamera}>Reset View</button>
          <Canvas camera={{ position: [0, 0.6, camZ], fov: 42 }}>
            <hemisphereLight args={["#ffffff", "#7a5cff", 0.45]} />
            <directionalLight position={[3, 5, 2]} intensity={2.6} />
            <directionalLight position={[-4, 1, -3]} intensity={1.6} color="#b8a4ff" />
            <directionalLight position={[0, -3, 1]} intensity={0.7} color="#ff9fc0" />
            <Suspense fallback={null}>
              <HeartModel
                prediction={prediction}
                bpm={bpm}
                onHover={setHovered}
                onSelect={(n, cx, cy) => {
                  setSelected((s) => (s === n ? null : n));
                  if (heartRef.current && cx != null) {
                    const rect = heartRef.current.getBoundingClientRect();
                    setClickPos({ x: cx - rect.left, y: cy - rect.top, w: rect.width, h: rect.height });
                  }
                }}
                selected={selected}
                onHeartHover={setIsHeartHovered}
              />
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableZoom={isHeartHovered}
              minDistance={1.6}
              maxDistance={7}
              maxPolarAngle={Math.PI / 2 + 0.5}
              minPolarAngle={Math.PI / 2 - 0.5}
              autoRotate={!selected}
              autoRotateSpeed={0.5}
>>>>>>> Stashed changes
            />
          </label>

          <label className="field">
            <span>Sex</span>
            <select
              value={features.Sex ?? "Male"}
              onChange={(e) => handleFeatureChange("Sex", e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Fmale">Female</option>
            </select>
          </label>

          <div className="full-width checkbox-field">
            <input
              type="checkbox"
              id="tcp"
              checked={Boolean(features["Typical Chest Pain"])}
              onChange={(e) => handleFeatureChange("Typical Chest Pain", e.target.checked ? 1 : 0)}
            />
            <label htmlFor="tcp">Typical Chest Pain</label>
          </div>

<<<<<<< Updated upstream
          <div className="checkbox-field">
            <input
              type="checkbox"
              id="htn"
              checked={Boolean(features.HTN)}
              onChange={(e) => handleFeatureChange("HTN", e.target.checked ? 1 : 0)}
=======
          {selected && (
            <ComicBubble
              key={selected}
              name={selected}
              vessel={prediction?.vessels?.[selected]}
              onClose={() => setSelected(null)}
              anchor={clickPos}
>>>>>>> Stashed changes
            />
            <label htmlFor="htn">HTN</label>
          </div>

<<<<<<< Updated upstream
          <div className="checkbox-field">
            <input
              type="checkbox"
              id="dm"
              checked={Boolean(features.DM)}
              onChange={(e) => handleFeatureChange("DM", e.target.checked ? 1 : 0)}
            />
            <label htmlFor="dm">DM</label>
=======
          <div className="hint">
            {selected
              ? `${selected} selected. Click it again to close`
              : "Hover over the heart to zoom/rotate, click an artery to inspect details"}
>>>>>>> Stashed changes
          </div>
        </div>

        <label className="field">
          <span>Heart rate · {bpm} bpm</span>
          <input
            type="range"
            min="45"
            max="140"
            value={bpm}
            onChange={(e) => setBpm(+e.target.value)}
          />
        </label>

        {/* Results Container with Dimming */}
        <div className={`results-section ${loading ? "dimmed" : ""}`}>
          {prediction?.meta?.assumed_important && prediction.meta.assumed_important.length > 0 && (
            <div className="meta-warning">
              ⚡ Assumed defaults with high weight: {prediction.meta.assumed_important.join(", ")}
            </div>
          )}

          {prediction && (
            <>
              <div className="gauge">
                <div className="gauge-label">Overall CAD probability</div>
                <div className="gauge-value">
                  {(prediction.overall_cad.probability * 100).toFixed(0)}
                  <span>%</span>
                </div>
                <div className="gauge-bar">
                  <div
                    className="gauge-fill"
                    style={{ width: `${prediction.overall_cad.probability * 100}%` }}
                  />
                  <div
                    className="gauge-tick"
                    style={{ left: `${prediction.overall_cad.threshold_used * 100}%` }}
                  />
                </div>
                <div className="gauge-status">{prediction.overall_cad.status}</div>
              </div>

              <div className="vessels">
                {Object.entries(prediction.vessels).map(([name, v]) => (
                  <button
                    key={name}
                    className={`vessel ${selected === name ? "is-selected" : ""}`}
                    onMouseEnter={() => setHovered(name)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(selected === name ? null : name)}
                  >
                    <span className="dot" style={{ background: v.color_hex }} />
                    <span className="vname">{name}</span>
                    <span className="vprob">{(v.probability * 100).toFixed(0)}%</span>
                    <span className="vstatus">{v.status}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeVessel && (
            <div className="shap">
              <div className="shap-head">{active} · top drivers</div>
              {activeVessel.top_shap_features && activeVessel.top_shap_features.length > 0 ? (
                activeVessel.top_shap_features.map((f, i) => (
                  <div className="shap-row" key={i}>
                    <span className="f">{f.feature}</span>
                    <span className="v">{String(f.value)}</span>
                    <span
                      className={`i ${String(f.impact).startsWith("-") ? "neg" : "pos"}`}
                    >
                      {f.impact}
                    </span>
                  </div>
                ))
              ) : (
                <div className="shap-empty">Explanations (SHAP) loading / unavailable</div>
              )}
            </div>
          )}
        </div>

        <p className="disclaimer">
          Decision support and education only. Not a diagnosis and not a substitute for formal diagnostic imaging.
        </p>
      </aside>

      <main className="stage">
        {loading && <div className="loading">running model…</div>}
        <Canvas camera={{ position: [0, 0.6, 3.4], fov: 42 }}>
          <hemisphereLight args={["#cfe3ff", "#2a1f1f", 0.65]} />
          <directionalLight position={[3, 5, 2]} intensity={2.2} />
          <directionalLight position={[-4, 1, -3]} intensity={0.7} color="#8fb5ff" />
          <directionalLight position={[0, -3, 1]} intensity={0.35} color="#ffb3a7" />
          <Suspense fallback={null}>
            <HeartModel
              prediction={prediction}
              bpm={bpm}
              onHover={setHovered}
              onSelect={(n) => setSelected((s) => (s === n ? null : n))}
              selected={selected}
            />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={1.6}
            maxDistance={7}
            autoRotate={!selected}
            autoRotateSpeed={0.5}
          />
        </Canvas>
        <div className="hint">drag to rotate · scroll to zoom · click a vessel</div>
      </main>
    </div>
  );
}
