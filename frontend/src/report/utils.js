// Report utilities (07_PATIENT_REPORT.md U.1)

// crypto.randomUUID only exists in secure contexts; fallback works over LAN IP / non-HTTPS
export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16)).slice(0, 8);

// Formats date into filename stamp e.g. 20261011-0941
export const stamp = (d) => {
  const dateObj = d instanceof Date ? d : new Date(d);
  return dateObj.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
};
