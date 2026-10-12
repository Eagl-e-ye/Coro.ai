// Short comic-bubble copy for each artery.
// Rule 5 (01_INTEGRATION_BRIEF): describe what the model estimated. Never advise,
// never state a result as fact, never suggest care.
//
// Corrections applied per 09_COMPAT_AND_CORRECTIONS.md:
//   C.1  "Select a disease above" -> "Select a patient" (the user picks a patient,
//        and the dropdown is in the left column, not above).
//   C.2  tierOf() no longer uses fixed 0.6/0.3 cutoffs. Those disagreed with the
//        heart's own colour across 11-20% of the probability range.
//   C.3  "WATCH FOR" relabelled: a monitoring instruction became a neutral
//        anatomical note.
//   C.8  tierOf() returns "none" rather than null, so says[tier] is never undefined.

export const VESSEL_INFO = {
  LAD: {
    feeds: "feeds the front of the heart",
    says: {
      high: "The model estimates a high chance of significant narrowing in this artery.",
      mod: "The model estimates a borderline chance of narrowing in this artery.",
      low: "The model estimates a low chance of significant narrowing in this artery.",
      none: "Select a patient to see the model's estimate for this artery.",
    },
    symptoms: ["Chest pressure on effort", "Pain in left arm or jaw", "Breathlessness on stairs"],
  },
  LCX: {
    feeds: "feeds the side and back of the heart",
    says: {
      high: "The model estimates a high chance of significant narrowing in this artery.",
      mod: "The model estimates a borderline chance of narrowing in this artery.",
      low: "The model estimates a low chance of significant narrowing in this artery.",
      none: "Select a patient to see the model's estimate for this artery.",
    },
    symptoms: ["Chest tightness on effort", "Tiredness and breathlessness", "Pain in shoulder or upper back"],
  },
  RCA: {
    feeds: "feeds the bottom of the heart and its pacemaker",
    says: {
      high: "The model estimates a high chance of significant narrowing in this artery.",
      mod: "The model estimates a borderline chance of narrowing in this artery.",
      low: "The model estimates a low chance of significant narrowing in this artery.",
      none: "Select a patient to see the model's estimate for this artery.",
    },
    symptoms: ["Chest pressure or upper-belly ache", "Nausea or cold sweat", "Dizziness or a slow heartbeat"],
  },
};

// Heading for the symptoms list. NOT "Watch for:" — telling a reader to monitor
// themselves for symptoms is health guidance. This states anatomy instead.
export const SYMPTOM_HEADING = "Symptoms associated with this territory:";

// Shown under high and borderline estimates. A statement about the tool, not advice.
export const ALERT = "Model estimate only. Not a diagnosis.";

/**
 * Risk tier for a vessel payload. Returns "high" | "mod" | "low" | "none".
 *
 * The backend already decided this and sent `risk_level`, which is the same
 * decision that produced `color_hex`. Trust it. The fallback below exists only
 * for a malformed payload and MUST mirror the backend's rule:
 *
 *     High     if p >= threshold + 0.15
 *     Moderate if p >= threshold - 0.05
 *     Low      otherwise
 *
 * Fixed cutoffs (the old 0.6 / 0.3) are wrong here because thresholds are
 * per-vessel: Cath 0.48, LAD 0.40, LCX 0.32, RCA 0.30. An RCA at 0.50 is High and
 * painted red, but 0.6/0.3 would call it "borderline" — the bubble would
 * contradict the artery beside it.
 *
 * `status` is deliberately NOT consulted: it is "Stenotic" from `threshold`
 * upward, while risk is "High" only from `threshold + 0.15`, so mapping
 * Stenotic -> high overstates every borderline vessel.
 */
export function tierOf(v) {
  if (!v) return "none";

  const level = String(v.risk_level ?? "").toLowerCase();
  if (level.startsWith("high")) return "high";
  if (level.startsWith("mod")) return "mod";
  if (level.startsWith("low")) return "low";

  const p = v.probability;
  const t = v.threshold_used;
  if (typeof p !== "number" || typeof t !== "number") return "none";

  if (p >= t + 0.15) return "high";
  if (p >= t - 0.05) return "mod";
  return "low";
}
