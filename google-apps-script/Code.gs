/**
 * GfxPrints - order intake (Google Apps Script web app)
 * Saves each order's details to a Google Sheet and its print files to a Google Drive folder,
 * and emails you the new order (and, if they typed an email, a confirmation to the customer).
 *
 * IMPORTANT: the ORDER_TOKEN is sent from public website code, so anyone can read it. It only
 * stops casual misuse. The real protection is everything below: strict size / type / length
 * limits, a rate limit, a lock, and never trusting anything the browser sends.
 *
 * Setup: see SETUP-GUIDE.md. Run setup() ONCE from the editor, then deploy as a Web app
 * (Execute as: Me, Who has access: Anyone).
 */

var LIMITS = {
  maxBodyChars: 45 * 1000 * 1000,      // whole request (base64 text). The site only sends up to ~30 MB.
  maxItems: 20,
  maxFilesPerItem: 6,
  maxFileBytes: 20 * 1024 * 1024,      // one decoded file
  maxTotalBytes: 25 * 1024 * 1024,     // all files in one order, decoded
  maxOrdersPerHour: 30,                // whole site, per hour
  maxOrdersPerContactPerHour: 3,       // same phone/email, per hour
  field: 200, address: 400, label: 80
};
var ALLOWED_MIME = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'application/pdf': 'pdf'
};

/* ---------- Order emails ---------- */
var MAIL = {
  ownerEmail: 'gfxprints.com@gmail.com',  // this inbox gets a "New order" email for every order. Change it here any time.
  notifyOwner: true,
  confirmCustomer: true,                  // also send the customer a "we received your order" email (only if they typed one)
  fromName: 'GfxPrints',
  whatsapp: '+92 322 2920135',            // shown to the customer in their email
  keepForOwner: 20                        // never use the last N emails of the daily Google quota on customers
};

/* ---------- One-time setup. Prints the new token in the Logs: paste it into js/main.js ---------- */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var token = Utilities.getUuid().replace(/-/g, '');
  props.setProperty('ORDER_TOKEN', token);
  var folder = DriveApp.createFolder('GfxPrints Orders');
  props.setProperty('FOLDER_ID', folder.getId());
  var ss = SpreadsheetApp.create('GfxPrints Orders');
  props.setProperty('SHEET_ID', ss.getId());
  ss.getSheets()[0].setName('Orders').appendRow(
    ['Received', 'Order ref', 'Name', 'Phone', 'Email', 'Address', 'City', 'Postal', 'Country',
     'Payment', 'Subtotal', 'Shipping', 'Total', 'Items', 'Files folder']);
  Logger.log('ORDER_TOKEN = ' + token);
  Logger.log('Sheet: ' + ss.getUrl());
  Logger.log('Folder: ' + folder.getUrl());
}

/* ---------- Rotate the token any time (old token stops working at once). Re-deploy not needed. ---------- */
function rotateToken() {
  var token = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('ORDER_TOKEN', token);
  Logger.log('NEW ORDER_TOKEN = ' + token + '  (paste it into js/main.js, then publish the site)');
}

// Open the web app address in a browser: it shows which version of this script is live.
function doGet() { return json_({ ok: true, service: 'GfxPrints orders', build: 'order-emails-2026-10-22' }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'Empty request' });
    var raw = e.postData.contents;
    if (raw.length > LIMITS.maxBodyChars) return json_({ ok: false, error: 'Too large' });

    var data;
    try { data = JSON.parse(raw); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
    var props = PropertiesService.getScriptProperties();
    if (!safeEqual_(String(data.token || ''), String(props.getProperty('ORDER_TOKEN') || '')))
      return json_({ ok: false, error: 'Not allowed' });

    // ---- validate and clean everything before touching Drive or the Sheet ----
    var ref = clean_(data.ref, 40).replace(/[^A-Za-z0-9_-]/g, '');
    if (!ref) return json_({ ok: false, error: 'Missing order reference' });
    var c = data.contact || {};
    var contact = {
      name: clean_(c.name, LIMITS.field), email: clean_(c.email, LIMITS.field), phone: clean_(c.phone, 40),
      address: clean_(c.address, LIMITS.address), city: clean_(c.city, LIMITS.field),
      postal: clean_(c.postal, 20), country: clean_(c.country, LIMITS.field)
    };
    if (!contact.name || !(contact.phone || contact.email)) return json_({ ok: false, error: 'Missing contact details' });
    if (contact.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return json_({ ok: false, error: 'Bad email' });

    var items = Array.isArray(data.items) ? data.items : [];
    if (!items.length || items.length > LIMITS.maxItems) return json_({ ok: false, error: 'Bad items' });

    var totalBytes = 0, cleanItems = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var files = Array.isArray(it.files) ? it.files : [];
      if (files.length > LIMITS.maxFilesPerItem) return json_({ ok: false, error: 'Too many files' });
      var cleanFiles = [];
      for (var j = 0; j < files.length; j++) {
        var f = files[j] || {};
        var mime = String(f.mime || '').toLowerCase();
        if (!ALLOWED_MIME[mime]) return json_({ ok: false, error: 'File type not allowed' });
        var b64 = String(f.data || '');
        if (!/^[A-Za-z0-9+\/]+={0,2}$/.test(b64.slice(0, 200))) return json_({ ok: false, error: 'Bad file' });
        var bytes = Math.floor(b64.length * 3 / 4);
        if (bytes > LIMITS.maxFileBytes) return json_({ ok: false, error: 'File too large' });
        totalBytes += bytes;
        if (totalBytes > LIMITS.maxTotalBytes) return json_({ ok: false, error: 'Order too large' });
        cleanFiles.push({ label: clean_(f.label, LIMITS.label), mime: mime, b64: b64,
                          name: safeName_(f.name, ALLOWED_MIME[mime]) });
      }
      cleanItems.push({
        name: clean_(it.name, LIMITS.field), qty: num_(it.qty, 1, 1000), price: num_(it.price, 0, 1e7),
        color: clean_(it.color, 40), size: clean_(it.size, 40), orientation: clean_(it.orientation, 20),
        packaging: clean_(it.packaging, 60), files: cleanFiles
      });
    }

    lock.waitLock(20000);

    // ---- rate limits (one store for the whole site, one per phone/email) ----
    var cache = CacheService.getScriptCache();
    if (!hit_(cache, 'site', LIMITS.maxOrdersPerHour)) return json_({ ok: false, error: 'Busy, please use WhatsApp' });
    var who = (contact.phone || contact.email).toLowerCase().replace(/[^a-z0-9@.]/g, '');
    if (!hit_(cache, 'c:' + who, LIMITS.maxOrdersPerContactPerHour)) return json_({ ok: false, error: 'Too many orders' });

    // ---- save files, then the Sheet row ----
    var root = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    var folder = root.createFolder(ref + ' - ' + contact.name.slice(0, 40));
    var count = 0;
    cleanItems.forEach(function (it, idx) {
      it.files.forEach(function (f) {
        var blob = Utilities.newBlob(Utilities.base64Decode(f.b64), f.mime, (idx + 1) + '-' + f.name);
        folder.createFile(blob);
        count++;
      });
    });
    var itemsText = cleanItems.map(function (it) {
      return it.qty + ' x ' + it.name + [it.color, it.size, it.orientation, it.packaging].filter(String).map(function (s) { return ' [' + s + ']'; }).join('');
    }).join('\n');
    var ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('Orders');
    ss.appendRow([new Date(), ref, contact.name, contact.phone, contact.email, contact.address, contact.city,
      contact.postal, contact.country, clean_(data.payment, 80), num_(data.subtotal, 0, 1e8), num_(data.shipping, 0, 1e8),
      num_(data.total, 0, 1e8), itemsText, folder.getUrl()].map(sheetSafe_));

    // ---- emails (never allowed to stop the order from being saved) ----
    var order = { ref: ref, contact: contact, itemsText: itemsText, payment: clean_(data.payment, 80),
      subtotal: num_(data.subtotal, 0, 1e8), shipping: num_(data.shipping, 0, 1e8), total: num_(data.total, 0, 1e8),
      folderUrl: folder.getUrl(), files: count };
    var emailed = sendOrderEmails_(order);
    try {                                   // write what happened in the last Sheet column, so a failure is easy to see
      if (!ss.getRange(1, 16).getValue()) ss.getRange(1, 16).setValue('Email status');
      ss.getRange(ss.getLastRow(), 16).setValue(emailed.status);
    } catch (err2) { console.error('Could not write email status', err2); }
    return json_({ ok: true, folderUrl: folder.getUrl(), files: count, emailed: { owner: emailed.owner, customer: emailed.customer } });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
function num_(v, min, max) { var n = Number(v); return isFinite(n) ? Math.min(Math.max(n, min), max) : min; }
function safeName_(name, ext) {
  var base = String(name || 'file').replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 80) || 'file';
  return base + '.' + ext;                               // the extension always comes from the checked MIME type
}
// Stops "=HYPERLINK(...)" style formulas from running when the Sheet is opened
function sheetSafe_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function safeEqual_(a, b) {
  if (!b || a.length !== b.length) return false;
  var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// Counts hits per key in the current hour. Returns false once the limit is reached.
function hit_(cache, key, limit) {
  var k = 'rl:' + key.slice(0, 80) + ':' + Math.floor(Date.now() / 3600000);
  var n = Number(cache.get(k) || 0);
  if (n >= limit) return false;
  cache.put(k, String(n + 1), 3700);
  return true;
}

/* ---------- emails ---------- */
// Run this once from the editor (select testEmail, press Run, press Allow). It sends a test email to MAIL.ownerEmail.
function testEmail() {
  MailApp.sendEmail({
    to: MAIL.ownerEmail, name: MAIL.fromName, subject: 'GfxPrints test email',
    body: 'This is a test. If you can read this, order emails are working.\n\nEmails left today: ' + MailApp.getRemainingDailyQuota()
  });
  Logger.log('Test email sent to ' + MAIL.ownerEmail + '. Emails left today: ' + MailApp.getRemainingDailyQuota());
}

function errText_(err) { return String(err && err.message ? err.message : err).slice(0, 160); }
function money_(n) { return 'Rs. ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function esc_(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function sendOrderEmails_(o) {
  var sent = { owner: false, customer: false, status: '' };
  var notes = [];
  var c = o.contact;
  var totals = 'Subtotal: ' + money_(o.subtotal) + '\nShipping: ' + money_(o.shipping) + '\nTotal: ' + money_(o.total);

  if (MAIL.notifyOwner && MAIL.ownerEmail) {
    try {
      var body = 'New order ' + o.ref + '\n\n' +
        'CUSTOMER\nName: ' + c.name + '\nPhone: ' + (c.phone || '-') + '\nEmail: ' + (c.email || '-') + '\n' +
        'Address: ' + [c.address, c.city, c.postal, c.country].filter(String).join(', ') + '\n\n' +
        'ITEMS\n' + o.itemsText + '\n\n' +
        'Payment: ' + (o.payment || '-') + '\n' + totals + '\n\n' +
        'Print files (' + o.files + '): ' + o.folderUrl + '\n';
      var opts = { to: MAIL.ownerEmail, name: MAIL.fromName, subject: 'New order ' + o.ref + ' - ' + c.name + ' - ' + money_(o.total), body: body };
      if (c.email) opts.replyTo = c.email;
      MailApp.sendEmail(opts);
      sent.owner = true;
      notes.push('owner: sent');
    } catch (err) { console.error('Owner email failed', err); notes.push('owner: ERROR ' + errText_(err)); }
  } else { notes.push('owner: off'); }

  if (MAIL.confirmCustomer && c.email) {
    try {
      if (MailApp.getRemainingDailyQuota() > MAIL.keepForOwner) {
        var lines = o.itemsText.split('\n');
        var text = 'Hi ' + c.name + ',\n\nThank you for your order. We have received it.\n\n' +
          'Order reference: ' + o.ref + '\n\nITEMS\n' + o.itemsText + '\n\n' + totals + '\nPayment: ' + (o.payment || '-') + '\n\n' +
          'We will confirm the total, delivery and payment with you on WhatsApp shortly (' + MAIL.whatsapp + ').\n' +
          'If anything looks wrong, just reply to this email.\n\n' + MAIL.fromName;
        var html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#15171b;max-width:520px">' +
          '<p>Hi ' + esc_(c.name) + ',</p><p>Thank you for your order. We have received it.</p>' +
          '<p><strong>Order reference: ' + esc_(o.ref) + '</strong></p>' +
          '<ul style="padding-left:18px">' + lines.map(function (l) { return '<li>' + esc_(l) + '</li>'; }).join('') + '</ul>' +
          '<p>Subtotal: ' + money_(o.subtotal) + '<br>Shipping: ' + money_(o.shipping) + '<br><strong>Total: ' + money_(o.total) + '</strong><br>Payment: ' + esc_(o.payment || '-') + '</p>' +
          '<p>We will confirm the total, delivery and payment with you on WhatsApp shortly (' + esc_(MAIL.whatsapp) + '). If anything looks wrong, just reply to this email.</p>' +
          '<p>' + esc_(MAIL.fromName) + '</p></div>';
        MailApp.sendEmail({ to: c.email, name: MAIL.fromName, replyTo: MAIL.ownerEmail, subject: 'We received your order ' + o.ref, body: text, htmlBody: html });
        sent.customer = true;
        notes.push('customer: sent');
      } else { notes.push('customer: skipped (daily email limit)'); }
    } catch (err) { console.error('Customer email failed', err); notes.push('customer: ERROR ' + errText_(err)); }
  } else { notes.push(c.email ? 'customer: off' : 'customer: no email given'); }
  sent.status = notes.join(' | ');
  return sent;
}
