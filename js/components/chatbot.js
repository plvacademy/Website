/**
 * PLV — floating chatbot launcher + panel.
 * Honest placeholder: while CHATBOT_API_URL is unset the panel shows a clear
 * "Coming soon" state and the message form is disabled.
 * When a secure backend exists, set CONFIG.CHATBOT_API_URL and the same UI
 * becomes a working chat — no redesign needed.
 */
import { el } from './contentSection.js?v=39';
import { t, getLang } from '../i18n.js?v=39';
import { isChatbotConfigured, sendMessage } from '../services/chatbotService.js?v=39';

export function initChatbot(root) {
  if (!root) return;

  const live = isChatbotConfigured();

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
  const messages = el('div', { class: 'chatbot__messages', role: 'log', 'aria-live': 'polite' }, [
    el('p', { class: 'chatbot__msg chatbot__msg--bot', 'data-i18n': 'chat.welcome' }),
  ]);

  const status = live
    ? null
    : el('div', { class: 'chatbot__soon' }, [
        el('strong', { 'data-i18n': 'chat.soon' }),
        el('p', { 'data-i18n': 'chat.soonText' }),
      ]);

  const input = el('input', {
    type: 'text', class: 'chatbot__input', autocomplete: 'off', maxlength: '500',
    'data-i18n-placeholder': 'chat.placeholder', 'data-i18n-aria': 'chat.placeholder',
  });
  const sendBtn = el('button', { type: 'submit', class: 'btn btn--primary btn--sm', 'data-i18n': 'chat.send' });
  const form = el('form', { class: 'chatbot__form' }, [input, sendBtn]);
  if (!live) { input.disabled = true; sendBtn.disabled = true; }

  const panel = el('section', {
    id: 'chatbot-panel', class: 'chatbot__panel', role: 'dialog', 'aria-modal': 'false',
    'aria-labelledby': 'chatbot-title', hidden: true,
  }, [
    el('header', { class: 'chatbot__header' }, [
      el('h2', { id: 'chatbot-title', 'data-i18n': 'chat.title' }),
      closeBtn,
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
    if (open) (live ? input : closeBtn).focus();
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

  const addMessage = (who, text) => {
    messages.append(el('p', { class: `chatbot__msg chatbot__msg--${who}`, text }));
    messages.scrollTop = messages.scrollHeight;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!live || !text) return;
    addMessage('user', text);
    input.value = '';
    sendBtn.disabled = true;
    try {
      addMessage('bot', await sendMessage(text, { lang: getLang() }));
    } catch (err) {
      console.warn('[PLV:chatbot]', err.message);
      addMessage('bot', t('chat.error'));
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
}
