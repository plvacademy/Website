/**
 * PLV — central configuration.
 * Everything that changes between "local JSON" and "live Google Apps Script"
 * lives here. The UI never hard-codes a URL.
 *
 * NEVER put private API keys or secrets in this file: it is public.
 */
export const CONFIG = {
  /* Page texts the owner may change from the "Texts" tab of the content sheet (column `key`). `page` says where the
   * text appears (home / programs / coaches / coach / gallery / feedback, or all = menu, footer and shared texts).
   * Only these keys are applied, and always as plain text. Built-in wording is used when a key has no published row. */
  EDITABLE_TEXTS: [
    { key: 'announcement', page: 'all' }, { key: 'nav.home', page: 'all' },
    { key: 'nav.programs', page: 'all' }, { key: 'nav.coaches', page: 'all' },
    { key: 'nav.gallery', page: 'all' }, { key: 'nav.about', page: 'all' }, { key: 'nav.contact', page: 'all' },
    { key: 'register', page: 'all' }, { key: 'hero.eyebrow', page: 'home' },
    { key: 'hero.title1', page: 'home' }, { key: 'hero.title2', page: 'home' },
    { key: 'hero.mission', page: 'home' }, { key: 'hero.explore', page: 'home' },
    { key: 'hero.coaches', page: 'home' }, { key: 'about.eyebrow', page: 'home' },
    { key: 'about.title1', page: 'home' }, { key: 'about.title2', page: 'home' },
    { key: 'about.text', page: 'home' }, { key: 'about.cta', page: 'home' },
    { key: 'about.f1.title', page: 'home' }, { key: 'about.f1.text', page: 'home' },
    { key: 'about.f2.title', page: 'home' }, { key: 'about.f2.text', page: 'home' },
    { key: 'about.f3.title', page: 'home' }, { key: 'about.f3.text', page: 'home' },
    { key: 'about.f4.title', page: 'home' }, { key: 'about.f4.text', page: 'home' },
    { key: 'programs.eyebrow', page: 'home' }, { key: 'programs.title1', page: 'home' },
    { key: 'programs.title2', page: 'home' }, { key: 'programs.text', page: 'home' },
    { key: 'programs.cta', page: 'home' }, { key: 'why.eyebrow', page: 'home' },
    { key: 'why.title1', page: 'home' }, { key: 'why.title2', page: 'home' }, { key: 'why.text', page: 'home' },
    { key: 'why.cta', page: 'home' }, { key: 'why.b1.title', page: 'home' },
    { key: 'why.b1.text', page: 'home' }, { key: 'why.b2.title', page: 'home' },
    { key: 'why.b2.text', page: 'home' }, { key: 'why.b3.title', page: 'home' },
    { key: 'why.b3.text', page: 'home' }, { key: 'why.b4.title', page: 'home' },
    { key: 'why.b4.text', page: 'home' }, { key: 'coaches.eyebrow', page: 'home' },
    { key: 'coaches.title1', page: 'home' }, { key: 'coaches.title2', page: 'home' },
    { key: 'coaches.text', page: 'home' }, { key: 'coaches.cta', page: 'home' },
    { key: 'gallery.eyebrow', page: 'home' }, { key: 'gallery.title1', page: 'home' },
    { key: 'gallery.title2', page: 'home' }, { key: 'gallery.text', page: 'home' },
    { key: 'gallery.cta', page: 'home' }, { key: 'feedback.eyebrow', page: 'home' },
    { key: 'feedback.title1', page: 'home' }, { key: 'feedback.title2', page: 'home' },
    { key: 'feedback.text', page: 'home' }, { key: 'feedback.cta', page: 'home' },
    { key: 'cta.title', page: 'home' }, { key: 'cta.text', page: 'home' },
    { key: 'cta.whatsapp', page: 'home' }, { key: 'footer.privacy', page: 'all' },
    { key: 'footer.terms', page: 'all' }, { key: 'feedback.dialogTitle', page: 'home' },
    { key: 'feedback.dialogText', page: 'home' }, { key: 'reg.tag.build', page: 'programs' },
    { key: 'reg.choose.title1', page: 'programs' }, { key: 'reg.choose.title2', page: 'programs' },
    { key: 'reg.choose.sub', page: 'programs' }, { key: 'reg.step2.title', page: 'programs' },
    { key: 'reg.stepOf', page: 'programs' }, { key: 'reg.form.sub', page: 'programs' },
    { key: 'reg.selected', page: 'programs' }, { key: 'reg.name', page: 'programs' },
    { key: 'reg.mobile', page: 'programs' }, { key: 'reg.age', page: 'programs' },
    { key: 'reg.position', page: 'programs' }, { key: 'reg.position.ph', page: 'programs' },
    { key: 'reg.submit', page: 'programs' }, { key: 'reg.success.title', page: 'programs' },
    { key: 'reg.success.home', page: 'programs' }, { key: 'reg.success.again', page: 'programs' },
    { key: 'reg.tag.community1', page: 'programs' }, { key: 'reg.tag.community2', page: 'programs' },
    { key: 'chp.hero.eyebrow', page: 'coaches' }, { key: 'chp.hero.title1', page: 'coaches' },
    { key: 'chp.hero.title2', page: 'coaches' }, { key: 'chp.hero.text', page: 'coaches' },
    { key: 'chp.pill.technique', page: 'coaches' }, { key: 'chp.pill.tactics', page: 'coaches' },
    { key: 'chp.pill.athleticism', page: 'coaches' }, { key: 'chp.pill.mentality', page: 'coaches' },
    { key: 'chp.roster.title', page: 'coaches' }, { key: 'chp.spot.about', page: 'coaches' },
    { key: 'chp.spot.philosophy', page: 'all' }, { key: 'chp.spot.specializations', page: 'coaches' },
    { key: 'chp.spot.qualifications', page: 'all' }, { key: 'chp.spot.prev', page: 'all' },
    { key: 'chp.spot.next', page: 'all' }, { key: 'chp.feat.profile', page: 'coaches' },
    { key: 'chp.sci.title1', page: 'coaches' }, { key: 'chp.sci.title2', page: 'coaches' },
    { key: 'chp.sci.text', page: 'coaches' }, { key: 'chp.sci.analyze', page: 'coaches' },
    { key: 'chp.sci.adjust', page: 'coaches' }, { key: 'chp.sci.improve', page: 'coaches' },
    { key: 'chp.pos.s', page: 'coaches' }, { key: 'chp.pos.oh', page: 'coaches' },
    { key: 'chp.pos.mb', page: 'coaches' }, { key: 'chp.pos.opp', page: 'coaches' },
    { key: 'chp.pos.l', page: 'coaches' }, { key: 'chp.sci.note', page: 'coaches' },
    { key: 'chp.phil.title', page: 'coaches' }, { key: 'chp.phil.technique', page: 'coaches' },
    { key: 'chp.phil.techniqueText', page: 'coaches' }, { key: 'chp.phil.tactics', page: 'coaches' },
    { key: 'chp.phil.tacticsText', page: 'coaches' }, { key: 'chp.phil.athleticism', page: 'coaches' },
    { key: 'chp.phil.athleticismText', page: 'coaches' }, { key: 'chp.phil.mentality', page: 'coaches' },
    { key: 'chp.phil.mentalityText', page: 'coaches' }, { key: 'chp.close.title1', page: 'coaches' },
    { key: 'chp.close.title2', page: 'coaches' }, { key: 'chp.close.text', page: 'all' },
    { key: 'chp.close.cta', page: 'all' }, { key: 'chp.prof.back', page: 'coach' },
    { key: 'chp.prof.seeAch', page: 'coach' }, { key: 'chp.prof.bio', page: 'coach' },
    { key: 'chp.prof.achievements', page: 'coach' }, { key: 'chp.prof.journey', page: 'coach' },
    { key: 'chp.prof.gallery', page: 'coach' }, { key: 'chp.gal.all', page: 'coach' },
    { key: 'chp.gal.tournaments', page: 'coach' }, { key: 'chp.gal.match', page: 'coach' },
    { key: 'chp.gal.training', page: 'coach' }, { key: 'chp.prof.close', page: 'coach' },
    { key: 'gp.eyebrow', page: 'gallery' }, { key: 'gp.title1', page: 'gallery' },
    { key: 'gp.title2', page: 'gallery' }, { key: 'gp.text', page: 'gallery' },
    { key: 'gp.scroll', page: 'gallery' }, { key: 'gp.tag1', page: 'gallery' },
    { key: 'gp.tag2', page: 'gallery' }, { key: 'gp.tag3', page: 'gallery' },
    { key: 'gp.gallery', page: 'gallery' }, { key: 'gp.cat.all', page: 'gallery' },
    { key: 'gp.cat.training', page: 'gallery' }, { key: 'gp.cat.matches', page: 'gallery' },
    { key: 'gp.cat.events', page: 'gallery' }, { key: 'gp.cat.team', page: 'gallery' },
    { key: 'gp.cat.campus', page: 'gallery' }, { key: 'gp.mode', page: 'gallery' },
    { key: 'state.retry', page: 'gallery' }, { key: 'gp.story.eyebrow', page: 'gallery' },
    { key: 'gp.story.title1', page: 'gallery' }, { key: 'gp.story.title2', page: 'gallery' },
    { key: 'gp.story.text', page: 'gallery' }, { key: 'gp.cta.eyebrow', page: 'gallery' },
    { key: 'gp.cta.title1', page: 'gallery' }, { key: 'gp.cta.title2', page: 'gallery' },
    { key: 'gp.cta.text', page: 'gallery' }, { key: 'gp.cta.btn', page: 'gallery' },
    { key: 'feedback.page.eyebrow', page: 'feedback' }, { key: 'feedback.page.title1', page: 'feedback' },
    { key: 'feedback.page.title2', page: 'feedback' }, { key: 'feedback.page.text', page: 'feedback' },
    { key: 'feedback.page.noteTitle', page: 'feedback' }, { key: 'feedback.page.noteText', page: 'feedback' },
    { key: 'feedback.form.name', page: 'feedback' }, { key: 'feedback.form.type', page: 'feedback' },
    { key: 'feedback.type.Parent', page: 'feedback' }, { key: 'feedback.type.Player', page: 'feedback' },
    { key: 'feedback.form.rating', page: 'feedback' }, { key: 'feedback.rating.hint', page: 'feedback' },
    { key: 'feedback.form.message', page: 'feedback' }, { key: 'feedback.form.mobile', page: 'feedback' },
    { key: 'feedback.form.optional', page: 'feedback' },
    { key: 'feedback.form.mobileHintOptional', page: 'feedback' }, { key: 'feedback.submit', page: 'feedback' },
    { key: 'feedback.success.title', page: 'feedback' }, { key: 'feedback.success.lowNote', page: 'feedback' },
    { key: 'feedback.success.home', page: 'feedback' }, { key: 'feedback.success.another', page: 'feedback' },
    { key: 'feedback.prev.eyebrow', page: 'feedback' }, { key: 'feedback.prev.a', page: 'feedback' },
    { key: 'feedback.prev.b', page: 'feedback' }, { key: 'feedback.prev.c', page: 'feedback' },
    { key: 'feedback.prev.text', page: 'feedback' }, { key: 'hero.tagline', page: 'home' },
  ],

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
  // Chatbot: the bot is one module published separately (answers, registration from the chat); this site only shows it.
  CHATBOT_API_URL: 'https://script.google.com/macros/s/AKfycbxNHRYpdGLuToqMr0BzxEyQiehUbUJBhTFOeA8VgL7lxXHgknvpsXNIFu0CQAcxssML9w/exec',
  CHATBOT_MODULE_URL: 'https://plvacademy.github.io/chatbot-admin/js/bot/site-bot.js?v=1',
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
    about: null, // set to 'about.html' when the About page exists: the About button then becomes a normal link
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
    // kind: 'head' | 'assistant' picks the placeholder role. Empty text = a clearly marked placeholder on the page.
    // Arabic text goes in name_ar, role_ar, specialization_ar, experience_ar, bio_ar, philosophy_ar.
    coaches: [], // the coaches now come from the "Coaches" tab of the content sheet
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
