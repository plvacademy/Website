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
    coaches: 'coaches.html',
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
    // Optional per coach: stats [{value,label}], achievements [{place,title}], timeline [{when,text}], gallery [{src,alt}]. Add *_ar for Arabic.
    // kind: 'head' | 'assistant' picks the placeholder role. Empty text = a clearly marked placeholder on the page.
    // Arabic text goes in name_ar, role_ar, specialization_ar, experience_ar, bio_ar, philosophy_ar.
    coaches: [
      {
        id: 'coach-1', kind: 'head', photo: '', philosophy: '', qualifications: [],
        name: 'Mohamed Ragab', name_ar: 'محمد رجب',
        role: 'Head Coach & Founder of PLV Academy', role_ar: 'المدرب الرئيسي ومؤسس أكاديمية PLV',
        specialization: 'Former opposite hitter', specialization_ar: 'لاعب سابق في مركز الضارب المقابل',
        experience: '12 years as a player, 2 as a coach', experience_ar: '12 سنة لاعبًا و2 مدربًا',
        bio: 'A former opposite hitter who spent 12 years at Al Tayaran Club, now building champions as a coach.',
        bio_ar: 'لاعب سابق في مركز الضارب المقابل قضى 12 سنة في نادي الطيران، ويصنع الآن أبطالًا كمدرب.',
        specializations: ['Position-specific skills', 'Physical fitness', 'A respectful, ethical training environment'],
        specializations_ar: ['مهارات خاصة بكل مركز', 'اللياقة البدنية', 'بيئة تدريب تحترم اللاعب وتلتزم بالأخلاق'],
        stats: [
          { value: 12, label: 'Years as a player', label_ar: 'سنة كلاعب' },
          { value: 2, label: 'Years as a coach', label_ar: 'سنة كمدرب' },
        ],
        achievements: [
          { place: '1st', place_ar: 'الأول', title: 'Academies Tournament', title_ar: 'بطولة الأكاديميات' },
          { place: '1st', place_ar: 'الأول', title: 'Republic Championship (the academy’s first participation)', title_ar: 'بطولة الجمهورية (أول مشاركة للأكاديمية)' },
          { place: '2nd', place_ar: 'الثاني', title: 'Girls’ Teams Tournament', title_ar: 'بطولة فرق البنات' },
          { place: '4th', place_ar: 'الرابع', title: 'American University Tournament (first participation)', title_ar: 'بطولة الجامعة الأمريكية (أول مشاركة)' },
        ],
        timeline: [
          { when: '12 years', when_ar: '12 سنة', text: 'Player at Al Tayaran Club, opposite hitter.', text_ar: 'لاعب في نادي الطيران في مركز الضارب المقابل.' },
          { when: '2019', when_ar: '2019', text: 'First place in the school league, and with the school team.', text_ar: 'المركز الأول في دوري المدارس ومع فريق المدرسة.' },
          { when: 'Coaching', when_ar: 'التدريب', text: 'Coach at Al Wai Club: the girls’ 15-year-old team and the minis team.', text_ar: 'مدرب في نادي الوعي: فريق البنات تحت 15 سنة وفريق الميني.' },
          { when: 'December 2025', when_ar: 'ديسمبر 2025', text: 'Founded PLV Academy.', text_ar: 'تأسيس أكاديمية PLV.' },
        ],
        gallery: [], // [{ src: 'assets/images/coaches/...', alt: '', alt_ar: '' }]
      },
      { id: 'coach-2', kind: 'assistant', name: '', role: '', specialization: '', experience: '', photo: '', bio: '', philosophy: '', specializations: [], qualifications: [] },
      { id: 'coach-3', kind: 'assistant', name: '', role: '', specialization: '', experience: '', photo: '', bio: '', philosophy: '', specializations: [], qualifications: [] },
      { id: 'coach-4', kind: 'assistant', name: '', role: '', specialization: '', experience: '', photo: '', bio: '', philosophy: '', specializations: [], qualifications: [] },
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
