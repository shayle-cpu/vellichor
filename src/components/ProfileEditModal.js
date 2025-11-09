// src/components/ProfileEditModal.js
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import DeleteAccountModal from "./DeleteAccountModal";

export default function ProfileEditModal({
  open,
  onClose,
  initial = { full_name: "", username: "", bio: "", about_tags: [] },
  onSaved, // (updated) => void
}) {
  const { user } = useAuth();

  // fields
  const [nameInput, setNameInput] = useState(initial.full_name || "");
  const [userInput, setUserInput] = useState(initial.username || "");
  const [bioInput, setBioInput] = useState(initial.bio || "");
  const [tags, setTags] = useState(
    Array.isArray(initial.about_tags) ? initial.about_tags : []
  );
  const [tagInput, setTagInput] = useState("");

  // username availability
  const [checkingUser, setCheckingUser] = useState(false);
  const [userOk, setUserOk] = useState(true);

  // save state
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // delete modal
  const [showDelete, setShowDelete] = useState(false);

  const dialogRef = useRef(null);

  // open -> hydrate from initial
  useEffect(() => {
    if (!open) return;
    setNameInput(initial.full_name || "");
    setUserInput(initial.username || "");
    setBioInput(initial.bio || "");
    setTags(Array.isArray(initial.about_tags) ? initial.about_tags : []);
    setTagInput("");
    setErr("");
    setUserOk(true);

    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initial, onClose]);

  // debounced username availability check
  useEffect(() => {
    if (!open) return;
    const val = (userInput || "").trim();
    if (!val) {
      setUserOk(false);
      return;
    }

    let cancelled = false;
    setCheckingUser(true);

    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username")
          .ilike("username", val)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // if query error, don't block the user
          setUserOk(true);
        } else {
          // ok if none found or the found row is the current user
          setUserOk(!data || data.id === user?.id);
        }
      } finally {
        if (!cancelled) setCheckingUser(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, userInput, user?.id]);

  // tag helpers
  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    // prevent duplicates (case-insensitive)
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (i) => setTags((prev) => prev.filter((_, idx) => idx !== i));

  // save profile
  async function save() {
    setErr("");

    const name = nameInput.trim();
    const uname = userInput.trim();

    if (!name) {
      setErr("Please enter your name.");
      return;
    }
    if (!uname) {
      setErr("Please choose a username.");
      return;
    }
    if (!userOk) {
      setErr("That username is taken.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: name,
        username: uname,
        bio: bioInput || "",
        about_tags: tags,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      onSaved?.(payload);
      onClose?.();
    } catch (e) {
      setErr(e.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  // derive status pill text/class
  const statusText = checkingUser
    ? "Checking…"
    : userInput
    ? userOk
      ? "Available"
      : "Unavailable"
    : "";

  const statusClass =
    checkingUser ? "checking" : userInput ? (userOk ? "ok" : "bad") : "";

  return (
    <>
      <div className="profile-modal-backdrop" onClick={onClose}>
        <div
          className="profile-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          ref={dialogRef}
        >
          {/* Head */}
          <div className="profile-modal-head">
            <h3>Edit profile</h3>
            <button className="modal-x" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {/* Body */}
          <div className="profile-modal-body">
            {/* Full name */}
            <label className="edit-label">Full name</label>
            <input
              className="edit-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Full name"
            />

            {/* Username with inline @ and availability pill */}
            <label className="edit-label">Username</label>
            <div className={`username-field ${statusClass}`}>
              <span className="at">@</span>
              <input
                className="edit-input username-input"
                value={userInput}
                onChange={(e) =>
                  setUserInput(e.target.value.replace(/\s+/g, "").toLowerCase())
                }
                placeholder="e.g., booklover"
              />
              {statusText && <span className="status-pill">{statusText}</span>}
            </div>

            {/* Bio */}
            <label className="edit-label">Bio</label>
            <textarea
              className="edit-textarea"
              rows={3}
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder="Tell other readers about you…"
            />

            {/* About the reader (tags) */}
            <label className="edit-label">About the reader</label>
            <div className="pill-editor">
              <input
                className="edit-input"
                style={{ maxWidth: 260 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g., Romance, Audiobooks, Night Reader"
              />
              <button type="button" className="pill-add-btn" onClick={addTag}>
                Add
              </button>
            </div>

            {tags.length > 0 && (
              <div className="pill-list">
                {tags.map((t, i) => (
                  <span key={`${t}-${i}`} className="pill removable">
                    {t}
                    <button
                      type="button"
                      className="pill-x"
                      aria-label={`Remove ${t}`}
                      onClick={() => removeTag(i)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Error */}
            {err && (
              <div className="edit-error" style={{ marginTop: 6 }}>
                {err}
              </div>
            )}
          </div>

          {/* Foot */}
          <div
            className="profile-modal-foot"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {/* Left side: red delete button */}
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              style={{
                marginRight: "auto",
                background: "#c05746",
                color: "#fff",
                border: "1px solid #b04c3b",
                borderRadius: 10,
                padding: ".25rem .5rem",
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Delete account
            </button>

            {/* Right side: cancel/save */}
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-btn"
              onClick={save}
              disabled={saving || checkingUser || !userOk}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Delete account dialog mounted here */}
      <DeleteAccountModal open={showDelete} onClose={() => setShowDelete(false)} />
    </>
  );
}
