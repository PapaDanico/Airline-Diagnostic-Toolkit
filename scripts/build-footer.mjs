/* Writes the one site footer into every page that carries one.

   ── WHY THIS EXISTS ─────────────────────────────────────────
   The footer was hand-written into each page, and by November 2026
   there were seventeen versions of it across thirty-two pages. Tool
   pages linked eight of the twenty tools; the privacy notice, the terms,
   the scorecard and the about page carried only a copyright line; the
   FAQ, the glossary and the regulatory index were reachable from some
   footers and not others. Nobody chose any of that. Each page was
   copied from whichever page was nearest when it was built, and the
   copies were never revisited when the site grew.

   So the footer is now generated, from one template here and from the
   tool list on tools/index.html. A tool added to the index appears in
   every footer the next time this runs, and `--check` (run by the audit,
   which both CI and the packager run) fails while any page has drifted.

   The parts of the footer that depend on the visitor rather than the
   page (the about block, the "learn the ground" strip, the partner
   co-brand, the year and version) are still mounted at runtime by
   common.js. This script owns only the static markup.

   A page never links to itself: the current page renders as plain text
   marked aria-current, the same convention the learn strip uses.

   Usage:
     node scripts/build-footer.mjs           # rewrite every footer
     node scripts/build-footer.mjs --check   # exit 1 if any page differs
*/
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

/* ---- tool groups, read from the tools index ----
   The index is the page a visitor uses to choose a tool, so it is the
   authority on what the tools are and which track each belongs to. */
function toolGroups() {
  // the main content only: the index's own footer repeats the same headings
  const full = readFileSync(join(ROOT, "tools", "index.html"), "utf8");
  const html = full.slice(full.indexOf("<main"), full.indexOf("</main>"));
  const groups = [];
  const heads = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)];
  for (let i = 0; i < heads.length; i++) {
    const title = heads[i][1].trim();
    if (!/^(Build a venture|Operate an airline)$/.test(title)) continue;
    const chunk = html.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : html.length);
    const tools = [];
    for (const card of chunk.split(/<div class="toolcard2/).slice(1)) {
      const name = (card.match(/<h3>([^<]+)<\/h3>/) || [])[1];
      const href = (card.match(/<a class="btn[^"]*" href="([^"]+)"/) || [])[1];
      if (!name || !href || /^https?:/.test(href)) continue;
      // hrefs on the index are relative to tools/; normalise to the site root
      const file = href.startsWith("../") ? href.slice(3) : "tools/" + href;
      // a card carrying the lock badge is a client toolkit (locked at the edge)
      tools.push({ name: name.trim(), file, locked: /class="lock-badge"/.test(card) });
    }
    groups.push({ title, tools });
  }
  if (groups.length !== 2 || groups.some(g => g.tools.length < 4)) {
    throw new Error("build-footer: could not read the two tool tracks from tools/index.html");
  }
  return groups;
}

/* the version line is filled from JK.brand at runtime; the markup carries
   the same text so it reads correctly with JavaScript off */
const VERSION = (readFileSync(join(ROOT, "assets", "js", "data.js"), "utf8")
  .match(/version:\s*"([^"]+)"/) || [])[1];
if (!VERSION) throw new Error("build-footer: JK.brand.version not found in data.js");

const COMPANY = [
  { name: "How an engagement works", file: "how-it-works.html" },
  { name: "Company profile", file: "company-profile.html" },
  { name: "Methodology", file: "methodology.html" },
  { name: "Partners", file: "partners.html" }
];
const LEGAL = [
  { name: "Privacy Notice", file: "privacy.html" },
  { name: "Terms of Use", file: "terms.html" }
];

/* "&" in a tool name is already an entity in the index markup */
const text = s => s.replace(/&(?!amp;|#\d+;|[a-z]+;)/g, "&amp;");

function footerFor(page) {
  // 404 is served at whatever depth the missing URL had, so it links from the root
  const inTools = page.startsWith("tools/");
  const href = file => page === "404.html" ? "/" + file
    : inTools ? (file.startsWith("tools/") ? file.slice(6) : "../" + file)
    : file;
  const badge = locked => locked ? ` <span class="lock-badge" aria-label="client toolkit">Client</span>` : "";
  const item = ({ name, file, locked }) => file === page
    ? `        <p><span aria-current="page">${text(name)}</span>${badge(locked)}</p>`
    : `        <p><a href="${href(file)}" data-keep-partner>${text(name)}</a>${badge(locked)}</p>`;
  const [build, operate] = toolGroups();
  const allTools = page === "tools/index.html"
    ? `<span aria-current="page">All tools</span>`
    : `<a href="${href("tools/index.html")}" data-keep-partner>All tools</a>`;

  return `<footer class="footer no-print">
  <div class="wrap">
    <div class="cols">
      <div class="f-brand">
        <a class="brand" href="${href("index.html")}" data-keep-partner><span data-logo="light"></span><span>JK &amp; Associates</span></a>
        <p class="f-tag">End-to-end aviation advisory for African operators and investors. <em data-cobrand></em></p>
        <p class="f-note">Free diagnostics and client toolkits that run in your browser. Nothing you type leaves your device unless you press Send.</p>
      </div>
      <div class="f-list">
        <h2>${build.title}</h2>
${build.tools.map(item).join("\n")}
      </div>
      <div class="f-list">
        <h2>${operate.title}</h2>
${operate.tools.map(item).join("\n")}
      </div>
      <div class="f-list">
        <h2>Company</h2>
${COMPANY.map(item).join("\n")}
        <h2>Contact</h2>
        <p><a data-email>info@aviationhubkenya.org</a></p>
        <p data-location>2nd Avenue, Cargo Terminal, JKIA, Nairobi</p>
        <h2>Legal</h2>
${LEGAL.map(item).join("\n")}
      </div>
    </div>
    <div class="ver">
      <span>&copy; <span data-year></span> JK &amp; Associates · Shaping Africa's Future, Together.</span>
      <span>${allTools} · <span data-version>${text(VERSION)}</span></span>
    </div>
  </div>
</footer>`;
}

const pages = [
  ...readdirSync(ROOT).filter(f => f.endsWith(".html")),
  ...readdirSync(join(ROOT, "tools")).filter(f => f.endsWith(".html")).map(f => "tools/" + f)
].sort();

const drift = [];
let written = 0;
for (const page of pages) {
  const path = join(ROOT, page);
  const html = readFileSync(path, "utf8");
  const m = html.match(/<footer class="footer[^"]*">[\s\S]*?<\/footer>/);
  if (!m) continue;               // embed and offline carry no footer by design
  const want = footerFor(page);
  if (m[0] === want) continue;
  if (CHECK) { drift.push(page); continue; }
  writeFileSync(path, html.replace(m[0], want));
  written++;
}

if (CHECK) {
  if (drift.length) {
    console.error(`footer out of date on ${drift.length} page(s): ${drift.join(", ")}\nrun: node scripts/build-footer.mjs`);
    process.exit(1);
  }
  console.log("footer: every page matches");
} else {
  console.log(`footer: rewrote ${written} page(s)`);
}
