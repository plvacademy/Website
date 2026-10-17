/**
 * PLV — links shared by every page (Home, Programs/Registration):
 * page links from CONFIG.PAGES, Register Now, WhatsApp, social icons, footer contact, year.
 */
import { CONFIG } from '../config.js?v=20';
import { el, icon } from './contentSection.js?v=20';

export function setupSiteLinks() {
  // "View All …" / footer links to future dedicated pages
  document.querySelectorAll('[data-page]').forEach((a) => {
    const url = CONFIG.PAGES[a.dataset.page];
    if (url) { a.setAttribute('href', url.replace('{id}', '')); a.hidden = false; }
    else if (a.hasAttribute('data-hide-if-unset')) a.hidden = true;
  });

  // If a dedicated page cannot be reached, send the visitor to its section on the Home page instead.
  const FALLBACK_SECTION = { programs: 'programs' };
  document.querySelectorAll('[data-page]').forEach((a) => {
    const section = document.getElementById(FALLBACK_SECTION[a.dataset.page] || '');
    if (!section || a.hidden) return;
    a.addEventListener('click', async (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      const href = a.getAttribute('href');
      let ok = false;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(href, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        ok = res.ok;
      } catch { ok = false; }
      if (ok) window.location.href = href;
      else section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Register Now -> the registration page (same site). Links marked data-keep-href are left alone.
  document.querySelectorAll('.js-register:not([data-keep-href])').forEach((a) => {
    if (CONFIG.REGISTRATION_URL) {
      a.href = CONFIG.REGISTRATION_URL;
      if (/^https?:\/\//i.test(CONFIG.REGISTRATION_URL)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    } else {
      a.href = '#contact';
    }
  });

  // WhatsApp
  const number = (CONFIG.CONTACT.whatsappNumber || '').replace(/\D/g, '');
  document.querySelectorAll('.js-whatsapp').forEach((a) => {
    const label = a.querySelector('.wa-label');
    const num = a.querySelector('.wa-number');
    if (number) {
      a.href = `https://wa.me/${number}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (num) num.remove(); // the number is not displayed on the page
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.classList.add('is-disabled');
      if (label) label.dataset.i18n = 'cta.whatsappSoon';
    }
  });

  // Social links: only configured ones are shown
  const socials = Object.entries(CONFIG.CONTACT.socials).filter(([, url]) => /^https?:\/\//i.test(url || ''));
  document.querySelectorAll('.js-socials').forEach((box) => {
    if (!socials.length) { box.hidden = true; return; }
    box.replaceChildren(...socials.map(([name, url]) =>
      el('a', { class: 'social-link', href: url, target: '_blank', rel: 'noopener noreferrer', 'data-i18n-aria': `social.${name}` }, [icon(`i-${name}`)])));
  });

  // Footer contact info: only what is configured is shown
  const rows = [];
  document.querySelectorAll('.js-contact-info').forEach((ul) => {
    ul.hidden = rows.length === 0;
    ul.replaceChildren(...rows.map(([labelKey, text, href, external]) => el('li', {}, [
      el('span', { class: 'footer-contact__label', 'data-i18n': labelKey }),
      el('a', { href, dir: 'ltr', ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}), text }),
    ])));
  });

  document.getElementById('year')?.replaceChildren(String(new Date().getFullYear()));
}
