// src/components/PostComposer.js
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function PostComposer({ onCreated }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  // Poll builder state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);

  const addPollChoice = () => setPollOpts((o) => [...o, ""]);
  const updateOpt = (i, val) =>
    setPollOpts((o) => o.map((v, idx) => (idx === i ? val : v)));
  const clearPoll = () => {
    setShowPoll(false);
    setPollQ("");
    setPollOpts(["", ""]);
  };

  const insertPollPreviewIntoContent = () => {
    const lines = [
      `Poll: ${pollQ || ""}`.trim(),
      ...pollOpts.filter((o) => o.trim()).map((o) => `- ${o.trim()}`),
    ].filter(Boolean);
    if (!lines.length) return;
    setContent((c) => (c.trim() ? c + "\n\n" : "") + lines.join("\n"));
    setShowPoll(false);
  };

  async function handleSubmit() {
    if (posting) return;
    const body = content.trim();

    // build poll fields (null if empty)
    const q = pollQ.trim();
    const opts = pollOpts.map((o) => o.trim()).filter(Boolean);
    const hasPoll = q || opts.length >= 2;

    if (!body && !hasPoll) return; // nothing to post

    setPosting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user?.id || null,
      content: body || null,
      book_id: null,
      image_url: null,
      // crucial: save poll fields so PostCard can render bars
      poll_question: q || null,
      poll_options: opts.length ? opts : null, // text[] or jsonb in DB
    };

    const { data, error } = await supabase
      .from("posts")
      .insert(payload)
      .select()
      .single();

    setPosting(false);

    if (error) {
      alert(error.message);
      return;
    }

    // reset
    setContent("");
    clearPoll();
    onCreated?.(data);
  }

  return (
    <div className="np-composer np-composer--community">
      <div className="np-top">
        <div className="np-title">New post</div>
        <button
          className="np-share"
          type="button"
          disabled={posting}
          onClick={handleSubmit}
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>

      <textarea
        className="np-textarea"
        placeholder="What do you want to say?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="np-tools">
        <span className="np-tags-label">Add:</span>
        <div className="np-chips">
          <button className="np-chip" type="button" disabled>
            Book
          </button>
          <button className="np-chip" type="button" disabled>
            Quote
          </button>
          <button
            className="np-chip"
            type="button"
            onClick={() => setShowPoll((s) => !s)}
          >
            Poll
          </button>
        </div>

        <div className="np-icons" aria-hidden>
          <div className="np-icon">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M12 5a7 7 0 100 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm1-8H8v2h3v3h2v-3h3V9h-3V6h-2v3z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>

      {showPoll && (
        <div className="composer-poll" style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              className="np-textarea"
              style={{ minHeight: 44 }}
              placeholder="Ask a question…"
              value={pollQ}
              onChange={(e) => setPollQ(e.target.value)}
            />

            {pollOpts.map((v, i) => (
              <input
                key={i}
                className="np-textarea"
                style={{ minHeight: 44 }}
                placeholder={`Choice ${i + 1}`}
                value={v}
                onChange={(e) => updateOpt(i, e.target.value)}
              />
            ))}

            <button
              type="button"
              className="np-chip"
              onClick={addPollChoice}
              style={{ width: "fit-content" }}
            >
              + Add choice
            </button>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="np-chip" type="button" onClick={clearPoll}>
                Cancel
              </button>
              <button
                className="np-share"
                type="button"
                onClick={insertPollPreviewIntoContent}
              >
                Insert poll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
