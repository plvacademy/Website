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
import { CONFIG } from '../config.js?v=4';

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
  if (key === 'feedback') {
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
    const id = String(i.id);
    if (seen.has(id)) { log(key, `Duplicate id "${id}" skipped (ids must be unique)`); return false; }
    seen.add(id);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
async function loadFresh(key) {
  const url = CONFIG.DATA_SOURCES[key];
  const mode = simulation[key];

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

  const promise = loadFresh(key)
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
