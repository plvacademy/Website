/**
 * PLV — single coach page (coach.html?c=ID). Reads the same CONFIG.COACHES_PAGE data as the roster.
 */
import { initI18n, onLangChange, applyTranslations } from './i18n.js?v=29';
import { initHeader } from './components/header.js?v=29';
import { initChatbot } from './components/chatbot.js?v=29';
import { setupSiteLinks } from './components/siteLinks.js?v=29';
import { initAmbient } from './components/ambient.js?v=29';
import { coaches, view, num, portraitHTML, fillList, setMeta, profileUrl } from './components/coachView.js?v=29';

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('c');
let idx = Math.max(0, coaches.findIndex((c) => c.id === id));

function render() {
  const c = coaches[idx]; if (!c) return;
  const v = view(c);
  document.title = `${v.name} | PLV`;
  $('cp-photo').innerHTML = portraitHTML(c);
  $('cp-no').textContent = num(idx);
  $('cp-role').textContent = v.role;
  $('cp-name').textContent = v.name;
  setMeta($('cp-meta'), v);
  $('cp-lead').textContent = v.bio;
  $('cp-bio').textContent = v.bio;
  $('cp-philo').textContent = v.philosophy;
  fillList($('cp-spec'), v.specs);
  fillList($('cp-qual'), v.quals);
  const n = coaches.length;
  [['cp-prev', (idx - 1 + n) % n], ['cp-next', (idx + 1) % n]].forEach(([el, j]) => {
    const a = $(el); a.href = profileUrl(coaches[j]); a.querySelector('b').textContent = view(coaches[j]).name;
  });
}

initI18n();
try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
initHeader();
setupSiteLinks();
applyTranslations(document);
render();
onLangChange(render);
initAmbient($('ch-ambient'), { lite: matchMedia('(max-width: 720px)').matches });
