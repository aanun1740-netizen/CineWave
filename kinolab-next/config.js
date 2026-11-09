window.CINEWAVE_CONFIG = Object.freeze({
  url: "https://zayssiouqexwdicudalc.supabase.co",
  key: "sb_publishable_jnNJZVXtRFzWakYL5u4aug_kaVcu85B",
  // Staging only: aggregate counter enabled after owner SQL permission checks.
  // Never copy this configuration into the main production KinoLab site.
  analyticsEnabled: true
});

// Fail closed before SDK creation or direct backend requests.
window.CineWaveStaging = Object.freeze({
  assertURL(value) {
    const url = new URL(value);
    if (url.origin !== 'https://zayssiouqexwdicudalc.supabase.co' || url.username || url.password) {
      throw new Error('CineWave-Test- permits only the staging Supabase project.');
    }
    return url;
  },
  fetch(input, init) {
    this.assertURL(typeof input === 'string' || input instanceof URL ? input : input.url);
    // Do not follow redirects to another backend.
    return window.fetch(input, {...init, redirect: 'error'});
  }
});
window.CineWaveStaging.assertURL(window.CINEWAVE_CONFIG.url);
