/**
 * PLV — shared coach data helpers for the coaches page and the single-coach profile page.
 * Empty fields show clearly marked placeholders; nothing is ever invented.
 */
import { CONFIG } from '../config.js?v=38';
import { t, pick } from '../i18n.js?v=38';
import { fetchContent } from '../services/contentService.js?v=38';

/* The coaches come from the "Coaches" tab of the content sheet (same tab the Home page uses): one card per published row. */
export let coaches = [];
export let fromSheet = false;

const parts = (v) => String(v || '').split('|').map((x) => x.trim()).filter(Boolean);
const url = (v) => (/^(https?:\/\/|[\w-]+\/)/i.test(String(v || '').trim()) ? String(v).trim() : '');
function zip(en, ar, make) { return en.map((e, i) => make(e, ar[i] || '')); }
const numRe = /^\s*(\d+)\s+(.*)$/;
function fromRow(r, i) {
  const stats = zip(parts(r.stats), parts(r.stats_ar), (e, a) => { const x = numRe.exec(e) || []; const y = numRe.exec(a) || []; return { value: Number(x[1]) || 0, label: x[2] || '', label_ar: y[2] || '' }; }).filter((x) => x.label);
  const cut = (v) => { const k = v.indexOf(' '); return k < 0 ? [v, ''] : [v.slice(0, k), v.slice(k + 1).trim()]; };
  const achievements = zip(parts(r.achievements), parts(r.achievements_ar), (e, a) => { const [p, ti] = cut(e), [pa, tia] = cut(a); return { place: p, place_ar: pa, title: ti, title_ar: tia }; });
  const split = (v) => { const k = v.indexOf(':'); return k < 0 ? ['', v] : [v.slice(0, k).trim(), v.slice(k + 1).trim()]; };
  const timeline = zip(parts(r.timeline), parts(r.timeline_ar), (e, a) => { const [w, tx] = split(e), [wa, txa] = split(a); return { when: w, when_ar: wa, text: tx, text_ar: txa }; });
  return {
    id: String(r.id), slug: r.slug || '', kind: r.kind === 'assistant' ? 'assistant' : (r.kind === 'head' || i === 0 ? 'head' : 'assistant'),
    name: r.name || '', name_ar: r.name_ar || '', role: r.role || '', role_ar: r.role_ar || '',
    specialization: r.specialization || '', specialization_ar: r.specialization_ar || '',
    experience: r.experience || '', experience_ar: r.experience_ar || '',
    bio: r.intro || r.bio || '', bio_ar: r.intro_ar || r.bio_ar || '',
    bioFull: r.bio || r.intro || '', bioFull_ar: r.bio_ar || r.intro_ar || '',
    philosophy: r.philosophy || '', philosophy_ar: r.philosophy_ar || '',
    specializations: parts(r.specializations), specializations_ar: parts(r.specializations_ar),
    qualifications: parts(r.qualifications), qualifications_ar: parts(r.qualifications_ar),
    photo: r.image || '', about_photo: url(r.about_photo),
    stats, achievements, timeline, trophies: [], journey_photos: [],
    gallery: parts(r.photos).map(url).filter(Boolean).map((src) => ({ src })),
  };
}

/** Loads the published coaches from the sheet. Returns { error } with the failure kind when the sheet cannot be read. */
export let loadError = null;
export async function loadCoaches() {
  loadError = null;
  try {
    const { items } = await fetchContent('coaches');
    coaches = items.map(fromRow); fromSheet = true;
  } catch (err) { console.warn('[PLV:coaches]', err); coaches = []; loadError = err.kind || 'error'; }
  return coaches;
}

const SILHOUETTE = '<svg viewBox="0 0 200 240" aria-hidden="true" focusable="false"><circle cx="100" cy="82" r="40" fill="currentColor"/><path d="M20 240c0-56 36-92 80-92s80 36 80 92z" fill="currentColor"/></svg>';

export function list(c, field) {
  const ar = document.documentElement.lang === 'ar' && Array.isArray(c[`${field}_ar`]) && c[`${field}_ar`].length ? c[`${field}_ar`] : c[field];
  return Array.isArray(ar) ? ar.filter(Boolean) : [];
}

export function view(c) {
  const ph = (k) => (fromSheet ? '' : t(k)); // real data never shows placeholder wording
  return {
    name: pick(c, 'name') || ph('chp.ph.name'),
    role: pick(c, 'role') || ph(c.kind === 'head' ? 'chp.ph.head' : 'chp.ph.assistant'),
    spec: pick(c, 'specialization') || ph('chp.ph.spec'),
    exp: pick(c, 'experience') || ph('chp.ph.exp'),
    bio: pick(c, 'bio') || ph('chp.ph.bio'),
    bioFull: pick(c, 'bioFull') || pick(c, 'bio') || ph('chp.ph.bio'),
    philosophy: pick(c, 'philosophy') || ph('chp.ph.philosophy'),
    specs: list(c, 'specializations'),
    quals: list(c, 'qualifications'),
    stats: (c.stats || []).map((x) => ({ value: Number(x.value) || 0, label: pick(x, 'label') })),
    achievements: (c.achievements || []).map((x) => ({ place: pick(x, 'place'), title: pick(x, 'title') })),
    timeline: (c.timeline || []).map((x) => ({ when: pick(x, 'when'), text: pick(x, 'text') })),
    gallery: (c.gallery || []).map((x) => ({ src: x.src || '', alt: pick(x, 'alt'), cat: x.cat || '' })),
    trophies: (c.trophies || []).map((x) => ({ src: x.src || '', alt: pick(x, 'alt') })),
    journeyPhotos: (c.journey_photos || []).map((x) => ({ src: x.src || '', alt: pick(x, 'alt') })),
    aboutPhoto: c.about_photo || '',
  };
}

export const num = (i) => String(i + 1).padStart(2, '0');

export function portraitHTML(c) {
  if (c.photo) return `<img src="${encodeURI(c.photo)}" alt="" loading="lazy" decoding="async">`;
  return `<span class="ch-ph" aria-hidden="true">${SILHOUETTE}${fromSheet ? '' : `<em>${t('chp.ph.photo')}</em>`}</span>`;
}

export function fillList(ul, items) {
  ul.replaceChildren(...(items.length || fromSheet ? items : [t('chp.ph.list')]).map((s) => { const li = document.createElement('li'); li.textContent = s; return li; }));
}

export function setMeta(node, v) {
  node.replaceChildren(...[v.spec, v.exp].map((s) => { const sp = document.createElement('span'); sp.textContent = s; return sp; }));
}

export const profileUrl = (c) => `coach.html?c=${encodeURIComponent(c.id)}`;

/** Any photo slot: the image when a path is set, otherwise a clearly marked empty slot. */
export function photoHTML(src, alt = '') {
  if (src) return `<img src="${encodeURI(src)}" alt="${String(alt).replace(/"/g, '&quot;')}" loading="lazy" decoding="async">`;
  return `<span class="ch-ph ch-ph--tile" aria-hidden="true">${SILHOUETTE}<em>${t('chp.ph.photo')}</em></span>`;
}
