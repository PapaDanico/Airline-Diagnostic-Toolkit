/* End-to-end behaviour tests for the DN Airline Diagnostic Toolkit.
   Runs the real pages in headless Chromium and asserts the core flows:
   diagnostic → results → engagement-key gate → empty state → a11y basics.
   Exits non-zero on any failure so CI fails loudly. Run: node tests/e2e.mjs */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = "file://" + ROOT;
let failures = 0;
const assert = (cond, msg) => { console.log((cond ? "PASS" : "FAIL") + " :: " + msg); if (!cond) failures++; };

const b = await chromium.launch();
const ctx = await b.newPage();
const errs = [];
ctx.on("pageerror", e => errs.push(e.message));

// 1. DIAGNOSTIC renders
await ctx.goto(base + "/diagnostic.html"); await ctx.waitForTimeout(400);
assert(await ctx.$$eval("input[type=radio]", e => e.length) === 200, "diagnostic renders 200 radios (8×5×5)");
assert(await ctx.$$eval(".q", e => e.length) === 40, "40 question blocks");
assert(await ctx.$eval("#see-results", b => b.disabled) === true, "see-results disabled before completion");

// 2. answer all 40 via the engine, reload, verify gate opens
await ctx.evaluate(() => { const ans = {}; DN.domains.forEach(d => ans[d.id] = [1, 2, 3, 2, 4]); saveAnswers(ans); });
await ctx.reload(); await ctx.waitForTimeout(300);
assert(await ctx.$eval("#see-results", b => b.disabled) === false, "see-results enabled after all answered");
assert(/40 of 40/.test(await ctx.$eval("#progress-label", e => e.textContent)), "progress shows 40/40");

// 3. RESULTS report
await ctx.goto(base + "/results.html"); await ctx.waitForTimeout(500);
assert(await ctx.$eval("#report", e => getComputedStyle(e).display !== "none"), "results report visible when complete");
const idx = parseInt(await ctx.$eval("#index-val", e => e.textContent), 10);
assert(idx > 0 && idx <= 100, `health index in range -> ${idx}`);
assert(await ctx.$$eval("#gap-body tr", e => e.length) === 8, "gap table has 8 rows");
assert(await ctx.$$eval("#radar polygon", e => e.length) >= 5, "radar drew rings + data polygons");
assert(await ctx.$$eval("#rx .rx", e => e.length) === 8, "prescriber rendered 8 cards");
assert(await ctx.$$eval('.rx a[href*="cask-calculator"]', a => a.length) >= 1, "cost prescriber links CASK tool");

// 4. ENGAGEMENT KEY gate
await ctx.fill("#key-input", "wrong-key"); await ctx.click("#key-apply"); await ctx.waitForTimeout(150);
assert(/Invalid/i.test(await ctx.$eval("#key-msg", e => e.textContent)), "wrong key rejected");
await ctx.fill("#key-input", "dn-engage-2026"); await ctx.click("#key-apply"); await ctx.waitForTimeout(150);
assert(/Unlocked/i.test(await ctx.$eval("#key-msg", e => e.textContent)), "correct key (lowercase) unlocks");
assert(await ctx.$$eval(".toolcard.unlocked", e => e.length) > 0, "toolcards unlock after key");

// 5. EMPTY STATE (partial/no answers never shows a misleading report)
await ctx.evaluate(() => localStorage.removeItem("dn_airline_scorecard_v2"));
await ctx.goto(base + "/results.html"); await ctx.waitForTimeout(300);
assert(await ctx.$eval("#empty", e => getComputedStyle(e).display !== "none"), "empty state shows when no answers");

// 6. CASK calculator core math + banding
await ctx.goto(base + "/tools/cask-calculator.html"); await ctx.waitForTimeout(250);
await ctx.fill("#opcost", "280000000"); await ctx.fill("#ask", "3000000000"); await ctx.fill("#target", "9");
await ctx.waitForTimeout(80);
assert(/9\.33 US/.test(await ctx.$eval("#cask", e => e.textContent)), "CASK computes 9.33 US¢/ASK");

// 7. A11Y basics
await ctx.goto(base + "/index.html"); await ctx.waitForTimeout(250);
assert(await ctx.$$eval("img", els => els.filter(i => !i.hasAttribute("alt")).length) === 0, "all <img> have alt");
assert(await ctx.$$eval("h1", e => e.length) >= 1, "index has an h1");
assert(await ctx.$$eval("button", els => els.filter(b => !b.textContent.trim() && !b.getAttribute("aria-label")).length) === 0, "all buttons labelled");

assert(errs.length === 0, "no page errors (" + (errs.join(" | ") || "none") + ")");
await b.close();

console.log(`\n${failures ? "❌ " + failures + " failure(s)" : "✅ all E2E checks passed"}`);
process.exit(failures ? 1 : 0);
