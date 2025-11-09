// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Support CRA (REACT_APP_*) and Vite (VITE_*)
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : undefined);

const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing env vars.", { supabaseUrl, hasKey: !!supabaseAnonKey });
  throw new Error(
    "Supabase env vars missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY (or VITE_*), then restart the dev server."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
