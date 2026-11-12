// KinoLab production candidate: browser-safe publishable key, no privileged secrets.
// Uses the existing main CineWave project's public Supabase configuration.
// Production schema, RLS and Auth must be verified before any release.
window.CINEWAVE_CONFIG = Object.freeze({
  url: "https://ysecowknittmmmbixgtu.supabase.co",
  key: "sb_publishable_aTNkxAKz9OG-JJVO2X48Rw_9vnE_8Mj",
  analyticsEnabled: true
});
// Retain compatibility with the existing React Auth and backend clients.
window.CineWaveStaging = Object.freeze({
  assertURL(value) {
    const url = new URL(value);
    if (url.origin !== "https://ysecowknittmmmbixgtu.supabase.co" || url.username || url.password) {
      throw new Error("Backend URL is outside the approved production origin.");
    }
    return url;
  },
  fetch(input, init) {
    this.assertURL(typeof input === "string" || input instanceof URL ? input : input.url);
    return window.fetch(input, {...init, redirect: "error"});
  }
});
window.CineWaveStaging.assertURL(window.CINEWAVE_CONFIG.url);
