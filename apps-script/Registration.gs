/**
 * PLV Academy — registration backend (Google Apps Script web app).  ONE self-contained file.
 *
 * HOW TO INSTALL
 *  - Open the Apps Script project, DELETE the old code (all files) and paste this whole file instead.
 *    Do not keep two copies: duplicate function/const names make the project fail to save.
 *  - Run `setupRegistrationSheets` once (creates the three tabs with headers; asks for permission).
 *  - Deploy -> Manage deployments -> edit -> Version: New version -> Deploy. (Execute as: Me, Access: Anyone.)
 *
 * WHAT IT DOES
 *  - GET  /exec  : health check, returns { ok:true, success:true, service, areas }.
 *  - GET  /exec?type=content&name=areas|coaches|gallery : the published rows of the "Areas" / "Coaches" / "Gallery" tabs
 *    of the content spreadsheet (this is how the owner adds, removes or reorders them).
 *  - POST /exec  : validates a registration, saves it in the worksheet of its area, reads nothing else.
 *    The mobile number is saved as plain text.
 *    Success reply (only after the row really exists): { ok:true, saved:true, success:true, duplicate, message }.
 *    Failure reply: { ok:false, success:false, code, message }  (generic; details only in the Apps Script log).
 *  - After each NEW registration it emails the addresses in the script property NOTIFY_EMAILS (comma-separated; empty = off).
 *    Run `testNotification` once from the editor to grant the email permission and to check it.
 *  - It never touches any other worksheet (the old "Schedule" tab is protected). Content tabs are only read.
 *
 * Which spreadsheet is used (first match wins):
 *   1. Script property SPREADSHEET_ID   (Project Settings -> Script properties)
 *   2. PLVReg.CONFIG.spreadsheetId below
 *   3. The spreadsheet this script is bound to (Extensions -> Apps Script from inside the sheet)
 *
 * Security model (be realistic): a public web app URL can be called by anyone who has it. The protections
 * here are BASIC (validation, allow-lists, honeypot, minimum fill time, duplicate and volume limits).
 * They are not authentication. The spreadsheet itself stays private: the script runs as its owner.
 */

const PLVReg = (function () {
  const CONFIG = {
    spreadsheetId: '', // optional; prefer the SPREADSHEET_ID script property
    contentSpreadsheetId: '', // the website-content sheet (Areas / Coaches / Gallery); or the CONTENT_SPREADSHEET_ID script property
    // The browser sends an area NAME; it is accepted only if the "Areas" tab of the content sheet lists it as active,
    // and the worksheet is chosen here, on the server (same name; created on the first registration).
    headers: ['Timestamp', 'Full Name', 'Mobile', 'Age', 'Position'],
    positions: ['Setter', 'Outside Hitter', 'Opposite', 'Middle Blocker', 'Libero', 'Not Sure Yet'],
    protectedSheets: ['Schedule', 'Areas', 'Coaches', 'Gallery'], // never used for registrations, whatever the request says
    // Drive folders that hold the photos. In the sheet you write just the file name (e.g. Coach1.jpg); the files
    // must be shared "Anyone with the link" (Viewer) so that visitors' browsers can show them.
    driveFolders: {
      coaches: '1OtW6z8-8igt0NGkyrsUa9guvUjblBhQI',
      gallery: '1OF7qsUuEjfGxVHp0-a1F-W9MF40lehs2',
    },
    contentCacheSec: 20, // the website sees sheet edits within about half a minute
    maxBodyBytes: 4096,
    minFillMs: 1500, // faster than this = script, not a person
    maxSubmissionsPer10Min: 60, // volume cap for the whole form
    requestIdTtlSec: 21600, // 6 h (CacheService maximum)
    contentDedupeTtlSec: 600, // same area+name+mobile within 10 min = same registration
    lockWaitMs: 10000,
  };

  /* ------------------------------ helpers ------------------------------ */
  function reply(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  }
  const MESSAGES = {
    invalid_area: 'Invalid training area.',
    invalid_name: 'Please enter a valid full name.',
    invalid_mobile: 'Please enter a valid mobile number.',
    invalid_age: 'Please enter a valid age.',
    invalid_position: 'Invalid playing position.',
    bad_request: 'Invalid request.',
    spam: 'Request rejected.',
    rate_limited: 'Too many registrations right now. Please try again later.',
    busy: 'The service is busy. Please try again.',
    setup_error: 'The registration sheet is not set up correctly.',
    server_error: 'Unable to save registration.',
  };
  function fail(code) { return reply({ ok: false, success: false, code: code, message: MESSAGES[code] || MESSAGES.server_error }); }
  function saved(duplicate) {
    return reply({ ok: true, saved: true, success: true, duplicate: duplicate === true, message: 'Registration saved successfully.' });
  }

  function toAsciiDigits(v) {
    const ar = '٠١٢٣٤٥٦٧٨٩', fa = '۰۱۲۳۴۵۶۷۸۹';
    return String(v == null ? '' : v).replace(/[٠-٩۰-۹]/g, function (d) {
      const i = ar.indexOf(d);
      return String(i >= 0 ? i : fa.indexOf(d));
    });
  }
  function normalizeName(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function isValidName(v) { return /^[\p{L}\p{M}][\p{L}\p{M} .'’\-]{1,79}$/u.test(v); }
  // Same rules as the browser (js/services/registrationService.js).
  function normalizeMobile(v) {
    let s = toAsciiDigits(v).replace(/[\s\-.()]/g, '');
    if (s.indexOf('00') === 0) s = '+' + s.slice(2);
    const egypt = s.match(/^(?:\+?20|0)?(1[0125]\d{8})$/);
    if (egypt) return '0' + egypt[1];
    if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
    return null;
  }
  function normalizeAge(v) {
    const s = toAsciiDigits(v).trim();
    if (!/^\d{1,2}$/.test(s)) return null;
    const n = Number(s);
    return n >= 1 && n <= 99 ? n : null;
  }
  function md5(text) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8)
      .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  }


  function openSpreadsheet() {
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty('SPREADSHEET_ID') || CONFIG.spreadsheetId;
    const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('setup: no spreadsheet (set SPREADSHEET_ID or bind the script to the sheet)');
    return ss;
  }

  /**
   * Returns the worksheet for an allowed name. Creates it (with headers) when missing.
   * If it exists but row 1 is not exactly our headers, it REFUSES to write rather than guess.
   */
  function getRegistrationSheet(ss, sheetName) {
    if (CONFIG.protectedSheets.indexOf(sheetName) !== -1) throw new Error('setup: ' + sheetName + ' is protected');
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      writeHeaders(sheet);
      return sheet;
    }
    if (sheet.getLastRow() === 0) { writeHeaders(sheet); return sheet; }
    const row1 = sheet.getRange(1, 1, 1, CONFIG.headers.length).getValues()[0];
    const same = CONFIG.headers.every(function (h, i) { return String(row1[i]).trim() === h; });
    if (!same) throw new Error('setup: worksheet "' + sheetName + '" has unexpected headers in row 1');
    return sheet;
  }
  function writeHeaders(sheet) {
    sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  /* ------------------------ email for every new registration ------------------------ */
  // Who gets it: the script property NOTIFY_EMAILS (Project Settings -> Script properties), one or more addresses
  // separated by commas. Add, remove or change addresses there any time: it takes effect at once, no redeploy.
  // Empty or missing = no email. A failed email never affects the registration (it is already saved).
  function notifyEmails() {
    const raw = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAILS') || '';
    return raw.split(/[,;\s]+/).filter(function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }).slice(0, 10);
  }
  function notifyRegistration(reg) {
    try {
      const to = notifyEmails();
      if (!to.length) return;
      MailApp.sendEmail({
        to: to.join(','),
        name: 'PLV Academy',
        subject: 'New PLV registration: ' + reg.name + ' (' + reg.area + ')',
        body: ['A new registration was saved.', '',
          'Area: ' + reg.area, 'Name: ' + reg.name, 'Mobile: ' + reg.mobile, 'Age: ' + reg.age, 'Position: ' + reg.position,
          '', 'It is in the "' + reg.sheet + '" tab of the registration sheet.'].join('\n'),
      });
    } catch (err) {
      console.error('PLVReg notify failed: ' + (err && err.message ? err.message : err));
    }
  }

  /* ------------------------------ main handler ------------------------------ */
  function handle(e) {
    try {
      const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
      if (!raw || raw.length > CONFIG.maxBodyBytes) return fail('bad_request');

      let body;
      try { body = JSON.parse(raw); } catch (err) { return fail('bad_request'); }
      if (!body || body.action !== 'register') return fail('bad_request');

      // --- basic bot checks (NOT authentication) ---
      if (body.website) return fail('spam'); // honeypot filled
      if (typeof body.elapsedMs === 'number' && body.elapsedMs < CONFIG.minFillMs) return fail('spam');

      // --- validation: everything is re-checked here; nothing from the browser is trusted ---
      const area = String(body.area == null ? '' : body.area);
      const areaMap = activeAreas(); // from the "Areas" tab (falls back to the built-in list)
      if (!Object.prototype.hasOwnProperty.call(areaMap, area)) return fail('invalid_area');
      const name = normalizeName(body.name);
      if (!isValidName(name)) return fail('invalid_name');
      const mobile = normalizeMobile(body.mobile);
      if (!mobile) return fail('invalid_mobile');
      const age = normalizeAge(body.age);
      if (age === null) return fail('invalid_age');
      const position = String(body.position == null ? '' : body.position);
      if (CONFIG.positions.indexOf(position) === -1) return fail('invalid_position');
      const requestId = String(body.requestId == null ? '' : body.requestId);
      if (!/^[A-Za-z0-9\-]{8,64}$/.test(requestId)) return fail('bad_request');

      // The worksheet is decided on the server from the validated area.
      const sheetName = areaMap[area];

      let notifyAfter = null; // the email is sent after the lock is released
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(CONFIG.lockWaitMs)) return fail('busy');
      try {
        const cache = CacheService.getScriptCache();
        const reqKey = 'plv:req:' + requestId;
        const contentKey = 'plv:c:' + md5([area, name.toLowerCase(), mobile].join('|'));

        // Already saved (a retry after an unknown outcome, or a double click): confirm, never write twice.
        if (cache.get(reqKey) || cache.get(contentKey)) {
          return saved(true);
        }

        // Volume cap for the whole form.
        const bucketKey = 'plv:rl:' + Math.floor(Date.now() / 600000);
        const count = Number(cache.get(bucketKey) || 0);
        if (count >= CONFIG.maxSubmissionsPer10Min) return fail('rate_limited');

        const sheet = getRegistrationSheet(openSpreadsheet(), sheetName);
        const row = sheet.getLastRow() + 1; // append below existing data; never overwrites
        const range = sheet.getRange(row, 1, 1, CONFIG.headers.length);
        // Text format for name/mobile/position so "+20..." or "=..." can never turn into a formula.
        range.setNumberFormats([['yyyy-mm-dd hh:mm:ss', '@', '@', '0', '@']]);
        range.setValues([[new Date(), name, mobile, age, position]]); // timestamp generated on the server
        SpreadsheetApp.flush();

        // Only after the row really exists:
        cache.put(reqKey, '1', CONFIG.requestIdTtlSec);
        cache.put(contentKey, '1', CONFIG.contentDedupeTtlSec);
        cache.put(bucketKey, String(count + 1), 660);

        notifyAfter = { area: area, name: name, mobile: mobile, age: age, position: position, sheet: sheetName };
        return saved(false);
      } finally {
        lock.releaseLock();
        if (notifyAfter) notifyRegistration(notifyAfter);
      }
    } catch (err) {
      // Details go to the Apps Script log only; the visitor gets a generic code.
      console.error('PLVReg error: ' + (err && err.message ? err.message : err));
      const msg = String(err && err.message || '');
      return fail(msg.indexOf('setup:') === 0 ? 'setup_error' : 'server_error');
    }
  }

  function health() {
    return reply({
      ok: true,
      success: true,
      service: 'PLV Academy Registration API',
      message: 'Registration service is available.',
      areas: (function () { try { return Object.keys(activeAreas()); } catch (err) { return []; } })(),
    });
  }


  /* ------------------------ editable website content ------------------------ */
  // The owner edits three tabs of the content spreadsheet: "Areas", "Coaches" and "Gallery". Only rows marked TRUE in the
  // published / active column ever leave the sheet. Everything else in the spreadsheet stays private.
  const CONTENT = {
    areas: { sheet: 'Areas', flag: 'active', headers: ['id', 'name', 'name_ar', 'active', 'order'] },
    coaches: { sheet: 'Coaches', flag: 'published',
      headers: ['id', 'name', 'name_ar', 'role', 'role_ar', 'intro', 'intro_ar', 'image', 'slug', 'published', 'order'] },
    gallery: { sheet: 'Gallery', flag: 'published', headers: ['id', 'src', 'alt', 'alt_ar', 'published', 'order'] },
  };
  const SEED_AREAS = [['New Cairo', 'التجمع'], ['Heliopolis', 'مصر الجديدة'], ['Nasr City', 'مدينة نصر']];

  function safeText(v) {
    const t = String(v == null ? '' : v).trim();
    return t.length > 400 ? t.slice(0, 400) : t;
  }
  function safeLink(v) {
    const t = safeText(v);
    return /^\s*(javascript|data|vbscript):/i.test(t) ? '' : t;
  }
  function isSafeAreaName(v) {
    return typeof v === 'string' && v.length >= 2 && v.length <= 40 && !/[\[\]:*?\/\\]/.test(v) &&
      CONFIG.protectedSheets.indexOf(v) === -1;
  }

  // Thumbnails are sized for how they are shown (small cards), so many photos load fast.
  const IMAGE_WIDTH = { coaches: 700, gallery: 900 };
  const driveImage = function (id, kind) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (IMAGE_WIDTH[kind] || 900); };

  /** { fileName: fileId } for a Drive folder, listed ONCE and kept for 10 minutes (one lookup for any number of photos). */
  function driveIndex(kind) {
    const cache = CacheService.getScriptCache();
    const key = 'plv:drive:' + kind;
    const hit = cache.get(key);
    if (hit) { try { return JSON.parse(hit); } catch (err) { /* rebuild */ } }
    const map = {};
    const files = DriveApp.getFolderById(CONFIG.driveFolders[kind]).getFiles();
    while (files.hasNext()) {
      const f = files.next();
      const name = f.getName();
      if (!Object.prototype.hasOwnProperty.call(map, name)) map[name] = f.getId();
    }
    try { cache.put(key, JSON.stringify(map), 600); } catch (err) { /* too large: skip cache */ }
    return map;
  }

  /** Turns the value of an image cell into something the browser can show:
   *  a Drive share link / file ID / file name (looked up in the folder of that tab), an https link, or a site path. */
  function resolveImage(kind, value) {
    const v = String(value || '').trim();
    if (!v) return '';
    const m = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{20,})/);
    if (m) return driveImage(m[1], kind);
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[A-Za-z0-9_-]{25,}$/.test(v)) return driveImage(v, kind); // a bare Drive file ID
    if (v.indexOf('/') !== -1) return safeLink(v); // a path on the website, e.g. assets/images/Img1.jpg
    const folderId = CONFIG.driveFolders[kind];
    if (!folderId) return '';
    try {
      const id = driveIndex(kind)[v];
      return id ? driveImage(id, kind) : '';
    } catch (err) {
      console.error('PLVReg drive lookup failed: ' + (err && err.message ? err.message : err));
      return '';
    }
  }

  /** The website content lives in its own spreadsheet (script property CONTENT_SPREADSHEET_ID); the registration
   *  spreadsheet is used when that property is not set. */
  function openContentSpreadsheet() {
    const id = PropertiesService.getScriptProperties().getProperty('CONTENT_SPREADSHEET_ID') || CONFIG.contentSpreadsheetId;
    return id ? SpreadsheetApp.openById(id) : openSpreadsheet();
  }

  /** Published rows of one content tab, sorted by the `order` column. Cached for a minute. */
  function readContent(kind) {
    const def = CONTENT[kind];
    const cache = CacheService.getScriptCache();
    const key = 'plv:content:' + kind;
    const hit = cache.get(key);
    if (hit) { try { return JSON.parse(hit); } catch (err) { /* re-read */ } }

    const sh = openContentSpreadsheet().getSheetByName(def.sheet);
    let rows = [];
    if (sh && sh.getLastRow() >= 2 && sh.getLastColumn() >= 1) {
      const values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
      const head = values[0].map(function (h) { return String(h).trim(); });
      for (let i = 1; i < values.length; i++) {
        const row = {};
        let any = false;
        head.forEach(function (h, c) {
          if (!h) return;
          const cell = values[i][c];
          const text = safeText(cell);
          if (text) any = true;
          row[h] = (h === 'image' || h === 'url' || h === 'src') ? safeLink(cell) : text;
        });
        if (!any) continue;
        if (String(row[def.flag]).toLowerCase() !== 'true') continue; // hidden rows never leave the sheet
        row[def.flag] = true;
        if (!row.id) row.id = 'row-' + (i + 1);
        if (kind === 'coaches') row.image = resolveImage(kind, row.image);
        if (kind === 'gallery') row.src = resolveImage(kind, row.src);
        row._row = i;
        rows.push(row);
      }
      rows.sort(function (a, b) {
        const x = parseFloat(a.order), y = parseFloat(b.order);
        const hx = !isNaN(x), hy = !isNaN(y);
        if (hx && hy && x !== y) return x - y;
        if (hx !== hy) return hx ? -1 : 1;
        const ia = String(a.id), ib = String(b.id); // no order given: by ID (L001, L002 ...), then sheet row
        if (ia !== ib) return ia < ib ? -1 : 1;
        return a._row - b._row;
      });
      rows.forEach(function (r) { delete r._row; });
    }
    try { cache.put(key, JSON.stringify(rows), CONFIG.contentCacheSec); } catch (err) { /* too large: skip cache */ }
    return rows;
  }

  /** { areaName: worksheetName } from the Areas tab ONLY. No areas in the sheet = no registration areas. */
  function activeAreas() {
    const map = {};
    readContent('areas').forEach(function (r) { if (isSafeAreaName(r.name)) map[r.name] = r.name; }); // throws when the sheet is unreadable
    return map;
  }

  function contentItems(kind) {
    let items = readContent(kind);
    if (kind === 'areas') {
      items = items.filter(function (r) { return isSafeAreaName(r.name); });
    }
    return items;
  }

  /** GET ?type=content&name=areas|coaches|gallery  (one tab)  or  name=all  (everything in ONE request, faster). */
  function content(kind) {
    try {
      if (kind === 'all') {
        const data = {};
        Object.keys(CONTENT).forEach(function (k) { data[k] = contentItems(k); });
        return reply({ ok: true, success: true, status: 'ok', data: data });
      }
      if (!Object.prototype.hasOwnProperty.call(CONTENT, kind)) return fail('bad_request');
      return reply({ ok: true, success: true, status: 'ok', items: contentItems(kind) });
    } catch (err) {
      console.error('PLVReg content error: ' + (err && err.message ? err.message : err));
      return fail('server_error');
    }
  }

  /** Creates the Areas / Coaches / Gallery tabs (only when missing) with headers and starter rows.
   *  Never edits a tab that already exists. */
  function setupContentSheets() {
    const ss = openContentSpreadsheet();
    const made = [];
    const seeds = {
      areas: SEED_AREAS.map(function (a, i) { return ['L00' + (i + 1), a[0], a[1], 'TRUE', i + 1]; }),
      coaches: [1, 2, 3, 4].map(function (n) {
        return ['C00' + n, 'Coach Name ' + n, '', 'Role / title', '', 'One short introductory sentence.', '', 'Coach' + n + '.jpg', '', 'FALSE', n];
      }),
      gallery: [1, 2, 3, 4, 5, 6].map(function (n) { return ['G00' + n, 'Img' + n + '.jpg', 'Academy photo ' + n, '', 'FALSE', n]; }),
    };
    Object.keys(CONTENT).forEach(function (kind) {
      const def = CONTENT[kind];
      if (ss.getSheetByName(def.sheet)) return;
      const sh = ss.insertSheet(def.sheet);
      sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
      sh.getRange(2, 1, seeds[kind].length, def.headers.length).setValues(seeds[kind]);
      made.push(def.sheet);
    });
    console.log(made.length ? 'Created tabs: ' + made.join(', ') : 'Areas, Coaches and Gallery tabs already exist (left untouched).');
  }

  /** Run once from the editor: authorizes the script and creates the three tabs with headers. */
  function setupSheets() {
    const ss = openSpreadsheet();
    setupContentSheets();
    const map = activeAreas();
    Object.keys(map).forEach(function (area) { getRegistrationSheet(ss, map[area]); });
    Object.keys(CONFIG.driveFolders).forEach(function (kind) {
      try { console.log('Drive folder for ' + kind + ': "' + DriveApp.getFolderById(CONFIG.driveFolders[kind]).getName() + '" is readable.'); }
      catch (err) { console.error('Drive folder for ' + kind + ' is NOT readable: ' + (err && err.message ? err.message : err)); }
    });
    console.log('Registration worksheets are ready: ' + Object.keys(map).map(function (a) { return map[a]; }).join(', '));
  }

  return { handle: handle, health: health, content: content, setupSheets: setupSheets,
    notify: notifyRegistration, notifyEmails: notifyEmails, CONFIG: CONFIG };
})();

/** GET: health check by default; ?type=content&name=areas|coaches|gallery returns the published rows of that tab. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.type === 'content') return PLVReg.content(String(p.name || ''));
  return PLVReg.health();
}

/** Web app entry point for POST requests (registration). */
function doPost(e) {
  return PLVReg.handle(e);
}

/** One-time helper: run from the Apps Script editor. */
function setupRegistrationSheets() {
  PLVReg.setupSheets();
}

/** Run once from the editor: authorizes sending email and sends a sample message to the addresses in NOTIFY_EMAILS. */
function testNotification() {
  const to = PLVReg.notifyEmails();
  console.log(to.length ? 'Sending a sample email to: ' + to.join(', ') : 'NOTIFY_EMAILS is empty or has no valid address.');
  PLVReg.notify({ area: 'Test area', name: 'Test Player', mobile: '01000000000', age: 12, position: 'Setter', sheet: 'Test area' });
}
