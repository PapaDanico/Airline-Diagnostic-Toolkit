/* What happens when the browser refuses to save.
   Run: node tests/storage.mjs

   Every storage call on this site is wrapped in a try/catch, which is
   right: Safari private browsing throws a SecurityError on localStorage
   access itself, and one unguarded call at the top of a script kills
   every feature wired below it. But the same reflex was applied to reads
   and writes alike, and they are not alike.

   A failed READ is a non-event. There was nothing stored; the caller
   takes the empty default; the visitor gets the first-visit experience,
   which is a real and supported experience. Silence is correct.

   A failed WRITE loses work. Forty diagnostic questions, or an hour in
   the venture builder, then a reload — gone, with nothing having said
   so. Worse, the results page needs all forty answers, so it greets the
   person who just answered all forty with "complete all 40 questions
   first". The browser knew. The page did not pass it on.

   The reason this file exists rather than another assertion inside
   e2e.mjs is that the bug is invisible unless storage is broken, and
   nothing else in the suite breaks it. It is also why every check below
   is a PAIR: the same interaction with storage blocked and with storage
   working. A test that only ran the blocked half would pass just as
   happily against a banner that shows on every page load.

   The negative controls here are load-bearing. An earlier attempt at
   this could not tell the two runs apart — blocked and unblocked both
   showed "Complete all 40 questions first" — so it demonstrated nothing
   and was not committed. */
import { createServer } from 'node:http';
import { record } from './verification.mjs';
import { readFile } from 'node:fs/promises';
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
const PORT = 4954;
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
  '.webmanifest': 'application/manifest+json'
};

let failures = 0;
let passed = 0;
const assert = (cond, msg) => {
  const ok = Boolean(cond);
  console.log((ok ? '  PASS' : '  FAIL') + ' :: ' + msg);
  if (ok) passed++; else failures++;
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  let filePath = join(ROOT, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
  if (!extname(filePath)) filePath = join(filePath, 'index.html');
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
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

/* Patches Storage.prototype and discriminates on `this`, so blocking
   localStorage leaves sessionStorage working — which is what a quota
   failure on one store actually looks like, and which lets the
   sessionStorage check below fail on its own rather than riding on the
   localStorage one.

   The obvious route — Object.defineProperty on window.localStorage
   itself — does not work and does not say so. A Storage object is a
   legacy platform object with a named-property handler, so defining
   "setItem" on it stores a VALUE under the key "setItem" and leaves the
   method untouched. defineProperty returns normally; nothing throws;
   every write succeeds. The first version of this file did exactly that
   and reported a clean block while blocking nothing, which is why the
   probe below calls setItem and demands an exception rather than
   trusting a flag the blocker set about itself.

   The error is a real DOMException with the name browsers use, because
   the banner copy branches on err.name — a plain Error would take the
   default branch and the quota wording would never be exercised. */
function blockScript(which, errName) {
  return `(() => {
    const target = window.${which};
    const realSet = Storage.prototype.setItem;
    const realRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      if (this === target) throw new DOMException('blocked by test', '${errName}');
      return realSet.call(this, k, v);
    };
    Storage.prototype.removeItem = function (k) {
      if (this === target) throw new DOMException('blocked by test', '${errName}');
      return realRemove.call(this, k);
    };
  })()`;
}

/* Does the blocker actually block? Asked of the browser, by writing.
   Returns the exception name so a check can also confirm the RIGHT
   failure was simulated. */
const probeBlocked = (page, which) => page.evaluate((w) => {
  try { window[w].setItem('__probe__', '1'); window[w].removeItem('__probe__'); return 'no-throw'; }
  catch (e) { return e.name; }
}, which);

/* Smooth scrolling is on site-wide, so Playwright's scroll-then-click
   races the animation and reports "element is not stable". Reduced
   motion is a real user preference the stylesheet already honours with
   `scroll-behavior: auto`, so this is not a test-only hack. */
async function openPage({ block = null, errName = 'QuotaExceededError' } = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  if (block) await page.addInitScript(blockScript(block, errName));
  return { page, errors };
}

/* diagnostic.html greets a first-time visitor with a full-viewport
   onboarding overlay at z-index 100. Dismissing it is what a person
   does before answering anything, and skipping it here would mean every
   click below landed on the overlay instead — which is exactly how the
   first run of this file failed, with 30-second timeouts that looked
   like a bug in the banner and were not.

   It is also the first storage write on the page: the overlay removes
   itself BEFORE recording the flag, precisely so a refused write cannot
   leave it pinned over the questions. So dismissing it is itself a
   check that the fail-soft ordering still holds. */
async function dismissOnboarding(page) {
  const btn = await page.$('#onboard-dismiss');
  if (btn) await btn.click();
  await page.waitForTimeout(80);
}

const bannerText = (page) =>
  page.$eval('.jk-storage-warning', (el) => el.textContent.trim()).catch(() => null);

/* ---------------------------------------------------------------
   1. The diagnostic — the flow with the most to lose
   --------------------------------------------------------------- */
console.log('\n── Answering a diagnostic question with storage refused ──');
{
  const { page, errors } = await openPage({ block: 'localStorage' });
  await page.goto(`${BASE}/diagnostic.html`, { waitUntil: 'networkidle' });
  await dismissOnboarding(page);
  assert((await page.$('#onboard-dismiss')) === null,
    'the onboarding overlay closes even though recording that it was seen is refused — it removes itself before it writes');
  assert((await probeBlocked(page, 'localStorage')) === 'QuotaExceededError',
    'the test really does block localStorage.setItem, proved by writing (otherwise everything below is theatre)');
  assert((await probeBlocked(page, 'sessionStorage')) === 'no-throw',
    'and only localStorage — sessionStorage is untouched, so the two are testable apart');

  /* The dismiss above already tried, and failed, to write the onboarding
     flag — so by this point the banner is expected. Which is the right
     behaviour: that write failing is the visitor's first sign that
     nothing will be kept, and it comes before they spend 15 minutes. */
  assert((await bannerText(page)) !== null,
    'the first refused write — the onboarding flag — already raises the warning, before 15 minutes are spent on answers');

  await page.click('.q .opts .opt');
  await page.waitForTimeout(150);

  const after = await bannerText(page);
  assert(after !== null, 'answering one question surfaces a warning');
  assert(/full|blocking storage/i.test(after || ''),
    `the warning names the cause, not "an error occurred" (got: ${JSON.stringify((after || '').slice(0, 70))})`);
  assert(/will still score|safe on this page/i.test(after || ''),
    'the warning says the current session still works, so nobody abandons a half-finished diagnostic');
  assert(/reload|new tab/i.test(after || ''),
    'the warning says what is actually lost — a reload or a new tab, not vague "data loss"');
  assert(/export/i.test(after || ''),
    'the warning gives the visitor something to do about it');

  assert(await page.$eval('.jk-storage-warning', (el) => el.getAttribute('role')) === 'alert',
    'the warning is announced to a screen reader, since it appears with no interaction of its own');

  /* The banner appearing is only half the promise. The other half is
     that the page keeps working — the whole point of failing soft. */
  const selected = await page.$$eval('.q .opt.sel', (els) => els.length);
  assert(selected === 1, `the answer is still recorded on screen (${selected} option marked selected)`);
  assert(errors.length === 0, `nothing threw (${errors.join(' | ') || 'clean'})`);

  /* One banner, not one per keystroke — the listener fires on every
     answer, and 40 stacked alerts is its own failure. */
  const opts = await page.$$('.q .opts .opt');
  for (const o of opts.slice(1, 5)) { await o.click(); }
  await page.waitForTimeout(150);
  const count = await page.$$eval('.jk-storage-warning', (els) => els.length);
  assert(count === 1, `four more answers add no further banners (${count} on screen)`);

  await page.click('.jk-storage-warning-close');
  await page.waitForTimeout(50);
  assert((await page.$('.jk-storage-warning')) === null, 'the visitor can dismiss it');
  await page.close();
}

console.log('\n── The same clicks with storage working (negative control) ──');
{
  const { page, errors } = await openPage();
  await page.goto(`${BASE}/diagnostic.html`, { waitUntil: 'networkidle' });
  await dismissOnboarding(page);
  assert((await bannerText(page)) === null, 'the onboarding write succeeded silently, as a successful write should');
  await page.click('.q .opts .opt');
  await page.waitForTimeout(150);
  assert((await bannerText(page)) === null,
    'no warning when the write succeeds — otherwise the check above proves nothing');
  const stored = await page.evaluate(() => localStorage.getItem(window.STORE_KEY));
  assert(stored && stored.length > 2, 'and the answer really was written to localStorage');
  assert(errors.length === 0, `nothing threw (${errors.join(' | ') || 'clean'})`);
  await page.close();
}

/* ---------------------------------------------------------------
   2. The venture tools, which use a different write path
   --------------------------------------------------------------- */
console.log('\n── A venture tool, which saves through toolStore ──');
{
  const { page } = await openPage({ block: 'localStorage', errName: 'SecurityError' });
  await page.goto(`${BASE}/tools/venture-builder.html`, { waitUntil: 'networkidle' });
  const ok = await page.evaluate(() => window.toolStore('storage_test').save({ a: 1 }));
  await page.waitForTimeout(100);
  const text = await bannerText(page);
  assert(ok === false, 'toolStore.save reports the failure to its caller instead of returning undefined either way');
  assert(text !== null, 'and the visitor is told');
  assert(/blocking storage/i.test(text || ''),
    `a SecurityError reads as blocked storage, not as a full disk (got: ${JSON.stringify((text || '').slice(0, 60))})`);
  await page.close();
}

console.log('\n── sessionStorage is reported separately ──');
{
  const { page } = await openPage({ block: 'sessionStorage' });
  await page.goto(`${BASE}/diagnostic.html`, { waitUntil: 'networkidle' });
  await dismissOnboarding(page);
  const ok = await page.evaluate(() => window.sessionSet('jk_storage_probe', '1'));
  await page.waitForTimeout(100);
  assert(ok === false, 'sessionSet reports failure');
  assert((await bannerText(page)) !== null, 'and warns, since results.html gates the unlock on a sessionStorage write');
  /* Proof the two stores were blocked independently: localStorage is
     untouched in this run, so a saved answer must still persist. */
  const localOk = await page.evaluate(() => window.saveAnswers({ probe: 1 }));
  assert(localOk === true, 'localStorage still works in this run, so the two stores really were blocked independently');
  await page.close();
}

/* ---------------------------------------------------------------
   3. The banner must not become a new bug
   --------------------------------------------------------------- */
console.log('\n── The warning does not damage the page it lands on ──');
{
  const { page, errors } = await openPage({ block: 'localStorage' });
  await page.goto(`${BASE}/diagnostic.html`, { waitUntil: 'networkidle' });
  await dismissOnboarding(page);
  await page.click('.q .opts .opt');
  await page.waitForTimeout(150);

  /* This is the check that caught the first draft. Fixed to the top of
     the viewport, the banner swallowed clicks on the questions
     underneath it: Playwright scrolled an option into view, the option
     landed behind the bar, and every subsequent click timed out with
     "<div> intercepts pointer events". A warning that blocks the
     diagnostic it is telling you to finish is worse than no warning.

     So: click straight through the middle of the bar and require that
     whatever is behind it receives the event. */
  const rect = await page.$eval('.jk-storage-warning', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('.jk-storage-warning') === null : false;
  }, rect);
  assert(hit, 'a click in the middle of the banner reaches the page behind it, not the banner');

  /* ...while the close button, the one thing that should take a click,
     still does. */
  const closeTakesClicks = await page.$eval('.jk-storage-warning-close', (el) => {
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return at === el;
  });
  assert(closeTakesClicks, 'the close button is the one part of the banner that is clickable');

  /* Appended rather than prepended, so it does not become the first tab
     stop on every page ahead of the skip link. */
  const firstFocus = await page.evaluate(() => {
    const f = document.querySelector('a[href], button, input, select, textarea');
    return f ? f.className : null;
  });
  assert(!/jk-storage-warning/.test(firstFocus || ''),
    `the banner has not jumped the tab order ahead of the page (first control: "${firstFocus}")`);

  /* Still keyboard-reachable, though — pointer-events does not affect
     focus, and a dismiss nobody can reach is not a dismiss. */
  const focusable = await page.$eval('.jk-storage-warning-close', (el) => { el.focus(); return document.activeElement === el; });
  assert(focusable, 'and it is still focusable, so a keyboard user can dismiss it');

  const firstHeading = await page.$eval('h1', (h) => h.textContent.trim().slice(0, 40));
  assert(firstHeading && !/storage/i.test(firstHeading),
    `the page's own <h1> is still its first heading ("${firstHeading}")`);

  assert(errors.length === 0, `still nothing thrown (${errors.join(' | ') || 'clean'})`);
  await page.close();
}

await browser.close();
server.close();

record('storage', { passed: failures === 0, checks: passed,
  headline: `a refused save is reported on screen and the result survives it` });
console.log(`\n  ${passed} passed, ${failures} failed`);
console.log(failures
  ? `\n❌  ${failures} storage failure(s)`
  : '\n✅  A refused write is reported, a refused read is not, and the page survives both');
process.exit(failures ? 1 : 0);
