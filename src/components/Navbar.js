// src/components/Navbar.js
import React, { useEffect, useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../index.css";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import FeedbackModal from "./FeedbackModal";

export default function Navbar() {
  const loc = useLocation();              // 🔁 was `location` (conflicts with window.location rule)
  const nav = useNavigate();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    document.body.classList.add("sidebar-open");
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    document.body.classList.remove("sidebar-open");
  }, []);

  const toggle = () => (isOpen ? closeMenu() : openMenu());

  // close menu on route change
  useEffect(() => {
    if (isOpen) closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  // close on Esc, also close feedback
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeMenu();
        setFeedbackOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMenu]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      closeMenu();
      nav("/auth");
    }
  }

  const logoutBtnStyle = {
    fontFamily: "'Playfair Display', serif",
    background: "#cb997e",
    color: "#fff",
    border: "1px solid #c18f78",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
    marginTop: 8,
    transition: "background .2s ease-in-out, transform .05s ease-in-out",
  };

  const feedbackBtnStyle = {
    fontFamily: "'Playfair Display', serif",
    background: "#ddbea9",
    color: "#6b705c",
    border: "2px solid #b7b7a4",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
    marginTop: 10,
    transition: "background .2s ease-in-out, transform .05s ease-in-out, border-color .2s",
  };

  // If not logged in, route "View Profile" to /auth
  const profileTarget = user ? "/profile" : "/auth";
  const profileActive = loc.pathname === "/profile";

  return (
    <>
      {/* Hamburger */}
      <button
        className={`sidebar-toggle ${isOpen ? "open" : ""}`}
        onClick={toggle}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="app-sidebar"
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>

      {/* Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={closeMenu} aria-hidden="true" />}

      {/* Sidebar */}
      <nav
        id="app-sidebar"
        className={`sidebar ${isOpen ? "open" : ""}`}
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        {/* Top Logo */}
        <div className="sidebar-logo">
          <Link to="/" onClick={closeMenu} aria-label="Go to Home">
            <img src={logo} alt="Vellichor logo" />
          </Link>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: "1 1 auto" }}>
          <Link
            to="/library"
            className={`nav-link ${loc.pathname === "/library" ? "active" : ""}`}
            onClick={closeMenu}
          >
            My Library
          </Link>

          <Link
            to="/tbr-prompt"
            className={`nav-link ${loc.pathname === "/tbr-prompt" ? "active" : ""}`}
            onClick={closeMenu}
          >
            TBR Prompt
          </Link>

          <Link
            to="/series"
            className={`nav-link ${loc.pathname === "/series" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Series Tracker
          </Link>

          <Link
            to="/calendar"
            className={`nav-link ${loc.pathname === "/calendar" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Calendar
          </Link>

          <Link
            to="/challenges"
            className={`nav-link ${loc.pathname === "/challenges" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Challenges
          </Link>

          <Link
            to="/stats"
            className={`nav-link ${loc.pathname === "/stats" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Stats
          </Link>

          {/* NEW: Predictions */}
          <Link
            to="/predictions"
            className={`nav-link ${loc.pathname === "/predictions" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Predictions
          </Link>

          {/* Social */}
          <Link
            to="/people"
            className={`nav-link ${loc.pathname === "/people" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Find Readers
          </Link>

          <Link
            to="/friends"
            className={`nav-link ${loc.pathname === "/friends" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Friends
          </Link>

          {/* Community */}
          <Link
            to="/community"
            className={`nav-link ${loc.pathname === "/community" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Community
          </Link>

          {/* View Profile -> /profile if logged in, otherwise /auth */}
          <Link
            to={profileTarget}
            className={`nav-link ${profileActive ? "active" : ""}`}
            onClick={closeMenu}
          >
            View Profile
          </Link>
        </div>

        {/* Bottom Section */}
        <div style={{ paddingTop: 12, borderTop: "1px solid #e7e1d7" }}>
          {user ? (
            <>
              <div
                className="nav-link"
                style={{
                  opacity: 0.9,
                  cursor: "default",
                  fontFamily: "'Playfair Display', serif",
                  marginBottom: 6,
                }}
                title={user.email}
              >
                {user.email}
              </div>
              <button
                onClick={handleLogout}
                aria-label="Log out"
                style={logoutBtnStyle}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#b58872")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#cb997e")}
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className={`nav-link ${loc.pathname === "/auth" ? "active" : ""}`}
              onClick={closeMenu}
            >
              Log in / Sign up
            </Link>
          )}

          {/* Feedback button pinned at very bottom */}
          <button
            type="button"
            aria-label="Open feedback"
            style={feedbackBtnStyle}
            onClick={() => setFeedbackOpen(true)}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffe8d6";
              e.currentTarget.style.borderColor = "#cb997e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ddbea9";
              e.currentTarget.style.borderColor = "#b7b7a4";
            }}
          >
            Feedback
          </button>
        </div>
      </nav>

      {/* Feedback modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
