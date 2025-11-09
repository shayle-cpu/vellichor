// src/components/Achievements.js
import React from "react";
import { useAchievements } from "../context/AchievementsContext";
import { BADGES } from "../utils/achievementsUtils";
import "../styles/Achievements.css";

/* Auto-import all .png icons from /assets/badges */
function loadIcons() {
  try {
    const ctx = require.context("../assets/badges", false, /\.png$/);
    const map = {};
    ctx.keys().forEach((k) => {
      const file = k.replace("./", "");
      const name = file.replace(/\.png$/i, "");
      map[name] = ctx(k);
    });
    return map;
  } catch {
    return {};
  }
}
const ICONS = loadIcons();

/* Map achievement IDs -> your icon filenames (no .png) */
const ICON_NAME_BY_ID = {
  // ✅ Added this line for the missing badge:
  first_finish: "FirstBookFinished",

  page_turner_1k: "PageTurner",
  marathon_10k: "MarathonReader",
  new_year: "NewYearNewChapter",
  genre_5: "GenreExplorer",
  rereader: "ReReader",
  speed_reader: "SpeedReader",

  // Optional extras you listed (these will be used if you add badges with these IDs)
  genre_crusher: "GenreCrusher",
  goal_crusher: "GoalCrusher",
  mystery_maven: "MysteryMaven",
  nonfiction_nerd: "NonfictionNerd",
  romance_reader: "RomanceReader",
  seasonal_reader: "SeasonalReader",
  series_slayer: "SeriesSlayer",
  short_and_sweet: "ShortandSweet",
};

function iconForId(id) {
  const name = ICON_NAME_BY_ID[id];
  if (!name) return null;
  const src = ICONS[name];
  if (!src) {
    console.warn(
      `[Achievements] Icon not found for id="${id}" -> expected "${name}.png" in src/assets/badges/`
    );
  }
  return src || null;
}

function useEarnedDates() {
  const [dates, setDates] = React.useState({});
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("pt_achievements_dates_v1");
      setDates(raw ? JSON.parse(raw) : {});
    } catch {
      setDates({});
    }
  }, []);
  return dates;
}

function formatDate(iso) {
  if (!iso) return "Date unknown";
  const d = new Date(iso);
  return isNaN(d)
    ? "Date unknown"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function Achievements({ showTitle = true }) {
  const { earned, resetAchievements } = useAchievements();
  const earnedSet = new Set(earned);
  const earnedDates = useEarnedDates();

  const [openId, setOpenId] = React.useState(null);
  const [clickingId, setClickingId] = React.useState(null);

  const openBadge = (id) => {
    setClickingId(id);
    setTimeout(() => setClickingId(null), 260);
    setOpenId(id);
  };
  const closeBadge = () => setOpenId(null);

  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = openId ? BADGES.find((b) => b.id === openId) : null;
  const date = openId ? earnedDates[openId] : null;

  return (
    <section className="ach-section">
      <div className="ach-heading-row">
        {showTitle && <h2 className="ach-heading">Achievements</h2>}
        <button
          className="ach-reset-link"
          onClick={() => {
            if (
              window.confirm(
                "Reset achievements from now? Past progress won’t count."
              )
            ) {
              resetAchievements();
            }
          }}
        >
          Reset
        </button>
      </div>

      <div className="ach-grid circles">
        {BADGES.map((b) => {
          const isEarned = earnedSet.has(b.id);
          const clickable = isEarned;
          const isClicking = clickingId === b.id;
          const iconSrc = isEarned ? iconForId(b.id) : null;

          return (
            <article
              key={b.id}
              className={[
                "ach-card",
                isEarned ? "earned" : "locked",
                isClicking ? "clicked" : "",
              ].join(" ")}
              role={clickable ? "button" : "img"}
              tabIndex={clickable ? 0 : -1}
              onClick={clickable ? () => openBadge(b.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") openBadge(b.id);
                    }
                  : undefined
              }
              aria-label={
                clickable ? `${b.name}, view details` : "Locked achievement"
              }
              style={{ overflow: "hidden", padding: 0 }}
            >
              {isEarned && iconSrc && (
                <img
                  src={iconSrc}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "50%",
                  }}
                />
              )}
            </article>
          );
        })}
      </div>

      {meta && (
        <>
          <div className="fb-backdrop ach-backdrop" onClick={closeBadge} />
          <div
            className="fb-modal ach-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${meta.name} details`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
            data-open="true"
          >
            {iconForId(meta.id) && (
              <img
                src={iconForId(meta.id)}
                alt=""
                aria-hidden="true"
                style={{
                  width: 88,
                  height: 88,
                  objectFit: "contain",
                  display: "block",
                  margin: "6px auto 8px",
                }}
              />
            )}
            <button className="fb-close" onClick={closeBadge} aria-label="Close">
              ×
            </button>
            <h3 className="fb-title" style={{ marginBottom: 6 }}>
              {meta.name}
            </h3>
            <p className="fb-sub" style={{ marginBottom: 10 }}>
              {meta.desc}
            </p>
            <div
              style={{ fontFamily: "'Playfair Display', serif", color: "#6b705c" }}
            >
              <strong>Completed:</strong> {formatDate(date)}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
