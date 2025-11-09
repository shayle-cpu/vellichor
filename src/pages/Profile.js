// src/pages/Profile.js
import React, { useMemo, useState, useEffect } from "react";
import { useBooks } from "../context/BookContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

import Book from "../components/Book";
import AvatarUploader from "../components/AvatarUploader";
import ProfileEditModal from "../components/ProfileEditModal";
import Achievements from "../components/Achievements";
import ReadingGoalCandle from "../components/ReadingGoalCandle";
import FriendButton from "../components/FriendButton";

import "../styles/Profile.css";
import "../styles/Achievements.css";

/* ---------- local helpers ---------- */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const mapShelf = (status) => {
  const raw = String(status ?? "").trim().toLowerCase();
  if (["currentlyreading", "current", "reading", "reading_now"].includes(raw)) return "currentlyReading";
  if (["finished", "done", "complete", "completed"].includes(raw)) return "finished";
  if (["dnf", "abandoned", "did not finish"].includes(raw)) return "dnf";
  return "tbr";
};
// tolerant tropes parsing
const toTropes = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") {
    const s = val.trim();
    try {
      if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      }
    } catch {}
    return s.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

// DB row -> app book
const fromRow = (r = {}) => ({
  id: r.id,
  title: r.title || "Untitled",
  authors: r.author || "",
  cover: r.cover_url || "",
  totalPages: toNum(r.total_pages),
  currentPage: toNum(r.current_page),
  genre: r.genre || "",
  rating: toNum(r.rating || 0),
  review: r.review || "",
  favorite: !!r.favorite,
  tropes: toTropes(r.tropes),
});

/* ---------- stats helpers ---------- */
function useReadingStats(shelves) {
  const finished = shelves?.finished || [];
  const currentlyReading = shelves?.currentlyReading || [];

  const finishedCount = finished.length;
  const currentlyCount = currentlyReading.length;

  const totalPagesRead = finished.reduce(
    (sum, b) => sum + (Number(b?.totalPages) || 0),
    0
  );

  const ratings = finished
    .map((b) => Number(b?.rating))
    .filter((n) => !isNaN(n));

  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : "0.0";

  return { finishedCount, currentlyCount, totalPagesRead, avgRating };
}

function pickFavorites(shelves, max = 20) {
  const all = [
    ...(shelves?.finished || []),
    ...(shelves?.currentlyReading || []),
    ...(shelves?.tbr || []),
  ];
  const favFlagged = all.filter((b) => b?.favorite === true);
  return favFlagged.slice(0, max);
}

/* ---------- page ---------- */
export default function Profile({ viewUserId, readOnly = false }) {
  const { shelves: myShelves } = useBooks();
  const { user } = useAuth();

  const effectiveUserId = viewUserId || user?.id;
  const viewingSelf = !!user?.id && effectiveUserId === user.id;
  const isReadOnly = readOnly || !viewingSelf;

  // local shelves only used when viewing someone else
  const [remoteShelves, setRemoteShelves] = useState(null);

  // profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [aboutTags, setAboutTags] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [goal, setGoal] = useState(50);

  // edit modal
  const [modalOpen, setModalOpen] = useState(false);

  /* ---- fetch profile for effective user ---- */
  useEffect(() => {
    if (!effectiveUserId) return;

    let cancelled = false;
    (async () => {
      const baseCols = "full_name, username, bio, about_tags, avatar_url";
      const extendedCols = `${baseCols}, reading_goal`;

      let resp = await supabase
        .from("profiles")
        .select(extendedCols)
        .eq("id", effectiveUserId)
        .maybeSingle();

      if (resp.error && /column .* does not exist/i.test(resp.error.message)) {
        resp = await supabase
          .from("profiles")
          .select(baseCols)
          .eq("id", effectiveUserId)
          .maybeSingle();
      }

      const { data, error } = resp;
      if (!cancelled && !error && data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAboutTags(Array.isArray(data.about_tags) ? data.about_tags : []);
        setAvatarUrl(data.avatar_url || "");
        const metaGoal = viewingSelf ? (user?.user_metadata?.reading_goal || 50) : 50;
        setGoal(toNum(data.reading_goal) || metaGoal);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId]);

  /* ---- fetch shelves when viewing someone else ---- */
  useEffect(() => {
    if (!effectiveUserId || viewingSelf) {
      setRemoteShelves(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const base =
        "id, title, author, cover_url, total_pages, current_page, genre, status, created_at";
      const withMeta = `${base}, rating, review, tropes, favorite`;

      let resp = await supabase
        .from("books")
        .select(withMeta)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (resp.error && /column .* does not exist/i.test(resp.error.message)) {
        resp = await supabase
          .from("books")
          .select(base)
          .eq("user_id", effectiveUserId)
          .order("created_at", { ascending: false });
      }

      const { data, error } = resp;
      if (!cancelled && !error) {
        const next = { currentlyReading: [], tbr: [], finished: [], dnf: [] };
        (data || []).forEach((r) => {
          const shelf = mapShelf(r.status);
          next[shelf].push(fromRow(r));
        });
        setRemoteShelves(next);
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveUserId, viewingSelf]);

  // Choose shelves
  const shelves = viewingSelf
    ? myShelves
    : (remoteShelves || { currentlyReading: [], tbr: [], finished: [], dnf: [] });

  const { finishedCount, currentlyCount, totalPagesRead, avgRating } =
    useReadingStats(shelves);

  const favorites = useMemo(() => pickFavorites(shelves, 20), [shelves]);

  const firstName = fullName ? fullName.split(" ")[0] : "Reader";
  const cursive = { fontFamily: "'Homemade Apple', cursive", fontWeight: 400 };

  return (
    <div className="profile-page">
      {/* ===== Header: LEFT info | MIDDLE candle | RIGHT about-card ===== */}
      <header
        className="profile-header"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px 340px",
          alignItems: "center",
          gap: "2rem",
          maxWidth: 1100,
          margin: "0 auto 1.25rem",
        }}
      >
        {/* LEFT: avatar + identity */}
        <div
          className="profile-left"
          style={{
            display: "grid",
            gridTemplateColumns: "96px 1fr",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          {isReadOnly ? (
            <img
              src={
                avatarUrl ||
                "https://api.dicebear.com/7.x/initials/svg?seed=" +
                  encodeURIComponent(firstName || "Reader")
              }
              alt={`${firstName}'s avatar`}
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid #b7b7a4",
              }}
            />
          ) : (
            <AvatarUploader size={96} />
          )}

          <div className="identity">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 className="name" style={{ margin: 0 }}>
                {fullName || "No name set"}
              </h1>

              {/* Self: edit button | Others: friend control */}
              {!isReadOnly ? (
                <button
                  className="edit-btn"
                  onClick={() => setModalOpen(true)}
                  aria-label="Edit profile"
                >
                  Edit profile
                </button>
              ) : (
                effectiveUserId && <FriendButton userId={effectiveUserId} />
              )}
            </div>

            <div className="username">
              {username ? `@${username}` : "Set a username"}
            </div>

            {bio && (
              <p className="bio" style={{ marginTop: ".35rem", marginBottom: ".35rem" }}>
                {bio}
              </p>
            )}
          </div>
        </div>

        {/* MIDDLE: reading goal candle */}
        <div className="profile-middle" style={{ display: "flex", justifyContent: "center" }}>
          <ReadingGoalCandle
            title={`${firstName}’s Reading Goal`}
            current={finishedCount}
            goal={goal || 50}
            maxHeight={180}
            showFraction
          />
        </div>

        {/* RIGHT: about card */}
        <div
          className="about-card"
          style={{
            background: "#ffe8d6",
            border: "1.5px solid #b7b7a4",
            borderRadius: 14,
            padding: "0.85rem 1rem",
            boxShadow: "2px 4px 10px rgba(0,0,0,.06)",
            minHeight: 90,
            display: "grid",
            alignContent: "start",
            gap: ".4rem",
            marginTop: "-.25rem",
          }}
        >
          <div
            style={{
              fontFamily: "'Homemade Apple', cursive",
              fontSize: "1.05rem",
              color: "#3f3a35",
            }}
          >
            {`about ${firstName || "you"}`}
          </div>

          {aboutTags?.length > 0 ? (
            <div
              className="about-pills"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {aboutTags.map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className="pill"
                  style={{
                    background: "#b7b7a4",
                    color: "#2d2a26",
                    border: "1px solid #b7b7a4",
                    borderRadius: 999,
                    padding: "0.25rem 0.6rem",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: ".95rem",
                    boxShadow: "0 2px 4px rgba(0,0,0,.05)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <div
              style={{
                color: "#6b705c",
                opacity: 0.9,
                fontSize: ".95rem",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {isReadOnly ? "—" : "Add a few tags in “Edit profile”."}
            </div>
          )}
        </div>
      </header>

      {/* ===== Achievements ===== */}
      <section className="achievements-section" style={{ maxWidth: 1100, margin: "0 auto 1.25rem" }}>
        <h2 className="section-title" style={cursive}>
          {firstName}’s Achievements
        </h2>
        <Achievements showTitle={false} />
      </section>

      {/* ===== Favorites Shelf ===== */}
      <section className="favorites" style={{ maxWidth: 1100, margin: "0 auto 1.25rem" }}>
        <h2 className="section-title" style={cursive}>
          {firstName}’s Favorite Books
        </h2>

        <div className="fav-shelf-wrap">
          <div className="fav-shelf-rail">
            {favorites.length === 0 ? (
              <div className="empty-note">No favorites yet</div>
            ) : (
              favorites.map((book, i) => (
                <div className="fav-book" key={book.id || `${book.title}-${i}`}>
                  <Book book={book} />
                </div>
              ))
            )}
          </div>
          <div className="wood-shelf" aria-hidden="true" />
        </div>
      </section>

      {/* ===== Reader Stats ===== */}
      <section className="reader-stats" style={{ maxWidth: 1100, margin: "0 auto 2rem" }}>
        <h2 className="section-title" style={cursive}>
          {firstName}’s Stats
        </h2>

        <div className="reader-stats-grid">
          <div className="rs-card">
            <div className="rs-label">Books Read This Year</div>
            <div className="rs-value">{finishedCount}</div>
          </div>
          <div className="rs-card">
            <div className="rs-label">Currently Reading</div>
            <div className="rs-value">{currentlyCount}</div>
          </div>
          <div className="rs-card">
            <div className="rs-label">Total Pages Read</div>
            <div className="rs-value">{totalPagesRead.toLocaleString()}</div>
          </div>
          <div className="rs-card">
            <div className="rs-label">Average Rating</div>
            <div className="rs-value">{avgRating}</div>
          </div>
        </div>
      </section>

      {/* ===== Edit Profile Modal (self only) ===== */}
      {!isReadOnly && (
        <ProfileEditModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={{
            full_name: fullName,
            username,
            bio,
            about_tags: aboutTags,
          }}
          onSaved={(u) => {
            setFullName(u.full_name || "");
            setUsername(u.username || "");
            setBio(u.bio || "");
            setAboutTags(u.about_tags || []);
          }}
        />
      )}
    </div>
  );
}
