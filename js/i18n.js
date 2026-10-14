/**
 * PLV — centralized translations (English default, Arabic prepared).
 * The brand name "PLV" and the logo are never translated.
 *
 * HTML hooks:
 *   data-i18n="key"          -> textContent
 *   data-i18n-aria="key"     -> aria-label
 *   data-i18n-alt="key"      -> alt
 *   data-i18n-title="key"    -> title
 * Data items may carry Arabic text in "<field>_ar" (e.g. title_ar).
 */
const STORAGE_KEY = 'plv-lang';
const SUPPORTED = ['en', 'ar'];

const translations = {
  en: {
    'meta.title': 'PLV | Performance Lab Volleyball Academy',
    'meta.description': 'PLV — Performance Lab Volleyball Academy. Train with purpose. Perform beyond limits.',
    'skip': 'Skip to main content',
    'announcement': 'Welcome to PLV — Performance Lab Volleyball Academy',

    'nav.home': 'Home',
    'nav.programs': 'Programs',
    'nav.coaches': 'Coaches',
    'nav.gallery': 'Gallery',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'nav.main': 'Main navigation',
    'nav.footer': 'Footer navigation',
    'lang.switch': 'Language',
    'register': 'Register Now',

    'hero.eyebrow': 'PLV | Performance Lab Volleyball Academy',
    'hero.title1': 'Train with purpose.',
    'hero.title2': 'Perform beyond limits.',
    'hero.mission': 'We aim to bring out the best in every athlete, helping them elevate their game, build confidence, and unleash their full potential.',
    'hero.explore': 'Explore Programs',
    'hero.coaches': 'View Our Coaches',
    'hero.image': 'Volleyball player spiking the ball during a match',

    'about.eyebrow': 'About PLV',
    'about.title1': 'Training for',
    'about.title2': 'Every Stage',
    'about.text': 'From beginners to advanced players, our programs are designed to build skills, confidence, and a love for the game.',
    'about.cta': 'View All Programs',
    'about.f1.title': 'Build Skills',
    'about.f1.text': 'Progress step by step with expert coaching.',
    'about.f2.title': 'Gain Confidence',
    'about.f2.text': 'Develop mental and physical strength.',
    'about.f3.title': 'Team Spirit',
    'about.f3.text': 'Learn, compete, become stronger.',
    'about.f4.title': 'Reach Your Potential',
    'about.f4.text': 'More than a game, it’s a journey.',

    'programs.eyebrow': 'Our Programs',
    'programs.title1': 'More Than',
    'programs.title2': 'Just Training',
    'programs.text': 'Programs for every age, skill level, and goal. Find the right path for your volleyball journey.',
    'programs.cta': 'View All Programs',
    'programs.open': 'View program',

    'why.eyebrow': 'Why Choose PLV',
    'why.title1': 'More Than',
    'why.title2': 'Just Training',
    'why.text': 'Expert coaching. Modern facilities. A supportive community. Real progress.',
    'why.cta': 'Learn More',
    'why.b1.title': 'Expert Coaches',
    'why.b1.text': 'Certified & Experienced',
    'why.b2.title': 'Modern Facilities',
    'why.b2.text': 'Safe & Professional Courts',
    'why.b3.title': 'Personal Growth',
    'why.b3.text': 'Discipline & Confidence',
    'why.b4.title': 'Real Opportunities',
    'why.b4.text': 'Tournaments & Scouting',

    'coaches.eyebrow': 'Our Coaches',
    'coaches.title1': 'Meet Our',
    'coaches.title2': 'Coaching Team',
    'coaches.text': 'Our coaches bring years of experience, professional knowledge, and a passion for developing players at every level.',
    'coaches.cta': 'View All Coaches',
    'coaches.details': 'View Profile',
    'coaches.profileSoon': 'Profile coming soon',


    'gallery.eyebrow': 'Our Gallery',
    'gallery.title1': 'Moments',
    'gallery.title2': 'That Inspire',
    'gallery.text': 'Training, matches, tournaments, and unforgettable moments.',
    'gallery.cta': 'View Gallery',
    'gallery.prev': 'Previous photos',
    'gallery.next': 'Next photos',
    'gallery.pause': 'Pause slideshow',
    'gallery.play': 'Play slideshow',
    'gallery.region': 'Photo gallery',

    'feedback.eyebrow': 'Real Stories',
    'feedback.title1': 'What People Say',
    'feedback.title2': 'About PLV',
    'feedback.text': 'Real stories. Real progress. Real impact.',
    'feedback.cta': 'Share your feedback',
    'feedback.dialogTitle': 'Share your feedback',
    'feedback.dialogText': 'Feedback submission isn’t available yet. Once it is connected, your feedback will be reviewed before it appears on this page.',
    'feedback.close': 'Close',

    'cta.title': 'Ready to Be Part of PLV?',
    'cta.text': 'Join our academy and start your journey today!',
    'cta.whatsapp': 'Chat on WhatsApp',
    'cta.whatsappSoon': 'WhatsApp coming soon',

    'footer.rights': '© {year} PLV. All rights reserved.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms & Conditions',
    'footer.social': 'Social media',
    'footer.contact': 'Contact information',
    'footer.email': 'Email',
    'footer.whatsapp': 'WhatsApp',
    'social.facebook': 'Facebook',
    'social.instagram': 'Instagram',
    'social.tiktok': 'TikTok',
    'social.youtube': 'YouTube',

    'meta.title.programs': 'Programs & Registration | PLV Academy',
    'meta.description.programs': 'Register a player at PLV — Performance Lab Volleyball Academy. Choose a training area and fill in the player details.',
    'reg.step2.title': 'Player Registration',
    'reg.tag.build': 'Build Your Game',
    'reg.tag.community1': 'More Than Volleyball',
    'reg.tag.community2': 'It’s a Community',
    'reg.choose.title1': 'Choose Your',
    'reg.choose.title2': 'Training Area',
    'reg.choose.sub': 'Select the area you want to train in.',
    'reg.form.sub': 'Complete the form below to register.',
    'reg.stepOf': 'Step 2 of 2',
    'reg.back': 'Back to training areas',
    'reg.areasLabel': 'Training areas',
    'reg.selected': 'Selected Area',
    'area.newCairo': 'New Cairo',
    'area.newCairo.alt': 'التجمع',
    'area.heliopolis': 'Heliopolis',
    'area.heliopolis.alt': 'مصر الجديدة',
    'area.nasrCity': 'Nasr City',
    'area.nasrCity.alt': 'مدينة نصر',
    'reg.name': 'Player’s Full Name',
    'reg.name.ph': 'Enter full name',
    'reg.mobile': 'Mobile Number',
    'reg.mobile.ph': '01XXXXXXXXX',
    'reg.age': 'Age',
    'reg.age.ph': 'Enter age',
    'reg.position': 'Playing Position',
    'reg.position.ph': 'Select position',
    'pos.setter': 'Setter',
    'pos.outsideHitter': 'Outside Hitter',
    'pos.opposite': 'Opposite',
    'pos.middleBlocker': 'Middle Blocker',
    'pos.libero': 'Libero',
    'pos.notSure': 'Not Sure Yet',
    'reg.submit': 'Submit Registration',
    'reg.submitting': 'Submitting...',
    'err.required': 'Please fill in all required fields.',
    'err.name': 'Please enter a valid name using letters only. It can’t start with a symbol or a number.',
    'err.mobile': 'Please enter a valid mobile number.',
    'err.age': 'Please enter a valid age.',
    'err.failed': 'We couldn’t submit your registration right now. Please check your internet connection and try again.',
    'err.unexpected': 'Something went wrong. Please try again later.',
    'reg.success.title': 'Registration Submitted Successfully!',
    'reg.success.again': 'Register Another Player',
    'reg.success.home': 'Back to Home',
    'state.loading': 'Loading… this can take a few seconds.',
    'state.loadingLong': 'Still loading — thanks for your patience.',
    'state.empty': 'New updates are coming soon!',
    'state.error': 'We couldn’t load this section right now. Please try again.',
    'state.notConfigured': 'This section will be available soon.',
    'state.retry': 'Try again',
    'state.imageSoon': 'Photo coming soon',

    'chat.open': 'Chat with PLV',
    'chat.launcher': 'Chat with us',
    'chat.title': 'PLV Assistant',
    'chat.close': 'Close chat',
    'chat.welcome': 'Welcome to PLV! 👋 We’d love to help you find the right program.',
    'chat.soon': 'Coming soon',
    'chat.soonText': 'Our chat assistant isn’t active yet. For now, please use the contact options on this page.',
    'chat.placeholder': 'Type your message…',
    'chat.send': 'Send',
    'chat.error': 'Sorry, the assistant is unavailable right now. Please try again later.',
    'chat.you': 'You',
    'chat.bot': 'PLV',
  },

  ar: {
    'meta.title': 'PLV | أكاديمية بيرفورمانس لاب للكرة الطائرة',
    'meta.description': 'PLV — أكاديمية بيرفورمانس لاب للكرة الطائرة. تدرّب بهدف. وتألّق بلا حدود.',
    'skip': 'تخطَّ إلى المحتوى الرئيسي',
    'announcement': 'مرحبًا بكم في PLV — أكاديمية بيرفورمانس لاب للكرة الطائرة',

    'nav.home': 'الرئيسية',
    'nav.programs': 'البرامج',
    'nav.coaches': 'المدربون',
    'nav.gallery': 'المعرض',
    'nav.contact': 'تواصل معنا',
    'nav.menu': 'القائمة',
    'nav.main': 'التنقل الرئيسي',
    'nav.footer': 'التنقل في التذييل',
    'lang.switch': 'اللغة',
    'register': 'سجّل الآن',

    'hero.eyebrow': 'PLV | أكاديمية بيرفورمانس لاب للكرة الطائرة',
    'hero.title1': 'تدرّب بهدف.',
    'hero.title2': 'وتألّق بلا حدود.',
    'hero.mission': 'نسعى لإظهار أفضل ما في كل لاعب، ومساعدته على الارتقاء بمستواه وبناء ثقته بنفسه وإطلاق كامل إمكاناته.',
    'hero.explore': 'استكشف البرامج',
    'hero.coaches': 'تعرّف على مدربينا',
    'hero.image': 'لاعب كرة طائرة يؤدي ضربة ساحقة أثناء مباراة',

    'about.eyebrow': 'عن PLV',
    'about.title1': 'تدريب',
    'about.title2': 'لكل مرحلة',
    'about.text': 'من المبتدئين إلى المحترفين، صُمّمت برامجنا لبناء المهارات والثقة وحب اللعبة.',
    'about.cta': 'عرض كل البرامج',
    'about.f1.title': 'ابنِ مهاراتك',
    'about.f1.text': 'تقدّم خطوة بخطوة مع تدريب احترافي.',
    'about.f2.title': 'اكتسب الثقة',
    'about.f2.text': 'طوّر قوتك الذهنية والبدنية.',
    'about.f3.title': 'روح الفريق',
    'about.f3.text': 'تعلّم، نافس، وكن أقوى.',
    'about.f4.title': 'حقّق إمكاناتك',
    'about.f4.text': 'أكثر من لعبة، إنها رحلة.',

    'programs.eyebrow': 'برامجنا',
    'programs.title1': 'أكثر من',
    'programs.title2': 'مجرد تدريب',
    'programs.text': 'برامج لكل عمر ومستوى وهدف. اختر المسار المناسب لرحلتك في الكرة الطائرة.',
    'programs.cta': 'عرض كل البرامج',
    'programs.open': 'عرض البرنامج',

    'why.eyebrow': 'لماذا PLV',
    'why.title1': 'أكثر من',
    'why.title2': 'مجرد تدريب',
    'why.text': 'تدريب احترافي. منشآت حديثة. مجتمع داعم. تقدّم حقيقي.',
    'why.cta': 'اعرف المزيد',
    'why.b1.title': 'مدربون خبراء',
    'why.b1.text': 'معتمدون وذوو خبرة',
    'why.b2.title': 'منشآت حديثة',
    'why.b2.text': 'ملاعب آمنة واحترافية',
    'why.b3.title': 'نمو شخصي',
    'why.b3.text': 'انضباط وثقة',
    'why.b4.title': 'فرص حقيقية',
    'why.b4.text': 'بطولات واكتشاف المواهب',

    'coaches.eyebrow': 'مدربونا',
    'coaches.title1': 'تعرّف على',
    'coaches.title2': 'فريق التدريب',
    'coaches.text': 'يتمتع مدربونا بسنوات من الخبرة والمعرفة المهنية وشغف بتطوير اللاعبين في كل مستوى.',
    'coaches.cta': 'عرض كل المدربين',
    'coaches.details': 'عرض الملف الشخصي',
    'coaches.profileSoon': 'الملف الشخصي قريبًا',


    'gallery.eyebrow': 'معرضنا',
    'gallery.title1': 'لحظات',
    'gallery.title2': 'تُلهم',
    'gallery.text': 'تدريبات ومباريات وبطولات ولحظات لا تُنسى.',
    'gallery.cta': 'عرض المعرض',
    'gallery.prev': 'الصور السابقة',
    'gallery.next': 'الصور التالية',
    'gallery.pause': 'إيقاف العرض التلقائي',
    'gallery.play': 'تشغيل العرض التلقائي',
    'gallery.region': 'معرض الصور',

    'feedback.eyebrow': 'قصص حقيقية',
    'feedback.title1': 'ماذا يقول الناس',
    'feedback.title2': 'عن PLV',
    'feedback.text': 'قصص حقيقية. تقدّم حقيقي. أثر حقيقي.',
    'feedback.cta': 'شاركنا رأيك',
    'feedback.dialogTitle': 'شاركنا رأيك',
    'feedback.dialogText': 'إرسال الآراء غير متاح بعد. عند ربطه، ستتم مراجعة رأيك قبل ظهوره في هذه الصفحة.',
    'feedback.close': 'إغلاق',

    'cta.title': 'مستعد لتكون جزءًا من PLV؟',
    'cta.text': 'انضم إلى أكاديميتنا وابدأ رحلتك اليوم!',
    'cta.whatsapp': 'تواصل عبر واتساب',
    'cta.whatsappSoon': 'واتساب قريبًا',

    'footer.rights': '© {year} PLV. جميع الحقوق محفوظة.',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.terms': 'الشروط والأحكام',
    'footer.social': 'مواقع التواصل الاجتماعي',
    'footer.contact': 'معلومات التواصل',
    'footer.email': 'البريد الإلكتروني',
    'footer.whatsapp': 'واتساب',
    'social.facebook': 'فيسبوك',
    'social.instagram': 'إنستجرام',
    'social.tiktok': 'تيك توك',
    'social.youtube': 'يوتيوب',

    'meta.title.programs': 'البرامج والتسجيل | أكاديمية PLV',
    'meta.description.programs': 'سجّل لاعبًا في PLV — أكاديمية بيرفورمانس لاب للكرة الطائرة. اختر منطقة التدريب واملأ بيانات اللاعب.',
    'reg.step2.title': 'تسجيل اللاعب',
    'reg.tag.build': 'ابنِ لعبتك',
    'reg.tag.community1': 'أكثر من كرة طائرة',
    'reg.tag.community2': 'إنه مجتمع',
    'reg.choose.title1': 'اختر',
    'reg.choose.title2': 'منطقة التدريب',
    'reg.choose.sub': 'اختر المنطقة التي تريد التدريب فيها.',
    'reg.form.sub': 'أكمل النموذج أدناه لإتمام التسجيل.',
    'reg.stepOf': 'الخطوة 2 من 2',
    'reg.back': 'العودة إلى مناطق التدريب',
    'reg.areasLabel': 'مناطق التدريب',
    'reg.selected': 'المنطقة المختارة',
    'area.newCairo': 'التجمع',
    'area.newCairo.alt': 'New Cairo',
    'area.heliopolis': 'مصر الجديدة',
    'area.heliopolis.alt': 'Heliopolis',
    'area.nasrCity': 'مدينة نصر',
    'area.nasrCity.alt': 'Nasr City',
    'reg.name': 'اسم اللاعب بالكامل',
    'reg.name.ph': 'اكتب الاسم بالكامل',
    'reg.mobile': 'رقم الموبايل',
    'reg.mobile.ph': '01XXXXXXXXX',
    'reg.age': 'السن',
    'reg.age.ph': 'اكتب السن',
    'reg.position': 'مركز اللعب',
    'reg.position.ph': 'اختر المركز',
    'pos.setter': 'المُعِدّ (Setter)',
    'pos.outsideHitter': 'المهاجم الخارجي (Outside Hitter)',
    'pos.opposite': 'المهاجم المعاكس (Opposite)',
    'pos.middleBlocker': 'حائط الصد الأوسط (Middle Blocker)',
    'pos.libero': 'الليبرو (Libero)',
    'pos.notSure': 'لست متأكدًا بعد',
    'reg.submit': 'إرسال التسجيل',
    'reg.submitting': 'جارٍ إرسال التسجيل...',
    'err.required': 'من فضلك املأ جميع الحقول المطلوبة.',
    'err.name': 'من فضلك أدخل اسمًا صحيحًا بالحروف فقط. لا يجوز أن يبدأ برمز أو رقم.',
    'err.mobile': 'من فضلك أدخل رقم موبايل صحيح.',
    'err.age': 'من فضلك أدخل سنًّا صحيحًا.',
    'err.failed': 'تعذر إرسال التسجيل حاليًا. من فضلك تأكد من اتصالك بالإنترنت وحاول مرة أخرى.',
    'err.unexpected': 'حدث خطأ غير متوقع. من فضلك حاول مرة أخرى لاحقًا.',
    'reg.success.title': 'تم إرسال التسجيل بنجاح!',
    'reg.success.again': 'تسجيل لاعب آخر',
    'reg.success.home': 'العودة إلى الرئيسية',
    'state.loading': 'جاري التحميل… قد يستغرق بضع ثوانٍ.',
    'state.loadingLong': 'لسه بنحمّل — شكرًا لصبرك.',
    'state.empty': 'تحديثات جديدة قريبًا!',
    'state.error': 'تعذّر تحميل هذا القسم الآن. يرجى المحاولة مرة أخرى.',
    'state.notConfigured': 'سيتوفر هذا القسم قريبًا.',
    'state.retry': 'حاول مرة أخرى',
    'state.imageSoon': 'الصورة قريبًا',

    'chat.open': 'تحدّث مع PLV',
    'chat.launcher': 'تحدّث معنا',
    'chat.title': 'مساعد PLV',
    'chat.close': 'إغلاق المحادثة',
    'chat.welcome': 'مرحبًا بك في PLV! 👋 يسعدنا مساعدتك في اختيار البرنامج المناسب.',
    'chat.soon': 'قريبًا',
    'chat.soonText': 'مساعد المحادثة غير مفعّل بعد. حاليًا، يرجى استخدام وسائل التواصل المتاحة في هذه الصفحة.',
    'chat.placeholder': 'اكتب رسالتك…',
    'chat.send': 'إرسال',
    'chat.error': 'عذرًا، المساعد غير متاح الآن. يرجى المحاولة لاحقًا.',
    'chat.you': 'أنت',
    'chat.bot': 'PLV',
  },
};

let currentLang = 'en';
const listeners = new Set();

export const getLang = () => currentLang;
export const isRtl = () => currentLang === 'ar';

export function t(key, vars = {}) {
  const raw = translations[currentLang]?.[key] ?? translations.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Read a possibly-bilingual field from a data item: item[field_ar] in Arabic, else item[field]. */
export function pick(item, field) {
  if (currentLang === 'ar') {
    const ar = item?.[`${field}_ar`];
    if (typeof ar === 'string' && ar.trim()) return ar;
  }
  const v = item?.[field];
  return typeof v === 'string' ? v : '';
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n, { year: new Date().getFullYear() }); });
  root.querySelectorAll('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-alt]').forEach((n) => n.setAttribute('alt', t(n.dataset.i18nAlt)));
  root.querySelectorAll('[data-i18n-title]').forEach((n) => n.setAttribute('title', t(n.dataset.i18nTitle)));
  root.querySelectorAll('[data-i18n-placeholder]').forEach((n) => n.setAttribute('placeholder', t(n.dataset.i18nPlaceholder)));
}

export function setLang(lang, { persist = true } = {}) {
  if (!SUPPORTED.includes(lang)) lang = 'en';
  currentLang = lang;
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const suffix = html.dataset.page ? `.${html.dataset.page}` : '';
  document.title = t(`meta.title${suffix}`);
  document.querySelector('meta[name="description"]')?.setAttribute('content', t(`meta.description${suffix}`));
  applyTranslations();
  document.querySelectorAll('[data-lang]').forEach((b) => {
    const active = b.dataset.lang === lang;
    b.setAttribute('aria-pressed', String(active));
    b.classList.toggle('is-active', active);
  });
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage unavailable */ }
  }
  listeners.forEach((fn) => fn(lang));
}

export function initI18n() {
  let lang = 'en';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) lang = stored;
  } catch { /* storage unavailable */ }
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (SUPPORTED.includes(fromUrl)) lang = fromUrl;
  setLang(lang, { persist: false });
}
