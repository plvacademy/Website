/**
 * PLV — floating chatbot launcher + panel.
 * The panel is the view only. The bot itself (answers, registration from the chat, unanswered-question log) is one
 * module loaded the first time a visitor opens the chat (CONFIG.CHATBOT_MODULE_URL). If it cannot be loaded, or the
 * chatbot is not configured, the panel keeps the honest "Coming soon" state with a WhatsApp link.
 */
import { el } from './contentSection.js?v=45';
import { t, getLang, onLangChange } from '../i18n.js?v=45';
import { CONFIG } from '../config.js?v=45';
import { submitRegistration } from '../services/registrationService.js?v=45';

const isHttps = (v) => typeof v === 'string' && /^https:\/\//i.test(v.trim());
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
]);

export function initChatbot(root) {
  if (!root) return;

  const configured = isHttps(CONFIG.CHATBOT_API_URL) && isHttps(CONFIG.CHATBOT_MODULE_URL);

  /* Launcher */
  const logo = el('img', { src: 'assets/images/Logo.png?v=2', alt: '', width: '40', height: '40' });
  const launcherFallback = el('span', { class: 'chatbot__launcher-text', text: 'PLV', hidden: true });
  logo.addEventListener('error', () => { logo.hidden = true; launcherFallback.hidden = false; }, { once: true });

  const launcher = el('button', {
    type: 'button',
    class: 'chatbot__launcher',
    'aria-haspopup': 'dialog',
    'aria-expanded': 'false',
    'aria-controls': 'chatbot-panel',
    'data-i18n-aria': 'chat.open',
  }, [logo, launcherFallback]);

  const hint = el('span', { class: 'chatbot__hint', 'data-i18n': 'chat.launcher' });

  /* Panel */
  const closeBtn = el('button', { type: 'button', class: 'chatbot__close', 'data-i18n-aria': 'chat.close', text: '×' });
  const resetBtn = el('button', { type: 'button', class: 'chatbot__reset', hidden: true, 'data-i18n-aria': 'chat.reset', 'data-i18n-title': 'chat.reset', text: '↻' });
  const messages = el('div', { class: 'chatbot__messages', role: 'log', 'aria-live': 'polite' });

  const waNumber = String((CONFIG.CONTACT && CONFIG.CONTACT.whatsappNumber) || '').replace(/\D/g, '');
  const status = el('div', { class: 'chatbot__soon', hidden: true }, [
    el('strong', { 'data-i18n': 'chat.soon' }),
    el('p', { 'data-i18n': 'chat.soonText' }),
    waNumber ? el('a', { class: 'chatbot__action chatbot__action--wa', href: `https://wa.me/${waNumber}`, target: '_blank', rel: 'noopener noreferrer', 'data-i18n': 'chat.whatsapp' }) : null,
  ]);

  const input = el('input', {
    type: 'text', class: 'chatbot__input', autocomplete: 'off', maxlength: '500', enterkeyhint: 'send',
    'data-i18n-placeholder': 'chat.placeholder', 'data-i18n-aria': 'chat.placeholder',
  });
  const sendBtn = el('button', { type: 'button', class: 'btn btn--primary btn--sm', 'data-i18n': 'chat.send' });
  const form = el('div', { class: 'chatbot__form' }, [input, sendBtn]); // not a <form>: Enter is handled below
  input.disabled = true; sendBtn.disabled = true;

  const title = el('h2', { id: 'chatbot-title' });
  const panel = el('section', {
    id: 'chatbot-panel', class: 'chatbot__panel', role: 'dialog', 'aria-modal': 'false',
    'aria-labelledby': 'chatbot-title', hidden: true,
  }, [
    el('header', { class: 'chatbot__header' }, [
      title,
      el('div', { class: 'chatbot__tools' }, [resetBtn, closeBtn]),
    ]),
    messages,
    status,
    form,
  ]);

  root.replaceChildren(panel, hint, launcher);

  // Slide the "Chat with us" capsule out every 15s for ~5s (never while the panel is open or being dragged).
  const peek = () => {
    if (panel.hidden && !root.classList.contains('is-dragging')) {
      root.classList.add('is-peek');
      setTimeout(() => root.classList.remove('is-peek'), 5000);
    }
  };
  setTimeout(peek, 2500);
  setInterval(peek, 15000);

  const setOpen = (open) => {
    if (open) placePanel(true);
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-open', open);
    if (!open) placePanel(false);
    if (open) { ensureBot(); (state === 'ready' ? input : closeBtn).focus(); }
    else launcher.focus();
  };


  /* ---------------- Movable launcher ----------------
   * Drag it (mouse or finger) anywhere; on release it snaps to the nearest side edge and keeps its height.
   * Keyboard alternative: focus it and press Shift + arrow keys. The position is remembered (if storage works). */
  const STORE = 'plv.chat.pos';
  const MARGIN = 12;
  let pos = { side: null, bottom: null }; // side: 'left' | 'right' | null (default corner)
  let dragged = false;

  const maxBottom = () => Math.max(MARGIN, window.innerHeight - root.offsetHeight - MARGIN);
  const clampBottom = (b) => Math.min(Math.max(MARGIN, b), maxBottom());

  function applyPos() {
    root.classList.toggle('is-left', pos.side === 'left');
    root.classList.toggle('is-right', pos.side === 'right');
    root.style.left = ''; root.style.right = '';
    if (pos.bottom != null) root.style.bottom = `${clampBottom(pos.bottom)}px`;
  }
  function savePos() {
    try { localStorage.setItem(STORE, JSON.stringify(pos)); } catch { /* storage may be unavailable */ }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && (saved.side === 'left' || saved.side === 'right') && Number.isFinite(saved.bottom)) { pos = saved; applyPos(); }
  } catch { /* ignore */ }
  window.addEventListener('resize', () => { if (pos.side) applyPos(); });

  // Open the panel above the launcher when there is room, otherwise below it.
  function placePanel(open) {
    if (!open) {
      root.classList.remove('is-below');
      root.style.top = '';
      if (pos.bottom != null) root.style.bottom = `${clampBottom(pos.bottom)}px`;
      else root.style.bottom = '';
      return;
    }
    const r = launcher.getBoundingClientRect();
    if (r.top < 360) { // not enough room above
      root.classList.add('is-below');
      root.style.top = `${r.top}px`;
      root.style.bottom = 'auto';
    }
  }

  let drag = null;
  launcher.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const r = root.getBoundingClientRect();
    try { launcher.setPointerCapture(e.pointerId); } catch { /* not supported: dragging still works while the pointer stays over it */ }
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, moving: false };
  });
  launcher.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moving) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return; // a tap/click, not a drag
      drag.moving = true;
      if (!panel.hidden) setOpen(false);
      root.classList.add('is-dragging');
      root.classList.remove('is-left', 'is-right');
    }
    const left = Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - drag.w);
    const top = Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - drag.h);
    root.style.right = 'auto';
    root.style.left = `${left}px`;
    root.style.bottom = `${window.innerHeight - top - drag.h}px`;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasMoving = drag.moving;
    drag = null;
    if (!wasMoving) return;
    dragged = true;
    setTimeout(() => { dragged = false; }, 0); // swallow the click that follows a drag
    root.classList.remove('is-dragging');
    const r = root.getBoundingClientRect();
    pos = { side: r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right', bottom: window.innerHeight - r.bottom };
    applyPos();
    savePos();
  };
  launcher.addEventListener('pointerup', endDrag);
  launcher.addEventListener('pointercancel', endDrag);
  launcher.addEventListener('keydown', (e) => {
    if (!e.shiftKey || !e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const r = root.getBoundingClientRect();
    const cur = { side: pos.side || (r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right'), bottom: pos.bottom ?? window.innerHeight - r.bottom };
    if (e.key === 'ArrowLeft') cur.side = 'left';
    if (e.key === 'ArrowRight') cur.side = 'right';
    if (e.key === 'ArrowUp') cur.bottom += 48;
    if (e.key === 'ArrowDown') cur.bottom -= 48;
    pos = { side: cur.side, bottom: clampBottom(cur.bottom) };
    applyPos();
    savePos();
  });

  launcher.addEventListener('click', (e) => {
    if (dragged) { e.preventDefault(); return; }
    setOpen(panel.hidden);
  });
  closeBtn.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  /* ---------------- Chat (view of the bot module) ---------------- */
  let bot = null;
  let state = configured ? 'idle' : 'off'; // idle | loading | ready | failed | off
  let busy = false;       // true while an answer (and its follow-up) is pending: nothing can be sent
  let epoch = 0;          // bumped on "new chat" so late answers of the old conversation are dropped
  let chipsEl = null;
  let spoke = false;      // true once the visitor has written or pressed anything in this conversation

  const scrollDown = () => { messages.scrollTop = messages.scrollHeight; };
  const dirOf = (lang) => (lang === 'ar' ? 'rtl' : 'ltr');
  const safeHref = (href) => {
    try {
      const u = new URL(String(href), location.href);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
    } catch { return ''; }
  };

  function bubble(who, text, lang) {
    const node = el('div', { class: `chatbot__msg chatbot__msg--${who}` });
    node.textContent = String(text); // never innerHTML
    if (lang) { node.dir = dirOf(lang); node.lang = lang; }
    messages.append(node);
    scrollDown();
    return node;
  }
  function showTyping() {
    const node = el('div', { class: 'chatbot__msg chatbot__msg--bot chatbot__typing', role: 'status', 'aria-label': t('chat.typing') }, [
      el('span'), el('span'), el('span'),
    ]);
    messages.append(node);
    scrollDown();
    return () => node.remove();
  }
  function clearChips() { if (chipsEl) { chipsEl.remove(); chipsEl = null; } }

  function showReply(reply) {
    clearChips();
    if (!reply || typeof reply !== 'object') return;
    const lang = reply.lang === 'ar' ? 'ar' : 'en';
    if (reply.text) bubble('bot', reply.text, lang);
    const links = (Array.isArray(reply.actions) ? reply.actions : []).map((a) => {
      const href = a && safeHref(a.href);
      if (!href || !a.label) return null;
      const link = el('a', { class: `chatbot__action${a.kind === 'whatsapp' ? ' chatbot__action--wa' : ''}`, href });
      link.textContent = String(a.label);
      if (a.external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      return link;
    }).filter(Boolean);
    if (links.length) { messages.append(el('div', { class: 'chatbot__actions', dir: dirOf(lang) }, links)); }
    const chips = (Array.isArray(reply.chips) ? reply.chips : []).filter((c) => c && c.label);
    if (chips.length) {
      chipsEl = el('div', { class: 'chatbot__chips', dir: dirOf(lang) });
      chips.forEach((chip) => {
        const b = el('button', { type: 'button', class: 'chatbot__chip' });
        b.textContent = String(chip.label);
        b.addEventListener('click', () => turn(chip.label, () => bot.choose(chip, getLang())));
        chipsEl.append(b);
      });
      messages.append(chipsEl);
    }
    scrollDown();
  }

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on || state !== 'ready';
    messages.querySelectorAll('.chatbot__chip').forEach((b) => { b.disabled = on; });
  }
  function setComposer(on) {
    input.disabled = !on;
    sendBtn.disabled = !on;
    resetBtn.hidden = !on;
  }
  function updateTitle() {
    let name = '';
    try { name = (bot && bot.botName(getLang())) || ''; } catch { /* fall back to the default title */ }
    title.textContent = name || t('chat.title');
  }

  /** One conversation turn: the visitor's bubble, "typing…", the answer, then the follow-up if there is one. */
  async function turn(userLabel, call) {
    if (busy || state !== 'ready') return;
    const mine = epoch;
    spoke = true;
    setBusy(true);
    clearChips();
    bubble('user', userLabel);
    const stop = showTyping();
    try {
      const reply = await call();
      if (mine !== epoch) return;
      stop();
      showReply(reply);
      if (reply && reply.followUp && typeof reply.followUp.then === 'function') {
        const stopFollow = showTyping();
        try {
          const next = await reply.followUp;
          if (mine !== epoch) return;
          stopFollow();
          showReply(next);
        } catch (err) { stopFollow(); console.warn('[PLV:chatbot] follow-up', err && err.message); }
      }
    } catch (err) {
      console.warn('[PLV:chatbot]', err && err.message);
      if (mine === epoch) { stop(); bubble('bot', t('chat.error')); }
    } finally {
      if (mine === epoch) { setBusy(false); if (!panel.hidden) input.focus(); }
    }
  }

  function send() {
    const text = input.value.trim();
    if (!text || busy || state !== 'ready') return;
    input.value = '';
    turn(text, () => bot.reply(text, getLang()));
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });

  function startConversation() {
    epoch += 1;
    busy = false;
    spoke = false;
    showWelcome();
    setBusy(false);
  }
  function showWelcome() {
    messages.replaceChildren();
    chipsEl = null;
    showReply(bot.welcome(getLang()));
  }
  resetBtn.addEventListener('click', () => {
    if (state !== 'ready') return;
    bot.reset();
    startConversation();
    input.focus();
  });

  /** Loads the bot module the first time (and again on the next open if it failed). */
  async function ensureBot() {
    if (state !== 'idle' && state !== 'failed') return;
    state = 'loading';
    status.hidden = true;
    messages.replaceChildren();
    const stop = showTyping();
    try {
      const mod = await withTimeout(import(CONFIG.CHATBOT_MODULE_URL.trim()), 12000);
      if (typeof mod.createSiteBot !== 'function') throw new Error('createSiteBot is missing');
      const instance = mod.createSiteBot({
        apiUrl: CONFIG.CHATBOT_API_URL,
        feedbackUrl: CONFIG.FEEDBACK_API_URL,
        whatsappNumber: CONFIG.CONTACT.whatsappNumber,
        socials: CONFIG.CONTACT.socials,
        links: {
          register: CONFIG.REGISTRATION_URL,
          coaches: CONFIG.PAGES.coaches || 'coaches.html',
          gallery: CONFIG.PAGES.gallery || 'gallery.html',
          feedback: CONFIG.PAGES.feedback || 'feedback.html',
        },
        submitRegistration,
      });
      await withTimeout(instance.ready, 15000);
      bot = instance;
      state = 'ready';
      stop();
      updateTitle();
      setComposer(true);
      startConversation();
      if (!panel.hidden) input.focus();
    } catch (err) {
      console.warn('[PLV:chatbot] could not start', err && err.message);
      state = 'failed';
      stop();
      messages.replaceChildren();
      bubble('bot', t('chat.welcome'));
      status.hidden = false;
      setComposer(false);
    }
  }

  if (state === 'off') { bubble('bot', t('chat.welcome')); status.hidden = false; }
  updateTitle();
  onLangChange(() => {
    updateTitle();
    if (spoke) return; // a conversation already started: leave it as it is
    // The visitor changed the site language before saying anything: show the welcome again in the new language
    // (no bot.reset(): the conversation id stays the same).
    if (state === 'ready') showWelcome();
    else if (state === 'failed' || state === 'off') { messages.replaceChildren(); bubble('bot', t('chat.welcome')); }
  });
}
