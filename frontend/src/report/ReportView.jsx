import React from "react";
import { formatFeatureName, formatFeatureValue } from "../featureDisplay";
import "./report.css";

export default function ReportView({ report }) {
  if (!report) return null;

  const localTime = new Date(report.generatedAt).toLocaleString();
  const utcTime = new Date(report.generatedAt).toISOString();
  const overallPct = Math.round((report.overall.probability ?? 0) * 100);
  const overallThr = Math.round((report.overall.threshold ?? 0.48) * 100);

  return (
    <div className="report-container">
      <table className="report-frame">
        <tbody>
          <tr>
            <td>
              {/* Section 1: Header */}
              <header className="report-header">
                <div className="report-header-top">
                  <div>
                    <h1 className="report-title">Coro.ai — Coronary Risk Assessment</h1>
                    <span className="report-badge">Research Prototype</span>
                  </div>
                  <div className="report-meta-box">
                    <div><b>Report ID:</b> {report.reportId}</div>
                    <div><b>Local:</b> {localTime}</div>
                    <div><b>UTC:</b> {utcTime}</div>
                  </div>
                </div>

                <div className="report-patient-strip">
                  <span><b>Subject:</b> {report.patientRef}</span>
                  <span><b>Mode:</b> {report.mode}</span>
                  <span>
                    <b>What-If Values:</b> {report.modified ? "Yes (Modified)" : "No"}
                  </span>
                </div>
              </header>

              {/* Section 2: Predicted Outcome */}
              <section className="report-section">
                <h2 className="report-section-title">1. Predicted Outcome</h2>
                <div className="report-outcome-layout">
                  <div className="report-outcome-metrics">
                    <div className="report-overall-card">
                      <span className="report-card-label">Overall CAD Probability</span>
                      <div className="report-overall-prob">
                        {overallPct}%
                        <span className="report-overall-status">({report.overall.status})</span>
                      </div>
                      <span className="report-threshold-note">
                        Decision threshold: {overallThr}%
                      </span>
                    </div>

                    <div className="report-vessels-table-wrap">
                      <table className="report-vessels-table">
                        <thead>
                          <tr>
                            <th>Territory / Artery</th>
                            <th>Probability</th>
                            <th>Status</th>
                            <th>Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(report.vessels).map(([name, v]) => {
                            const p = Math.round((v.probability ?? 0) * 100);
                            const t = Math.round((v.threshold_used ?? 0.4) * 100);
                            return (
                              <tr key={name}>
                                <td><b>{name}</b></td>
                                <td>{p}%</td>
                                <td>{v.status}</td>
                                <td>{t}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="report-disagree-note">
                        Overall CAD status and per-vessel stenosis are predicted by four independent models trained on separate labels. They can disagree.
                      </p>
                    </div>

                    {report.reference && (
                      <div className="report-reference-box">
                        <b>Reference Result (Cath):</b> {report.reference.label}{" "}
                        {report.reference.agreed ? "✓ (Agreed with Model)" : "⚠️ (Model Disagreed)"}
                        <span className="reference-sub">
                          Catheterisation record is for reference only; never a model input.
                        </span>
                      </div>
                    )}
                  </div>

                  {report.heartImg && (
                    <div className="report-heart-snapshot">
                      <img
                        src={report.heartImg}
                        alt="3D Heart Model Snapshot"
                        className="report-heart-img"
                      />
                      <span className="report-caption">
                        Territory visualization snapshot (LAD, LCX, RCA)
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 3: Contributing Factors (SHAP Drivers) */}
              <section className="report-section">
                <h2 className="report-section-title">2. Key Contributing Factors</h2>
                <p className="report-section-desc">
                  Primary factors influencing each arterial territory estimate:
                </p>
                <div className="report-drivers-grid">
                  {Object.entries(report.vessels).map(([name, v]) => (
                    <div key={name} className="report-driver-card">
                      <h3>{name} Top Influencing Factors</h3>
                      {v.top_shap_features && v.top_shap_features.length > 0 ? (
                        <ul className="report-driver-list">
                          {v.top_shap_features.map((f, idx) => {
                            const val = parseFloat(f.impact) || 0;
                            const isNeg = val < 0 || String(f.impact).startsWith("-");
                            const directionWord = isNeg ? "lowers risk" : "raises risk";
                            return (
                              <li key={idx} className="report-driver-item">
                                <span className="driver-feature">
                                  <b>{formatFeatureName(f.feature)}</b> ({formatFeatureValue(f.value, f.feature)}):
                                </span>{" "}
                                <span className={`driver-impact ${isNeg ? "impact-neg" : "impact-pos"}`}>
                                  {isNeg ? `${val.toFixed(2)}` : `+${val.toFixed(2)}`} ({directionWord})
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="report-empty-note">
                          Explanation unavailable for this vessel.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 4: Patient Inputs & Provenance */}
              <section className="report-section">
                <h2 className="report-section-title">3. Clinical Inputs & Feature Values</h2>

                {report.modified && (
                  <div className="report-whatif-warning">
                    ⚠️ <b>What-If Modified Values Used:</b> Shows how the model's output changes with different inputs. It does not predict the effect of treatment.
                  </div>
                )}

                <div className="report-inputs-grid">
                  {report.inputsByGroup.map((g) => (
                    <div key={g.group} className="report-input-group">
                      <h4>{g.group}</h4>
                      <table className="report-input-table">
                        <tbody>
                          {g.rows.map((r) => (
                            <tr key={r.label}>
                              <td className="input-label-col">{r.label}</td>
                              <td className="input-val-col">
                                {r.whatIfFrom !== null ? (
                                  <span>
                                    <span className="whatif-old">{r.whatIfFrom}</span> →{" "}
                                    <b>{String(r.value)}</b> {r.unit}
                                    <span className="whatif-badge">what-if</span>
                                  </span>
                                ) : (
                                  <span>
                                    <b>{String(r.value)}</b> {r.unit}
                                    {r.tier === "computed" && <span className="tag-computed">ƒ</span>}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                <div className="report-provenance-summary">
                  <b>Feature Provenance:</b> {report.counts.entered} entered / recorded ·{" "}
                  {report.counts.computed} computed · {report.counts.assumed} assumed at population dataset medians.
                </div>
              </section>

              {/* Section 5: Model Limitations */}
              <section className="report-section">
                <h2 className="report-section-title">4. Model Scope & Limitations</h2>
                <ul className="report-limitations-list">
                  {report.limitations.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            </td>
          </tr>
        </tbody>

        {/* Section 6: Repeating Footer on every page */}
        <tfoot>
          <tr>
            <td className="report-footer">
              <div className="report-footer-content">
                <p className="footer-disclaimer">
                  <b>Clinical Disclaimer:</b> Research prototype. Not a medical device. Not for clinical decision-making or formal diagnosis.
                </p>
                <div className="footer-attribution">
                  <span>Generated on this device. No data was uploaded.</span>
                  <span>3D Heart Model: BodyParts3D © CC BY-SA 2.1 Japan</span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
