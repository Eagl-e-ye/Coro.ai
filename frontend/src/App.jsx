import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import HeartModel from "./HeartModel";
import { mockPredict, MOCK_PATIENTS } from "./mockPredict";
import "./App.css";

const PATIENTS = Object.keys(MOCK_PATIENTS);

export default function App() {
  const [patient, setPatient] = useState(PATIENTS[0]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [bpm, setBpm] = useState(72);

  // The ONLY line that changes when the real backend lands:
  //   const data = await fetch("/api/predict", {...}).then(r => r.json());
  useEffect(() => {
    let alive = true;
    setLoading(true);
    mockPredict(patient).then((data) => {
      if (alive) { setPrediction(data); setLoading(false); }
    });
    return () => { alive = false; };
  }, [patient]);

  const active = selected ?? hovered;
  const activeVessel = active ? prediction?.vessels?.[active] : null;

  return (
    <div className="app">
      <aside className="panel">
        <header>
          <h1>Coronary Risk Viewer</h1>
          <p className="sub">Mock prediction · 3D pipeline test</p>
        </header>

        <label className="field">
          <span>Patient record</span>
          <select value={patient} onChange={(e) => { setSelected(null); setPatient(e.target.value); }}>
            {PATIENTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Heart rate · {bpm} bpm</span>
          <input type="range" min="45" max="140" value={bpm}
                 onChange={(e) => setBpm(+e.target.value)} />
        </label>

        {prediction && (
          <>
            <div className="gauge">
              <div className="gauge-label">Overall CAD probability</div>
              <div className="gauge-value">
                {(prediction.overall_cad.probability * 100).toFixed(0)}<span>%</span>
              </div>
              <div className="gauge-bar">
                <div className="gauge-fill"
                     style={{ width: `${prediction.overall_cad.probability * 100}%` }} />
                <div className="gauge-tick"
                     style={{ left: `${prediction.overall_cad.threshold_used * 100}%` }} />
              </div>
              <div className="gauge-status">{prediction.overall_cad.status}</div>
            </div>

            <div className="vessels">
              {Object.entries(prediction.vessels).map(([name, v]) => (
                <button key={name}
                        className={`vessel ${selected === name ? "is-selected" : ""}`}
                        onMouseEnter={() => setHovered(name)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setSelected(selected === name ? null : name)}>
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
            {activeVessel.top_shap_features.map((f, i) => (
              <div className="shap-row" key={i}>
                <span className="f">{f.feature}</span>
                <span className="v">{String(f.value)}</span>
                <span className={`i ${String(f.impact).startsWith("-") ? "neg" : "pos"}`}>
                  {f.impact}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="disclaimer">
          Decision support and education only. Not a diagnosis and not a
          substitute for formal diagnostic imaging.
        </p>
      </aside>

      <main className="stage">
        {loading && <div className="loading">running model…</div>}
        <Canvas camera={{ position: [0, 0.6, 3.4], fov: 42 }}>
          {/* Local three-point rig. Deliberately NOT drei's <Environment preset>:
              that streams an HDRI from a CDN, so it dies on conference wifi and
              costs frames on integrated graphics. */}
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
          <OrbitControls enablePan={false} minDistance={1.6} maxDistance={7}
                         autoRotate={!selected} autoRotateSpeed={0.5} />
        </Canvas>
        <div className="hint">drag to rotate · scroll to zoom · click a vessel</div>
      </main>
    </div>
  );
}
