import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/PeopleSearch.css";

export default function PeopleSearch() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  // debounced search
  useEffect(() => {
    if (!touched) return;
    const term = q.trim();
    if (!term) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url, library_public")
          .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
          .order("username", { ascending: true })
          .limit(30);

        if (!cancelled) {
          if (error) setError(error.message || "Search failed.");
          setRows(data || []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Search failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, touched]);

  const hasQuery = q.trim().length > 0;
  const resultTitle = useMemo(() => {
    if (loading) return "Searching…";
    if (!hasQuery) return "";
    return rows.length === 1 ? "1 result" : `${rows.length} results`;
  }, [loading, hasQuery, rows.length]);

  return (
    <div className="people-wrap">
      {/* Hero */}
      <div className="search-hero">
        <h1 className="search-title">Find Readers</h1>

        <div className="search-pill" role="search">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setTouched(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && setTouched(true)}
            placeholder="Search by username or name…"
            aria-label="Search for people"
            className="ps-input"
          />
          <button
            className="ps-button"
            type="button"
            onClick={() => setTouched(true)}
            aria-label="Search"
          >
            Search
          </button>
        </div>

        {!!resultTitle && <div className="result-title">{resultTitle}</div>}
      </div>

      {/* Error */}
      {error && (
        <div className="ps-error">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !hasQuery && (
        <div className="ps-empty">
          Start typing a name or <span className="mono">@username</span>.
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <ul className="ps-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <li className="ps-card skeleton" key={i}>
              <div className="avatar shimmer" />
              <div className="meta">
                <div className="line shimmer" />
                <div className="line short shimmer" />
              </div>
              <div className="actions">
                <div className="btn shimmer" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Results */}
      {!loading && hasQuery && rows.length > 0 && (
        <ul className="ps-list">
          {rows.map((p) => {
            const slug = p.username || p.id; // fallback to id just in case
            const display = p.display_name || p.username || "(no name)";
            const avatar =
              p.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                display
              )}`;

            return (
              <li className="ps-card" key={p.id}>
                <img className="avatar" src={avatar} alt={`${display} avatar`} />

                <div className="meta">
                  {/* Clickable name -> profile */}
                  <Link to={`/u/${slug}`} className="name">
                    {display}
                  </Link>
                  <div className="username">@{p.username || p.id}</div>
                  {p.bio && <div className="bio">{p.bio}</div>}
                </div>

                <div className="actions">
                  <Link to={`/u/${slug}`} className="soft-btn">
                    View Profile
                  </Link>

                  {p.library_public ? (
                    <Link to={`/u/${slug}/library`} className="confirm-btn">
                      View Library
                    </Link>
                  ) : (
                    <span className="lock-pill" title="Library is private">
                      🔒 Library private
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* No results */}
      {!loading && hasQuery && rows.length === 0 && !error && (
        <div className="ps-empty">No results for “{q.trim()}”.</div>
      )}
    </div>
  );
}
