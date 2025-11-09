import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ResetPassword() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // When the user clicks the email link, Supabase will redirect here and
  // automatically create a recovery session. Then updateUser works.
  useEffect(() => {
    // Optional: you can verify a session exists
    // but updateUser will throw if not.
  }, []);

  const saveNewPassword = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!pw1 || pw1.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setMsg("Password updated! You can close this tab and sign in.");
    } catch (e2) {
      setErr(e2.message || "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 520, margin: "3rem auto", padding: "1rem" }}>
      <h1 style={{ marginTop: 0 }}>Set a new password</h1>
      <p>Enter your new password below.</p>

      <form onSubmit={saveNewPassword} style={{ display: "grid", gap: "12px" }}>
        <input
          type="password"
          placeholder="New password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          required
          style={{
            padding: ".7rem .9rem",
            borderRadius: "12px",
            border: "2px solid #b7b7a4",
            background: "#fffef8",
            fontFamily: "'Playfair Display', serif",
          }}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
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

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: ".8rem 1.2rem",
            borderRadius: "12px",
            border: "1px solid #c18f78",
            background: "#cb997e",
            color: "#fff",
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}
