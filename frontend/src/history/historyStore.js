// Frontend history and snapshot store (08_PATIENT_HISTORY.md V.1)
import { useState, useEffect } from "react";

const STORAGE_KEY = "coro.history.v1";
const CONSENT_KEY = "coro.consent.v1";
const MAX_SNAPSHOTS = 20;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// In-memory backing array by default
let memorySnapshots = [];
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID().slice(0, 8);
    } catch {
      // fallback
    }
  }
  return "snap-" + Math.random().toString(36).substring(2, 10);
}

function checkPersistence() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const consent = JSON.parse(raw);
    return Boolean(consent?.persistent);
  } catch {
    return false;
  }
}

function readStoredSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    // Filter schema and retention (>30 days)
    const valid = parsed.filter((s) => {
      if (s?.schema !== 1 || !s.savedAt) return false;
      const t = new Date(s.savedAt).getTime();
      return now - t <= THIRTY_DAYS_MS;
    });

    return valid.slice(0, MAX_SNAPSHOTS);
  } catch {
    return [];
  }
}

function writeStoredSnapshots(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SNAPSHOTS)));
  } catch {
    // quota exceeded or disabled
  }
}

export const historyStore = {
  isPersistent() {
    return checkPersistence();
  },

  hasConsentBeenPrompted() {
    try {
      return localStorage.getItem(CONSENT_KEY) !== null;
    } catch {
      return false;
    }
  },

  setConsent(persistent) {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          version: 1,
          persistent: Boolean(persistent),
          grantedAt: new Date().toISOString(),
        })
      );
      if (persistent) {
        writeStoredSnapshots(memorySnapshots);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    notify();
  },

  list() {
    if (this.isPersistent()) {
      const stored = readStoredSnapshots();
      memorySnapshots = stored;
      return stored;
    }
    return [...memorySnapshots];
  },

  add(snapshotData) {
    const current = this.list();
    const id = generateId();
    const snapshot = {
      schema: 1,
      id,
      savedAt: new Date().toISOString(),
      ...snapshotData,
    };

    // Drop identical consecutive snapshots (same patientRef, whatIf, and result p)
    if (current.length > 0) {
      const latest = current[0];
      const samePatient = latest.patientRef === snapshot.patientRef;
      const sameWhatIf = latest.whatIf === snapshot.whatIf;
      const sameOverall =
        latest.result?.overall?.p === snapshot.result?.overall?.p;
      if (samePatient && sameWhatIf && sameOverall) {
        return latest;
      }
    }

    const updated = [snapshot, ...current].slice(0, MAX_SNAPSHOTS);
    memorySnapshots = updated;

    if (this.isPersistent()) {
      writeStoredSnapshots(updated);
    }
    notify();
    return snapshot;
  },

  remove(id) {
    const current = this.list();
    const updated = current.filter((s) => s.id !== id);
    memorySnapshots = updated;
    if (this.isPersistent()) {
      writeStoredSnapshots(updated);
    }
    notify();
  },

  clear() {
    memorySnapshots = [];
    if (this.isPersistent()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    notify();
  },

  disablePersistence({ wipe = true } = {}) {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          version: 1,
          persistent: false,
          grantedAt: new Date().toISOString(),
        })
      );
      if (wipe) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    notify();
  },

  enablePersistence() {
    this.setConsent(true);
  },
};

// React hook for observing historyStore changes
export function useHistory() {
  const [snapshots, setSnapshots] = useState(() => historyStore.list());
  const [isPersistent, setIsPersistent] = useState(() => historyStore.isPersistent());

  useEffect(() => {
    function update() {
      setSnapshots(historyStore.list());
      setIsPersistent(historyStore.isPersistent());
    }
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);

  return {
    snapshots,
    isPersistent,
    addSnapshot: (s) => historyStore.add(s),
    removeSnapshot: (id) => historyStore.remove(id),
    clearHistory: () => historyStore.clear(),
    setConsent: (p) => historyStore.setConsent(p),
  };
}
