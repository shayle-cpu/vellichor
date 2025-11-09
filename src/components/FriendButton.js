// src/components/FriendButton.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Minimal friend system UI for a viewed user.
 * Table expected: public.friendships(requester uuid, addressee uuid, status text)
 * status: 'pending' | 'accepted' | 'declined' | 'blocked'
 */
export default function FriendButton({ userId }) {
  const { user } = useAuth();
  const me = user?.id;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!me || !userId || me === userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      const { data, error } = await supabase
        .from("friendships")
        .select("id, requester, addressee, status")
        .or(
          `and(requester.eq.${me},addressee.eq.${userId}),and(requester.eq.${userId},addressee.eq.${me})`
        )
        .maybeSingle();

      if (!cancelled) {
        if (error && error.code !== "PGRST116") setErr(error.message || "Error");
        setRow(data || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [me, userId]);

  if (!me || me === userId) return null;

  const isRequester = row && row.requester === me;
  const isAddressee = row && row.addressee === me;

  async function sendRequest() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("friendships")
      .insert([{ requester: me, addressee: userId, status: "pending" }])
      .select("id, requester, addressee, status")
      .single();
    if (error) setErr(error.message);
    setRow(data || null);
    setLoading(false);
  }

  async function cancelRequest() {
    if (!row?.id) return;
    setLoading(true);
    setErr("");
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    if (error) setErr(error.message);
    setRow(null);
    setLoading(false);
  }

  async function acceptRequest() {
    if (!row?.id) return;
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", row.id)
      .select("id, requester, addressee, status")
      .single();
    if (error) setErr(error.message);
    setRow(data || null);
    setLoading(false);
  }

  async function declineRequest() {
    if (!row?.id) return;
    setLoading(true);
    setErr("");
    // Either delete or mark declined; here we delete
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    if (error) setErr(error.message);
    setRow(null);
    setLoading(false);
  }

  async function unfriend() {
    if (!row?.id) return;
    setLoading(true);
    setErr("");
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    if (error) setErr(error.message);
    setRow(null);
    setLoading(false);
  }

  // UI states
  if (loading) {
    return (
      <button className="friend-btn" disabled>
        …
      </button>
    );
  }

  if (!row) {
    return (
      <button className="friend-btn" onClick={sendRequest} title="Add friend">
        + Add friend
      </button>
    );
  }

  if (row.status === "pending" && isRequester) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button className="friend-btn" disabled>Request sent</button>
        <button className="friend-btn friend-secondary" onClick={cancelRequest}>Cancel</button>
      </div>
    );
  }

  if (row.status === "pending" && isAddressee) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button className="friend-btn" onClick={acceptRequest}>Accept</button>
        <button className="friend-btn friend-secondary" onClick={declineRequest}>Decline</button>
      </div>
    );
  }

  if (row.status === "accepted") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button className="friend-btn" disabled>Friends ✓</button>
        <button className="friend-btn friend-secondary" onClick={unfriend}>Unfriend</button>
      </div>
    );
  }

  // fallback
  return (
    <button className="friend-btn" onClick={sendRequest}>
      + Add friend
    </button>
  );
}
