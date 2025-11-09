// src/utils/achievementsUtils.js
// Compute achievements from shelves + history + series-completion

const ACH_STORAGE = "pt_achievements_v1";
const EPOCH_KEY = "pt_achievements_epoch_v1";
const SERIES_KEY = "pt_series_complete_v1"; // { [seriesName]: ISO_when_marked_complete }

/* ----------------- Earned storage ----------------- */
export function loadEarned() {
  try {
    const raw = localStorage.getItem(ACH_STORAGE);
    return raw ? JSON.parse(raw) : { earned: [] };
  } catch {
    return { earned: [] };
  }
}
export function saveEarned(earned) {
  try {
    localStorage.setItem(ACH_STORAGE, JSON.stringify({ earned }));
  } catch {}
}

/* ----------------- Epoch helpers ----------------- */
export function setAchievementsEpochNow() {
  try {
    localStorage.setItem(EPOCH_KEY, new Date().toISOString());
  } catch {}
}
export function setAchievementsEpochTomorrow() {
  try {
    const now = new Date();
    const tomorrowLocalMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0
    );
    localStorage.setItem(EPOCH_KEY, tomorrowLocalMidnight.toISOString());
  } catch {}
}
export function getAchievementsEpoch() {
  try {
    return localStorage.getItem(EPOCH_KEY) || null;
  } catch {
    return null;
  }
}

/* ----------------- Series completion helpers -----------------
   We mark a series complete when your Series Tracker detects that
   *all* titles in the dropdown are finished.

   Storage shape: { [seriesName]: "2025-08-09T12:34:56Z" }
---------------------------------------------------------------- */
function loadSeriesMap() {
  try {
    const raw = localStorage.getItem(SERIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveSeriesMap(map) {
  try {
    localStorage.setItem(SERIES_KEY, JSON.stringify(map));
  } catch {}
}

/** Call this from Series Tracker whenever a series’ finished-state changes. */
export function updateSeriesCompletion(seriesName, isComplete) {
  if (!seriesName) return;
  const map = loadSeriesMap();
  if (isComplete) {
    if (!map[seriesName]) map[seriesName] = new Date().toISOString();
  } else {
    delete map[seriesName];
  }
  saveSeriesMap(map);
}

/** Return a Set of series names completed (optionally filtered by epoch). */
function getCompletedSeriesAfterEpoch(epoch) {
  const map = loadSeriesMap();
  if (!epoch) return new Set(Object.keys(map));
  const out = new Set();
  for (const [name, iso] of Object.entries(map)) {
    const d = new Date(iso);
    if (!isNaN(d) && d > epoch) out.add(name);
  }
  return out;
}

/* ----------------- helpers ----------------- */
const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const toNum = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function getFinishedBooks(shelves) {
  return (shelves?.finished || []).map((b) => ({
    id: b.id,
    title: b.title,
    authors: Array.isArray(b.authors) ? b.authors : b.authors ? [b.authors] : [],
    startDate: b.startDate || null,
    endDate: b.endDate || null,
    pageCount: toNum(b.pageCount ?? b.totalPages ?? 0),
    categories: Array.isArray(b.categories) ? b.categories : b.categories ? [b.categories] : [],
  }));
}

function totalPagesRead(history, finishedBooks) {
  const fromDays = Object.values(history.days || {}).reduce((a, n) => a + toNum(n), 0);
  const fromFinishes = finishedBooks.reduce((a, b) => a + toNum(b.pageCount), 0);
  return Math.max(fromDays, fromFinishes);
}

function streakDays(history) {
  const keys = Object.keys(history.days || {}).sort();
  if (!keys.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1]);
    const curr = new Date(keys[i]);
    const diff = (curr - prev) / 86400000;
    if (Math.abs(diff - 1) < 0.01) cur += 1; else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

function twoFinishesSameDay(history) {
  const counts = {};
  (history.finishes || []).forEach((f) => { counts[f.date] = (counts[f.date] || 0) + 1; });
  return Object.values(counts).some((n) => n >= 2);
}

function uniqueGenres(finishedBooks) {
  return uniq(finishedBooks.flatMap((b) => b.categories || []));
}

function rereadDetected(history) {
  const byTitle = {};
  (history.finishes || []).forEach((f) => {
    const key = (f.title || "").trim().toLowerCase();
    if (!key) return;
    byTitle[key] = (byTitle[key] || 0) + 1;
  });
  return Object.values(byTitle).some((n) => n >= 2);
}

function finishedInOneDay(book) {
  if (!book.startDate || !book.endDate) return false;
  const s = new Date(book.startDate).toISOString().slice(0, 10);
  const e = new Date(book.endDate).toISOString().slice(0, 10);
  return s === e;
}

/* ----------------- Badges ----------------- */
export const BADGES = [
  { id: "first_finish",    name: "First Book Finished",  desc: "Completed your first book of the year" },
  { id: "page_turner_1k",  name: "Page Turner",          desc: "Read 1,000 pages total" },
  { id: "marathon_10k",    name: "Marathon Reader",      desc: "Read 10,000 pages total" },
  { id: "new_year",        name: "New Year, New Chapter",desc: "Started reading on January 1st" },
  { id: "daily_7",         name: "Daily Reader",         desc: "Read at least once a day for 7 days straight" },
  { id: "genre_5",         name: "Genre Explorer",       desc: "Read books from 5 different genres" },
  { id: "double_feature",  name: "Double Feature",       desc: "Finished two books in one day" },
  { id: "rereader",        name: "Re-reader",            desc: "Read the same book twice" },
  { id: "bookworm_10",     name: "Bookworm",             desc: "Finished 10 books" },
  { id: "speed_reader",    name: "Speed Reader",         desc: "Finished a book in one day" },
  { id: "series_slayer",   name: "Series Slayer",        desc: "Completed an entire series" }, // 👈 NEW
];

/* ----------------- Core evaluator ----------------- */
export function evaluateAchievements({ shelves, history }) {
  const epochIso = getAchievementsEpoch();
  const epoch = epochIso ? new Date(epochIso) : null;

  const finishedAll = getFinishedBooks(shelves);
  const isOnOrAfterEpochTs = (iso) => {
    if (!epoch) return true;
    if (!iso) return false;
    const d = new Date(iso);
    return !isNaN(d) && d >= epoch;
  };

  const finished = epoch
    ? finishedAll.filter((b) => isOnOrAfterEpochTs(b.endDate || b.startDate))
    : finishedAll;

  // Filter history by epoch — strict AFTER epoch date
  const filteredDays = {};
  if (epoch && history?.days) {
    const epochDay = epoch.toISOString().slice(0, 10);
    for (const [k, v] of Object.entries(history.days)) {
      if (k > epochDay) filteredDays[k] = v;
    }
  } else {
    Object.assign(filteredDays, history?.days || {});
  }

  const filteredFinishes = (() => {
    const list = history?.finishes || [];
    if (!epoch) return list;
    const epochDay = epoch.toISOString().slice(0, 10);
    return list.filter((f) => (f?.date || "") > epochDay);
  })();

  const filteredHistory = { days: filteredDays, finishes: filteredFinishes };

  const earned = [];

  // First finish
  if (finished.length >= 1) earned.push("first_finish");

  // Total pages
  const pages = totalPagesRead(filteredHistory, finished);
  if (pages >= 1000)  earned.push("page_turner_1k");
  if (pages >= 10000) earned.push("marathon_10k");

  // Jan 1 activity (use current year)
  const year = new Date().getFullYear();
  const jan1 = `${year}-01-01`;
  if ((filteredHistory.days && filteredHistory.days[jan1]) ||
      finished.some((b) => (b.startDate || "").startsWith(jan1))) {
    earned.push("new_year");
  }

  // Daily streak >= 7
  if (streakDays(filteredHistory) >= 7) earned.push("daily_7");

  // Genres
  if (uniqueGenres(finished).length >= 5) earned.push("genre_5");

  // Two finishes same day
  if (twoFinishesSameDay(filteredHistory)) earned.push("double_feature");

  // Re-reader
  if (rereadDetected(filteredHistory)) earned.push("rereader");

  // Count finished
  if (finished.length >= 10) earned.push("bookworm_10");

  // Speed reader
  if (finished.some(finishedInOneDay)) earned.push("speed_reader");

  // ✅ Series Slayer: any series marked complete after epoch
  const completedSeries = getCompletedSeriesAfterEpoch(epoch);
  if (completedSeries.size > 0) earned.push("series_slayer");

  return uniq(earned);
}
