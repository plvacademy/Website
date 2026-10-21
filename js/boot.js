/* PLV — tiny classic script that runs first on every page (kept out of the HTML so the page can use a strict CSP). */
(function () {
  var page = document.documentElement.dataset.page;
  if (page === 'coaches' || page === 'gallery') document.documentElement.classList.add('ch-js');

  // Local-development hint: pages opened straight from disk cannot load their scripts.
  if (location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      var d = document.createElement('div');
      d.setAttribute('role', 'alert');
      d.style.cssText = 'position:sticky;top:0;z-index:300;background:#FF850B;color:#071D33;padding:.8rem 1rem;text-align:center;font:600 14px/1.5 sans-serif';
      d.textContent = 'Open this page through a local server (VS Code Live Server, or: python -m http.server). / افتح الصفحة عبر Live Server وليس بالضغط المزدوج على الملف.';
      document.body.prepend(d);
    });
  }

  // Images that name a body class to add when they fail to load (the two logos of the programs page).
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('img[data-fail-class]').forEach(function (img) {
      var fail = function () { document.body.classList.add(img.dataset.failClass); };
      if (img.complete && img.naturalWidth === 0) fail(); else img.addEventListener('error', fail, { once: true });
    });
  });

  // If the logo image is missing, show the text version of the brand instead.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('img.brand__logo').forEach(function (img) {
      var fallback = function () { img.hidden = true; if (img.nextElementSibling) img.nextElementSibling.hidden = false; };
      if (img.complete && img.naturalWidth === 0) fallback(); else img.addEventListener('error', fallback, { once: true });
    });
  });
})();
