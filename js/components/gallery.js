/**
 * PLV — gallery carousel controls.
 * Native scroll-snap track (touch scrolling stays native) + prev/next buttons
 * + optional autoplay with a visible pause/play control.
 * Autoplay never runs for prefers-reduced-motion users, pauses while the user
 * hovers / focuses / touches the track, and stops when the section is off-screen.
 */
import { CONFIG } from '../config.js?v=42';
import { isRtl, t } from '../i18n.js?v=42';

export function createGalleryCarousel(root) {
  const track = root.querySelector('.gallery-track');
  const prev = root.querySelector('[data-gallery="prev"]');
  const next = root.querySelector('[data-gallery="next"]');
  const toggle = root.querySelector('[data-gallery="toggle"]');
  const controls = root.querySelector('.gallery-controls');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const autoplayAllowed = () => CONFIG.FEATURES.galleryAutoplay && !reducedMotion.matches;

  let userPaused = !autoplayAllowed();
  let interacting = false;
  let visible = false;
  let timer = null;

  const stepSize = () => {
    const item = track.querySelector('.gallery-item');
    if (!item) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    return item.getBoundingClientRect().width + gap;
  };

  const atEnd = () => Math.abs(track.scrollLeft) + track.clientWidth >= track.scrollWidth - 4;

  function step(direction) {
    const dir = direction * (isRtl() ? -1 : 1);
    if (direction > 0 && atEnd()) { track.scrollTo({ left: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }); return; }
    track.scrollBy({ left: dir * stepSize(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  function syncToggle() {
    if (!toggle) return;
    toggle.dataset.state = userPaused ? 'paused' : 'playing';
    toggle.setAttribute('aria-label', userPaused ? t('gallery.play') : t('gallery.pause'));
    toggle.setAttribute('aria-pressed', String(!userPaused));
    toggle.hidden = !CONFIG.FEATURES.galleryAutoplay;
  }

  function schedule() {
    clearInterval(timer);
    timer = null;
    if (!userPaused && !interacting && visible && autoplayAllowed()) {
      timer = setInterval(() => step(1), CONFIG.FEATURES.galleryAutoplayMs);
    }
  }

  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  toggle?.addEventListener('click', () => { userPaused = !userPaused; syncToggle(); schedule(); });

  const hold = () => { interacting = true; schedule(); };
  const release = () => { interacting = false; schedule(); };
  ['pointerenter', 'focusin', 'touchstart', 'pointerdown'].forEach((e) => track.addEventListener(e, hold, { passive: true }));
  ['pointerleave', 'focusout', 'touchend', 'touchcancel'].forEach((e) => track.addEventListener(e, release, { passive: true }));

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }).observe(root);
  } else {
    visible = true;
  }
  reducedMotion.addEventListener('change', () => { if (!autoplayAllowed()) userPaused = true; syncToggle(); schedule(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInterval(timer); else schedule(); });

  syncToggle();

  return {
    /** Call after content loads (items = array) or fails/empties (items = null/[]). */
    refresh(items) {
      const has = Array.isArray(items) && items.length > 0;
      if (controls) controls.hidden = !has;
      syncToggle();
      schedule();
    },
    syncLabels: syncToggle,
  };
}
