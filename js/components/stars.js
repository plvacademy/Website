/**
 * PLV — star rating pieces, with half-star support.
 *  - renderStars(rating): read-only stars for a review card (0.5 steps).
 *  - createRatingInput(): the interactive rating of the feedback form (1 to 5, steps of 0.5).
 * Stars are always drawn left to right (also in Arabic), the usual convention for ratings.
 */
import { t } from '../i18n.js?v=22';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR_PATH = 'M12 2.6l2.9 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.6 6.1 20.8l1.2-6.6L2.4 9.6l6.7-.9z';

function starSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', STAR_PATH);
  svg.appendChild(path);
  return svg;
}

function starEl() {
  const star = document.createElement('span');
  star.className = 'star';
  star.appendChild(starSvg());
  const fill = document.createElement('span');
  fill.className = 'star__fill';
  fill.appendChild(starSvg());
  star.appendChild(fill);
  return star;
}

function paint(container, value) {
  [...container.querySelectorAll('.star')].forEach((star, i) => {
    const part = Math.max(0, Math.min(1, value - i)); // 0, .5 or 1
    star.querySelector('.star__fill').style.width = `${part * 100}%`;
  });
}

const clampHalf = (n) => Math.max(0, Math.min(5, Math.round(n * 2) / 2));

export function formatRating(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Read-only stars, e.g. for a review card. */
export function renderStars(rating, extraClass = '') {
  const value = clampHalf(Number(rating) || 0);
  const box = document.createElement('span');
  box.className = `stars-row ${extraClass}`.trim();
  box.setAttribute('dir', 'ltr');
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', t('feedback.ratingOf', { value: formatRating(value) }));
  for (let i = 0; i < 5; i += 1) box.appendChild(starEl());
  paint(box, value);
  return box;
}

/**
 * Interactive rating. Tap/click the left half of a star for x.5, the right half for the whole number.
 * Keyboard: arrow keys change it by 0.5 (Home = 1, End = 5). Exposed as an ARIA slider.
 * @returns {{element: HTMLElement, getValue: () => number, setValue: (n:number)=>void, reset: () => void}}
 */
export function createRatingInput({ onChange } = {}) {
  let value = 0;
  const box = document.createElement('div');
  box.className = 'rating-input';
  box.setAttribute('dir', 'ltr');
  box.setAttribute('role', 'slider');
  box.setAttribute('tabindex', '0');
  box.setAttribute('aria-valuemin', '1');
  box.setAttribute('aria-valuemax', '5');
  box.setAttribute('aria-valuenow', '0');
  box.setAttribute('aria-valuetext', t('feedback.rating.none'));
  for (let i = 0; i < 5; i += 1) box.appendChild(starEl());
  paint(box, 0);

  function set(next, { silent = false } = {}) {
    value = next === 0 ? 0 : Math.max(1, clampHalf(next));
    paint(box, value);
    box.setAttribute('aria-valuenow', String(value));
    box.setAttribute('aria-valuetext', value ? t('feedback.ratingOf', { value: formatRating(value) }) : t('feedback.rating.none'));
    if (!silent && onChange) onChange(value);
  }

  function fromPointer(e) {
    const stars = [...box.querySelectorAll('.star')];
    for (let i = 0; i < stars.length; i += 1) {
      const r = stars[i].getBoundingClientRect();
      if (e.clientX <= r.right + 2 || i === stars.length - 1) {
        const half = e.clientX < r.left + r.width / 2;
        return i + (half ? 0.5 : 1);
      }
    }
    return 5;
  }
  box.addEventListener('click', (e) => set(fromPointer(e)));
  box.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key];
    if (step !== undefined) { e.preventDefault(); set(value === 0 ? (step > 0 ? 1 : 1) : Math.max(1, Math.min(5, value + step))); }
    else if (e.key === 'Home') { e.preventDefault(); set(1); }
    else if (e.key === 'End') { e.preventDefault(); set(5); }
  });

  return { element: box, getValue: () => value, setValue: (n) => set(n, { silent: true }), reset: () => set(0, { silent: true }) };
}
