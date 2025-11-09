// src/components/FeedbackModal.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../styles/Feedback.css";

const CATEGORY_OPTIONS = [
  { value: "issue", label: "Issue / Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

export default function FeedbackModal({ open, onClose }) {
  const { user } = useAuth();

  const [category, setCategory] = useState("issue");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Reset form whenever we open/close
  useEffect(() => {
    if (open) {
      setCategory("issue");
      setMessage("");
      setEmail(user?.email || "");
      setSubmitting(false);
      setDone(false);
      setError("");
    }
  }, [open, user?.email]);

  if (!open) return null;

  const closeAndReset = () => {
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = message.trim();
    if (!msg) {
      setError("Please describe your feedback.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: user?.id || null,
        email: email?.trim() || null,
        category, // 'issue' | 'feature' | 'idea' | 'other'
        message: msg,
        page_path: window.location?.pathname || "/",
        created_at: new Date().toISOString(),
      };

      const { error: dbErr } = await supabase.from("feedback").insert(payload);
      if (dbErr) throw dbErr;

      setDone(true);
      // Auto-close after a moment
      setTimeout(closeAndReset, 1200);
    } catch (err) {
      // Common friendly message if table/column missing
      const msg =
        /schema cache|does not exist|column .* does not exist/i.test(
          String(err?.message || "")
        )
          ? "The feedback box isn’t fully set up on the server yet. Ask the dev to create the `public.feedback` table with columns: user_id, email, category, message, page_path, created_at."
          : err?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fb-backdrop" onClick={closeAndReset} />
      <div
        className="fb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="fb-close" onClick={closeAndReset} aria-label="Close">
          ×
        </button>

        <h2 className="fb-title">Send Feedback</h2>
        <p className="fb-sub">
          Tell us about issues, ideas, or features you want.
        </p>

        <form className="fb-form" onSubmit={handleSubmit}>
          <label className="fb-field">
            <span>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fb-field">
            <span>Feedback</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's going on? What would you like to see?"
              rows={5}
            />
          </label>

          <label className="fb-field">
            <span>Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {error && <div className="fb-error">{error}</div>}
          {done && <div className="fb-success">Your feedback has been submitted. Thank you! </div>}

          <div className="fb-actions">
            <button
              type="button"
              className="fb-btn secondary"
              onClick={closeAndReset}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="fb-btn"
              disabled={submitting}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
