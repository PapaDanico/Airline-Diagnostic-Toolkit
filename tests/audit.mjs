/* Static + runtime audit across every page: console/JS errors, single h1,
   missing alt, unlabelled buttons, duplicate IDs, broken internal links,
   and horizontal overflow at desktop (1280) and mobile (390).
   Exits non-zero on any issue. Run: node tests/audit.mjs */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, normalize } from "node:path";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "diagnostic.html", "results.html", "embed.html", "privacy.html", "terms.html",
  "tools/fuel-optimizer.html", "tools/cask-calculator.html", "tools/operating-model-canvas.html", "tools/data-request.html", "tools/training-tna.html"];
// Note: data-request.html A3 tool already in list above
// Google Fonts is loaded from a CDN; in offline/sandbox CI that request can
// fail with a cert/network error that is irrelevant to the page itself.
const IGNORE = /ERR_CERT_AUTHORITY_INVALID|ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION)|fonts\.googleapis|fonts\.gstatic/;

const b = await chromium.launch();
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
  await p.goto("file://" + ROOT + "/" + pg); await p.waitForTimeout(300);
  const deskOX = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const r = await p.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    return {
      h1: document.querySelectorAll("h1").length,
      imgsNoAlt: [...document.querySelectorAll("img")].filter(i => !i.hasAttribute("alt")).length,
      btnsNoName: [...document.querySelectorAll("button")].filter(b => !(b.textContent.trim() || b.getAttribute("aria-label"))).length,
      dupes: [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))],
      links: [...new Set([...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")).filter(h => h && !/^(https?:|mailto:|#|tel:)/.test(h)))],
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
console.log(`\n${problems ? "❌ " + problems + " issue(s)" : "✅ all pages clean"}`);
process.exit(problems ? 1 : 0);
