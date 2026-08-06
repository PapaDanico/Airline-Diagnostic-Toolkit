/* Focus indicators, measured in a real browser.
   Run: node tests/focus.mjs

   e2e.mjs mentions focus four times, and every one of them is about
   focus MANAGEMENT — does focus move to the first blank required field,
   does it stay on the checkbox after ticking. Nothing tested focus
   VISIBILITY: whether a keyboard user can SEE where focus went. Those
   are different failures. The first puts the cursor in the wrong place;
   the second puts it in the right place invisibly.

   The sister platform lost its focus ring exactly this way and nothing
   caught it: `:focus-visible` and `.card` both compute to specificity
   (0,1,0), so the card's border won on source order and cards took
   focus with no visible change at all. There is no reason this codebase
   is immune, and until this file there was nothing that would notice.

   WCAG 2.4.7 wants a visible focus indicator; 1.4.11 wants 3:1 against
   its surroundings. Both are checked here, over every page and every
   tool.

   Four things this gets right that the obvious version gets wrong, each
   of which produced a confident wrong answer first:

     1. Transitions are disabled before measuring, or focus() followed
        by a synchronous getComputedStyle reads frame zero of the
        animation and reports a transparent, zero-size indicator.
     2. Only what CHANGES on focus counts — otherwise a resting
        elevation shadow scores as a focus ring.
     3. The ring is measured against the PARENT's background, because an
        outline paints outside the element. Measuring against the
        element's own fill scores a rust ring on a rust button as 1:1.
     4. A border-colour change is an indicator too, and ignoring it makes
        properly-styled form fields look unstyled.

   A colour this cannot parse is reported rather than guessed at. */
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
const PORT = 4952;
const BASE = `http://127.0.0.1:${PORT}`;
const MIN_RATIO = 3;

let failures = 0;
const expect = (cond, msg) => {
  const ok = Boolean(cond);
  console.log((ok ? '  ✓ ' : '  ✗ ') + msg);
  if (!ok) failures++;
};

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

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  let filePath = join(ROOT, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  if (!extname(filePath)) filePath = join(filePath, 'index.html');
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const COLOUR = `
  const lum = c => { const [r,g,b] = c.map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
  const ratio = (a,b) => { const [hi,lo] = lum(a)>lum(b) ? [lum(a),lum(b)] : [lum(b),lum(a)]; return (hi+0.05)/(lo+0.05); };
  const over = (fg,a,bg) => fg.map((c,i)=>Math.round(c*a+bg[i]*(1-a)));
  /* color-mix() computes to color(srgb ...) on 0-1 components. Reading
     those as rgb() turns white into near-black, which is how a wordmark
     got accused of 2:1 once. Unknown notations return null and are
     reported, never assumed. */
  const toRgb = s => { if(!s) return null; const n=(s.match(/[\\d.]+/g)||[]).map(Number);
    if(/^\\s*color\\(\\s*srgb[\\s(]/i.test(s)) return n.length>=3?{rgb:n.slice(0,3).map(v=>Math.round(v*255)),a:n.length>3?n[3]:1}:null;
    if(/^\\s*rgba?\\(/i.test(s)) return n.length>=3?{rgb:n.slice(0,3),a:n.length>3?n[3]:1}:null;
    if(/^\\s*transparent\\s*$/i.test(s)) return {rgb:[0,0,0],a:0};
    return null; };
  /* An all-opaque gradient HIDES what is beneath, so the walk stops
     there. One with a transparent stop only tints, so it continues and
     composites. Treating every gradient as terminal produced 117 bogus
     1:1 failures on this codebase. */
  const bgOf = el => { const ov=[];
    const settle = b => ({stops:[b,...ov.map(x=>over(x.rgb,x.a,b))]});
    for(let n=el;n&&n!==document.documentElement;n=n.parentElement){ const cs=getComputedStyle(n);
      if(cs.backgroundImage&&cs.backgroundImage!=='none'){ const m=cs.backgroundImage.match(/(?:rgba?|color)\\([^)]+\\)/g);
        if(!m) return {unresolved:1}; const st=m.map(toRgb); if(st.some(x=>!x)) return {unresolved:1};
        if(st.every(x=>x.a>=0.99)) return {stops:st.map(x=>x.rgb)}; ov.push(...st.filter(x=>x.a>0)); }
      const c=toRgb(cs.backgroundColor); if(!c) return {unresolved:1}; if(c.a>0.5) return settle(c.rgb); }
    const r=toRgb(getComputedStyle(document.documentElement).backgroundColor);
    return settle(r&&r.a>0.5?r.rgb:[255,255,255]); };
`;

const MEASURE = COLOUR + `
  (() => {
    const out = [];
    let skipped = 0;
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const els = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).slice(0, 60);
    for (const el of els) {
      /* Elements inside a closed <details> still report client rects but
         refuse focus — correctly, since a keyboard user cannot tab into
         collapsed content either. Disclosures are opened before this
         runs so the content is measured rather than skipped; whatever
         still refuses is counted, not silently dropped. */
      /* The nav menus are visibility:hidden until :focus-within, so a
         direct focus() on an item fails while a keyboard user reaches it
         perfectly well — they land on the trigger first, which reveals
         the menu. Reaching it the same way rescued 301 elements that
         were being skipped across 27 pages: eleven per page, the shared
         header, on every page of the site.

         Both readings have to hold the menu open the same way. Blurring
         outright drops focus out of the dropdown, the menu closes, and
         the element refuses focus on the next call — so the resting and
         focused readings come back identical and every menu item reads
         as having no focus indicator. It has one: a 2px terracotta ring
         at 7.23:1 on the white menu. Hence rest() parks focus on the
         trigger rather than nowhere. */
      const menu = el.closest('.dropdown');
      const trigger = menu && menu.querySelector('a[href],button:not([disabled])');
      const opener = trigger && trigger !== el ? trigger : null;
      const rest = () => { if (opener) opener.focus(); else el.blur(); };
      const take = () => {
        el.focus();
        if (document.activeElement !== el && opener) { opener.focus(); el.focus(); }
        return document.activeElement === el;
      };

      rest();
      if (!take()) { skipped++; continue; }

      rest();
      const before = getComputedStyle(el);
      const restOutline = before.outlineStyle !== 'none' && (parseFloat(before.outlineWidth) || 0) > 0
        ? (before.outlineWidth + ' ' + before.outlineColor) : '';
      const restShadow = before.boxShadow || 'none';
      const restBorder = before.borderColor;

      take();
      const cs = getComputedStyle(el);
      const nowOutline = cs.outlineStyle !== 'none' && (parseFloat(cs.outlineWidth) || 0) > 0
        ? (cs.outlineWidth + ' ' + cs.outlineColor) : '';
      const nowShadow = cs.boxShadow || 'none';
      const nowBorder = cs.borderColor;
      const cls = String(el.className || '').slice(0, 30) || el.tagName.toLowerCase();

      const ground = bgOf(el.parentElement || document.body);
      if (ground.unresolved) { out.push({ kind: 'unresolved', cls }); continue; }

      const candidates = [];
      if (nowOutline && nowOutline !== restOutline) candidates.push(cs.outlineColor);
      if (nowShadow !== restShadow && nowShadow !== 'none') {
        const restColours = new Set((restShadow.match(/(?:rgba?|color)\\([^)]+\\)/g) || []));
        for (const m of nowShadow.match(/(?:rgba?|color)\\([^)]+\\)/g) || []) {
          if (!restColours.has(m)) candidates.push(m);
        }
      }
      if (nowBorder !== restBorder) candidates.push(nowBorder);
      if (!candidates.length) { out.push({ kind: 'none', cls }); continue; }

      let best = 0, bestColour = '';
      for (const colour of candidates) {
        const oc = toRgb(colour);
        if (!oc) { out.push({ kind: 'unresolved', cls }); best = -1; break; }
        if (oc.a === 0) continue;
        const r = Math.min(...ground.stops.map(s => ratio(oc.a >= 0.99 ? oc.rgb : over(oc.rgb, oc.a, s), s)));
        if (r > best) { best = r; bestColour = colour; }
      }
      if (best === -1) continue;
      if (best === 0) { out.push({ kind: 'none', cls }); continue; }
      if (best < ${MIN_RATIO}) out.push({ kind: 'low', cls, ratio: Math.round(best * 100) / 100, colour: bestColour });
    }
    return { out, total: els.length, measured: els.length - skipped, skipped };
  })()
`;

const pages = [
  ...(await readdir(ROOT)).filter((f) => f.endsWith('.html') && f !== '404.html'),
  ...(await readdir(join(ROOT, 'tools'))).filter((f) => f.endsWith('.html')).map((f) => 'tools/' + f)
].sort().map((f) => '/' + f);

/* Same resolution the other tests here use: CI installs the browser
   Playwright expects, but a local checkout often has a different build
   already on disk and no reason to download a second one. */
const EXECS = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/opt/pw-browsers/chromium'
];
const executablePath = EXECS.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const missing = new Map();
const low = new Map();
const unresolved = new Map();
let measured = 0;
let skipped = 0;

for (const p of pages) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(120);
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none !important;animation:none !important}' });
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('details:not([open])')) d.open = true;
  }).catch(() => {});
  await page.waitForTimeout(60);
  const res = await page.evaluate(MEASURE).catch(() => ({ out: [], measured: 0, skipped: 0 }));
  measured += res.measured ?? 0;
  skipped += res.skipped ?? 0;
  for (const f of res.out) {
    const bucket = f.kind === 'low' ? low : f.kind === 'unresolved' ? unresolved : missing;
    const key = `${f.cls}|${f.ratio ?? ''}`;
    if (!bucket.has(key)) bucket.set(key, { ...f, where: p });
  }
}

await browser.close();
server.close();

console.log(`\n${measured} focusable elements measured across ${pages.length} pages (${skipped} refused focus)\n`);

/* A denominator of zero passes everything below while proving nothing. */
expect(pages.length >= 25, `${pages.length} pages swept`);
expect(measured >= 300, `${measured} focusable elements actually measured`);
expect(skipped <= measured * 0.1, `at most a tenth refused focus (${skipped} skipped vs ${measured} measured)`);

for (const v of [...missing.values()].slice(0, 10)) console.log(`      no indicator: [${v.cls}] ${v.where}`);
expect(missing.size === 0, `every focusable element shows a visible change on focus (${missing.size} distinct without one)`);

for (const v of [...low.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 10)) {
  console.log(`      ${v.ratio}:1  [${v.cls}]  ${v.colour}  ${v.where}`);
}
expect(low.size === 0, `every focus indicator reaches ${MIN_RATIO}:1 against its surroundings (${low.size} distinct below)`);

for (const v of [...unresolved.values()].slice(0, 10)) console.log(`      unresolved: [${v.cls}] ${v.where}`);
expect(unresolved.size === 0, `every colour involved was parsed rather than guessed (${unresolved.size} unresolved)`);

console.log(`\n${'─'.repeat(52)}`);
console.log(failures ? `❌  ${failures} focus-visibility failure(s)` : `✅  ${measured} focusable elements, all with a visible indicator at ${MIN_RATIO}:1`);
process.exit(failures ? 1 : 0);
