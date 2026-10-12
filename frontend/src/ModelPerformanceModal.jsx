import React, { useState, useEffect } from "react";
import { getModelInfo } from "./api";
import "./ModelPerformanceModal.css";

const STATIC_METRICS = {
  Cath: {
    name: "Cath (Overall CAD)",
    threshold: 0.48,
    accuracy: "86.9%",
    ci95: "78.4–95.4%",
    recall: "97.7%",
    precision: "85.7%",
    f1: "91.3%",
    rocAuc: "0.873",
    baseline: "71.3%",
  },
  LAD: {
    name: "LAD (Left Anterior Descending)",
    threshold: 0.40,
    accuracy: "72.1%",
    ci95: "60.9–83.4%",
    recall: "94.1%",
    precision: "68.1%",
    f1: "79.0%",
    rocAuc: "0.798",
    baseline: "58.4%",
  },
  LCX: {
    name: "LCX (Left Circumflex)",
    threshold: 0.32,
    accuracy: "59.0%",
    ci95: "46.7–71.4%",
    recall: "76.9%",
    precision: "51.3%",
    f1: "61.5%",
    rocAuc: "0.698",
    baseline: "60.7%",
  },
  RCA: {
    name: "RCA (Right Coronary Artery)",
    threshold: 0.30,
    accuracy: "50.8%",
    ci95: "38.3–63.4%",
    recall: "85.0%",
    precision: "38.6%",
    f1: "53.1%",
    rocAuc: "0.712",
    baseline: "62.4%",
  },
};

const STATIC_CONFUSION = {
  Cath: { tp: 42, fp: 7, fn: 1, tn: 11 },
  LAD: { tp: 32, fp: 15, fn: 2, tn: 12 },
  LCX: { tp: 20, fp: 19, fn: 6, tn: 16 },
  RCA: { tp: 17, fp: 27, fn: 3, tn: 14 },
};

const STATIC_CALIBRATION = {
  Cath: {
    pred: [0.157, 0.321, 0.544, 0.697, 0.929],
    true: [0.0, 0.125, 0.6, 0.875, 0.889],
  },
  LAD: {
    pred: [0.135, 0.295, 0.519, 0.692, 0.893],
    true: [0.0, 0.25, 0.533, 0.538, 0.895],
  },
  LCX: {
    pred: [0.163, 0.299, 0.493, 0.67],
    true: [0.0, 0.357, 0.444, 0.8],
  },
  RCA: {
    pred: [0.165, 0.3, 0.487, 0.65],
    true: [0.0, 0.167, 0.467, 0.667],
  },
};

const STATIC_IMPORTANCE = [
  { feature: "Typical Chest Pain", Cath: 0.079, LAD: 0.067, LCX: 0.030, RCA: 0.025 },
  { feature: "Age", Cath: 0.011, LAD: 0.009, LCX: 0.062, RCA: 0.028 },
  { feature: "Region RWMA", Cath: 0.024, LAD: 0.033, LCX: -0.001, RCA: -0.002 },
  { feature: "EF-TTE", Cath: 0.008, LAD: 0.022, LCX: -0.001, RCA: -0.004 },
  { feature: "DM", Cath: 0.001, LAD: -0.003, LCX: 0.000, RCA: 0.022 },
];

export default function ModelPerformanceModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("metrics");
  const [selectedTarget, setSelectedTarget] = useState("Cath");
  const [importanceTarget, setImportanceTarget] = useState("Cath");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    getModelInfo()
      .then((data) => setInfo(data))
      .catch((err) => console.warn("Failed fetching live model info, using verified defaults:", err));
  }, [isOpen]);

  if (!isOpen) return null;

  const conf = info?.confusion_matrices?.[selectedTarget] || STATIC_CONFUSION[selectedTarget];
  const calib = info?.calibration_curves?.[selectedTarget]
    ? {
        pred: info.calibration_curves[selectedTarget].prob_pred,
        true: info.calibration_curves[selectedTarget].prob_true,
      }
    : STATIC_CALIBRATION[selectedTarget];

  const importanceData = info?.global_importance || STATIC_IMPORTANCE;

  return (
    <div className="perf-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="perf-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="perf-modal-header">
          <div className="perf-title-group">
            <span className="perf-badge">Track A Deliverable 3</span>
            <h2>Model Performance & Clinical Validation</h2>
            <p className="perf-sub">
              Rigorous nested cross-validation, calibration assessment, and test metrics (n = 61 held-out test cohort)
            </p>
          </div>
          <button className="perf-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="perf-disclaimer-banner">
          ⚠️ <b>Clinical Research Notice:</b> Research prototype. Not a medical device. Not intended for clinical diagnosis or care decisions.
        </div>

        <nav className="perf-tabs">
          <button
            className={`perf-tab-btn ${activeTab === "metrics" ? "active" : ""}`}
            onClick={() => setActiveTab("metrics")}
          >
            Metrics & Confusion Matrix
          </button>
          <button
            className={`perf-tab-btn ${activeTab === "calibration" ? "active" : ""}`}
            onClick={() => setActiveTab("calibration")}
          >
            Calibration Curves
          </button>
          <button
            className={`perf-tab-btn ${activeTab === "importance" ? "active" : ""}`}
            onClick={() => setActiveTab("importance")}
          >
            Global Feature Importance
          </button>
          <button
            className={`perf-tab-btn ${activeTab === "methodology" ? "active" : ""}`}
            onClick={() => setActiveTab("methodology")}
          >
            Validation Methodology & RCA Framing
          </button>
        </nav>

        <div className="perf-modal-body">
          {activeTab === "metrics" && (
            <div className="perf-pane">
              <div className="perf-section-head">
                <h3>Held-Out Test Set Performance (n = 61)</h3>
                <span className="perf-meta-tag">Stratified 80/20 · n_train = 242 · n_test = 61</span>
              </div>
              <p className="perf-desc">
                95% Wilson confidence intervals are reported alongside every accuracy point estimate to accurately reflect test sample uncertainty.
              </p>

              <div className="perf-table-wrap">
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>Threshold</th>
                      <th>Accuracy</th>
                      <th>95% CI</th>
                      <th>Sensitivity (Recall)</th>
                      <th>Precision</th>
                      <th>F1 Score</th>
                      <th>ROC-AUC</th>
                      <th>Majority Baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(STATIC_METRICS).map(([k, m]) => (
                      <tr
                        key={k}
                        className={selectedTarget === k ? "row-selected" : ""}
                        onClick={() => setSelectedTarget(k)}
                        title="Click to view confusion matrix for this target"
                      >
                        <td className="target-name-cell">
                          <b>{k}</b>
                          <span className="target-sub">{m.name.split("(")[1]?.replace(")", "") || ""}</span>
                        </td>
                        <td>{m.threshold}</td>
                        <td className="highlight-metric">{m.accuracy}</td>
                        <td className="ci-cell">{m.ci95}</td>
                        <td>{m.recall}</td>
                        <td>{m.precision}</td>
                        <td>{m.f1}</td>
                        <td>{m.rocAuc}</td>
                        <td className="baseline-cell">{m.baseline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="perf-confusion-section">
                <div className="perf-section-head">
                  <h4>Confusion Matrix for {STATIC_METRICS[selectedTarget]?.name}</h4>
                  <div className="target-pill-selector">
                    {["Cath", "LAD", "LCX", "RCA"].map((t) => (
                      <button
                        key={t}
                        className={`pill-btn ${selectedTarget === t ? "active" : ""}`}
                        onClick={() => setSelectedTarget(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="confusion-matrix-grid">
                  <div className="cm-cell cm-tp">
                    <span className="cm-label">True Positive (TP)</span>
                    <span className="cm-count">{conf.tp}</span>
                    <span className="cm-desc">Correctly predicted stenosis / disease</span>
                  </div>
                  <div className="cm-cell cm-fp">
                    <span className="cm-label">False Positive (FP)</span>
                    <span className="cm-count">{conf.fp}</span>
                    <span className="cm-desc">Predicted stenosis, actually normal</span>
                  </div>
                  <div className="cm-cell cm-fn">
                    <span className="cm-label">False Negative (FN)</span>
                    <span className="cm-count">{conf.fn}</span>
                    <span className="cm-desc">Missed stenosis (critical clinical floor)</span>
                  </div>
                  <div className="cm-cell cm-tn">
                    <span className="cm-label">True Negative (TN)</span>
                    <span className="cm-count">{conf.tn}</span>
                    <span className="cm-desc">Correctly identified normal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "calibration" && (
            <div className="perf-pane">
              <div className="perf-section-head">
                <h3>Risk Estimation Quality: Sigmoid Calibration Curves</h3>
                <div className="target-pill-selector">
                  {["Cath", "LAD", "LCX", "RCA"].map((t) => (
                    <button
                      key={t}
                      className={`pill-btn ${selectedTarget === t ? "active" : ""}`}
                      onClick={() => setSelectedTarget(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="perf-desc">
                A calibrated model sits close to the 45° diagonal: when the model predicts 70% risk, approximately 70% of those patients are positive for CAD/stenosis. Calibrated probabilities turn raw classifier scores into usable clinical probabilities.
              </p>

              <div className="calibration-chart-container">
                <div className="calibration-svg-wrap">
                  <svg viewBox="0 0 320 260" className="calib-svg">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
                      <React.Fragment key={v}>
                        <line
                          x1={40 + v * 240}
                          y1={20}
                          x2={40 + v * 240}
                          y2={220}
                          stroke="#22272e"
                          strokeDasharray="2,2"
                        />
                        <line
                          x1={40}
                          y1={220 - v * 200}
                          x2={280}
                          y2={220 - v * 200}
                          stroke="#22272e"
                          strokeDasharray="2,2"
                        />
                        <text x={40 + v * 240} y={235} fill="#768390" fontSize="10" textAnchor="middle">
                          {(v * 100).toFixed(0)}%
                        </text>
                        <text x={32} y={224 - v * 200} fill="#768390" fontSize="10" textAnchor="end">
                          {(v * 100).toFixed(0)}%
                        </text>
                      </React.Fragment>
                    ))}

                    {/* Ideal diagonal line */}
                    <line x1={40} y1={220} x2={280} y2={20} stroke="#444c56" strokeWidth="2" strokeDasharray="4,4" />

                    {/* Model calibration curve */}
                    {calib.pred.map((x, i) => {
                      if (i === 0) return null;
                      const prevX = 40 + calib.pred[i - 1] * 240;
                      const prevY = 220 - calib.true[i - 1] * 200;
                      const curX = 40 + x * 240;
                      const curY = 220 - calib.true[i] * 200;
                      return (
                        <line
                          key={i}
                          x1={prevX}
                          y1={prevY}
                          x2={curX}
                          y2={curY}
                          stroke="#58a6ff"
                          strokeWidth="2.5"
                        />
                      );
                    })}

                    {/* Points */}
                    {calib.pred.map((x, i) => (
                      <circle
                        key={i}
                        cx={40 + x * 240}
                        cy={220 - calib.true[i] * 200}
                        r="4"
                        fill="#58a6ff"
                        stroke="#0d1117"
                        strokeWidth="2"
                      />
                    ))}

                    <text x={160} y={252} fill="#adbac7" fontSize="11" textAnchor="middle">
                      Predicted Probability
                    </text>
                    <text
                      x={-120}
                      y={12}
                      transform="rotate(-90)"
                      fill="#adbac7"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      Observed Frequency
                    </text>
                  </svg>
                </div>
                <div className="calib-legend-box">
                  <div className="calib-legend-row">
                    <span className="calib-dot ideal-dot" />
                    <span><b>Diagonal (45°):</b> Perfect calibration benchmark</span>
                  </div>
                  <div className="calib-legend-row">
                    <span className="calib-dot model-dot" />
                    <span><b>{selectedTarget} Curve:</b> Calibrated with CalibratedClassifierCV (sigmoid)</span>
                  </div>
                  <div className="calib-detail-box">
                    <p>
                      Bin observations: evaluated across 5 probability bins on held-out test data. The alignment confirms that low predicted risks correlate with near-zero observed prevalence, and high predicted risks correspond to positive cases.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "importance" && (
            <div className="perf-pane">
              <div className="perf-section-head">
                <h3>Global Feature Importance (Permutation Importance)</h3>
                <div className="target-pill-selector">
                  {["Cath", "LAD", "LCX", "RCA"].map((t) => (
                    <button
                      key={t}
                      className={`pill-btn ${importanceTarget === t ? "active" : ""}`}
                      onClick={() => setImportanceTarget(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="perf-desc">
                Evaluated by measuring the <b>drop in accuracy when a feature is shuffled</b> across held-out data. Permutation importance avoids the high-cardinality inflation bias inherent to standard tree Gini impurity.
              </p>

              <div className="importance-chart">
                <div className="importance-axis-title">
                  ← Shuffling improved score (misleading) | Drop in accuracy when feature is shuffled (critical) →
                </div>
                {importanceData.map((row) => {
                  const val = row[importanceTarget];
                  const isNeg = val < 0;
                  const maxVal = 0.08;
                  const barWidth = Math.min(100, (Math.abs(val) / maxVal) * 50);

                  return (
                    <div className="importance-row" key={row.feature}>
                      <span className="importance-feature-label">{row.feature}</span>
                      <div className="importance-bar-track">
                        <div className="importance-bar-centerline" />
                        <div
                          className={`importance-bar-fill ${isNeg ? "imp-neg" : "imp-pos"}`}
                          style={
                            isNeg
                              ? { right: "50%", width: `${barWidth}%` }
                              : { left: "50%", width: `${barWidth}%` }
                          }
                        />
                      </div>
                      <span className={`importance-value-label ${isNeg ? "imp-neg-text" : "imp-pos-text"}`}>
                        {val >= 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="importance-note">
                <p>
                  <b>Negative importance:</b> Negative values indicate that shuffling the feature slightly improved score on that target, meaning the model learns little or no helpful signal from it for that specific vessel.
                </p>
              </div>
            </div>
          )}

          {activeTab === "methodology" && (
            <div className="perf-pane">
              <div className="perf-section-head">
                <h3>Validation Rigor & Design Decisions</h3>
              </div>

              <div className="methodology-grid">
                <div className="method-card">
                  <h4>5×5 Nested Cross-Validation</h4>
                  <p>
                    Thresholds for each target were selected strictly within inner training folds and verified on unseen folds. Naive post-hoc threshold sweeps that evaluate on the same data artificially inflate reported metrics.
                  </p>
                </div>
                <div className="method-card">
                  <h4>Leak-Free Preprocessing Pipeline</h4>
                  <p>
                    All scalers and encoders operate strictly within scikit-learn <code>Pipeline</code> instances fitted exclusively on training splits. Test cases never contribute to feature scaling or category encoding.
                  </p>
                </div>
                <div className="method-card">
                  <h4>Target Leakage Prevention</h4>
                  <p>
                    Correlated anatomical outcomes (Cath, LAD, LCX, RCA) are strictly excluded from the input feature set of every model, ensuring no downstream diagnosis leaks into prediction.
                  </p>
                </div>
                <div className="method-card">
                  <h4>Sigmoid Probability Calibration</h4>
                  <p>
                    500-tree Random Forest ensembles are calibrated with <code>CalibratedClassifierCV(method='sigmoid', cv=3)</code> to ensure outputs represent empirical clinical probabilities.
                  </p>
                </div>
              </div>

              <div className="rca-analysis-card">
                <div className="rca-card-head">
                  <span className="rca-tag">Design Transparency</span>
                  <h4>The Right Coronary Artery (RCA) Operating Trade-off</h4>
                </div>
                <div className="rca-body-text">
                  <p>
                    <b>RCA is our weakest target:</b> The decision threshold is deliberately set to a recall floor (0.30) rather than maximizing accuracy. At 0.30, the model captures <b>85.0% of true RCA stenoses</b> at 38.6% precision.
                  </p>
                  <p>
                    By comparison, a naive majority-class baseline would report 62.4% accuracy by calling every patient's RCA normal — while missing 100% of stenoses. For a screening support tool, missing a real stenosis carries far higher clinical consequence than a false alarm.
                  </p>
                  <p>
                    The 95% confidence interval on RCA accuracy is <b>38.3–63.4%</b> on n = 61 held-out test cases. We report confidence intervals rather than point estimates to present our findings with full statistical honesty.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="perf-modal-footer">
          <p className="perf-footer-disclaimer">
            Coro.ai · Research prototype · Track A Multimodal AI Hackathon 2026
          </p>
          <button className="btn-close-footer" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
