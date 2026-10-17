/**
 * PLV — Coaches page entry point.
 * Renders one roster card per published row of the Coaches sheet tab (empty message when there are none), the philosophy bands,
 * the turning 3D court and the ambient background. Each coach opens their own page (coach.html?c=ID).
 */
import { initI18n, t, onLangChange, applyTranslations } from './i18n.js?v=38';
import { initHeader } from './components/header.js?v=38';
import { initChatbot } from './components/chatbot.js?v=38';
import { setupSiteLinks } from './components/siteLinks.js?v=38';
import { initAmbient } from './components/ambient.js?v=38';
import { initCourt } from './components/courtRally.js?v=38';
import { coaches, loadCoaches, loadError, view, num, portraitHTML, fillList, setMeta, profileUrl } from './components/coachView.js?v=38';

const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency || 4) < 4;
const state = { sel: 0, tab: 'about' };

/* ---------- roster card ---------- */
function renderCard(animate = false) {
  const c = coaches[state.sel]; if (!c) return;
  const v = view(c);
  $('card-photo').innerHTML = portraitHTML(c);
  $('card-no').textContent = num(state.sel);
  $('card-role').textContent = v.role;
  $('card-name').textContent = v.name;
  setMeta($('card-meta'), v);
  $('card-bio').textContent = v.bio;
  $('card-philo').textContent = v.philosophy;
  fillList($('card-spec'), v.specs);
  fillList($('card-qual'), v.quals);
  $('card-open').href = profileUrl(c);
  if (animate && !reduced) { const card = $('coach-card'); card.classList.remove('ch-fade'); void card.offsetWidth; card.classList.add('ch-fade'); }
  renderOthers();
}
function renderOthers() {
  const ul = $('coach-others');
  ul.replaceChildren(...coaches.map((c, i) => ({ c, i })).filter(({ i }) => i !== state.sel).map(({ c, i }) => {
    const v = view(c);
    const li = document.createElement('li');
    li.innerHTML = `<a class="ch-mini" href="${profileUrl(c)}"><span class="ch-mini__img">${portraitHTML(c)}</span><span class="ch-mini__txt"><i>${num(i)}</i><b></b><small></small><em>${t('chp.mini.view')}</em></span></a>`;
    li.querySelector('b').textContent = v.name;
    li.querySelector('small').textContent = v.role;
    return li;
  }));
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
function selectCoach(i) {
  state.sel = (i + coaches.length) % coaches.length;
  renderCard(true); setTab('about');
}
function bindCard() {
  $('card-next').addEventListener('click', () => selectCoach(state.sel + 1));
  $('card-prev').addEventListener('click', () => selectCoach(state.sel - 1));
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
}

/* ---------- philosophy bands ---------- */
function bindBands() {
  const items = [...document.querySelectorAll('#phil-bands .ch-band')];
  items.forEach((li) => li.querySelector('button').addEventListener('click', () => {
    items.forEach((x) => { const on = x === li; x.classList.toggle('is-open', on); x.querySelector('button').setAttribute('aria-expanded', String(on)); });
  }));
}

/* ---------- reveals ---------- */
function initReveal() {
  const targets = document.querySelectorAll('.ch-roster .ch-h2, .ch-card, .ch-others > li, .ch-science__copy > *, .ch-board, .ch-phil .ch-h2, .ch-band, .ch-close__inner > *');
  targets.forEach((n, i) => { n.classList.add('rv'); n.style.setProperty('--d', `${(i % 4) * 0.08}s`); });
  if (!('IntersectionObserver' in window) || reduced) { targets.forEach((n) => n.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  targets.forEach((n) => io.observe(n));
}

/* ---------- 3D court: scale to fit, run only while visible ---------- */
function initBoard() {
  const board = $('court-board'), host = $('court-host');
  const fit = () => board.style.setProperty('--bs', (board.clientWidth / 660).toFixed(4));
  fit(); addEventListener('resize', fit);
  const court = initCourt(host, { reduced });
  if (!('IntersectionObserver' in window)) { court.setActive(true); return; }
  let vis = false;
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; court.setActive(vis && !document.hidden); }, { rootMargin: '80px' }).observe(board);
  document.addEventListener('visibilitychange', () => court.setActive(vis && !document.hidden));
}

/* ---------- boot ---------- */
function renderAll() {
  const none = !coaches.length;
  const msg = $('coach-empty');
  msg.hidden = !none;
  msg.textContent = none ? t(loadError ? 'chp.error' : 'chp.empty') : '';
  $('coach-card').hidden = none;
  $('coach-others').hidden = none;
  if (state.sel >= coaches.length) state.sel = 0;
  if (!none) { renderCard(); setTab(state.tab); }
}
async function boot() {
  initI18n();
  try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
  initHeader();
  setupSiteLinks();
  applyTranslations(document); // also translates the chatbot, which is built after initI18n()
  await loadCoaches();
  renderAll();
  bindCard(); bindBands(); initReveal(); initBoard();
  initAmbient($('ch-ambient'), { lite });
  onLangChange(() => renderAll());
}
boot();
