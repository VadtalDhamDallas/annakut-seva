/**
 * Annakut Seva 2026 - VadtalDham Dallas
 * Backend for the GitHub Pages site. Create a Google Sheet, open
 * Extensions > Apps Script, paste this file, run setup() once, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Optional: run pretranslateAll() once so every recipe opens instantly.
 */
const CONFIG = {
  SITE_URL: 'https://vadtaldhamdallas.github.io/annakut-seva',   // EDIT: your website address (no slash at the end)
  EVENT_NAME: 'Annakut Seva 2026',
  EVENT_DATE: 'Sunday, November 15, 2026 (Vikram Samvat 2083)',   // EDIT
  TEMPLE: 'Shree Swaminarayan Hindu Temple - VadtalDham Dallas',   // EDIT: your temple name
  ADDRESS: '2114 Pine St, Grand Prairie, TX 75050',   // EDIT
  CONTACT_PHONE: '+1 (972) 263-7637',   // EDIT
  CONTACT_EMAIL: 'Dallas@VadtalDham.World',   // EDIT
  TIMEZONE: 'America/Chicago',   // EDIT: e.g. America/Toronto, America/Vancouver, Europe/London
  MAX_PER_PERSON: 10,
  SEND_EMAIL: true,
};
const SHEETS = { BOOK: 'Bookings', TR: 'Translations', CUSTOM: 'Custom dishes' };
const BOOK_HEADERS = ['Timestamp', 'Ref', 'Dish No', 'Dish (English)', 'Dish (Gujarati)', 'Name', 'Phone', 'Email', 'Status', 'WhatsApp', 'WhatsApp due'];
const WA_COL = BOOK_HEADERS.indexOf('WhatsApp') + 1;
const CUSTOM_HEADERS = ['ID', 'Created', 'Typed name', 'English', 'Gujarati', 'Photo', 'Recipe status', 'Recipe (English)', 'Recipe (Gujarati)', 'Devotee notes', 'Ref', 'Status'];
const CUSTOM_START = 2001;
const BANNED = /\b(onions?|garlic|hing|asafoetida|eggs?|meat|chicken|fish|gelatin|alcohol|wine|rum)\b|\u0AA1\u0AC1\u0A82\u0A97\u0AB3|\u0AB2\u0AB8\u0AA3|\u0AB9\u0ABF\u0A82\u0A97|\u0A88\u0A82\u0AA1/i;
const STATUS_COL = BOOK_HEADERS.indexOf('Status') + 1;
const TR_HEADERS = ['Key', 'JSON', 'Updated'];
const LANGS = { gu: 1, en: 1, hi: 1, pa: 1, mr: 1, ur: 1, bn: 1, ta: 1, te: 1, kn: 1, ml: 1, ne: 1, es: 1, fr: 1, de: 1, pt: 1, tl: 1, ar: 1, 'zh-CN': 1, sw: 1 };
const LABELS_EN = ['Ingredients', 'Method', 'Time', 'Serves', 'Note'];
const TR_VER = ':v3';
// Gujarati cooking terms Google Translate gets wrong (e.g. maida came out as eggs): [pattern, English, Hindi, ingredient lines only]
const GLOSS = [
  ['(?:\u0A98\u0A89\u0A82\u0AA8\u0ACB \u0A95\u0AB0\u0A95\u0AB0\u0ACB \u0AB2\u0ACB\u0A9F)', 'coarse wheat flour', '\u092E\u094B\u091F\u093E \u0917\u0947\u0939\u0942\u0902 \u0915\u093E \u0906\u091F\u093E', 0],
  ['(?:\u0A9A\u0AA3\u0ABE\u0AA8\u0ACB \u0AB2\u0ACB\u0A9F|\u0A9A\u0AA3\u0ABE\u0AA8\u0ABE \u0AB2\u0ACB\u0A9F)', 'gram flour (besan)', '\u092C\u0947\u0938\u0928', 0],
  ['(?:\u0A98\u0A89\u0A82\u0AA8\u0ACB \u0AB2\u0ACB\u0A9F|\u0A98\u0A89\u0A82\u0AA8\u0ABE \u0AB2\u0ACB\u0A9F)', 'wheat flour', '\u0917\u0947\u0939\u0942\u0902 \u0915\u093E \u0906\u091F\u093E', 0],
  ['(?:\u0AAC\u0ABE\u0A9C\u0AB0\u0AC0\u0AA8\u0ACB \u0AB2\u0ACB\u0A9F|\u0AAC\u0ABE\u0A9C\u0AB0\u0AC0\u0AA8\u0ABE \u0AB2\u0ACB\u0A9F)', 'pearl millet (bajra) flour', '\u092C\u093E\u091C\u0930\u0947 \u0915\u093E \u0906\u091F\u093E', 0],
  ['(?:\u0A9A\u0ACB\u0A96\u0ABE\u0AA8\u0ACB \u0AB2\u0ACB\u0A9F|\u0A9A\u0ACB\u0A96\u0ABE\u0AA8\u0ABE \u0AB2\u0ACB\u0A9F)', 'rice flour', '\u091A\u093E\u0935\u0932 \u0915\u093E \u0906\u091F\u093E', 0],
  ['(?:\u0A85\u0AA1\u0AA6\u0AA8\u0ACB \u0A9D\u0AC0\u0AA3\u0ACB \u0AB2\u0ACB\u0A9F|\u0A85\u0AA1\u0AA6\u0AA8\u0ACB \u0AB2\u0ACB\u0A9F|\u0A85\u0AA1\u0AA6\u0AA8\u0ABE \u0AB2\u0ACB\u0A9F)', 'urad dal flour', '\u0909\u0921\u093C\u0926 \u0926\u093E\u0932 \u0915\u093E \u0906\u091F\u093E', 0],
  ['(?:\u0AAE\u0AC7\u0A82\u0AA6\u0ABE\u0AA8\u0ACB|\u0AAE\u0AC7\u0A82\u0AA6\u0ABE\u0AA8\u0AC0|\u0AAE\u0AC7\u0A82\u0AA6\u0ABE\u0AA8\u0ABE|\u0AAE\u0AC7\u0A82\u0AA6\u0ABE\u0AA8\u0AC1\u0A82|\u0AAE\u0AC7\u0A82\u0AA6\u0ACB|\u0AAE\u0AC7\u0A82\u0AA6\u0ABE|\u0AAE\u0AC8\u0A82\u0AA6\u0ACB|\u0AAE\u0AC8\u0A82\u0AA6\u0ABE)', 'maida (all-purpose flour)', '\u092E\u0948\u0926\u093E', 0],
  ['(?:\u0AA6\u0AB3\u0AC7\u0AB2\u0AC0 \u0A96\u0ABE\u0A82\u0AA1)', 'powdered sugar', '\u092A\u093F\u0938\u0940 \u091A\u0940\u0928\u0940', 0],
  ['(?:\u0AAC\u0AC2\u0AB0\u0AC1\u0A82|\u0AAC\u0AC1\u0AB0\u0AC2|\u0AAC\u0AC2\u0AB0\u0AC1|\u0AAC\u0AC1\u0AB0\u0AC1\u0A82)', 'bura (powdered sugar)', '\u092C\u0942\u0930\u093E', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AAE\u0ACB\u0AA3)(?![\u0A80-\u0AFF])', 'moyan (ghee or oil rubbed into the flour)', '\u092E\u094B\u092F\u0928', 0],
  ['(?:\u0AA7\u0ABE\u0AA3\u0ABE\u0A9C\u0AC0\u0AB0\u0AC1\u0A82|\u0AA7\u0ABE\u0AA3\u0ABE\u0A9C\u0AC0\u0AB0\u0AC2|\u0AA7\u0ABE\u0AA3\u0ABE \u0A9C\u0AC0\u0AB0\u0AC1\u0A82|\u0AA7\u0ABE\u0AA3\u0ABE\u0A9C\u0AC0\u0AB0\u0AC1)', 'coriander-cumin powder', '\u0927\u0928\u093F\u092F\u093E-\u091C\u0940\u0930\u093E \u092A\u093E\u0909\u0921\u0930', 0],
  ['(?:\u0A95\u0AB8\u0AC2\u0AB0\u0AC0 \u0AAE\u0AC7\u0AA5\u0AC0|\u0A95\u0AB8\u0AC1\u0AB0\u0AC0 \u0AAE\u0AC7\u0AA5\u0AC0)', 'kasuri methi (dried fenugreek leaves)', '\u0915\u0938\u0942\u0930\u0940 \u092E\u0947\u0925\u0940', 0],
  ['(?:\u0A86\u0AAE\u0A9A\u0AC2\u0AB0|\u0A86\u0AAE\u0A9A\u0AC1\u0AB0)', 'amchur (dry mango powder)', '\u0905\u092E\u091A\u0942\u0930', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0A85\u0A9C\u0AAE\u0ACB|\u0A85\u0A9C\u0AAE\u0ABE)(?![\u0A80-\u0AFF])', 'ajwain (carom seeds)', '\u0905\u091C\u0935\u093E\u0907\u0928', 0],
  ['(?:\u0AB5\u0AB0\u0ABF\u0AAF\u0ABE\u0AB3\u0AC0)', 'fennel seeds', '\u0938\u094C\u0902\u092B', 0],
  ['(?:\u0A96\u0AB8\u0A96\u0AB8)', 'poppy seeds', '\u0916\u0938\u0916\u0938', 0],
  ['(?:\u0A9A\u0ABE\u0AB0\u0ACB\u0AB3\u0AC0)', 'charoli (chironji)', '\u091A\u093F\u0930\u094C\u0902\u091C\u0940', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0A97\u0AC1\u0A82\u0AA6\u0AB0|\u0A97\u0AC1\u0A82\u0AA6)(?![\u0A80-\u0AFF])', 'edible gum (gond)', '\u0917\u094B\u0902\u0926', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AB8\u0AC2\u0A82\u0AA0|\u0AB8\u0AC1\u0A82\u0AA0)(?![\u0A80-\u0AFF])', 'dry ginger powder', '\u0938\u094B\u0902\u0920', 0],
  ['(?:\u0A8F\u0AB2\u0A9A\u0AC0|\u0A87\u0AB2\u0ABE\u0AAF\u0A9A\u0AC0|\u0A88\u0AB2\u0ABE\u0AAF\u0A9A\u0AC0)', 'cardamom', '\u0907\u0932\u093E\u092F\u091A\u0940', 0],
  ['(?:\u0A9C\u0ABE\u0AAF\u0AAB\u0AB3)', 'nutmeg', '\u091C\u093E\u092F\u092B\u0932', 0],
  ['(?:\u0AB2\u0AB5\u0ABF\u0A82\u0A97)', 'cloves', '\u0932\u094C\u0902\u0917', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AA4\u0A9C)(?![\u0A80-\u0AFF])', 'cinnamon', '\u0926\u093E\u0932\u091A\u0940\u0928\u0940', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AAE\u0ABE\u0AB5\u0ACB|\u0AAE\u0ABE\u0AB5\u0ABE)(?![\u0A80-\u0AFF])', 'mawa (khoya)', '\u092E\u093E\u0935\u093E (\u0916\u094B\u092F\u093E)', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AB0\u0AB5\u0ACB|\u0AB8\u0ACB\u0A9C\u0AC0)(?![\u0A80-\u0AFF])', 'semolina (rava)', '\u0938\u0942\u091C\u0940 (\u0930\u0935\u093E)', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AB9\u0ABF\u0A82\u0A97)(?![\u0A80-\u0AFF])', 'hing (asafoetida)', '\u0939\u0940\u0902\u0917', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0A9B\u0ABE\u0AB6)(?![\u0A80-\u0AFF])', 'buttermilk', '\u091B\u093E\u091B', 0],
  ['(?:\u0A95\u0ACB\u0AA5\u0AAE\u0AC0\u0AB0|\u0AB2\u0AC0\u0AB2\u0ABE\u0A82 \u0AA7\u0ABE\u0AA3\u0ABE|\u0AB2\u0AC0\u0AB2\u0ABE \u0AA7\u0ABE\u0AA3\u0ABE)', 'fresh coriander leaves', '\u0939\u0930\u093E \u0927\u0928\u093F\u092F\u093E', 0],
  ['(?:\u0AB2\u0AC0\u0AB2\u0ABE\u0A82 \u0AAE\u0AB0\u0A9A\u0ABE\u0A82|\u0AB2\u0AC0\u0AB2\u0ABE \u0AAE\u0AB0\u0A9A\u0ABE\u0A82|\u0AB2\u0AC0\u0AB2\u0ABE\u0A82 \u0AAE\u0AB0\u0A9A\u0ABE|\u0AB2\u0AC0\u0AB2\u0ABE \u0AAE\u0AB0\u0A9A\u0ABE)', 'green chillies', '\u0939\u0930\u0940 \u092E\u093F\u0930\u094D\u091A', 0],
  ['(?:\u0AB2\u0ABE\u0AB2 \u0AAE\u0AB0\u0A9A\u0AC1\u0A82 \u0AAA\u0ABE\u0A89\u0AA1\u0AB0|\u0AB2\u0ABE\u0AB2 \u0AAE\u0AB0\u0A9A\u0AC1\u0A82|\u0AB2\u0ABE\u0AB2 \u0AAE\u0AB0\u0A9A\u0AC1)', 'red chilli powder', '\u0932\u093E\u0932 \u092E\u093F\u0930\u094D\u091A \u092A\u093E\u0909\u0921\u0930', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0A97\u0ACB\u0AB3)(?![\u0A80-\u0AFF])', 'jaggery', '\u0917\u0941\u0921\u093C', 1],
  ['(?<![\u0A80-\u0AFF])(?:\u0AAE\u0AB0\u0AC0)(?![\u0A80-\u0AFF])', 'black pepper', '\u0915\u093E\u0932\u0940 \u092E\u093F\u0930\u094D\u091A', 1],
  ['(?:\u0A95\u0ACB\u0AAA\u0AB0\u0ABE\u0AA8\u0AC1\u0A82 \u0A9B\u0AC0\u0AA3|\u0A95\u0ACB\u0AAA\u0AB0\u0ABE\u0AA8\u0AC0 \u0A9B\u0AC0\u0AA3|\u0AB8\u0AC2\u0A95\u0AC1\u0A82 \u0A95\u0ACB\u0AAA\u0AB0\u0AC1\u0A82)', 'grated dry coconut', '\u0938\u0942\u0916\u093E \u0928\u093E\u0930\u093F\u092F\u0932 (\u0915\u0938\u093E \u0939\u0941\u0906)', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0AA8\u0A82\u0A97)(?![\u0A80-\u0AFF])', 'pcs', '\u0928\u0917', 0],
  ['(?<![\u0A80-\u0AFF])(?:\u0A98\u0AC0)(?![\u0A80-\u0AFF])', 'ghee', '\u0918\u0940', 0]
].map(function (g) { return { re: new RegExp(g[0], 'g'), en: g[1], hi: g[2], ing: g[3] }; });


const PUBLIC_API = { getBooked, book, getRecipe, getNames, getBooking, updateBooking, getCustom, adminWaQueue, adminWaMark };

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = PUBLIC_API[req.fn];
    if (!fn) throw new Error('Unknown request.');
    out = { ok: true, data: fn.apply(null, Array.isArray(req.args) ? req.args : []) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('Annakut Seva API is running.');
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) { return ss_().getSheetByName(name); }

function setup() {
  ss_().setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  const old = sheet_(SHEETS.BOOK);
  const oldHead = old && old.getLastColumn() > 0 ? old.getRange(1, 1, 1, old.getLastColumn()).getValues()[0].join('|') : '';
  if (oldHead && oldHead !== BOOK_HEADERS.join('|') && BOOK_HEADERS.join('|').indexOf(oldHead + '|') !== 0) {
    if (old.getLastRow() < 2) old.clear();
    else old.setName(SHEETS.BOOK + ' (old ' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'MMM d HH:mm') + ')');
  }
  [[SHEETS.BOOK, BOOK_HEADERS], [SHEETS.TR, TR_HEADERS], [SHEETS.CUSTOM, CUSTOM_HEADERS]].forEach(function (x) {
    const sh = sheet_(x[0]) || ss_().insertSheet(x[0]);
    sh.getRange(1, 1, 1, x[1].length).setValues([x[1]])
      .setFontWeight('bold').setBackground('#7a1f2b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  sheet_(SHEETS.BOOK).getRange('C:C').setNumberFormat('0');
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PIN')) props.setProperty('ADMIN_PIN', String(Math.floor(10000000 + Math.random() * 89999999)));
  console.log('Admin PIN for the WhatsApp sender: ' + props.getProperty('ADMIN_PIN'));
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'fillCustomRecipes'; })) {
    ScriptApp.newTrigger('fillCustomRecipes').timeBased().everyMinutes(10).create();
  }
  const s1 = sheet_('Sheet1');
  if (s1 && s1.getLastRow() === 0) ss_().deleteSheet(s1);
}

/* ---------- Site data (single source of truth = the published site) ---------- */

function fetchJson_(path) {
  const res = UrlFetchApp.fetch(CONFIG.SITE_URL + path + '?v=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Could not load ' + path);
  return JSON.parse(res.getContentText());
}

function dishMap_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('dishes2');
  if (hit) { const m = JSON.parse(hit); customRows_().forEach(function (c) { m[c.id] = [c.gu, c.en]; }); return m; }
  const map = {};
  fetchJson_('/data/dishes.json').forEach(function (d) { map[d[0]] = [d[1], d[2]]; });
  cache.put('dishes2', JSON.stringify(map), 21600);
  customRows_().forEach(function (c) { map[c.id] = [c.gu, c.en]; });
  return map;
}

function guRecipe_(sn) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('g2' + sn);
  if (hit) return JSON.parse(hit);
  const all = fetchJson_('/data/recipes-gu.json');
  const batch = {};
  Object.keys(all).forEach(function (k) {
    const s = JSON.stringify(all[k]);
    if (s.length < 90000) batch['g2' + k] = s;
  });
  const keys = Object.keys(batch);
  for (let i = 0; i < keys.length; i += 100) {
    const part = {};
    keys.slice(i, i + 100).forEach(function (k) { part[k] = batch[k]; });
    cache.putAll(part, 21600);
  }
  return all[sn] || null;
}

/* ---------- Bookings ---------- */

function bookedSet_() {
  const sh = sheet_(SHEETS.BOOK);
  const n = sh.getLastRow() - 1;
  const set = {};
  if (n < 1) return set;
  const dish = sh.getRange(2, 3, n, 1).getValues();
  const status = sh.getRange(2, STATUS_COL, n, 1).getValues();
  dish.forEach(function (r, i) {
    if (String(status[i][0]).toLowerCase() === 'confirmed') set[Number(r[0])] = true;
  });
  return set;
}

function getBooked() {
  return Object.keys(bookedSet_()).map(Number);
}

function book(form) {
  form = form || {};
  const name = String(form.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const phone = String(form.phone || '').replace(/[^0-9+]/g, '').slice(0, 16);
  const email = String(form.email || '').trim().slice(0, 120);
  let dishes = dishMap_();
  let sns = (Array.isArray(form.dishes) ? form.dishes : []).map(Number)
    .filter(function (n, i, a) { return dishes[n] && a.indexOf(n) === i; });
  const custom = cleanCustom_(form.custom);
  if (name.length < 3) throw new Error('Please enter your full name.');
  if (phone.replace(/\D/g, '').length < 10) throw new Error('Please enter a valid phone number.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (!sns.length && !custom.length) throw new Error('Please choose at least one dish.');
  if (sns.length + custom.length > CONFIG.MAX_PER_PERSON) throw new Error('You can choose up to ' + CONFIG.MAX_PER_PERSON + ' dishes.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const taken = bookedSet_();
    const conflicts = sns.filter(function (n) { return taken[n]; });
    if (conflicts.length) return { ok: false, conflicts: conflicts };
    const ref = 'AK' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'MMdd') + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const now = new Date();
    custom.forEach(function (c) { const id = createCustom_(c, ref); sns.push(id); });
    if (custom.length) dishes = dishMap_();
    const wa = form.wa === false ? 'Not requested' : 'Pending', due = waDue_(now);
    const rows = sns.map(function (n) {
      return [now, ref, n, dishes[n][1], dishes[n][0], name, "'" + phone, email, 'Confirmed', wa, due];
    });
    const sh = sheet_(SHEETS.BOOK);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    SpreadsheetApp.flush();
    if (CONFIG.SEND_EMAIL) sendEmail_(email, name, ref, sns, dishes, 'new');
    return { ok: true, ref: ref, token: token_(ref), dishes: sns };
  } finally {
    lock.releaseLock();
  }
}

function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRET', s); }
  return s;
}

function token_(ref) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(ref), secret_())).replace(/=+$/, '').slice(0, 16);
}

function manageUrl_(ref) { return CONFIG.SITE_URL + '/#manage/' + ref + '/' + token_(ref); }

function rowsFor_(ref) {
  const sh = sheet_(SHEETS.BOOK), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const out = [];
  sh.getRange(2, 1, n, BOOK_HEADERS.length).getValues().forEach(function (r, i) {
    if (String(r[1]).toUpperCase() === ref) out.push({ row: i + 2, sn: Number(r[2]), name: String(r[5]), phone: String(r[6]).replace(/^'/, ''), email: String(r[7]), status: String(r[8]).toLowerCase() });
  });
  return out;
}

/** The key is either the private token from the email link, or the email address used to register. */
function auth_(ref, key) {
  ref = String(ref || '').trim().toUpperCase();
  key = String(key || '').trim();
  const rows = rowsFor_(ref);
  if (!rows.length) throw new Error('We could not find that reference number. Please check it and try again.');
  const ok = key === token_(ref) || (key.indexOf('@') > 0 && rows.some(function (r) { return r.email.toLowerCase() === key.toLowerCase(); }));
  if (!ok) throw new Error('The reference number and email do not match.');
  return { ref: ref, rows: rows };
}

function getBooking(ref, key) {
  const a = auth_(ref, key), r0 = a.rows[0];
  return { ref: a.ref, token: token_(a.ref), name: r0.name, phone: r0.phone, email: r0.email,
    dishes: a.rows.filter(function (r) { return r.status === 'confirmed'; }).map(function (r) { return r.sn; }) };
}

function updateBooking(ref, key, list, customIn) {
  const a = auth_(ref, key); let dishes = dishMap_();
  const custom = cleanCustom_(customIn);
  const want = (Array.isArray(list) ? list : []).map(Number).filter(function (n, i, x) { return dishes[n] && x.indexOf(n) === i; });
  if (want.length + custom.length > CONFIG.MAX_PER_PERSON) throw new Error('You can choose up to ' + CONFIG.MAX_PER_PERSON + ' dishes.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let r0;
  try {
    const rows = rowsFor_(a.ref); r0 = rows[0];
    custom.forEach(function (c) { want.push(createCustom_(c, a.ref)); });
    if (custom.length) dishes = dishMap_();
    const active = rows.filter(function (r) { return r.status === 'confirmed'; });
    const have = active.map(function (r) { return r.sn; });
    const add = want.filter(function (n) { return have.indexOf(n) < 0; });
    const remove = active.filter(function (r) { return want.indexOf(r.sn) < 0; });
    const taken = bookedSet_();
    const conflicts = add.filter(function (n) { return taken[n]; });
    if (conflicts.length) return { ok: false, conflicts: conflicts };
    const sh = sheet_(SHEETS.BOOK);
    remove.forEach(function (r) { sh.getRange(r.row, STATUS_COL).setValue(want.length ? 'Removed (changed by devotee)' : 'Cancelled by devotee'); if (r.sn >= CUSTOM_START) setCustomStatus_(r.sn, 'Removed'); });
    if (add.length) {
      const now = new Date();
      const newRows = add.map(function (n) { return [now, a.ref, n, dishes[n][1], dishes[n][0], r0.name, "'" + r0.phone, r0.email, 'Confirmed', 'Not requested', '']; });
      sh.getRange(sh.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (CONFIG.SEND_EMAIL && r0.email) sendEmail_(r0.email, r0.name, a.ref, want, dishes, want.length ? 'updated' : 'cancelled');
  return { ok: true, ref: a.ref, token: token_(a.ref), dishes: want };
}

function sendEmail_(email, name, ref, sns, dishes, kind) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    const list = (sns || []).map(function (n) {
      const link = function (lang, label) {
        return '<a href="' + CONFIG.SITE_URL + '/#r' + n + '-' + lang + '" style="display:inline-block;margin:6px 6px 0 0;padding:8px 14px;border-radius:999px;background:#8c1a2e;color:#ffffff;text-decoration:none;font-weight:bold">' + label + '</a>';
      };
      return '<li style="margin:0 0 16px;padding:12px 14px;border:1px solid #ecdfc9;border-radius:12px;list-style:none">' +
        '<b style="font-size:18px;color:#520c1a">#' + n + ' - ' + esc_(dishes[n][1]) + '</b><br>' + esc_(dishes[n][0]) + '<br>' +
        '<span style="color:#6f5d50">View recipe:</span><br>' + link('en', 'English') + link('gu', '&#x0A97;&#x0AC1;&#x0A9C;&#x0AB0;&#x0ABE;&#x0AA4;&#x0AC0;') + link('hi', '&#x0939;&#x093F;&#x0902;&#x0926;&#x0940;') + '</li>';
    }).join('');
    MailApp.sendEmail({
      to: email,
      subject: CONFIG.EVENT_NAME + (kind === 'cancelled' ? ' - Your seva is cancelled (' : kind === 'updated' ? ' - Your seva is updated (' : ' - Your seva is confirmed (') + ref + ')',
      htmlBody: '<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.5">' +
        '<p>Jay Swaminarayan ' + esc_(name) + ',</p>' +
        '<p style="font-size:18px;color:#520c1a"><b>Annakut Utsav: ' + CONFIG.EVENT_DATE + '</b></p>' +
        '<div style="margin:16px 0;padding:14px 16px;background:#fff8e8;border:1px solid #f1d9a6;border-left:6px solid #e8891c;border-radius:12px">' +
        '<b style="color:#520c1a">&#x0AAA;&#x0ACD;&#x0AB0;&#x0AB8;&#x0ABE;&#x0AA6; &#x0AAC;&#x0AA8;&#x0ABE;&#x0AB5;&#x0AA4;&#x0AC0; &#x0AB5;&#x0A96;&#x0AA4;&#x0AC7; &#x0A96;&#x0ABE;&#x0AB8; &#x0AA7;&#x0ACD;&#x0AAF;&#x0ABE;&#x0AA8; &#x0AB0;&#x0ABE;&#x0A96;&#x0ACB;</b><br><span style="font-size:17px">&#x0A95;&#x0ACB;&#x0A88; &#x0AAA;&#x0AA3; &#x0AB5;&#x0ABE;&#x0AA8;&#x0A97;&#x0AC0; &#x0AAC;&#x0AA8;&#x0ABE;&#x0AB5;&#x0ACB; &#x0AA4;&#x0ACD;&#x0AAF;&#x0ABE;&#x0AB0;&#x0AC7; &#x0AA1;&#x0AC1;&#x0A82;&#x0A97;&#x0AB3;&#x0AC0;, &#x0AB2;&#x0AB8;&#x0AA3; &#x0A85;&#x0AA8;&#x0AC7; &#x0AB9;&#x0ABF;&#x0A82;&#x0A97;&#x0AA8;&#x0ACB; &#x0A89;&#x0AAA;&#x0AAF;&#x0ACB;&#x0A97; &#x0AA8; &#x0A95;&#x0AB0;&#x0AB5;&#x0ACB;. &#x0A98;&#x0AC0;, &#x0AA4;&#x0AC7;&#x0AB2;, &#x0AA6;&#x0AC2;&#x0AA7;, &#x0AAA;&#x0ABE;&#x0AA3;&#x0AC0; &#x0AAC;&#x0AA7;&#x0AC1;&#x0A82; &#x0A97;&#x0ABE;&#x0AB3;&#x0AC0;-&#x0A9A;&#x0ABE;&#x0AB3;&#x0AC0;&#x0AA8;&#x0AC7; &#x0AB5;&#x0ABE;&#x0AAA;&#x0AB0;&#x0AB5;&#x0AC1;&#x0A82;.</span><br>' +
        '<span style="color:#6f5d50">When making any dish, please do not use onion, garlic or hing (asafoetida). Strain and filter all ghee, oil, milk and water before use.</span></div>' +
        (kind === 'cancelled'
          ? '<p>Your Annakut seva <b>' + ref + '</b> has been cancelled. You are welcome to choose a dish again at <a href="' + CONFIG.SITE_URL + '">' + CONFIG.SITE_URL + '</a>.</p>'
          : '<p>' + (kind === 'updated' ? 'Your Annakut seva has been updated. Your dishes now are:' : 'Thank you for your Annakut seva. Your dishes:') + '</p><ul style="padding:0">' + list + '</ul>' +
            '<div style="margin:18px 0;padding:16px;border:2px solid #d4a64a;border-radius:14px;background:#fffaf0">' +
            '<div style="color:#6f5d50">Your reference number</div><div style="font-size:24px;font-weight:bold;letter-spacing:2px;color:#520c1a">' + ref + '</div>' +
            '<p style="margin:10px 0">Changed your mind? You can add, remove or change your dishes, or cancel, at any time:</p>' +
            '<a href="' + manageUrl_(ref) + '" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#d4a64a;color:#33070f;text-decoration:none;font-weight:bold;font-size:17px">Change my dishes</a>' +
            '<p style="margin:10px 0 0;color:#6f5d50;font-size:14px">Or open the website, tap "Already registered?" and enter this reference number with your email.</p></div>') +
        '<p style="color:#6b5a4e"><b>' + CONFIG.TEMPLE + '</b><br>' + CONFIG.ADDRESS + '<br>' + CONFIG.CONTACT_PHONE + '<br>' + CONFIG.CONTACT_EMAIL + '</p></div>',
      name: CONFIG.TEMPLE,
      replyTo: CONFIG.CONTACT_EMAIL,
    });
  } catch (err) { console.warn('email failed: ' + err); }
}

function esc_(s) {
  return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

/* ---------- Translation (free Google Translate inside Apps Script) ---------- */

function trGet_(key) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('tr' + key);
  if (hit) return JSON.parse(hit);
  const sh = sheet_(SHEETS.TR);
  const f = sh.getRange('A:A').createTextFinder(key).matchEntireCell(true).findNext();
  if (!f) return null;
  const json = sh.getRange(f.getRow(), 2).getValue();
  if (json.length < 90000) cache.put('tr' + key, json, 21600);
  return JSON.parse(json);
}

function trPut_(key, obj) {
  const json = JSON.stringify(obj);
  sheet_(SHEETS.TR).appendRow([key, json, new Date()]);
  if (json.length < 90000) CacheService.getScriptCache().put('tr' + key, json, 21600);
}

function gloss_(lines, lang, isIng) {
  if (lang !== 'en' && lang !== 'hi') return lines;
  return lines.map(function (l) {
    GLOSS.forEach(function (g) { if (!g.ing || isIng) l = l.replace(g.re, lang === 'hi' ? g.hi : g.en); });
    return l;
  });
}

function tLines_(lines, lang, from) {
  from = from || 'gu';
  if (!lines.length) return [];
  const out = LanguageApp.translate(lines.join('\n'), from, lang).split('\n')
    .map(function (s) { return s.trim(); }).filter(String);
  if (out.length === lines.length) return out;
  return lines.map(function (l) { return LanguageApp.translate(l, from, lang); });
}

const LANG_NAMES = { en: 'English', hi: 'Hindi (Devanagari)', gu: 'Gujarati', pa: 'Punjabi (Gurmukhi script)', mr: 'Marathi', ur: 'Urdu', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', ne: 'Nepali', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', tl: 'Filipino', ar: 'Arabic', 'zh-CN': 'Simplified Chinese', sw: 'Swahili' };

function isQuota_(e) { return /too many times|quota|rate limit|Service invoked/i.test(String(e && e.message || e)); }

function geminiModels_(key) {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('GEMINI_MODELS');
  if (saved) return JSON.parse(saved);
  const res = JSON.parse(UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(key)).getContentText());
  const names = (res.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name; });
  const list = ['models/gemini-2.5-flash', 'models/gemini-flash-latest', 'models/gemini-2.5-flash-lite', 'models/gemini-flash-lite-latest'].filter(function (n) { return names.indexOf(n) >= 0; });
  if (!list.length) throw new Error('No suitable Gemini model found.');
  props.setProperty('GEMINI_MODELS', JSON.stringify(list));
  return list;
}

/** Calls Gemini for JSON, trying each model in turn when one is busy (503/429/500). */
function gemini_(prompt, temperature) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('No Gemini key');
  let last = '';
  const models = geminiModels_(key);
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < models.length; i++) {
      const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/' + models[i] + ':generateContent?key=' + encodeURIComponent(key), {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: temperature || 0.2 } }),
      });
      const code = res.getResponseCode();
      if (code === 200) {
        const text = JSON.parse(res.getContentText()).candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
        return JSON.parse(text.replace(/^```(json)?|```$/g, '').trim());
      }
      last = 'Gemini ' + code + ' (' + models[i] + ')';
      if (code === 404 || code === 400) continue;
      if (code !== 503 && code !== 429 && code !== 500) break;
      Utilities.sleep(1500);
    }
    Utilities.sleep(4000);
  }
  throw new Error(last);
}

/** Translates a whole recipe in one Gemini call (used when Google Translate's daily limit is reached). */
function geminiRecipe_(src, lang, from) {
  const o = gemini_('Translate this Indian vegetarian temple recipe from ' + LANG_NAMES[from] + ' to ' + LANG_NAMES[lang] + '.\n' +
    'Rules: keep every number and measurement; keep the same number of items in "ing" and "steps"; translate naturally for home cooks. ' +
    'Gujarati cooking words: \u0AAE\u0AC7\u0A82\u0AA6\u0ACB (mendo) means maida, all-purpose flour (never eggs); \u0AAE\u0ACB\u0AA3 (mon) means moyan, fat rubbed into flour; \u0AAE\u0ABE\u0AB5\u0ACB means mawa/khoya; \u0A97\u0ACB\u0AB3 in ingredients means jaggery. ' +
    'Never add onion, garlic or hing. Also add "L": the translation of ["Ingredients","Method","Time","Serves","Note"].\n' +
    'Return JSON only: {"t":"","time":"","serves":"","ing":[],"steps":[],"note":"","L":[]}\n' + JSON.stringify(src));
  if (!o || !Array.isArray(o.ing) || !Array.isArray(o.steps)) throw new Error('Bad translation');
  if (!Array.isArray(o.L) || o.L.length !== LABELS_EN.length) o.L = LABELS_EN;
  return o;
}

function getRecipe(sn, lang) {
  sn = Number(sn);
  if (!LANGS.hasOwnProperty(lang) || (lang === 'gu' && sn < CUSTOM_START)) throw new Error('Unsupported language.');
  if (sn >= CUSTOM_START) return customRecipe_(sn, lang);
  const key = sn + ':' + lang + TR_VER;
  const have = trGet_(key);
  if (have) return have;
  let r;
  try {
  if (lang === 'en' || lang === 'hi') {
    const gu = guRecipe_(sn);
    if (!gu) throw new Error('Recipe not found.');
    const head = tLines_([gu.t, gu.time || '-', gu.serves || '-', gloss_([gu.note || '-'], lang, false)[0]], lang);
    r = {
      t: lang === 'en' ? ((dishMap_()[sn] || [])[1] || head[0]) : head[0], time: gu.time ? head[1] : '', serves: gu.serves ? head[2] : '', note: gu.note ? head[3] : '',
      ing: tLines_(gloss_(gu.ing, lang, true), lang), steps: tLines_(gloss_(gu.steps, lang, false), lang),
      L: lang === 'en' ? LABELS_EN : tLines_(LABELS_EN, lang, 'en'),
    };
  } else {
    const en = getRecipe(sn, 'en');
    const head = tLines_([en.t, en.time || '-', en.serves || '-', en.note || '-'], lang, 'en');
    r = {
      t: head[0], time: en.time ? head[1] : '', serves: en.serves ? head[2] : '', note: en.note ? head[3] : '',
      ing: tLines_(en.ing, lang, 'en'), steps: tLines_(en.steps, lang, 'en'), L: tLines_(LABELS_EN, lang, 'en'),
    };
  }
  } catch (e) {
    if (!isQuota_(e)) throw e;
    if (lang === 'en' || lang === 'hi') {
      const gu = guRecipe_(sn);
      r = geminiRecipe_({ t: gu.t, time: gu.time || '', serves: gu.serves || '', ing: gloss_(gu.ing, lang, true), steps: gloss_(gu.steps, lang, false), note: gu.note || '' }, lang, 'gu');
      if (lang === 'en') r.t = (dishMap_()[sn] || [])[1] || r.t;
    } else {
      r = geminiRecipe_(getRecipe(sn, 'en'), lang, 'en');
    }
  }
  if (!r.L || r.L.length !== LABELS_EN.length) r.L = LABELS_EN;
  trPut_(key, r);
  return r;
}

/** Run from the editor: lists English translations that mention non-vegetarian words. */
function auditTranslations() {
  const sh = sheet_(SHEETS.TR), n = sh.getLastRow() - 1;
  if (n < 1) return;
  sh.getRange(2, 1, n, 2).getValues().forEach(function (r) {
    if (String(r[0]).indexOf(':en' + TR_VER) > 0 && /\b(egg|eggs|meat|chicken|fish|beef|pork|mutton)\b/i.test(r[1])) console.log(r[0] + ' ' + r[1].slice(0, 200));
  });
}

function getNames(lang) {
  if (lang !== 'hi') throw new Error('Unsupported language.');
  const have = trGet_('names:hi');
  if (have) return have;
  const map = dishMap_();
  const sns = Object.keys(map);
  const out = {};
  for (let i = 0; i < sns.length; i += 80) {
    const part = sns.slice(i, i + 80);
    const tr = tLines_(part.map(function (n) { return map[n][0]; }), 'hi');
    part.forEach(function (n, j) { out[n] = tr[j]; });
  }
  trPut_('names:hi', out);
  return out;
}

/** Run once from the editor. Works for ~5 minutes per run and schedules itself until every recipe is translated. */
function pretranslateAll() {
  const start = Date.now();
  getNames('hi');
  const done = {};
  const sh = sheet_(SHEETS.TR);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { done[r[0]] = true; });
  const sns = Object.keys(dishMap_());
  let left = 0, quota = false;
  for (let i = 0; i < sns.length && !quota; i++) {
    for (const lang of ['en', 'hi']) {
      const key = sns[i] + ':' + lang + TR_VER;
      if (done[key]) continue;
      if (Date.now() - start > 280000) { left++; continue; }
      try { getRecipe(sns[i], lang); } catch (err) { console.warn(key + ' ' + err); if (isQuota_(err)) { quota = true; break; } }
    }
  }
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'pretranslateAll') ScriptApp.deleteTrigger(t);
  });
  if (quota) ScriptApp.newTrigger('pretranslateAll').timeBased().after(8 * 3600 * 1000).create();
  else if (left) ScriptApp.newTrigger('pretranslateAll').timeBased().after(60 * 1000).create();
  console.log(left ? left + ' left, continuing in 1 minute' : 'All recipes translated.');
}


/* ---------- Custom dishes (devotee's own offering) ---------- */

function cleanCustom_(list) {
  return (Array.isArray(list) ? list : []).slice(0, 3).map(function (c) {
    return {
      name: String((c && c.name) || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      notes: String((c && c.recipe) || '').trim().slice(0, 4000),
      photo: /^data:image\/(jpeg|png|webp);base64,/.test(String(c && c.photo)) && String(c.photo).length < 3000000 ? String(c.photo) : '',
    };
  }).filter(function (c) { return c.name.length >= 2; });
}

function customRows_() {
  const sh = sheet_(SHEETS.CUSTOM);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, CUSTOM_HEADERS.length).getValues().map(function (r, i) {
    return { row: i + 2, id: Number(r[0]), en: String(r[3]), gu: String(r[4]), photo: String(r[5]), recipeStatus: String(r[6]), recEn: String(r[7]), recGu: String(r[8]), notes: String(r[9]), status: String(r[11]) };
  }).filter(function (c) { return c.id && c.status === 'Active'; });
}

function getCustom() {
  return customRows_().map(function (c) { return [c.id, c.gu, c.en, c.photo, c.recipeStatus === 'Ready' ? 1 : 0]; });
}

function createCustom_(c, ref) {
  const sh = sheet_(SHEETS.CUSTOM);
  const last = sh.getLastRow();
  const id = Math.max(CUSTOM_START - 1, last > 1 ? Math.max.apply(null, sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return Number(r[0]) || 0; })) : 0) + 1;
  const isGu = /[\u0A80-\u0AFF]/.test(c.name);
  let en = c.name, gu = c.name;
  try {
    if (isGu) en = LanguageApp.translate(c.name, 'gu', 'en'); else gu = LanguageApp.translate(c.name, 'en', 'gu');
  } catch (e) {}
  en = en.replace(/\b\w/g, function (x) { return x.toUpperCase(); });
  let photo = '';
  if (c.photo) {
    try {
      const m = c.photo.match(/^data:(image\/\w+);base64,(.*)$/);
      const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'dish-' + id + '.' + m[1].split('/')[1]);
      const f = photoFolder_().createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photo = 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w800';
    } catch (e) { console.warn('photo upload failed: ' + e); }
  }
  sh.appendRow([id, new Date(), c.name, en, gu, photo, 'Pending', '', '', c.notes, ref, 'Active']);
  SpreadsheetApp.flush();
  return id;
}

function photoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PHOTO_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder('Annakut 2026 - devotee dish photos');
  props.setProperty('PHOTO_FOLDER', f.getId());
  return f;
}

function setCustomStatus_(id, status) {
  const sh = sheet_(SHEETS.CUSTOM);
  if (!sh || sh.getLastRow() < 2) return;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (Number(ids[i][0]) === Number(id)) sh.getRange(i + 2, 12).setValue(status);
}

function customRecipe_(sn, lang) {
  let c = customRows_().filter(function (x) { return x.id === sn; })[0];
  if (!c) throw new Error('Recipe not found.');
  if (c.recipeStatus !== 'Ready') { genCustomRecipe_(c); c = customRows_().filter(function (x) { return x.id === sn; })[0]; }
  if (c.recipeStatus !== 'Ready') throw new Error('PENDING');
  const en = JSON.parse(c.recEn);
  if (lang === 'en') return en;
  if (lang === 'gu') return JSON.parse(c.recGu);
  const key = sn + ':' + lang + TR_VER + c.recEn.length;
  const have = trGet_(key);
  if (have) return have;
  let r;
  try {
    const head = tLines_([en.t, en.time || '-', en.serves || '-', en.note || '-'], lang, 'en');
    r = { t: head[0], time: en.time ? head[1] : '', serves: en.serves ? head[2] : '', note: en.note ? head[3] : '',
      ing: tLines_(en.ing, lang, 'en'), steps: tLines_(en.steps, lang, 'en'), L: tLines_(LABELS_EN, lang, 'en') };
  } catch (e) { if (!isQuota_(e)) throw e; r = geminiRecipe_(en, lang, 'en'); }
  if (!r.L || r.L.length !== LABELS_EN.length) r.L = LABELS_EN;
  trPut_(key, r);
  return r;
}

/** Runs every 10 minutes: writes recipes for new devotee dishes. */
function fillCustomRecipes() {
  customRows_().filter(function (c) { return c.recipeStatus === 'Pending' || c.recipeStatus === 'Needs review'; }).slice(0, 5).forEach(genCustomRecipe_);
}

function geminiModel_(key) {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('GEMINI_MODEL2');
  if (saved) return saved;
  const res = JSON.parse(UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(key)).getContentText());
  const names = (res.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name; });
  const pick = ['models/gemini-flash-latest', 'models/gemini-2.5-flash'].filter(function (n) { return names.indexOf(n) >= 0; })[0] ||
    names.filter(function (n) { return /^models\/gemini-[\d.]+-flash$/.test(n); }).sort().reverse()[0];
  if (!pick) throw new Error('No suitable Gemini model found.');
  props.setProperty('GEMINI_MODEL2', pick);
  return pick;
}

function genCustomRecipe_(c) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) return;
  const sh = sheet_(SHEETS.CUSTOM);
  const prompt = 'You write recipes for the Annakut food offering at a Swaminarayan Hindu temple. The dish is offered to God, so these rules are absolute:\n' +
    '- NEVER use onion, garlic, hing (asafoetida), eggs, meat, fish, gelatin or alcohol. Replace them with allowed ingredients if the dish normally uses them.\n' +
    '- Ghee, oil, milk and water must be strained (filtered) before use; say so in the first step.\n' +
    '- Use Indian kitchen measures (grams, cups, teaspoons). Quantity for about 5 people.\n' +
    'Dish name: ' + c.en + (c.gu && c.gu !== c.en ? ' (' + c.gu + ')' : '') + '\n' +
    (c.notes ? 'The devotee wrote these notes or their own recipe. Follow it, but remove anything that breaks the rules:\n' + c.notes + '\n' : '') +
    'Reply with JSON only, in this exact shape: {"en":{"t":"dish name","time":"e.g. 30 minutes","serves":"e.g. 5 people","ing":["ingredient - quantity"],"steps":["step"],"note":"short tip"},"gu":{same fields, written in Gujarati script}}';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = gemini_(prompt + (attempt ? '\nYour previous answer broke the rules. Check every ingredient again.' : ''), 0.4);
      const en = out.en, gu = out.gu;
      if (!en || !gu || !Array.isArray(en.ing) || !Array.isArray(en.steps) || !en.steps.length) continue;
      if (BANNED.test(JSON.stringify(en.ing) + JSON.stringify(gu.ing))) { console.warn('banned ingredient in recipe for ' + c.id); continue; }
      en.t = c.en; gu.t = c.gu;
      sh.getRange(c.row, 7, 1, 3).setValues([['Ready', JSON.stringify(en), JSON.stringify(gu)]]);
      return;
    } catch (e) { console.warn('recipe generation failed for ' + c.id + ': ' + e); }
  }
  sh.getRange(c.row, 7).setValue('Needs review');
}

/* ---------- WhatsApp queue (the sender on the temple Mac polls this) ---------- */

function waDue_(now) {
  const d = new Date(now.getTime() + (2 + Math.random() * 6) * 3600000);
  const h = Number(Utilities.formatDate(d, CONFIG.TIMEZONE, 'H'));
  if (h >= 20) d.setTime(d.getTime() + (24 - h + 9) * 3600000 + Math.random() * 3600000);
  else if (h < 9) d.setTime(d.getTime() + (9 - h) * 3600000 + Math.random() * 3600000);
  return d;
}

function pinOk_(pin) {
  const p = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  if (!p || String(pin) !== p) throw new Error('Not allowed.');
}

function waNumber_(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '1' + d;
  return d.length >= 11 && d.length <= 15 ? d : '';
}

function adminWaQueue(pin) {
  pinOk_(pin);
  const sh = sheet_(SHEETS.BOOK), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const now = Date.now(), dishes = dishMap_(), by = {};
  sh.getRange(2, 1, n, BOOK_HEADERS.length).getValues().forEach(function (r) {
    const ref = String(r[1]), wa = String(r[9]), due = r[10] instanceof Date ? r[10].getTime() : 0;
    if (!/^(Pending|Retry|Sent)/.test(wa)) return;
    if (/^Sent/.test(wa) && now - new Date(r[0]).getTime() > 2 * 86400000) return;
    const b = by[ref] || (by[ref] = { ref: ref, name: String(r[5]), first: String(r[5]).split(' ')[0], phone: waNumber_(String(r[6])), wa: wa, due: due, dishes: [] });
    if (String(r[8]).toLowerCase() === 'confirmed') b.dishes.push([Number(r[2]), dishes[r[2]] ? dishes[r[2]][1] : String(r[3]), dishes[r[2]] ? dishes[r[2]][0] : String(r[4])]);
  });
  return Object.keys(by).map(function (k) { return by[k]; }).filter(function (b) {
    return b.phone && b.dishes.length && (/^Sent/.test(b.wa) || b.due <= now);
  }).map(function (b) { b.link = manageUrl_(b.ref); b.site = CONFIG.SITE_URL; return b; });
}

function adminWaMark(pin, ref, status) {
  pinOk_(pin);
  status = String(status).slice(0, 60) + ' ' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'MMM d h:mm a');
  rowsFor_(String(ref).toUpperCase()).forEach(function (r) { sheet_(SHEETS.BOOK).getRange(r.row, WA_COL).setValue(status); });
  return true;
}
