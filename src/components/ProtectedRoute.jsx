// src/components/ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While auth state resolves, render nothing (or your loading UI)
  if (loading) {
    return null; // or <div style={{padding:'2rem'}}>Loading…</div>
  }

  // If not logged in, bounce to /auth and keep where they were headed
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Authenticated → render the protected content
  return children;
}
