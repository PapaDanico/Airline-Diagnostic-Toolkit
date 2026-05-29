/* Rewrites the absolute site URL (canonical + Open Graph + Twitter tags)
   across every HTML page to a new domain — so moving off the netlify.app
   subdomain to a custom domain is one command instead of a manual hunt.

   Usage:
     node scripts/set-domain.mjs example.com
     node scripts/set-domain.mjs https://www.example.com

   Idempotent: it detects the current base URL from index.html's canonical
   link and replaces that host everywhere, so it is safe to re-run. */
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/set-domain.mjs <new-domain>");
  process.exit(1);
}

// Normalise the new domain to https://<host> (no trailing slash, no path).
const newHost = arg.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\/$/, "");
const newBase = "https://" + newHost;

// Discover the current base from index.html's canonical link.
const indexHtml = readFileSync("index.html", "utf8");
const m = indexHtml.match(/<link rel="canonical" href="(https?:\/\/[^/"]+)/i);
if (!m) { console.error("Could not find a canonical base URL in index.html"); process.exit(1); }
const oldBase = m[1];

if (oldBase === newBase) { console.log(`Already set to ${newBase} — nothing to do.`); process.exit(0); }

// Collect HTML files at the repo root and in tools/.
const files = [
  ...readdirSync(".").filter(f => f.endsWith(".html")),
  ...readdirSync("tools").filter(f => f.endsWith(".html")).map(f => join("tools", f))
];

let total = 0, touched = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  const count = src.split(oldBase).length - 1;
  if (count === 0) continue;
  writeFileSync(file, src.split(oldBase).join(newBase));
  total += count; touched++;
  console.log(`  ${file}: ${count} URL(s) updated`);
}

console.log(`\nDone. ${oldBase} → ${newBase} (${total} replacements across ${touched} files).`);
console.log("Note: this only updates page metadata. Also update the URLs in");
console.log("netlify.toml / vercel.json redirects only if they reference the full domain (they don't by default).");
