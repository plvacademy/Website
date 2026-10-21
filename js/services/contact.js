/**
 * PLV — WhatsApp number and social links from the "Contact" tab of the content sheet.
 * The values in config.js are the defaults. A row replaces one value; an EMPTY value hides that link.
 * Everything is re-checked here (the sheet is not trusted): digits only for the number, https links on the right site only.
 */
import { CONFIG } from '../config.js?v=45';

const HOSTS = {
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
  instagram: /(^|\.)instagram\.com$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/i,
};

function validLink(network, value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && HOSTS[network].test(u.hostname);
  } catch { return false; }
}

/** Returns true when something changed. */
export function applyContact(rows) {
  let changed = false;
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    if (!r || typeof r.key !== 'string') return;
    const v = typeof r.value === 'string' ? r.value.trim() : '';
    if (r.key === 'whatsappNumber') {
      if (v === '' || /^\d{8,15}$/.test(v)) { CONFIG.CONTACT.whatsappNumber = v; changed = true; }
    } else if (Object.prototype.hasOwnProperty.call(HOSTS, r.key)) {
      if (v === '' || validLink(r.key, v)) { CONFIG.CONTACT.socials[r.key] = v; changed = true; }
    }
  });
  return changed;
}
