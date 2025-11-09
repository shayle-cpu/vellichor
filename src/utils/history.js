// src/utils/history.js
// Simple localStorage-backed reading history.
// Tracks per-day activity and total page deltas, plus finished-book events.

const STORAGE_KEY = "pt_read_history_v1";

const toNum = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, "")); // handles "10,000"
  return Number.isFinite(n) ? n : 0;
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const state = raw ? JSON.parse(raw) : { days: {}, finishes: [] };

    // Repair any previously stored non-numeric values
    const fixedDays = {};
    for (const [k, v] of Object.entries(state.days || {})) {
      fixedDays[k] = toNum(v);
    }
    state.days = fixedDays;

    return state;
  } catch {
    return { days: {}, finishes: [] };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function logReadActivity({ date = new Date(), pagesDelta = 0 } = {}) {
  const delta = toNum(pagesDelta);
  if (delta <= 0) return;

  const dayKey = new Date(date).toISOString().slice(0, 10); // YYYY-MM-DD
  const state = load();
  state.days[dayKey] = toNum(state.days[dayKey]) + delta;
  save(state);
}

export function logFinishedBook({
  bookId,
  title,
  authors,
  date = new Date(),
} = {}) {
  if (!bookId) return;
  const dayKey = new Date(date).toISOString().slice(0, 10);
  const state = load();
  state.finishes.push({
    bookId,
    title: title || "",
    authors: Array.isArray(authors) ? authors : (authors ? [authors] : []),
    date: dayKey,
  });
  save(state);
}

export function getHistory() {
  return load();
}
