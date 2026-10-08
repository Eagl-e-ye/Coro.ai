const BASE = "/api";

export async function getPatients() {
  const r = await fetch(`${BASE}/patients`);
  if (!r.ok) throw new Error("Failed to load patients list");
  return r.json();
}

export async function getPatient(id) {
  const r = await fetch(`${BASE}/patient/${id}`);
  if (!r.ok) throw new Error(`Failed to load patient ${id}`);
  return r.json();
}

export async function postPredict(features) {
  const r = await fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || "Prediction request failed");
  }
  return r.json();
}
