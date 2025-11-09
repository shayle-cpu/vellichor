import React, { useMemo, useState, useEffect } from "react";
import { useBooks } from "../context/BookContext";

/* ------------ font loader (Homemade Apple) ------------ */
function useGoogleFont(href) {
  useEffect(() => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
}
const HOMEMADE_APPLE =
  "https://fonts.googleapis.com/css2?family=Homemade+Apple&display=swap";

/* ------------ helpers ------------ */
const getNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const pagesTotal = (b) => getNum(b?.pageCount ?? b?.totalPages ?? 0);
const pagesCurrent = (b) => getNum(b?.currentPage ?? 0);
const getRating = (b) => getNum(b?.rating ?? 0);
const safeDate = (d) => {
  const x = new Date(d);
  return Number.isFinite(x.getTime()) ? x : null;
};
const daysBetween = (a, b) => {
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  // Minimum 1 day when same-day to avoid “0 days”
  return Math.max(1, Math.round(ms / 86400000));
};
const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthLetter = ["J","F","M","A","M","J","J","A","S","O","N","D"];

const TF = { ALL: "all", YEAR: "year", MONTH: "month" };

function useTimeframeBooks(books, timeframe) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return useMemo(() => {
    if (timeframe === TF.ALL) return books;
    return books.filter((b) => {
      const d = safeDate(b?.endDate) || safeDate(b?.startDate);
      if (!d) return false;
      if (timeframe === TF.YEAR) return d.getFullYear() === y;
      if (timeframe === TF.MONTH) return d.getFullYear() === y && d.getMonth() === m;
      return true;
    });
  }, [books, timeframe, y, m]);
}

/* ------------ tiny presentational bits ------------ */
function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      style={{
        background: "#fffaf0",
        border: "1px solid #b7b7a4",
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        overflow: "hidden",
        marginBottom: "0.75rem",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.9rem 1rem",
          background: "#fbebe0",
          border: "none",
          borderBottom: open ? "1px solid #b7b7a4" : "1px solid transparent",
          color: "#6b705c",
          cursor: "pointer",
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
        }}
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            lineHeight: 1,
            fontSize: "1.1rem",
            color: "#6b705c",
          }}
        >
          ▾
        </span>
      </button>
      <div style={{ display: open ? "block" : "none", padding: "1rem" }}>{children}</div>
    </section>
  );
}

function Row({ children }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>{children}</div>;
}

function StatCard({ label, value, highlight = false, wide = false }) {
  return (
    <div
      style={{
        backgroundColor: highlight ? "#cb997e" : "#ddbea9",
        color: highlight ? "#fffaf0" : "#6b705c",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
        minWidth: wide ? "300px" : "160px",
        flex: wide ? "1 1 300px" : "0 0 auto",
      }}
    >
      <div style={{ fontSize: "0.95rem", opacity: 0.95, marginBottom: "0.4rem" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

/* ------------ tiny bar chart (no deps) ------------ */
function MiniBars({
  data,
  max,
  height = 180,
  barColor = "#cb997e",
  labelColor = "#6b705c",
  valueColor = "#fffaf0",
}) {
  const keys = Object.keys(data);
  const gutter = 16;
  const barWidth = 28;
  const minVisible = 8;
  const stripWidth = keys.length > 0 ? keys.length * barWidth + (keys.length - 1) * gutter : 0;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          width: stripWidth,
          margin: "0 auto",
          display: "flex",
          alignItems: "flex-end",
          gap: gutter,
          paddingTop: 8,
          paddingBottom: 10,
        }}
      >
        {keys.map((k) => {
          const v = data[k] ?? 0;
          const h = max > 0 ? Math.round((v / max) * height) : 0;
          const hScaled = v > 0 ? Math.max(minVisible, h) : 0;

          return (
            <div key={k} style={{ width: barWidth, display: "grid", justifyItems: "center" }}>
              <div
                title={`${k}: ${v}`}
                style={{
                  width: "100%",
                  height: hScaled,
                  background: barColor,
                  borderRadius: 14,
                  border: "1px solid #b7b7a4",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                {v > 0 && (
                  <span
                    style={{
                      color: valueColor,
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {v}
                  </span>
                )}
              </div>

              <div
                aria-hidden="true"
                style={{
                  width: barWidth,
                  height: 4,
                  background: "#cfd3c6",
                  borderRadius: 8,
                  marginTop: 8,
                  opacity: 0.9,
                }}
              />
              <div style={{ fontSize: 12, marginTop: 4, color: labelColor }}>{k}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------ main page ------------ */
export default function StatsPage() {
  useGoogleFont(HOMEMADE_APPLE);

  const { shelves } = useBooks();

  const finishedAll = shelves.finished || [];
  const currentAll = shelves.currentlyReading || [];
  const tbrAll = shelves.tbr || [];

  const [timeframe, setTimeframe] = useState(TF.ALL);

  // yearly goal (books)
  const GOAL_KEY = "pt_reading_goal_yearly";
  const [goal, setGoal] = useState(() => {
    try {
      const x = localStorage.getItem(GOAL_KEY);
      return x ? Number(x) || 0 : 0;
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(GOAL_KEY, String(goal || 0));
    } catch {}
  }, [goal]);

  // Filter by timeframe for finished-based metrics
  const finished = useTimeframeBooks(finishedAll, timeframe);
  const current = currentAll;
  const tbr = tbrAll;

  /* --- basic numbers --- */
  const finishedCount = finished.length;
  const currentCount = current.length;
  const tbrCount = tbr.length;
  const totalBooks =
    (timeframe === TF.ALL ? finishedAll.length : finished.length) + currentCount + tbrCount;

  /* --- pages --- */
  const pagesFromFinished = finished.reduce((sum, b) => sum + pagesTotal(b), 0);
  const pagesFromCurrent = current.reduce((sum, b) => sum + pagesCurrent(b), 0);
  const totalPagesRead = pagesFromFinished + pagesFromCurrent;
  const pagesRemainingInCurrent = current.reduce((sum, b) => {
    const total = pagesTotal(b);
    const cur = pagesCurrent(b);
    return sum + (total > 0 ? Math.max(0, total - cur) : 0);
  }, 0);

  /* --- finished per month (for chart) --- */
  const perMonthCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    finished.forEach((b) => {
      const d = safeDate(b?.endDate);
      if (!d) return;
      counts[d.getMonth()] += 1;
    });
    return counts;
  }, [finished]);
  const perMonthObj = monthLetter.reduce((acc, label, i) => {
    acc[label] = perMonthCounts[i];
    return acc;
  }, {});
  const perMonthMax = Math.max(...perMonthCounts, 0);

  /* --- ratings breakdown --- */
  const ratingBuckets = useMemo(() => {
    const buckets = {
      "5": 0, "4.5": 0, "4": 0, "3.5": 0, "3": 0,
      "2.5": 0, "2": 0, "1.5": 0, "1": 0, "0.5": 0,
    };
    finished.forEach((b) => {
      const r = getRating(b);
      if (r <= 0) return;
      const key = String(r in buckets ? r : Math.round(r * 2) / 2);
      if (buckets[key] === undefined) return;
      buckets[key] += 1;
    });
    return buckets;
  }, [finished]);

  /* --- top authors (for section and highlight) --- */
  const topAuthors = useMemo(() => {
    const map = new Map();
    finished.forEach((b) => {
      const a = (b?.author || "").trim();
      if (!a) return;
      map.set(a, (map.get(a) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [finished]);
  const mostReadAuthor = topAuthors[0] || null; // [name, count] or null

  /* --- averages / extremes for highlights (timeframe-aware) --- */
  const longest =
    finished.reduce(
      (best, b) => {
        const p = pagesTotal(b);
        return p > best.pages ? { title: b.title || "Untitled", pages: p } : best;
      },
      { title: null, pages: 0 }
    ) || { title: null, pages: 0 };

  const shortest =
    finished.reduce(
      (best, b) => {
        const p = pagesTotal(b);
        if (p <= 0) return best;
        if (best.pages === 0 || p < best.pages) return { title: b.title || "Untitled", pages: p };
        return best;
      },
      { title: null, pages: 0 }
    ) || { title: null, pages: 0 };

  const ratingWinner = finished
    .filter((b) => getRating(b) > 0)
    .sort((a, b) => {
      const rb = getRating(b) - getRating(a);
      if (rb !== 0) return rb;
      // tie-breaker: more pages, then most recent
      const p = pagesTotal(b) - pagesTotal(a);
      if (p !== 0) return p;
      const da = safeDate(a.endDate) || safeDate(a.startDate) || new Date(0);
      const db = safeDate(b.endDate) || safeDate(b.startDate) || new Date(0);
      return db.getTime() - da.getTime();
    })[0];

  const fastest = finished
    .map((b) => {
      const s = safeDate(b?.startDate);
      const e = safeDate(b?.endDate);
      if (!s || !e) return null;
      const d = daysBetween(s, e);
      if (d == null) return null;
      return { title: b.title || "Untitled", days: d };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days)[0] || { title: null, days: 0 };

  const slowest = finished
    .map((b) => {
      const s = safeDate(b?.startDate);
      const e = safeDate(b?.endDate);
      if (!s || !e) return null;
      const d = daysBetween(s, e);
      if (d == null) return null;
      return { title: b.title || "Untitled", days: d };
    })
    .filter(Boolean)
    .sort((a, b) => b.days - a.days)[0] || { title: null, days: 0 };

  // Most pages in a month (timeframe-aware)
  const mostPagesMonth = useMemo(() => {
    const pagesByMonth = Array(12).fill(0);
    finished.forEach((b) => {
      const d = safeDate(b?.endDate);
      const p = pagesTotal(b);
      if (!d || p <= 0) return;
      pagesByMonth[d.getMonth()] += p;
    });
    const maxPages = Math.max(...pagesByMonth, 0);
    const idx = maxPages > 0 ? pagesByMonth.indexOf(maxPages) : -1;
    return { monthIdx: idx, pages: maxPages };
  }, [finished]);

  /* --- Year-to-date tiles (ALWAYS this year, regardless of timeframe) --- */
  const yNow = new Date().getFullYear();
  const finishedThisYear = finishedAll.filter((b) => {
    const d = safeDate(b?.endDate) || safeDate(b?.startDate);
    return d && d.getFullYear() === yNow;
  });
  const ytdBooks = finishedThisYear.length;
  const ytdPages = finishedThisYear.reduce((sum, b) => sum + pagesTotal(b), 0);

  const ratedFinished = finished.map(getRating).filter((r) => r > 0);
  const avgRating =
    ratedFinished.length > 0
      ? (ratedFinished.reduce((a, b) => a + b, 0) / ratedFinished.length).toFixed(2)
      : "—";

  const goalPct = goal > 0 ? Math.min(100, Math.round((finishedCount / goal) * 100)) : 0;

  return (
    <div
      style={{
        fontFamily: "'Playfair Display', serif",
        padding: "2rem",
        backgroundColor: "#fffaf0",
        minHeight: "100vh",
        color: "#6b705c",
      }}
    >
      {/* Page Title */}
      <h1
        style={{
          fontFamily: "'Homemade Apple', cursive",
          fontSize: "3.2rem",
          marginBottom: "1rem",
          textAlign: "center",
          color: "#6b705c",
        }}
      >
        Reading Stats
      </h1>

      {/* timeframe + goal inline */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Timeframe:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              border: "1px solid #b7b7a4",
              background: "#fffaf0",
              borderRadius: 20,
              padding: "0.45rem 0.9rem",
              color: "#6b705c",
              fontFamily: "'Playfair Display', serif",
              fontSize: "1rem",
              appearance: "none",
            }}
          >
            <option value={TF.ALL}>All time</option>
            <option value={TF.YEAR}>This year</option>
            <option value={TF.MONTH}>This month</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Yearly goal (books):</span>
          <input
            type="number"
            min="0"
            value={goal || ""}
            onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
            placeholder="e.g., 24"
            style={{
              width: 110,
              border: "1px solid #b7b7a4",
              background: "#fffaf0",
              borderRadius: 20,
              padding: "0.45rem 0.9rem",
              color: "#6b705c",
              fontFamily: "'Playfair Display', serif",
              fontSize: "1rem",
              appearance: "none",
              MozAppearance: "textfield",
            }}
          />
        </label>
      </div>

      <Section title="Overview" defaultOpen>
        <Row>
          <StatCard label="Books Finished" value={finishedCount} />
          <StatCard label="Currently Reading" value={currentCount} />
          <StatCard label="TBR" value={tbrCount} />
          <StatCard label="Total Books" value={totalBooks} />
        </Row>
      </Section>

      <Section title="Pages">
        <Row>
          <StatCard label="Pages Read (Finished)" value={pagesFromFinished} />
          <StatCard label="Pages Read (In Progress)" value={pagesFromCurrent} />
          <StatCard label="Total Pages Read" value={totalPagesRead} highlight />
          <StatCard label="Pages Remaining (In Progress)" value={pagesRemainingInCurrent} />
        </Row>
      </Section>

      <Section title="Finished per Month">
        {/* right-aligned badge, chart centered below */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <div style={{ width: "min(740px, 100%)", display: "flex", justifyContent: "flex-end" }}>
            {perMonthMax > 0 && (
              <span
                style={{
                  background: "#f7efe3",
                  border: "1px solid #d9cfbf",
                  color: "#6b705c",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontWeight: 600,
                }}
              >
                Best month: {monthShort[perMonthCounts.indexOf(perMonthMax)]} ({perMonthMax})
              </span>
            )}
          </div>
        </div>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <MiniBars data={perMonthObj} max={perMonthMax} height={180} />
        </div>
      </Section>

      <Section title="Goals">
        <div style={{ marginBottom: 8 }}>
          <strong>Yearly goal:</strong> {goal || "—"} books
        </div>
        <div
          style={{
            height: 14,
            width: "100%",
            background: "#ece5d8",
            borderRadius: 999,
            border: "1px solid #dfd6c8",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${goalPct}%`,
              background: "#cb997e",
              transition: "width 0.25s ease",
            }}
          />
        </div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          {goal > 0 ? `${finishedCount}/${goal} (${goalPct}%)` : "Set a goal to track progress."}
        </div>
      </Section>

      <Section title="Ratings Breakdown">
        <Row>
          {Object.entries(ratingBuckets)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([r, count]) => (
              <StatCard key={r} label={`${r} ★`} value={count} />
            ))}
          <StatCard label="Average Rating" value={avgRating} highlight />
        </Row>
      </Section>

      <Section title="Top Authors">
        {topAuthors.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No finished books with authors yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {topAuthors.map(([author, count], idx) => (
              <div
                key={author}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.5rem 0",
                  borderBottom: idx !== topAuthors.length - 1 ? "1px solid #e5ded2" : "none",
                }}
              >
                <span style={{ fontWeight: 600, color: "#6b705c" }}>{author}</span>
                <span style={{ color: "#b08968" }}>{count} finished</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Highlights" defaultOpen>
        <Row>
          <StatCard
            label="Longest Finished Book"
            value={longest.pages > 0 ? `${longest.title} (${longest.pages} pages)` : "—"}
            wide
          />
          <StatCard
            label="Shortest Finished Book"
            value={shortest.pages > 0 ? `${shortest.title} (${shortest.pages} pages)` : "—"}
          />
          <StatCard
            label="Highest Rated Book"
            value={
              ratingWinner
                ? `${ratingWinner.title || "Untitled"} (${getRating(ratingWinner)}★)`
                : "—"
            }
          />
          <StatCard
            label="Fastest Read"
            value={fastest.days > 0 ? `${fastest.title} (${fastest.days} days)` : "—"}
          />
          <StatCard
            label="Slowest Read"
            value={slowest.days > 0 ? `${slowest.title} (${slowest.days} days)` : "—"}
          />
          <StatCard
            label="Most Read Author"
            value={
              mostReadAuthor
                ? `${mostReadAuthor[0]} — ${mostReadAuthor[1]} finished`
                : "—"
            }
          />
          <StatCard
            label="Most Pages in a Month"
            value={
              mostPagesMonth.monthIdx >= 0
                ? `${monthShort[mostPagesMonth.monthIdx]} (${mostPagesMonth.pages} pages)`
                : "—"
            }
          />
          <StatCard label="Books Finished This Year" value={ytdBooks} />
          <StatCard label="Pages Read This Year" value={ytdPages} />
        </Row>
      </Section>
    </div>
  );
}
