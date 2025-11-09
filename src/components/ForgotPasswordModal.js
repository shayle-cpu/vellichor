import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;

  const reset = () => {
    setEmail("");
    setSubmitting(false);
    setMsg("");
    setErr("");
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const send = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!email.trim()) {
      setErr("Please enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      // IMPORTANT: this must match your app route below
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setMsg("Check your email for the reset link.");
    } catch (e2) {
      setErr(e2.message || "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fb-backdrop" onClick={close} />
      <div
        className="fb-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="fb-close" onClick={close} aria-label="Close">×</button>
        <h2 style={{ marginTop: 0 }}>Reset your password</h2>
        <p>Enter your account email and we’ll send you a reset link.</p>

        <form onSubmit={send} style={{ display: "grid", gap: "10px" }}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: ".7rem .9rem",
              borderRadius: "12px",
              border: "2px solid #b7b7a4",
              background: "#fffef8",
              fontFamily: "'Playfair Display', serif",
            }}
          />
          {err && <div style={{ color: "#b00020" }}>{err}</div>}
          {msg && <div style={{ color: "#2f6f3e" }}>{msg}</div>}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={close}
              style={{
                padding: ".55rem .9rem",
                borderRadius: "10px",
                border: "1px solid #b7b7a4",
                background: "#fffaf0",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: ".55rem .9rem",
                borderRadius: "10px",
                border: "1px solid #c18f78",
                background: "#cb997e",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {submitting ? "Sending…" : "Send link"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
