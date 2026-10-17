/**
 * PLV — central configuration.
 * Everything that changes between "local JSON" and "live Google Apps Script"
 * lives here. The UI never hard-codes a URL.
 *
 * NEVER put private API keys or secrets in this file: it is public.
 */
/* TEMP SAMPLE CONTENT: placeholder numbers, titles and empty photo slots so the coach pages show their full layout.
   Replace per coach with real data (name, role, photo, bio, stats, achievements, timeline, photos). Nothing here is factual. */
const TEMP_PROFILE = {
  name: '', role: '', specialization: '', experience: '', photo: '', about_photo: '', bio: '', philosophy: '', qualifications: [],
  specializations: ['Specialization one', 'Specialization two', 'Specialization three'],
  stats: [
    { value: 10, label: 'Years as a player', label_ar: 'سنوات كلاعب' },
    { value: 5, label: 'Years as a coach', label_ar: 'سنوات كمدرب' },
    { value: 30, label: 'Athletes trained', label_ar: 'لاعبًا تم تدريبهم' },
    { value: 8, label: 'Trophies', label_ar: 'كؤوس' },
  ],
  achievements: [
    { place: '1st', place_ar: 'الأول', title: 'Tournament name', title_ar: 'اسم البطولة' },
    { place: '2nd', place_ar: 'الثاني', title: 'Tournament name', title_ar: 'اسم البطولة' },
    { place: '3rd', place_ar: 'الثالث', title: 'Tournament name', title_ar: 'اسم البطولة' },
    { place: '4th', place_ar: 'الرابع', title: 'Tournament name', title_ar: 'اسم البطولة' },
  ],
  trophies: [{ src: '' }, { src: '' }, { src: '' }, { src: '' }],
  timeline: [
    { when: 'Year', when_ar: 'السنة', text: 'A milestone in the coach’s career will appear here.', text_ar: 'ستظهر هنا محطة من مسيرة المدرب.' },
    { when: 'Year', when_ar: 'السنة', text: 'A milestone in the coach’s career will appear here.', text_ar: 'ستظهر هنا محطة من مسيرة المدرب.' },
    { when: 'Year', when_ar: 'السنة', text: 'A milestone in the coach’s career will appear here.', text_ar: 'ستظهر هنا محطة من مسيرة المدرب.' },
    { when: 'Year', when_ar: 'السنة', text: 'A milestone in the coach’s career will appear here.', text_ar: 'ستظهر هنا محطة من مسيرة المدرب.' },
  ],
  journey_photos: [{ src: '' }, { src: '' }],
  // gallery: cat is one of 'tournaments' | 'match' | 'training'
  gallery: [
    { src: '', cat: 'tournaments' }, { src: '', cat: 'match' }, { src: '', cat: 'training' },
    { src: '', cat: 'match' }, { src: '', cat: 'tournaments' }, { src: '', cat: 'training' },
  ],
};

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
    coaches: 'coaches.html',
    coachDetails: null, // supports {id} and {slug}; e.g. 'coach.html?slug={slug}'
    programDetails: null, // supports {id} and {slug}
    gallery: 'gallery.html',
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

  /* ---- Coaches page (coaches.html) ----
   * Photos: leave '' to show the designed placeholder frame. To use a real photo, put the file in assets/images/ and write
   * its path here, e.g. hero: 'assets/images/coaches/hero.jpg'. Nothing is requested while a path is empty.
   * The coach records below are PLACEHOLDERS (no real names, qualifications or experience are invented): replace the
   * texts, or later load the same fields from the Coaches sheet. */
  COACHES_PAGE: {
    images: {
      hero: '',
      closing: '',
      philosophy: { technique: '', tactics: '', athleticism: '', mentality: '' },
    },
    // Per coach: photo, about_photo, stats, achievements, trophies, timeline, journey_photos, gallery (see TEMP_PROFILE above). Add *_ar for Arabic.
    // kind: 'head' | 'assistant' picks the placeholder role. Empty text = a clearly marked placeholder on the page.
    // Arabic text goes in name_ar, role_ar, specialization_ar, experience_ar, bio_ar, philosophy_ar.
    coaches: [
      { id: 'coach-1', kind: 'head', ...TEMP_PROFILE },
      { id: 'coach-2', kind: 'assistant', ...TEMP_PROFILE },
      { id: 'coach-3', kind: 'assistant', ...TEMP_PROFILE },
      { id: 'coach-4', kind: 'assistant', ...TEMP_PROFILE },
    ],
  },

  /* ---- Gallery page ----
   * Real photos come from the "Gallery" tab of the content sheet (columns: id, src, alt, alt_ar, caption, caption_ar, category, published, order).
   * category is one of: training | matches | events | team | campus. While the sheet has no photos, empty clearly-marked slots show the layout. */
  GALLERY_PAGE: {
    sampleSlots: [
      { category: 'training' }, { category: 'matches' }, { category: 'team' }, { category: 'events' }, { category: 'campus' },
      { category: 'training' }, { category: 'matches' }, { category: 'events' }, { category: 'team' }, { category: 'campus' },
      { category: 'training' }, { category: 'matches' },
    ],
  },

  /* ---- Feature flags ---- */
  FEATURES: {
    galleryAutoplay: true, // always pausable; disabled for reduced-motion users
    galleryAutoplayMs: 4500,
    devSimulation: true, // enables ?simulate=programs:error,coaches:empty (see README)
    chatbot: true,
  },
};
