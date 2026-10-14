/**
 * PLV — loading / empty / error / not-configured states.
 * Each function replaces the contents of ONE section container only.
 */
import { t } from '../i18n.js?v=3';

const ICONS = {
  empty: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
  error: 'M12 8v5m0 3h.01M10.3 3.9L2.5 17.5A2 2 0 004.2 20.5h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  soon: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function svgIcon(path) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'state__icon');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', path);
  svg.appendChild(p);
  return svg;
}

function stateBox(kind, messageKey, iconPath) {
  const box = document.createElement('div');
  box.className = `state state--${kind}`;
  box.dataset.state = kind;
  if (iconPath) box.appendChild(svgIcon(iconPath));
  const p = document.createElement('p');
  p.className = 'state__text';
  p.textContent = t(messageKey);
  box.appendChild(p);
  return box;
}

export function renderLoading(container, { count = 4, variant = 'card' } = {}) {
  container.setAttribute('aria-busy', 'true');
  const wrap = document.createDocumentFragment();

  const status = document.createElement('p');
  status.className = 'state__loading-text';
  status.dataset.state = 'loading';
  status.setAttribute('role', 'status');
  status.textContent = t('state.loading');
  wrap.appendChild(status);

  for (let i = 0; i < count; i += 1) {
    const s = document.createElement('div');
    s.className = `skeleton skeleton--${variant}`;
    s.setAttribute('aria-hidden', 'true');
    wrap.appendChild(s);
  }
  container.replaceChildren(wrap);
}

export function renderEmpty(container) {
  container.setAttribute('aria-busy', 'false');
  container.replaceChildren(stateBox('empty', 'state.empty', ICONS.empty));
}

export function renderNotConfigured(container) {
  container.setAttribute('aria-busy', 'false');
  container.replaceChildren(stateBox('not-configured', 'state.notConfigured', ICONS.soon));
}

export function renderError(container, onRetry) {
  container.setAttribute('aria-busy', 'false');
  const box = stateBox('error', 'state.error', ICONS.error);
  box.setAttribute('role', 'alert');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--primary btn--sm state__retry';
  btn.textContent = t('state.retry');
  btn.addEventListener('click', onRetry);
  box.appendChild(btn);
  container.replaceChildren(box);
}
