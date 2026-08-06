/* Drive the whole platform as a user, under the real production headers.
   Run: node tests/drive.mjs

   e2e.mjs is precise about the behaviours someone thought to be precise
   about — that the CASK figure comes out right, that focus moves to the
   first blank required field. It cannot notice that a page nobody wrote
   a test for throws on load, or that filling a particular combination of
   fields on a tool raises a TypeError from a branch only that
   combination reaches.

   This is the complement: breadth to e2e's depth. It asserts nothing
   about what any page should say. It demands only that driving it
   produces no console error, no uncaught exception, no failed request,
   no 4xx, and a page with text on it.

   Served with the headers from _headers applied, so the sweep runs
   under the same Content-Security-Policy production enforces. A script
   the policy blocks raises a console error here and gets caught; served
   without headers it would run fine and the sweep would prove nothing
   about the shipped configuration.

   Buttons whose text suggests destruction or a print dialog are left
   alone: clicking "Clear" in a loop is a test that erases what it is
   testing, and a print dialog blocks the run forever. */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  for (const id of ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(id); } catch { /* next */ }
  }
  throw new Error('Playwright not found. Run npm install in tests/.');
})();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4953;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

/* The "/*" block out of _headers, read as committed. Deliberately narrow
   rather than a parser library: the point is to serve exactly what ships
   for that path, and a shape this cannot read is worth failing on rather
   than silently skipping. */
const headerText = await readFile(join(ROOT, '_headers'), 'utf8');
const HEADERS = {};
let inGlobal = false;
for (const raw of headerText.split('\n')) {
  const line = raw.replace(/\s+$/, '');
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) { inGlobal = line.trim() === '/*'; continue; }
  if (!inGlobal) continue;
  const m = line.match(/^\s+([A-Za-z0-9-]+):\s*(.*)$/);
  if (m) HEADERS[m[1]] = m[2];
}
if (!HEADERS['Content-Security-Policy']) {
  console.log('❌  no Content-Security-Policy found in _headers — the sweep would not be under the real policy');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  let filePath = join(ROOT, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403, HEADERS); return res.end('no'); }
  if (!extname(filePath)) filePath = join(filePath, 'index.html');
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { ...HEADERS, 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, HEADERS); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const EXECS = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/opt/pw-browsers/chromium'
];
const executablePath = EXECS.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const problems = [];
let errs = [];
let driven = 0;
let interactions = 0;

page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 140)));
page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('favicon')) errs.push('reqfail: ' + u.slice(0, 100)); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(`http ${r.status()}: ${r.url().slice(0, 90)}`); });

const step = async (label, url, fn) => {
  errs = [];
  await page.goto(BASE + url, { waitUntil: 'networkidle' }).catch((e) => errs.push('nav: ' + e.message.slice(0, 80)));
  await page.waitForTimeout(250);
  let note = '';
  try { note = (await fn?.(page)) || ''; } catch (e) { errs.push('drive: ' + String(e.message).slice(0, 120)); }

  /* A page that throws mid-render still returns 200 with a shell, and
     every other signal above would call that clean. */
  const visible = await page.evaluate(() => (document.body ? document.body.innerText.trim().length : 0));
  if (visible < 80) errs.push(`renders almost no text (${visible} chars)`);

  driven++;
  const status = errs.length ? 'FAIL' : 'ok';
  console.log(`${status.padEnd(4)} ${label.padEnd(36)} ${note}${errs.length ? '  << ' + errs.slice(0, 3).join(' | ') : ''}`);
  if (errs.length) problems.push({ label, errs: [...errs] });
};

console.log('\n=== Pages ===');
for (const f of (await readdir(ROOT)).filter((f) => f.endsWith('.html')).sort()) {
  await step(f, '/' + f);
}

console.log('\n=== The diagnostic, answered end to end ===');
await step('diagnostic: answer every question', '/diagnostic.html', async (p) => {
  const sels = await p.$$('select');
  for (const s of sels) await s.selectOption({ index: 2 }).catch(() => {});
  await p.waitForTimeout(400);
  interactions += sels.length;
  return `${sels.length} selects answered`;
});

console.log('\n=== Tools, driven ===');
for (const t of (await readdir(join(ROOT, 'tools'))).filter((f) => f.endsWith('.html')).sort()) {
  await step('tools/' + t, '/tools/' + t, async (p) => {
    const nums = await p.$$('input[type=number]');
    for (const i of nums) await i.fill('12').catch(() => {});
    const texts = await p.$$('input[type=text]:not([name=name]):not([name=email])');
    for (const i of texts.slice(0, 6)) await i.fill('Test').catch(() => {});
    const sels = await p.$$('select');
    for (const s of sels) await s.selectOption({ index: 1 }).catch(() => {});
    const boxes = await p.$$('input[type=checkbox]');
    for (const b of boxes.slice(0, 8)) await b.check().catch(() => {});
    await p.waitForTimeout(500);

    let clicked = 0;
    for (const b of (await p.$$('button:not([type=submit])')).slice(0, 6)) {
      const txt = ((await b.textContent()) || '').toLowerCase();
      if (/reset|clear|erase|delete|print|pdf/.test(txt)) continue;
      p.once('dialog', (d) => d.dismiss().catch(() => {}));
      await b.click({ timeout: 1500 }).catch(() => {});
      clicked++;
    }
    await p.waitForTimeout(400);
    interactions += nums.length + sels.length + boxes.length + clicked;
    return `${nums.length}num ${sels.length}sel ${boxes.length}chk ${clicked}clicks`;
  });
}

await browser.close();
server.close();

console.log(`\n${'─'.repeat(52)}`);
if (problems.length) {
  for (const p of problems) console.log(`  ${p.label}\n    ${p.errs.join('\n    ')}`);
  console.log(`❌  ${problems.length} of ${driven} page runs had problems`);
  process.exit(1);
}
/* Guard the denominator: if the server started returning 404 for
   everything there would be nothing to drive, and a silent clean sweep
   is exactly what that failure would look like.

   The floors sit below the real figures (29 runs — 16 root pages, the
   diagnostic, and 12 tools — across 176 interactions) with enough room
   that adding or retiring one page does not trip them, but not so much
   that a collapse would slip through. */
if (driven < 25 || interactions < 120) {
  console.log(`❌  too little was actually driven (${driven} runs, ${interactions} interactions) — the sweep is not proving anything`);
  process.exit(1);
}
console.log(`✅  ${driven} page runs clean under the production headers, ${interactions} interactions, no errors`);
