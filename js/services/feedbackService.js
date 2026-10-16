/**
 * PLV — feedback service (browser side).
 *
 * submitFeedback() POSTs to the feedback web app and resolves ONLY when the server explicitly confirms the row
 * was saved ({ ok: true, saved: true }). A timeout or a dropped connection is reported as "network" (outcome unknown):
 * the caller keeps the same requestId for the retry and the server de-duplicates on it.
 * The browser checks are only for convenience; the server validates everything again.
 * Request: Content-Type text/plain (a "simple" request, no CORS preflight, which Apps Script cannot answer).
 */
import { CONFIG } from '../config.js?v=18';
import { toAsciiDigits, normalizeName, isValidName, normalizeMobile, newRequestId } from './registrationService.js?v=18';

export { normalizeName, isValidName, normalizeMobile, newRequestId };

export const FEEDBACK_LIMITS = { minMessage: 3, maxMessage: 1000, lowRating: 3 };
export const isLowRating = (rating) => Number(rating) > 0 && Number(rating) <= FEEDBACK_LIMITS.lowRating;

/** 1 to 5 in steps of 0.5, or null. */
export function parseRating(value) {
  const n = Number(toAsciiDigits(value));
  if (!Number.isFinite(n) || n < 1 || n > 5 || Math.round(n * 2) !== n * 2) return null;
  return n;
}

export class FeedbackError extends Error {
  /** kind: not-configured | network | http | bad-response | rejected */
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = 'FeedbackError';
    this.kind = kind;
    Object.assign(this, extra);
  }
}

/**
 * @param {{name:string,type:'Parent'|'Player',rating:number,mobile:string,message:string}} data (validated)
 * @param {{requestId:string, elapsedMs:number, lang:string, honeypot?:string}} meta
 * @returns {Promise<{duplicate:boolean, followUp:boolean}>} resolves only on a confirmed save
 */
export async function submitFeedback(data, meta) {
  const url = CONFIG.FEEDBACK_API_URL;
  if (typeof url !== 'string' || !url.trim()) throw new FeedbackError('not-configured', 'FEEDBACK_API_URL is not set');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REGISTRATION.timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'feedback',
        requestId: meta.requestId,
        name: data.name,
        type: data.type,
        rating: data.rating,
        mobile: data.mobile,
        message: data.message,
        lang: meta.lang,
        elapsedMs: meta.elapsedMs,
        website: meta.honeypot || '', // honeypot: real users leave it empty
      }),
      signal: controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    throw new FeedbackError('network', err?.name === 'AbortError' ? 'Request timed out' : `Network failure: ${err?.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new FeedbackError('http', `HTTP ${response.status}`, { status: response.status });

  let json;
  try {
    json = JSON.parse(await response.text());
  } catch {
    throw new FeedbackError('bad-response', 'The feedback endpoint did not return JSON (is the web app deployed?)');
  }

  if (json && json.ok === true && json.saved === true) {
    return { duplicate: json.duplicate === true, followUp: json.followUp === true };
  }
  if (json && (json.ok === false || json.success === false)) {
    throw new FeedbackError('rejected', `Rejected: ${json.code || 'server_error'}`, { code: json.code || 'server_error' });
  }
  throw new FeedbackError('bad-response', 'Unexpected response (no confirmation of save)');
}
