/**
 * PLV — single coach page (coach.html?c=ID). Reads the same CONFIG.COACHES_PAGE data as the roster.
 */
import { initI18n, t, onLangChange, applyTranslations } from './i18n.js?v=38';
import { initHeader } from './components/header.js?v=38';
import { initChatbot } from './components/chatbot.js?v=38';
import { setupSiteLinks } from './components/siteLinks.js?v=38';
import { initAmbient } from './components/ambient.js?v=38';
import { coaches, loadCoaches, loadError, fromSheet, view, num, portraitHTML, fillList, setMeta, profileUrl, photoHTML } from './components/coachView.js?v=38';

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('c');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let idx = 0;

let galleryItems = [], galleryCat = '';
function renderGallery() {
  const ul = $('cp-gal');
  const list = galleryItems.filter((x) => !galleryCat || x.cat === galleryCat);
  ul.replaceChildren(...list.map((x) => { const li = document.createElement('li'); li.innerHTML = photoHTML(x.src, x.alt); return li; }));
  document.querySelectorAll('#cp-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === galleryCat)));
  $('cp-filter').hidden = !galleryItems.some((x) => x.cat);
}
document.querySelectorAll('#cp-filter button').forEach((b) => b.addEventListener('click', () => { galleryCat = b.dataset.cat; renderGallery(); }));

function countUp() {
  const nums = [...document.querySelectorAll('#cp-stats-list b')];
  if (reduced || !nums.length) return;
  const run = (b) => {
    const to = Number(b.dataset.to), t0 = performance.now(), dur = 1200;
    const step = (now) => { const u = Math.min(1, (now - t0) / dur); b.textContent = Math.round(to * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) { nums.forEach((b) => { b.textContent = b.dataset.to; }); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
  nums.forEach((b) => io.observe(b));
}

function renderMissing() {
  const main = $('main');
  main.innerHTML = '<section class="container ch-missing"><p role="status"></p><a class="ch-btn" href="coaches.html"><span></span></a></section>';
  main.querySelector('p').textContent = t(loadError ? 'chp.error' : 'chp.notfound');
  main.querySelector('a span').textContent = t('chp.back');
  document.title = 'PLV';
}
function render() {
  const c = coaches[idx];
  if (!c) { renderMissing(); return; }
  const v = view(c);
  document.title = `${v.name} | PLV`;
  $('cp-photo').innerHTML = portraitHTML(c);
  $('cp-no').textContent = num(idx);
  $('cp-role').textContent = v.role;
  $('cp-name').textContent = v.name;
  setMeta($('cp-meta'), v);
  $('cp-lead').textContent = v.bio;
  $('cp-bio').textContent = v.bioFull;
  $('cp-philo').textContent = v.philosophy;
  $('cp-spec').replaceChildren(...v.specs.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));
  if (!v.specs.length) $('cp-spec').replaceChildren();
  fillList($('cp-qual'), v.quals);
  // photo and list sections appear only when the coach has that data
  const show = (id, on) => { $(id).hidden = !on; };
  show('cp-stats', v.stats.length); show('achievements', v.achievements.length || v.trophies.length); show('journey', v.timeline.length || v.journeyPhotos.length); show('gallery', v.gallery.length);
  $('cp-ach-link').hidden = !(v.achievements.length || v.trophies.length);
  $('cp-about-photo').hidden = fromSheet && !v.aboutPhoto;
  $('cp-about-photo').closest('.cp-about__in').classList.toggle('cp-about__in--solo', $('cp-about-photo').hidden);
  $('cp-about-photo').firstElementChild.textContent = v.stats[0] ? `${v.stats[0].value} · ${v.stats[0].label}` : '';
  $('cp-about-photo').querySelectorAll('img, .ch-ph').forEach((n) => n.remove());
  $('cp-about-photo').insertAdjacentHTML('afterbegin', photoHTML(v.aboutPhoto, v.name));
  $('cp-stats-list').replaceChildren(...v.stats.map((x) => { const li = document.createElement('li'); li.innerHTML = '<b data-to=""></b><span></span>'; const b = li.querySelector('b'); b.dataset.to = x.value; b.textContent = reduced ? x.value : '0'; li.querySelector('span').textContent = x.label; return li; }));
  $('cp-ach-list').replaceChildren(...v.achievements.map((x) => { const li = document.createElement('li'); li.innerHTML = '<b></b><span></span>'; li.querySelector('b').textContent = x.place; li.querySelector('span').textContent = x.title; return li; }));
  const tiles = (ul, items) => ul.replaceChildren(...items.map((x) => { const li = document.createElement('li'); li.innerHTML = photoHTML(x.src, x.alt); return li; }));
  tiles($('cp-trophies'), v.trophies); tiles($('cp-jphotos'), v.journeyPhotos);
  $('cp-tl').replaceChildren(...v.timeline.map((x) => { const li = document.createElement('li'); li.innerHTML = '<b></b><p></p>'; li.querySelector('b').textContent = x.when; li.querySelector('p').textContent = x.text; return li; }));
  galleryItems = v.gallery; renderGallery();
  countUp();
  const n = coaches.length;
  [['cp-prev', (idx - 1 + n) % n], ['cp-next', (idx + 1) % n]].forEach(([el, j]) => {
    const a = $(el); a.href = profileUrl(coaches[j]); a.querySelector('b').textContent = view(coaches[j]).name;
  });
}

async function boot() {
initI18n();
try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
initHeader();
setupSiteLinks();
applyTranslations(document);
await loadCoaches();
idx = coaches.findIndex((c) => c.id === id || (c.slug && c.slug === id));
if (idx < 0 && !id && coaches.length) idx = 0;
render();
onLangChange(render);
initAmbient($('ch-ambient'), { lite: matchMedia('(max-width: 720px)').matches });
}
boot();
