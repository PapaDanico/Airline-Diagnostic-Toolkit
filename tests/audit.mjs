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
let mroModel = null;

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
            sizes: JK.domains.map(d => (d.questions ? d.questions.length : 0)),
            weights: JK.domains.map(d => ({ name: d.name, weight: d.weight })) }
        : null,
      /* The MRO tool's DOMAINS is module-scoped, so there is no namespace
         to read. What it actually rendered is a better answer anyway: the
         question count a visitor is asked IS the number of question
         selects on the page, not a number written in a string. */
      mro: (() => {
        const sels = [...document.querySelectorAll("#panels select[data-d][data-q]")];
        return sels.length
          ? { questions: sels.length, domains: new Set(sels.map((s) => s.dataset.d)).size }
          : null;
      })()
    };
  });
  if (r.scoring && !scoringModel) scoringModel = r.scoring;
  if (r.mro && !mroModel) mroModel = r.mro;
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

  /* Against what the tool rendered, not against the string in its source.
     The first version compared the README's number to "Answer all N
     questions" in tools-mro-readiness.js — one piece of prose against
     another. Add a question to DOMAINS and update neither, and the two
     agree at 20 while the tool asks 21: the check passes precisely
     because both claims are stale in the same direction. */
  const mroClaim = Number((readme.match(/(\d+)\s+questions for Chief Engineers/) || [])[1]);
  if (!mroModel) {
    readmeIssues.push("could not read the MRO tool's rendered questions — its count went unchecked");
  } else if (!Number.isFinite(mroClaim)) {
    readmeIssues.push("README no longer states the MRO question count");
  } else if (mroClaim !== mroModel.questions) {
    readmeIssues.push(`README says the MRO diagnostic has ${mroClaim} questions; it asks ${mroModel.questions}`);
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

/* ---- the same claims, in the copy visitors actually read ----

   The README states these numbers five times; the pages state them
   eleven, and a visitor is the one who acts on a wrong one. Guarding the
   developer-facing document and not the customer-facing one would have
   been the wrong half.

   Read out of the HTML source rather than the rendered text, because
   four of these live in <meta> tags. Those never appear on the page and
   are exactly what a search result shows, so they are claims made to
   more people than most of the visible ones.

   Each claim is matched in its own context. That is not fastidiousness:
   "20 questions across 5 domains" on the MRO page and "40 questions
   across 8 weighted domains" on the scorecard are the same sentence
   shape with different subjects, and a pattern loose enough to catch
   both would report each as the other being wrong. */
{
  const claimIssues = [];
  const q = () => scoringModel && scoringModel.questions;
  const d = () => scoringModel && scoringModel.count;

  const CLAIMS = [
    /* The scorecard. "weighted" is what separates these from the MRO's
       identically-shaped sentence, so tools/index.html can carry both. */
    { file: "diagnostic.html", what: "scorecard questions × domains",
      re: /(\d+)\s+questions\s+across\s+(\d+)\s+(?:weighted\s+)?domains/g, expect: () => [q(), d()] },
    { file: "tools/index.html", what: "scorecard questions × weighted domains",
      re: /(\d+)\s+questions\s+across\s+(\d+)\s+weighted\s+domains/g, expect: () => [q(), d()] },
    { file: "results.html", what: "questions to complete",
      re: /Complete all\s+(\d+)\s+questions/g, expect: () => [q()] },
    { file: "methodology.html", what: "the weighted domains",
      re: /The\s+(\d+)\s+domains and their weights/g, expect: () => [d()] },

    /* Stronger than the totals: 8 × 5 = 40 holds even if the split were
       uneven, so the page could be wrong while every total agreed. */
    { file: "methodology.html", what: "questions per domain",
      re: /Each domain has\s*<strong>(\d+)\s+questions<\/strong>/g, expect: () => [perDomain()] },
    { file: "methodology.html", what: "answers averaged per domain",
      re: /average of its\s+(\d+)\s+answers/g, expect: () => [perDomain()] },

    /* The MRO tool, against what it rendered. */
    { file: "tools/mro-readiness.html", what: "MRO questions × domains",
      re: /(\d+)\s+questions\s+across\s+(\d+)\s+domains/g,
      expect: () => [mroModel && mroModel.questions, mroModel && mroModel.domains] },
    { file: "tools/mro-readiness.html", what: "MRO questions to answer",
      re: /Answer the\s+(\d+)\s+questions/g, expect: () => [mroModel && mroModel.questions] },
    { file: "tools/index.html", what: "MRO questions on the tools index",
      re: /(\d+)\s+questions\s+across\s+airworthiness/g,
      expect: () => [mroModel && mroModel.questions] }
  ];

  /* "Each domain has 5 questions" is a claim about every domain, so an
     uneven split falsifies it whatever number the page prints. Returning
     the common size only when there IS one means the table below reports
     the mismatch; the uneven case is called out separately, because
     "says 5, product has 5" would be the wrong complaint about a model
     that no longer has a single answer. */
  function perDomain() {
    if (!scoringModel) return null;
    const distinct = [...new Set(scoringModel.sizes)];
    return distinct.length === 1 ? distinct[0] : NaN;
  }

  if (scoringModel && !Number.isFinite(perDomain())) {
    claimIssues.push(
      `methodology.html says every domain has the same number of questions; they have ` +
        `[${scoringModel.sizes.join(", ")}]`
    );
  }

  for (const c of CLAIMS) {
    const want = c.expect();
    if (want.some((n) => !Number.isFinite(n))) {
      claimIssues.push(`${c.file}: could not establish the truth for ${c.what} — it went unchecked`);
      continue;
    }
    const html = readFileSync(join(ROOT, c.file), "utf8");
    const found = [...html.matchAll(c.re)];

    /* At least one, and deliberately not an exact count — unlike the
       README, whose three domain-count sites are structural. Page copy
       gets edited for prose reasons, and pinning the number of times a
       sentence appears would fail on rewrites that are not claims going
       wrong. What must not happen silently is the pattern matching
       NOTHING: that is how a guard stops guarding without saying so. */
    if (found.length === 0) {
      claimIssues.push(`${c.file}: no longer states ${c.what} — this check has stopped checking anything`);
      continue;
    }
    for (const m of found) {
      want.forEach((expected, i) => {
        const got = Number(m[i + 1]);
        if (got !== expected) {
          claimIssues.push(`${c.file}: says ${got} for ${c.what}; the product has ${expected}`);
        }
      });
    }
  }

  problems += claimIssues.length;
  console.log(
    `\n${claimIssues.length ? "❌" : "✅"} the pages match the product they describe` +
      (claimIssues.length ? "\n     - " + claimIssues.join("\n     - ") : "")
  );
}

/* ---- structured data ----

   The JSON-LD on index.html described the scorecard as "a free, private
   40-question diagnostic across 8 weighted domains". Every other place
   that number appears is guarded — the README in three places, the page
   copy in eleven. This one was not: it could be changed to 55 questions
   across 9 domains and the whole suite passed.

   That is the worst of the four places to be wrong. Page copy is read by
   whoever is on the page; a JSON-LD description is read by search
   engines and by the assistants people now ask about products, and it is
   quoted back with the authority of the site itself. Nobody proofreads
   it, because nobody sees it.

   Three properties, and the first is the one that makes the others
   possible:

     1. Every block parses. A malformed JSON-LD block is dropped
        silently by every consumer — no error, no warning, just no
        structured data, exactly like a malformed CSP.

     2. Every number it states about the product is the product's.

     3. Every url points at a page that exists, and every @id it
        references is defined somewhere on this site. A publisher
        pointing at an @id nobody defines is not an error anywhere; it
        just fails to connect, and the organisation and the tool stay
        two unrelated things. */
{
  const ldIssues = [];
  /* Derived from the site's own canonical rather than hardcoded, so
     moving the domain does not turn every url check into a silent skip
     — which is how a guard stops guarding without failing. */
  const SITE_ORIGIN = (readFileSync(join(ROOT, "index.html"), "utf8")
    .match(/<link rel="canonical" href="(https?:\/\/[^/"]+)/) || [])[1];
  if (!SITE_ORIGIN) {
    ldIssues.push("index.html has no canonical to read the site origin from, so JSON-LD urls went unchecked");
  }
  const defined = new Set();
  const referenced = [];
  let blocks = 0;

  const ldPages = [
    ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
    ...readdirSync(join(ROOT, "tools")).filter((f) => f.endsWith(".html")).map((f) => "tools/" + f)
  ].sort();

  for (const file of ldPages) {
    const html = readFileSync(join(ROOT, file), "utf8");
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      blocks++;
      let parsed;
      try {
        parsed = JSON.parse(m[1]);
      } catch (e) {
        ldIssues.push(`${file}: the JSON-LD does not parse (${e.message}) — every consumer drops it silently`);
        continue;
      }
      const nodes = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
      for (const node of nodes) {
        if (typeof node !== "object" || node === null) continue;
        if (typeof node["@id"] === "string") defined.add(node["@id"]);

        /* A url that 404s is a claim about the site that the site
           contradicts. Checked against the file tree, since these are
           absolute and the tree is what gets deployed. */
        if (SITE_ORIGIN && typeof node.url === "string" && node.url.startsWith(SITE_ORIGIN)) {
          const rel = node.url.slice(SITE_ORIGIN.length).replace(/^\//, "");
          const target = rel === "" ? "index.html" : rel;
          if (!existsSync(join(ROOT, target))) {
            ldIssues.push(`${file}: JSON-LD points at ${node.url}, which is not a page in this repository`);
          }
        }

        /* Any nested { "@id": ... } with nothing else is a reference,
           not a definition. */
        for (const [key, value] of Object.entries(node)) {
          if (key === "@id") continue;
          if (value && typeof value === "object" && !Array.isArray(value) &&
              typeof value["@id"] === "string" && Object.keys(value).length === 1) {
            referenced.push({ file, key, id: value["@id"] });
          }
        }

        /* The claim that started this. Matched inside the JSON-LD only,
           so the numbers on the MRO tool cannot satisfy or falsify it. */
        if (typeof node.description === "string" && scoringModel) {
          const dm = node.description.match(/(\d+)[-\s]question[\s\S]*?across\s+(\d+)\s+(?:weighted\s+)?domains/);
          if (dm) {
            if (Number(dm[1]) !== scoringModel.questions) {
              ldIssues.push(`${file}: JSON-LD says ${dm[1]} questions; the product has ${scoringModel.questions}`);
            }
            if (Number(dm[2]) !== scoringModel.count) {
              ldIssues.push(`${file}: JSON-LD says ${dm[2]} domains; the product has ${scoringModel.count}`);
            }
          }
        }
      }
    }
  }

  for (const r of referenced) {
    if (!defined.has(r.id)) {
      ldIssues.push(`${r.file}: JSON-LD ${r.key} points at "${r.id}", which no page on this site defines`);
    }
  }

  /* The guard has to be guarding something. If the markup is ever
     removed wholesale, that should be a decision, not a silent pass. */
  if (blocks === 0) {
    ldIssues.push("no JSON-LD anywhere on the site — this check has stopped checking anything");
  }

  problems += ldIssues.length;
  console.log(
    `\n${ldIssues.length ? "❌" : "✅"} ${blocks} JSON-LD block(s) parse, ` +
      `${defined.size} @id(s) defined, ${referenced.length} reference(s) resolve` +
      (ldIssues.length ? "\n     - " + ldIssues.join("\n     - ") : "")
  );
}

/* ---- the README's count of the sitemap ----

   It said 19 URLs. There were 25. Nothing noticed, in a repository whose
   smoke test signs off with "the README's numbers are its own" — that
   motto covered the scoring model and stopped there.

   Cheap to check, and the failure it prevents is a reader trusting the
   document over the artefact. */
{
  const locs = (readFileSync(join(ROOT, "sitemap.xml"), "utf8").match(/<loc>/g) || []).length;
  const claimed = Number((readFileSync(join(ROOT, "README.md"), "utf8")
    .match(/`sitemap\.xml`\s*\((\d+)\s+URLs?\)/) || [])[1]);
  const issues = [];
  if (!Number.isFinite(claimed)) {
    issues.push("the README no longer states a sitemap URL count — this check has stopped checking anything");
  } else if (claimed !== locs) {
    issues.push(`the README says the sitemap has ${claimed} URLs; it has ${locs}`);
  }
  problems += issues.length;
  console.log(
    `\n${issues.length ? "❌" : "✅"} the README's sitemap count matches sitemap.xml (${locs} URLs)` +
      (issues.length ? "\n     - " + issues.join("\n     - ") : "")
  );
}

/* ---- what the pages say before the JavaScript runs ----

   Several facts about the practice live in data.js and are written into
   the markup at load: the version, the contact address, the office
   address. Each has a hook — <span data-version>, <a data-email>,
   <p data-location> — and each hook wraps hardcoded text. That text is
   the fallback: what a visitor sees before the script runs, all they
   ever see if it fails, and what a crawler reading the raw HTML gets.

   So every hook is also a copy of a fact data.js owns, with nothing
   keeping the two in step. Bumping data.js leaves every page announcing
   the old value to anyone whose JavaScript has not run, and the whole
   suite passes — verified by doing it with the version string.

   This started as a version-only check and was widened after the same
   shape turned up in the address. common.js carries a comment saying
   the office address "was hardcoded into twelve footers while
   JK.brand.location sat unread — the drift this file exists to
   prevent". The hook was duly added. The eleven stale fallbacks behind
   it were not touched, so the runtime was right and the pre-script
   paint said "Nairobi, Kenya" on eleven pages while the practice's
   published address was 2nd Avenue, Cargo Terminal, JKIA.

   Fixing the drift and leaving the check version-only would have been
   the same mistake a third time. */
{
  const fallbackIssues = [];
  const dataJs = readFileSync(join(ROOT, "assets", "js", "data.js"), "utf8");
  const field = (name) => (dataJs.match(new RegExp(`${name}:\\s*"([^"]+)"`)) || [])[1];

  /* attribute → the data.js field whose value it must repeat */
  const BOUND = [
    ["data-version", "version"],
    ["data-email", "email"],
    ["data-email-plain", "email"],
    ["data-location", "location"]
  ];

  const counts = [];
  for (const [attr, name] of BOUND) {
    const truth = field(name);
    if (!truth) {
      fallbackIssues.push(`data.js no longer states ${name}, so every ${attr} fallback went unchecked`);
      continue;
    }
    let seen = 0;
    for (const file of pages) {
      const html = readFileSync(join(ROOT, file), "utf8");
      /* (?=[\s>=]) because data-email is a prefix of data-email-plain,
         and without it every plain hook was also reported as an empty
         data-email — the guard naming the wrong attribute on four pages
         the first time it ran.

         [^>]* then stops at the tag's own close, so the capture is the
         element's text and not the rest of the document. */
      for (const m of html.matchAll(new RegExp(`${attr}(?=[\\s>=])[^>]*>([^<]*)<`, "g"))) {
        seen++;
        if (m[1].trim() !== truth) {
          fallbackIssues.push(`${file}: ${attr} falls back to "${m[1].trim()}"; data.js says "${truth}"`);
        }
      }
    }
    /* If a hook disappears entirely the check has stopped checking, and
       a green tick would say the opposite. */
    if (seen === 0) {
      fallbackIssues.push(`no page carries a ${attr} fallback any more — that hook has stopped being checked`);
    }
    counts.push(`${seen} ${attr}`);
  }

  problems += fallbackIssues.length;
  console.log(
    `\n${fallbackIssues.length ? "❌" : "✅"} pre-script fallbacks match data.js (${counts.join(", ")})` +
      (fallbackIssues.length ? "\n     - " + fallbackIssues.join("\n     - ") : "")
  );
}

/* ---- the manifest's icons actually exist, at the size it claims ----

   A manifest is a set of promises made to an installer, and a wrong one
   fails where nobody is looking: the install silently falls back, or the
   splash screen renders a stretched thumbnail on somebody's phone. The
   sizes field is a claim about a binary, and nothing here had ever
   opened the binary to check it.

   The dimensions are read out of the PNG header rather than trusted,
   because "512x512" in JSON and 512×512 on disk are exactly the kind of
   pair that agrees on the day it is written. */
{
  const iconIssues = [];
  const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
  const icons = manifest.icons || [];

  if (!icons.length) iconIssues.push("manifest declares no icons at all");

  /* Chromium installability wants at least one icon of 192px or more,
     and a 512 for the splash screen. Both are claims worth holding. */
  const declared = icons.map((i) => parseInt(i.sizes, 10)).filter(Number.isFinite);
  if (!declared.some((n) => n >= 192)) iconIssues.push("no icon of 192px or larger — the app is not installable");
  if (!declared.some((n) => n >= 512)) iconIssues.push("no icon of 512px or larger — the splash screen has nothing to render");
  if (!icons.some((i) => (i.purpose || "").split(/\s+/).includes("maskable"))) {
    iconIssues.push("no maskable icon — Android will letterbox the mark onto its own background");
  }

  for (const icon of icons) {
    const rel = (icon.src || "").replace(/^\//, "");
    const file = join(ROOT, rel);
    if (!existsSync(file)) { iconIssues.push(`${icon.src} is declared but not in the repository`); continue; }
    /* PNG: an 8-byte signature, then the IHDR chunk whose width and
       height are big-endian 32-bit at offsets 16 and 20. */
    const buf = readFileSync(file);
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) { iconIssues.push(`${icon.src} is not a PNG`); continue; }
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const [cw, ch] = (icon.sizes || "").split("x").map(Number);
    if (w !== cw || h !== ch) iconIssues.push(`${icon.src} claims ${icon.sizes} but is ${w}x${h}`);
    if (w !== h) iconIssues.push(`${icon.src} is not square (${w}x${h}) — every launcher assumes it is`);
  }

  problems += iconIssues.length;
  console.log(
    `\n${iconIssues.length ? "❌" : "✅"} the manifest's ${icons.length} icons exist at the sizes it claims` +
      (iconIssues.length ? "\n     - " + iconIssues.join("\n     - ") : "")
  );
}

/* ---- the downloadable documents ----

   The Fuel Tender Specification shipped as DN_Fuel_Tender_Spec.pdf with
   "DN Fuel Tender Specification" in its Title metadata, on a site that
   is JK & Associates everywhere else. DN is the pre-rebrand name. Its
   HTML source beside it was correct; the binary had been carried over
   and never re-rendered, and both were committed together after the
   rebrand.

   Nothing could have caught that. A checked-in binary does not diff, is
   not rendered in review, and its Title is metadata nobody opens — yet
   it is the one artefact a prospect receives by name, after handing
   over their work email, and the name is what lands in their downloads
   folder.

   So: every download the code offers must exist, and no shipped
   document may carry the old brand in its filename or its Title. */
{
  const docIssues = [];

  /* Every downloadUrl the site offers, read out of the source rather
     than listed here — a new tool with a new download is covered the
     day it ships. */
  const jsFiles = readdirSync(join(ROOT, "assets/js/page")).filter((f) => f.endsWith(".js"));
  const offered = new Set();
  for (const f of jsFiles) {
    const src = readFileSync(join(ROOT, "assets/js/page", f), "utf8");
    for (const m of src.matchAll(/downloadUrl:\s*"([^"]+)"/g)) offered.add(m[1]);
  }
  if (!offered.size) docIssues.push("no downloadUrl found in any page script — this check has stopped checking anything");

  for (const url of offered) {
    /* "../assets/..." is relative to /tools/, where these scripts run. */
    const rel = url.replace(/^\.\.\//, "");
    if (!existsSync(join(ROOT, rel))) { docIssues.push(`${url} is offered for download but is not in the repository`); continue; }
    if (/(^|\/)DN[_-]/i.test(rel)) docIssues.push(`${url} still carries the pre-rebrand name in its filename`);

    if (rel.endsWith(".pdf")) {
      /* The Title dictionary is written uncompressed by Chromium, so it
         can be read without a PDF library. */
      const head = readFileSync(join(ROOT, rel)).toString("latin1");
      const title = (head.match(/\/Title\s*\(([^)]*)\)/) || [])[1];
      if (!title) docIssues.push(`${url} has no Title metadata — a browser tab and a file manager will show its filename instead`);
      else if (/\bDN\b/.test(title)) docIssues.push(`${url} has "${title}" as its PDF Title — the pre-rebrand brand`);
    }
  }

  problems += docIssues.length;
  console.log(
    `\n${docIssues.length ? "❌" : "✅"} the ${offered.size} offered download(s) exist and carry the current brand` +
      (docIssues.length ? "\n     - " + docIssues.join("\n     - ") : "")
  );
}

/* ---- routing: _redirects against the file tree ----

   An external review reported 500s on five tool URLs. None of the five
   existed — they had been built from the tools' display names, and the
   site links to none of them. The catch-all below returns 404, not 500,
   so the status was wrong too.

   But it was half right, for a reason it did not name. The site was
   configured for two hosts, with clean-URL behavior split between host
   configs and _redirects. So /about worked on one host and 404'd on
   the other, and which host you tested changed the answer.

   Dead config that contradicts the live config is worse than none: it
   sends reviews down the wrong path and can weaken header enforcement.

   That leaves one host and these rules, checked for the mistake that
   actually happened — venture-dashboard was the only tool page with no
   extensionless rule, while its ten siblings had one. Nothing noticed,
   because a missing rewrite is not a broken link; it is a URL that
   simply does not answer. */
{
  const routeIssues = [];
  const lines = readFileSync(join(ROOT, "_redirects"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const rules = lines.map((l) => {
    const [from, to, status] = l.split(/\s+/);
    return { from, to, status: status || "" , raw: l };
  });

  /* Every page gets an extensionless route, or the set is inconsistent
     in a way only a typed URL reveals.

     This started as "every tool page" and was widened, because the
     asymmetry it left was real: the tools had clean URLs and the
     content pages did not. That was survivable only while legacy
     host-level clean-URL config quietly covered the gap on one host.
     Removing that config removed the cover too, so /about stopped
     answering everywhere rather than just on one host.

     The exemptions are named with their reason. All three lack a
     canonical, and the first two are noindex — the same three the page
     audit already treats as not-for-crawlers, arrived at independently
     here from what the files actually declare. */
  const NO_CLEAN_URL = new Map([
    ["404", "an error document; a typed /404 is not a destination"],
    ["offline", "the service worker's fallback, noindex"],
    ["embed", "an iframe target, not a page anyone navigates to"],
    ["index", "already served at /"],
    ["demo-results", "a canned demo linked from the tour, never typed"],
    ["results", "renders from session state; reached via its /results alias"]
  ]);

  const rewritten = new Set(rules.filter((r) => r.status === "200").map((r) => r.from));
  const wants = [
    ...readdirSync(ROOT).filter((f) => f.endsWith(".html")).map((f) => "/" + f.replace(/\.html$/, "")),
    ...readdirSync(join(ROOT, "tools")).filter((f) => f.endsWith(".html") && f !== "index.html")
      .map((f) => "/tools/" + f.replace(/\.html$/, ""))
  ];
  for (const want of wants) {
    const bare = want.replace(/^\/(tools\/)?/, "");
    if (rewritten.has(want) || NO_CLEAN_URL.has(bare)) continue;
    routeIssues.push(`${want} has no extensionless route while its siblings do`);
  }
  /* An exemption for a page that no longer exists is an open door for
     whatever reuses the name. */
  for (const [name, why] of NO_CLEAN_URL) {
    if (!existsSync(join(ROOT, `${name}.html`))) {
      routeIssues.push(`${name}.html is exempted from clean URLs but no longer exists (${why})`);
    }
  }

  /* A rule pointing at a file that no longer exists does not fail
     loudly — it falls through to the catch-all and 404s, which looks
     exactly like a URL that was never meant to work. */
  for (const r of rules) {
    if (!r.to || !r.to.startsWith("/")) continue;
    if (r.to === "/404.html") continue;
    const target = join(ROOT, r.to.replace(/^\//, ""));
    if (!existsSync(target)) routeIssues.push(`${r.from} points at ${r.to}, which is not in the repository`);
  }

  /* Netlify takes the FIRST match, so anything after the catch-all is
     dead, and a duplicated source silently shadows its second copy. */
  const catchAll = rules.findIndex((r) => r.from === "/*");
  if (catchAll === -1) routeIssues.push("no catch-all rule — an unknown path gets the host's default, not this site's 404");
  else if (catchAll !== rules.length - 1) {
    routeIssues.push(`${rules.length - 1 - catchAll} rule(s) sit after the /* catch-all and can never match`);
  }
  const seen = new Set();
  for (const r of rules) {
    if (seen.has(r.from)) routeIssues.push(`${r.from} is defined twice; the second is unreachable`);
    seen.add(r.from);
  }

  /* One host, one routing file. A second host's config that disagrees
     is how the CSP came to be enforced on one copy and not the other.

     vercel.json belongs on this list precisely BECAUSE it is gone. The
     list is a watchlist for a config coming back, not an inventory of
     what is here — now.json and firebase.json have never existed in
     this repository and are watched anyway. Removing the one entry with
     a history of causing the split-policy problem, on the grounds that
     the file was deleted, inverted what the list is for: `vercel init`
     would recreate it and nothing would fail.

     The file being absent is what makes the check cheap, not what makes
     it unnecessary. */
  for (const dead of ["vercel.json", "now.json", "firebase.json"]) {
    if (existsSync(join(ROOT, dead))) {
      routeIssues.push(`${dead} is present alongside _redirects — two hosts, two answers, and the review believed the wrong one`);
    }
  }

  problems += routeIssues.length;
  console.log(
    `\n${routeIssues.length ? "❌" : "✅"} ${rules.length} routing rules resolve; ` +
      `${wants.length - NO_CLEAN_URL.size} pages have an extensionless URL, ${NO_CLEAN_URL.size} exempted with a reason` +
      (routeIssues.length ? "\n     - " + routeIssues.join("\n     - ") : "")
  );
}

/* ---- storage writes are not swallowed ----

   Every storage call on this site is wrapped, and that is right: Safari
   private browsing throws on localStorage access itself, so one bare
   call at the top of a script kills every feature wired below it.

   But the wrapper was applied to reads and writes alike. A failed READ
   is a non-event — the caller takes the empty default and the visitor
   gets the first-visit experience, which is real and supported. A failed
   WRITE loses work: forty answers, or an hour in the venture builder,
   gone on reload with nothing having said so, and a results page that
   greets the person who just answered all forty with "complete all 40
   questions first".

   tests/storage.mjs proves the banner appears when a write is refused.
   This is the other half, and the cheaper half: it stops the next
   `try { setItem() } catch {}` from being written at all. A behavioural
   test can only cover the paths someone drove; this covers the grep.

   Reads are deliberately not checked. Silence is the correct handling
   for them, and a rule that flagged both would be ignored within a
   month. */
{
  const storeIssues = [];
  /* A write, then a catch with nothing in it. The `[^}]*` keeps this to
     a single statement so a catch that genuinely handles the failure —
     returns an error object, increments a skipped counter, calls
     reportingWrite — does not match. */
  const SWALLOWED = /\b(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|clear)\s*\([^;]*;?\s*\}?\s*catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\*[^*]*\*\/\s*)?\}/;

  const jsFiles = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".js")) jsFiles.push(full);
    }
  };
  walk(join(ROOT, "assets", "js"));

  for (const file of jsFiles) {
    const rel = file.slice(ROOT.length + 1);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (SWALLOWED.test(line)) {
        storeIssues.push(`${rel}:${i + 1} discards a failed storage write — route it through reportingWrite() so the visitor is told, or handle the error where it happens`);
      }
    });
  }

  /* The helper the rule points at has to exist, or the rule is advice
     nobody can follow. */
  const common = readFileSync(join(ROOT, "assets", "js", "common.js"), "utf8");
  if (!/function reportingWrite\s*\(/.test(common)) {
    storeIssues.push("common.js no longer defines reportingWrite(), which every write on the site is routed through");
  }
  if (!/reportingWrite/.test(common.split("Object.assign(window")[1] || "")) {
    storeIssues.push("reportingWrite() is not exported on window, so the page scripts calling it would throw");
  }

  problems += storeIssues.length;
  const routed = jsFiles.reduce((n, f) => n + (readFileSync(f, "utf8").match(/reportingWrite\(/g) || []).length, 0);
  console.log(
    `\n${storeIssues.length ? "❌" : "✅"} storage writes report their failures ` +
      `(${routed} call sites routed through reportingWrite across ${jsFiles.length} scripts)` +
      (storeIssues.length ? "\n     - " + storeIssues.join("\n     - ") : "")
  );
}

/* ---- every var(--token) resolves to a token that exists ----

   The brand ramp was renamed from --dn-* to --jk-* at some point, and
   the page-level <style> blocks were never brought along. Forty-four
   references to eight tokens defined nowhere survived across twelve
   pages, including five of the twelve tools. about.html had
   var(--jk-muted) and var(--dn-dark) on adjacent lines.

   Nothing caught it, and nothing was going to. An unresolvable var()
   makes the whole declaration invalid at computed-value time, so the
   property silently reverts to its inherited or initial value — which
   for `color` is usually the near-black it was going to be anyway.
   Every existing guard looked right:

     - the contrast sweep passed, because text falling back to inherited
       body colour on white has excellent contrast;
     - the console was clean, because a dead var() is not an error;
     - the pages rendered, because `border: 1px solid var(--gone)` does
       not fail loudly, it just stops being a border.

   What it cost: the About page's next-step cards lost their border and
   with it their hover state (border-color on border-style:none shows
   nothing), the company profile's stat cards and scoring table lost
   their rules, the privacy and terms callouts lost their tint, three
   calculators' result eyebrows lost the amber — and the one that was
   not cosmetic, the Training TNA's competency selects lost their focus
   ring entirely, because `.cur-select:focus` set `outline` to a dead
   token and outranks the global :focus-visible rule on specificity. A
   keyboard user got no indication at all of where they were.

   This is a grep, not a render, and that is the point: it covers every
   declaration on the site rather than the ones a test happened to
   drive. A reference carrying a fallback — var(--x, #fff) — is valid by
   construction and is not flagged. */
{
  const cssIssues = [];
  const defined = new Set();
  const referenced = new Map();   /* token -> [file, …] */

  const cssFiles = readdirSync(join(ROOT, "assets", "css"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => join("assets", "css", f));

  const collect = (rel, text) => {
    /* Definitions: a custom property in declaration position, wherever
       it lives — stylesheet, <style> block, or a style="" attribute. */
    for (const m of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) defined.add(m[1]);
    /* …and the ones JavaScript sets at runtime, which are just as real. */
    for (const m of text.matchAll(/setProperty\(\s*["'`](--[A-Za-z0-9_-]+)/g)) defined.add(m[1]);
    /* References. Matching only the no-fallback form: var(--x, #fff)
       stays valid whether or not --x exists, so it is not a defect. */
    for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
      if (!referenced.has(m[1])) referenced.set(m[1], []);
      referenced.get(m[1]).push(rel);
    }
  };

  const styleJs = [];
  const walkJs = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walkJs(full);
      else if (e.name.endsWith(".js")) styleJs.push(full.slice(ROOT.length + 1));
    }
  };
  walkJs(join(ROOT, "assets", "js"));

  for (const rel of [...cssFiles, ...pages, ...styleJs]) {
    collect(rel, readFileSync(join(ROOT, rel), "utf8"));
  }

  for (const [token, where] of referenced) {
    if (defined.has(token)) continue;
    const files = [...new Set(where)];
    cssIssues.push(
      `${token} is referenced ${where.length}× in ${files.length} file(s) ` +
      `(${files.slice(0, 4).join(", ")}${files.length > 4 ? `, +${files.length - 4} more` : ""}) ` +
      `but defined nowhere — every declaration using it is dropped`
    );
  }

  problems += cssIssues.length;
  console.log(
    `\n${cssIssues.length ? "❌" : "✅"} every var(--token) resolves ` +
      `(${referenced.size} distinct tokens referenced, ${defined.size} defined)` +
      (cssIssues.length ? "\n     - " + cssIssues.join("\n     - ") : "")
  );
}

/* ---- every class in the markup is a class the stylesheet knows ----

   The same half-finished rename that left the --dn-* tokens behind also
   left .band-fog behind: used on five sections across results.html,
   demo-results.html and how-it-works.html, defined nowhere. The live
   class is .band-parchment.

   A section that should be a tinted band renders as plain white — and
   because the neighbouring sections are also white, the band padding
   that was there to separate two backgrounds now separates nothing.
   That is what 307px of void on how-it-works.html was, and results.html
   — the page a visitor reaches after answering forty questions — had
   two of them.

   Nothing in the suite could see it. A class that does not exist has no
   styles to check, so there is no contrast to measure, no element to
   find missing, and no console warning. The page is not broken; it is
   just quietly plainer than it was drawn.

   Classes JavaScript adds at runtime count as used, and classes only
   ever written by JavaScript count as defined — the check is looking
   for names that exist in exactly one place and are therefore inert. */
{
  const classIssues = [];
  let styleText = readdirSync(join(ROOT, "assets", "css"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(ROOT, "assets", "css", f), "utf8"))
    .join("\n");
  for (const p of pages) {
    for (const m of readFileSync(join(ROOT, p), "utf8").matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      styleText += m[1];
    }
  }
  const definedClasses = new Set([...styleText.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)].map((m) => m[1]));

  const scriptFiles = [];
  const walkScripts = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walkScripts(full);
      else if (e.name.endsWith(".js")) scriptFiles.push(full);
    }
  };
  walkScripts(join(ROOT, "assets", "js"));
  const scriptText = scriptFiles.map((f) => readFileSync(f, "utf8")).join("\n");

  const usedClasses = new Map();   /* class -> first page it appears on */
  for (const p of pages) {
    const markup = readFileSync(join(ROOT, p), "utf8").replace(/<style[\s\S]*?<\/style>/g, "");
    for (const m of markup.matchAll(/class="([^"]+)"/g)) {
      for (const c of m[1].split(/\s+/)) if (c && !usedClasses.has(c)) usedClasses.set(c, p);
    }
  }

  for (const [cls, page] of usedClasses) {
    if (definedClasses.has(cls)) continue;
    if (scriptText.includes(cls)) continue;   /* a hook JS reads or writes */
    classIssues.push(`.${cls} is used in the markup (${page}) but no stylesheet defines it and no script touches it`);
  }

  problems += classIssues.length;
  console.log(
    `\n${classIssues.length ? "❌" : "✅"} every class in the markup is styled or scripted ` +
      `(${usedClasses.size} distinct classes across ${pages.length} pages)` +
      (classIssues.length ? "\n     - " + classIssues.join("\n     - ") : "")
  );
}

/* ---- design values stay bounded ----

   A ratchet, not a rule. It does not say the numbers below are right —
   they are not — it says they may not get worse without somebody
   deciding to make them worse.

   The counts, measured across jk.css and every page's <style> block and
   inline style attribute, excluding the :root token block:

     255 colour literals, 94 distinct values, of which 3 correspond to
         a token in the palette;
     344 font-size literals, 61 distinct values, against 0 type-scale
         tokens. The sister platform has 21 type tokens and 18 literals.

   Why there is no scale here instead of a ratchet, having tried: the
   font sizes are a continuum, not a set of clusters. Between 0.66rem
   and 1rem there are 31 distinct values with no gap wider than 4%, so
   any clustering collapses the whole band into one step and a 26.5%
   shift. A modular ratio is no kinder — the observed gradations sit
   about 6% apart and a 1.125 scale steps 11%, so adopting one re-wraps
   body copy across thirty pages.

   Which means consolidating type here is a design decision that moves
   visible text, not a mechanical cleanup, and it should be made
   deliberately rather than smuggled in behind a refactor. Likewise the
   colours: 112 of the 255 are exactly a token value, but 109 of those
   are #fff, and white does not drift. Replacing it would be churn
   wearing the costume of progress.

   So the ceiling is recorded at today's numbers. Reduce them by all
   means — the check prints the delta and asks you to lower the ceiling
   when you do — but the 62nd distinct font size does not arrive by
   accident. */
{
  /* Type came down from 344/61 to 9/9 when the scale landed. The nine
     that remain are the seven responsive clamp() display sizes, fluid by
     design and not a single step, and the two declarations marked
     `fitted:` — the figure inside the score ring and the lockup under
     the brand mark, sized to a graphic rather than to the document.

     Colour came down from 255/94 to 215/76, and the note above about
     #fff still holds: 108 of what remains is white, which does not
     drift and is not worth an indirection. The 39 that went were one
     page — training-tna, built in Tailwind's palette and never
     reconciled — repainted in the site's own. What is left is mostly
     the two standalone documents that do not load jk.css and a long
     tail used once each. */
  const CEILING = { colourUses: 204, colourDistinct: 64, fontUses: 9, fontDistinct: 9 };

  const jkCss = readFileSync(join(ROOT, "assets", "css", "jk.css"), "utf8");
  const rootBlock = jkCss.slice(jkCss.indexOf(":root"), jkCss.indexOf("/* ---------- reset"));

  const colours = new Map(), fonts = new Map();
  const tally = (text) => {
    for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const v = m[0].toLowerCase();
      colours.set(v, (colours.get(v) || 0) + 1);
    }
    for (const m of text.matchAll(/font-size:\s*([^;}]+)/g)) {
      const v = m[1].trim();
      if (v.startsWith("var(")) continue;
      fonts.set(v, (fonts.get(v) || 0) + 1);
    }
  };

  tally(jkCss.replace(rootBlock, ""));
  for (const f of readdirSync(join(ROOT, "assets", "css"))) {
    if (f.endsWith(".css") && f !== "jk.css") tally(readFileSync(join(ROOT, "assets", "css", f), "utf8"));
  }
  for (const p of pages) {
    const html = readFileSync(join(ROOT, p), "utf8");
    for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) tally(m[1]);
    for (const m of html.matchAll(/style="([^"]+)"/g)) tally(m[1]);
  }

  const now = {
    colourUses: [...colours.values()].reduce((a, b) => a + b, 0),
    colourDistinct: colours.size,
    fontUses: [...fonts.values()].reduce((a, b) => a + b, 0),
    fontDistinct: fonts.size
  };

  const tokenIssues = [];
  for (const [key, max] of Object.entries(CEILING)) {
    if (now[key] > max) {
      tokenIssues.push(`${key} is ${now[key]}, above the recorded ceiling of ${max} — ` +
        `a new hardcoded design value went in; use a token, or raise the ceiling on purpose`);
    }
  }
  /* A ceiling nobody lowers stops being a ratchet and becomes wallpaper. */
  const improved = Object.entries(CEILING).filter(([k, max]) => now[k] < max);
  if (improved.length) {
    tokenIssues.push(`ceiling is stale — ${improved.map(([k, max]) => `${k} is now ${now[k]}, under ${max}`).join("; ")}. ` +
      `Lower CEILING in this file so the gain is held.`);
  }

  problems += tokenIssues.length;
  console.log(
    `\n${tokenIssues.length ? "❌" : "✅"} design values bounded ` +
      `(${now.colourUses} colour literals / ${now.colourDistinct} distinct, ` +
      `${now.fontUses} font-size literals / ${now.fontDistinct} distinct)` +
      (tokenIssues.length ? "\n     - " + tokenIssues.join("\n     - ") : "")
  );
}

/* ---- the neutrals stay warm ----

   The palette block says so in a comment — "neutrals (warm, never
   grey-blue)" — and a comment is not enforceable. training-tna was
   built against Tailwind's default greys and shipped for as long as the
   history shows: #1f2937, #6b7280, #e5e7eb, #f9fafb, #cbd5e1 under a
   steel-blue #4A7FA5, on pages that also loaded the warm sheet. The
   header was terracotta and everything below the fold was cool, and
   nothing objected because nothing was looking.

   A neutral here is a colour whose channels are close enough together
   to read as grey rather than as a hue. Warm means red at or above
   blue, which every token in the palette satisfies. The threshold is
   deliberately loose: this catches a colour picked from the wrong
   family, not a shade someone nudged.

   Only pages that load jk.css are checked. embed.html and the fuel
   tender spec source are standalone documents with their own type and
   colour; they are not inconsistent with a sheet they never load. */
{
  const parse = (c) => {
    c = c.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(c)) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
    if (/^#[0-9a-f]{6}$/.test(c)) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  };
  const isCoolNeutral = (rgb) => {
    const [r, g, b] = rgb;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === 0) return false;
    if ((mx - mn) / mx > 0.22) return false;   // a hue, not a neutral
    if (mx - mn <= 2) return false;            // a true grey, no cast either way
    return b > r;
  };

  const jkCss = readFileSync(join(ROOT, "assets", "css", "jk.css"), "utf8");
  const LIT = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g;
  const cool = [];
  const scan = (text, where) => {
    for (const m of text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(LIT)) {
      const rgb = parse(m[0]);
      if (rgb && isCoolNeutral(rgb)) cool.push(`${m[0]} in ${where}`);
    }
  };
  scan(jkCss, "assets/css/jk.css");
  for (const p of pages) {
    const html = readFileSync(join(ROOT, p), "utf8");
    if (!html.includes("jk.css")) continue;
    for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) scan(m[1], p);
    for (const m of html.matchAll(/style="([^"]+)"/g)) scan(m[1], p);
  }
  for (const f of readdirSync(join(ROOT, "assets", "js", "page"))) {
    if (f.endsWith(".js")) scan(readFileSync(join(ROOT, "assets", "js", "page", f), "utf8"), `assets/js/page/${f}`);
  }

  /* --jk-green-lt is a pale green, not a neutral: its channels sit
     inside the saturation threshold but it is a wash with a hue, and
     green washes are blue-adjacent by construction. Named rather than
     loosened, so the test keeps catching greys. */
  const ALLOWED = new Set(["#E8F3ED".toLowerCase()]);
  const real = cool.filter((c) => !ALLOWED.has(c.split(" ")[0].toLowerCase()));

  problems += real.length ? 1 : 0;
  console.log(
    `\n${real.length ? "❌" : "✅"} the neutrals stay warm ` +
      `(${real.length} blue-shifted neutral${real.length === 1 ? "" : "s"} on pages that load jk.css)` +
      (real.length ? "\n     - " + real.join("\n     - ") : "")
  );
}

console.log(`\n${problems ? "❌ " + problems + " issue(s)" : "✅ all pages clean"}`);
process.exit(problems ? 1 : 0);
