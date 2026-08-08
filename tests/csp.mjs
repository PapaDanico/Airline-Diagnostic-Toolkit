/* Content-Security-Policy, enforced by a real browser.

   The e2e suite reads _headers as text and asserts what the policy says.
   That catches a weakened directive, but it cannot catch the failure that
   actually matters: a policy that is served and BREAKS the site. Under
   file:// no headers exist at all, so every page passes every local test
   whether the CSP is sound, absurdly strict, or silently malformed.

   This serves the site over HTTP with the headers from _headers applied
   exactly as written, then drives Chromium through every page and listens
   for securitypolicyviolation. Three things get proved that a string
   comparison cannot:

     1. Chromium parses the policy. A malformed directive is dropped
        silently by browsers — no error, no violation, just no protection.
        Here an unparseable policy means zero violations on the negative
        control below, and the run fails.

     2. No page violates it. If an extracted script was missed, or a
        library injects an inline <script> at runtime, the browser says so
        here rather than in production.

     3. The policy has teeth. A page with an injected inline <script> is
        blocked. Without this, a CSP that browsers ignore entirely would
        pass points 1 and 2 perfectly.

   Run: node tests/csp.mjs */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  for (const id of ['playwright', 'playwright-core', './node_modules/playwright-core/index.js']) {
    try { return require(id); } catch { /* next */ }
  }
  throw new Error('Playwright not found');
})();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
let passed = 0;
const assert = (cond, msg) => {
  const ok = Boolean(cond);
  console.log((ok ? '  PASS' : '  FAIL') + ' :: ' + msg);
  if (ok) passed++; else failures++;
};

/* Parse the `/*` block of Netlify's _headers. Deliberately literal: the
   point is to serve what is committed, not a tidied interpretation of
   it. A header this cannot parse is a header Netlify would not apply
   either, and the run should notice. */
async function headersFromFile() {
  const text = await readFile(join(ROOT, '_headers'), 'utf8');
  const out = {};
  let inGlobal = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { inGlobal = line.trim() === '/*'; continue; }
    if (!inGlobal) continue;
    const m = line.match(/^\s+([A-Za-z0-9-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

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

const HEADERS = await headersFromFile();
assert(typeof HEADERS['Content-Security-Policy'] === 'string' && HEADERS['Content-Security-Policy'].length > 0,
  '_headers yields a Content-Security-Policy the server can apply');

/* Every security header this project claims, asserted from the file
   that has to contain it.

   An external review published a header table listing
   Strict-Transport-Security as set and "Strong". It was set nowhere —
   not here, not in netlify.toml. Netlify sends HSTS at the edge for a
   custom domain, so the header was probably observed in a response and
   written down as ours. It was not ours: nothing in this repository
   asked for it, and nothing would have noticed it going away.

   That is what this list prevents. A header that exists only because
   the host happens to add it is a control nobody owns, and a table
   saying otherwise retires the question instead of answering it. */
for (const [name, shape, why] of [
  ['X-Content-Type-Options', /^nosniff$/, 'stops a MIME-sniffed response becoming a script'],
  ['Referrer-Policy', /^strict-origin-when-cross-origin$/, 'keeps paths out of third-party referers'],
  ['Permissions-Policy', /geolocation=\(\)/, 'denies the capabilities this site never uses'],
  ['Strict-Transport-Security', /^max-age=\d{7,}/, 'a year or more, or it is decorative']
]) {
  const value = HEADERS[name];
  assert(typeof value === 'string' && shape.test(value),
    `_headers sets ${name} — ${why}${value ? ` (got "${value}")` : ' (absent)'}`);
}

/* Preload is the one directive here that is hard to undo: it ships in
   browser binaries and takes months to leave. If it is ever added that
   should be a decision someone made, not one that arrived with a
   copy-pasted header. */
assert(!/preload/i.test(HEADERS['Strict-Transport-Security'] || ''),
  'HSTS does not claim preload, which would commit every future subdomain for months');

/* The negative control is served only at this path, and only its inline
   script differs from a real page. Keeping it inside the same server and
   the same policy means it is testing the committed CSP rather than a
   copy of it that could drift. */
const CANARY = '/__csp_canary__.html';
const CANARY_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>canary</title></head>
<body><p id="out">not-run</p><script>document.getElementById("out").textContent="ran"</script></body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const send = (code, type, body) => {
    res.writeHead(code, { ...HEADERS, 'Content-Type': type });
    res.end(body);
  };
  if (url.pathname === CANARY) return send(200, MIME['.html'], CANARY_HTML);

  let filePath = join(ROOT, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(ROOT)) return send(403, 'text/plain', 'no');
  if (!extname(filePath)) filePath = join(filePath, 'index.html');
  try {
    const body = await readFile(filePath);
    send(200, MIME[extname(filePath)] || 'application/octet-stream', body);
  } catch {
    send(404, 'text/plain', 'not found');
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
const page = await browser.newPage();

/* securitypolicyviolation fires in the page for every blocked resource.
   Collected per-navigation rather than globally so a failure names the
   page it happened on. */
const violations = [];
await page.exposeFunction('__cspViolation', (v) => violations.push(v));
await page.addInitScript(() => {
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__cspViolation({
      directive: e.effectiveDirective || e.violatedDirective,
      blocked: String(e.blockedURI || '').slice(0, 80),
      sample: String(e.sample || '').slice(0, 60)
    });
  });
});

/* ---- 1. the policy has teeth ---- */
console.log('\n── The policy blocks what it claims to ──');
violations.length = 0;
await page.goto(BASE + CANARY, { waitUntil: 'networkidle' });
const canaryText = await page.$eval('#out', (e) => e.textContent);
assert(canaryText === 'not-run',
  `an inline <script> does not execute under the served policy (canary read "${canaryText}")`);
assert(violations.some((v) => /script-src/.test(v.directive)),
  `the browser reports a script-src violation for it (${violations.length} violation(s): ${violations.map((v) => v.directive).join(', ') || 'none'})`);

/* ---- 2. no real page violates it ---- */
console.log('\n── Every page runs clean under it ──');
const pages = [
  ...(await readdir(ROOT)).filter((f) => f.endsWith('.html')),
  ...(await readdir(join(ROOT, 'tools'))).filter((f) => f.endsWith('.html')).map((f) => 'tools/' + f)
].sort();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 120));
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e.message).slice(0, 120)));

let totalViolations = 0;
let totalErrors = 0;
for (const file of pages) {
  violations.length = 0;
  consoleErrors.length = 0;
  await page.goto(`${BASE}/${file}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  if (violations.length) {
    totalViolations += violations.length;
    console.log(`  ${file}: ` + violations.map((v) => `${v.directive} blocked ${v.blocked} ${v.sample}`).join(' | '));
  }
  if (consoleErrors.length) {
    totalErrors += consoleErrors.length;
    console.log(`  ${file}: ` + consoleErrors.join(' | '));
  }
}
assert(totalViolations === 0, `no page violates the policy across ${pages.length} pages (${totalViolations} violation(s))`);
/* A page whose scripts were all blocked would report violations above,
   but a page whose extracted script 404s would not — it would simply do
   nothing, quietly. Console errors catch that. */
assert(totalErrors === 0, `no console or page errors under the policy (${totalErrors})`);

/* ---- 3. the extracted scripts actually load and run ---- */
console.log('\n── The extracted scripts are really running ──');
await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
const navLinks = await page.$$eval('.nav-links a', (a) => a.length);
assert(navLinks > 0, `index.html's extracted script ran — the nav it builds has ${navLinks} links`);
const marketRows = await page.$eval('#market-stats', (e) => e.children.length).catch(() => 0);
assert(marketRows > 0, `index.html's extracted script populated #market-stats (${marketRows} rows)`);

await browser.close();
server.close();

console.log(`\n  ${passed} passed, ${failures} failed`);
console.log(failures ? `\n❌  ${failures} CSP failure(s)` : '\n✅  CSP enforced, and every page runs clean under it');
process.exit(failures ? 1 : 0);
