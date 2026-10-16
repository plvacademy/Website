/**
 * PLV — header behaviour: mobile menu, language switch, scroll state, active link.
 */
import { setLang } from '../i18n.js?v=19';

export function initHeader() {
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!header || !toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  // Language buttons (header and anywhere else carrying data-lang)
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Shadow once scrolled
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Active link (scroll-spy). Each nav item owns one or more sections of the Home page.
  const GROUPS = {
    home: ['home', 'about'],
    programs: ['programs', 'why'],
    coaches: ['coaches'],
    gallery: ['gallery', 'feedback'],
    contact: ['contact'],
  };
  const keyOf = (a) => a.dataset.page || (a.getAttribute('href') || '').replace(/^#/, '');
  const links = [...nav.querySelectorAll('.site-nav__list a')].filter((a) => GROUPS[keyOf(a)]);
  if (!links.length) return;

  let locked = false;
  let lockTimer = 0;
  const activate = (key) => links.forEach((a) => {
    if (keyOf(a) === key) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
  const current = () => {
    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) return 'contact'; // bottom of the page
    const line = window.scrollY + (header.offsetHeight || 70) + window.innerHeight * 0.3;
    let found = 'home';
    Object.entries(GROUPS).forEach(([key, ids]) => ids.forEach((id) => {
      const sec = document.getElementById(id);
      if (sec && sec.getBoundingClientRect().top + window.scrollY <= line) found = key;
    }));
    return found;
  };
  const update = () => { if (!locked) activate(current()); };

  // Clicking a link highlights it right away and keeps it while the page scrolls there.
  links.forEach((a) => a.addEventListener('click', () => {
    activate(keyOf(a));
    locked = true;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => { locked = false; update(); }, 900);
  }));
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
