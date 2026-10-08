import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import HeartModel from "./HeartModel";
import { getPatients, getPatient, postPredict } from "./api";
import "./App.css";

const DEFAULT_REQUIRED = {
  Age: 58,
  Sex: "Male",
  "Typical Chest Pain": 1,
  HTN: 1,
  DM: 0,
};

export default function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [features, setFeatures] = useState(DEFAULT_REQUIRED);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [bpm, setBpm] = useState(72);

  const seq = useRef(0);

  // Load patients list on mount
  useEffect(() => {
    getPatients()
      .then((res) => {
        if (res?.patients && res.patients.length > 0) {
          setPatients(res.patients);
          // Pick first patient by default
          loadPatientData(res.patients[0].id);
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

  async function loadPatientData(pid) {
    setSelectedPatientId(pid);
    setSelected(null);
    try {
      const p = await getPatient(pid);
      if (p?.features) {
        setFeatures(p.features);
        runPredict(p.features);
      }
    } catch (e) {
      setError(e.message || "Failed to load patient record");
    }
  }

  function handleFeatureChange(key, value) {
    const updated = { ...features, [key]: value };
    setFeatures(updated);
    runPredict(updated);
  }

  const active = selected ?? hovered;
  const activeVessel = active ? prediction?.vessels?.[active] : null;

  return (
    <div className="app">
      <aside className="panel">
        <header>
          <h1>Coronary Risk Viewer</h1>
          <p className="sub">FastAPI Backend · 3D Heart Visualizer</p>
        </header>

        {error && <div className="error-banner">{error}</div>}

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

          <div className="checkbox-field">
            <input
              type="checkbox"
              id="htn"
              checked={Boolean(features.HTN)}
              onChange={(e) => handleFeatureChange("HTN", e.target.checked ? 1 : 0)}
            />
            <label htmlFor="htn">HTN</label>
          </div>

          <div className="checkbox-field">
            <input
              type="checkbox"
              id="dm"
              checked={Boolean(features.DM)}
              onChange={(e) => handleFeatureChange("DM", e.target.checked ? 1 : 0)}
            />
            <label htmlFor="dm">DM</label>
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
