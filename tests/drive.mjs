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
import { record } from './verification.mjs';
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

  const text = await page.evaluate(() => (document.body ? document.body.innerText : ''));
  for (const [re, what] of LEAKS) if (re.test(text)) errs.push(what);

  driven++;
  const status = errs.length ? 'FAIL' : 'ok';
  console.log(`${status.padEnd(4)} ${label.padEnd(36)} ${note}${errs.length ? '  << ' + errs.slice(0, 3).join(' | ') : ''}`);
  if (errs.length) problems.push({ label, errs: [...errs] });
};

/* Drive every control on the page, in rounds.

   Two things went wrong in the first version of this and both hid real
   defects. It took its handle lists up front, so the first control that
   caused a re-render detached every handle after it and each later
   action threw into a swallowed catch — the sweep reported a clean page
   having touched one control in twenty. And it took the inventory once,
   so anything behind an expander was never reached at all.

   So: re-resolve before every action, and keep going in rounds until a
   round reveals no new controls. Round one opens the expanders; round
   two drives what they revealed. */
let sampled = 0;
const driveEverything = async (p, rounds = 2) => {
  let n = 0, seen = -1;
  const BTN = 'button:not([type=submit]), summary, [role=tab]';
  const INP = 'input:not([type=hidden]):not([type=file])';

  /* Visibility for a whole selector in one evaluation rather than one
     round-trip per control. Asking the browser 1,200 separate times is
     most of what this sweep costs. */
  const visibleFlags = (sel) =>
    p.locator(sel).evaluateAll((els) => els.map((e) => !!(e.offsetParent || e.getClientRects().length)))
      .catch(() => []);

  const act = async (sel, i, fn) => {
    try {
      p.once('dialog', (d) => d.dismiss().catch(() => {}));
      await fn(p.locator(sel).nth(i));
      n++;
      await p.waitForTimeout(8);
    } catch { /* an undrivable control is not a failure; a throwing page is */ }
  };

  for (let round = 0; round < rounds; round++) {
    /* Counted once per round, not in the loop condition. Re-resolving a
       locator count on every iteration is what took this from seconds to
       twenty minutes. */
    const nBtn = await p.locator(BTN).count();
    const nSel = await p.locator('select').count();
    const nInp = await p.locator(INP).count();
    const total = nBtn + nSel + nInp;
    if (total === seen) break;
    seen = total;

    const btnVis = await visibleFlags(BTN);
    const btnText = await p.locator(BTN).evaluateAll((els) => els.map((e) => (e.textContent || '').toLowerCase())).catch(() => []);
    for (let i = 0; i < nBtn; i++) {
      if (!btnVis[i]) continue;
      if (/reset|clear|erase|delete|remove|print|pdf|download|export/.test(btnText[i] || '')) continue;
      await act(BTN, i, (el) => el.click({ timeout: 1500 }));
    }

    /* Every option where a select is small enough to sweep, and first,
       middle and last where it is not. The long ones here are lists of
       aircraft types and training modules, where the branch under test is
       the same for every entry; the short ones are mode switches, where
       each option is a different branch. What gets sampled rather than
       swept is counted and reported, not left silent. */
    const selVis = await visibleFlags('select');
    const selOpts = await p.locator('select').evaluateAll((els) => els.map((e) => [...e.options].map((o) => o.value))).catch(() => []);
    for (let i = 0; i < nSel; i++) {
      if (!selVis[i]) continue;
      const opts = selOpts[i] || [];
      let take = opts;
      if (opts.length > 6) {
        take = [opts[0], opts[Math.floor(opts.length / 2)], opts[opts.length - 1]];
        sampled += opts.length - take.length;
      }
      for (const v of take) await act('select', i, (el) => el.selectOption(v, { timeout: 1500 }));
    }

    const inpVis = await visibleFlags(INP);
    const inpMeta = await p.locator(INP).evaluateAll((els) => els.map((e) => [e.type, +e.min || 0, +e.max || 100])).catch(() => []);
    for (let i = 0; i < nInp; i++) {
      if (!inpVis[i]) continue;
      const type = (inpMeta[i] || [])[0] || '';
      if (type === 'checkbox' || type === 'radio') {
        await act(INP, i, (el) => el.click({ force: true, timeout: 1500 }));
      } else if (type === 'range') {
        const [, mn, mx] = inpMeta[i];
        for (const v of [mn, Math.round((mn + mx) / 2), mx]) {
          await act(INP, i, (el) => el.evaluate((e, v) => {
            e.value = v;
            e.dispatchEvent(new Event('input', { bubbles: true }));
            e.dispatchEvent(new Event('change', { bubbles: true }));
          }, v));
        }
      } else if (type === 'number') {
        /* Zero and empty are the two a division guard forgets. */
        for (const v of ['12', '0', '']) {
          await act(INP, i, async (el) => { await el.fill(v); await el.dispatchEvent('input'); await el.dispatchEvent('change'); });
        }
      } else if (type === 'date') {
        await act(INP, i, async (el) => { await el.fill('2028-06-01'); await el.dispatchEvent('input'); await el.dispatchEvent('change'); });
      } else {
        await act(INP, i, async (el) => { await el.fill('Test'); await el.dispatchEvent('input'); });
      }
    }
    await p.waitForTimeout(120);
  }
  return n;
};

/* What a broken render looks like once it has been driven. None of these
   raise anything — the page stays up and shows the reader a number that
   is not a number. A negative premium reading "USD -45.0M" would pass
   every one of them, which is the limit of what a sweep can prove. */
const LEAKS = [
  [/\bundefined\b/, 'the word "undefined" in visible text'],
  [/\bNaN\b/, 'the word "NaN" in visible text'],
  [/\[object Object\]/, '[object Object] in visible text'],
  [/Invalid Date/, 'Invalid Date in visible text'],
  [/\$\{/, 'an unresolved template literal']
];

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
    const n = await driveEverything(p);
    interactions += n;
    return `${n} controls driven`;
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

   The floors sit below the real figures (34 runs across ~1,240
   interactions) with enough room that adding or retiring one page does
   not trip them, but not so much that a collapse would slip through.

   The interaction floor is deliberately high now. The old one was 120,
   which the sweep cleared while touching a fraction of the controls on
   each page — the handle-staleness bug meant most actions after the
   first re-render threw and were swallowed, and a floor that low could
   not tell the difference. */
const tooLittle = driven < 30 || interactions < 900;
record('drive', { passed: !tooLittle, runs: driven, interactions,
  headline: `${driven} pages driven as a user would, ${interactions} interactions, no console errors` });
if (tooLittle) {
  console.log(`❌  too little was actually driven (${driven} runs, ${interactions} interactions) — the sweep is not proving anything`);
  process.exit(1);
}
if (sampled) console.log(`     ${sampled} long-select options sampled rather than swept (selects over 6 options take first, middle and last)`);
console.log(`✅  ${driven} page runs clean under the production headers, ${interactions} interactions, no errors`);
