/**
 * PLV — which links of the top menu and the footer menu show.
 * The owner switches them in the "Menu" tab of the content sheet (key + visible). A link with no row is shown.
 * "Register Now" and the language switch are not menu links and always stay.
 * The last answer is remembered in this browser, so the menu looks right at once on the next page.
 */
const KEYS = ['home', 'programs', 'coaches', 'gallery', 'about', 'contact'];
const STORE = 'plv.menu.v1';

export function applyMenu(rows) {
  const hidden = new Set();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    if (r && KEYS.includes(r.key) && (r.visible === false || String(r.visible).trim().toLowerCase() === 'false')) hidden.add(r.key);
  });
  KEYS.forEach((key) => {
    document.querySelectorAll(`.site-nav a[data-i18n="nav.${key}"], .footer-nav a[data-i18n="nav.${key}"]`).forEach((a) => {
      const box = a.closest('li') || a;
      box.hidden = hidden.has(key);
    });
  });
  try { localStorage.setItem(STORE, JSON.stringify([...hidden])); } catch { /* private mode: fine */ }
}

/** Applies the menu remembered from the last visit (before the sheet answers). */
export function applyRememberedMenu() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) || '[]');
    if (Array.isArray(list)) applyMenu(list.filter((k) => KEYS.includes(k)).map((key) => ({ key, visible: false })));
  } catch { /* nothing remembered */ }
}
