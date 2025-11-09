// src/components/DeleteAccountModal.js
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/DeleteAccountModal.css"; // ✅ Updated path

export default function DeleteAccountModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleDelete() {
    setError("");
    setLoading(true);
    try {
      const { error: deleteError } = await supabase.rpc("delete_user_and_profile");
      if (deleteError) throw deleteError;

      alert("Your account has been deleted.");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <h2>Delete Account</h2>
        <p>
          Are you sure you want to delete your account? This action is permanent and
          cannot be undone.
        </p>

        {error && <div className="delete-error">{error}</div>}

        <div className="delete-actions">
          <button
            className="delete-btn"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Yes, delete my account"}
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
