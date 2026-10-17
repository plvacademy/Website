/**
 * PLV — shared coach data helpers for the coaches page and the single-coach profile page.
 * Empty fields show clearly marked placeholders; nothing is ever invented.
 */
import { CONFIG } from '../config.js?v=29';
import { t, pick } from '../i18n.js?v=29';

export const coaches = (CONFIG.COACHES_PAGE && CONFIG.COACHES_PAGE.coaches) || [];

const SILHOUETTE = '<svg viewBox="0 0 200 240" aria-hidden="true" focusable="false"><circle cx="100" cy="82" r="40" fill="currentColor"/><path d="M20 240c0-56 36-92 80-92s80 36 80 92z" fill="currentColor"/></svg>';

export function list(c, field) {
  const ar = document.documentElement.lang === 'ar' && Array.isArray(c[`${field}_ar`]) && c[`${field}_ar`].length ? c[`${field}_ar`] : c[field];
  return Array.isArray(ar) ? ar.filter(Boolean) : [];
}

export function view(c) {
  return {
    name: pick(c, 'name') || t('chp.ph.name'),
    role: pick(c, 'role') || t(c.kind === 'head' ? 'chp.ph.head' : 'chp.ph.assistant'),
    spec: pick(c, 'specialization') || t('chp.ph.spec'),
    exp: pick(c, 'experience') || t('chp.ph.exp'),
    bio: pick(c, 'bio') || t('chp.ph.bio'),
    philosophy: pick(c, 'philosophy') || t('chp.ph.philosophy'),
    specs: list(c, 'specializations'),
    quals: list(c, 'qualifications'),
  };
}

export const num = (i) => String(i + 1).padStart(2, '0');

export function portraitHTML(c) {
  if (c.photo) return `<img src="${encodeURI(c.photo)}" alt="" loading="lazy" decoding="async">`;
  return `<span class="ch-ph" aria-hidden="true">${SILHOUETTE}<em>${t('chp.ph.photo')}</em></span>`;
}

export function fillList(ul, items) {
  ul.replaceChildren(...(items.length ? items : [t('chp.ph.list')]).map((s) => { const li = document.createElement('li'); li.textContent = s; return li; }));
}

export function setMeta(node, v) {
  node.replaceChildren(...[v.spec, v.exp].map((s) => { const sp = document.createElement('span'); sp.textContent = s; return sp; }));
}

export const profileUrl = (c) => `coach.html?c=${encodeURIComponent(c.id)}`;
