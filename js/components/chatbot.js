/**
 * PLV — floating chatbot launcher + panel.
 * Honest placeholder: while CHATBOT_API_URL is unset the panel shows a clear
 * "Coming soon" state and the message form is disabled.
 * When a secure backend exists, set CONFIG.CHATBOT_API_URL and the same UI
 * becomes a working chat — no redesign needed.
 */
import { el } from './contentSection.js?v=3';
import { t, getLang } from '../i18n.js?v=3';
import { isChatbotConfigured, sendMessage } from '../services/chatbotService.js?v=3';

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

  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-open', open);
    if (open) (live ? input : closeBtn).focus();
    else launcher.focus();
  };

  launcher.addEventListener('click', () => setOpen(panel.hidden));
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
