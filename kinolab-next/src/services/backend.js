import { createClient } from "@supabase/supabase-js";
import "../../config.js";
import "../../auth-client.js";
// The same Phase 0 session storage and fail-closed transport are shared by both entries.
if (!window.CineWaveAuth) {
  window.supabase = { createClient };
  window.initializeCineWaveAuth();
}
export const client = window.CineWaveAuth.client;
export const signOut = window.CineWaveAuth.signOut;
export const config = window.CINEWAVE_CONFIG;
export const backendFetch = (input, init) =>
  window.CineWaveStaging.fetch(input, init);
export const base = import.meta.env.BASE_URL;
