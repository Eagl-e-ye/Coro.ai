import { useState } from "react";

const MANDATORY = ["Age", "Sex", "Typical Chest Pain", "HTN", "DM"];
const RECOMMENDED = ["Atypical", "Region RWMA", "EF-TTE"];

export default function ManualEntryModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [touched, setTouched] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Check mandatory
  const missingMandatory = MANDATORY.filter(
    (f) => formData[f] === undefined || formData[f] === null || formData[f] === ""
  );
  const isValid = missingMandatory.length === 0;

  // Check recommended
  const missingRecommended = RECOMMENDED.filter(
    (f) => formData[f] === undefined || formData[f] === null || formData[f] === ""
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    // Build finalized payload
    const payload = {};
    
    // Process entered fields
    let enteredCount = 0;

    // All 38 raw user input fields
    const ALL_FIELDS = [
      "Age", "Sex", "Weight", "Length", "BP", "PR",
      "HTN", "DM", "Current Smoker", "FH", "DLP",
      "Typical Chest Pain", "Atypical", "Nonanginal", "Dyspnea", "Function Class",
      "Systolic Murmur",
      "Q Wave", "St Elevation", "St Depression", "Tinversion", "LVH", "BBB",
      "FBS", "TG", "LDL", "HDL", "CR", "BUN",
      "HB", "WBC", "Lymph", "Neut", "PLT", "ESR", "K", "Na",
      "EF-TTE", "Region RWMA", "VHD"
    ];

    ALL_FIELDS.forEach((f) => {
      const val = formData[f];
      if (val !== undefined && val !== null && val !== "") {
        enteredCount++;
        if (f === "Sex") {
          payload[f] = val === "Female" ? "Fmale" : "Male";
        } else if (["Age", "Weight", "Length", "BP", "PR", "FBS", "TG", "LDL", "HDL", "CR", "BUN", "HB", "WBC", "Lymph", "Neut", "PLT", "ESR", "K", "Na", "EF-TTE", "Function Class", "Region RWMA", "Typical Chest Pain", "HTN", "DM", "Current Smoker", "FH", "Q Wave", "St Elevation", "St Depression", "Tinversion"].includes(f)) {
          payload[f] = Number(val);
        } else {
          payload[f] = val;
        }
      } else {
        // Defaults according to spec (blank binary/categorical -> 0 or N)
        if (["HTN", "DM", "Current Smoker", "FH", "Typical Chest Pain", "Q Wave", "St Elevation", "St Depression", "Tinversion"].includes(f)) {
          payload[f] = 0;
        } else if (["DLP", "Atypical", "Nonanginal", "Dyspnea", "Systolic Murmur", "LVH"].includes(f)) {
          payload[f] = "N";
        } else if (f === "BBB") {
          payload[f] = "N";
        } else if (f === "VHD") {
          payload[f] = "N";
        } else if (f === "Function Class" || f === "Region RWMA") {
          payload[f] = 0;
        }
      }
    });

    // Ensure mandatory mapped
    if (formData.Sex === "Female") {
      payload.Sex = "Fmale";
    }

    const assumedCount = 38 - enteredCount;
    onSubmit(payload, { enteredCount, assumedCount });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Add Patient Details (Manual Entry)</h3>
            <p className="modal-sub">
              Enter clinical facts to run risk prediction. Mandatory fields marked with *
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {missingRecommended.length > 0 && (
          <div className="warning-callout">
            <strong>Notice:</strong> {missingRecommended.join(", ")} were left blank and assumed. These carry significant weight in the model.
          </div>
        )}

        {touched && !isValid && (
          <div className="error-callout">
            Please fill in all mandatory fields: {missingMandatory.join(", ")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Group 1: Demographics & Vitals */}
          <details open className="form-group">
            <summary className="group-title">Group 1 — Demographics & Vitals</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">Age *</span>
                <input
                  type="number"
                  placeholder="e.g. 58"
                  value={formData.Age ?? ""}
                  onChange={(e) => handleChange("Age", e.target.value)}
                  className={`modal-input ${touched && !formData.Age ? "is-invalid" : ""}`}
                />
              </label>

              <label className="field-box">
                <span className="field-label">Sex *</span>
                <select
                  value={formData.Sex ?? ""}
                  onChange={(e) => handleChange("Sex", e.target.value)}
                  className={`modal-select ${touched && !formData.Sex ? "is-invalid" : ""}`}
                >
                  <option value="">Select Sex...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Weight (kg)</span>
                <input
                  type="number"
                  placeholder="74"
                  value={formData.Weight ?? ""}
                  onChange={(e) => handleChange("Weight", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Length (cm)</span>
                <input
                  type="number"
                  placeholder="165"
                  value={formData.Length ?? ""}
                  onChange={(e) => handleChange("Length", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Systolic BP (mmHg)</span>
                <input
                  type="number"
                  placeholder="130"
                  value={formData.BP ?? ""}
                  onChange={(e) => handleChange("BP", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Pulse Rate (bpm)</span>
                <input
                  type="number"
                  placeholder="70"
                  value={formData.PR ?? ""}
                  onChange={(e) => handleChange("PR", e.target.value)}
                  className="modal-input"
                />
              </label>
            </div>
          </details>

          {/* Group 2: Risk Factors & History */}
          <details open className="form-group">
            <summary className="group-title">Group 2 — Risk Factors & History</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">HTN (Hypertension) *</span>
                <select
                  value={formData.HTN ?? ""}
                  onChange={(e) => handleChange("HTN", e.target.value === "" ? "" : Number(e.target.value))}
                  className={`modal-select ${touched && formData.HTN === undefined ? "is-invalid" : ""}`}
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">DM (Diabetes) *</span>
                <select
                  value={formData.DM ?? ""}
                  onChange={(e) => handleChange("DM", e.target.value === "" ? "" : Number(e.target.value))}
                  className={`modal-select ${touched && formData.DM === undefined ? "is-invalid" : ""}`}
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Current Smoker</span>
                <select
                  value={formData["Current Smoker"] ?? ""}
                  onChange={(e) => handleChange("Current Smoker", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Family History (FH)</span>
                <select
                  value={formData.FH ?? ""}
                  onChange={(e) => handleChange("FH", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Dyslipidemia (DLP)</span>
                <select
                  value={formData.DLP ?? ""}
                  onChange={(e) => handleChange("DLP", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="Y">Yes (Y)</option>
                  <option value="N">No (N)</option>
                </select>
              </label>
            </div>
          </details>

          {/* Group 3: Symptoms */}
          <details open className="form-group">
            <summary className="group-title">Group 3 — Symptoms</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">Typical Chest Pain *</span>
                <select
                  value={formData["Typical Chest Pain"] ?? ""}
                  onChange={(e) => handleChange("Typical Chest Pain", e.target.value === "" ? "" : Number(e.target.value))}
                  className={`modal-select ${touched && formData["Typical Chest Pain"] === undefined ? "is-invalid" : ""}`}
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Atypical Chest Pain</span>
                <select
                  value={formData.Atypical ?? ""}
                  onChange={(e) => handleChange("Atypical", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="Y">Yes (Y)</option>
                  <option value="N">No (N)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Nonanginal Pain</span>
                <select
                  value={formData.Nonanginal ?? ""}
                  onChange={(e) => handleChange("Nonanginal", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="Y">Yes (Y)</option>
                  <option value="N">No (N)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Dyspnea</span>
                <select
                  value={formData.Dyspnea ?? ""}
                  onChange={(e) => handleChange("Dyspnea", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="Y">Yes (Y)</option>
                  <option value="N">No (N)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">Function Class</span>
                <select
                  value={formData["Function Class"] ?? ""}
                  onChange={(e) => handleChange("Function Class", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select (0-3)...</option>
                  <option value="0">Class 0</option>
                  <option value="1">Class 1</option>
                  <option value="2">Class 2</option>
                  <option value="3">Class 3</option>
                </select>
              </label>
            </div>
          </details>

          {/* Group 4: Examination */}
          <details className="form-group">
            <summary className="group-title">Group 4 — Examination</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">Systolic Murmur</span>
                <select
                  value={formData["Systolic Murmur"] ?? ""}
                  onChange={(e) => handleChange("Systolic Murmur", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="Y">Yes (Y)</option>
                  <option value="N">No (N)</option>
                </select>
              </label>
            </div>
          </details>

          {/* Group 5: ECG */}
          <details className="form-group">
            <summary className="group-title">Group 5 — ECG</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">Q Wave</span>
                <select
                  value={formData["Q Wave"] ?? ""}
                  onChange={(e) => handleChange("Q Wave", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">ST Elevation</span>
                <select
                  value={formData["St Elevation"] ?? ""}
                  onChange={(e) => handleChange("St Elevation", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">ST Depression</span>
                <select
                  value={formData["St Depression"] ?? ""}
                  onChange={(e) => handleChange("St Depression", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">T Inversion</span>
                <select
                  value={formData.Tinversion ?? ""}
                  onChange={(e) => handleChange("Tinversion", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="1">Yes (1)</option>
                  <option value="0">No (0)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">LVH</span>
                <select
                  value={formData.LVH ?? ""}
                  onChange={(e) => handleChange("LVH", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="Y">Yes (Y)</option>
                  <option value="N">No (N)</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">BBB (Bundle Branch Block)</span>
                <select
                  value={formData.BBB ?? ""}
                  onChange={(e) => handleChange("BBB", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="N">None (N)</option>
                  <option value="LBBB">LBBB</option>
                  <option value="RBBB">RBBB</option>
                </select>
              </label>
            </div>
          </details>

          {/* Group 6: Labs, Metabolic & Renal */}
          <details className="form-group">
            <summary className="group-title">Group 6 — Labs, Metabolic & Renal</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">FBS (mg/dL)</span>
                <input
                  type="number"
                  placeholder="98"
                  value={formData.FBS ?? ""}
                  onChange={(e) => handleChange("FBS", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">TG (mg/dL)</span>
                <input
                  type="number"
                  placeholder="122"
                  value={formData.TG ?? ""}
                  onChange={(e) => handleChange("TG", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">LDL (mg/dL)</span>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.LDL ?? ""}
                  onChange={(e) => handleChange("LDL", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">HDL (mg/dL)</span>
                <input
                  type="number"
                  placeholder="39"
                  value={formData.HDL ?? ""}
                  onChange={(e) => handleChange("HDL", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Creatinine (mg/dL)</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="1.0"
                  value={formData.CR ?? ""}
                  onChange={(e) => handleChange("CR", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">BUN (mg/dL)</span>
                <input
                  type="number"
                  placeholder="16"
                  value={formData.BUN ?? ""}
                  onChange={(e) => handleChange("BUN", e.target.value)}
                  className="modal-input"
                />
              </label>
            </div>
          </details>

          {/* Group 7: Labs, Haematology & Electrolytes */}
          <details className="form-group">
            <summary className="group-title">Group 7 — Labs, Haematology & Electrolytes</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">HB (g/dL)</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="13.2"
                  value={formData.HB ?? ""}
                  onChange={(e) => handleChange("HB", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">WBC (cells/µL)</span>
                <input
                  type="number"
                  placeholder="7100"
                  value={formData.WBC ?? ""}
                  onChange={(e) => handleChange("WBC", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Lymph (%)</span>
                <input
                  type="number"
                  placeholder="32"
                  value={formData.Lymph ?? ""}
                  onChange={(e) => handleChange("Lymph", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Neut (%)</span>
                <input
                  type="number"
                  placeholder="60"
                  value={formData.Neut ?? ""}
                  onChange={(e) => handleChange("Neut", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">PLT (×10³/µL)</span>
                <input
                  type="number"
                  placeholder="210"
                  value={formData.PLT ?? ""}
                  onChange={(e) => handleChange("PLT", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">ESR (mm/hr)</span>
                <input
                  type="number"
                  placeholder="15"
                  value={formData.ESR ?? ""}
                  onChange={(e) => handleChange("ESR", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">K (mEq/L)</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="4.2"
                  value={formData.K ?? ""}
                  onChange={(e) => handleChange("K", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Na (mEq/L)</span>
                <input
                  type="number"
                  placeholder="141"
                  value={formData.Na ?? ""}
                  onChange={(e) => handleChange("Na", e.target.value)}
                  className="modal-input"
                />
              </label>
            </div>
          </details>

          {/* Group 8: Echocardiography */}
          <details className="form-group">
            <summary className="group-title">Group 8 — Echocardiography</summary>
            <div className="grid-3col">
              <label className="field-box">
                <span className="field-label">EF-TTE (%)</span>
                <input
                  type="number"
                  placeholder="50"
                  value={formData["EF-TTE"] ?? ""}
                  onChange={(e) => handleChange("EF-TTE", e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="field-box">
                <span className="field-label">Region RWMA</span>
                <select
                  value={formData["Region RWMA"] ?? ""}
                  onChange={(e) => handleChange("Region RWMA", e.target.value === "" ? "" : Number(e.target.value))}
                  className="modal-select"
                >
                  <option value="">Select (0-4)...</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>

              <label className="field-box">
                <span className="field-label">VHD (Valvular Heart Disease)</span>
                <select
                  value={formData.VHD ?? ""}
                  onChange={(e) => handleChange("VHD", e.target.value)}
                  className="modal-select"
                >
                  <option value="">Select...</option>
                  <option value="N">None (N)</option>
                  <option value="mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </label>
            </div>
          </details>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={!isValid}>
              Evaluate Patient Risk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
