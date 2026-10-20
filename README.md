# PLV — Performance Lab Volleyball Academy · Home Page

Static Home Page (HTML5 + CSS3 + vanilla ES6 modules). No build tools, no frameworks.
Works locally and on GitHub Pages.

## 1. Run locally

The site uses ES modules and `fetch()`, so it must be served over HTTP (opening `index.html` by double-click will **not** work).

- **VS Code:** install *Live Server*, right-click `index.html` → *Open with Live Server*.
- **Python:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000
- **Node (optional):** `npx serve .`

## 2. Folder structure

```
index.html
css/        styles.css (design) · responsive.css (breakpoints)
js/         main.js · config.js · i18n.js
  services/   contentService.js · chatbotService.js
  components/ header.js · contentSection.js · chatbot.js · loadingStates.js · gallery.js
assets/images/  (you add the photos)
data/       programs · coaches · gallery · feedback (.json) · feedback.sample.json
```

Changes from the brief: added `js/components/gallery.js` (carousel controls) and `data/feedback.sample.json`
(structure example). `assets/icons/` is empty because icons are an inline SVG sprite in `index.html`.

## 3. Add the real images

Put files in `assets/images/` using exactly these names:

| File | Used for |
|---|---|
| `Logo.png` | Main logo (white text) for dark backgrounds: header, footer, chatbot launcher, dark registration screen, favicon |
| `Logo-dark.png` | Same logo with navy text, only for the light screens of the registration page |
| `Hero.jpg` | Hero background (landscape, ≥ 1600 px wide; subject on the right) |
| `Coach1.jpg`, `Coach2.jpg`… | Coach cards (portrait) |
| `Img1.jpg`, `Img2.jpg`… | Programs and gallery |

Missing images never break the page: cards show a neutral "Photo coming soon" placeholder, the hero shows a navy gradient,
and the logo falls back to a text wordmark.

Coaches, gallery photos and training areas are NOT stored in this repository: they are managed in the "PLV Website Content" Google Sheet
(tabs `Areas`, `Coaches`, `Gallery`) and read through the Apps Script web app. The backend code and its setup guide are kept in the private source repository. There is no built-in
fallback data, so an unreachable sheet shows an error with a retry button.

## 4. Content from the Google Sheet

Edit the tabs described in `data/SCHEMA.md` (IDs L001 / C001 / G001 ..., `active` / `published` = TRUE to show). Only the feedback
section still reads a local file (`data/feedback.json`) until a feedback endpoint exists.
Later endpoints (set in `config.js`, currently `null`): `CONTACT_API_URL`, `FEEDBACK_API_URL` (submit → "pending" row → moderator approves),
   `REGISTRATION_URL` (Google Form link; every *Register Now* button picks it up), and `CHATBOT_API_URL`.
6. **Chatbot:** point `CHATBOT_API_URL` at your own backend, which holds the AI key. Contract: `POST { message, lang }` → `{ reply }`.
   Never put keys in front-end files. Until it is set, the chat panel shows "Coming soon" and the input is disabled.

## 6. Test checklist

Developer simulation (enabled by `FEATURES.devSimulation`): append `?simulate=` to the URL, e.g.
`http://localhost:8000/?simulate=programs:error,coaches:empty,gallery:slow,feedback:errorOnce`.
Modes: `error`, `errorOnce` (fails first, succeeds on Retry), `empty`, `slow`, `invalid`, `unconfigured`. Set `devSimulation: false` before launch.

- [ ] Desktop and mobile widths (DevTools device toolbar: 375, 768, 1280).
- [ ] Menu opens/closes (button, link click, Esc); anchor links scroll smoothly.
- [ ] EN ⇄ العربية: `lang`/`dir` change, layout mirrors, brand name and logo untouched; choice is remembered.
- [ ] Remove an image → placeholder shown. Remove `Logo.png` → text wordmark.
- [ ] `?simulate=…:empty` / `:error` / `:unconfigured` → each section shows its own state; Retry works; other sections unaffected.
- [ ] Add 20 coaches / an unpublished one / feedback without `approved` → all published coaches show, hidden ones and unapproved feedback never do.
- [ ] Feedback: empty state by default; *Share your feedback* opens an honest "not available yet" dialog (no fake success).
- [ ] Chatbot: opens, shows Coming soon, closes with × and Esc, focus returns to the launcher.
- [ ] Gallery: prev/next, pause/play, swipe on touch; autoplay pauses on hover/focus/touch.
- [ ] Keyboard: Tab order, visible focus, skip link. DevTools → Rendering → *prefers-reduced-motion* → animations stop.

## 7. Refreshing content

Data is cached in memory for 5 minutes (`CACHE.ttlMs`). New content appears after the next successful fetch: reload the page,
click *Try again*, or switch back to the tab after the cache expired (silent background refresh). This is **not** real-time.
Future pages can reuse `fetchContent(key)`, `refreshContent(key)` and `findItem(key, idOrSlug)` from `js/services/contentService.js`.

## 8. Programs / Registration page

- Design: follows the supplied mockup (dark "Choose Your Training Area" screen → light player form with a back arrow → success screen). Logos: `Logo.png` on dark screens, `Logo-dark.png` on light screens (a text wordmark is shown if a file is missing). This page has no site menu/footer/chatbot, as in the mockup; the logo and *Back to Home* lead to the Home Page.
- Page: `programs.html` (+ `js/programs.js`, `js/services/registrationService.js`, `css/registration.css`). The Programs links on the Home Page, the Register Now buttons and the logo/Home links on both pages are connected (`PAGES.programs` and `REGISTRATION_URL` in `js/config.js`).
- The form posts to `REGISTRATION_API_URL` (Apps Script web app). Backend code and setup guide: kept in the private source repository. **Nothing is saved until you add that code to your Apps Script project, run `setupRegistrationSheets` once and deploy a new version.**
- Worksheets used: `New Cairo`, `Heliopolis`, `Nasr City` (columns A–E: Timestamp, Full Name, Mobile, Age, Position). `Schedule` is never touched.
- Tested: the web pages with the endpoint simulated in the browser, and `Registration.gs` against a simulated Sheets environment. **Not tested: a real save into Google Sheets** (my environment cannot reach Google) — run a test registration and delete your test rows.

## 9. GitHub Pages deployment checklist

- **Browser cache:** GitHub Pages lets browsers keep JS/CSS for ~10 minutes. Every script/style/import carries `?v=10`; when you change code and visitors must get it immediately, raise the number everywhere
  (e.g. in a terminal: `grep -rl "?v=10" . --include=*.js --include=*.html | xargs sed -i 's/?v=10/?v=10/g'`).

- [ ] Real images added with the exact file names; `data/*.json` updated.
- [ ] `FEATURES.devSimulation` set to `false` in `js/config.js`.
- [ ] No secrets in any file (the repo is public).
- [ ] Repo → Settings → Pages → deploy from `main` / root.
- [ ] If the site lives at `username.github.io/repo/`, all paths here are relative, so no changes are needed.
- [ ] Open the live URL and repeat the test checklist (especially missing images and language switch).
