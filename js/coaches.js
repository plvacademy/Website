/**
 * PLV — Coaches page entry point.
 * Renders the featured coach, the gallery and the spotlight from CONFIG.COACHES_PAGE (placeholders until real data exists),
 * and drives the motion layer (reveals, pointer parallax, tilt). The 3D scenes load lazily from components/court3d.js.
 */
import { CONFIG } from './config.js?v=26';
import { initI18n, t, pick, onLangChange, applyTranslations } from './i18n.js?v=26';
import { initHeader } from './components/header.js?v=26';
import { initChatbot } from './components/chatbot.js?v=26';
import { setupSiteLinks } from './components/siteLinks.js?v=26';

const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const data = CONFIG.COACHES_PAGE || { images: {}, coaches: [] };
const coaches = data.coaches || [];
const state = { sel: 0, tab: 'about' };

const SILHOUETTE = '<svg viewBox="0 0 200 240" aria-hidden="true" focusable="false"><circle cx="100" cy="82" r="40" fill="currentColor"/><path d="M20 240c0-56 36-92 80-92s80 36 80 92z" fill="currentColor"/></svg>';

/* ---------- data helpers (placeholders are clearly marked, never invented) ---------- */
function list(c, field) {
  const ar = document.documentElement.lang === 'ar' && Array.isArray(c[`${field}_ar`]) && c[`${field}_ar`].length ? c[`${field}_ar`] : c[field];
  return Array.isArray(ar) ? ar.filter(Boolean) : [];
}
function view(c) {
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
const num = (i) => String(i + 1).padStart(2, '0');

function portraitHTML(c) {
  if (c.photo) return `<img src="${c.photo}" alt="" loading="lazy" decoding="async">`;
  return `<span class="ch-ph" aria-hidden="true">${SILHOUETTE}<em>${t('chp.ph.photo')}</em></span>`;
}
function fillPortrait(node, c) {
  node.innerHTML = portraitHTML(c);
  if (!reduced) { node.classList.remove('ch-fade'); void node.offsetWidth; node.classList.add('ch-fade'); }
}
function fillList(ul, items) {
  ul.replaceChildren(...(items.length ? items : [t('chp.ph.list')]).map((s) => { const li = document.createElement('li'); li.textContent = s; return li; }));
}
function setMeta(node, v) {
  node.replaceChildren(...[v.spec, v.exp].map((s) => { const sp = document.createElement('span'); sp.textContent = s; return sp; }));
}

/* ---------- featured ---------- */
function renderFeatured() {
  const c = coaches[0]; if (!c) return;
  const v = view(c);
  $('feat-role').textContent = v.role;
  $('feat-title').textContent = v.name;
  setMeta($('feat-meta'), v);
  $('feat-bio').textContent = v.bio;
  const q = $('feat-qual'), p = $('feat-philo'), s = $('feat-spec');
  q.textContent = v.quals.length ? v.quals.join(' · ') : t('chp.feat.qualText');
  p.textContent = pick(c, 'philosophy') || t('chp.feat.philoText');
  s.textContent = v.specs.length ? v.specs.join(' · ') : t('chp.feat.specText');
  q.removeAttribute('data-i18n'); p.removeAttribute('data-i18n'); s.removeAttribute('data-i18n');
  const portrait = $('feat-portrait');
  portrait.innerHTML = portraitHTML(c);
}

/* ---------- gallery ---------- */
const track = $('coach-track');
function renderGallery() {
  track.replaceChildren(...coaches.map((c, i) => {
    const v = view(c);
    const li = document.createElement('li');
    li.className = 'ch-slide';
    li.innerHTML = `<button type="button" class="ch-slide__btn" data-i="${i}" aria-pressed="${i === state.sel}">
      <span class="ch-slide__img">${portraitHTML(c)}</span>
      <span class="ch-slide__no" aria-hidden="true">${num(i)}</span>
      <span class="ch-slide__cap"><b></b><small></small></span></button>`;
    li.querySelector('b').textContent = v.name;
    li.querySelector('small').textContent = v.role;
    return li;
  }));
  updateArrows();
}
function selectedBtn() { return track.querySelector(`[data-i="${state.sel}"]`); }
function markSelected() {
  track.querySelectorAll('.ch-slide__btn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === state.sel)));
}
function updateArrows() {
  const max = track.scrollWidth - track.clientWidth - 4, pos = Math.abs(track.scrollLeft);
  $('gal-prev').disabled = pos <= 4;
  $('gal-next').disabled = pos >= max;
}
function scrollGallery(dir) {
  const rtl = document.documentElement.dir === 'rtl';
  track.scrollBy({ left: dir * (rtl ? -1 : 1) * track.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
}

/* ---------- spotlight ---------- */
function renderSpotlight(animate = false) {
  const c = coaches[state.sel]; if (!c) return;
  const v = view(c);
  if (animate) fillPortrait($('spot-portrait'), c); else $('spot-portrait').innerHTML = portraitHTML(c);
  $('spot-role').textContent = v.role;
  $('spot-name').textContent = v.name;
  setMeta($('spot-meta'), v);
  $('spot-bio').textContent = v.bio;
  $('spot-philo').textContent = v.philosophy;
  fillList($('spot-spec'), v.specs);
  fillList($('spot-qual'), v.quals);
  const panel = $('spot-panel');
  if (animate && !reduced) { panel.classList.remove('ch-fade'); void panel.offsetWidth; panel.classList.add('ch-fade'); }
}
function setTab(name, focus = false) {
  state.tab = name;
  document.querySelectorAll('.ch-tabs [role=tab]').forEach((b) => {
    const on = b.id === `tab-${name}`;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  document.querySelectorAll('.ch-pane').forEach((p) => { p.hidden = p.id !== `pane-${name}`; });
}
function selectCoach(i, { scroll = true } = {}) {
  state.sel = (i + coaches.length) % coaches.length;
  markSelected();
  renderSpotlight(true);
  setTab('about');
  const sec = $('spotlight');
  sec.classList.add('ch-spot--open');
  if (scroll) sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  selectedBtn()?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
}

function bindInteractions() {
  track.addEventListener('click', (e) => { const b = e.target.closest('.ch-slide__btn'); if (b) selectCoach(Number(b.dataset.i)); });
  track.addEventListener('scroll', () => requestAnimationFrame(updateArrows), { passive: true });
  addEventListener('resize', updateArrows);
  $('gal-prev').addEventListener('click', () => scrollGallery(-1));
  $('gal-next').addEventListener('click', () => scrollGallery(1));
  $('feat-open').addEventListener('click', () => selectCoach(0));
  $('spot-next').addEventListener('click', () => selectCoach(state.sel + 1, { scroll: false }));
  $('spot-prev').addEventListener('click', () => selectCoach(state.sel - 1, { scroll: false }));
  $('spot-close').addEventListener('click', () => {
    $('spotlight').classList.remove('ch-spot--open');
    $('our-coaches').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    selectedBtn()?.focus({ preventScroll: true });
  });
  const tabs = [...document.querySelectorAll('.ch-tabs [role=tab]')];
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => setTab(b.id.replace('tab-', '')));
    b.addEventListener('keydown', (e) => {
      const rtl = document.documentElement.dir === 'rtl';
      const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
      if (step) { e.preventDefault(); setTab(tabs[(i + step + tabs.length) % tabs.length].id.replace('tab-', ''), true); }
      if (e.key === 'Home') { e.preventDefault(); setTab('about', true); }
      if (e.key === 'End') { e.preventDefault(); setTab('qualifications', true); }
    });
  });
  // desktop hover depth on gallery panels
  if (matchMedia('(hover: hover)').matches && !reduced) {
    track.addEventListener('pointermove', (e) => {
      const b = e.target.closest('.ch-slide__btn'); if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * 10}deg`);
      b.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - .5) * 8}deg`);
    });
    track.addEventListener('pointerout', (e) => { const b = e.target.closest('.ch-slide__btn'); if (b) { b.style.removeProperty('--ry'); b.style.removeProperty('--rx'); } });
    const sp = $('spot-panel');
    sp.addEventListener('pointermove', (e) => {
      const r = $('spot-portrait').getBoundingClientRect();
      $('spot-portrait').style.setProperty('--cx', Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)));
      $('spot-portrait').style.setProperty('--cy', Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2)));
    });
    sp.addEventListener('pointerleave', () => { $('spot-portrait').style.setProperty('--cx', 0); $('spot-portrait').style.setProperty('--cy', 0); });
  }
}

/* ---------- motion: reveals + pointer/scroll parallax ---------- */
function initMotion() {
  const hero = document.querySelector('.ch-hero');
  const targets = document.querySelectorAll('.ch-feature__info > *, .ch-portrait--lg, .ch-facts li, .ch-gallery__head, .ch-slide, .ch-science__copy > *, .ch-court, .ch-phil .ch-h2, .ch-phil__item, .ch-spot__panel, .ch-close__inner > *');
  targets.forEach((n, i) => { n.classList.add('rv'); n.style.setProperty('--d', `${(i % 4) * 0.08}s`); });
  const sections = document.querySelectorAll('.ch-feature, .ch-phil, .ch-close, .ch-science');
  if (!('IntersectionObserver' in window) || reduced) { targets.forEach((n) => n.classList.add('in')); sections.forEach((s) => s.classList.add('in')); }
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((n) => io.observe(n)); sections.forEach((s) => io.observe(s));
  }
  if (reduced) return;
  let raf = 0, px = 0, py = 0;
  const apply = () => { raf = 0; hero.style.setProperty('--px', px.toFixed(3)); hero.style.setProperty('--py', py.toFixed(3)); };
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width - .5) * 2; py = ((e.clientY - r.top) / r.height - .5) * 2;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  hero.addEventListener('pointerleave', () => { px = py = 0; if (!raf) raf = requestAnimationFrame(apply); });
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; const h = hero.offsetHeight || 1; hero.style.setProperty('--sy', Math.min(1, Math.max(0, scrollY / h)).toFixed(3)); });
  }, { passive: true });
}

/* ---------- optional photography from config (never requested when empty) ---------- */
function applyImages() {
  const im = data.images || {};
  if (im.hero) $('hero-photo').style.backgroundImage = `url("${im.hero}")`;
  if (im.closing) $('close-photo').style.backgroundImage = `url("${im.closing}")`;
}

/* ---------- 3D (lazy, capability-checked) ---------- */
function canRun3D() {
  if (reduced) return false;
  if (navigator.connection?.saveData) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function initThree() {
  if (!canRun3D() || !('IntersectionObserver' in window)) return;
  let mod;
  const load = () => (mod ||= import('./components/court3d.js?v=26'));
  // small screens and weaker devices get the lighter render (fewer polygons, no antialiasing, 1x pixel ratio)
  const lite = matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency || 4) < 4 || (navigator.deviceMemory || 4) < 2;
  const scenes = [
    [$('ball-stage'), 'initBall'],
    [$('court-stage'), 'initCourt'],
  ];
  scenes.forEach(([stage, fn]) => {
    let handle = null, started = false;
    const io = new IntersectionObserver(async (es) => {
      const vis = es[0].isIntersecting;
      if (vis && !started) {
        started = true;
        try { handle = (await load())[fn](stage, { lite }); } catch (err) { console.warn('[PLV:3d] falling back to static art', err); }
      }
      handle?.setActive(vis && !document.hidden);
    }, { rootMargin: '120px' });
    io.observe(stage);
    document.addEventListener('visibilitychange', () => handle?.setActive(!document.hidden));
  });
}

/* ---------- boot ---------- */
function renderAll() {
  renderFeatured(); renderGallery(); renderSpotlight(); setTab(state.tab);
}
function boot() {
  initI18n();
  try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
  initHeader();
  setupSiteLinks();
  applyTranslations(document); // also translates the chatbot, which is built after initI18n()
  applyImages();
  renderAll();
  bindInteractions();
  initMotion();
  onLangChange(() => renderAll());
  initThree();
}
boot();
