/**
 * PLV — content service.
 * One reusable entry point for every dynamic section.
 *
 *   const { items } = await fetchContent('programs');
 *
 * Responsibilities: fetch, timeout, controlled retries, JSON parsing, structure
 * validation, and typed errors so each section can show the right state.
 * A failure here only ever rejects the promise of ONE section; nothing else is affected.
 *
 * Accepted response shapes (so Google Apps Script can be dropped in later):
 *   [ {...}, {...} ]                      plain array
 *   { "items": [ ... ] }                  local JSON files
 *   { "status": "ok", "data": [ ... ] }   typical Apps Script wrapper
 */
import { CONFIG } from '../config.js?v=26';

export class ContentError extends Error {
  /** kind: not-configured | timeout | network | http | invalid-json | invalid-structure */
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = 'ContentError';
    this.kind = kind;
    Object.assign(this, extra);
  }
}

/* Minimal per-source item validators: the fields the UI needs to render safely. */
/* Every record needs a stable unique `id` (coaches may also carry a URL-friendly `slug`). */
const REQUIRED_FIELDS = {
  programs: ['id', 'title'],
  coaches: ['id', 'name'],
  gallery: ['id', 'src'],
  feedback: ['id', 'message'],
  feedbackHome: ['id', 'message'], // the same reviews, only those marked "Show on Home" in the sheet
  areas: ['id', 'name'],
};

/* Sheets/Apps Script sometimes send booleans as "TRUE"/"true" strings. Only an explicit true counts. */
const isTrue = (v) => v === true || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
const isFalse = (v) => v === false || (typeof v === 'string' && v.trim().toLowerCase() === 'false');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

/* ------------------------------------------------------------------ */
/* Developer simulation: ?simulate=programs:error,coaches:empty        */
/* Modes: error | errorOnce | empty | slow | invalid | unconfigured    */
/* ------------------------------------------------------------------ */
const simulation = (() => {
  if (!CONFIG.FEATURES.devSimulation) return {};
  try {
    const raw = new URLSearchParams(window.location.search).get('simulate') || '';
    return Object.fromEntries(
      raw.split(',').map((p) => p.split(':').map((s) => s.trim())).filter(([k, m]) => k && m)
    );
  } catch {
    return {};
  }
})();
const consumedOnce = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(key, message, detail) {
  // Developer-facing only. Visitors never see this text.
  console.warn(`[PLV:${key}] ${message}`, detail ?? '');
}

/* ------------------------------------------------------------------ */
/* Low-level fetch with timeout                                        */
/* ------------------------------------------------------------------ */
async function fetchOnce(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-cache', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new ContentError('http', `HTTP ${response.status} for ${url}`, { status: response.status });
    }
    return await response.text();
  } catch (err) {
    if (err instanceof ContentError) throw err;
    if (err.name === 'AbortError') throw new ContentError('timeout', `Request timed out after ${timeoutMs}ms: ${url}`);
    throw new ContentError('network', `Network failure: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

const isRetryable = (err) =>
  err.kind === 'timeout' || err.kind === 'network' || (err.kind === 'http' && err.status >= 500);

async function fetchWithRetry(key, url) {
  const { timeoutMs, retries, retryDelayMs } = CONFIG.REQUEST;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchOnce(url, timeoutMs);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) break;
      log(key, `Attempt ${attempt + 1} failed (${err.kind}); retrying…`);
      await sleep(retryDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ */
/* Parsing & validation                                                */
/* ------------------------------------------------------------------ */
function parse(key, text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new ContentError('invalid-json', `Response is not valid JSON: ${err.message}`);
  }

  let list;
  if (Array.isArray(json)) list = json;
  else if (isObject(json) && Array.isArray(json.items)) list = json.items;
  else if (isObject(json) && Array.isArray(json.data)) list = json.data;
  else throw new ContentError('invalid-structure', 'Expected an array, { items: [] } or { data: [] }');

  if (isObject(json) && json.status && json.status !== 'ok' && json.status !== 'success') {
    throw new ContentError('invalid-structure', `Backend reported status "${json.status}"`);
  }

  const required = REQUIRED_FIELDS[key] || [];
  const present = (v) => hasText(v) || typeof v === 'number';
  const valid = list.filter((item) => isObject(item) && required.every((f) => present(item[f])));
  if (valid.length !== list.length) {
    log(key, `${list.length - valid.length} item(s) skipped: missing required field(s) ${required.join(', ')}`);
  }
  if (list.length > 0 && valid.length === 0) {
    throw new ContentError('invalid-structure', 'No item matched the expected structure');
  }
  return valid;
}

/**
 * Public visibility. A MISSING field never counts as permission to publish.
 *  - feedback: must be explicitly approved (approved: true or status: "approved") and not unpublished.
 *  - everything else: must be explicitly published (published: true or status: "published"),
 *    and not explicitly deactivated (active: false).
 */
export function isPublic(key, item) {
  if (key === 'areas') return isTrue(item.active);
  if (key === 'feedback' || key === 'feedbackHome') {
    const approved = isTrue(item.approved) || item.status === 'approved';
    return approved && !isFalse(item.published);
  }
  const published = isTrue(item.published) || item.status === 'published';
  return published && !isFalse(item.active);
}

/* Source-specific rules: visibility filter + unique IDs. No item count limit is applied. */
function postProcess(key, items) {
  const visible = items.filter((i) => isPublic(key, i));
  if (visible.length !== items.length) {
    log(key, `${items.length - visible.length} unpublished/unapproved item(s) excluded`);
  }
  const seen = new Set();
  return visible.filter((i) => {
    const id = String(key === 'areas' ? i.name : i.id); // areas are identified by their name
    if (seen.has(id)) { log(key, `Duplicate id "${id}" skipped (ids must be unique)`); return false; }
    seen.add(id);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
/* Rows published in the owner's Google Sheet, read through the Apps Script web app. A plain GET with no custom
 * headers (a "simple" request), so the browser needs no CORS preflight. */
const sheetUrl = (key) => {
  const base = CONFIG.REGISTRATION_API_URL;
  return base && CONFIG.SHEET_CONTENT?.includes(key) ? `${base}?type=content&name=${encodeURIComponent(key)}` : null;
};

/* ONE request fetches areas + coaches + gallery together (Apps Script is slow per request), and the answer is
 * kept in localStorage for 30 seconds so moving between pages is instant. Sheet edits show up within about a minute. */
const BUNDLE_STORE = 'plv.sheet.bundle.v1';
const BUNDLE_FRESH_MS = 30 * 1000;
// ?refresh=1 in the page address skips every cache (handy right after editing the sheet).
const FORCE_REFRESH = (() => { try { return new URLSearchParams(window.location.search).has('refresh'); } catch { return false; } })();
let bundleInflight = null;

function readStoredBundle() {
  try {
    const raw = JSON.parse(localStorage.getItem(BUNDLE_STORE) || 'null');
    return raw && raw.data && typeof raw.at === 'number' ? raw : null;
  } catch { return null; }
}
function writeStoredBundle(data) {
  try { localStorage.setItem(BUNDLE_STORE, JSON.stringify({ at: Date.now(), data })); } catch { /* private mode: fine */ }
}

async function fetchBundle() {
  const base = CONFIG.REGISTRATION_API_URL;
  if (!base) throw new ContentError('not-configured', 'No sheet endpoint configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST.timeoutMs * 2);
  try {
    const response = await fetch(`${base}?type=content&name=all`, { signal: controller.signal });
    if (!response.ok) throw new ContentError('http', `HTTP ${response.status}`, { status: response.status });
    const json = JSON.parse(await response.text());
    if (!json || json.ok === false || !json.data || typeof json.data !== 'object') {
      throw new ContentError('invalid-structure', 'Unexpected sheet response');
    }
    writeStoredBundle(json.data);
    return json.data;
  } catch (err) {
    if (err instanceof ContentError) throw err;
    throw new ContentError(err.name === 'AbortError' ? 'timeout' : 'network', String(err.message || err));
  } finally {
    clearTimeout(timer);
  }
}

function getBundle({ force = false } = {}) {
  if (!force && !FORCE_REFRESH) {
    const stored = readStoredBundle();
    if (stored && Date.now() - stored.at < BUNDLE_FRESH_MS) return Promise.resolve(stored.data);
  }
  if (!bundleInflight) bundleInflight = fetchBundle().finally(() => { bundleInflight = null; });
  return bundleInflight;
}

async function loadFromSheet(key, force) {
  try {
    const bundle = await getBundle({ force });
    if (!Array.isArray(bundle[key])) throw new ContentError('invalid-structure', `No "${key}" list in the sheet response`);
    return postProcess(key, parse(key, JSON.stringify(bundle[key])));
  } catch (err) {
    if (err instanceof ContentError) throw err;
    throw new ContentError(err.name === 'AbortError' ? 'timeout' : 'network', String(err.message || err));
  }
}

/* Reviews: read from the feedback web app, which returns ONLY rows the owner marked Visible (public fields only).
 * Plain GET with no custom headers (no CORS preflight). The Home page asks for key "feedbackHome" = those also marked "Show on Home".
 * ONE request serves both pages: the raw list is kept in localStorage for 30 seconds (so moving between Home and the
 * Feedback page is instant) and the request starts as soon as the page loads, before the section asks for it. */
const FEEDBACK_STORE = 'plv.sheet.feedback.v1';
const FEEDBACK_FRESH_MS = 30 * 1000;
let feedbackInflight = null;

function readStoredFeedback() {
  try {
    const raw = JSON.parse(localStorage.getItem(FEEDBACK_STORE) || 'null');
    return raw && Array.isArray(raw.items) && typeof raw.at === 'number' ? raw : null;
  } catch { return null; }
}

async function fetchFeedbackList() {
  const base = CONFIG.FEEDBACK_API_URL;
  if (!base) throw new ContentError('not-configured', 'No feedback endpoint configured');
  const { timeoutMs, retries, retryDelayMs } = CONFIG.REQUEST;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs * 2);
    try {
      const response = await fetch(`${base}?type=feedback`, { signal: controller.signal });
      if (!response.ok) throw new ContentError('http', `HTTP ${response.status}`, { status: response.status });
      const items = parse('feedback', await response.text());
      try { localStorage.setItem(FEEDBACK_STORE, JSON.stringify({ at: Date.now(), items })); } catch { /* private mode: fine */ }
      return items;
    } catch (err) {
      lastError = err instanceof ContentError ? err
        : new ContentError(err.name === 'AbortError' ? 'timeout' : 'network', String(err.message || err));
      if (!isRetryable(lastError) || attempt === retries) break;
      await sleep(retryDelayMs * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function getFeedbackList({ force = false } = {}) {
  if (!force && !FORCE_REFRESH) {
    const stored = readStoredFeedback();
    if (stored && Date.now() - stored.at < FEEDBACK_FRESH_MS) return Promise.resolve(stored.items);
  }
  if (!feedbackInflight) feedbackInflight = fetchFeedbackList().finally(() => { feedbackInflight = null; });
  return feedbackInflight;
}

async function loadFeedback(key, force) {
  try {
    const items = postProcess(key, await getFeedbackList({ force }));
    return key === 'feedbackHome' ? items.filter((i) => isTrue(i.home)) : items;
  } catch (err) {
    const e = err instanceof ContentError ? err : new ContentError('network', String(err?.message || err));
    log(key, `${e.kind}: ${e.message}`);
    throw e;
  }
}

async function loadFresh(key, force = false) {
  const url = CONFIG.DATA_SOURCES[key];
  const mode = simulation[key];
  if ((key === 'feedback' || key === 'feedbackHome') && !mode) return { items: await loadFeedback(key, force) };
  const remote = mode ? null : sheetUrl(key);

  if (remote) {
    try {
      return { items: await loadFromSheet(key, force) }; // the sheet is the source of truth, even when it is empty
    } catch (err) {
      log(key, `Google Sheet unavailable (${err.kind || 'error'}: ${err.message})`);
      throw err instanceof ContentError ? err : new ContentError('network', String(err?.message || err));
    }
  }

  if (mode === 'unconfigured' || !url) {
    throw new ContentError('not-configured', `No data source configured for "${key}"`);
  }

  if (mode) {
    log(key, `Simulating "${mode}"`);
    if (mode === 'slow') await sleep(3000);
    if (mode === 'error') { await sleep(600); throw new ContentError('network', 'Simulated failure'); }
    if (mode === 'errorOnce' && !consumedOnce.has(key)) {
      consumedOnce.add(key);
      await sleep(600);
      throw new ContentError('network', 'Simulated one-time failure');
    }
    if (mode === 'empty') { await sleep(400); return { items: [] }; }
    if (mode === 'invalid') { await sleep(400); throw new ContentError('invalid-structure', 'Simulated invalid structure'); }
  }

  try {
    const text = await fetchWithRetry(key, url);
    const items = postProcess(key, parse(key, text));
    return { items };
  } catch (err) {
    const e = err instanceof ContentError ? err : new ContentError('network', String(err?.message || err));
    log(key, `${e.kind}: ${e.message}`);
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Cache + de-duplication                                              */
/* ------------------------------------------------------------------ */
const cache = new Map(); // key -> { items, at }
const inflight = new Map(); // key -> Promise

/**
 * Fetch all PUBLIC items of a content type.
 *  - Served from memory while younger than CONFIG.CACHE.ttlMs (no repeated requests).
 *  - { force: true } bypasses the cache (Retry button, manual refresh).
 *  - Concurrent calls for the same key share one request.
 *  - Failures are never cached.
 */
export function fetchContent(key, { force = false } = {}) {
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < CONFIG.CACHE.ttlMs) {
    return Promise.resolve({ items: hit.items, fromCache: true });
  }
  if (inflight.has(key)) return inflight.get(key);

  const promise = loadFresh(key, force)
    .then((result) => {
      cache.set(key, { items: result.items, at: Date.now() });
      return { ...result, fromCache: false };
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Re-fetch from the source, ignoring the cache. */
export const refreshContent = (key) => fetchContent(key, { force: true });

/**
 * Reusable lookup for future dedicated pages (e.g. a coach profile page):
 * finds one PUBLIC record by `id` or `slug` from the same canonical source the Home Page uses.
 * Returns null when not found or unpublished.
 */
export async function findItem(key, idOrSlug) {
  const { items } = await fetchContent(key);
  const needle = String(idOrSlug);
  return items.find((i) => String(i.id) === needle || (i.slug && String(i.slug) === needle)) || null;
}

/* Start the reviews request early too, only on the pages that show reviews. */
if (CONFIG.FEEDBACK_API_URL && typeof document !== 'undefined' && (document.getElementById('feedback-grid') || document.getElementById('fb-list'))) {
  getFeedbackList().catch(() => {});
}

/* Start the sheet request as early as possible (before the sections ask for it). */
if (!CONFIG.FEATURES.devSimulation || Object.keys(simulation).length === 0) {
  if (CONFIG.REGISTRATION_API_URL && CONFIG.SHEET_CONTENT?.length) getBundle().catch(() => {});
}
