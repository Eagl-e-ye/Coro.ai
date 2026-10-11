// Short comic-bubble copy for each artery.
// Rule 5 (01_INTEGRATION_BRIEF): describe what the model estimated. Never advise,
// never state a result as fact, never suggest care.

export const VESSEL_INFO = {
  LAD: {
    feeds: "feeds the front of the heart",
    says: {
      high: "The model estimates a high chance of significant narrowing in this artery.",
      mod: "The model estimates a borderline chance of narrowing in this artery.",
      low: "The model estimates a low chance of significant narrowing in this artery.",
      none: "Select a disease above to see the model's estimate for this artery.",
    },
    symptoms: ["Chest pressure on effort", "Pain in left arm or jaw", "Breathlessness on stairs"],
  },
  LCX: {
    feeds: "feeds the side and back of the heart",
    says: {
      high: "The model estimates a high chance of significant narrowing in this artery.",
      mod: "The model estimates a borderline chance of narrowing in this artery.",
      low: "The model estimates a low chance of significant narrowing in this artery.",
      none: "Select a disease above to see the model's estimate for this artery.",
    },
    symptoms: ["Chest tightness on effort", "Tiredness and breathlessness", "Pain in shoulder or upper back"],
  },
  RCA: {
    feeds: "feeds the bottom of the heart and its pacemaker",
    says: {
      high: "The model estimates a high chance of significant narrowing in this artery.",
      mod: "The model estimates a borderline chance of narrowing in this artery.",
      low: "The model estimates a low chance of significant narrowing in this artery.",
      none: "Select a disease above to see the model's estimate for this artery.",
    },
    symptoms: ["Chest pressure or upper-belly ache", "Nausea or cold sweat", "Dizziness or a slow heartbeat"],
  },
};

// Shown under high and borderline estimates. A statement about the tool, not advice.
export const ALERT = "Model estimate only. Not a diagnosis.";

// Works whether risk_level is "High"/"Moderate"/"Low" or only status/probability exist.
export function tierOf(v) {
  if (!v) return null;
  const r = String(v.risk_level ?? v.status ?? "").toLowerCase();
  if (r.startsWith("high") || r.includes("stenotic")) return "high";
  if (r.startsWith("mod") || r.includes("borderline")) return "mod";
  if (r.startsWith("low") || r.includes("normal")) return "low";
  return v.probability >= 0.6 ? "high" : v.probability >= 0.3 ? "mod" : "low";
}
