// Pure function building the patient report data object (07_PATIENT_REPORT.md U.1)
import { newId } from "./utils";

const FIELD_UNITS = {
  Age: "yrs",
  Weight: "kg",
  Length: "cm",
  BP: "mmHg",
  PR: "bpm",
  FBS: "mg/dL",
  TG: "mg/dL",
  LDL: "mg/dL",
  HDL: "mg/dL",
  CR: "mg/dL",
  BUN: "mg/dL",
  HB: "g/dL",
  WBC: "/mcL",
  Lymph: "%",
  Neut: "%",
  PLT: "10³/mcL",
  ESR: "mm/hr",
  K: "mEq/L",
  Na: "mEq/L",
  "EF-TTE": "%",
  BMI: "kg/m²",
};

const GROUPS_SCHEMA = [
  {
    group: "Demographics & Vitals",
    fields: ["Age", "Sex", "Weight", "Length", "BP", "PR"],
  },
  {
    group: "Risk Factors & History",
    fields: ["HTN", "DM", "Current Smoker", "FH", "DLP"],
  },
  {
    group: "Symptoms & Presentation",
    fields: ["Typical Chest Pain", "Atypical", "Nonanginal", "Dyspnea", "Function Class", "Systolic Murmur"],
  },
  {
    group: "ECG Findings",
    fields: ["Q Wave", "St Elevation", "St Depression", "Tinversion", "LVH", "BBB"],
  },
  {
    group: "Lipids & Metabolism",
    fields: ["FBS", "TG", "LDL", "HDL", "CR", "BUN"],
  },
  {
    group: "Hematology & Electrolytes",
    fields: ["HB", "WBC", "Lymph", "Neut", "PLT", "ESR", "K", "Na"],
  },
  {
    group: "Echocardiography",
    fields: ["EF-TTE", "Region RWMA", "VHD"],
  },
  {
    group: "Computed Features",
    fields: ["BMI", "Obesity"],
    computed: true,
  },
];

export function buildReport({
  selectedPatientId,
  features,
  baselineFeatures,
  actualLabels,
  prediction,
  isModified,
}) {
  const generatedAt = new Date();
  const reportId = newId();

  const isManual = selectedPatientId === "manual";
  const patientRef = isManual
    ? "Manual entry"
    : selectedPatientId
    ? `Patient #${selectedPatientId}`
    : "Patient";
  const mode = isManual ? "Manual entry" : "Recorded patient";

  // Build inputs by group
  const inputsByGroup = [];
  const assumedNames = [];
  let enteredCount = 0;
  let computedCount = 0;
  let assumedCount = 0;

  GROUPS_SCHEMA.forEach((g) => {
    const rows = [];
    g.fields.forEach((f) => {
      const cur = features?.[f];
      const base = baselineFeatures?.[f];
      const isFieldModified = isModified && cur !== undefined && base !== undefined && cur !== base;

      if (cur !== undefined && cur !== null && cur !== "") {
        let displayVal = cur;
        // C.6: Format Sex as Female instead of Fmale
        if (f === "Sex") {
          displayVal = cur === "Fmale" ? "Female" : cur;
        } else if (typeof cur === "number" && (cur === 0 || cur === 1) && !["Age", "BP", "PR", "FBS", "TG", "LDL", "HDL", "CR", "BUN", "HB", "WBC", "PLT", "ESR", "K", "Na", "EF-TTE"].includes(f)) {
          displayVal = cur === 1 ? "Present" : "Absent";
        }

        let tier = g.computed ? "computed" : "entered";
        if (g.computed) computedCount++;
        else enteredCount++;

        let whatIfFrom = null;
        if (isFieldModified) {
          let baseDisplay = base;
          if (f === "Sex") baseDisplay = base === "Fmale" ? "Female" : base;
          whatIfFrom = baseDisplay;
        }

        rows.push({
          label: f,
          value: displayVal,
          unit: FIELD_UNITS[f] || "",
          tier,
          whatIfFrom,
        });
      } else {
        assumedCount++;
        assumedNames.push(f);
      }
    });

    if (rows.length > 0) {
      inputsByGroup.push({
        group: g.group,
        rows,
      });
    }
  });

  // Reference Catheterisation Label (Rules 5 & 6)
  // Only present for an UNMODIFIED RECORDED PATIENT
  let reference = null;
  if (!isManual && !isModified && actualLabels?.Cath) {
    const actualCath = actualLabels.Cath;
    const predStatus = prediction?.overall_cad?.status;
    const agreed =
      (actualCath === "CAD" && predStatus?.includes("High")) ||
      (actualCath === "Normal" && predStatus?.includes("Low"));
    reference = {
      label: actualCath,
      agreed: Boolean(agreed),
    };
  }

  // Model limitations (U.6 static fallback)
  const limitations = [
    "Trained on a single public cohort; not tested on an independent clinical population.",
    "The dataset represents one cross-sectional snapshot per patient. The model does not describe disease change over time.",
    "Reported probabilities are calibrated statistical estimates, not medical diagnoses.",
    "Contributing factors show how the model weighed inputs. They describe statistical association, not cause.",
    `Unmeasured features were completed with population dataset medians (${prediction?.meta?.assumed_count ?? assumedCount} fields assumed).`,
    "Right Coronary Artery (RCA) estimate carries lower statistical confidence than anterior vessels.",
  ];

  return {
    reportId,
    generatedAt,
    patientRef,
    mode,
    modified: Boolean(isModified),
    overall: {
      probability: prediction?.overall_cad?.probability ?? 0,
      status: prediction?.overall_cad?.status ?? "—",
      threshold: prediction?.overall_cad?.threshold_used ?? 0.48,
    },
    vessels: prediction?.vessels ?? {},
    inputsByGroup,
    counts: {
      entered: prediction?.meta?.entered_count ?? enteredCount,
      computed: computedCount,
      assumed: prediction?.meta?.assumed_count ?? assumedCount,
    },
    assumedNames,
    reference,
    limitations,
  };
}
