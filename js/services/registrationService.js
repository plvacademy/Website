/**
 * PLV — registration service (browser side).
 *
 * - Validation helpers (the server re-validates everything: browser checks are only for UX).
 * - submitRegistration(): POSTs to the Apps Script web app and resolves ONLY when the backend
 *   explicitly confirms the row was saved ({ ok: true, saved: true }).
 *
 * Request: Content-Type text/plain (a "simple" request: no CORS preflight, which Apps Script cannot answer).
 * Ambiguous outcomes (timeout / network drop AFTER sending) are reported as kind "network". The caller
 * keeps the same requestId for the retry, and the server de-duplicates on it, so a retry can never
 * create a second row for the same attempt.
 */
import { CONFIG } from '../config.js?v=40';

export class RegistrationError extends Error {
  /** kind: not-configured | network | http | bad-response | rejected */
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = 'RegistrationError';
    this.kind = kind;
    Object.assign(this, extra);
  }
}

/* ---------------- Validation (mirrored on the server) ---------------- */

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Arabic-Indic / Persian digits to 0-9. */
export function toAsciiDigits(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (d) => {
    const i = AR_DIGITS.indexOf(d);
    return String(i >= 0 ? i : FA_DIGITS.indexOf(d));
  });
}

export function normalizeName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** 2–80 chars, letters (any language), spaces, . ' ’ - ; must start with a letter. */
export function isValidName(value) {
  return /^[\p{L}\p{M}][\p{L}\p{M} .'’\-]{1,79}$/u.test(normalizeName(value));
}

/**
 * Returns the normalized mobile number, or null when invalid.
 *  - Egyptian mobiles (010/011/012/015) in any common spelling:
 *    01012345678 · 1012345678 · +201012345678 · 201012345678 · 00201012345678 · with spaces/dashes
 *    -> normalized to 01012345678
 *  - Other international numbers: +<country code><number>, 8–15 digits -> kept as +digits
 */
export function normalizeMobile(value) {
  let v = toAsciiDigits(value).replace(/[\s\-.()]/g, '');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;
  const egypt = v.match(/^(?:\+?20|0)?(1[0125]\d{8})$/);
  if (egypt) return `0${egypt[1]}`;
  if (/^\+[1-9]\d{7,14}$/.test(v)) return v;
  return null;
}

/** Whole number 1–99, or null. */
export function normalizeAge(value) {
  const v = toAsciiDigits(value).trim();
  if (!/^\d{1,2}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= 99 ? n : null;
}

/* ---------------- Submission ---------------- */

export function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * @param {{area:string,name:string,mobile:string,age:number,position:string}} data  (already validated/normalized)
 * @param {{requestId:string, elapsedMs:number, lang:string, honeypot?:string}} meta
 * @returns {Promise<{duplicate:boolean}>} resolves only on confirmed save
 */
export async function submitRegistration(data, meta) {
  const url = CONFIG.REGISTRATION_API_URL;
  if (typeof url !== 'string' || !url.trim()) {
    throw new RegistrationError('not-configured', 'REGISTRATION_API_URL is not set');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REGISTRATION.timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'register',
        requestId: meta.requestId,
        area: data.area,
        name: data.name,
        mobile: data.mobile,
        age: data.age,
        position: data.position,
        lang: meta.lang,
        elapsedMs: meta.elapsedMs,
        website: meta.honeypot || '', // honeypot: real users leave it empty
      }),
      signal: controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    // Request may or may not have reached the server: treat as ambiguous, never as success.
    throw new RegistrationError('network', err?.name === 'AbortError' ? 'Request timed out' : `Network failure: ${err?.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new RegistrationError('http', `HTTP ${response.status}`, { status: response.status });

  let json;
  try {
    json = JSON.parse(await response.text());
  } catch {
    throw new RegistrationError('bad-response', 'Backend did not return JSON (is the web app deployed with the registration code?)');
  }

  // Confirmed save: { ok:true, saved:true } (Registration.gs) or { success:true } (the deployed script,
  // which reads the row back from the sheet before it answers). Anything else is never shown as success.
  if (json && ((json.ok === true && json.saved === true) || json.success === true)) return { duplicate: json.duplicate === true };
  if (json && (json.ok === false || json.success === false)) {
    const code = json.code || codeFromMessage(json.message);
    throw new RegistrationError('rejected', `Backend rejected: ${code}`, { code });
  }
  throw new RegistrationError('bad-response', 'Unexpected backend response (no confirmation of save)');
}

/** The deployed script answers with an English message instead of a code. */
function codeFromMessage(message) {
  const m = String(message || '').toLowerCase();
  if (m.includes('mobile')) return 'invalid_mobile';
  if (m.includes('age')) return 'invalid_age';
  if (m.includes('name')) return 'invalid_name';
  if (m.includes('position')) return 'invalid_position';
  if (m.includes('area')) return 'invalid_area';
  return 'server_error';
}
