/**
 * PLV — reusable dynamic section controller + small DOM helpers.
 *
 *   const section = createSection({
 *     key: 'programs',            // must exist in CONFIG.DATA_SOURCES
 *     mount: element,             // container that receives cards / states
 *     render: (item, index) => Node,
 *     skeleton: { count: 4, variant: 'media' },
 *     onData: (items) => {},      // optional hook after a successful render
 *
 * ALL published items are rendered: there is intentionally no item limit.
 *   });
 *   section.load();
 *
 * Each section owns its own loading / empty / error state, so one failing
 * source never affects another.
 */
import { fetchContent } from '../services/contentService.js?v=14';
import { renderLoading, renderEmpty, renderError, renderNotConfigured } from './loadingStates.js?v=14';
import { t } from '../i18n.js?v=14';

/* ------------------------- DOM helpers ------------------------- */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  [].concat(children).forEach((c) => c && node.append(c));
  return node;
}

export function icon(id, cls = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.appendChild(use);
  return svg;
}

/**
 * Image with graceful fallback: if the file is missing, a neutral branded
 * placeholder replaces it (no broken-image icon).
 */
export function imageEl(src, alt, { cls = '', lazy = true } = {}) {
  const wrap = el('div', { class: `media ${cls}`.trim() });
  const showFallback = () => {
    wrap.classList.add('media--fallback');
    wrap.replaceChildren(el('span', { class: 'media__fallback-text', text: t('state.imageSoon') }));
  };
  if (!src) { showFallback(); return wrap; }
  const img = el('img', { src, alt: alt || '', decoding: 'async' });
  if (lazy) img.loading = 'lazy';
  img.addEventListener('error', showFallback, { once: true });
  wrap.appendChild(img);
  return wrap;
}

/**
 * Build a link to a dedicated page from a URL template ({id} and {slug} are replaced
 * by the record's identifier). Returns null when no real page is configured, so the
 * caller can render a clearly-marked "coming soon" state instead of a broken link.
 */
export function pageLink(template, ident) {
  if (typeof template === 'string' && template.trim()) {
    return template.replace(/\{(id|slug)\}/g, encodeURIComponent(ident ?? ''));
  }
  return null;
}

/* ------------------------- Section controller ------------------------- */
export function createSection({ key, mount, render, skeleton = {}, onData }) {
  if (!mount) { // the page has no container for this section: skip it instead of crashing the others
    console.warn(`[PLV] section "${key}" skipped: its container is missing in the HTML`);
    return { load: async () => {}, rerender: () => {} };
  }
  let token = 0;
  let lastItems = null;
  let lastSignature = '';

  function paint(items) {
    mount.setAttribute('aria-busy', 'false');
    mount.replaceChildren(...items.map((item, i) => render(item, i)));
    if (onData) onData(items);
  }

  /**
   * load()                -> normal load with skeleton (cached data allowed)
   * load({ force: true }) -> bypass cache (Retry)
   * load({ silent: true }) -> background refresh: keeps what is on screen, repaints only if
   *                           the data changed, and ignores failures.
   */
  async function load({ force = false, silent = false } = {}) {
    const mine = ++token;
    if (!silent) renderLoading(mount, skeleton);
    try {
      const { items } = await fetchContent(key, { force: force || silent });
      if (mine !== token) return; // a newer load superseded this one
      const signature = JSON.stringify(items);
      if (silent && signature === lastSignature) return;
      lastItems = items;
      lastSignature = signature;
      if (items.length === 0) { renderEmpty(mount); if (onData) onData([]); return; }
      paint(items);
    } catch (err) {
      if (mine !== token) return;
      if (silent) return; // keep showing the last good content
      lastItems = null;
      lastSignature = '';
      if (err.kind === 'not-configured') renderNotConfigured(mount);
      else renderError(mount, () => load({ force: true }));
      if (onData) onData(null);
    }
  }

  /** Re-render with already-loaded data (e.g. after a language switch). */
  function rerender() {
    if (lastItems && lastItems.length) paint(lastItems);
    else {
      // refresh state text in the current language
      const state = mount.querySelector('[data-state]')?.dataset.state;
      if (state === 'empty') renderEmpty(mount);
      else if (state === 'not-configured') renderNotConfigured(mount);
      else if (state === 'error') renderError(mount, () => load({ force: true }));
      else if (state === 'loading') renderLoading(mount, skeleton);
    }
  }

  return { load, rerender };
}
