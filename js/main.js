/**
 * PLV — Home Page entry point.
 * Wires i18n, header, dynamic sections (each independent), chatbot and small UI bits.
 */
import { CONFIG } from './config.js?v=24';
import { initI18n, t, pick, onLangChange, applyTranslations } from './i18n.js?v=24';
import { initHeader } from './components/header.js?v=24';
import { initChatbot } from './components/chatbot.js?v=24';
import { createGalleryCarousel } from './components/gallery.js?v=24';
import { createSection, el, icon, imageEl, pageLink } from './components/contentSection.js?v=24';
import { setupSiteLinks } from './components/siteLinks.js?v=24';
import { renderReviewCard } from './components/reviewCard.js?v=24';

/* ------------------------------------------------------------------ */
/* Renderers: one per content type. Text is always set via textContent. */
/* ------------------------------------------------------------------ */
/* Home Page coach card = SUMMARY only: image, name, role, one short intro sentence, profile link.
   Full biography, qualifications, etc. belong to the future profile page (same record, same id/slug). */
function renderCoach(item) {
  const name = pick(item, 'name');
  const ident = item.slug || item.id;
  const href = pageLink(CONFIG.PAGES.coachDetails, ident);

  let link;
  if (href) {
    link = el('a', { class: 'media-card__link', href }, [
      icon('i-user'), el('span', { text: t('coaches.details') }), icon('i-arrow', 'icon icon--sm'),
    ]);
    link.setAttribute('aria-label', `${t('coaches.details')}: ${name}`);
  } else {
    // Profile page not built yet: clearly marked, not a dead link.
    const future = (CONFIG.FUTURE_ROUTES.coachDetails || '').replace('{slug}', encodeURIComponent(ident));
    link = el('span', { class: 'media-card__link is-disabled', 'aria-disabled': 'true', dataset: { futureRoute: future } }, [
      icon('i-user'), el('span', { text: t('coaches.profileSoon') }),
    ]);
  }

  return el('article', { class: 'media-card media-card--coach', dataset: { coachId: item.id } }, [
    imageEl(item.image, pick(item, 'alt') || name, { cls: 'media-card__img' }),
    el('div', { class: 'media-card__body' }, [
      el('h3', { class: 'media-card__title', text: name }),
      (pick(item, 'role') || pick(item, 'specialty')) && el('p', { class: 'media-card__meta', text: pick(item, 'role') || pick(item, 'specialty') }),
      pick(item, 'intro') && el('p', { class: 'media-card__tagline', text: pick(item, 'intro') }),
      link,
    ]),
    href && el('span', { class: 'media-card__go', 'aria-hidden': 'true' }, [icon('i-arrow')]),
  ]);
}

function renderGalleryItem(item) {
  return el('figure', { class: 'gallery-item' }, [
    imageEl(item.src, pick(item, 'alt') || '', { cls: 'gallery-item__img' }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                    */
/* ------------------------------------------------------------------ */
function setupFeedbackDialog() {
  const dialog = document.getElementById('feedback-dialog');
  document.querySelectorAll('.js-feedback-open').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (CONFIG.PAGES.feedback) { window.location.href = CONFIG.PAGES.feedback; return; }
      // No backend yet: be honest, never fake a successful submission.
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    });
  });
  dialog?.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

function setupReveal() {
  const nodes = document.querySelectorAll('[data-reveal]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-visible'));
    return;
  }
  document.documentElement.classList.add('reveal-ready');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  nodes.forEach((n) => io.observe(n));
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
function init() {
  initI18n();
  // Chatbot first, so the launcher shows even if another section had a problem.
  try { initChatbot(document.getElementById('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
  initHeader();
  setupSiteLinks();
  setupFeedbackDialog();
  setupReveal();

  const carousel = createGalleryCarousel(document.getElementById('gallery-carousel'));
  const sections = [
    createSection({
      key: 'coaches', mount: document.getElementById('coaches-grid'), render: renderCoach,
      skeleton: { count: 4, variant: 'media' },
    }),
    createSection({
      key: 'gallery', mount: document.getElementById('gallery-track'), render: renderGalleryItem,
      skeleton: { count: 4, variant: 'gallery' },
      onData: (items) => carousel.refresh(items),
    }),
    createSection({
      key: 'feedbackHome', mount: document.getElementById('feedback-grid'), render: renderReviewCard,
      skeleton: { count: 3, variant: 'feedback' },
    }),
  ];

  sections.forEach((s) => s.load()); // independent: a failure in one never blocks another

  applyTranslations(document);

  // Pick up source updates without a reload: when the tab becomes visible again and the data is older
  // than CONFIG.CACHE.ttlMs, refresh silently. (Not real-time: updates appear on the next successful fetch.)
  let lastFetch = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || Date.now() - lastFetch < CONFIG.CACHE.ttlMs) return;
    lastFetch = Date.now();
    sections.forEach((s) => s.load({ silent: true }));
  });

  onLangChange(() => {
    sections.forEach((s) => s.rerender());
    carousel.syncLabels();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
