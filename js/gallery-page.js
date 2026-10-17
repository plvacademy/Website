/**
 * PLV — Gallery page.
 * Photos come from the same published "Gallery" sheet tab as the Home page (fetchContent). Optional columns: caption, caption_ar,
 * category (training | matches | events | team | campus). Filters, the masonry layout and the photo viewer all work on that list.
 * With no photos yet, clearly-marked empty slots show the layout (never presented as real events).
 */
import { CONFIG } from './config.js?v=38';
import { initI18n, t, pick, isRtl, onLangChange, applyTranslations } from './i18n.js?v=38';
import { initHeader } from './components/header.js?v=38';
import { initChatbot } from './components/chatbot.js?v=38';
import { setupSiteLinks } from './components/siteLinks.js?v=38';
import { fetchContent } from './services/contentService.js?v=38';

const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CATS = ['training', 'matches', 'events', 'team', 'campus'];
const SHAPES = ['f', '', '', '', '', '', 'w', '', 't', '', '', '']; // featured, wide and tall tiles in the asymmetric grid

const state = { all: [], cat: '', sample: false, view: [], cur: 0, timer: 0 };

const norm = (v) => String(v || '').trim().toLowerCase();
const catLabel = (c) => (CATS.includes(c) ? t(`gp.cat.${c}`) : '');

function toItems(rows) {
  return rows.map((r, i) => ({
    id: String(r.id ?? i), src: r.src || '', row: r,
    cat: CATS.includes(norm(r.category)) ? norm(r.category) : '',
  }));
}
const alt = (it) => pick(it.row, 'alt') || pick(it.row, 'caption') || (it.src ? t('gp.gallery') : '');
const caption = (it) => pick(it.row, 'caption');

/* ---------- grid ---------- */
function tile(it, i) {
  const li = document.createElement('li');
  li.className = `gp-tile${SHAPES[i % SHAPES.length] ? ` gp-tile--${SHAPES[i % SHAPES.length]}` : ''}`;
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.i = i;
  b.setAttribute('aria-label', `${alt(it) || catLabel(it.cat) || t('gp.gallery')} (${i + 1}/${state.view.length})`);
  if (it.src) {
    const img = document.createElement('img');
    img.src = it.src; img.alt = ''; img.loading = i < 3 ? 'eager' : 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => { img.remove(); b.classList.add('is-empty'); b.insertAdjacentHTML('afterbegin', `<span class="gp-slot">${t('gp.slot')}</span>`); }, { once: true });
    b.append(img);
  } else {
    b.classList.add('is-empty');
    b.insertAdjacentHTML('afterbegin', `<span class="gp-slot">${t('gp.slot')}</span>`);
  }
  const lab = catLabel(it.cat), cap = caption(it);
  if (lab || cap) {
    const meta = document.createElement('span'); meta.className = 'gp-meta';
    if (lab) { const k = document.createElement('i'); k.textContent = lab; meta.append(k); }
    if (cap) { const c = document.createElement('b'); c.textContent = cap; meta.append(c); }
    b.append(meta);
  }
  li.append(b);
  return li;
}
function render() {
  state.view = state.all.filter((it) => !state.cat || it.cat === state.cat);
  const grid = $('gp-grid');
  grid.replaceChildren(...state.view.map(tile));
  grid.setAttribute('aria-busy', 'false');
  document.querySelectorAll('#gp-filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
  const empty = !state.view.length;
  $('gp-state').hidden = !empty; $('gp-retry').hidden = true;
  if (empty) $('gp-state-text').textContent = t('gp.empty');
  $('gp-mode').disabled = empty;
  const note = $('gp-note'); note.hidden = !state.sample; note.textContent = state.sample ? t('gp.sample') : '';
}

/* ---------- story frames ---------- */
function fillFrames() {
  const real = state.all.filter((it) => it.src);
  const a = real[0]?.src || 'assets/images/bg-court-desktop.jpg?v=2', b = real[1]?.src || 'assets/images/bg-court-mobile.jpg?v=2';
  $('gp-frame-a').style.backgroundImage = `url("${a}")`; $('gp-frame-b').style.backgroundImage = `url("${b}")`;
}

/* ---------- viewer ---------- */
const dlg = $('gp-viewer');
function show(i) {
  if (!state.view.length) return;
  state.cur = (i + state.view.length) % state.view.length;
  const it = state.view[state.cur], fig = $('gp-fig');
  fig.replaceChildren();
  if (it.src) { const img = document.createElement('img'); img.src = it.src; img.alt = alt(it); fig.append(img); }
  else { const s = document.createElement('div'); s.className = 'gp-vslot'; s.textContent = t('gp.slot'); fig.append(s); }
  const lab = catLabel(it.cat), cap = caption(it);
  if (lab || cap) { const fc = document.createElement('figcaption'); fc.textContent = [lab, cap].filter(Boolean).join(' · '); fig.append(fc); }
  $('gp-count').textContent = `${state.cur + 1} ${t('gp.of')} ${state.view.length}`;
  const one = state.view.length < 2;
  $('gp-prev').hidden = one; $('gp-next').hidden = one; $('gp-play').hidden = one;
}
function stopShow() { clearInterval(state.timer); state.timer = 0; const p = $('gp-play'); p.setAttribute('aria-pressed', 'false'); p.setAttribute('aria-label', t('gp.play')); p.firstElementChild.firstElementChild.setAttribute('href', '#i-play'); }
function toggleShow() {
  if (state.timer) { stopShow(); return; }
  const p = $('gp-play'); p.setAttribute('aria-pressed', 'true'); p.setAttribute('aria-label', t('gp.pause'));
  p.firstElementChild.firstElementChild.setAttribute('href', '#i-pause');
  state.timer = setInterval(() => show(state.cur + 1), 3500);
}
let opener = null;
function open(i, from) {
  if (!state.view.length) return;
  opener = from || null; show(i);
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  document.documentElement.classList.add('gp-lock');
}
dlg.addEventListener('close', () => { stopShow(); document.documentElement.classList.remove('gp-lock'); opener?.focus?.({ preventScroll: true }); });
function bindViewer() {
  $('gp-close').addEventListener('click', () => dlg.close());
  $('gp-prev').addEventListener('click', () => { stopShow(); show(state.cur - 1); });
  $('gp-next').addEventListener('click', () => { stopShow(); show(state.cur + 1); });
  $('gp-play').addEventListener('click', toggleShow);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    const step = { ArrowRight: isRtl() ? -1 : 1, ArrowLeft: isRtl() ? 1 : -1 }[e.key];
    if (step) { e.preventDefault(); stopShow(); show(state.cur + step); }
  });
  let x0 = null;
  dlg.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { stopShow(); show(state.cur + (dx < 0 ? 1 : -1) * (isRtl() ? -1 : 1)); }
  }, { passive: true });
}

/* ---------- data ---------- */
async function load() {
  const grid = $('gp-grid');
  grid.setAttribute('aria-busy', 'true');
  grid.replaceChildren(...Array.from({ length: 8 }, () => { const li = document.createElement('li'); li.className = 'gp-tile gp-tile--skel'; li.innerHTML = '<span></span>'; return li; }));
  try {
    const { items } = await fetchContent('gallery');
    if (items.length) { state.all = toItems(items); state.sample = false; }
    else { state.all = toItems(CONFIG.GALLERY_PAGE.sampleSlots); state.sample = true; }
  } catch (err) {
    console.warn('[PLV:gallery]', err);
    state.all = []; state.sample = false;
    grid.replaceChildren(); grid.setAttribute('aria-busy', 'false');
    $('gp-state').hidden = false; $('gp-state-text').textContent = t((err.kind === 'unconfigured' || err.kind === 'not-configured') ? 'state.notConfigured' : 'state.error');
    $('gp-retry').hidden = (err.kind === 'unconfigured' || err.kind === 'not-configured'); $('gp-mode').disabled = true;
    fillFrames();
    return;
  }
  render(); fillFrames();
}

function bindPage() {
  $('gp-filters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.cat = b.dataset.cat; render(); } });
  $('gp-grid').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) open(Number(b.dataset.i), b); });
  $('gp-mode').addEventListener('click', (e) => open(0, e.currentTarget));
  $('gp-retry').addEventListener('click', () => load());
  bindViewer();
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll('.gp-story__copy, .gp-frames, .gp-cta__inner').forEach((n) => { n.classList.add('rv'); io.observe(n); });
  }
}

function boot() {
  initI18n();
  try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
  initHeader(); setupSiteLinks();
  applyTranslations(document);
  bindPage();
  load();
  onLangChange(() => { if (state.all.length) render(); });
}
boot();
