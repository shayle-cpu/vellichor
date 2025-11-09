// src/pages/Friends.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../styles/Friends.css";

/**
 * Schema-flexible friends page
 * (same logic as before; just nicer UI)
 */

const TABLE_CANDIDATES = ["friendships", "friends", "friend_requests"];
const FROM_CANDIDATES = [
  "from_id",
  "requester_id",
  "requester",
  "from_user",
  "sender_id",
  "user_id",
];
const TO_CANDIDATES = [
  "to_id",
  "addressee_id",
  "addressee",
  "to_user",
  "recipient_id",
  "friend_id",
];
const STATUS_KEYS = ["status", "state"];
const ACCEPT_BOOL = ["accepted", "is_accepted"];
const ACCEPT_AT = ["accepted_at"];

function pickKey(candidates, sampleRow) {
  if (!sampleRow) return null;
  const keys = Object.keys(sampleRow);
  return candidates.find((k) => keys.includes(k)) || null;
}
function classifyAcceptance(row) {
  for (const k of STATUS_KEYS) {
    if (k in row) {
      const v = String(row[k] ?? "").toLowerCase();
      if (v === "accepted") return { accepted: true, pending: false };
      if (v === "pending" || v === "") return { accepted: false, pending: true };
      if (["declined", "rejected", "cancelled", "canceled"].includes(v))
        return { accepted: false, pending: false };
    }
  }
  for (const k of ACCEPT_BOOL) if (k in row) return { accepted: !!row[k], pending: !row[k] };
  for (const k of ACCEPT_AT) if (k in row) return { accepted: !!row[k], pending: !row[k] };
  return { accepted: false, pending: true };
}

export default function Friends() {
  const { user } = useAuth();
  const userId = user?.id;

  const [tableUsed, setTableUsed] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [profiles, setProfiles] = useState({}); // id -> profile

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    setRawRows([]);
    setProfiles({});

    (async () => {
      let rows = [];
      let activeTable = null;

      for (const t of TABLE_CANDIDATES) {
        let res = await supabase.from(t).select("*").order("created_at", { ascending: false });
        if (res.error) res = await supabase.from(t).select("*");
        if (!res.error) {
          rows = res.data || [];
          activeTable = t;
          break;
        }
      }
      if (cancelled) return;

      if (!activeTable) {
        setErr("No friends table found.");
        setLoading(false);
        return;
      }

      const sample = rows[0] || {};
      const fromKey = pickKey(FROM_CANDIDATES, sample);
      const toKey = pickKey(TO_CANDIDATES, sample);

      const mine = rows.filter(
        (r) => (fromKey && r[fromKey] === userId) || (toKey && r[toKey] === userId)
      );

      setTableUsed(activeTable);
      setRawRows(mine);

      const otherIds = new Set();
      for (const r of mine) {
        const fromId = fromKey ? r[fromKey] : null;
        const toId = toKey ? r[toKey] : null;
        const other = fromId === userId ? toId : fromId;
        if (other) otherIds.add(other);
      }

      if (otherIds.size) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .in("id", [...otherIds]);
        if (!cancelled && !pErr) {
          const map = {};
          for (const p of profs || []) map[p.id] = p;
          setProfiles(map);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const buckets = useMemo(() => {
    const out = { incoming: [], outgoing: [], accepted: [] };
    if (!userId || rawRows.length === 0) return out;

    const anyRow = rawRows[0] || {};
    const fromKey = pickKey(FROM_CANDIDATES, anyRow);
    const toKey = pickKey(TO_CANDIDATES, anyRow);

    for (const r of rawRows) {
      const { accepted, pending } = classifyAcceptance(r);
      const fromId = fromKey ? r[fromKey] : null;
      const toId = toKey ? r[toKey] : null;

      if (pending) {
        if (toId === userId) out.incoming.push({ row: r, fromId, toId });
        else out.outgoing.push({ row: r, fromId, toId });
      } else if (accepted) {
        out.accepted.push({ row: r, fromId, toId });
      }
    }
    return out;
  }, [rawRows, userId]);

  const counts = {
    incoming: buckets.incoming.length,
    outgoing: buckets.outgoing.length,
    friends: buckets.accepted.length,
  };

  async function tryUpdate(id, payloads) {
    for (const patch of payloads) {
      const { error } = await supabase.from(tableUsed).update(patch).eq("id", id);
      if (!error) return true;
    }
    return false;
  }
  async function accept(id) {
    const ok = await tryUpdate(id, [
      { status: "accepted" },
      { state: "accepted" },
      { accepted: true },
      { is_accepted: true },
      { accepted_at: new Date().toISOString() },
    ]);
    if (ok)
      setRawRows((rows) =>
        rows.map((r) =>
          r.id === id
            ? { ...r, status: "accepted", accepted: true, accepted_at: new Date().toISOString() }
            : r
        )
      );
  }
  async function decline(id) {
    const ok = await tryUpdate(id, [{ status: "declined" }, { state: "declined" }]);
    if (ok) {
      setRawRows((rows) => rows.map((r) => (r.id === id ? { ...r, status: "declined" } : r)));
      return;
    }
    const { error } = await supabase.from(tableUsed).delete().eq("id", id);
    if (!error) setRawRows((rows) => rows.filter((r) => r.id !== id));
  }
  async function cancel(id) {
    const ok = await tryUpdate(id, [{ status: "cancelled" }, { state: "cancelled" }]);
    if (ok) {
      setRawRows((rows) => rows.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
      return;
    }
    const { error } = await supabase.from(tableUsed).delete().eq("id", id);
    if (!error) setRawRows((rows) => rows.filter((r) => r.id !== id));
  }
  async function unfriend(id) {
    const { error } = await supabase.from(tableUsed).delete().eq("id", id);
    if (!error) setRawRows((rows) => rows.filter((r) => r.id !== id));
  }

  const Person = ({ uid }) => {
    const p = profiles[uid];
    const name = p?.display_name || p?.username || "Reader";
    const slug = p?.username || uid;
    const avatar =
      p?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    return (
      <div className="friend-person">
        <img src={avatar} alt={`${name} avatar`} className="friend-avatar" />
        <div className="friend-person-meta">
          <Link to={`/u/${slug}`} className="friend-name">
            {name}
          </Link>
          {p?.username && <div className="friend-handle">@{p.username}</div>}
        </div>
      </div>
    );
  };

  const Section = ({ title, count, children, action }) => (
    <section className="friend-section">
      <div className="friend-section-head">
        <h2 className="friend-section-title">{title}</h2>
        <span className="chip">{count}</span>
        {action}
      </div>
      <div className="friend-section-body">{children}</div>
    </section>
  );

  return (
    <div className="friends-page">
      <div className="friends-hero">
        <div>
          <h1 className="friends-title">Friends</h1>
          <p className="friends-sub">Connect with readers you know and love.</p>
        </div>
        <div className="friends-chips">
          <span className="chip">Incoming: {counts.incoming}</span>
          <span className="chip">Sent: {counts.outgoing}</span>
          <span className="chip">Friends: {counts.friends}</span>
        </div>
      </div>

      {err && <div className="friends-error">{err}</div>}

      {/* Requests (incoming) */}
      <Section title="Requests" count={counts.incoming}>
        {loading ? (
          <div className="muted">Loading…</div>
        ) : buckets.incoming.length === 0 ? (
          <div className="muted">No pending requests</div>
        ) : (
          <ul className="friend-list">
            {buckets.incoming.map(({ row, fromId }) => (
              <li key={row.id} className="friend-row">
                <Person uid={fromId} />
                <div className="row-actions">
                  <button className="btn btn-primary" onClick={() => accept(row.id)}>
                    Accept
                  </button>
                  <button className="btn btn-ghost" onClick={() => decline(row.id)}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Outgoing */}
      <Section
        title="Requests You Sent"
        count={counts.outgoing}
        action={
          <Link to="/people" className="linky">
            + Find People
          </Link>
        }
      >
        {loading ? (
          <div className="muted">Loading…</div>
        ) : buckets.outgoing.length === 0 ? (
          <div className="muted">No outgoing requests</div>
        ) : (
          <ul className="friend-list">
            {buckets.outgoing.map(({ row, toId }) => (
              <li key={row.id} className="friend-row">
                <Person uid={toId} />
                <button className="btn btn-ghost" onClick={() => cancel(row.id)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Friends */}
      <Section title="Your Friends" count={counts.friends}>
        {loading ? (
          <div className="muted">Loading…</div>
        ) : buckets.accepted.length === 0 ? (
          <div className="muted">You don’t have friends yet.</div>
        ) : (
          <ul className="friend-list">
            {buckets.accepted.map(({ row, fromId, toId }) => {
              const other = fromId === userId ? toId : fromId;
              return (
                <li key={row.id} className="friend-row">
                  <Person uid={other} />
                  <button className="btn btn-ghost" onClick={() => unfriend(row.id)}>
                    Unfriend
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
