// Short, comic-bubble copy for each artery. General education only, not a diagnosis.

export const VESSEL_INFO = {
  LAD: {
    feeds: "feeds the front of the heart",
    says: {
      high: "Heads up! I'm badly narrowed, so the front wall isn't getting enough blood.",
      mod: "I'm a little narrow. Effort may start to bring on symptoms.",
      low: "All clear! Blood is flowing well to the front wall.",
      none: "Select a disease above and I'll tell you how I'm doing.",
    },
    symptoms: ["Chest pressure on effort", "Pain in left arm or jaw", "Breathless on stairs"],
  },
  LCX: {
    feeds: "feeds the side and back of the heart",
    says: {
      high: "Heads up! I'm badly narrowed, so the side and back wall are short of blood.",
      mod: "I'm a little narrow. You may feel it mostly with effort.",
      low: "All clear! Blood is reaching the side and back wall.",
      none: "Select a disease above and I'll tell you how I'm doing.",
    },
    symptoms: ["Chest tightness on effort", "Tiredness and breathlessness", "Pain in shoulder or upper back"],
  },
  RCA: {
    feeds: "feeds the bottom of the heart and its pacemaker",
    says: {
      high: "Heads up! I'm badly narrowed, so the underside and pacemaker area get less blood.",
      mod: "I'm borderline. Many people feel nothing yet, but I can get worse.",
      low: "All clear! Blood is reaching the bottom of the heart.",
      none: "Select a disease above and I'll tell you how I'm doing.",
    },
    symptoms: ["Chest pressure or upper-belly ache", "Nausea or cold sweat", "Dizziness or a slow heartbeat"],
  },
};

export const ALERT = "Chest pain lasting more than a few minutes? Call emergency help now.";

// Works whether risk_level is "High"/"Moderate"/"Low" or only status/probability exist.
export function tierOf(v) {
  if (!v) return null;
  const r = String(v.risk_level ?? v.status ?? "").toLowerCase();
  if (r.startsWith("high") || r.includes("stenotic")) return "high";
  if (r.startsWith("mod") || r.includes("borderline")) return "mod";
  if (r.startsWith("low") || r.includes("normal")) return "low";
  return v.probability >= 0.6 ? "high" : v.probability >= 0.3 ? "mod" : "low";
}