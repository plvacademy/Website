/**
 * PLV Academy — feedback backend (Google Apps Script web app).  ONE self-contained file.
 *
 * WHERE TO PASTE IT
 *  - Open the PLV Feedback spreadsheet -> Extensions -> Apps Script (a script *bound* to that sheet),
 *    delete the sample code and paste this whole file. (It is separate from the registration script: nothing there changes.)
 *
 * HOW TO INSTALL
 *  1. Run `setupFeedback` once (asks for permission). It creates the "Feedback" tab if missing, adds the drop-down lists
 *     (Visibility / Follow-up Required / Follow-up Status), freezes row 1.
 *  2. Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone -> Deploy. Copy the /exec URL.
 *
 * WHAT IT DOES
 *  - GET  /exec?type=feedback : ONLY rows whose Visibility is "Visible". Public fields only:
 *    id, name, type, rating, message, date, order, home (home = the row's "Show on Home" is YES). Mobile numbers, notes and follow-up data never leave the sheet.
 *  - POST /exec               : { action:'feedback', ... } validates and saves a new row (Visibility = Hidden).
 *    Success is reported only after the row really exists.
 *  - Mobile numbers are saved as plain text in the Mobile column. They are never sent to the website.
 *  - Follow-up: rating 3 or lower -> Follow-up Required = YES and Follow-up Status = Pending, row highlighted.
 *    Changing the drop-downs by hand (YES / Contacted / Resolved) updates the highlight automatically.
 *
 * Security model (be realistic): the public URL can be called by anyone who has it. The protections are BASIC
 * (validation, honeypot, minimum fill time, duplicate and volume limits). They are not authentication, and Apps Script
 * cannot see the sender's IP. Spam can therefore reach the sheet, but always as Hidden, so it never appears on the site.
 * Who can read mobile numbers: anyone with access to this spreadsheet. Keep the spreadsheet private.
 */

const PLVFeedback = (function () {
  const CONFIG = {
    sheetName: 'Feedback',
    spreadsheetId: '', // optional; leave empty when the script is bound to the Feedback sheet
    headers: ['Feedback ID', 'Timestamp', 'Name', 'Type', 'Mobile', 'Rating', 'Feedback', 'Follow-up Required',
      'Follow-up Status', 'Visibility', 'Display Order', 'Admin Notes'],
    optionalHeaders: ['Show on Home'], // read when the column exists; YES = also shown in the Home page section
    types: ['Parent', 'Player'],
    lowRating: 3, // this rating or lower = follow-up
    maxMessage: 1000,
    minMessage: 3,
    maxBodyBytes: 8192,
    minFillMs: 2500, // faster than this = script, not a person
    maxSubmissionsPer10Min: 60, // volume cap for the whole form
    requestIdTtlSec: 21600,
    contentDedupeTtlSec: 600,
    publicCacheSec: 20,
    lockWaitMs: 10000,
    colors: { pending: '#fff4cc', contacted: '#ffe0b2' },
  };

  /* ------------------------------ helpers ------------------------------ */
  function reply(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  }
  const MESSAGES = {
    invalid_name: 'Please enter a valid name.',
    invalid_type: 'Please choose Parent or Player.',
    invalid_rating: 'Please choose a rating.',
    invalid_mobile: 'Please enter a valid mobile number.',
    mobile_required: 'A mobile number is required for this rating.',
    invalid_message: 'Please write your feedback.',
    bad_request: 'Invalid request.',
    spam: 'Request rejected.',
    rate_limited: 'Too many submissions right now. Please try again later.',
    busy: 'The service is busy. Please try again.',
    setup_error: 'The feedback sheet is not set up correctly.',
    server_error: 'Unable to save feedback.',
  };
  function fail(code) { return reply({ ok: false, success: false, code: code, message: MESSAGES[code] || MESSAGES.server_error }); }

  function toAsciiDigits(v) {
    const ar = '٠١٢٣٤٥٦٧٨٩', fa = '۰۱۲۳۴۵۶۷۸۹';
    return String(v == null ? '' : v).replace(/[٠-٩۰-۹]/g, function (d) {
      const i = ar.indexOf(d);
      return String(i >= 0 ? i : fa.indexOf(d));
    });
  }
  function cleanText(v) {
    return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();
  }
  function normalizeName(v) { return cleanText(v).replace(/\s+/g, ' '); }
  function isValidName(v) { return /^[\p{L}\p{M}][\p{L}\p{M} .'’\-]{1,79}$/u.test(v); }
  // Same mobile rules as the registration form: Egyptian mobiles (010/011/012/015) or international +E.164.
  function normalizeMobile(v) {
    let s = toAsciiDigits(v).replace(/[\s\-.()]/g, '');
    if (s.indexOf('00') === 0) s = '+' + s.slice(2);
    const egypt = s.match(/^(?:\+?20|0)?(1[0125]\d{8})$/);
    if (egypt) return '0' + egypt[1];
    if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
    return null;
  }
  function parseRating(v) {
    const n = Number(toAsciiDigits(v));
    if (!isFinite(n) || n < 1 || n > 5 || Math.round(n * 2) !== n * 2) return null; // 1, 1.5, 2 ... 5
    return n;
  }
  function md5(text) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8)
      .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  }

  /* ------------------------------ the sheet ------------------------------ */
  function openSpreadsheet() {
    const ss = CONFIG.spreadsheetId ? SpreadsheetApp.openById(CONFIG.spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('setup: no spreadsheet (bind the script to the Feedback sheet)');
    return ss;
  }
  /** Column positions by header NAME, so reordering columns in the sheet cannot break anything. Refuses on any missing header. */
  function columnMap(sheet) {
    if (sheet.getLastRow() < 1) throw new Error('setup: the Feedback tab is empty (run setupFeedback)');
    const head = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), CONFIG.headers.length)).getValues()[0]
      .map(function (h) { return String(h).trim(); });
    const map = {};
    CONFIG.headers.forEach(function (h) {
      const i = head.indexOf(h);
      if (i === -1) throw new Error('setup: missing column "' + h + '"');
      map[h] = i + 1;
    });
    CONFIG.optionalHeaders.forEach(function (h) {
      const i = head.indexOf(h);
      if (i !== -1) map[h] = i + 1;
    });
    return { map: map, width: head.length };
  }
  function getSheet() {
    const sheet = openSpreadsheet().getSheetByName(CONFIG.sheetName);
    if (!sheet) throw new Error('setup: tab "' + CONFIG.sheetName + '" not found');
    return sheet;
  }

  function colorFor(required, status) {
    const r = String(required == null ? '' : required).trim().toUpperCase();
    const s = String(status == null ? '' : status).trim().toLowerCase();
    if (r !== 'YES') return null;
    if (s === 'resolved') return null;
    if (s === 'contacted') return CONFIG.colors.contacted;
    return CONFIG.colors.pending;
  }

  /* ------------------------------ submit ------------------------------ */
  function submit(e) {
    try {
      const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
      if (!raw || raw.length > CONFIG.maxBodyBytes) return fail('bad_request');
      let body;
      try { body = JSON.parse(raw); } catch (err) { return fail('bad_request'); }
      if (!body || body.action !== 'feedback') return fail('bad_request');

      // --- basic bot checks (NOT authentication) ---
      if (body.website) return fail('spam'); // honeypot filled
      if (typeof body.elapsedMs === 'number' && body.elapsedMs < CONFIG.minFillMs) return fail('spam');

      // --- validation: everything is re-checked here ---
      const name = normalizeName(body.name);
      if (!isValidName(name)) return fail('invalid_name');
      const type = String(body.type == null ? '' : body.type);
      if (CONFIG.types.indexOf(type) === -1) return fail('invalid_type');
      const rating = parseRating(body.rating);
      if (rating === null) return fail('invalid_rating');
      const low = rating <= CONFIG.lowRating;
      let mobile = '';
      const rawMobile = String(body.mobile == null ? '' : body.mobile).trim();
      if (low && !rawMobile) return fail('mobile_required');
      if (rawMobile) {
        mobile = normalizeMobile(rawMobile);
        if (!mobile) return fail('invalid_mobile');
      }
      const message = cleanText(body.message);
      if (message.length < CONFIG.minMessage || message.length > CONFIG.maxMessage) return fail('invalid_message');
      const requestId = String(body.requestId == null ? '' : body.requestId);
      if (!/^[A-Za-z0-9\-]{8,64}$/.test(requestId)) return fail('bad_request');

      const lock = LockService.getScriptLock();
      if (!lock.tryLock(CONFIG.lockWaitMs)) return fail('busy');
      try {
        const cache = CacheService.getScriptCache();
        const reqKey = 'plvfb:req:' + requestId;
        const contentKey = 'plvfb:c:' + md5([name.toLowerCase(), type, rating, message].join('|'));
        const doneReply = function () { return reply({ ok: true, saved: true, success: true, duplicate: true, followUp: low, message: 'Feedback saved successfully.' }); };
        if (cache.get(reqKey) || cache.get(contentKey)) return doneReply(); // a retry or double click: confirm, never write twice

        const bucketKey = 'plvfb:rl:' + Math.floor(Date.now() / 600000);
        const count = Number(cache.get(bucketKey) || 0);
        if (count >= CONFIG.maxSubmissionsPer10Min) return fail('rate_limited');

        const sheet = getSheet();
        const cols = columnMap(sheet);
        const id = 'FB-' + Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyyMMdd') + '-' +
          Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();

        const rowValues = new Array(cols.width).fill('');
        const put = function (h, v) { rowValues[cols.map[h] - 1] = v; };
        put('Feedback ID', id);
        put('Timestamp', new Date()); // generated on the server
        put('Name', name);
        put('Type', type);
        put('Mobile', mobile || '');
        put('Rating', rating);
        put('Feedback', message);
        put('Follow-up Required', low ? 'YES' : 'NO');
        put('Follow-up Status', low ? 'Pending' : '');
        put('Visibility', 'Hidden'); // never published automatically
        if (cols.map['Show on Home']) put('Show on Home', 'NO');
        const row = sheet.getLastRow() + 1; // append below existing data; never overwrites
        const range = sheet.getRange(row, 1, 1, cols.width);
        const formats = new Array(cols.width).fill('@');
        formats[cols.map['Timestamp'] - 1] = 'yyyy-mm-dd hh:mm:ss';
        formats[cols.map['Rating'] - 1] = '0.0';
        formats[cols.map['Display Order'] - 1] = '0';
        if (cols.map['Show on Home']) formats[cols.map['Show on Home'] - 1] = '@';
        range.setNumberFormats([formats]); // text format: "=..." or "+20..." can never become a formula
        range.setValues([rowValues]);
        const color = colorFor(low ? 'YES' : 'NO', low ? 'Pending' : '');
        if (color) range.setBackground(color);
        SpreadsheetApp.flush();

        cache.put(reqKey, '1', CONFIG.requestIdTtlSec);
        cache.put(contentKey, '1', CONFIG.contentDedupeTtlSec);
        cache.put(bucketKey, String(count + 1), 660);
        return reply({ ok: true, saved: true, success: true, duplicate: false, followUp: low, message: 'Feedback saved successfully.' });
      } finally {
        lock.releaseLock();
      }
    } catch (err) {
      console.error('PLVFeedback error: ' + (err && err.message ? err.message : err));
      const msg = String(err && err.message || '');
      return fail(msg.indexOf('setup:') === 0 ? 'setup_error' : 'server_error');
    }
  }

  /* ------------------------------ public list ------------------------------ */
  function readPublic() {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('plvfb:public');
    if (hit) { try { return JSON.parse(hit); } catch (err) { /* re-read */ } }
    const sheet = getSheet();
    const cols = columnMap(sheet);
    const items = [];
    if (sheet.getLastRow() >= 2) {
      const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols.width).getValues();
      values.forEach(function (r, i) {
        const get = function (h) { return r[cols.map[h] - 1]; };
        if (String(get('Visibility')).trim().toLowerCase() !== 'visible') return; // hidden rows never leave the sheet
        const rating = parseRating(get('Rating'));
        const message = cleanText(get('Feedback'));
        const name = normalizeName(get('Name'));
        const type = String(get('Type')).trim();
        if (rating === null || !message || !name || CONFIG.types.indexOf(type) === -1) return;
        const ts = get('Timestamp');
        const order = parseFloat(get('Display Order'));
        items.push({
          id: String(get('Feedback ID')).trim() || ('row-' + (i + 2)),
          name: name,
          type: type,
          rating: rating,
          message: message,
          date: ts instanceof Date ? Utilities.formatDate(ts, 'Africa/Cairo', 'yyyy-MM-dd') : '',
          order: isNaN(order) ? null : order,
          approved: true, // only Visible rows ever get here
          home: !!cols.map['Show on Home'] && String(get('Show on Home')).trim().toUpperCase() === 'YES',
          _t: ts instanceof Date ? ts.getTime() : 0,
          _row: i,
        });
      });
    }
    // Smaller Display Order first; rows without one come last; ties: newest first, then sheet order.
    items.sort(function (a, b) {
      const ha = a.order !== null, hb = b.order !== null;
      if (ha && hb && a.order !== b.order) return a.order - b.order;
      if (ha !== hb) return ha ? -1 : 1;
      if (a._t !== b._t) return b._t - a._t;
      return a._row - b._row;
    });
    items.forEach(function (it) { delete it._t; delete it._row; });
    try { cache.put('plvfb:public', JSON.stringify(items), CONFIG.publicCacheSec); } catch (err) { /* too large: skip cache */ }
    return items;
  }

  function list() {
    try {
      return reply({ ok: true, success: true, status: 'ok', items: readPublic() });
    } catch (err) {
      console.error('PLVFeedback list error: ' + (err && err.message ? err.message : err));
      return fail('server_error');
    }
  }

  function health() {
    return reply({ ok: true, success: true, service: 'PLV Academy Feedback API', message: 'Feedback service is available.' });
  }

  /* ------------------------ follow-up highlight (sheet edits) ------------------------ */
  /** Runs when someone edits the sheet by hand (simple onEdit trigger, no setup needed). */
  function onSheetEdit(e) {
    try {
      if (!e || !e.range) return;
      const sheet = e.range.getSheet();
      if (sheet.getName() !== CONFIG.sheetName) return;
      const cols = columnMap(sheet);
      const reqCol = cols.map['Follow-up Required'], stCol = cols.map['Follow-up Status'];
      const c1 = e.range.getColumn(), c2 = e.range.getLastColumn();
      if (!((reqCol >= c1 && reqCol <= c2) || (stCol >= c1 && stCol <= c2))) return;
      const r1 = Math.max(2, e.range.getRow()), r2 = e.range.getLastRow();
      for (let row = r1; row <= r2; row++) {
        const req = sheet.getRange(row, reqCol).getValue();
        let status = sheet.getRange(row, stCol).getValue();
        if (String(req).trim().toUpperCase() === 'YES' && !String(status).trim()) {
          status = 'Pending';
          sheet.getRange(row, stCol).setValue(status);
        }
        sheet.getRange(row, 1, 1, cols.width).setBackground(colorFor(req, status));
      }
    } catch (err) {
      console.error('PLVFeedback onEdit error: ' + (err && err.message ? err.message : err));
    }
  }

  /* ------------------------------ one-time setup ------------------------------ */
  function setup() {
    const ss = openSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.sheetName);
    if (!sheet) sheet = ss.insertSheet(CONFIG.sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]).setFontWeight('bold');
    }
    const cols = columnMap(sheet); // refuses (throws) when the headers are not exactly as expected
    sheet.setFrozenRows(1);
    const lists = { 'Visibility': ['Visible', 'Hidden'], 'Follow-up Required': ['YES', 'NO'],
      'Follow-up Status': ['Pending', 'Contacted', 'Resolved'], 'Show on Home': ['YES', 'NO'] };
    Object.keys(lists).forEach(function (h) {
      if (!cols.map[h]) return; // optional column not added yet
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(lists[h], true).setAllowInvalid(false).build();
      sheet.getRange(2, cols.map[h], Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
    });
    sheet.getRange(2, cols.map['Mobile'], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    console.log('Feedback sheet is ready.');
  }

  return { submit: submit, list: list, health: health, onSheetEdit: onSheetEdit, setup: setup,
    CONFIG: CONFIG, _internals: { parseRating: parseRating, normalizeMobile: normalizeMobile } };
})();

/** GET: health check by default; ?type=feedback returns the approved (Visible) reviews. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.type === 'feedback') return PLVFeedback.list();
  return PLVFeedback.health();
}

/** POST: a new feedback submission (saved as Hidden). */
function doPost(e) {
  return PLVFeedback.submit(e);
}

/** Highlights follow-up rows when the drop-downs are changed by hand. */
function onEdit(e) { PLVFeedback.onSheetEdit(e); }


/** One-time helper: run from the Apps Script editor. */
function setupFeedback() { PLVFeedback.setup(); }

/**
 * Self-test: run this from the Apps Script editor (choose testFeedbackSave -> Run). It sends a fake submission through the same
 * code the website uses, saves one row named "TEST Delete Me" (Hidden) and prints the result in the Execution log.
 * If something is wrong, the log shows the real error. Delete the test row afterwards.
 */
function testFeedbackSave() {
  const body = { action: 'feedback', name: 'TEST Delete Me', type: 'Parent', rating: 5, message: 'Self-test, please delete',
    mobile: '', requestId: 'selftest-' + Date.now(), elapsedMs: 9000, website: '' };
  const out = PLVFeedback.submit({ postData: { contents: JSON.stringify(body) } });
  console.log('RESULT: ' + out.getContent());
}
