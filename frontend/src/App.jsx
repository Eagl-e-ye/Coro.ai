// import { useState, useEffect, Suspense } from "react";
// import { Canvas } from "@react-three/fiber";
// import { OrbitControls } from "@react-three/drei";
// import HeartModel from "./HeartModel";
// import { mockPredict, MOCK_PATIENTS } from "./mockPredict";
// import "./App.css";

// const PATIENTS = Object.keys(MOCK_PATIENTS);

// export default function App() {
//   const [patient, setPatient] = useState(PATIENTS[0]);
//   const [prediction, setPrediction] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [hovered, setHovered] = useState(null);
//   const [selected, setSelected] = useState(null);
//   const [bpm, setBpm] = useState(72);

//   // The ONLY line that changes when the real backend lands:
//   //   const data = await fetch("/api/predict", {...}).then(r => r.json());
//   useEffect(() => {
//     let alive = true;
//     setLoading(true);
//     mockPredict(patient).then((data) => {
//       if (alive) { setPrediction(data); setLoading(false); }
//     });
//     return () => { alive = false; };
//   }, [patient]);

//   const active = selected ?? hovered;
//   const activeVessel = active ? prediction?.vessels?.[active] : null;

//   return (
//     <div className="app">
//       <aside className="panel">
//         <header>
//           <h1>Coronary Risk Viewer</h1>
//           <p className="sub">Mock prediction · 3D pipeline test</p>
//         </header>

//         <label className="field">
//           <span>Patient record</span>
//           <select value={patient} onChange={(e) => { setSelected(null); setPatient(e.target.value); }}>
//             {PATIENTS.map((p) => <option key={p} value={p}>{p}</option>)}
//           </select>
//         </label>

//         <label className="field">
//           <span>Heart rate · {bpm} bpm</span>
//           <input type="range" min="45" max="140" value={bpm}
//                  onChange={(e) => setBpm(+e.target.value)} />
//         </label>

//         {prediction && (
//           <>
//             <div className="gauge">
//               <div className="gauge-label">Overall CAD probability</div>
//               <div className="gauge-value">
//                 {(prediction.overall_cad.probability * 100).toFixed(0)}<span>%</span>
//               </div>
//               <div className="gauge-bar">
//                 <div className="gauge-fill"
//                      style={{ width: `${prediction.overall_cad.probability * 100}%` }} />
//                 <div className="gauge-tick"
//                      style={{ left: `${prediction.overall_cad.threshold_used * 100}%` }} />
//               </div>
//               <div className="gauge-status">{prediction.overall_cad.status}</div>
//             </div>

//             <div className="vessels">
//               {Object.entries(prediction.vessels).map(([name, v]) => (
//                 <button key={name}
//                         className={`vessel ${selected === name ? "is-selected" : ""}`}
//                         onMouseEnter={() => setHovered(name)}
//                         onMouseLeave={() => setHovered(null)}
//                         onClick={() => setSelected(selected === name ? null : name)}>
//                   <span className="dot" style={{ background: v.color_hex }} />
//                   <span className="vname">{name}</span>
//                   <span className="vprob">{(v.probability * 100).toFixed(0)}%</span>
//                   <span className="vstatus">{v.status}</span>
//                 </button>
//               ))}
//             </div>
//           </>
//         )}

//         {activeVessel && (
//           <div className="shap">
//             <div className="shap-head">{active} · top drivers</div>
//             {activeVessel.top_shap_features.map((f, i) => (
//               <div className="shap-row" key={i}>
//                 <span className="f">{f.feature}</span>
//                 <span className="v">{String(f.value)}</span>
//                 <span className={`i ${String(f.impact).startsWith("-") ? "neg" : "pos"}`}>
//                   {f.impact}
//                 </span>
//               </div>
//             ))}
//           </div>
//         )}

//         <p className="disclaimer">
//           Decision support and education only. Not a diagnosis and not a
//           substitute for formal diagnostic imaging.
//         </p>
//       </aside>

//       <main className="stage">
//         {loading && <div className="loading">running model…</div>}
//         <Canvas camera={{ position: [0, 0.6, 3.4], fov: 42 }}>
//           {/* Local three-point rig. Deliberately NOT drei's <Environment preset>:
//               that streams an HDRI from a CDN, so it dies on conference wifi and
//               costs frames on integrated graphics. */}
//           <hemisphereLight args={["#cfe3ff", "#2a1f1f", 0.65]} />
//           <directionalLight position={[3, 5, 2]} intensity={2.2} />
//           <directionalLight position={[-4, 1, -3]} intensity={0.7} color="#8fb5ff" />
//           <directionalLight position={[0, -3, 1]} intensity={0.35} color="#ffb3a7" />
//           <Suspense fallback={null}>
//             <HeartModel
//               prediction={prediction}
//               bpm={bpm}
//               onHover={setHovered}
//               onSelect={(n) => setSelected((s) => (s === n ? null : n))}
//               selected={selected}
//             />
//           </Suspense>
//           <OrbitControls enablePan={false} minDistance={1.6} maxDistance={7}
//                          autoRotate={!selected} autoRotateSpeed={0.5} />
//         </Canvas>
//         <div className="hint">drag to rotate · scroll to zoom · click a vessel</div>
//       </main>
//     </div>
//   );
// }
import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import HeartModel from "./HeartModel";
import { mockPredict, MOCK_PATIENTS } from "./mockPredict";
import { VESSEL_INFO, ALERT, tierOf } from "./vesselInfo";
import "./App.css";

const PATIENTS = Object.keys(MOCK_PATIENTS);

/* ---------- helpers ---------- */

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

/* ---------- risk dial ---------- */

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
      <div className="gauge-status">{overall?.status ?? "No disease selected"}</div>
      <div className="gauge-note">
        {ready
          ? `Decision threshold ${(threshold * 100).toFixed(0)}%`
          : "Select a disease above to run the model"}
      </div>
    </div>
  );
}

/* ---------- comic bubble (opens when an artery is clicked) ---------- */

function ComicBubble({ name, vessel, onClose }) {
  const info = VESSEL_INFO[name];
  if (!info) return null;

  const tier = tierOf(vessel) ?? "none";
  const pct = vessel ? Math.round(vessel.probability * 100) : null;

  return (
    <div className="comic" style={{ "--c": vessel?.color_hex ?? "#7a5cff" }} role="status">
      <div className="comic-caption">{name}: {info.feeds}</div>

      <div className="comic-bubble">
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

/* ---------- app ---------- */

export default function App() {
  const [patient, setPatient] = useState("");          // nothing selected at start
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [bpm, setBpm] = useState(72);

  // The ONLY line that changes when the real backend lands:
  //   const data = await fetch("/api/predict", {...}).then(r => r.json());
  useEffect(() => {
    if (!patient) { setPrediction(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    mockPredict(patient).then((data) => {
      if (alive) { setPrediction(data); setLoading(false); }
    });
    return () => { alive = false; };
  }, [patient]);

  // Esc closes the bubble.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = selected ?? hovered;
  const activeVessel = active ? prediction?.vessels?.[active] : null;

  const drivers = activeVessel?.top_shap_features ?? [];
  const maxImpact = Math.max(0.0001, ...drivers.map((f) => Math.abs(parseFloat(f.impact)) || 0));

  const camZ = typeof window !== "undefined" && window.innerWidth <= 900 ? 4.6 : 3.4;

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
          <p className="sub">Coronary risk viewer</p>
        </div>
      </header>

      {/* INPUT on the left, heart beside it */}
      <section className="hero">
        <div className="inputs">
          <h2>Check a patient's coronary risk</h2>
          <p className="lead">
            Choose a disease and set the heart rate. Results appear below and on the heart.
          </p>

          <div className="controls">
            <label className="field">
              <span>Disease</span>
              <select className={`select ${patient ? "" : "is-placeholder"}`} value={patient}
                      onChange={(e) => { setSelected(null); setPatient(e.target.value); }}>
                <option value="" disabled>Select disease</option>
                {PATIENTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="field-row"><span>Heart rate</span><b>{bpm} bpm</b></span>
              <input className="range" type="range" min="45" max="140" value={bpm}
                     style={{ "--fill": `${((bpm - 45) / (140 - 45)) * 100}%` }}
                     onChange={(e) => setBpm(+e.target.value)} />
            </label>
          </div>
        </div>

        <div className="heart">
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
                onSelect={(n) => setSelected((s) => (s === n ? null : n))}
                selected={selected}
              />
            </Suspense>
            <OrbitControls enablePan={false} enableZoom={false}
                           autoRotate={!selected} autoRotateSpeed={0.5} />
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
            />
          )}

          <div className="hint">
            {selected
              ? `${selected} selected. Click it again to close`
              : "Drag to rotate, click an artery to hear from it"}
          </div>
        </div>
      </section>

      {/* OUTPUT below */}
      <section className="results">
        <RiskGauge overall={prediction?.overall_cad} />

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
              Results for LAD, LCX and RCA appear here once you select a disease.
            </div>
          )}
        </div>

        {activeVessel ? (
          <div className="shap">
            <div className="shap-head">{active} <span>top drivers</span></div>
            {drivers.map((f, i) => {
              const neg = String(f.impact).startsWith("-");
              const w = ((Math.abs(parseFloat(f.impact)) || 0) / maxImpact) * 100;
              return (
                <div className="shap-row" key={i}>
                  <span className="f">{f.feature}</span>
                  <span className="v">{String(f.value)}</span>
                  <span className={`i ${neg ? "neg" : "pos"}`}>{f.impact}</span>
                  <span className="bar"><i style={{ width: `${w}%` }} /></span>
                </div>
              );
            })}
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
        Decision support and education only. Not a diagnosis and not a
        substitute for formal diagnostic imaging.
      </p>
    </div>
  );
}