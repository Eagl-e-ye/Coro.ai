import { useState } from "react";
import { useHistory, historyStore } from "./historyStore";
import "./history.css";

export default function HistoryDrawer({ isOpen, onClose }) {
  const { snapshots, isPersistent, removeSnapshot, clearHistory, setConsent } = useHistory();
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  if (!isOpen) return null;

  const toggleSelectForCompare = (id) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleStorageToggle = () => {
    setShowConsentModal(true);
  };

  return (
    <div className="history-drawer-backdrop" onClick={onClose}>
      <aside
        className="history-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Saved snapshots history"
      >
        <header className="history-header">
          <div className="history-title-wrap">
            <h2>Saved Snapshots</h2>
            <span className="history-count-badge">
              {snapshots.length} {snapshots.length === 1 ? "run" : "runs"}
            </span>
          </div>
          <button className="btn-close-history" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <p className="history-caveat">
          Compares model outputs for different inputs. It does not show how a patient's condition changed over time.
        </p>

        {/* C.7: Hide trend strip until at least 3 snapshots */}
        {snapshots.length >= 3 && <TrendStrip snapshots={snapshots} />}

        <div className="history-actions-bar">
          <button
            className="btn-compare-trigger"
            disabled={selectedForCompare.length !== 2}
            onClick={() => setIsComparing(true)}
          >
            Compare Selected ({selectedForCompare.length}/2)
          </button>
          {selectedForCompare.length > 0 && (
            <button className="btn-clear-selection" onClick={() => setSelectedForCompare([])}>
              Clear selection
            </button>
          )}
        </div>

        <div className="history-list">
          {snapshots.length === 0 ? (
            <div className="history-empty">
              No snapshots yet. Use "Save snapshot" to record a model output here.
            </div>
          ) : (
            snapshots.map((s, idx) => {
              const prevSnapshot = snapshots[idx + 1];
              const overallP = Math.round((s.result?.overall?.p ?? 0) * 100);
              const prevP = prevSnapshot ? Math.round((prevSnapshot.result?.overall?.p ?? 0) * 100) : null;
              const deltaPts = prevP !== null ? overallP - prevP : null;
              const isChecked = selectedForCompare.includes(s.id);

              return (
                <div key={s.id} className={`history-item ${isChecked ? "is-selected" : ""}`}>
                  <div className="history-item-top">
                    <label className="history-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectForCompare(s.id)}
                      />
                      <span className="history-ref">{s.patientRef}</span>
                    </label>
                    <span className="history-time">
                      {new Date(s.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="history-item-metrics">
                    <span className="history-prob">
                      Overall: <b>{overallP}%</b>
                    </span>
                    {deltaPts !== null && (
                      <span className="history-delta">
                        {deltaPts > 0 ? `+${deltaPts}` : `${deltaPts}`} pts
                      </span>
                    )}
                    <button
                      className="btn-delete-row"
                      onClick={() => removeSnapshot(s.id)}
                      title="Delete snapshot"
                    >
                      Delete
                    </button>
                  </div>

                  {s.whatIf && (
                    <div className="whatif-note">
                      What-if values — not the patient's recorded values
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="history-footer">
          <div className="history-storage-status">
            <span>Storage: </span>
            <button className="btn-storage-toggle" onClick={handleStorageToggle}>
              {isPersistent ? "This device (Saved)" : "Session only"}
            </button>
          </div>
          {snapshots.length > 0 && (
            <button
              className="btn-delete-all"
              onClick={() => {
                if (window.confirm("Delete all saved snapshots?")) {
                  clearHistory();
                  setSelectedForCompare([]);
                }
              }}
            >
              Delete all
            </button>
          )}
        </footer>

        {/* Compare View Dialog */}
        {isComparing && selectedForCompare.length === 2 && (
          <CompareModal
            snapshots={snapshots}
            selectedIds={selectedForCompare}
            onClose={() => setIsComparing(false)}
          />
        )}

        {/* Consent Modal Dialog */}
        {showConsentModal && (
          <ConsentModal
            currentPersistent={isPersistent}
            onSelect={(persistent) => {
              setConsent(persistent);
              setShowConsentModal(false);
            }}
            onClose={() => setShowConsentModal(false)}
          />
        )}
      </aside>
    </div>
  );
}

// Inline Trend Strip (V.4 / C.7)
function TrendStrip({ snapshots }) {
  // Ordered oldest to newest for trend line
  const ordered = [...snapshots].reverse();
  const width = 320;
  const height = 90;
  const pad = 12;

  const pointsFor = (key) =>
    ordered.map((s, idx) => {
      const p = s.result?.[key]?.p ?? 0;
      const x = pad + (idx / Math.max(1, ordered.length - 1)) * (width - pad * 2);
      const y = height - pad - p * (height - pad * 2);
      return `${x},${y}`;
    }).join(" ");

  return (
    <div className="trend-strip-card">
      <div className="trend-strip-header">
        <span>History trend</span>
        <span className="trend-sub">saved snapshots order</span>
      </div>
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`}>
        {/* Axes guidelines */}
        <line x1={pad} y1={pad} x2={width - pad} y2={pad} stroke="rgba(0,0,0,0.08)" />
        <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="rgba(0,0,0,0.06)" />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(0,0,0,0.08)" />

        {/* Polylines for overall, LAD, LCX, RCA */}
        <polyline fill="none" stroke="#6366f1" strokeWidth="2.2" points={pointsFor("overall")} />
        <polyline fill="none" stroke="#e03636" strokeWidth="1.5" strokeDasharray="3 2" points={pointsFor("LAD")} />
        <polyline fill="none" stroke="#d99b00" strokeWidth="1.5" strokeDasharray="3 2" points={pointsFor("LCX")} />
        <polyline fill="none" stroke="#2ea043" strokeWidth="1.5" strokeDasharray="3 2" points={pointsFor("RCA")} />
      </svg>
      <div className="trend-legend">
        <span><b style={{ color: "#6366f1" }}>—</b> Overall</span>
        <span><b style={{ color: "#e03636" }}>- -</b> LAD</span>
        <span><b style={{ color: "#d99b00" }}>- -</b> LCX</span>
        <span><b style={{ color: "#2ea043" }}>- -</b> RCA</span>
      </div>
    </div>
  );
}

// Compare View Modal (V.5)
function CompareModal({ snapshots, selectedIds, onClose }) {
  const sA = snapshots.find((s) => s.id === selectedIds[0]);
  const sB = snapshots.find((s) => s.id === selectedIds[1]);

  if (!sA || !sB) return null;

  const samePatient = sA.patientRef === sB.patientRef;
  const title = samePatient ? `Two runs for ${sA.patientRef}` : "Two patients comparison";

  // Check if thresholds differ
  const thrA = sA.result?.overall?.threshold;
  const thrB = sB.result?.overall?.threshold;
  const thresholdMismatch = thrA && thrB && thrA !== thrB;

  // Find differing inputs
  const allKeys = Array.from(new Set([...Object.keys(sA.inputs || {}), ...Object.keys(sB.inputs || {})]));
  const diffInputs = allKeys
    .filter((k) => sA.inputs?.[k] !== sB.inputs?.[k])
    .map((k) => ({
      field: k,
      valA: sA.inputs?.[k] ?? "—",
      valB: sB.inputs?.[k] ?? "—",
    }));

  const vessels = ["overall", "LAD", "LCX", "RCA"];

  return (
    <div className="compare-modal-backdrop" onClick={onClose}>
      <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
        <header className="compare-header">
          <h3>{title}</h3>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </header>

        <p className="compare-caveat">
          Compares model outputs for different inputs. It does not show how a patient's condition changed over time.
        </p>

        {thresholdMismatch && (
          <div className="compare-warning">
            These snapshots were made with different model settings, so the probabilities are not directly comparable.
          </div>
        )}

        <div className="compare-grid">
          {vessels.map((v) => {
            const pA = Math.round((sA.result?.[v]?.p ?? 0) * 100);
            const pB = Math.round((sB.result?.[v]?.p ?? 0) * 100);
            const diff = pB - pA;
            return (
              <div key={v} className="compare-metric-card">
                <span className="compare-vname">{v.toUpperCase()}</span>
                <div className="compare-values">
                  <span>A: <b>{pA}%</b></span>
                  <span>B: <b>{pB}%</b></span>
                  <span className="compare-delta">
                    {diff > 0 ? `+${diff}` : `${diff}`} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {diffInputs.length > 0 && (
          <div className="compare-diff-table-wrap">
            <h4>Inputs that differ</h4>
            <table className="compare-diff-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Run A</th>
                  <th>Run B</th>
                </tr>
              </thead>
              <tbody>
                {diffInputs.slice(0, 10).map((d) => (
                  <tr key={d.field}>
                    <td>{d.field}</td>
                    <td>{String(d.valA)}</td>
                    <td>{String(d.valB)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {diffInputs.length > 10 && (
              <p className="diff-more">+{diffInputs.length - 10} more differing inputs</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Consent Dialog Modal (V.2)
function ConsentModal({ currentPersistent, onSelect, onClose }) {
  return (
    <div className="consent-modal-backdrop" onClick={onClose}>
      <div className="consent-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Keep saved snapshots?</h3>
        <p className="consent-desc">
          Choose where your saved snapshots are kept:
        </p>
        <ul className="consent-list">
          <li><b>What is saved:</b> The inputs you entered, the model's probabilities, and the timestamp.</li>
          <li><b>Where:</b> Only inside your browser on this device. Nothing is sent to any server.</li>
          <li><b>What is not saved:</b> Names, personal identifiers, catheterisation outcomes, or images.</li>
          <li><b>Removal:</b> You can click "Delete all" at any time.</li>
        </ul>
        <div className="consent-actions">
          <button className="btn-consent-option" onClick={() => onSelect(false)}>
            Keep for this session only
          </button>
          <button className="btn-consent-option btn-consent-primary" onClick={() => onSelect(true)}>
            Keep on this device
          </button>
        </div>
      </div>
    </div>
  );
}
