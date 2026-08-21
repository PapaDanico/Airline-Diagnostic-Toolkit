/* Every range slider answers a real mouse.
 *
 * The suite drove sliders before this, but only by dispatching synthetic
 * `input` events — which prove the handler is wired and prove nothing
 * about whether a person can actually move the control. A slider covered
 * by an overlay, or one whose value is stamped back over by a re-render,
 * passes a synthetic test and is dead under a cursor.
 *
 * So this clicks each track at both ends with a real mouse and requires
 * the value to land at the extremes.
 *
 * Two harness rules matter here, and both cost a false bug report before
 * they were understood:
 *
 *   1. `page.mouse` does NOT auto-scroll. An element below the fold has
 *      viewport coordinates outside the viewport and the click lands
 *      nowhere, so the control looks broken when it is fine.
 *   2. jk.css sets `html { scroll-behavior: smooth }`, so scrollIntoView
 *      animates and a click moments later hits a moving target. The site
 *      disables smooth scrolling under prefers-reduced-motion, so the
 *      browser is driven with reducedMotion:"reduce".
 *
 * Both are guarded below by asserting elementFromPoint at the control's
 * own centre returns the control, before any click is attempted. If that
 * assertion fails the harness is wrong, not the page — and the test says
 * so rather than blaming the product.
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "./verification.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4967;
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css",
  ".json":"application/json", ".woff2":"font/woff2", ".svg":"image/svg+xml",
  ".png":"image/png", ".ico":"image/x-icon", ".webmanifest":"application/manifest+json" };

const server = createServer(async (req, res) => {
  let p = req.url.split("?")[0];
  if (p.endsWith("/")) p += "index.html";
  try {
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise(r => server.listen(PORT, r));

/* Each page needs enough setup for its sliders to exist at all. */
const PAGES = [
  { path: "/tools/venture-builder.html", prep: async p => {
      const s = await p.$("#sector"); if (s) await s.selectOption({ index: 1 }).catch(() => {}); } },
  { path: "/tools/aoc-acquisition.html", prep: async p => {
      const s = await p.$("select"); if (s) await s.selectOption({ index: 1 }).catch(() => {}); } },
  { path: "/tools/revenue-builder.html", prep: async p => {
      await p.evaluate(() => localStorage.setItem("jk_revenue_v3", JSON.stringify({
        segments: [{ id:"s1", type:"executiveJet", aircraft:"Gulfstream G280", rate:9000,
                     doc:5250, hours:500, adHoc:100, blockHours:0, retainer:0,
                     retainerAmt:0, aircraftValue:15000000 }],
        sens: { rate:0, util:0, doc:0 }, cst: { programmeTotal:0, annualDebtService:0 } })));
      await p.reload(); await p.waitForTimeout(700); } },
];

/* Same resolution the other suites use: the container ships a pinned
   Chromium under /opt/pw-browsers, which is not the headless-shell build
   Playwright looks for by default. */
const EXECS = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/opt/pw-browsers/chromium"
];
const executablePath = EXECS.find(p => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const fails = [];
let checked = 0;

for (const { path, prep } of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.message).slice(0, 120)));

  await page.goto(`http://localhost:${PORT}${path}`);
  await page.waitForTimeout(600);
  if (prep) await prep(page);
  await page.waitForTimeout(600);

  const ids = await page.$$eval('input[type="range"]', els => els.map(e => e.id).filter(Boolean));
  console.log(`\n${path}  —  ${ids.length} slider(s)`);

  for (const id of ids) {
    checked++;
    const { min, max } = await page.$eval(`#${id}`, e => ({ min: +e.min, max: +e.max }));
    const span = max - min;

    const settle = async () => {
      await page.$eval(`#${id}`, e => e.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.waitForTimeout(180);
      const reachable = await page.evaluate(sel => {
        const el = document.getElementById(sel);
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      }, id);
      if (!reachable) throw new Error(`harness: #${id} is not the topmost element at its own centre`);
      return (await page.$(`#${id}`)).boundingBox();
    };

    try {
      let box = await settle();
      await page.mouse.click(box.x + 4, box.y + box.height / 2);
      await page.waitForTimeout(220);
      const lo = await page.$eval(`#${id}`, e => +e.value);

      box = await settle();
      await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
      await page.waitForTimeout(220);
      const hi = await page.$eval(`#${id}`, e => +e.value);

      const ok = lo <= min + span * 0.05 && hi >= max - span * 0.05 && hi > lo;
      console.log(`  ${ok ? "ok  " : "FAIL"} ${id.padEnd(16)} ${lo} → ${hi}   (${min}–${max})`);
      if (!ok) fails.push(`${path} #${id}: clicking the ends gave ${lo} → ${hi}, expected ${min} → ${max}`);
    } catch (e) {
      console.log(`  FAIL ${id.padEnd(16)} ${e.message}`);
      fails.push(`${path} #${id}: ${e.message}`);
    }
  }
  if (errs.length) fails.push(`${path}: page error — ${errs[0]}`);
  await page.close();
}

await browser.close();
server.close();

console.log(`\n${"─".repeat(52)}`);
/* Guard the denominator: if the setup above ever stops producing
   sliders, every assertion would vacuously pass and this file would
   report success while testing nothing. */
if (checked < 20) {
  record("sliders", { passed: false, checks: checked,
    headline: `only ${checked} sliders found — the page setup has drifted` });
  console.log(`❌  only ${checked} sliders found — expected at least 20; the page setup has drifted`);
  process.exit(1);
}
if (fails.length) {
  record("sliders", { passed: false, checks: checked,
    headline: `${fails.length} of ${checked} sliders did not answer a real mouse` });
  fails.forEach(f => console.log(`  ${f}`));
  console.log(`❌  ${fails.length} of ${checked} sliders failed a real mouse`);
  process.exit(1);
}
record("sliders", { passed: true, checks: checked,
  headline: `${checked} sliders driven with a real mouse, each answering at both ends of its track` });
console.log(`✅  ${checked} sliders each answer a real mouse at both ends of their track`);
