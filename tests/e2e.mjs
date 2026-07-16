/* End-to-end behaviour tests for the DN Airline Diagnostic Toolkit.
   Runs the real pages in headless Chromium and asserts the core flows.
   Exits non-zero on any failure so CI fails loudly. Run: node tests/e2e.mjs */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = "file://" + ROOT;
let failures = 0;
let passed = 0;
const assert = (cond, msg) => {
  const ok = Boolean(cond);
  console.log((ok ? "  PASS" : "  FAIL") + " :: " + msg);
  if (ok) passed++; else failures++;
};
function section(name) { console.log(`\n── ${name} ──`); }

const DEV_EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch(existsSync(DEV_EXEC) ? { executablePath: DEV_EXEC } : {});
const page = await browser.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));

/* ─── 1. DIAGNOSTIC ─── */
section("Diagnostic page");
await page.goto(base + "/diagnostic.html"); await page.waitForTimeout(400);
assert(await page.$$eval("input[type=radio]", e => e.length) === 200, "renders 200 radios (8×5×5)");
assert(await page.$$eval(".q", e => e.length) === 40, "renders 40 question blocks");
assert(await page.$eval("#see-results", b => b.disabled), "see-results disabled before completion");

// Fill all 40 questions via localStorage and reload
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
});
await page.reload(); await page.waitForTimeout(300);
assert(!await page.$eval("#see-results", b => b.disabled), "see-results enabled after all answered");
assert(/40 of 40/.test(await page.$eval("#progress-label", e => e.textContent)), "progress shows 40/40");

/* ─── 2. RESULTS — core rendering ─── */
section("Results page — core rendering");
await page.goto(base + "/results.html"); await page.waitForTimeout(600);
assert(await page.$eval("#report", e => getComputedStyle(e).display !== "none"), "report div visible when answers present");
const idx = parseInt(await page.$eval("#index-val", e => e.textContent), 10);
assert(idx > 0 && idx <= 100, `health index in valid range (got ${idx})`);
assert(await page.$$eval("#gap-body tr", e => e.length) === 8, "gap table has 8 domain rows");
assert(await page.$$eval("#radar polygon", e => e.length) >= 5, "radar drew rings + data polygon");
assert(await page.$$eval("#rx .rx", e => e.length) === 8, "prescriber rendered 8 cards");
assert(await page.$$eval('.rx a[href*="cask-calculator"]', a => a.length) >= 1, "CASK prescriber link present");

/* ─── 3. RESULTS — new features: share URL, email capture, book-a-call ─── */
section("Results page — share URL & capture features");

// Share bar exists with expected buttons
assert(await page.$eval("#share-bar", el => el.children.length) >= 1, "share bar has at least one child");
const shareBarText = await page.$eval("#share-bar", el => el.textContent);
assert(/copy|share/i.test(shareBarText), "share bar contains share/copy text");

// Email capture section visible (not shared session)
assert(await page.$eval("#email-capture-section", el => getComputedStyle(el).display !== "none"), "email capture section visible in own session");
assert(await page.$("#capture-email") !== null, "capture email input present");
assert(await page.$("#capture-airline") !== null, "capture airline input present");
assert(await page.$("#capture-form") !== null, "capture form present");

// Book-a-call CTA
assert(await page.$("#book-email-btn") !== null, "book-a-call email button present");
assert(await page.$("#book-copy-btn") !== null, "book-a-call copy link button present");
const bookHref = await page.$eval("#book-email-btn", el => el.href);
assert(/mailto:|^#/.test(bookHref) || bookHref.length > 0, "book email button has non-empty href");

// Shared banner hidden in own session
const sharedBannerDisplay = await page.$eval("#shared-banner", el => getComputedStyle(el).display);
assert(sharedBannerDisplay === "none", "shared-banner hidden in own session");

/* ─── 4. RESULTS — share URL round-trip ─── */
section("Results page — share URL round-trip");

// Get the share URL by encoding current answers
const shareURL = await page.evaluate(() => {
  // replicate results.js encodeAnswers logic
  const answers = loadAnswers();
  const encoded = btoa(DN.domains.map(d =>
    d.questions.map((_, qi) => {
      const v = (answers[d.id] || [])[qi];
      return Number.isInteger(v) ? String(v) : "x";
    }).join("")
  ).join(""));
  return location.origin + location.pathname + "?s=" + encoded;
});
assert(shareURL.includes("?s="), "share URL contains ?s= param");

// Clear localStorage and load the share URL
await page.evaluate(() => localStorage.removeItem("dn_airline_scorecard_v2"));
const fileShareURL = shareURL.replace(base + "/results.html", base + "/results.html");
await page.goto(fileShareURL); await page.waitForTimeout(600);

// Report should load from shared param
assert(await page.$eval("#report", e => getComputedStyle(e).display !== "none"), "report visible when loaded via share URL");
const sharedIdx = parseInt(await page.$eval("#index-val", e => e.textContent), 10);
assert(sharedIdx === idx, `shared report renders same health index (${sharedIdx} === ${idx})`);

// Shared banner should appear
const sharedBannerVisible = await page.$eval("#shared-banner", el => getComputedStyle(el).display !== "none");
assert(sharedBannerVisible, "shared-banner visible when ?s= param present");

// Email capture should be hidden in shared session
const captureSectionDisplay = await page.$eval("#email-capture-section", el => getComputedStyle(el).display);
assert(captureSectionDisplay === "none", "email capture section hidden in shared session");

/* ─── 4b. RESULTS — corrupt/invalid ?s= param falls back to own data ─── */
section("Results page — corrupt ?s= param handling");
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
});
// right length, but characters outside 0-4/x — must be rejected by decode
const badS = btoa("9".repeat(40));
await page.goto(base + "/results.html?s=" + encodeURIComponent(badS)); await page.waitForTimeout(500);
assert(await page.$eval("#report", e => getComputedStyle(e).display !== "none"), "report falls back to own data on corrupt ?s=");
assert(await page.$eval("#shared-banner", el => getComputedStyle(el).display) === "none", "shared-banner hidden on corrupt ?s=");
assert(await page.$eval("#email-capture-section", el => getComputedStyle(el).display) !== "none", "email capture visible on corrupt ?s= (treated as own session)");

/* ─── 4c. DIAGNOSTIC — resume banner on partial progress ─── */
section("Diagnostic page — resume banner");
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach((d, i) => { ans[d.id] = i < 4 ? [1, 2, 3, 2, 4] : []; });
  saveAnswers(ans);
  localStorage.setItem("dn_onboarded", "1"); // keep onboarding overlay from blocking clicks
});
await page.goto(base + "/diagnostic.html"); await page.waitForTimeout(400);
assert(await page.$(".resume-banner") !== null, "resume banner shown with partial answers");
assert(/20 of 40/.test(await page.$eval(".resume-banner", e => e.textContent)), "resume banner shows 20 of 40");
await page.click("#resume-jump"); await page.waitForTimeout(300);
assert(await page.$(".resume-banner") === null, "resume banner dismissed after jump");
// no banner when nothing answered
await page.evaluate(() => localStorage.removeItem("dn_airline_scorecard_v2"));
await page.reload(); await page.waitForTimeout(300);
assert(await page.$(".resume-banner") === null, "no resume banner with zero answers");
// no banner when everything answered
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
});
await page.reload(); await page.waitForTimeout(300);
assert(await page.$(".resume-banner") === null, "no resume banner when fully answered");

/* ─── 4d. HOMEPAGE — hero radar preview ─── */
section("Homepage — hero radar preview");
await page.goto(base + "/index.html"); await page.waitForTimeout(400);
assert(await page.$eval("#hero-radar", s => s.querySelectorAll("polygon").length) >= 5, "hero radar renders rings + data polygon");
assert(await page.$eval("#hero-radar", s => s.querySelectorAll("text").length) === 8, "hero radar labels all 8 domains");

/* ─── 4e. RESULTS — scroll-triggered capture nudge ─── */
section("Results page — capture nudge");
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
  sessionStorage.removeItem("dn_capture_nudged");
  sessionStorage.removeItem("dn_report_sent");
});
await page.goto(base + "/results.html"); await page.waitForTimeout(500);
assert(await page.$("#capture-nudge") !== null, "nudge element mounted in own session");
assert(await page.$eval("#capture-nudge", e => e.style.bottom !== "0px"), "nudge hidden before 60% scroll");
await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.7));
// scroll-behavior:smooth animates the jump — poll until the bar lands
const nudgeShown = await page.waitForFunction(
  () => document.getElementById("capture-nudge")?.style.bottom === "0px",
  null, { timeout: 4000 }).then(() => true).catch(() => false);
assert(nudgeShown, "nudge slides in after 60% scroll");
await page.click("#nudge-x"); await page.waitForTimeout(150);
assert(await page.$("#capture-nudge") === null, "nudge removed on dismiss");
await page.reload(); await page.waitForTimeout(400);
assert(await page.$("#capture-nudge") === null, "nudge not re-mounted after dismissal (sessionStorage)");

/* ─── 4f. HOMEPAGE — interactive engagement phases ─── */
section("Homepage — interactive engagement phases");
await page.goto(base + "/index.html"); await page.waitForTimeout(400);
assert(await page.$$eval("button.phase", e => e.length) === 5, "5 phase cards rendered as buttons");
assert(await page.$$eval(".phase-detail[hidden]", e => e.length) === 5, "all phase details hidden initially");
await page.click("button.phase:first-child"); await page.waitForTimeout(100);
assert(await page.$eval("button.phase:first-child", b => b.getAttribute("aria-expanded")) === "true", "clicked phase reports aria-expanded=true");
assert(await page.$eval("button.phase:first-child .phase-detail", d => !d.hidden), "clicked phase shows detail");
assert(/Scorecard/.test(await page.$eval("button.phase:first-child .phase-detail", d => d.textContent)), "phase 1 detail lists its tools");
await page.click("button.phase:first-child"); await page.waitForTimeout(100);
assert(await page.$eval("button.phase:first-child .phase-detail", d => d.hidden), "second click collapses detail");

/* ─── 4g. HOMEPAGE — radar benchmark overlay ─── */
section("Homepage — radar benchmark overlay");
assert(await page.$("#hero-radar .radar-overlay") !== null, "dashed benchmark overlay polygon rendered");

/* ─── 4h. RESULTS — CSV calibration ─── */
section("Results page — CSV calibration");
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
  sessionStorage.setItem("dn_capture_nudged", "1");
});
await page.goto(base + "/results.html"); await page.waitForTimeout(500);
assert(/Q4 2024/.test(await page.$eval("#bench-asof", e => e.textContent)), "data-as-of stamp rendered from DN.benchmarkMeta");
assert((await page.$eval("#csv-template", a => a.href)).startsWith("data:text/csv"), "CSV template is a data-URI download");
// valid upload → calibrated view with computed metrics
await page.setInputFiles("#csv-file", {
  name: "cal.csv", mimeType: "text/csv",
  buffer: Buffer.from("total_ask,total_rpk,total_opex_usd,fuel_cost_usd\n1200000000,890000000,110000000,42000000\n")
});
await page.waitForTimeout(300);
const calib = await page.$eval("#calib-out", e => e.textContent);
assert(/74\.2%/.test(calib), "load factor computed (890/1200 = 74.2%)");
assert(/9\.17 US¢/.test(calib), "CASK computed (110m/1200m = 9.17¢)");
assert(/38\.2%/.test(calib), "fuel share computed (42/110 = 38.2%)");
// invalid upload → clear error, no crash
await page.setInputFiles("#csv-file", {
  name: "bad.csv", mimeType: "text/csv",
  buffer: Buffer.from("total_ask,total_rpk,total_opex_usd,fuel_cost_usd\n100,900,50,10\n")
});
await page.waitForTimeout(300);
assert(/RPK cannot exceed ASK/.test(await page.$eval("#calib-out", e => e.textContent)), "impossible RPK>ASK rejected with message");

/* ─── 4i. RESULTS — executive summary & debrief form ─── */
section("Results page — executive summary & debrief form");
const execTxt = await page.$eval("#exec-summary", e => e.textContent);
const idxNow = await page.$eval("#index-val", e => e.textContent);
assert(new RegExp(idxNow + "/100").test(execTxt), "exec summary quotes the health index");
const weakestName = await page.evaluate(() => {
  const s = computeScores(loadAnswers());
  return [...s.domains].sort((a, b) => a.pct - b.pct)[0].name;
});
assert(execTxt.includes(weakestName), "exec summary names the weakest domain");
assert(await page.$("form[name='debrief-request'][hidden]") !== null, "static debrief form present for Netlify detection");
for (const id of ["db-name", "db-email", "db-airline", "db-role", "db-week"]) {
  assert(await page.$("#" + id) !== null, `debrief field ${id} present`);
}
// print rules keep the exec summary but drop interactive sections
const printVis = await page.evaluate(() => {
  const probe = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el).display : "absent"; };
  document.body.offsetHeight;
  return { calibScreen: probe("#calibrate-section"), execScreen: probe("#exec-summary-section") };
});
assert(printVis.execScreen !== "none" && printVis.calibScreen !== "none", "exec summary + calibration visible on screen");
await page.emulateMedia({ media: "print" });
assert(await page.$eval("#calibrate-section", e => getComputedStyle(e).display) === "none", "calibration hidden in print");
assert(await page.$eval("#exec-summary-section", e => getComputedStyle(e).display) !== "none", "exec summary printed");
assert(await page.$eval(".book-cta-section", e => getComputedStyle(e).display) === "none", "debrief/book section hidden in print");
await page.emulateMedia({ media: "screen" });

/* ─── 4j. HOMEPAGE — results-in-practice; RESULTS — positioning; PARTNERS page ─── */
section("Results-in-practice, positioning line, partners page");
// positioning line appears in calibration output (uses last valid upload state — re-upload)
await page.setInputFiles("#csv-file", {
  name: "cal.csv", mimeType: "text/csv",
  buffer: Buffer.from("total_ask,total_rpk,total_opex_usd,fuel_cost_usd\n1200000000,890000000,110000000,42000000\n")
});
await page.waitForTimeout(300);
const posTxt = await page.$eval("#calib-out", e => e.textContent);
assert(/middle third/.test(posTxt), "positioning terciles rendered (74.2% LF → middle third)");
assert(/indicative terciles/.test(posTxt), "positioning labelled as indicative");
await page.goto(base + "/index.html"); await page.waitForTimeout(400);
assert(await page.$$eval("#results-in-practice .card", e => e.length) === 3, "3 indicative composite vignettes on homepage");
assert(/not attributable to any single airline/i.test(await page.$eval("#results-in-practice", e => e.textContent)), "privacy disclaimer present");
await page.goto(base + "/partners.html"); await page.waitForTimeout(400);
assert(/mailto:/.test(await page.$eval("[data-partner-mailto]", a => a.href)), "partner CTA mailto pre-filled");
assert(/partner=YOURNAME/.test(await page.$eval("section", e => e.textContent)), "partner link mechanics explained");

/* ─── 5. RESULTS — engagement key gate ─── */
section("Results page — engagement key gate");
// Reload with valid localStorage
await page.evaluate(() => {
  const ans = {};
  DN.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
});
await page.goto(base + "/results.html"); await page.waitForTimeout(500);

await page.fill("#key-input", "wrong-key"); await page.click("#key-apply"); await page.waitForTimeout(150);
assert(/Invalid/i.test(await page.$eval("#key-msg", e => e.textContent)), "wrong key rejected");
await page.fill("#key-input", "dn-engage-2026"); await page.click("#key-apply"); await page.waitForTimeout(150);
assert(/Unlocked/i.test(await page.$eval("#key-msg", e => e.textContent)), "correct key (lowercase) unlocks");
assert(await page.$$eval(".toolcard.unlocked", e => e.length) > 0, "toolcards unlock after valid key");

/* ─── 6. RESULTS — empty state ─── */
section("Results page — empty state");
await page.evaluate(() => localStorage.removeItem("dn_airline_scorecard_v2"));
await page.goto(base + "/results.html"); await page.waitForTimeout(300);
assert(await page.$eval("#empty", e => getComputedStyle(e).display !== "none"), "empty state shown when no answers");
assert(await page.$eval("#report", e => getComputedStyle(e).display === "none"), "report hidden in empty state");

/* ─── 7. CASK CALCULATOR ─── */
section("CASK calculator");
await page.goto(base + "/tools/cask-calculator.html"); await page.waitForTimeout(250);
await page.fill("#opcost", "280000000");
await page.fill("#ask", "3000000000");
await page.fill("#target", "9");
await page.waitForTimeout(100);
assert(/9\.33/.test(await page.$eval("#cask", e => e.textContent)), "CASK computes 9.33 US¢/ASK");
// fuel cost-line breakdown (item 4): 9.33¢ CASK × 34% fuel = 3.17¢; DN target 9¢×32% = 2.88¢ → gap 0.29¢
assert(/3\.17/.test(await page.$eval("#fuelQual", e => e.textContent)), "fuel CASK computed from cost-line % (3.17¢)");
assert(/0\.29/.test(await page.$eval("#fuelQual", e => e.textContent)), "fuel gap vs DN target computed (0.29¢)");
await page.selectOption("#fleetType", "ATR72");
assert(/Turboprop/.test(await page.$eval("#fleetNote", e => e.textContent)), "fleet-type stage-length note updates");

/* ─── 8. TNA — initial render ─── */
section("Training Needs Analysis — initial render");
// Clear any stored TNA data first
await page.evaluate(() => localStorage.removeItem("dn_tna_v1"));
await page.goto(base + "/tools/training-tna.html"); await page.waitForTimeout(400);

assert(await page.$$eval(".cur-select", e => e.length) === 39, "renders 39 current-level selects");
assert(await page.$$eval(".staff-group", e => e.length) === 4, "renders 4 staff group sections");
assert(await page.$eval("#stat-assessed", e => e.textContent) === "0 / 39", "assessed starts at 0/39");
assert(await page.$eval("#stat-high", e => e.textContent) === "0", "high count starts at 0");
assert(await page.$eval("#stat-cost", e => e.textContent) === "£0", "cost starts at £0");
assert(await page.$eval("#stat-avggap", e => e.textContent) === "—", "avg gap starts at —");
assert(await page.$eval("#progress-pct", e => e.textContent) === "0", "progress pct starts at 0");
assert(await page.$eval("#progress-count", e => e.textContent) === "0 / 39", "progress count starts at 0/39");
assert(await page.$eval("#top-gaps-section", e => getComputedStyle(e).display) === "none", "top-gaps section hidden initially");

/* ─── 9. TNA — gap & priority: HIGH ─── */
section("Training Needs Analysis — gap calculation & HIGH priority");
// Row 0-0: SOP compliance, target=5, cpp=600. Set current=2 → gap=3
await page.selectOption("tr[data-key='0-0'] .cur-select", "2"); await page.waitForTimeout(200);

assert(await page.$eval("tr[data-key='0-0'] .gap-val", e => e.textContent) === "3", "gap=3 when target=5, current=2");
assert(await page.$eval("tr[data-key='0-0'] .gap-val", e => e.classList.contains("gap-pos")), "gap cell has gap-pos class");
assert(/High/.test(await page.$eval("tr[data-key='0-0'] .priority", e => e.textContent)), "priority=High (gap≥2 & target≥4)");
assert(/pri-high/.test(await page.$eval("tr[data-key='0-0'] .priority span", e => e.className)), "priority badge is pri-high");
assert(await page.$eval("tr[data-key='0-0'] .cost", e => e.textContent) === "£1,800", "cost=£1,800 (gap 3 × £600)");

// Stats updated
assert(await page.$eval("#stat-assessed", e => e.textContent) === "1 / 39", "assessed increments to 1/39");
assert(await page.$eval("#stat-avggap", e => e.textContent) === "3.0", "avg gap = 3.0");
assert(await page.$eval("#stat-high", e => e.textContent) === "1", "high count = 1");
assert(await page.$eval("#stat-cost", e => e.textContent) === "£1,800", "total cost = £1,800");

// Progress
assert(await page.$eval("#progress-pct", e => e.textContent) !== "0", "progress pct > 0 after first entry");
assert(await page.$eval("#progress-count", e => e.textContent) === "1 / 39", "progress count = 1/39");

// Top gaps section now visible
assert(await page.$eval("#top-gaps-section", e => getComputedStyle(e).display) !== "none", "top-gaps section appears after first gap");

/* ─── 10. TNA — gap & priority: MEDIUM (gap≥2, target<4) ─── */
section("Training Needs Analysis — MEDIUM priority (gap≥2, target<4)");
// Row 1-4: Cultural awareness, target=3, cpp=250. Set current=1 → gap=2
await page.selectOption("tr[data-key='1-4'] .cur-select", "1"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='1-4'] .gap-val", e => e.textContent) === "2", "gap=2 when target=3, current=1");
assert(/Medium/.test(await page.$eval("tr[data-key='1-4'] .priority", e => e.textContent)), "priority=Medium (gap≥2, target<4)");
assert(await page.$eval("tr[data-key='1-4'] .cost", e => e.textContent) === "£500", "cost=£500 (gap 2 × £250)");

/* ─── 11. TNA — gap & priority: MEDIUM (gap=1, target≥4) ─── */
section("Training Needs Analysis — MEDIUM priority (gap=1, target≥4)");
// Row 0-3: Navigation, target=4, cpp=600. Set current=3 → gap=1
await page.selectOption("tr[data-key='0-3'] .cur-select", "3"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='0-3'] .gap-val", e => e.textContent) === "1", "gap=1 when target=4, current=3");
assert(/Medium/.test(await page.$eval("tr[data-key='0-3'] .priority", e => e.textContent)), "priority=Medium (gap=1, target=4)");

/* ─── 12. TNA — gap & priority: LOW (gap=1, target<4) ─── */
section("Training Needs Analysis — LOW priority (gap=1, target<4)");
// Row 1-4: Cultural awareness, target=3. Set current=2 → gap=1
await page.selectOption("tr[data-key='1-4'] .cur-select", "2"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='1-4'] .gap-val", e => e.textContent) === "1", "gap=1 when target=3, current=2");
assert(/Low/.test(await page.$eval("tr[data-key='1-4'] .priority", e => e.textContent)), "priority=Low (gap=1, target<4)");

/* ─── 13. TNA — gap & priority: ON TARGET ─── */
section("Training Needs Analysis — ON TARGET (gap=0)");
// Row 0-0 target=5; set current=5 → gap=0
await page.selectOption("tr[data-key='0-0'] .cur-select", "5"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='0-0'] .gap-val", e => e.textContent) === "0", "gap=0 when current=target");
assert(await page.$eval("tr[data-key='0-0'] .gap-val", e => e.classList.contains("gap-zero")), "gap cell has gap-zero class");
assert(/On target/.test(await page.$eval("tr[data-key='0-0'] .priority", e => e.textContent)), "priority=On target when gap=0");
assert(await page.$eval("tr[data-key='0-0'] .cost", e => e.textContent) === "£0", "cost=£0 when on target");

/* ─── 14. TNA — cost for engineers (£700/point) ─── */
section("Training Needs Analysis — engineer cost rate (£700/point)");
// Row 2-0: AME licensing, target=5, cpp=700. Set current=3 → gap=2
await page.selectOption("tr[data-key='2-0'] .cur-select", "3"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='2-0'] .gap-val", e => e.textContent) === "2", "engineer gap=2");
assert(await page.$eval("tr[data-key='2-0'] .cost", e => e.textContent) === "£1,400", "engineer cost=£1,400 (2×£700)");

/* ─── 15. TNA — cost for ground ops (£180/point) ─── */
section("Training Needs Analysis — ground ops cost rate (£180/point)");
// Row 3-0: Aircraft handling, target=4, cpp=180. Set current=2 → gap=2
await page.selectOption("tr[data-key='3-0'] .cur-select", "2"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='3-0'] .gap-val", e => e.textContent) === "2", "ground ops gap=2");
assert(await page.$eval("tr[data-key='3-0'] .cost", e => e.textContent) === "£360", "ground ops cost=£360 (2×£180)");

/* ─── 16. TNA — capped gap (current > target) ─── */
section("Training Needs Analysis — gap capped at 0 when current exceeds target");
// Row 3-10: Environmental, target=2. Set current=4 → gap should be 0 (not negative)
await page.selectOption("tr[data-key='3-10'] .cur-select", "4"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='3-10'] .gap-val", e => e.textContent) === "0", "gap capped at 0 when current > target");
assert(/On target/.test(await page.$eval("tr[data-key='3-10'] .priority", e => e.textContent)), "On target when current exceeds target");

/* ─── 17. TNA — group summaries ─── */
section("Training Needs Analysis — group summaries");
const groupSummaryCount = await page.$$eval(".group-summary", e => e.length);
assert(groupSummaryCount === 4, "4 group summary cards rendered");
const firstGroupName = await page.$eval(".group-summary:first-child .name", e => e.textContent);
assert(/Flight Crew/i.test(firstGroupName), "first group summary is Flight Crew");

/* ─── 18. TNA — top gaps sorted by gap size ─── */
section("Training Needs Analysis — top gaps list");
const topGapItems = await page.$$eval("#top-gaps-list .gap-item", items => items.length);
assert(topGapItems > 0, "top-gaps list has entries");
// Top gap should have biggest gap value; check the display is ordered (first item >= last)
const gapValues = await page.$$eval("#top-gaps-list .gap-item [style*='color:#dc2626']", els =>
  els.map(e => parseInt(e.textContent.replace("Gap: ", ""), 10))
);
const isSorted = gapValues.every((v, i) => i === 0 || v <= gapValues[i - 1]);
assert(isSorted, "top gaps list sorted by descending gap size");

/* ─── 19. TNA — keyboard shortcut ─── */
section("Training Needs Analysis — keyboard shortcuts (1-5)");
// Focus row 1-0 select (Emergency & safety, target=5, cabin) and press key "3"
const firstSelect = await page.$("tr[data-key='1-0'] .cur-select");
await firstSelect.focus();
await page.keyboard.press("3");
await page.waitForTimeout(200);
const kbValue = await page.$eval("tr[data-key='1-0'] .cur-select", e => e.value);
assert(kbValue === "3", "keyboard shortcut '3' sets select value to 3");
const kbGap = await page.$eval("tr[data-key='1-0'] .gap-val", e => e.textContent);
assert(kbGap === "2", "gap recalculates after keyboard shortcut (target=5 − current=3 = 2)");

/* ─── 20. TNA — localStorage persistence ─── */
section("Training Needs Analysis — localStorage persistence");
// Row 2-0 was set to current=3 above; reload and verify it persists
await page.reload(); await page.waitForTimeout(400);
const persistedValue = await page.$eval("tr[data-key='2-0'] .cur-select", e => e.value);
assert(persistedValue === "3", "entries persist across page reload (engineer row 2-0 = 3)");
const persistedGap = await page.$eval("tr[data-key='2-0'] .gap-val", e => e.textContent);
assert(persistedGap === "2", "gap recalculated correctly after reload");

/* ─── 21. TNA — reset button ─── */
section("Training Needs Analysis — reset button");
page.once("dialog", d => d.accept());
await page.click("#tna-reset"); await page.waitForTimeout(300);
const allValues = await page.$$eval(".cur-select", sels => sels.map(s => s.value));
assert(allValues.every(v => v === ""), "all selects cleared after reset");
assert(await page.$eval("#stat-assessed", e => e.textContent) === "0 / 39", "assessed resets to 0/39");
assert(await page.$eval("#stat-high", e => e.textContent) === "0", "high count resets to 0");
assert(await page.$eval("#stat-cost", e => e.textContent) === "£0", "cost resets to £0");
assert(await page.$eval("#top-gaps-section", e => getComputedStyle(e).display) === "none", "top-gaps hidden after reset");

/* ─── 22. TNA — export button (download triggered) ─── */
section("Training Needs Analysis — export button");
// Set a value so there's something to export, then verify download is triggered
await page.selectOption("tr[data-key='0-0'] .cur-select", "3"); await page.waitForTimeout(150);
const downloadPromise = page.waitForEvent("download", { timeout: 3000 }).catch(() => null);
await page.click("#tna-export");
const download = await downloadPromise;
assert(download !== null, "export button triggers a file download");
if (download) {
  assert(download.suggestedFilename().startsWith("dn-training-tna-"), "export filename starts with dn-training-tna-");
  assert(download.suggestedFilename().endsWith(".json"), "export filename ends with .json");
}

/* ─── 23. A11Y basics across pages ─── */
section("Accessibility basics");
for (const pg of ["index.html", "diagnostic.html", "results.html", "tools/training-tna.html"]) {
  if (pg === "results.html") {
    await page.evaluate(() => {
      const ans = {};
      DN.domains.forEach(d => { ans[d.id] = [2, 2, 2, 2, 2]; });
      saveAnswers(ans);
    });
  }
  await page.goto(base + "/" + pg); await page.waitForTimeout(300);
  const noAlt = await page.$$eval("img", imgs => imgs.filter(i => !i.hasAttribute("alt")).length);
  assert(noAlt === 0, `${pg}: all <img> have alt`);
  const h1Count = await page.$$eval("h1", h => h.length);
  assert(h1Count === 1, `${pg}: exactly one <h1> (got ${h1Count})`);
}

/* ─── 23b. Tool-page enquiry forms (replace mailto, item 2) ─── */
section("Tool pages — inline enquiry forms");
await page.goto(base + "/tools/fuel-optimizer.html"); await page.waitForTimeout(300);
assert(await page.$("form[name='tool-enquiry'][hidden]") !== null, "fuel page: static Netlify form present");
assert(await page.$("#fuel-enquiry [name=email]") !== null, "fuel page: enquiry form email field present");
assert(await page.$("#contact-cta") === null, "fuel page: bare mailto CTA removed");

await page.goto(base + "/tools/cask-calculator.html"); await page.waitForTimeout(300);
assert(await page.$("#cask-enquiry [name=email]") !== null, "CASK page: enquiry form email field present");
assert(await page.$("#contact-cta") === null, "CASK page: bare mailto CTA removed");

await page.goto(base + "/tools/operating-model-canvas.html"); await page.waitForTimeout(300);
assert(await page.$("#canvas-enquiry [name=email]") !== null, "canvas page: enquiry form email field present");
assert(await page.$("#contact-cta") === null, "canvas page: bare mailto CTA removed");

/* ─── 23c. How It Works page ─── */
section("How It Works page");
await page.goto(base + "/how-it-works.html"); await page.waitForTimeout(300);
assert(await page.$$eval(".phase", e => e.length) === 5, "5 engagement phases rendered from DN.phases");
assert(/15,000/.test(await page.$eval("body", e => e.textContent)), "investment range shown");
assert(/3.*Year-1 ROI/.test(await page.$eval("body", e => e.textContent)), "ROI guarantee shown");
assert(await page.$("#brief-enquiry [name=email]") !== null, "engagement brief form present");

/* ─── 25. MRO & Technical Readiness Diagnostic ─── */
section("MRO & Technical Readiness Diagnostic");
await page.evaluate(() => localStorage.removeItem("dn_mro_readiness_v1"));
await page.goto(base + "/tools/mro-readiness.html"); await page.waitForTimeout(300);
assert(await page.$$eval(".mro-q select", e => e.length) === 20, "renders 20 questions across 5 domains");
assert(await page.$eval("#mro-index", e => e.textContent.trim()) === "—", "index shows — before all questions answered");
await page.evaluate(() => {
  const ans = { compliance: [2,2,2,2], records: [2,2,2,2], reliability: [2,2,2,2], mel: [2,2,2,2], sourcing: [2,2,2,2] };
  localStorage.setItem("dn_mro_readiness_v1", JSON.stringify(ans));
});
await page.reload(); await page.waitForTimeout(300);
assert(await page.$eval("#mro-index", e => e.textContent.trim()) === "50", "index computes to 50 when every answer is 2/4");
assert(/Material gaps to close/.test(await page.$eval("#mro-band", e => e.textContent)), "band matches indexVerdict(50)");
assert(await page.$eval("#mro-radar", s => s.querySelectorAll("polygon").length) >= 5, "radar renders rings + data polygon");
assert(await page.$("#mro-enquiry [name=email]") !== null, "enquiry form present");
assert(await page.$("form[name='tool-enquiry'][hidden]") !== null, "static Netlify form present for build-time detection");
page.once("dialog", d => d.accept());
await page.click("#mro-reset"); await page.waitForTimeout(200);
assert(await page.$eval("#mro-index", e => e.textContent.trim()) === "—", "index resets to — after clearing answers");
assert(await page.$$eval(".mro-q select", sels => sels.every(s => s.value === "")), "all selects cleared after reset");

/* ─── 24. No JS errors ─── */
section("JavaScript errors");
assert(errs.length === 0, `no uncaught page errors (${errs.length ? errs.join(" | ") : "none"})`);

await browser.close();

console.log(`\n  ${passed} passed, ${failures} failed`);
console.log(failures ? `\n❌  ${failures} failure(s)` : "\n✅  all E2E checks passed");
process.exit(failures ? 1 : 0);
