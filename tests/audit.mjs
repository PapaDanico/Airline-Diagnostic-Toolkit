/* Static + runtime audit across every page: console/JS errors, single h1,
   missing alt, unlabelled buttons, duplicate IDs, broken internal links,
   and horizontal overflow at desktop (1280) and mobile (390).
   Exits non-zero on any issue. Run: node tests/audit.mjs */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, normalize, extname } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* Derived from disk, not listed here.

   This was a hand-kept array of 28 filenames, and it had already drifted:
   404.html existed and was never audited. A page missing from a list of
   pages to audit is not a gap anyone notices — the run stays green and
   the number goes down by one, and the number was never printed.

   The same drift is possible in sitemap.xml, which is also hand-kept, so
   both are now reconciled against the file tree below. */
const NOT_INDEXED = new Set([
  '404.html',      // an error document; indexing it advertises a dead end
  'embed.html',    // frames diagnostic.html to demo the partner embed
  'results.html'   // renders from answers held in session; bare, it is blank
]);

function htmlFiles() {
  const out = [];
  for (const f of readdirSync(ROOT)) if (f.endsWith('.html')) out.push(f);
  for (const f of readdirSync(join(ROOT, 'tools'))) if (f.endsWith('.html')) out.push('tools/' + f);
  return out.sort();
}

const pages = htmlFiles();
// Google Fonts is loaded from a CDN; in offline/sandbox CI that request can
// fail with a cert/network error that is irrelevant to the page itself.
const IGNORE = /ERR_CERT_AUTHORITY_INVALID|ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION)|fonts\.googleapis|fonts\.gstatic/;

const CANDIDATE_EXECS = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/build/repo/.netlify/plugins/node_modules/@netlify/plugin-lighthouse/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome"
];
const execPath = CANDIDATE_EXECS.find(p => existsSync(p));

/* Pages are served over HTTP rather than opened as file:// URLs.
   file:// gives every page a null origin, which makes the browser reject
   any CORS-mode fetch — including webfonts, which are always fetched in
   CORS mode and therefore need the crossorigin attribute on their
   preload. Under file:// that correct markup produced 84 spurious
   failures. Serving over HTTP also matches how the site actually runs,
   so the audit can see real header, redirect and protocol behaviour. */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml",
  ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8" };

const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
  // contain every request inside ROOT — a path-traversal attempt should 403,
  // not read the filesystem, even in a test harness
  const target = normalize(join(ROOT, rel || "index.html"));
  if (!target.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
  if (!existsSync(target)) { res.writeHead(404).end("not found"); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(target).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(target));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const b = await chromium.launch(execPath ? { executablePath: execPath } : {});
let problems = 0;
for (const pg of pages) {
  const dir = dirname(pg);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("JS: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !IGNORE.test(m.text())) errs.push("console: " + m.text()); });
  if (pg === "results.html") await p.addInitScript(() => localStorage.setItem("dn_airline_scorecard_v2",
    JSON.stringify({ safety: [2, 2, 2, 2, 2], ops: [2, 2, 2, 2, 2], fleet: [2, 2, 2, 2, 2], cost: [2, 2, 2, 2, 2], revenue: [2, 2, 2, 2, 2], commercial: [2, 2, 2, 2, 2], people: [2, 2, 2, 2, 2], finance: [2, 2, 2, 2, 2] })));
  await p.goto(BASE + pg); await p.waitForTimeout(300);
  const deskOX = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const r = await p.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    return {
      h1: document.querySelectorAll("h1").length,
      imgsNoAlt: [...document.querySelectorAll("img")].filter(i => !i.hasAttribute("alt")).length,
      btnsNoName: [...document.querySelectorAll("button")].filter(b => !(b.textContent.trim() || b.getAttribute("aria-label"))).length,
      dupes: [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))],
      links: [...new Set([...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")).filter(h => h && !/^(https?:|mailto:|#|tel:|data:)/.test(h)))],
      hasChrome: !!document.querySelector("[data-year]"),
      yearOk: document.querySelector("[data-year]")?.textContent === String(new Date().getFullYear())
    };
  });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(150);
  const mobOX = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const broken = r.links.filter(l => { const c = l.split("#")[0].split("?")[0]; return c && !existsSync(normalize(join(ROOT, dir, c))); });

  const issues = [];
  if (errs.length) issues.push(...errs);
  if (r.h1 !== 1) issues.push(`h1=${r.h1}`);
  if (r.imgsNoAlt) issues.push(`imgsNoAlt=${r.imgsNoAlt}`);
  if (r.btnsNoName) issues.push(`btnNoName=${r.btnsNoName}`);
  if (r.dupes.length) issues.push(`DUP IDs=${JSON.stringify(r.dupes)}`);
  if (broken.length) issues.push(`BROKEN LINKS=${JSON.stringify(broken)}`);
  if (deskOX > 0) issues.push(`deskOverflowX=${deskOX}`);
  if (mobOX > 0) issues.push(`mobOverflowX=${mobOX}`);
  if (r.hasChrome && !r.yearOk) issues.push("footer year not filled");
  problems += issues.length;
  console.log(`${issues.length ? "❌" : "✅"} ${pg}` + (issues.length ? "\n     - " + issues.join("\n     - ") : ""));
  await ctx.close();
}
await b.close();
server.close();

/* ---- sitemap.xml against the file tree, both directions ----

   Hand-kept, like the page list above was, and drift here is quieter
   still: a page missing from the sitemap is simply never crawled, and
   nothing on the site looks wrong. Today it happens to be correct — 25
   URLs, 28 pages, the three absent ones deliberately so — which is
   exactly when to write the check, while the answer is known.

   Reconciled BOTH ways. Missing entries lose a page its crawl; stale
   entries point crawlers at documents that no longer exist; and an id
   in NOT_INDEXED for a page that has since been deleted is an exemption
   sitting open for whatever reuses the name. */
{
  const sm = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  const listed = new Set(
    [...sm.matchAll(/<loc>https:\/\/jkassociates\.enterprises\/([^<]*)<\/loc>/g)].map((m) =>
      m[1] === '' ? 'index.html' : m[1] === 'tools/' ? 'tools/index.html' : m[1]
    )
  );
  const onDisk = new Set(htmlFiles());
  const sitemapIssues = [];

  for (const f of onDisk) {
    if (NOT_INDEXED.has(f)) {
      if (listed.has(f)) sitemapIssues.push(`${f} is in the sitemap but marked NOT_INDEXED`);
    } else if (!listed.has(f)) {
      sitemapIssues.push(`${f} exists but is not in the sitemap`);
    }
  }
  for (const l of listed) {
    if (!onDisk.has(l)) sitemapIssues.push(`sitemap lists ${l}, which is not on disk`);
  }
  for (const x of NOT_INDEXED) {
    if (!onDisk.has(x)) sitemapIssues.push(`NOT_INDEXED names ${x}, which no longer exists — remove it`);
  }

  problems += sitemapIssues.length;
  console.log(
    `\n${sitemapIssues.length ? '❌' : '✅'} sitemap.xml covers ${listed.size} of ${onDisk.size} pages ` +
      `(${NOT_INDEXED.size} deliberately excluded)` +
      (sitemapIssues.length ? '\n     - ' + sitemapIssues.join('\n     - ') : '')
  );
}

console.log(`\n${problems ? "❌ " + problems + " issue(s)" : "✅ all pages clean"}`);
process.exit(problems ? 1 : 0);
