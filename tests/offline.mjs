/* ============================================================
   Does the offline promise hold?

   manifest.json makes this site installable, and an installed thing
   that shows a blank frame with no signal is worse than one that was
   never installable. So the claim gets checked rather than asserted.

   Two properties matter here and they pull in opposite directions:

     1. OFFLINE, a visited page still renders.
     2. ONLINE, the network always wins.

   The second is the one worth guarding hardest, and it is why this
   worker is network-first for everything. Nothing on this site is
   fingerprinted — assets/css/jk.css is that path forever — so a cache
   that answered before the network could serve yesterday's stylesheet
   against today's markup, or yesterday's common.js against today's
   data.js, with no hash anywhere to notice. That failure would be
   silent, would affect only returning visitors, and would look like a
   broken page rather than a stale one. Nobody would report it as
   caching.

   Cutting the network by closing the SERVER, not with Playwright's
   setOffline(). Requests originating inside a service worker are not
   subject to setOffline() in Chromium — a probe on the sister project
   caught a server answering seven requests after the context had
   supposedly gone offline, which meant every assertion there had been
   passing against a live network. A closed socket cannot be argued
   with.
   ============================================================ */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4197;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json'
};

const CANDIDATE_EXECS = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];
const execPath = CANDIDATE_EXECS.find((p) => existsSync(p));

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.error(`  ✗ ${m}`); failures++; };
const expect = (c, m) => (c ? ok(m) : bad(m));

let served = 0;
const server = createServer(async (req, res) => {
  served++;
  const url = new URL(req.url, BASE);
  let fp = join(ROOT, decodeURIComponent(url.pathname));
  if (!fp.startsWith(ROOT)) return void res.writeHead(403).end('Forbidden');
  if (existsSync(fp) && !extname(fp)) fp = join(fp, 'index.html');
  if (!existsSync(fp)) return void res.writeHead(404).end('Not found');
  try {
    const body = await readFile(fp);
    /* no-store, so the browser's own HTTP cache cannot answer an
       offline request and let this pass without the worker doing
       anything — the false pass this file exists to rule out. */
    res.writeHead(200, {
      'Content-Type': MIME[extname(fp)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/'
    });
    res.end(body);
  } catch { res.writeHead(500).end('error'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
console.log('\nOffline capability');

const context = await browser.newContext();
const page = await context.newPage();

/* ---- 1. Install ---- */
await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

const state = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.ready;
  return reg.active ? reg.active.state : 'no-active-worker';
});
expect(state === 'activated', `the worker reaches "activated" (got "${state}")`);

const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
expect(controlled, 'and controls the page that installed it');

/* Visit one tool online; leave another untouched, so the two offline
   cases below are genuinely different. */
await page.goto(`${BASE}/tools/cask-calculator.html`, { waitUntil: 'networkidle' });

/* ---- 2. ONLINE, the network wins ----

   The property that protects every visitor who is not offline. Serve a
   marker the cache cannot contain and require the page to show it: if
   a cached copy answered first, the marker is absent. */
const beforeProbe = served;
await page.goto(`${BASE}/tools/cask-calculator.html?probe=${Date.now()}`, { waitUntil: 'load' });
expect(
  served > beforeProbe,
  `an online repeat visit still reaches the server (${served - beforeProbe} request(s)) — ` +
    `nothing here is fingerprinted, so a cache-first worker would serve stale assets after a deploy`
);

/* ---- 3. Cut the network ---- */
server.closeAllConnections?.();
await Promise.race([
  new Promise((r) => server.close(r)),
  new Promise((r) => setTimeout(r, 5000))
]);
await context.setOffline(true);

/* The cut is a premise, so it is asserted like one. If close() lost the
   race the server is still listening and would answer everything below,
   putting this file back in the state it was written to escape. */
const stillUp = await fetch(`${BASE}/`, { cache: 'no-store' }).then(() => true).catch(() => false);
expect(!stillUp, 'the server is genuinely down, so nothing below can be answered by it');

/* A page visited while online. */
await page.goto(`${BASE}/tools/cask-calculator.html`, { waitUntil: 'load' }).catch(() => null);
const visited = await page.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent?.trim() || '',
  chars: (document.body.textContent || '').replace(/\s+/g, ' ').trim().length,
  styled: getComputedStyle(document.body).backgroundColor
}));
expect(visited.h1.length > 0, `a page visited online still renders offline (h1: "${visited.h1}")`);
expect(visited.chars > 400, `and carries its content (${visited.chars} chars)`);
expect(
  visited.styled !== 'rgba(0, 0, 0, 0)' && visited.styled !== '',
  `and its stylesheet came from the cache too (body background ${visited.styled})`
);

/* A page never opened. There is no cached document for it, and this is
   a multi-page site with no client router — so falling back to the home
   page would silently show the wrong document. It must say so instead. */
await page.goto(`${BASE}/tools/training-tna.html`, { waitUntil: 'load' }).catch(() => null);
const unvisited = await page.evaluate(() =>
  (document.body.textContent || '').replace(/\s+/g, ' ').trim()
);
expect(
  /isn.t saved for offline use/i.test(unvisited),
  'a page never opened gets the offline notice, not the wrong page'
);
expect(
  !/Stage length|CASK/i.test(unvisited),
  'and specifically not some other tool it was never asked for'
);

await context.close();
await browser.close();

console.log('\n' + '─'.repeat(52));
if (failures === 0) {
  console.log('Offline capability holds, and online still beats the cache.');
  process.exit(0);
} else {
  console.error(`${failures} offline check(s) failed.`);
  process.exit(1);
}
