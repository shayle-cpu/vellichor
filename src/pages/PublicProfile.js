// src/pages/PublicProfile.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Profile from "./Profile"; // reuse your full profile UI

export default function PublicProfile() {
  const { username } = useParams();
  const [viewUserId, setViewUserId] = useState(null);
  const [displayName, setDisplayName] = useState(username);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        // Only select fields that exist in your table
        const { data, error: pErr } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .ilike("username", username)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!data) throw new Error("User not found.");

        if (!cancelled) {
          setViewUserId(data.id);
          setDisplayName(data.display_name || data.username || username);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return (
      <div className="bookshelf-page">
        <div className="library-hero">
          <h1 className="library-title">{displayName}</h1>
        </div>
        <p>Loading…</p>
      </div>
    );
  }

  if (error || !viewUserId) {
    return (
      <div className="bookshelf-page">
        <div className="library-hero">
          <h1 className="library-title">{displayName}</h1>
        </div>
        <div className="notice-card" style={{ marginTop: 8 }}>
          {error || "Not found."}
        </div>
      </div>
    );
  }

  // Render your full profile UI, but read-only, for this user
  return <Profile viewUserId={viewUserId} readOnly />;
}
