// src/components/AvatarUploader.js
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

function initialsFromName(name = "", email = "") {
  const n = String(name).trim();
  if (n) {
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || "").join("") || "U";
  }
  return String(email).slice(0, 2).toUpperCase();
}

export default function AvatarUploader({ size = 120 }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Load current avatar and name
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, username")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (!error && data) {
        setAvatarUrl(data.avatar_url || "");
        setFullName(data.full_name || "");
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setError("");
    setUploading(true);
    try {
      // 1) Require an existing profile with username (prevents NOT NULL failures)
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();
      if (profErr) throw profErr;
      if (!prof || !prof.username) {
        throw new Error("Please set your name & username first, then upload a photo.");
      }

      // 2) Upload to storage
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase
        .storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || `image/${ext}`,
        });
      if (upErr) throw upErr;

      // 3) Get public URL
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl || "";

      // 4) Update profile (use update, not upsert)
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
    } catch (err) {
      setError(err.message || "Could not upload avatar.");
    } finally {
      setUploading(false);
      // Allow selecting the same file again
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const initials = initialsFromName(fullName, user?.email || "");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#e8e1d6",
        boxShadow: "inset 0 0 0 3px #b7b7a4",
        position: "relative",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        userSelect: "none",
      }}
      aria-label="Profile photo"
    >
      {/* Avatar image or initials */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Profile"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: Math.round(size * 0.33),
            color: "#6b705c",
            letterSpacing: "1px",
          }}
        >
          {initials}
        </div>
      )}

      {/* Centered overlay button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background: uploading ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.18)",
          color: "#fff",
          fontFamily: "'Playfair Display', serif",
          fontSize: 14,
          fontWeight: 700,
          border: "none",
          cursor: uploading ? "default" : "pointer",
          opacity: uploading ? 0.9 : 0,
          transition: "opacity .2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = uploading ? "0.9" : "0")}
        aria-label="Change profile photo"
      >
        {uploading ? "Uploading…" : "Change"}
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {/* Error message (below circle) */}
      {error && (
        <div
          style={{
            position: "absolute",
            bottom: -22,
            left: 0,
            width: "100%",
            textAlign: "center",
            fontSize: 12,
            color: "#a33",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
