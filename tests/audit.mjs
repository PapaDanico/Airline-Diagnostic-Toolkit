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
  'results.html',  // renders from answers held in session; bare, it is blank
  'offline.html'   // the service worker's fallback; a crawler reaching it learns nothing
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
let scoringModel = null;

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
      yearOk: document.querySelector("[data-year]")?.textContent === String(new Date().getFullYear()),
      /* Captured from the live JK namespace rather than parsed out of
         data.js with a regex. The README describes the scoring model;
         the browser is where that model actually exists. */
      scoring: (typeof JK !== "undefined" && Array.isArray(JK.domains))
        ? { count: JK.domains.length,
            questions: JK.domains.reduce((n, d) => n + (d.questions ? d.questions.length : 0), 0),
            weights: JK.domains.map(d => ({ name: d.name, weight: d.weight })) }
        : null
    };
  });
  if (r.scoring && !scoringModel) scoringModel = r.scoring;
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

/* ---- the README's description of the scoring model ----

   The sister project shipped three stale README figures today — tool
   count, test count, bundle size — all wrong for the same reason, a
   number written once and never re-derived. This README carries the
   same shape of claim, and one of its statements was already stale: it
   warned that legal placeholders "must be completed before go-live"
   twelve hours after they were completed.

   These are the checkable ones. They are all correct today, which is
   exactly when to write this — while someone still knows what the right
   answer is, rather than after a reader has acted on a wrong one.

   Compared against the JK namespace as the browser loads it, not
   against a regex over data.js. A guard that reads the source with a
   different parser than the product uses is testing its own parser. */
{
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const readmeIssues = [];

  if (!scoringModel) {
    readmeIssues.push("could not read JK.domains from any page — the scoring claims went unchecked");
  } else {
    /* The README states the domain count in THREE places, and the first
       version of this checked one of them. Editing "8 weighted domains"
       to "9" on the feature table passed clean, because that line's
       domain half was being discarded — the same regex read its question
       count and threw the rest away. A guard that verifies one of three
       copies of a claim reports on the whole README and covers a third
       of it, which reads as coverage and is not.

       So every site is collected, and the count of sites is itself
       asserted: a rewording that drops one must fail loudly rather than
       quietly shrink what this checks. "whitelisted domains" further
       down is not a claim about the model, which is why these match
       shapes rather than counting the word. */
    const domainClaims = [
      (readme.match(/[x×]\s*(\d+)\s+weighted domains/) || [])[1],
      (readme.match(/(\d+)\s+domains,\s+\d+\s+questions/) || [])[1],
      (readme.match(/(\d+)\s+domains,\s+each\s+weighted/) || [])[1]
    ].filter(Boolean).map(Number);

    if (domainClaims.length < 3) {
      readmeIssues.push(
        `expected three domain-count claims in the README, found ${domainClaims.length}`
      );
    }
    for (const n of new Set(domainClaims)) {
      if (n !== scoringModel.count) {
        readmeIssues.push(`README says ${n} domains; JK.domains has ${scoringModel.count}`);
      }
    }

    /* Scoped to the scorecard's own two statements, and this took two
       attempts to get right.

       The first version matched any "N questions" in the README and
       reported "README claims 38 questions; the scorecard has 40". The
       38 is faq.html's question count and the 20 further up is the MRO
       diagnostic's — both correct, neither anything to do with the
       Health Scorecard. A check that cannot tell which claim it is
       reading will confidently fail a document that is entirely right,
       which is worse than not checking: the next person deletes it.

       So each claim is matched in its own context, and the other two
       counts are checked against their own sources rather than ignored. */
    const scorecardClaims = [
      (readme.match(/(\d+)\s+questions\s*[x\u00d7]\s*\d+\s+weighted domains/) || [])[1],
      (readme.match(/\d+\s+domains,\s+(\d+)\s+questions/) || [])[1]
    ].filter(Boolean).map(Number);

    if (scorecardClaims.length < 2) {
      readmeIssues.push(
        `expected two scorecard question claims in the README, found ${scorecardClaims.length}`
      );
    }
    for (const n of scorecardClaims) {
      if (n !== scoringModel.questions) {
        readmeIssues.push(`README claims ${n} scorecard questions; JK.domains has ${scoringModel.questions}`);
      }
    }

    /* The weights as a SET of numbers, not matched by name.

       The first version of this derived a short label from each domain
       name and looked for it in the prose — "Operational Reliability"
       to "Operational", "Cost & Fuel Efficiency" to "Cost". The README
       calls those "Operations" and "Cost & Fuel", so the check reported
       four missing weights against a README that was entirely correct.

       That is the failure this file exists to prevent, committed by the
       check itself: a confident report about something it had not
       understood. Prose labels are editorial and should not be derived
       mechanically. The NUMBERS are the claim, so the numbers are what
       is compared — every weight in the parenthetical against every
       weight in data.js, as multisets. A changed value fails, a
       reworded label does not. */
    const listed = (readme.match(/domains,\s+each\s+weighted\s*\(([^)]*)\)/) || [])[1];
    if (!listed) {
      readmeIssues.push("README no longer lists the domain weights");
    } else {
      const claimed = [...listed.matchAll(/(\d+)/g)].map((m) => Number(m[1])).filter((n) => n !== 100).sort((a, b) => a - b);
      const actual = scoringModel.weights.map((d) => d.weight).sort((a, b) => a - b);
      if (claimed.join(",") !== actual.join(",")) {
        readmeIssues.push(`README weights [${claimed}] do not match data.js [${actual}]`);
      }
    }

    const total = scoringModel.weights.reduce((n, d) => n + d.weight, 0);
    if (total !== 100) readmeIssues.push(`domain weights sum to ${total}, not 100`);
    if (total === 100 && !/=\s*100%/.test(readme)) {
      readmeIssues.push("README no longer states that the weights sum to 100%");
    }
  }

  /* The other two question counts, against their own sources. Both are
     correct today; both are prose numbers in a table, which is the form
     that rots. */
  const faqClaim = Number((readme.match(/faq\.html`?\s*\((\d+)\s+questions/) || [])[1]);
  const faqActual = (readFileSync(join(ROOT, "faq.html"), "utf8").match(/<h3/g) || []).length;
  if (!Number.isFinite(faqClaim)) {
    readmeIssues.push("README no longer states the FAQ question count");
  } else if (faqClaim !== faqActual) {
    readmeIssues.push(`README says the FAQ has ${faqClaim} questions; it has ${faqActual}`);
  }

  const mroClaim = Number((readme.match(/(\d+)\s+questions for Chief Engineers/) || [])[1]);
  const mroSrc = readFileSync(join(ROOT, "assets/js/page/tools-mro-readiness.js"), "utf8");
  const mroActual = Number((mroSrc.match(/Answer all (\d+) questions/) || [])[1]);
  if (!Number.isFinite(mroClaim) || !Number.isFinite(mroActual)) {
    readmeIssues.push("could not compare the MRO question count");
  } else if (mroClaim !== mroActual) {
    readmeIssues.push(`README says the MRO diagnostic has ${mroClaim} questions; it states ${mroActual}`);
  }

  /* The claim that went stale for twelve hours. It said bracketed
     placeholders remained in the legal pages and had to be filled
     before go-live; they had been filled that morning. */
  const bracketed = /\[(?:full registered|in brackets|and\/or the registered)/i;
  const legalHasBlanks = ["privacy.html", "terms.html"].some((f) =>
    bracketed.test(readFileSync(join(ROOT, f), "utf8"))
  );
  const readmeWarnsOfBlanks = /marked\s+`?\[in brackets\]`?\s+and must be completed/i.test(readme);
  if (legalHasBlanks !== readmeWarnsOfBlanks) {
    readmeIssues.push(
      legalHasBlanks
        ? "the legal pages carry bracketed placeholders and the README no longer warns of them"
        : "the README warns of bracketed placeholders in the legal pages; there are none"
    );
  }

  problems += readmeIssues.length;
  console.log(
    `\n${readmeIssues.length ? "❌" : "✅"} README matches the product it describes` +
      (readmeIssues.length ? "\n     - " + readmeIssues.join("\n     - ") : "")
  );
}

console.log(`\n${problems ? "❌ " + problems + " issue(s)" : "✅ all pages clean"}`);
process.exit(problems ? 1 : 0);
