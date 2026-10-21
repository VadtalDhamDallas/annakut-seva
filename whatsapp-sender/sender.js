// Annakut Seva 2026: sends each registration a personal WhatsApp confirmation a few hours after
// they register, then checks the delivery ticks. Run by launchd every 30 minutes (see annakut.plist).
// Settings live in config.json (see config.example.json).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const stopFile = path.join(__dirname, 'stop.json');
const stopped = new Set(fs.existsSync(stopFile) ? JSON.parse(fs.readFileSync(stopFile, 'utf8')) : []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function api(fn, args) {
  const r = await fetch(cfg.api, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ fn, args }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.data;
}

function message(b) {
  const list = b.dishes.map(d => `• #${d[0]} ${d[1]}${d[2] && d[2] !== d[1] ? ` (${d[2]})` : ''}`).join('\n');
  return [
    `Jay Swaminarayan ${b.first} 🙏🏻`,
    '',
    `Thank you for your Annakut seva at ${cfg.templeShort}.`,
    `Annakut Utsav: *${cfg.eventDate}*`,
    'Your dishes:',
    list,
    '',
    `Reference number: *${b.ref}*`,
    `To change your dishes or see the recipes: ${b.link}`,
    '',
    '🪔 Please remember: no onion, garlic or hing in any dish. Strain all ghee, oil, milk and water before use.',
    'કોઈ પણ વાનગીમાં ડુંગળી, લસણ અને હિંગનો ઉપયોગ ન કરવો. ઘી, તેલ, દૂધ, પાણી ગાળીને વાપરવું.',
    '',
    cfg.templeName,
    '(Reply STOP if you do not want WhatsApp messages from us.)',
  ].join('\n');
}

async function lastTick(page) {
  // WhatsApp Web labels the status of your own messages "Sent", "Delivered" or "Read".
  try {
    await page.waitForTimeout(1500);
    return await page.evaluate(() => {
      const mine = [...document.querySelectorAll('#main [role="row"]')].filter(r => r.querySelector('[aria-label="You:"]'));
      const last = mine[mine.length - 1];
      if (!last) return '';
      const el = [...last.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label').trim()).find(l => /^(Pending|Sent|Delivered|Read)$/.test(l));
      return el || '';
    });
  } catch { return ''; }
}

async function openChat(page, phone) {
  await page.goto(`https://web.whatsapp.com/send?phone=${phone}`);
  const box = page.locator('footer div[contenteditable="true"]');
  const invalid = page.getByText(/url is invalid|isn.t on WhatsApp|not on WhatsApp/i);
  return Promise.race([
    box.first().waitFor({ timeout: 45000 }).then(() => box.first(), () => null),
    invalid.first().waitFor({ timeout: 45000 }).then(() => null, () => null),
  ]).catch(() => null);
}

(async () => {
  const hour = Number(new Date().toLocaleString('en-CA', { timeZone: cfg.timezone || 'America/Chicago', hour: 'numeric', hour12: false }));
  if (hour < 9 || hour >= 20) return log('Outside 9am-8pm local time, nothing to do.');
  const queue = (await api('adminWaQueue', [cfg.pin])).filter(b => !stopped.has(b.phone));
  if (!queue.length) return log('Nothing due.');
  log(`${queue.length} due`);
  const ctx = await chromium.launchPersistentContext(path.join(__dirname, 'profile'), { headless: false, viewport: { width: 1280, height: 860 } });
  const page = ctx.pages()[0] || await ctx.newPage();
  try {
    await page.goto('https://web.whatsapp.com/');
    await page.waitForSelector('#pane-side', { timeout: 5 * 60 * 1000 });
    for (const b of queue) {
      const tag = `${b.ref} ${b.first} ${b.phone}`;
      try {
        const box = await openChat(page, b.phone);
        if (!box) { await api('adminWaMark', [cfg.pin, b.ref, 'Not on WhatsApp']); log(tag, 'not on WhatsApp'); continue; }
        if (/^Sent/.test(b.wa)) {
          const t = await lastTick(page);
          if (t === 'Delivered' || t === 'Read') { await api('adminWaMark', [cfg.pin, b.ref, t]); log(tag, 'now ' + t); }
          continue;
        }
        await box.click();
        const lines = message(b).split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i]) await page.keyboard.insertText(lines[i]);
          if (i < lines.length - 1) await page.keyboard.press('Shift+Enter');
        }
        await sleep(4000);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !document.querySelector('footer div[contenteditable="true"]')?.innerText.trim(), null, { timeout: 30000 });
        let t = '';
        for (let i = 0; i < 6 && !/Delivered|Read/.test(t); i++) { await sleep(5000); t = await lastTick(page); }
        const status = /Delivered|Read/.test(t) ? t : t === 'Sent' ? 'Sent' : 'Sent (unconfirmed)';
        await api('adminWaMark', [cfg.pin, b.ref, status]);
        log(tag, status);
      } catch (e) {
        const n = (String(b.wa).match(/Retry (\d)/) || [0, 0])[1];
        await api('adminWaMark', [cfg.pin, b.ref, Number(n) >= 2 ? 'Failed (email was sent)' : `Retry ${Number(n) + 1}`]).catch(() => {});
        log(tag, 'ERROR', String(e.message).split('\n')[0]);
      }
      await sleep(20000 + Math.random() * 20000);
    }
  } finally {
    await ctx.close();
  }
})().catch(e => { log('FATAL', e.message); process.exit(1); });
