/**
 * PLV — one review card, used by BOTH the Home section and the Feedback page so they always look the same.
 * Shows: stars (+ score), date, the quote, and the person (initials avatar, name, Parent/Player badge).
 * All text is set with textContent (via el()), never as HTML.
 */
import { t, pick, getLang } from '../i18n.js?v=38';
import { el } from './contentSection.js?v=38';
import { renderStars, formatRating } from './stars.js?v=38';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const letters = (parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] || '']).map((p) => [...p][0] || '');
  return letters.join('').toUpperCase() || '•';
}

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const [y, m, d] = iso.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, d)));
  } catch { return iso; }
}

export function renderReviewCard(item) {
  const name = pick(item, 'name') || item.name || '';
  const typeLabel = item.type === 'Parent' || item.type === 'Player' ? t(`feedback.type.${item.type}`) : '';
  const rating = Number(item.rating);
  const date = formatDate(item.date);
  const hasHead = rating > 0 || date;
  return el('figure', { class: 'feedback-card', dataset: { feedbackId: item.id } }, [
    hasHead && el('div', { class: 'feedback-card__head' }, [
      rating > 0 && el('span', { class: 'feedback-card__rating' }, [
        renderStars(rating),
        el('span', { class: 'feedback-card__score', text: formatRating(Math.max(0, Math.min(5, Math.round(rating * 2) / 2))) }),
      ]),
      date && el('span', { class: 'feedback-card__date', text: date }),
    ]),
    el('blockquote', { class: 'feedback-card__quote' }, [el('p', { text: pick(item, 'message') || item.message || '' })]),
    el('figcaption', { class: 'feedback-card__who' }, [
      el('span', { class: 'feedback-card__avatar', 'aria-hidden': 'true', text: initials(name) }),
      el('span', { class: 'feedback-card__id' }, [
        el('strong', { class: 'feedback-card__name', text: name }),
        typeLabel && el('span', { class: 'feedback-card__role', text: typeLabel }),
      ]),
    ]),
  ]);
}
