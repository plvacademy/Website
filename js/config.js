/**
 * PLV — central configuration.
 * Everything that changes between "local JSON" and "live Google Apps Script"
 * lives here. The UI never hard-codes a URL.
 *
 * NEVER put private API keys or secrets in this file: it is public.
 */
export const CONFIG = {
  /* ---- Content sources (local JSON now, Apps Script endpoints later) ---- */
  // Set a value to null/"" to show a deliberate "not configured" placeholder.
  DATA_SOURCES: {},

  /* Content that the owner edits in the Google Sheet (tabs "Areas", "Coaches", "Gallery") and the site reads through
   * the same Apps Script web app as registration. The sheet is the ONLY source: there is no built-in fallback
   * data, so an unreachable sheet shows an error with a retry button (never stale or placeholder content). */
  SHEET_CONTENT: ['coaches', 'gallery', 'areas'], // areas = the "Areas" tab

  /* ---- Network behaviour ---- */
  REQUEST: {
    timeoutMs: 8000,
    retries: 2, // extra attempts after the first (network errors, timeouts, 5xx only)
    retryDelayMs: 700,
  },

  /* ---- Caching / refresh ----
   * Data is cached in memory for ttlMs to avoid repeated requests. Content updated at the
   * source appears after the next successful fetch: a page reload, a Retry click, or an
   * automatic silent refresh when the tab becomes visible again after ttlMs.
   * This is NOT real-time. */
  CACHE: {
    ttlMs: 30 * 1000,
  },

  /* ---- Future endpoints (leave null until a secure backend exists) ---- */
  CHATBOT_API_URL: null, // e.g. 'https://your-backend.example.com/chat'
  CONTACT_API_URL: null, // future Apps Script endpoint for contact requests
  // Feedback web app (Google Apps Script bound to the Feedback sheet). Reviews are read from here and new ones are sent here;
  // only rows the owner marked Visible are returned. Never put secrets in this file.
  FEEDBACK_API_URL: 'https://script.google.com/macros/s/AKfycby20FtYcsmiQtQanVFAQXq9tJqRM_pPnnzRcHX45T06DMTG7TUMdQuTtylZOkLh1FxOvA/exec',
  // Registration page (same site). The form posts to REGISTRATION_API_URL (Google Apps Script web app).
  REGISTRATION_URL: 'programs.html#register',
  REGISTRATION_API_URL: 'https://script.google.com/macros/s/AKfycbxmJXn9CupLrmG2ekdWcPPzNDlL1v0ViQr7QfcqdVwU7EYWMSPcatiYrQ4WY2FEiM4W/exec',

  /* ---- Links to the future dedicated pages ----
   * null  -> the link falls back to the matching section on this page.
   * coachDetails supports an {id} placeholder, e.g. 'coach-details.html?id={id}'
   */
  PAGES: {
    programs: 'programs.html',
    coaches: null,
    coachDetails: null, // supports {id} and {slug}; e.g. 'coach.html?slug={slug}'
    programDetails: null, // supports {id} and {slug}
    gallery: null,
    feedback: 'feedback.html',
    privacy: null,
    terms: null,
  },

  /* ---- Planned (NOT yet built) routes, used only to document intended URLs.
   * Coach "View Profile" stays disabled ("Profile coming soon") until PAGES.coachDetails is set. */
  FUTURE_ROUTES: {
    coachDetails: 'coach.html?slug={slug}',
  },

  /* ---- Contact & social (fill in with real, approved details) ---- */
  CONTACT: {
    whatsappNumber: '201556335340', // digits only with country code
    whatsappDisplay: '+20 155 633 5340', // how the number is shown to visitors
    socials: {
      facebook: 'https://www.facebook.com/share/1M6PYk11ft/',
      instagram: 'https://instagram.com/_plv25',
      tiktok: 'https://www.tiktok.com/@_plv25',
      youtube: '', // add when available
    },
  },

  /* ---- Registration form (Programs page) ----
   * `value` is the canonical English name sent to the server; the server maps it to the worksheet
   * (never trust a worksheet name from the browser). Order matters: it is the display order. */
  REGISTRATION: {
    positions: [
      { value: 'Setter', key: 'setter' },
      { value: 'Outside Hitter', key: 'outsideHitter' },
      { value: 'Opposite', key: 'opposite' },
      { value: 'Middle Blocker', key: 'middleBlocker' },
      { value: 'Libero', key: 'libero' },
      { value: 'Not Sure Yet', key: 'notSure' },
    ],
    timeoutMs: 25000,
  },

  /* ---- Feature flags ---- */
  FEATURES: {
    galleryAutoplay: true, // always pausable; disabled for reduced-motion users
    galleryAutoplayMs: 4500,
    devSimulation: true, // enables ?simulate=programs:error,coaches:empty (see README)
    chatbot: true,
  },
};
