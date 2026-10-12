// Feature display name lookup to prevent raw column names leaking into UI (Task W.7 #2)

export const FEATURE_DISPLAY_NAMES = {
  Anterior_Risk_Score: "Anterior risk score",
  ECG_Abnormality_Count: "ECG abnormality count",
  Lipid_Risk_Ratio: "Lipid risk ratio",
  Any_Angina: "Any angina",
  "Region RWMA": "Region RWMA",
  Region_RWMA: "Region RWMA",
  "Typical Chest Pain": "Typical chest pain",
  Typical_Chest_Pain: "Typical chest pain",
  Atypical: "Atypical chest pain",
  Nonanginal: "Non-anginal pain",
  "Exertional CP": "Exertional chest pain",
  Exertional_CP: "Exertional chest pain",
  "Poor R Progression": "Poor R progression",
  Poor_R_Progression: "Poor R progression",
  "Function Class": "Function class",
  Function_Class: "Function class",
  "St Elevation": "ST elevation",
  St_Elevation: "ST elevation",
  "St Depression": "ST depression",
  St_Depression: "ST depression",
  "Q Wave": "Q wave",
  Q_Wave: "Q wave",
  Tinversion: "T-wave inversion",
  "Current Smoker": "Current smoker",
  Current_Smoker: "Current smoker",
  "EF-TTE": "EF (TTE)",
  HTN: "Hypertension (HTN)",
  DM: "Diabetes mellitus (DM)",
  DLP: "Dyslipidemia (DLP)",
  FH: "Family history (FH)",
  CR: "Creatinine",
  BUN: "Blood urea nitrogen",
  HB: "Hemoglobin",
  WBC: "White blood cell count",
  PLT: "Platelet count",
  ESR: "Erythrocyte sedimentation rate",
  BMI: "BMI",
  Obesity: "Obesity",
};

export function formatFeatureName(name) {
  if (!name) return "";
  if (FEATURE_DISPLAY_NAMES[name]) return FEATURE_DISPLAY_NAMES[name];
  // Replace underscores with space
  return name.replace(/_/g, " ");
}

export function formatFeatureValue(val, featureName) {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "N/A";
  }
  if (featureName === "BMI") {
    const num = parseFloat(val);
    return isNaN(num) ? String(val) : num.toFixed(1);
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(1);
  }
  const parsed = parseFloat(val);
  if (!isNaN(parsed) && String(val).includes(".")) {
    return parsed.toFixed(1);
  }
  return String(val);
}
