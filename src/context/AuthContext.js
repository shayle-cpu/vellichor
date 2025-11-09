// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // gate UI until we know

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (mounted) {
        if (error) console.error("[auth] getSession error:", error);
        setUser(data?.session?.user ?? null);
        setAuthReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Optional wrappers if you want to use them elsewhere
  const signIn = (email, password, signal) =>
    supabase.auth.signInWithPassword({ email, password }, { signal });
  const signUp = (email, password, options) =>
    supabase.auth.signUp({ email, password, options });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, authReady, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
