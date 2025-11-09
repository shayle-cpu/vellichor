// src/pages/Community.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";
import "../styles/Community.css";

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | reviews | quotes

  // Fetch profile & book for a single post (no DB joins required)
  const hydrateOne = useCallback(async (row) => {
    if (!row) return row;

    let profile = null;
    try {
      if (row.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", row.user_id)
          .single();
        profile = p || null;
      }
    } catch {
      profile = null;
    }

    let book = null;
    try {
      if (row.book_id) {
        const { data: b } = await supabase
          .from("books")
          .select("id, title, author, image_url, cover_url")
          .eq("id", row.book_id)
          .single();
        book = b || null;
      }
    } catch {
      book = null;
    }

    return { ...row, profile, book };
  }, []);

  // Initial load + realtime updates
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!alive) return;
      if (error) {
        console.error("[posts load]", error);
        setPosts([]);
        setLoading(false);
        return;
      }

      const hydrated = await Promise.all((data || []).map(hydrateOne));
      if (!alive) return;
      setPosts(hydrated);
      setLoading(false);
    })();

    const ch = supabase
      .channel("community-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        async (payload) => {
          if (!payload) return;
          if (payload.eventType === "INSERT") {
            const fresh = await hydrateOne(payload.new);
            setPosts((prev) => [fresh, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const fresh = await hydrateOne(payload.new);
            setPosts((prev) => {
              const copy = [...prev];
              const i = copy.findIndex((p) => p.id === fresh.id);
              if (i !== -1) copy[i] = fresh;
              return copy;
            });
          } else if (payload.eventType === "DELETE") {
            setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [hydrateOne]);

  // Composer → optimistic add
  const handleCreated = useCallback(
    async (row) => {
      const fresh = await hydrateOne(row);
      setPosts((prev) => [fresh, ...prev]);
    },
    [hydrateOne]
  );

  /* ---------- filtering & derived sections ---------- */
  const filtered = useMemo(() => {
    if (filter === "reviews") {
      return posts.filter((p) => /(^|\s)#review(\s|$)/i.test(p.content || ""));
    }
    if (filter === "quotes") {
      return posts.filter((p) => /(^|\s)#quote(\s|$)/i.test(p.content || ""));
    }
    return posts;
  }, [posts, filter]);

  const trending = useMemo(
    () => posts.filter((p) => /#review|#quote/i.test(p.content || "")).slice(0, 5),
    [posts]
  );

  const currentlyReading = useMemo(
    () =>
      posts
        .filter((p) => p.book_id)
        .slice(0, 9)
        .map((p) => ({ id: p.id, book_id: p.book_id })),
    [posts]
  );

  return (
    <main className="community-page">
      <h1 className="community-title">Community</h1>

      <div className="community-grid">
        {/* LEFT — Feed */}
        <section className="feed-col">
          <PostComposer onCreated={handleCreated} />

          <div className="feed-tabs">
            <button
              className={`tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
              type="button"
            >
              All
            </button>
            <button
              className={`tab ${filter === "reviews" ? "active" : ""}`}
              onClick={() => setFilter("reviews")}
              type="button"
            >
              Reviews
            </button>
            <button
              className={`tab ${filter === "quotes" ? "active" : ""}`}
              onClick={() => setFilter("quotes")}
              type="button"
            >
              Quotes
            </button>
          </div>

          {loading && <div className="feed-empty">Loading the latest posts…</div>}

          {!loading && filtered.length === 0 && (
            <div className="feed-empty">
              Nothing here yet. Try posting with tags like <strong>#review</strong>{" "}
              or <strong>#quote</strong>.
            </div>
          )}

          <div className="feed-list">
            {filtered.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onDeleted={() => setPosts((list) => list.filter((x) => x.id !== p.id))}
              />
            ))}
          </div>
        </section>

        {/* RIGHT — Sidebar */}
        <aside className="side-col">
          <SideCard title="Your Friends">
            <FriendsList />
          </SideCard>

          <SideCard title="Trending posts">
            {trending.length === 0 ? (
              <div className="side-muted">Nothing trending yet.</div>
            ) : (
              <ul className="trend-list">
                {trending.map((t) => (
                  <li key={t.id}>
                    <span className="dot" />
                    <span className="trend-text">{extractTrendText(t.content)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>

          <SideCard title="Currently Reading">
            <ReadingGrid items={currentlyReading} />
          </SideCard>
        </aside>
      </div>
    </main>
  );
}

/* ---------------- Sidebar helpers ---------------- */

function SideCard({ title, children }) {
  return (
    <div className="side-card">
      <div className="side-title">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function extractTrendText(content = "") {
  const line = String(content).split(/\r?\n/)[0].trim();
  return line.length > 80 ? line.slice(0, 80) + "…" : line || "Post";
}

function FriendsList() {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .limit(6);
      if (!alive) return;
      setFriends(data || []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!friends.length) {
    return <div className="side-muted">No friends found.</div>;
  }

  return (
    <ul className="friends-list">
      {friends.map((f) => (
        <li key={f.id}>
          <img
            src={f.avatar_url || "https://placehold.co/36x36"}
            alt=""
            className="friend-ava"
          />
          <div className="friend-meta">
            <div className="friend-name">{f.display_name || "Reader"}</div>
            <div className="friend-user">@{f.username || "user"}</div>
          </div>
          <span className="status-dot" />
        </li>
      ))}
    </ul>
  );
}

function ReadingGrid({ items }) {
  const [covers, setCovers] = useState({}); // book_id -> cover URL

  useEffect(() => {
    let alive = true;
    (async () => {
      const bookIds = [...new Set(items.map((i) => i.book_id))].slice(0, 9);
      if (!bookIds.length) return;
      const { data } = await supabase
        .from("books")
        .select("id, title, image_url, cover_url")
        .in("id", bookIds);
      if (!alive) return;
      const map = {};
      (data || []).forEach((b) => {
        map[b.id] = b.image_url || b.cover_url || "https://placehold.co/56x84";
      });
      setCovers(map);
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  if (!items.length) {
    return <div className="side-muted">No books yet.</div>;
  }

  const unique = [];
  const seen = new Set();
  items.forEach((i) => {
    if (!seen.has(i.book_id)) {
      seen.add(i.book_id);
      unique.push(i);
    }
  });

  return (
    <div className="reading-grid">
      {unique.slice(0, 9).map((i) => (
        <img
          key={i.book_id}
          src={covers[i.book_id] || "https://placehold.co/56x84"}
          alt=""
          className="reading-cover"
        />
      ))}
    </div>
  );
}
