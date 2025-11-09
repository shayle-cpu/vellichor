// src/components/PostCard.js
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import "../styles/PostCard.css";

/** Remove the "Poll:" block and its bullet options from content text */
function stripPollBlock(text = "") {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inPoll = false;

  for (const line of lines) {
    // start of poll block
    if (/^\s*Poll:\s*/i.test(line)) { inPoll = true; continue; }

    if (inPoll) {
      // skip option lines like "- Choice"
      if (/^\s*-\s+/.test(line)) continue;

      // a non-option line ends the poll block; include it and continue normally
      inPoll = false;
      if (line.trim()) out.push(line);
      continue;
    }

    // optionally hide a generic "New poll!" teaser line
    if (/^\s*New poll!?$/i.test(line.trim())) continue;

    out.push(line);
  }

  return out.join("\n").trim();
}

export default function PostCard({ post, onDeleted }) {
  const [author, setAuthor] = useState(post.profile || null);
  const [book, setBook] = useState(post.book || null);

  // likes
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [youLike, setYouLike] = useState(false);

  // comments
  const [cCount, setCCount] = useState(post.comment_count ?? 0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);

  // poll
  const options = Array.isArray(post.poll_options) ? post.poll_options.filter(Boolean) : [];
  const question = post.poll_question || null;
  const hasPoll = Boolean(question && options.length);
  const [voteCounts, setVoteCounts] = useState({}); // index -> count
  const [votedIndex, setVotedIndex] = useState(null);

  const [deleting, setDeleting] = useState(false);
  const [uid, setUid] = useState(null);

  // session uid
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data?.session?.user?.id || null;
      if (alive) setUid(id);
    })();
    return () => { alive = false; };
  }, []);

  // ---------- Fetch author/book if needed ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!author && post.user_id) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", post.user_id)
          .single();
        if (alive) setAuthor(data || null);
      }
      if (!book && post.book_id) {
        const { data } = await supabase
          .from("books")
          .select("id, title, author, image_url, cover_url")
          .eq("id", post.book_id)
          .single();
        if (alive) setBook(data || null);
      }
    })();
    return () => { alive = false; };
  }, [author, book, post.user_id, post.book_id]);

  // ---------- Image guard (avoid avatar-as-post) ----------
  const shouldShowImage = useCallback(() => {
    const src = (post?.image_url || "").trim();
    if (!src) return false;
    if (author?.avatar_url && src === author.avatar_url) return false;
    const looksLikePostAsset =
      /\/storage\/v1\/object\/public\/posts\//.test(src) ||
      /\.(png|jpe?g|gif|webp)$/i.test(src);
    return looksLikePostAsset;
  }, [post?.image_url, author?.avatar_url]);

  // ---------- Likes ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) return;
      const { data } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", uid)
        .maybeSingle();
      if (alive) setYouLike(!!data);
    })();
    return () => { alive = false; };
  }, [post.id, uid]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { count } = await supabase
        .from("post_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", post.id);
      if (alive && typeof count === "number") setLikeCount(count);
    })();
    return () => { alive = false; };
  }, [post.id]);

  const toggleLike = useCallback(async () => {
    if (!uid) return alert("Please sign in to like.");
    if (youLike) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", uid);
      setYouLike(false);
      setLikeCount((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: uid });
      setYouLike(true);
      setLikeCount((n) => n + 1);
    }
  }, [youLike, post.id, uid]);

  // ---------- Comments ----------
  const hydrateCommentsFallback = async (rows) => {
    const uids = [...new Set(rows.map((r) => r.user_id))];
    if (uids.length === 0) return rows;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", uids);

    const map = {};
    (profs || []).forEach((p) => { map[p.id] = p; });
    return rows.map((r) => ({ ...r, profiles: map[r.user_id] || null }));
  };

  const loadComments = useCallback(async () => {
    // try with relationship first (if you added FK)
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at, profiles(display_name, username, avatar_url)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      setComments(data);
      setCCount(data.length);
      return;
    }

    // fallback: no relationship — hydrate profiles manually
    const { data: raw, error: e2 } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (e2) return;
    const withProfiles = await hydrateCommentsFallback(raw || []);
    setComments(withProfiles);
    setCCount(withProfiles.length);
  }, [post.id]);

  const sendComment = useCallback(async () => {
    const body = newComment.trim();
    if (!body) return;

    const { data: u } = await supabase.auth.getUser();
    const me = u?.user;
    if (!me) return alert("Please sign in to comment.");

    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: me.id, content: body })
      .select("id, post_id, user_id, content, created_at")
      .single();

    if (error) return alert(error.message);

    // fetch my profile for proper avatar/name
    const { data: myp } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", me.id)
      .single();

    setComments((list) => [
      ...list,
      {
        ...data,
        profiles: myp || {
          display_name: "You",
          username: "",
          avatar_url: "",
        },
      },
    ]);
    setNewComment("");
    setCCount((n) => n + 1);
  }, [newComment, post.id]);

  const onToggleComments = useCallback(async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      await loadComments();
    }
  }, [showComments, comments.length, loadComments]);

  // ---------- Delete post ----------
  const handleDelete = useCallback(async () => {
    if (deleting) return;
    if (!window.confirm("Delete this post?")) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    setDeleting(false);
    if (error) return alert(error.message);
    onDeleted?.();
  }, [deleting, post.id, onDeleted]);

  // ---------- Poll: load votes ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!options.length) return;

      const { data: votes, error } = await supabase
        .from("post_votes")
        .select("choice, user_id")
        .eq("post_id", post.id);

      if (error) return;

      const map = {};
      (votes || []).forEach((v) => {
        const k = typeof v.choice === "number" ? v.choice : parseInt(v.choice, 10);
        if (!Number.isNaN(k)) map[k] = (map[k] || 0) + 1;
      });

      let mine = null;
      if (uid) {
        const found = (votes || []).find((v) => v.user_id === uid);
        if (found && found.choice !== undefined && found.choice !== null) {
          const k = typeof found.choice === "number" ? found.choice : parseInt(found.choice, 10);
          mine = Number.isNaN(k) ? null : k;
        }
      }

      if (alive) {
        setVoteCounts(map);
        setVotedIndex(mine);
      }
    })();

    const ch = supabase
      .channel(`realtime:post_votes:${post.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_votes", filter: `post_id=eq.${post.id}` },
        async () => {
          const { data: votes } = await supabase
            .from("post_votes")
            .select("choice, user_id")
            .eq("post_id", post.id);

          const map = {};
          (votes || []).forEach((v) => {
            const k = typeof v.choice === "number" ? v.choice : parseInt(v.choice, 10);
            if (!Number.isNaN(k)) map[k] = (map[k] || 0) + 1;
          });

          let mine = null;
          if (uid) {
            const found = (votes || []).find((v) => v.user_id === uid);
            if (found && found.choice !== undefined && found.choice !== null) {
              const k = typeof found.choice === "number" ? found.choice : parseInt(found.choice, 10);
              mine = Number.isNaN(k) ? null : k;
            }
          }

          setVoteCounts(map);
          setVotedIndex(mine);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      alive = false;
    };
  }, [post.id, options.length, uid]);

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0) || 0;

  const castVote = useCallback(
    async (idx) => {
      if (!uid) return alert("Please sign in to vote.");
      if (!Number.isInteger(idx)) return;

      if (votedIndex !== null) {
        await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", uid);
      }

      const { error } = await supabase
        .from("post_votes")
        .insert({ post_id: post.id, user_id: uid, choice: idx });

      if (error) return alert(error.message);

      setVoteCounts((m) => {
        const next = { ...m };
        if (votedIndex !== null && next[votedIndex] > 0) next[votedIndex] = next[votedIndex] - 1;
        next[idx] = (next[idx] || 0) + 1;
        return next;
      });
      setVotedIndex(idx);
    },
    [post.id, uid, votedIndex]
  );

  // --- body text (with poll text removed if a poll is attached) ---
  const safeBody = hasPoll ? stripPollBlock(post.content || "") : (post.content || "");

  return (
    <article className="post-card">
      <header className="post-head">
        <img
          className="post-avatar"
          src={author?.avatar_url || "https://placehold.co/44x44"}
          alt=""
        />
        <div className="post-head-meta">
          <div className="post-name">{author?.display_name || "Reader"}</div>
          <div className="post-meta">
            @{author?.username || "user"} • {new Date(post.created_at).toLocaleString()}
          </div>
        </div>
        <button className="post-del" onClick={handleDelete} disabled={deleting}>
          Delete
        </button>
      </header>

      {safeBody ? (
        <div className="post-body">
          <div className="post-text">{safeBody}</div>
        </div>
      ) : null}

      {book && (
        <div className="book-inline">
          <img
            className="post-book-cover"
            src={book.image_url || book.cover_url || "https://placehold.co/56x84"}
            alt=""
          />
          <div className="book-inline-meta">
            <div className="book-title">{book.title}</div>
            {book.author ? <div className="book-note">{book.author}</div> : null}
          </div>
        </div>
      )}

      {shouldShowImage() ? <img className="post-image" src={post.image_url} alt="" /> : null}

      {/* Poll */}
      {hasPoll ? (
        <div className="poll">
          <div className="poll-title">{question}</div>
          {options.map((label, i) => {
            const count = voteCounts[i] || 0;
            const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
            const you = votedIndex === i;
            return (
              <button
                key={i}
                type="button"
                className={`poll-opt${you ? " you" : ""}`}
                onClick={() => castVote(i)}
              >
                <span className="poll-fill" style={{ width: `${pct}%` }} />
                <span className="poll-label">
                  <span className="poll-option">{label}</span>
                  <span className="poll-pct">{pct}%</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Actions */}
      <div className="post-actions">
        <button
          type="button"
          className={`action ${youLike ? "active" : ""}`}
          onClick={toggleLike}
          aria-label="Like"
          title="Like"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 21s-7.5-4.35-9.33-8.58C1.48 9.87 3.24 7 6.16 7c1.85 0 3.04 1.07 3.84 2.16C10.8 8.07 11.99 7 13.84 7c2.92 0 4.68 2.87 3.49 5.42C19.5 16.65 12 21 12 21z"
              fill="currentColor"
            />
          </svg>
          <span>{likeCount}</span>
        </button>

        <button
          type="button"
          className="action"
          onClick={onToggleComments}
          aria-label="Comments"
          title="Comments"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path d="M21 6H3v12h4v4l4-4h10z" fill="currentColor" />
          </svg>
          <span>{cCount}</span>
        </button>

        <button
          type="button"
          className="action"
          aria-label="Report"
          title="Report"
          onClick={() => alert("Report reasons modal coming next.")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l10 19H2L12 2zm0 5l-1 7h2l-1-7zm0 9a1 1 0 100 2 1 1 0 000-2z" fill="currentColor" />
          </svg>
          <span>Report</span>
        </button>
      </div>

      {/* Comments */}
      {showComments ? (
        <>
          <div className="comments">
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <img
                  src={c.profiles?.avatar_url || "https://placehold.co/36x36"}
                  alt=""
                  className="comment-ava"
                />
                <div className="comment-bubble">
                  <div className="comment-head">
                    <div className="comment-name">{c.profiles?.display_name || "Reader"}</div>
                    <div className="comment-meta">
                      @{c.profiles?.username || "user"} • {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="comment-text">{c.content}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="comment-new">
            <input
              className="comment-input"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendComment();
                }
              }}
            />
            <button
              className="comment-send"
              type="button"
              aria-label="Send comment"
              title="Send"
              onClick={sendComment}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
}
