// Stand-in for POST /api/predict.
// Shape matches the JSON contract exactly, so swapping in the real FastAPI
// call later is a one-line change in App.jsx — nothing else moves.

const RISK = {
  low:      { hex: "#2ea043", label: "Low" },
  moderate: { hex: "#e3b341", label: "Moderate" },
  high:     { hex: "#da3633", label: "High" },
};

// Same rule the backend should use, kept in one place so colors can never
// disagree between the 3D canvas and the dashboard.
export function riskFromProbability(p, threshold = 0.44) {
  if (p >= threshold + 0.15) return RISK.high;
  if (p >= threshold - 0.10) return RISK.moderate;
  return RISK.low;
}

function vessel(probability, shap, threshold = 0.44) {
  const r = riskFromProbability(probability, threshold);
  return {
    probability,
    status: probability >= threshold ? "Stenotic" : probability >= threshold - 0.1 ? "Borderline" : "Normal",
    risk_level: r.label,
    color_hex: r.hex,
    top_shap_features: shap,
  };
}

// Three canned patients so you can watch the model react to different inputs.
export const MOCK_PATIENTS = {
  "Patient A — LAD disease": {
    overall_cad: { probability: 0.85, status: "High Risk (CAD)", threshold_used: 0.44 },
    vessels: {
      LAD: vessel(0.88, [
        { feature: "ST Elevation",       value: 1,           impact: "+0.22" },
        { feature: "Typical Chest Pain", value: "Yes",       impact: "+0.18" },
        { feature: "LDL",                value: "155 mg/dL", impact: "+0.12" },
      ]),
      LCX: vessel(0.15, [{ feature: "Age", value: 53, impact: "+0.03" }]),
      RCA: vessel(0.42, [{ feature: "Region RWMA", value: "Mild", impact: "+0.09" }]),
    },
  },
  "Patient B — triple vessel": {
    overall_cad: { probability: 0.94, status: "High Risk (CAD)", threshold_used: 0.44 },
    vessels: {
      LAD: vessel(0.91, [{ feature: "Q Wave", value: 1, impact: "+0.26" }]),
      LCX: vessel(0.77, [{ feature: "Age", value: 71, impact: "+0.14" }]),
      RCA: vessel(0.83, [{ feature: "DM", value: "Yes", impact: "+0.19" }]),
    },
  },
  "Patient C — clean": {
    overall_cad: { probability: 0.08, status: "Low Risk (Normal)", threshold_used: 0.44 },
    vessels: {
      LAD: vessel(0.11, [{ feature: "EF-TTE", value: 60, impact: "-0.15" }]),
      LCX: vessel(0.06, [{ feature: "HDL",    value: 58, impact: "-0.09" }]),
      RCA: vessel(0.09, [{ feature: "BP",     value: 118, impact: "-0.07" }]),
    },
  },
};

export function mockPredict(name) {
  // Simulates network latency so you build the loading state in from day one.
  return new Promise((resolve) =>
    setTimeout(() => resolve(MOCK_PATIENTS[name]), 350)
  );
}
