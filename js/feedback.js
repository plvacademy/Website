/**
 * PLV — Feedback page entry point.
 * The form (name, Parent/Player, half-star rating, message, mobile) and the list of approved reviews.
 * Success is shown ONLY after the server confirms the row was saved; any failure keeps the form and allows a retry.
 */
import { initI18n, t, getLang, applyTranslations, onLangChange } from './i18n.js?v=38';
import { initHeader } from './components/header.js?v=38';
import { initChatbot } from './components/chatbot.js?v=38';
import { createSection, el } from './components/contentSection.js?v=38';
import { setupSiteLinks } from './components/siteLinks.js?v=38';
import { createRatingInput, formatRating } from './components/stars.js?v=38';
import { renderReviewCard } from './components/reviewCard.js?v=38';
import {
  submitFeedback, FeedbackError, newRequestId, normalizeName, isValidName, normalizeMobile, parseRating, isLowRating, FEEDBACK_LIMITS,
} from './services/feedbackService.js?v=38';

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */
function initForm() {
  const form = $('fb-form');
  const shownAt = performance.now();
  let requestId = newRequestId(); // stays the same for a retry of the same submission
  let busy = false;
  let errorKeys = {}; // field -> i18n key, so messages follow the language

  const rating = createRatingInput({
    onChange: () => { clearError('rating'); refreshRating(); refreshMobile(); },
  });
  $('fb-rating-mount').appendChild(rating.element);

  const fields = { name: $('fb-name'), message: $('fb-message'), mobile: $('fb-mobile') };
  const errEl = { name: $('fb-name-err'), type: $('fb-type-err'), rating: $('fb-rating-err'), message: $('fb-message-err'), mobile: $('fb-mobile-err'), form: $('fb-form-err') };
  const wrapOf = { name: fields.name.closest('.fb-field'), type: $('fb-type-err').closest('.fb-field'), rating: $('fb-rating-field'), message: fields.message.closest('.fb-field'), mobile: $('fb-mobile-field') };
  const typeValue = () => form.querySelector('input[name="fb_type"]:checked')?.value || '';

  function setError(field, key) {
    errorKeys[field] = key;
    errEl[field].textContent = t(key);
    errEl[field].hidden = false;
    wrapOf[field]?.classList.add('is-invalid');
  }
  function clearError(field) {
    delete errorKeys[field];
    errEl[field].hidden = true;
    errEl[field].textContent = '';
    wrapOf[field]?.classList.remove('is-invalid');
  }
  const clearAll = () => Object.keys(errEl).forEach(clearError);
  function rerenderErrors() { Object.entries(errorKeys).forEach(([f, k]) => { errEl[f].textContent = t(k); }); }

  function refreshRating() {
    const v = rating.getValue();
    const hint = $('fb-rating-hint');
    hint.replaceChildren(el('span', v
      ? { text: t('feedback.rating.selected', { value: formatRating(v) }), class: 'fb-rating-picked' }
      : { text: t('feedback.rating.hint'), 'data-i18n': 'feedback.rating.hint' }));
  }
  function refreshMobile() {
    const low = isLowRating(rating.getValue());
    $('fb-mobile-star').hidden = !low;
    $('fb-mobile-opt').hidden = low;
    const hintKey = low ? 'feedback.form.mobileHintRequired' : 'feedback.form.mobileHintOptional';
    const span = $('fb-mobile-hint-text');
    span.dataset.i18n = hintKey;
    span.textContent = t(hintKey);
    fields.mobile.required = low;
    if (low) clearError('mobile'); // the requirement just changed; re-check on submit
  }

  Object.entries(fields).forEach(([f, input]) => input.addEventListener('input', () => clearError(f)));
  form.querySelectorAll('input[name="fb_type"]').forEach((r) => r.addEventListener('change', () => clearError('type')));

  /** Validates and returns the clean data, or null after showing the problems. */
  function validate() {
    clearAll();
    let firstBad = null;
    const bad = (field, key, focusEl) => { setError(field, key); if (!firstBad) firstBad = focusEl; };

    const name = normalizeName(fields.name.value);
    if (!isValidName(name)) bad('name', 'feedback.err.name', fields.name);
    const type = typeValue();
    if (!type) bad('type', 'feedback.err.type', form.querySelector('input[name="fb_type"]'));
    const ratingValue = parseRating(rating.getValue());
    if (ratingValue === null) bad('rating', 'feedback.err.rating', rating.element);
    const message = fields.message.value.replace(/\r\n?/g, '\n').trim();
    if (message.length < FEEDBACK_LIMITS.minMessage) bad('message', 'feedback.err.message', fields.message);
    else if (message.length > FEEDBACK_LIMITS.maxMessage) bad('message', 'feedback.err.messageLong', fields.message);

    const rawMobile = fields.mobile.value.trim();
    let mobile = '';
    if (isLowRating(ratingValue) && !rawMobile) bad('mobile', 'feedback.err.mobileRequired', fields.mobile);
    else if (rawMobile) {
      mobile = normalizeMobile(rawMobile);
      if (!mobile) bad('mobile', 'feedback.err.mobile', fields.mobile);
    }
    if (firstBad) { firstBad.focus({ preventScroll: false }); return null; }
    return { name, type, rating: ratingValue, message, mobile };
  }

  const ERROR_KEY = { network: 'feedback.err.network', http: 'feedback.err.server', 'bad-response': 'feedback.err.server', 'not-configured': 'feedback.err.notConfigured' };
  const CODE_KEY = {
    invalid_name: ['name', 'feedback.err.name'], invalid_type: ['type', 'feedback.err.type'], invalid_rating: ['rating', 'feedback.err.rating'],
    invalid_message: ['message', 'feedback.err.message'], invalid_mobile: ['mobile', 'feedback.err.mobile'], mobile_required: ['mobile', 'feedback.err.mobileRequired'],
  };

  function setBusy(on) {
    busy = on;
    const btn = $('fb-submit');
    btn.disabled = on;
    btn.classList.toggle('is-busy', on);
    btn.setAttribute('aria-busy', String(on));
    const label = btn.querySelector('.fb-submit__label');
    label.dataset.i18n = on ? 'feedback.submitting' : 'feedback.submit';
    label.textContent = t(label.dataset.i18n);
  }

  const wrap = $('fb-form').parentElement;
  function showSuccess({ followUp }) {
    const key = followUp ? 'feedback.success.low' : 'feedback.success.text';
    const text = $('fb-success-text');
    text.dataset.i18n = key;
    text.textContent = t(key);
    $('fb-success-note').hidden = !followUp;
    $('fb-success').classList.toggle('is-followup', !!followUp);
    wrap.style.minHeight = `${wrap.offsetHeight}px`; // the panel keeps the size the form had: nothing around it moves
    form.hidden = true;
    const box = $('fb-success');
    box.hidden = false;
    box.focus({ preventScroll: true });
    wrap.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function resetForm() {
    form.reset();
    rating.reset();
    clearAll();
    refreshRating();
    refreshMobile();
    requestId = newRequestId();
    form.hidden = false;
    $('fb-success').hidden = true;
    wrap.style.minHeight = '';
    fields.name.focus();
  }
  $('fb-another').addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const data = validate();
    if (!data) return;
    setBusy(true);
    try {
      const result = await submitFeedback(data, {
        requestId,
        elapsedMs: Math.round(performance.now() - shownAt),
        lang: getLang(),
        honeypot: $('fb-trap').value,
      });
      showSuccess({ followUp: result.followUp || isLowRating(data.rating) });
    } catch (err) {
      const key = err instanceof FeedbackError && err.kind === 'rejected' ? null : (ERROR_KEY[err?.kind] || 'feedback.err.server');
      if (err instanceof FeedbackError && err.kind === 'rejected') {
        const mapped = CODE_KEY[err.code];
        if (mapped) { setError(mapped[0], mapped[1]); }
        else setError('form', err.code === 'busy' || err.code === 'rate_limited' ? 'feedback.err.busy' : (err.code === 'spam' || err.code === 'bad_request' ? 'feedback.err.rejected' : 'feedback.err.server'));
        // The server refused it, so a retry is a new attempt.
        if (!(err.code === 'busy' || err.code === 'rate_limited')) requestId = newRequestId();
      } else {
        setError('form', key); // outcome unknown: keep the same requestId so a retry cannot create a second row
      }
      console.warn('[PLV:feedback]', err?.kind, err?.message);
      errEl.form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  });

  refreshRating();
  refreshMobile();
  return { rerender() { rerenderErrors(); refreshRating(); refreshMobile(); } };
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
function init() {
  initI18n();
  try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }
  initHeader();
  setupSiteLinks();
  const form = initForm();
  const list = createSection({
    key: 'feedback', mount: $('fb-list'), render: renderReviewCard, skeleton: { count: 2, variant: 'feedback' }, emptyKey: 'feedback.empty',
  });
  list.load();
  applyTranslations(document);

  // Pick up approvals made in the sheet while the page stays open (silent refresh when the tab is visible again).
  let lastFetch = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || Date.now() - lastFetch < 30000) return;
    lastFetch = Date.now();
    list.load({ silent: true });
  });
  onLangChange(() => { list.rerender(); form.rerender(); document.title = `${t('feedback.page.eyebrow')} | PLV`; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
