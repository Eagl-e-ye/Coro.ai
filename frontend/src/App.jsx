import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import HeartModel from "./HeartModel";
import ManualEntryModal from "./ManualEntryModal";
import NumberSliderField from "./NumberSliderField";
import { getPatients, getPatient, postPredict } from "./api";
import { adaptPrediction } from "./adaptPrediction";
import { VESSEL_INFO, SYMPTOM_HEADING, ALERT, tierOf } from "./vesselInfo";
import HistoryDrawer from "./history/HistoryDrawer";
import { useHistory } from "./history/historyStore";
import ReportView from "./report/ReportView";
import { buildReport } from "./report/buildReport";
import { stamp } from "./report/utils";
import "./App.css";

const DEFAULT_REQUIRED = {
  Age: 58,
  Sex: "Male",
  "Typical Chest Pain": 1,
  HTN: 1,
  DM: 0,
};

const WHAT_IF_SLIDERS = [
  { field: "LDL", label: "LDL cholesterol", unit: "mg/dL", min: 18, max: 232, step: 1, defaultMedian: 100 },
  { field: "HDL", label: "HDL cholesterol", unit: "mg/dL", min: 16, max: 111, step: 0.1, defaultMedian: 39 },
  { field: "TG", label: "Triglycerides", unit: "mg/dL", min: 37, max: 400, step: 1, defaultMedian: 122 },
  { field: "FBS", label: "Fasting blood sugar", unit: "mg/dL", min: 62, max: 400, step: 1, defaultMedian: 98 },
  { field: "BP", label: "Systolic BP", unit: "mmHg", min: 90, max: 190, step: 1, defaultMedian: 130 },
  { field: "PR", label: "Pulse rate", unit: "bpm", min: 50, max: 110, step: 1, defaultMedian: 70 },
  { field: "Weight", label: "Weight", unit: "kg", min: 48, max: 120, step: 0.5, defaultMedian: 74, singleCol: true },
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
    const goDown = y <= h * 0.5;
    posStyle = {
      ...(goRight ? { left: x + NUDGE } : { right: (w - x) + NUDGE }),
      ...(goDown ? { top: y + NUDGE } : { bottom: (h - y) + NUDGE }),
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

        <p className="comic-label">{SYMPTOM_HEADING}</p>
        <ul>{info.symptoms.map((s) => <li key={s}>{s}</li>)}</ul>

        {(tier === "high" || tier === "mod") && <p className="comic-alert">{ALERT}</p>}
      </div>
    </div>
  );
}

/* ---------- 3D heart snapshot bridge (07_PATIENT_REPORT.md U.4) ---------- */
function SnapshotBridge({ apiRef, backdrop = "#1d1440" }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    apiRef.current = {
      capture: () => {
        const src = gl.domElement;
        if (!src.width || !src.height) return null;
        gl.render(scene, camera);
        const out = document.createElement("canvas");
        out.width = src.width;
        out.height = src.height;
        const ctx = out.getContext("2d");
        ctx.fillStyle = backdrop;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(src, 0, 0);
        return out.toDataURL("image/jpeg", 0.9);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [gl, scene, camera, apiRef, backdrop]);
  return null;
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

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [clickPos, setClickPos] = useState(null); // anchor for label bubble
  const [bpm, setBpm] = useState(72);
  const [isHeartHovered, setIsHeartHovered] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [reportData, setReportData] = useState(null);
  const { snapshots, addSnapshot } = useHistory();
  const snapshotRef = useRef(null);

  const controlsRef = useRef(null);
  const heartRef = useRef(null);   // ref on the .heart div for coord conversion
  const debounceTimer = useRef(null);

  // Load patient list on mount (select 5 random patients by default)
  useEffect(() => {
    getPatients()
      .then((res) => {
        if (res?.patients && res.patients.length > 0) {
          const shuffled = [...res.patients].sort(() => 0.5 - Math.random());
          setPatients(shuffled.slice(0, 5));
        }
      })
      .catch(() => {
        setError("Could not reach backend API. Make sure FastAPI is running on port 8000.");
      });
  }, []);

  // Esc key closes speech bubble
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced prediction runner
  function triggerPrediction(featsToPredict) {
    setIsStale(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rawRes = await postPredict(featsToPredict);
        if (rawRes) {
          const adapted = adaptPrediction(rawRes);
          setPrediction(adapted);
          setIsStale(false);
        }
      } catch (err) {
        setError(err.message || "Prediction request failed");
        setPrediction(null);
      } finally {
        setLoading(false);
      }
    }, 150);
  }

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
    setSelected(null);
    try {
      const p = await getPatient(val);
      if (p?.features) {
        setFeatures(p.features);
        setBaselineFeatures(p.features);
        setActualLabels(p.actual || null);
        setProvenance(null);
        if (p.features.PR) setBpm(p.features.PR);
        triggerPrediction(p.features);
      }
    } catch (err) {
      setError(err.message || "Failed to load patient record");
    }
  }

  function handleSliderChange(field, val) {
    if (!features || !baselineFeatures) return;
    const updated = { ...features, [field]: val };
    setFeatures(updated);
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
  }

  function handleSaveSnapshot() {
    if (!prediction || loading || isStale) return;

    const enteredInputs = {};
    if (features) {
      Object.entries(features).forEach(([k, val]) => {
        if (val !== null && val !== undefined) {
          enteredInputs[k] = val;
        }
      });
    }

    const patientRef = selectedPatientId === "manual"
      ? "Manual entry"
      : selectedPatientId ? `Patient #${selectedPatientId}` : "Patient";

    addSnapshot({
      patientRef,
      mode: selectedPatientId === "manual" ? "manual" : "recorded",
      whatIf: Boolean(isModified),
      inputs: enteredInputs,
      result: {
        overall: {
          p: prediction.overall_cad?.probability ?? 0,
          threshold: prediction.overall_cad?.threshold_used ?? 0.48,
        },
        LAD: {
          p: prediction.vessels?.LAD?.probability ?? 0,
          threshold: prediction.vessels?.LAD?.threshold_used ?? 0.40,
        },
        LCX: {
          p: prediction.vessels?.LCX?.probability ?? 0,
          threshold: prediction.vessels?.LCX?.threshold_used ?? 0.32,
        },
        RCA: {
          p: prediction.vessels?.RCA?.probability ?? 0,
          threshold: prediction.vessels?.RCA?.threshold_used ?? 0.30,
        },
      },
    });

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  }

  function handleGenerateReport() {
    if (!prediction || loading || isStale) return;
    let heartImg = null;
    try {
      heartImg = snapshotRef.current?.capture?.() ?? null;
    } catch {
      // report prints cleanly without picture
    }
    const reportObj = buildReport({
      selectedPatientId,
      features,
      baselineFeatures,
      actualLabels,
      prediction,
      isModified,
    });
    setReportData({ ...reportObj, heartImg });
  }

  // Print-to-PDF trigger (U.2)
  useEffect(() => {
    if (!reportData) return;
    const prevTitle = document.title;
    document.title = `coro-report-${reportData.patientRef.replace(/\s+/g, "-")}-${stamp(reportData.generatedAt)}`;
    const done = () => setReportData(null);
    window.addEventListener("afterprint", done, { once: true });
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", done);
      document.title = prevTitle;
    };
  }, [reportData]);

  const active = selected ?? hovered;
  const activeVessel = active ? prediction?.vessels?.[active] : null;

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

  const reportHelperText = !prediction
    ? "Nothing selected yet"
    : isStale || loading
    ? "Updating…"
    : error
    ? "Result unavailable"
    : "Opens your print dialog — choose Save as PDF";

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h5l2.5-6 4 12 2.5-6H22" />
          </svg>
        </div>
        <div>
          <h1>Coro.ai</h1>
          <p className="sub">Cardiovascular Risk Visualizer</p>
        </div>
        <div className="topbar-actions">
          <button
            className="btn-snapshot-topbar"
            disabled={!prediction || loading || isStale}
            onClick={handleSaveSnapshot}
            title={!prediction ? "Select a patient to save snapshot" : "Save current model outputs as a snapshot"}
          >
            {saveFeedback ? "✓ Saved" : "Save Snapshot"}
          </button>
          <button
            className="btn-report-topbar"
            disabled={!prediction || loading || isStale}
            onClick={handleGenerateReport}
            title={reportHelperText}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Export PDF Report
          </button>
          <button
            className="btn-history-topbar"
            onClick={() => setIsHistoryOpen(true)}
            title="View saved snapshots"
          >
            Saved Snapshots ({snapshots.length})
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

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

                    return (
                      <NumberSliderField
                        key={s.field}
                        label={s.label}
                        unit={s.unit}
                        value={currentVal}
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        baselineVal={baselineVal}
                        singleCol={s.singleCol}
                        onCommit={(val) => handleSliderChange(s.field, val)}
                      />
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
            <SnapshotBridge apiRef={snapshotRef} />
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
            />
          </Canvas>

          {loading && <div className="loading">Running model</div>}

          <div className="hud" aria-label={`Heart rate ${bpm} beats per minute`}>
            <span className="beat" style={{ animationDuration: `${60 / bpm}s` }} />
            <span><b>{bpm}</b> bpm</span>
          </div>

          {selected && (
            <ComicBubble
              key={selected}
              name={selected}
              vessel={prediction?.vessels?.[selected]}
              onClose={() => setSelected(null)}
              anchor={clickPos}
            />
          )}

          <div className="hint">
            {selected
              ? `${selected} selected. Click it again to close`
              : "Hover over the heart to zoom/rotate, click an artery to inspect details"}
          </div>
        </div>
      </section>

      {/* OUTPUT below */}
      <section className={`results ${isStale || loading ? "is-stale" : ""}`}>
        <div>
          <RiskGauge overall={prediction?.overall_cad} />

          {showActualReveal && (
            <div className={`actual-reveal ${isMatch ? "match" : "diff"}`}>
              Actual Catheterisation: {actualCath} {isMatch ? "✓ (Agreed with Model)" : "⚠️ (Model Disagreed)"}
            </div>
          )}

          {prediction?.meta && (
            <div className="provenance-bar">
              <span>{prediction.meta.entered_count} entered · {prediction.meta.assumed_count} assumed</span>
              <span>Model v{prediction.meta.model_version}</span>
            </div>
          )}

          {prediction?.meta?.assumed_important && prediction.meta.assumed_important.length > 0 && (
            <div className="assumed-warning">
              ⚡ Assumed defaults with high model weight: {prediction.meta.assumed_important.join(", ")}
            </div>
          )}
        </div>

        <div className="vessels">
          {prediction ? (
            Object.entries(prediction.vessels).map(([name, v]) => (
              <button key={name}
                className={`vessel ${selected === name ? "is-selected" : ""}`}
                style={{ "--c": v.color_hex, "--p": `${v.probability * 100}%` }}
                aria-pressed={selected === name}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(name)}
                onBlur={() => setHovered(null)}
                onClick={() => setSelected(selected === name ? null : name)}>
                <span className="vessel-head">
                  <span className="dot" />
                  <span className="vname">{name}</span>
                  <span className="vstatus">{v.status}</span>
                  <span className="vprob">{(v.probability * 100).toFixed(0)}<small>%</small></span>
                </span>
                <span className="vbar"><i /></span>
              </button>
            ))
          ) : (
            <div className="shap shap-empty">
              Results for LAD, LCX and RCA appear here once you select a patient.
            </div>
          )}
        </div>

        {activeVessel ? (
          <div className="shap">
            <div className="shap-head">{active} <span>top drivers</span></div>
            <div className="shap-legend">
              Red pushes risk up · green pushes risk down · bar length shows how much
            </div>
            {drivers.length > 0 ? (
              drivers.map((f, i) => {
                const impactVal = parseFloat(f.impact) || 0;
                const neg = impactVal < 0 || String(f.impact).startsWith("-");
                const w = Math.min(100, ((Math.abs(impactVal)) / maxImpact) * 100);
                const displayVal =
                  f.value === 1 && ["Typical Chest Pain", "HTN", "DM", "Current Smoker", "FH", "Atypical"].includes(f.feature)
                    ? "Present"
                    : f.value === 0 && ["Typical Chest Pain", "HTN", "DM", "Current Smoker", "FH", "Atypical"].includes(f.feature)
                    ? "Absent"
                    : String(f.value);
                return (
                  <div className="shap-row" key={i}>
                    <span className="f">{f.feature}</span>
                    <span className="v">{displayVal}</span>
                    <span className={`i ${neg ? "neg" : "pos"}`}>{f.impact}</span>
                    <div className="shap-bar-track">
                      <div className="shap-bar-zero" />
                      <div
                        className={`shap-bar-fill ${neg ? "neg" : "pos"}`}
                        style={neg ? { right: "50%", width: `${w / 2}%` } : { left: "50%", width: `${w / 2}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="shap-empty">Explanations (SHAP) loading / unavailable</div>
            )}
          </div>
        ) : (
          <div className="shap shap-empty">
            {prediction
              ? "Select a vessel to see which factors push its risk up or down."
              : "The factors behind each vessel's risk will show here."}
          </div>
        )}
      </section>

      <p className="disclaimer">
        Research prototype. Decision support and education only. Not a medical device or diagnosis.
      </p>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {reportData &&
        typeof document !== "undefined" &&
        document.getElementById("report-root") &&
        createPortal(
          <ReportView report={reportData} />,
          document.getElementById("report-root")
        )}
    </div>
  );
}