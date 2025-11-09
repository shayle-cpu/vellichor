// src/pages/Home.js
import React from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

import iconCalendar from "../assets/icons/calendar.png";
import iconChallenges from "../assets/icons/challenges.png";
import iconLibrary from "../assets/icons/library.png";
import iconStats from "../assets/icons/stats.png";
import iconSeries from "../assets/icons/series.png";

import { useBooks } from "../context/BookContext";
import { useReadingLog } from "../context/ReadingLogContext";

/* ---------------- helpers for IDs / covers ---------------- */
const idOf = (b = {}) => b.id || b.googleId || b.isbn || b._id || String(b.title || Math.random());
const coverOf = (b = {}) => b.cover || b.coverUrl || b.coverURL || b.image || "";

/* ---------------- date utils for streak ---------------- */
const pad = (n) => String(n).padStart(2, "0");
const toLocalKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfLocalDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const parseToLocal = (val) => {
  if (!val) return null;
  if (val instanceof Date) return startOfLocalDay(val);
  if (typeof val === "number") return startOfLocalDay(new Date(val));
  if (typeof val === "string") {
    const m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return Number.isNaN(d.getTime()) ? null : startOfLocalDay(d);
    }
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : startOfLocalDay(d);
  }
  return null;
};
const truthyReads = (v) => {
  if (!v) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
};

/* ---------------- normalize reading log (calendar) ---------------- */
function buildNormalizedMap(readingLog) {
  const map = {}; // { "YYYY-MM-DD": true }
  if (!readingLog) return map;

  // object map { readingByDate: { "YYYY-MM-DD": [...] } }
  const byDate = readingLog.readingByDate || readingLog.entries || readingLog.byDate;
  if (byDate && typeof byDate === "object" && !Array.isArray(byDate)) {
    for (const [k, v] of Object.entries(byDate)) {
      const d = parseToLocal(k);
      if (!d) continue;
      if (truthyReads(v)) map[toLocalKey(d)] = true;
    }
  }

  // arrays like logs/list/items/data
  const arrs = [readingLog.logs, readingLog.list, readingLog.items, readingLog.data].filter(
    Array.isArray
  );
  for (const arr of arrs) {
    for (const item of arr) {
      const d = parseToLocal(item?.date || item?.day || item?.d || item?.key);
      if (!d) continue;
      const has = truthyReads(item?.books || item?.entries || item?.ids || item?.value || item);
      if (has) map[toLocalKey(d)] = true;
    }
  }

  return map;
}

/* ---------------- compute streak from *today backward* ---------------- */
function computeStreakFromMap(map) {
  const today = startOfLocalDay(new Date());
  const cursor = new Date(today);
  let streak = 0;
  // Count consecutive days ending today. If today has no reads, streak = 0.
  while (true) {
    const key = toLocalKey(cursor);
    if (!map[key]) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ---------------- component ---------------- */
export default function Home() {
  const { shelves } = useBooks();
  const readingLog = useReadingLog?.();

  const currentlyReading = React.useMemo(
    () => shelves?.currentlyReading || [],
    [shelves?.currentlyReading]
  );
  const finished = React.useMemo(() => shelves?.finished || [], [shelves?.finished]);
  const tbr = React.useMemo(() => shelves?.tbr || [], [shelves?.tbr]);

  // Streak via calendar/reading log
  const normMap = React.useMemo(() => buildNormalizedMap(readingLog), [readingLog]);
  const streak = React.useMemo(() => computeStreakFromMap(normMap), [normMap]);

  const tiles = [
    { to: "/calendar", img: iconCalendar, label: "Calendar" },
    { to: "/challenges", img: iconChallenges, label: "Challenges" },
    { to: "/library", img: iconLibrary, label: "Library" },
    { to: "/stats", img: iconStats, label: "Stats" },
    { to: "/series", img: iconSeries, label: "Series Tracker" },
  ];

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-brand">Vellichor</h1>
        <p className="home-tag">Your personal cozy book nook.</p>

        <div className="streak-pill" aria-label={`Reading streak ${streak} days`}>
          <span className="streak-dot" />
          <strong>{streak}</strong>&nbsp;day{streak === 1 ? "" : "s"} streak
        </div>
      </header>

      {/* Icon grid */}
      <div className="icon-grid">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="icon-tile" aria-label={t.label}>
            <div className="icon-face">
              <img src={t.img} alt="" />
            </div>
          </Link>
        ))}
      </div>

      {/* Panels */}
      <section className="home-section">
        <h2 className="home-sec-title">Currently Reading</h2>
        <div className="panel">
          {currentlyReading.length === 0 ? (
            <div className="home-empty">Nothing here yet — add something in your Library.</div>
          ) : (
            <div className="panel-grid">
              {currentlyReading.slice(0, 40).map((b, i) => (
                <div key={idOf(b) + i} className="book-card">
                  {coverOf(b) ? (
                    <img src={coverOf(b)} alt={b.title || "Book cover"} loading="lazy" />
                  ) : (
                    <div className="book-ph">No Cover</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-sec-title">Recently Finished</h2>
        <div className="panel">
          {finished.length === 0 ? (
            <div className="home-empty">No finished books yet.</div>
          ) : (
            <div className="panel-grid">
              {finished
                .slice()
                .sort((a, b) => {
                  const da = new Date(a.endDate || a.startDate || 0).getTime();
                  const db = new Date(b.endDate || b.startDate || 0).getTime();
                  return db - da; // newest first
                })
                .slice(0, 60)
                .map((b, i) => (
                  <div key={idOf(b) + i} className="book-card">
                    {coverOf(b) ? (
                      <img src={coverOf(b)} alt={b.title || "Book cover"} loading="lazy" />
                    ) : (
                      <div className="book-ph">No Cover</div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-sec-title">Next From Your TBR</h2>
        <div className="panel">
          {tbr.length === 0 ? (
            <div className="home-empty">Your TBR is empty — add some books!</div>
          ) : (
            <div className="panel-grid">
              {tbr.slice(0, 60).map((b, i) => (
                <div key={idOf(b) + i} className="book-card">
                  {coverOf(b) ? (
                    <img src={coverOf(b)} alt={b.title || "Book cover"} loading="lazy" />
                  ) : (
                    <div className="book-ph">No Cover</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
