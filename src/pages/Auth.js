// src/pages/Auth.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/Auth.css";
import logo from "../assets/logo.png";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

export default function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = React.useState("signin");

  // shared
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  // signup-only
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [checkingUser, setCheckingUser] = React.useState(false);
  const [usernameOk, setUsernameOk] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // forgot password modal
  const [showForgot, setShowForgot] = React.useState(false);

  // check username availability (case-insensitive)
  React.useEffect(() => {
    if (mode !== "signup") return;
    const u = username.trim().toLowerCase();
    if (!u) { setUsernameOk(false); return; }

    let cancelled = false;
    setCheckingUser(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", u)
          .maybeSingle();
        if (!cancelled) setUsernameOk(!data && !error);
      } finally {
        if (!cancelled) setCheckingUser(false);
      }
    }, 350);

    return () => { cancelled = true; clearTimeout(t); };
  }, [username, mode]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!firstName.trim()) throw new Error("First name is required.");
        if (!username.trim()) throw new Error("Please choose a username.");
        if (!usernameOk) throw new Error("That username is taken.");

        const fullName = `${firstName.trim()}${lastName ? " " + lastName.trim() : ""}`;

        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, username: username.trim().toLowerCase() } },
        });
        if (signUpErr) throw signUpErr;

        const userId = signUpData.user?.id;
        if (userId) {
          await supabase.from("profiles").upsert({
            id: userId,
            full_name: fullName,
            username: username.trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          });
        }

        alert("Check your email to confirm your account.");
        setMode("signin");
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        nav("/");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      {/* Logo above the card */}
      <img src={logo} alt="Vellichor" className="auth-logo" />

      <form className="auth-card" onSubmit={onSubmit}>
        <h1 className="auth-title">{mode === "signup" ? "Create account" : "Welcome back"}</h1>

        {mode === "signup" && (
          <div className="auth-grid">
            <label className="auth-label">
              First name <span className="req">*</span>
              <input
                className="auth-input"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g., Emma"
                required
              />
            </label>

            <label className="auth-label">
              Last name (optional)
              <input
                className="auth-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g., Johnson"
              />
            </label>

            <label className="auth-label" style={{ gridColumn: "1 / -1" }}>
              Username <span className="req">*</span>
              <div className="with-prefix">
                <span className="prefix">@</span>
                <input
                  className="auth-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                  placeholder="readingemily"
                  required
                />
                <span className="hint">
                  {checkingUser ? "Checking…" : username && !usernameOk ? "Taken" : username ? "Available" : ""}
                </span>
              </div>
            </label>
          </div>
        )}

        <label className="auth-label">
          Email <span className="req">*</span>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </label>

        <label className="auth-label">
          Password <span className="req">*</span>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {/* Forgot password (signin only) */}
        {mode === "signin" && (
          <div style={{ marginTop: "6px" }}>
            <button
              type="button"
              className="linky"
              onClick={() => setShowForgot(true)}
              style={{ padding: 0 }}
            >
              Forgot your password?
            </button>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button
          className="auth-button"
          type="submit"
          disabled={loading || (mode === "signup" && (!firstName.trim() || !username.trim() || !usernameOk || checkingUser))}
        >
          {loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"}
        </button>

        <div className="auth-switch">
          {mode === "signup" ? (
            <button type="button" className="linky" onClick={() => setMode("signin")}>
              Already have an account? Sign in
            </button>
          ) : (
            <button type="button" className="linky" onClick={() => setMode("signup")}>
              New here? Create an account
            </button>
          )}
        </div>
      </form>

      {/* Reset password modal */}
      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  );
}
