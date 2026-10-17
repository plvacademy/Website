/**
 * PLV — Programs / Registration page controller.
 * Screen 1: pick an area  ->  screen 2: player form  ->  screen 3: success (only after the backend confirms the save).
 */
import { CONFIG } from './config.js?v=24';
import { initI18n, t, getLang, setLang, applyTranslations } from './i18n.js?v=24';
import { el, icon } from './components/contentSection.js?v=24';
import { fetchContent } from './services/contentService.js?v=24';
import { initChatbot } from './components/chatbot.js?v=24';
import {
  submitRegistration, RegistrationError, newRequestId,
  normalizeName, isValidName, normalizeMobile, normalizeAge, toAsciiDigits,
} from './services/registrationService.js?v=24';

const $ = (id) => document.getElementById(id);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const stepArea = $('step-area');
const stepForm = $('step-form');
const success = $('reg-success');
const form = $('reg-form');
const fields = $('reg-fields');
const alertBox = $('form-alert');
const submitBtn = $('reg-submit');
const submitText = submitBtn.querySelector('.reg-submit__text');
const inputs = {
  name: $('f-name'), mobile: $('f-mobile'), age: $('f-age'), position: $('f-position'),
};

let selectedArea = null; // canonical English value, e.g. "New Cairo"
let busy = false;
let requestId = null;
let lastFingerprint = '';
let formShownAt = 0;

/* ---------------------------- Build UI ---------------------------- */
/* Training areas come ONLY from the "Areas" tab of the Google Sheet. */
function areaLabel(area, alt) {
  return el('span', { text: alt ? (area.nameAr || '') : area.value });
}

async function loadAreas(force = false) {
  const { items } = await Promise.race([
    fetchContent('areas', { force }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
  ]);
  return items
    .filter((a) => typeof a.name === 'string' && a.name.trim())
    .map((a) => ({ value: a.name.trim(), nameAr: typeof a.name_ar === 'string' ? a.name_ar.trim() : '' }));
}

/* Loading / empty / error state for the area list, then the cards. */
async function showAreas(force = false) {
  const grid = $('area-grid');
  grid.setAttribute('aria-busy', 'true');
  const loadingText = el('span', { 'data-i18n': 'state.loading' });
  const loadingMsg = el('p', { class: 'area-loading', role: 'status' }, [el('span', { class: 'spinner', 'aria-hidden': 'true' }), loadingText]);
  grid.replaceChildren(loadingMsg);
  applyTranslations(loadingMsg);
  setTimeout(() => { if (loadingMsg.isConnected) { loadingText.dataset.i18n = 'state.loadingLong'; applyTranslations(loadingMsg); } }, 6000);
  try {
    const areas = await loadAreas(force);
    if (areas.length) buildAreas(areas);
    else grid.replaceChildren(el('p', { class: 'area-loading', 'data-i18n': 'state.empty' }));
  } catch (err) {
    console.warn('[PLV:areas]', err.message || err);
    const retry = el('button', { type: 'button', class: 'btn btn--primary btn--sm', 'data-i18n': 'state.retry' });
    retry.addEventListener('click', () => showAreas(true));
    grid.replaceChildren(el('p', { class: 'area-loading', 'data-i18n': 'state.error' }), retry);
  }
  grid.removeAttribute('aria-busy');
  applyTranslations(grid);
}

function buildAreas(areas) {
  $('area-grid').replaceChildren(...areas.map((area) => {
    const card = el('button', { type: 'button', class: 'area-card', dataset: { area: area.value } }, [
      el('span', { class: 'area-card__icon', 'aria-hidden': 'true' }, [icon('i-pin', 'icon')]),
      el('span', { class: 'area-card__text' }, [
        el('strong', {}, [areaLabel(area, false)]),
        el('small', {}, [areaLabel(area, true)]),
      ]),
      el('span', { class: 'area-card__chev', 'aria-hidden': 'true' }, [icon('i-chevron', 'icon icon--sm')]),
    ]);
    card.addEventListener('click', () => selectArea(area));
    return card;
  }));
}

function buildPositions() {
  CONFIG.REGISTRATION.positions.forEach((p) => {
    inputs.position.append(el('option', { value: p.value, 'data-i18n': `pos.${p.key}` }));
  });
}

/* ---------------------------- Helpers ---------------------------- */
function showAlert(key) {
  alertBox.dataset.i18n = key; // stays translated if the language is switched
  alertBox.textContent = t(key);
  alertBox.hidden = false;
}
function clearAlert() {
  delete alertBox.dataset.i18n;
  alertBox.textContent = '';
  alertBox.hidden = true;
}
function markInvalid(names) {
  Object.entries(inputs).forEach(([name, input]) => {
    const bad = names.includes(name);
    input.classList.toggle('is-invalid', bad);
    if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  });
  if (names.length) inputs[names[0]].focus();
}
function setBusy(value) {
  busy = value;
  fields.disabled = value; // values stay in the inputs, nothing is cleared
  submitBtn.disabled = value;
  submitBtn.classList.toggle('is-busy', value);
  submitBtn.setAttribute('aria-busy', String(value));
  submitText.dataset.i18n = value ? 'reg.submitting' : 'reg.submit';
  submitText.textContent = t(submitText.dataset.i18n);
}

/* ---------------------------- Screens ---------------------------- */
function showView(name) {
  stepArea.hidden = name !== 'area';
  stepForm.hidden = name !== 'form';
  success.hidden = name !== 'success';
  document.body.dataset.view = name;
  window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/* Chip colour for areas that have no fixed colour (new areas added in the sheet): stable, picked from the name. */
function toneFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return String(h % 5);
}

/* ---------------------------- Screen 1 -> 2 ---------------------------- */
function selectArea(area) {
  selectedArea = area.value;
  document.querySelectorAll('.area-card').forEach((c) => c.classList.toggle('is-selected', c.dataset.area === area.value));
  $('selected-chip').dataset.area = area.value;
  $('selected-chip').dataset.tone = toneFor(area.value);
  $('selected-area').replaceChildren(
    areaLabel(area, false),
    document.createTextNode(area.nameAr ? ' — ' : ''),
    (() => { const alt = areaLabel(area, true); alt.classList.add('selected-area__alt'); return alt; })(),
  );
  applyTranslations($('selected-area'));

  if (stepForm.hidden) formShownAt = performance.now();
  showView('form');
  inputs.name.focus({ preventScroll: true });
}

function backToAreas() {
  showView('area');
  document.querySelector('.area-card.is-selected')?.focus({ preventScroll: true }); // typed data stays in the form
}

/* ---------------------------- Submit ---------------------------- */
function readAndValidate() {
  const raw = {
    name: inputs.name.value,
    mobile: inputs.mobile.value,
    age: inputs.age.value,
    position: inputs.position.value,
  };

  // 1) required
  const empty = Object.keys(raw).filter((k) => !String(raw[k]).trim());
  if (empty.length || !selectedArea) return { errorKey: 'err.required', invalid: empty };

  // 2) name shape: letters only, must start with a letter (no leading symbol or digit)
  if (!isValidName(raw.name)) return { errorKey: 'err.name', invalid: ['name'] };

  // 3) mobile
  const mobile = normalizeMobile(raw.mobile);
  if (!mobile) return { errorKey: 'err.mobile', invalid: ['mobile'] };

  // 4) age
  const age = normalizeAge(raw.age);
  if (age === null) return { errorKey: 'err.age', invalid: ['age'] };

  const allowed = CONFIG.REGISTRATION.positions.some((p) => p.value === raw.position);
  if (!allowed) return { errorKey: 'err.required', invalid: ['position'] };

  return { data: { area: selectedArea, name: normalizeName(raw.name), mobile, age, position: raw.position } };
}

function messageKeyFor(err) {
  if (!(err instanceof RegistrationError)) return { key: 'err.unexpected', invalid: [] };
  if (err.kind === 'network' || err.kind === 'http') return { key: 'err.failed', invalid: [] };
  if (err.kind === 'rejected') {
    switch (err.code) {
      case 'invalid_mobile': return { key: 'err.mobile', invalid: ['mobile'] };
      case 'invalid_age': return { key: 'err.age', invalid: ['age'] };
      case 'invalid_name': return { key: 'err.name', invalid: ['name'] };
      case 'invalid_position': return { key: 'err.required', invalid: ['position'] };
      case 'invalid_area': return { key: 'err.required', invalid: [] };
      default: return { key: 'err.unexpected', invalid: [] };
    }
  }
  return { key: 'err.unexpected', invalid: [] }; // not-configured / bad-response
}

async function onSubmit(event) {
  event.preventDefault();
  if (busy) return; // no duplicate submissions while a request is in flight
  clearAlert();
  markInvalid([]);

  const result = readAndValidate();
  if (!result.data) {
    showAlert(result.errorKey);
    markInvalid(result.invalid);
    return;
  }

  // One requestId per distinct payload: a retry of the same data re-uses it, so the server can
  // recognise it and never saves it twice (important after a timeout where the outcome is unknown).
  const fingerprint = JSON.stringify(result.data);
  if (fingerprint !== lastFingerprint) { requestId = newRequestId(); lastFingerprint = fingerprint; }

  setBusy(true);
  try {
    await submitRegistration(result.data, {
      requestId,
      lang: getLang(),
      elapsedMs: Math.round(performance.now() - formShownAt),
      honeypot: $('f-trap').value,
    });
    showSuccess(); // reached ONLY when the backend returned { ok: true, saved: true }
  } catch (err) {
    console.warn('[PLV:registration]', err.kind || '', err.message || err);
    const { key, invalid } = messageKeyFor(err);
    showAlert(key);
    markInvalid(invalid);
  } finally {
    setBusy(false);
  }
}

/* ---------------------------- Success / reset ---------------------------- */
function resetAll() {
  form.reset();
  markInvalid([]);
  clearAlert();
  document.querySelectorAll('.area-card').forEach((c) => c.classList.remove('is-selected'));
  selectedArea = null;
  requestId = null;
  lastFingerprint = '';
}

function showSuccess() {
  showView('success');
  success.focus({ preventScroll: true });
  resetAll(); // saved: the form is cleared (it is NOT cleared on failure)
}

function startAnother() {
  showView('area');
  document.querySelector('.area-card')?.focus({ preventScroll: true });
}

/* ---------------------------- Boot ---------------------------- */
async function init() {
  initI18n();
  try { initChatbot($('chatbot-root')); } catch (err) { console.error('[PLV:chatbot]', err); }

  // Language switch (EN | العربية)
  document.querySelectorAll('[data-lang]').forEach((btn) => btn.addEventListener('click', () => setLang(btn.dataset.lang)));

  buildPositions();
  form.addEventListener('submit', onSubmit);
  $('back-to-areas').addEventListener('click', backToAreas);
  $('reg-again').addEventListener('click', startAnother);

  // Clear a field's error styling as soon as the user edits it
  Object.values(inputs).forEach((input) => {
    input.addEventListener('input', () => { input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); });
  });
  // Show Arabic-Indic digits as 0-9 in the numeric fields (what the server expects)
  [inputs.age].forEach((input) => input.addEventListener('input', () => {
    const converted = toAsciiDigits(input.value);
    if (converted !== input.value) input.value = converted;
  }));

  applyTranslations(document);

  showAreas();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
