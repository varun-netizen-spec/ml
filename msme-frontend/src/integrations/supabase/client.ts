import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esvlauuiwjvrfoehgbin.supabase.co";
//const supabaseUrl = "https://funcsftdgpcvpurfqgil.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdmxhdXVpd2p2cmZvZWhnYmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTA1MzQsImV4cCI6MjA3ODEyNjUzNH0.n91EsijIp7P9ZyCaYu-X29qh1vTCreq8iFyLFiiehJM";
//const supabaseAnonKey =
  //"sb_publishable_2ybZim5ProhulnYCudaO-w_H6WQXUCb";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ keep session even after reload
    autoRefreshToken: true, // ✅ refresh expired tokens
    detectSessionInUrl: true, // ✅ handle magic link redirects
    storage: localStorage, // ✅ store tokens in browser localStorage
  },
});
