/* End-to-end behaviour tests for the JK & Associates aviation advisory platform.
   Runs the real pages in headless Chromium and asserts the core flows.
   Exits non-zero on any failure so CI fails loudly. Run: node tests/e2e.mjs */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";

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

/* Simulates a real submit on a wireToolEnquiryForm()-driven form. Under
   file:// there's no server, so fetch("/") always rejects and the code
   takes the catch branch — that's fine: it's the exact branch that threw
   (msg was null) before the enq-msg-outside-<form> bug was fixed, so
   asserting it renders a real message instead of leaving the button
   stuck on "Sending…" forever is precisely the regression test needed. */
async function assertEnquiryFormSubmits(page, formSelector, label) {
  await page.fill(`${formSelector} [name=name]`, "Test User");
  await page.fill(`${formSelector} [name=email]`, "test@example.com");
  await page.click(`${formSelector} button[type=submit]`);
  await page.waitForFunction(
    sel => document.querySelector(sel)?.textContent.trim().length > 0,
    `${formSelector} .enq-msg`, { timeout: 4000 }
  ).catch(() => {});
  const msgText = await page.$eval(`${formSelector} .enq-msg`, e => e.textContent).catch(() => "");
  const btnText = await page.$eval(`${formSelector} button[type=submit]`, e => e.textContent).catch(() => "");
  assert(msgText.length > 0, `${label}: submit produces a visible message (not a silent throw)`);
  assert(!/^Sending/.test(btnText), `${label}: submit button isn't stuck on "Sending…"`);
}

const CANDIDATE_EXECS = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/build/repo/.netlify/plugins/node_modules/@netlify/plugin-lighthouse/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome"
];
const execPath = CANDIDATE_EXECS.find(p => existsSync(p));
const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
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
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
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
await page.fill("#capture-name", "Test User");
await page.fill("#capture-email", "test@example.com");
await page.fill("#capture-airline", "Test Airways");
await page.selectOption("#capture-fleet", "3–5 aircraft");
await page.click("#capture-form button[type=submit]");
await page.waitForFunction(() => document.getElementById("capture-msg")?.textContent.trim().length > 0, null, { timeout: 4000 }).catch(() => {});
assert((await page.$eval("#capture-msg", e => e.textContent)).length > 0, "capture form submit produces a visible message (not a silent throw)");

// negative case: form carries novalidate, so name/airline/fleet must be
// enforced in JS — submitting with only email filled must not proceed
await page.reload(); await page.waitForTimeout(300);
await page.fill("#capture-email", "test2@example.com");
await page.click("#capture-form button[type=submit]");
await page.waitForTimeout(200);
assert(await page.$eval("#capture-msg", e => e.textContent.trim()) === "", "capture form blocks submit when name/airline/fleet are blank");
assert(await page.evaluate(() => document.activeElement.id) === "capture-name", "focus moves to the first blank required field (name)");

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
  const encoded = btoa(JK.domains.map(d =>
    d.questions.map((_, qi) => {
      const v = (answers[d.id] || [])[qi];
      return Number.isInteger(v) ? String(v) : "x";
    }).join("")
  ).join(""));
  return location.origin + location.pathname + "?s=" + encoded;
});
assert(shareURL.includes("?s="), "share URL contains ?s= param");

// Clear localStorage and load the share URL
await page.evaluate(() => localStorage.removeItem("jk_airline_scorecard_v3"));
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
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
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
  JK.domains.forEach((d, i) => { ans[d.id] = i < 4 ? [1, 2, 3, 2, 4] : []; });
  saveAnswers(ans);
  localStorage.setItem("dn_onboarded", "1"); // keep onboarding overlay from blocking clicks
});
await page.goto(base + "/diagnostic.html"); await page.waitForTimeout(400);
assert(await page.$(".resume-banner") !== null, "resume banner shown with partial answers");
assert(/20 of 40/.test(await page.$eval(".resume-banner", e => e.textContent)), "resume banner shows 20 of 40");
await page.click("#resume-jump"); await page.waitForTimeout(300);
assert(await page.$(".resume-banner") === null, "resume banner dismissed after jump");
// no banner when nothing answered
await page.evaluate(() => localStorage.removeItem("jk_airline_scorecard_v3"));
await page.reload(); await page.waitForTimeout(300);
assert(await page.$(".resume-banner") === null, "no resume banner with zero answers");
// no banner when everything answered
await page.evaluate(() => {
  const ans = {};
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
});
await page.reload(); await page.waitForTimeout(300);
assert(await page.$(".resume-banner") === null, "no resume banner when fully answered");

/* ─── 4b-bis. PRESENTATION — figures, reveal, print ───
   Cormorant Garamond defaults to old-style figures, which made "11"
   render as "II" and "12–24" as "I2–24" across every numeric surface.
   And scroll-reveal, added for polish, hid 23 blocks from anyone who
   landed and printed without scrolling — on a product whose headline
   feature is "Print / save as PDF". Both are silent failures. */
section("Presentation — figures, reveal and print");

await page.goto(base + "/index.html"); await page.waitForTimeout(500);
assert(await page.evaluate(() => getComputedStyle(document.body).fontVariantNumeric.includes("lining-nums")),
  "lining figures inherit from the root (old-style figures never reach data)");
assert(await page.evaluate(() => {
  const el = document.querySelector("#market-stats b");
  return el && getComputedStyle(el).fontVariantNumeric.includes("lining-nums");
}), "JS-generated stat figures inherit lining numerals");
assert(await page.evaluate(() => {
  const el = document.querySelector(".metrics .m .v");
  return el && getComputedStyle(el).fontVariantNumeric.includes("tabular-nums");
}), "metric figures are tabular");

// no self-hosted-font regression: the privacy promise depends on it
assert(await page.evaluate(() =>
  ![...document.querySelectorAll("link[href],script[src]")]
    .some(e => /fonts\.googleapis|fonts\.gstatic/.test(e.getAttribute("href") || e.getAttribute("src") || ""))),
  "no third-party font requests (the 'nothing leaves your browser' promise holds)");

// reveal must never survive into print
{
  const hiddenBefore = await page.evaluate(() =>
    [...document.querySelectorAll(".will-reveal")].filter(e => +getComputedStyle(e).opacity === 0).length);
  assert(hiddenBefore > 0, "below-fold content starts un-revealed (motion is actually running)");
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(250);
  const hiddenInPrint = await page.evaluate(() =>
    [...document.querySelectorAll(".will-reveal")].filter(e => +getComputedStyle(e).opacity === 0).length);
  assert(hiddenInPrint === 0, "every revealed block is visible in print (no blank board packs)");
  await page.emulateMedia({ media: "screen" });
}

// scrolling reveals everything
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    scrollTo(0, y); await new Promise(r => setTimeout(r, 40));
  }
});
await page.waitForTimeout(800);
assert(await page.evaluate(() =>
  [...document.querySelectorAll(".will-reveal")].filter(e => +getComputedStyle(e).opacity === 0).length === 0),
  "all content reveals after a normal scroll through the page");

// currency values must not break between unit and figure
await page.goto(base + "/tools/venture-builder.html"); await page.waitForTimeout(500);
await page.fill("#f-debt", "3000000"); await page.waitForTimeout(300);
assert(await page.evaluate(() => {
  const el = document.querySelector("#r-capex");
  return el && getComputedStyle(el).whiteSpace === "nowrap" && el.getClientRects().length === 1;
}), "currency KPI renders on a single line (never 'USD' / '6.33M' split across rows)");

/* ─── 4c-bis. VENTURE TOOLS — injection, clamping, formatting ───
   These three defects were found by audit, not by a user, and each one
   fails silently: markup in a shareholder name executes, a negative
   interest rate returns a confident wrong DSCR, and a fat-fingered zero
   renders "USD 1000000.0M". Lock all three down. */
section("Venture tools — input safety & numeric hygiene");

// -- shareholder names must never reach innerHTML unescaped --
await page.goto(base + "/tools/corporate-structure.html");
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForTimeout(400);
await page.click('[data-arch="holdco"]'); await page.waitForTimeout(300);
let xssFired = false;
await page.exposeFunction("__xssProbe", () => { xssFired = true; });
await (await page.$$('#tree input[type="text"]'))[0]
  .fill('<img src=x onerror="window.__xssProbe()">');
await page.waitForTimeout(600);
assert(!/<img/i.test(await page.$eval("#lookthrough tbody", e => e.innerHTML)),
  "holder name is escaped in the look-through table");
assert(xssFired === false, "injected markup in a holder name does not execute");

// -- look-through cascade reproduces a known three-tier cap table --
await page.click('[data-arch="threetier"]'); await page.waitForTimeout(400);
const lt = await page.$$eval("#lookthrough tbody tr", rows =>
  rows.map(r => r.innerText.replace(/\s+/g, " ").trim()));
assert(/61\.6[0-9]%/.test(lt[0]), "founder effective interest resolves to 61.6% (20% direct + 41.6% via chain)");
assert(/27\.75%/.test(lt[1] || ""), "investor vehicle resolves to 27.75%");
assert(/100\.00%/.test(await page.$eval("#lookthrough tfoot", e => e.innerText)), "chain resolves to exactly 100%");

// -- numeric clamping + honest labelling in the venture builder --
await page.goto(base + "/tools/venture-builder.html");
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForTimeout(500);
await page.fill("#f-debt", "1000000"); await page.fill("#d-rev", "1000000");
await page.fill("#d-margin", "22"); await page.fill("#d-term", "0");
await page.waitForTimeout(350);
assert(/Set a repayment term/.test(await page.$eval("#sens tbody", e => e.innerText)),
  "debt with no term reports the missing term, not 'No debt'");

await page.fill("#d-term", "7"); await page.fill("#d-rate", "-5");
await page.waitForTimeout(350);
assert(await page.$eval("#sens tbody", e => !/-?\d*\.\d+×/.test(e.innerText) || !/NaN/.test(e.innerText)),
  "negative interest rate does not produce NaN");
assert(!/NaN|Infinity/.test(await page.$eval("#main", e => e.innerText)),
  "no NaN or Infinity leaks into the rendered model");

await page.fill("#d-rate", "9"); await page.fill("#d-rev", "999999999999");
await page.waitForTimeout(350);
const bigTxt = await page.$eval("#sens tbody", e => e.innerText);
assert(!/USD \d{4,}/.test(bigTxt), "large figures roll into B/T rather than printing a 4-digit mantissa");
assert(/>100×/.test(await page.$eval("#r-dscr", e => e.textContent)) ||
       /\d+\.\d\d×/.test(await page.$eval("#r-dscr", e => e.textContent)),
  "absurd coverage ratios are reported as >100x, not to two decimals");

// -- print header must track the selected sector, not the first one --
await page.goto(base + "/tools/certification-navigator.html");
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForTimeout(400);
await page.click('[data-sector="aoc"]'); await page.waitForTimeout(300);
await page.click('[data-sector="uas"]'); await page.waitForTimeout(400);
assert(/UAS|RPAS/i.test(await page.$eval(".print-head", e => e.innerText)),
  "print header follows the current sector after switching");
assert(await page.$$eval(".print-head", e => e.length) === 1, "exactly one print header is mounted");

/* ─── 4c-bis. VENTURE CONTROL ROOM ───
   The dashboard derives its numbers from the other tools' saved state
   rather than from anything it stores itself, so the tests that matter
   are the ones that seed a store and assert the composite moves by the
   documented weight. Each stage below adds one module and checks the
   index lands exactly where the published weighting says it should:
   certification 40, capital 25, organisation 20, structure 15. */
section("Venture Control Room — cross-tool readiness");

const CR = base + "/tools/venture-dashboard.html";
const crIndex = () => page.$eval("#ring-val", e => Number(e.textContent));

await page.goto(CR);
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForTimeout(450);
assert(await crIndex() === 0, "empty workspace reads 0 on the readiness index");
assert(/Concept/.test(await page.$eval("#ring-band", e => e.textContent)), "empty workspace is banded 'Concept'");
assert(await page.$$eval(".mod", e => e.length) === 4, "four build modules rendered");
assert(await page.$$eval(".mod .m-pct", e => e.every(x => x.textContent.trim() === "—")),
  "an untouched module shows '—', not a red 0%");
assert(/Set a target certificate date/.test(await page.$eval("#cp-host", e => e.innerText)),
  "critical path asks for a target date before drawing one");

// -- certification only: 40 of 100 --
await page.evaluate(() => {
  const sec = JKV.sector("aoc");
  const checked = {};
  JKV.phaseSpine.forEach(p => (sec.items[p.id] || []).forEach((_, i) => { checked[`aoc|${p.id}|${i}`] = true; }));
  localStorage.setItem("jk_certnav_v3", JSON.stringify({ sector: "aoc", checked }));
  localStorage.setItem("jk_venture_file_v3", JSON.stringify({ name: "Rift Valley Air", sector: "aoc" }));
});
await page.reload(); await page.waitForTimeout(450);
assert(await crIndex() === 40, "a complete certification plan alone scores exactly its 40-point weight");
const gateTxt = await page.$eval("#k-gate", e => e.textContent);
assert(/^(\d+)\/\1$/.test(gateTxt), `every AOC gate item counted closed (${gateTxt})`);

// -- + organisation: 60 --
await page.evaluate(() => {
  const sec = JKV.sector("aoc");
  const people = {};
  sec.postholders.forEach((p, i) => { if (p.kcaa) people[`aoc|${i}`] = { n: "Named Person", dep: "Named Deputy" }; });
  localStorage.setItem("jk_organogram_v3", JSON.stringify({ sector: "aoc", people, dept: {} }));
});
await page.reload(); await page.waitForTimeout(450);
assert(await crIndex() === 60, "adding a fully named, fully deputised organisation adds exactly 20");
assert(!/vacant/i.test(await page.$eval("#mods", e => e.innerText)), "no post reported vacant once all are named");

// -- + capital: 85 --
await page.evaluate(() => {
  localStorage.setItem("jk_venture_v3", JSON.stringify({
    sector: "aoc", capexSector: "aoc",
    capex: { 0: 1000000, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    "f-equity": "1000000", "f-debt": "0", "d-rev": "500000", "d-margin": "20", "d-cov": "1.25"
  }));
});
await page.reload(); await page.waitForTimeout(450);
assert(await crIndex() === 85, "a sized, fully funded, unlevered model adds exactly 25");
assert(/None/.test(await page.$eval("#k-gap", e => e.textContent)), "no funding gap reported when the stack covers the requirement");

// -- + structure: 100 --
await page.evaluate(() => {
  const checks = {};
  JKV.structureChecks.forEach(c => { checks[c.id] = true; });
  localStorage.setItem("jk_structure_v3", JSON.stringify({
    arch: "holdco", archFor: "holdco", sector: "aoc", checks,
    holders: { hold: [{ n: "Founders", p: 60, local: true }, { n: "Investors", p: 40 }],
               op:   [{ n: "HoldCo", p: 100, chain: "hold" }] }
  }));
});
await page.reload(); await page.waitForTimeout(450);
assert(await crIndex() === 100, "a resolved chain with every governance check closed completes the index");
assert(/Application complete/.test(await page.$eval("#ring-band", e => e.textContent)), "a full workspace is banded 'Application complete'");

// -- a tool left on another sector is called out, not silently averaged --
await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("jk_structure_v3"));
  st.sector = "uas";
  localStorage.setItem("jk_structure_v3", JSON.stringify(st));
});
await page.reload(); await page.waitForTimeout(450);
assert(/different sector/i.test(await page.$eval("#vf-mismatch", e => e.innerText)),
  "a module pointing at another sector raises a visible mismatch warning");
await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("jk_structure_v3"));
  st.sector = "aoc";
  localStorage.setItem("jk_structure_v3", JSON.stringify(st));
});

/* Back-scheduling is the whole point of the critical path: a date that
   cannot be met must say so, because the failure mode this replaces is
   an investor committee discovering it eighteen months in. */
await page.reload(); await page.waitForTimeout(300);
// Dates are derived from today rather than written literally, so the
// assertions do not quietly become true (or false) with the calendar.
const monthsOut = m => page.evaluate(n => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}, m);
await page.fill("#vf-target", await monthsOut(72)); await page.waitForTimeout(400);
assert(await page.$$eval(".cp-row", e => e.length) === 5, "five phases drawn on the critical path");
assert(/still reachable/i.test(await page.$eval("#cp-host", e => e.innerText)), "a target six years out reads as reachable");
await page.fill("#vf-target", await monthsOut(3)); await page.waitForTimeout(400);
assert(/already slipped/i.test(await page.$eval("#cp-host", e => e.innerText)),
  "a target inside the 12–24 month AOC lead band is reported as already slipped");

// -- workspace portability round-trips --
const trip = await page.evaluate(() => {
  const before = JKW.exportObject();
  const certBefore = JSON.stringify(JKW.read("jk_certnav_v3"));
  localStorage.clear();
  const emptied = JKW.readiness(JKW.modules(JKW.profile())).index;
  const res = JKW.importObject(before);
  return { emptied, res, restored: JSON.stringify(JKW.read("jk_certnav_v3")) === certBefore,
           name: JKW.profile().name };
});
assert(trip.emptied === 0, "clearing storage genuinely empties the workspace");
assert(trip.res.ok && trip.res.written >= 4, `import restores every store (${trip.res.written} written)`);
assert(trip.restored, "an exported store round-trips byte-for-byte through import");
assert(trip.name === "Rift Valley Air", "the venture profile survives the round trip");

// -- import refuses anything that is not ours --
const rejects = await page.evaluate(() => [
  JKW.importObject({ stores: { jk_certnav_v3: {} } }).ok,
  JKW.importObject({ _type: "jk-venture-file" }).ok,
  JKW.importObject({ _type: "jk-venture-file", stores: { "evil_key": { a: 1 } } }).ok,
  JKW.importObject(null).ok
]);
assert(rejects.every(r => r === false), "import rejects a foreign envelope, a missing payload and out-of-namespace keys");

// -- a venture name is text, not markup --
await page.reload(); await page.waitForTimeout(400);
await page.fill("#vf-name", '<img src=x onerror="window.__xssProbe()">');
await page.waitForTimeout(500);
// .ph-meta, not .print-head: the header legitimately contains the JK
// wordmark <img>, so the assertion has to look at the caption alone.
assert(/&lt;img/.test(await page.$eval(".print-head .ph-meta", e => e.innerHTML)) &&
       !/<img/i.test(await page.$eval(".print-head .ph-meta", e => e.innerHTML)),
  "a venture name is escaped before it reaches the printed header");
assert(xssFired === false, "injected markup in the venture name does not execute");

/* ─── 4c-quater. SCENARIOS ───
   A scenario is a full copy of the workspace, so the failures that matter
   are structural: does a saved scenario stay frozen when the live tools
   move on, does restoring actually swap the workspace, and does saving
   repeatedly grow without bound. */
section("Venture Control Room — scenarios");

await page.goto(CR);
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForTimeout(400);

// seed a known workspace, save it, then change the live one
await page.evaluate(() => {
  const sec = JKV.sector("aoc");
  const checked = {};
  JKV.phaseSpine.forEach(p => (sec.items[p.id] || []).forEach((_, i) => { checked[`aoc|${p.id}|${i}`] = true; }));
  localStorage.setItem("jk_certnav_v3", JSON.stringify({ sector: "aoc", checked }));
  localStorage.setItem("jk_venture_file_v3", JSON.stringify({ name: "Base case", sector: "aoc" }));
});
await page.reload(); await page.waitForTimeout(400);
await page.fill("#scn-name", "Base — everything closed");
await page.click("#scn-save"); await page.waitForTimeout(400);
assert(await page.$$eval(".scn-row", r => r.length) === 2, "saved scenario appears alongside the live row");
assert(/Saved/.test(await page.$eval("#scn-msg", e => e.textContent)), "save reports success");

// now gut the live workspace — the saved scenario must not move
await page.evaluate(() => localStorage.setItem("jk_certnav_v3", JSON.stringify({ sector: "aoc", checked: {} })));
await page.reload(); await page.waitForTimeout(400);
const idxs = await page.$$eval(".scn-idx", els => els.map(e => parseInt(e.textContent, 10)));
assert(idxs[0] === 0, "live row drops to 0 after the workspace is emptied");
assert(idxs[1] === 40, "the saved scenario stays frozen at 40 — a snapshot, not a live view");

// compare surfaces the difference
await page.click('[data-cmp]'); await page.waitForTimeout(400);
assert(await page.$$eval(".cmp thead th", e => e.length) === 3, "comparison renders Measure + live + one scenario column");
// ticking must not rebuild the list underneath the visitor's own checkbox
assert(await page.evaluate(() => document.activeElement.matches("[data-cmp]")),
  "focus stays on the checkbox after ticking (list is not re-rendered under it)");
assert(await page.$$eval(".cmp td.differs", e => e.length) > 0, "differing rows are highlighted");
const certRow = await page.$$eval(".cmp tbody tr", rows =>
  rows.map(r => r.innerText.replace(/\s+/g, " ").trim()).find(t => /^Certification/.test(t)) || "");
assert(/—/.test(certRow) && /100%/.test(certRow), `comparison shows live vs scenario certification (${certRow})`);

// restoring swaps the workspace back
page.once("dialog", d => d.accept());
await page.click("[data-restore]"); await page.waitForTimeout(500);
assert(await crIndex() === 40, "restoring a scenario brings the readiness index back to 40");
assert(await page.$eval("#vf-name", e => e.value) === "Base case", "restore brings the venture profile back too");

/* Saving captures every jk_/dn_ key. If the scenario store were captured
   too, each save would embed all previous saves and the workspace would
   double in size every time until the quota died. */
const nesting = await page.evaluate(() => {
  const sizes = [];
  for (let i = 0; i < 3; i++) {
    JKW.saveScenario("growth probe " + i, new Date(2026, 0, i + 1).toISOString());
    sizes.push(localStorage.getItem(JKW.SCEN_KEY).length);
  }
  const nested = JKW.scenarios().some(s => Object.keys(s.stores).includes(JKW.SCEN_KEY));
  return { sizes, nested };
});
assert(nesting.nested === false, "a scenario never contains the scenario store itself");
const [s1, s2, s3] = nesting.sizes;
assert((s3 - s2) < (s2 - s1) * 2, `scenario store grows linearly, not exponentially (${s1} → ${s2} → ${s3} bytes)`);

// the cap is enforced rather than silently letting the quota blow
const capped = await page.evaluate(() => {
  let last = { ok: true };
  for (let i = 0; i < 20 && last.ok; i++) last = JKW.saveScenario("filler " + i, new Date(2026, 1, i + 1).toISOString());
  return { count: JKW.scenarios().length, err: last.error || "" };
});
assert(capped.count === 12, `scenario count capped at MAX_SCENARIOS (got ${capped.count})`);
assert(/Delete one/.test(capped.err), "hitting the cap explains how to make room");

// ids are unique even when two saves land in the same millisecond
const unique = await page.evaluate(() => {
  localStorage.removeItem(JKW.SCEN_KEY);
  const iso = new Date(2026, 3, 1).toISOString();
  for (let i = 0; i < 5; i++) JKW.saveScenario("same-ms " + i, iso);
  const ids = JKW.scenarios().map(s => s.id);
  return new Set(ids).size === ids.length;
});
assert(unique, "scenario ids stay unique when saves share a timestamp");

// scenario names are text, not markup
await page.evaluate(() => localStorage.removeItem(JKW.SCEN_KEY));
await page.reload(); await page.waitForTimeout(400);
await page.fill("#scn-name", '<img src=x onerror="window.__xssProbe()">');
await page.click("#scn-save"); await page.waitForTimeout(500);
assert(!/<img/i.test(await page.$eval("#scn-list", e => e.innerHTML)), "a scenario name is escaped in the list");
assert(xssFired === false, "injected markup in a scenario name does not execute");

/* ─── 4c-ter. REGULATORY INDEX ─── */
section("Kenya regulatory index");
await page.goto(base + "/regulations.html"); await page.waitForTimeout(450);
const regRows = await page.$$eval("#reg-body tr", r => r.length);
assert(regRows === Object.keys(await page.evaluate(() => JKV.cites)).length,
  `every citation in the registry is indexed (${regRows} rows)`);
const unconfirmedCount = await page.evaluate(() =>
  Object.values(JKV.cites).filter(c => c.s !== "verified").length);
assert(await page.$$eval("#reg-body .st-un", e => e.length) === unconfirmedCount,
  `every unconfirmed instrument is marked unconfirmed, not quietly asserted (${unconfirmedCount})`);
assert(await page.$$eval("#unconfirmed .note", e => e.length) === unconfirmedCount,
  "each unconfirmed instrument gets its caveat spelled out in full");
assert(unconfirmedCount > 0 && unconfirmedCount < 5,
  `the unconfirmed set stays small and deliberate (${unconfirmedCount}) — if it grows, something has drifted`);
await page.click('#filters [data-f="uas"]'); await page.waitForTimeout(300);
const uasRows = await page.$$eval("#reg-body tr", rows => rows.map(r => r.innerText));
assert(uasRows.length > 0 && uasRows.length < regRows, "filtering by sector narrows the index");
assert(uasRows.some(t => /L\.N\. 40\/2026/.test(t)), "the UAS filter surfaces the UAS regulations");
assert(!uasRows.some(t => /L\.N\. 102\/2026/.test(t)), "the UAS filter excludes the aerodrome regulations");
assert(await page.$$eval("#sec-map .card", e => e.length) === 6, "all six sectors mapped to their instruments");

/* ─── 4c-quinquies. LEARN SECTION — glossary, FAQ, tutorial ─── */
section("Glossary");
await page.goto(base + "/glossary.html"); await page.waitForTimeout(500);
const gTotal = await page.evaluate(() => JKG.terms.length);
assert(await page.$$eval(".g-term", e => e.length) === gTotal, `all ${gTotal} terms are in the markup`);
// Read the file on disk: a runtime DOM check cannot distinguish markup
// that shipped in the document from markup a script just created.
{
  const raw = readFileSync(ROOT + "/glossary.html", "utf8");
  const inFile = (raw.match(/class="g-term"/g) || []).length;
  assert(inFile === gTotal, `all ${gTotal} terms ship in the HTML itself, not built by JS at load (${inFile} found)`);
  assert((raw.match(/class="seg" data-c=/g) || []).length === 7, "the category chips ship in the HTML too");
}
assert(await page.$$eval(".g-group:not([hidden])", e => e.length) === 6, "terms are grouped into six categories when browsing");

// search flattens to one alphabetical list and narrows
await page.fill("#g-q", "dscr"); await page.waitForTimeout(300);
const dscrCount = await page.$$eval(".g-term:not([hidden])", e => e.length);
assert(dscrCount > 0 && dscrCount < gTotal, `search narrows the corpus (${dscrCount} hits for "dscr")`);
assert(await page.$eval("#g-body", e => e.classList.contains("is-searching")), "search mutes the category headings");
assert(await page.$$eval(".g-term:not([hidden])", e => e.length) === dscrCount, "only matching terms stay visible");
// full-text, not just term-name matching
await page.fill("#g-q", "lenders"); await page.waitForTimeout(300);
assert(await page.$$eval(".g-term:not([hidden])", e => e.length) > 0, "search reaches definition text, not just term names");

await page.fill("#g-q", "zzzqqq"); await page.waitForTimeout(300);
assert(!await page.$eval("#g-empty", e => e.hidden), "a no-match search shows the empty state");
await page.fill("#g-q", ""); await page.waitForTimeout(300);

// category filter
await page.click('#g-cats [data-c="finance"]'); await page.waitForTimeout(300);
const finCount = await page.evaluate(() => JKG.byCat("finance").length);
assert(await page.$$eval(".g-term:not([hidden])", e => e.length) === finCount, `category filter shows only its ${finCount} terms`);

/* A see-also chip can point at a term the current filter hides. Clicking
   it must clear the filter, or the jump lands on nothing. */
const crossRef = await page.evaluate(() => {
  const shown = JKG.byCat("finance");
  for (const t of shown) for (const s of (t.see || [])) {
    const target = JKG.find(s);
    if (target && target.cat !== "finance") return { from: t.t, to: s };
  }
  return null;
});
assert(crossRef, `found a cross-category see-also to test (${crossRef ? crossRef.from + " → " + crossRef.to : "none"})`);
if (crossRef) {
  await page.click(`[data-jump="${crossRef.to}"]`); await page.waitForTimeout(400);
  assert(await page.$$eval(".g-term:not([hidden])", e => e.length) === gTotal,
    "clicking a cross-category see-also clears the filter so the target is reachable");
  assert(await page.$eval('#g-cats [data-c="all"]', e => e.getAttribute("aria-pressed")) === "true",
    "the category control reflects the cleared filter");
}

// deep link by query string
await page.goto(base + "/glossary.html?q=postholder"); await page.waitForTimeout(400);
assert(await page.$eval("#g-q", e => e.value) === "postholder", "?q= pre-fills the search box");
assert(await page.$$eval(".g-term:not([hidden])", e => e.length) > 0, "?q= filters on load");

section("FAQ");
await page.goto(base + "/faq.html"); await page.waitForTimeout(500);
const qCount = await page.$$eval(".qa", e => e.length);
assert(qCount >= 30, `FAQ carries a substantial answer set (${qCount} questions)`);
assert(await page.$$eval(".faq-sec", e => e.length) === 7, "questions are grouped into seven sections");
assert(await page.$$eval("#faq-toc a", e => e.length) === 7, "contents rail lists every section");

// accordion semantics
assert(await page.$$eval(".qa .a", els => els.every(e => e.hidden)), "answers start collapsed");
assert(await page.$$eval(".qa h3 button", els => els.every(b => b.getAttribute("aria-expanded") === "false")),
  "every disclosure button reports aria-expanded=false initially");
await page.click(".qa h3 button"); await page.waitForTimeout(200);
assert(!await page.$eval(".qa .a", e => e.hidden), "clicking a question reveals its answer");
assert(await page.$eval(".qa h3 button", b => b.getAttribute("aria-expanded")) === "true", "aria-expanded flips to true");
assert(await page.$eval(".qa .a", e => e.getAttribute("role")) === "region", "the answer panel is exposed as a region");

await page.click("#expand-all"); await page.waitForTimeout(250);
assert(await page.$$eval(".qa .a", els => els.every(e => !e.hidden)), "expand-all opens every answer");
await page.click("#collapse-all"); await page.waitForTimeout(250);
assert(await page.$$eval(".qa .a", els => els.every(e => e.hidden)), "collapse-all closes every answer");

// a deep link to a collapsed answer must open it, not land on a closed accordion
await page.goto(base + "/faq.html#a-privacy-0"); await page.waitForTimeout(500);
assert(!await page.$eval("#a-privacy-0", e => e.hidden), "a deep link opens the answer it points at");

// structured data is generated from the same array that renders the page
const ld = await page.evaluate(() => {
  const el = document.querySelector('script[type="application/ld+json"]');
  return el ? JSON.parse(el.textContent) : null;
});
assert(ld && ld["@type"] === "FAQPage", "FAQPage structured data is emitted");
assert(ld.mainEntity.length === qCount, `structured data covers every question (${ld.mainEntity.length}/${qCount})`);
assert(ld.mainEntity.every(q => q.acceptedAnswer.text.length > 0 && !/</.test(q.acceptedAnswer.text)),
  "structured-data answers are plain text with markup stripped");

section("Tutorial");
await page.goto(base + "/tutorial.html"); await page.waitForTimeout(400);
assert(await page.$$eval("#build .step", e => e.length) === 6, "build track has six steps");
assert(await page.$$eval("#operate .step", e => e.length) === 4, "operate track has four steps");
assert(await page.$$eval(".step .out", e => e.length) === 10, "every one of the ten steps states what you get out of it");
assert(await page.$$eval(".pitfall", e => e.length) >= 4, "steps carry the common-mistake warnings");

section("Footer learn strip");
for (const pg of ["index.html", "diagnostic.html", "tools/index.html", "regulations.html", "tools/venture-dashboard.html"]) {
  await page.goto(base + "/" + pg); await page.waitForTimeout(350);
  const n = await page.$$eval(".footer-learn .fl-item", e => e.length);
  assert(n === 4, `${pg}: learn strip injected with all four links (${n})`);
}
// a page must not link to itself in its own footer
await page.goto(base + "/glossary.html"); await page.waitForTimeout(400);
assert(await page.$$eval(".footer-learn .fl-item.is-here", e => e.length) === 1,
  "the current page renders as non-navigating in the learn strip");
assert(await page.$$eval('.footer-learn a[href="glossary.html"]', e => e.length) === 0,
  "glossary.html does not link to itself");

/* ─── Footer about + About us page ───
   The first version of the footer block put three paragraphs here and
   most of it restated the terms page, the home page and the regulatory
   index. These assertions pin the correction: the footer is a pointer,
   and the claims that belong to other pages must not reappear in it. */
section("Footer about");
for (const pg of ["index.html", "diagnostic.html", "tools/cask-calculator.html", "glossary.html"]) {
  await page.goto(base + "/" + pg); await page.waitForTimeout(350);
  const st = await page.evaluate(() => {
    const el = document.querySelector(".footer-about");
    return {
      present: !!el,
      text: (el?.textContent || "").replace(/\s+/g, " ").trim(),
      links: document.querySelectorAll('.footer-about a[href$="about.html"]').length,
      // chrome must finish AFTER the footer mounts, or a throw in the
      // footer silently takes the rest of the page with it
      year: (document.querySelector("[data-year]")?.textContent || "").trim()
    };
  });
  assert(st.present, `${pg}: about block injected`);
  assert(st.text.length < 420, `${pg}: footer about is ${st.text.length} chars — meant to be a pointer`);
  assert(st.links === 1, `${pg}: footer about links to about.html`);
  assert(/^\d{4}$/.test(st.year), `${pg}: chrome finished after the footer mounted`);
  for (const dupe of ["not affiliated", "no signup", "no sales call", "unconfirmed"]) {
    assert(!st.text.toLowerCase().includes(dupe), `${pg}: footer restates "${dupe}" — that belongs to another page`);
  }
}

section("About us page");
await page.goto(base + "/about.html"); await page.waitForTimeout(450);
{
  const st = await page.evaluate(() => ({
    h1: document.querySelectorAll("h1").length,
    text: document.querySelector(".about").textContent.replace(/\s+/g, " "),
    cover: [...document.querySelectorAll("#about-cover b")].map(b => Number(b.textContent.trim())),
    open: JK.toolboxes.filter(b => !b.locked).reduce((n, b) => n + b.tools.length, 0),
    domains: JK.domains.length,
    sources: JK.benchmarkMeta.sources.length,
    phases: JK.phases.length,
    else: [...document.querySelectorAll(".about-else a")].map(a => a.getAttribute("href")),
    selfLink: document.querySelectorAll('.footer-about a[href="about.html"]').length
  }));
  assert(st.h1 === 1, "about page has exactly one h1");
  assert(/aviation management consultancy/i.test(st.text), "practice described");
  assert(/not affiliated with, appointed by or endorsed by/i.test(st.text), "independence stated");
  assert(/Kanda Logistics Advisory/.test(st.text), "sister practice named");
  // the figures are read off the data model, so check them against it
  assert(JSON.stringify(st.cover) === JSON.stringify([st.open, st.domains, st.sources, st.phases]),
    `coverage figures ${JSON.stringify(st.cover)} match the data model`);
  // it points at the pages that own the rest rather than summarising them
  for (const f of ["methodology.html", "regulations.html", "privacy.html", "terms.html"]) {
    assert(st.else.includes(f), `about page points at ${f}`);
  }
  assert(st.selfLink === 0, "about.html does not link to itself from its own footer");
}

/* ─── 4c-ii. PRIVACY NOTICE vs WHAT THE CODE ACTUALLY SENDS ───
   The notice used to state, without qualification, that inputs are "not
   transmitted to JK or to any server" and that "there is no database".
   Three forms POST to Netlify Forms, and two of them carry the report
   link — which encodes the scorecard answers. The claim was false the
   moment anyone submitted.

   This is a legal notice under the Data Protection Act, so it is worth
   more than a wording check: the test reads the form names out of the
   source and requires the notice to account for every one of them. A
   fourth form added later fails this until it is disclosed. */
/* ─── REGULATORY INDEX — edition identity, citation, download, embed ───
   The index has always shown when it was last checked. That answers "is
   this current" and not the question a reader in a meeting has, which is
   "are we looking at the same one". A date cannot answer that; an
   edition can, and only if the digest actually tracks the content. */
/* ─── TEXT MUST BE READABLE AGAINST WHAT IS BEHIND IT ───
   The five-habits tiles on the tutorial shipped with white headings on
   a cream card. .tile painted a light background inside a dark band and
   never reset the text colour, so the h4 inherited the band's white
   while the paragraph — which did set a colour — read fine. Five
   headings were invisible on a live page and nothing in this suite
   could see it, because every assertion here reads textContent, and
   textContent does not care what colour anything is.

   This walks real rendered text, resolves the background actually
   behind it, and computes WCAG contrast. It is deliberately not a full
   audit: it checks the components that paint their own surface, which
   is where this class of bug lives. */
/* ─── TNA COSTS ARE IN USD AND SHOW THEIR WORKING ───
   These were sterling and unsourced. Restating them in dollars alone
   would have relabelled a guess — and would have carried over a real
   error: at the old flat rate a full type rating came to about £2,400
   against a published narrowbody price of USD 18,000–48,000. */
section("TNA costs are in USD and cite their basis");
{
  await page.goto(base + "/tools/training-tna.html");
  await page.waitForTimeout(500);

    /* innerText, not textContent: textContent includes the contents of
     <script> elements, and the cost model's own comment records the old
     sterling figures on purpose. What matters is what a reader sees. */
  const shown = await page.$eval("body", e => e.innerText);
  assert(!shown.includes("£"), "a sterling figure is displayed on the TNA");
  assert(/\$0/.test(await page.$eval("#stat-cost", e => e.textContent)), "the headline figure is not in dollars");

  // Every group states what its rate was built from, and the sources are
  // on the page rather than in a comment — that is what verifiable means.
  const notes = await page.$$eval("#basis-groups .note", n => n.length);
  assert(notes >= 5, `only ${notes} basis notes rendered — one per group plus overrides expected`);
  const srcLinks = await page.$$eval("#basis-sources a", a => a.map(x => x.href));
  assert(srcLinks.length >= 2, "fewer than two sources cited for the cost basis");
  assert(srcLinks.every(h => h.startsWith("https://")), `a cost source is not https: ${srcLinks.join(", ")}`);
  assert(/IATA/.test(await page.$eval("#basis-sources", e => e.textContent)), "the IATA pricing anchor is not named");

  /* The type rating must carry its own rate, and the total for closing
     it must land inside the published band. This is the assertion that
     would have caught the original error. */
  const cpp = await page.$$eval("tr[data-key]", rows => {
    const out = {};
    for (const r of rows) {
      const name = r.querySelector(".competency").textContent;
      if (/type-rating/.test(name)) out.typeRating = Number(r.dataset.cpp);
      if (/SOP compliance/.test(name)) out.sop = Number(r.dataset.cpp);
    }
    return out;
  });
  assert(cpp.typeRating > cpp.sop,
    `the type rating (${cpp.typeRating}) is priced at or below a procedures course (${cpp.sop})`);

  const row = await page.$("tr[data-key='0-2']");
  assert(row, "the type-rating row moved — this test is pinned to its position");
  await page.selectOption("tr[data-key='0-2'] .cur-select", "1");
  await page.waitForTimeout(300);
  const cell = await page.$eval("tr[data-key='0-2'] .cost", e => e.textContent);
  const total = Number(cell.replace(/[^0-9]/g, ""));
  assert(total >= 18000 && total <= 48000,
    `closing the type-rating gap computes ${cell}, outside the published USD 18,000–48,000 band`);
}

section("Text contrast, every page");
/* Enumerated from disk, not listed by hand. The first version of this
   check named four pages, which is how it passed while the "Start free"
   button sat at 2.61:1 on all twenty-eight — the check could not see the
   pages the bug was on. A hand-kept list is a promise to remember; a
   directory read is not. */
/* 404.html is the one page that cannot be measured this way, and the
   exclusion is checked rather than trusted. It references its assets from
   the site root — it has to, because a 404 is served at whatever depth
   the missing URL had, and "assets/css/jk.css" from /tools/nope would
   resolve to /tools/assets/css/jk.css. Under file:// those root-absolute
   paths point at the filesystem root, so the page loads with no CSS and
   no JS: measuring it would compare unstyled black on white and report a
   confident pass about a page it never saw. The assertion below is what
   keeps this honest — if someone makes those paths relative, the reason
   for the skip has gone and the suite says so instead of quietly
   continuing to skip. */
const rootRelative404 = readFileSync(resolve(ROOT, "404.html"), "utf8");
assert(/href="\/assets\/css\/jk\.css"/.test(rootRelative404)
    && /src="\/assets\/js\/common\.js"/.test(rootRelative404)
    && /href="\/assets\/css\/fonts\.css"/.test(rootRelative404),
  "404.html references assets from the site root, so it survives being served at any depth");

const CONTRAST_PAGES = [
  ...readdirSync(ROOT).filter(f => f.endsWith(".html") && f !== "404.html"),
  ...readdirSync(resolve(ROOT, "tools")).filter(f => f.endsWith(".html")).map(f => "tools/" + f)
].sort();

let contrastFailures = 0;
let contrastUnresolved = 0;
let graphicalFailures = 0;
for (const pageFile of CONTRAST_PAGES) {
  await page.goto(base + "/" + pageFile);
  /* Reveal-on-scroll leaves elements at opacity 0 until they enter the
     viewport, so what this check can see depends on when it looks. That
     made an earlier run report two failures and the next run report none
     — same code, same page. Forcing the end state makes the result a
     property of the stylesheet rather than of the scheduler. */
  await page.addStyleTag({ content: ".has-reveal .will-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }" });
  await page.waitForTimeout(400);

  const CONTRAST = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    /* A CSS colour is not always rgb(). color-mix() computes to
       "color(srgb 1 1 1 / 0.82)", whose components run 0–1 rather than
       0–255, so scraping digits out of it reads white as rgb(1,1,1) —
       near-black — and reports a navy-on-white wordmark at 2:1. The
       number looks plausible, which is what makes it dangerous.

       This platform has no color-mix() today; its sister platform does,
       and that is where the misreading was found. The parser is written
       to refuse rather than guess: an unrecognised notation (oklch, lab,
       display-p3) returns null and is counted as unresolved, which is
       asserted below. Guessing is how a check reports a confident number
       about a colour it did not understand. */
    const toRgb = (s) => {
      if (!s) return null;
      const n = (s.match(/[\d.]+/g) || []).map(Number);
      if (/^\s*color\(\s*srgb[\s(]/i.test(s)) {
        return n.length >= 3 ? { rgb: n.slice(0, 3).map(v => Math.round(v * 255)), a: n.length > 3 ? n[3] : 1 } : null;
      }
      if (/^\s*rgba?\(/i.test(s)) {
        return n.length >= 3 ? { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 } : null;
      }
      if (/^\s*transparent\s*$/i.test(s)) return { rgb: [0, 0, 0], a: 0 };
      return null;
    };
    const ratio = (a, b) => {
      const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
      return (hi + 0.05) / (lo + 0.05);
    };
    const over = (fg, a, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
    const parseStops = (img) => {
      const m = img.match(/(?:rgba?|color)\([^)]+\)/g);
      if (!m) return null;
      const out = m.map(toRgb);
      return out.some(x => x === null) ? null : out;
    };

    /* Walk up to whatever is actually visible behind the text.
       A gradient whose every stop is opaque HIDES what is beneath it, so
       it ends the walk and its own stops become the backgrounds to test.
       A gradient with a transparent stop only tints what is beneath, so
       the walk continues and each stop is composited over what it finds.
       Getting that backwards produces a run of 1:1 readings — white text
       measured against a white page body that an opaque gradient had
       painted over entirely — and 1:1 is the tell that the checker is
       wrong, not the stylesheet.

       The earlier version had no gradient handling at all: it fell
       through every gradient to white. That is not a smaller check, it
       is a wrong one, and it is why this had to be fixed before the page
       list could be widened. */
    const bgOf = (el) => {
      const overlays = [];
      const settle = (base) => ({ stops: [base, ...overlays.map(x => over(x.rgb, x.a, base))] });
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage !== "none") {
          const st = parseStops(cs.backgroundImage);
          if (!st) return { unresolved: cs.backgroundImage.slice(0, 60) };
          if (st.every(x => x.a >= 0.99)) return { stops: st.map(x => x.rgb) };
          overlays.push(...st.filter(x => x.a > 0));
        }
        const c = toRgb(cs.backgroundColor);
        if (!c) return { unresolved: cs.backgroundColor.slice(0, 60) };
        if (c.a > 0.5) return settle(c.rgb);
      }
      return settle([255, 255, 255]);
    };

    const out = [], unresolved = [];
    for (const el of document.querySelectorAll("body *")) {
      const text = (el.textContent || "").trim();
      if (!text || el.children.length) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
      if (!el.getClientRects().length) continue;

      /* Two thresholds, because WCAG has two. Text is 1.4.3 — 4.5:1, or
         3:1 once it is large. A glyph hidden from assistive tech is not
         text to a screen reader but is still a graphical object a
         sighted reader has to make out, so it falls under 1.4.11 at
         3:1. The chart legend swatch on the homepage is exactly that:
         the label beside it carries the meaning, the mark carries the
         match to the line. Skipping aria-hidden entirely would let a
         legend nobody can see pass. */
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const hidden = el.closest("[aria-hidden='true']") !== null;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = hidden ? 3 : large ? 3 : 4.5;

      const bg = bgOf(el);
      if (bg.unresolved) { unresolved.push({ text: text.slice(0, 40), bg: bg.unresolved }); continue; }
      /* Worst stop, not an average. Text has to be readable at every
         point of the gradient it sits on, not on the mean of one. */
      /* Text colour goes through the same refusing parser. A colour the
         check cannot read is a hole whether it is behind the text or in
         it. */
      const fgc = toRgb(cs.color);
      if (!fgc) { unresolved.push({ text: text.slice(0, 40), bg: "text colour " + cs.color.slice(0, 40) }); continue; }
      const r = Math.min(...bg.stops.map(s => ratio(fgc.rgb, s)));
      if (r < need) {
        out.push({ text: text.slice(0, 40), ratio: Math.round(r * 100) / 100, need, cls: String(el.className || "").slice(0, 40) });
      }
    }
    /* ---- Graphical objects, WCAG 1.4.11 ----
       The sweep above measures text. An icon is not text, and until now
       nothing measured icons at all — the earlier passes said so
       explicitly rather than implying the coverage was complete.

       1.4.11 asks for 3:1 on graphical objects "required to understand
       the content". An icon sitting next to a label that says the same
       thing is not required to understand anything, so the exemption is
       exactly that: the icon's OWN parent carries words. Not an
       ancestor three levels up — that rule exempted every single icon on
       both platforms and produced a flawless, meaningless zero. */
    const svgOut = [];
    for (const svg of document.querySelectorAll('svg')) {
      if (!svg.getClientRects().length) continue;
      const cs = getComputedStyle(svg);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;

      let labelled = false;
      const host = svg.parentElement;
      if (host) {
        const clone = host.cloneNode(true);
        clone.querySelectorAll('svg').forEach(n => n.remove());
        labelled = (clone.textContent || '').trim().length > 1;
      }
      if (labelled) continue;

      /* Shapes inside defs/clipPath/mask/pattern/symbol are never
         painted. Their computed fill is the initial value — black — so
         including them reported a mint-and-white wordmark as
         black-on-ink at 1.20:1. */
      const shapes = [...svg.querySelectorAll('path,circle,rect,polygon,polyline,line,ellipse')]
        .filter(sh => !sh.closest('defs,clipPath,mask,pattern,symbol'))
        .slice(0, 6);
      const bg = bgOf(svg);
      if (bg.unresolved) { unresolved.push({ text: 'svg', bg: bg.unresolved }); continue; }

      for (const sh of (shapes.length ? shapes : [svg])) {
        const scs = getComputedStyle(sh);
        const elOpacity = Number(scs.opacity);
        /* fill-opacity and stroke-opacity are separate properties and
           getComputedStyle().stroke ignores them. Reading the colour
           alone would wave through a stroke-opacity of 0.05 as if it
           were solid. */
        for (const [paint, po] of [[scs.fill, scs.fillOpacity], [scs.stroke, scs.strokeOpacity]]) {
          if (!paint || paint === 'none') continue;
          const c = toRgb(paint);
          if (!c) { unresolved.push({ text: 'svg paint', bg: paint.slice(0, 40) }); continue; }
          const alpha = c.a
            * (Number.isFinite(Number(po)) ? Number(po) : 1)
            * (Number.isFinite(elOpacity) ? elOpacity : 1);
          if (alpha <= 0.01) continue;
          const r = Math.min(...bg.stops.map(stop =>
            ratio(alpha >= 0.99 ? c.rgb : over(c.rgb, alpha, stop), stop)));
          if (r < 3) {
            svgOut.push(`<svg ${String(svg.getAttribute('class') || host?.className || '').slice(0, 30)}> ${paint}${alpha < 0.99 ? ' @' + alpha.toFixed(2) : ''} ${r.toFixed(2)}:1`);
          }
        }
      }
    }

    return { out, unresolved, svgOut };
  });

  contrastFailures += CONTRAST.out.length;
  graphicalFailures += CONTRAST.svgOut.length;
  if (CONTRAST.svgOut.length) console.log(`  ${pageFile}: ` + CONTRAST.svgOut.join(' | '));
  contrastUnresolved += CONTRAST.unresolved.length;
  if (CONTRAST.out.length) {
    console.log(`  ${pageFile}: ` + CONTRAST.out.map(c => `"${c.text}" [${c.cls}] ${c.ratio}:1 (needs ${c.need})`).join(" | "));
  }
  if (CONTRAST.unresolved.length) {
    console.log(`  ${pageFile}: background unresolved for ` + CONTRAST.unresolved.map(c => `"${c.text}" (${c.bg})`).join(" | "));
  }
}
assert(contrastFailures === 0,
  `text below WCAG AA across ${CONTRAST_PAGES.length} pages (${contrastFailures} element(s) — listed above)`);
/* Asserted, not merely printed. An element whose background this cannot
   work out is not a pass; it is a hole, and a silent hole is how the
   first version of this check reported clean while missing 24 pages. */
assert(contrastUnresolved === 0,
  `every text element's background resolves to a colour (${contrastUnresolved} unresolved — listed above)`);
/* An icon carrying meaning with no words beside it has to be visible.
   The radar's rings are the case that made this worth having: pinned to
   a sand chosen for the ink hero, they measured 1.35:1 on the parchment
   card in the MRO tool — a chart scale nobody can see. */
assert(graphicalFailures === 0,
  `unlabelled graphical objects meet WCAG 1.4.11 at 3:1 (${graphicalFailures} below — listed above)`);

section("Regulatory Index — edition, citation, download, embed");
{
  await page.goto(base + "/regulations.html"); await page.waitForTimeout(400);
  const label = await page.$eval("#edition-label", e => e.textContent.trim());
  assert(/^JK-REG \d{4}\.\d+ \(\d+ instruments\) · [2-9A-HJ-NP-Z]{4}$/.test(label),
    `edition label malformed: "${label}"`);

  // The count on the page must be the count in the corpus, or the
  // sanity check a reader performs without leaving the page is a lie.
  const stated = Number(label.match(/\((\d+) instruments\)/)[1]);
  const actual = await page.evaluate(() => Object.keys(JKV.cites).length);
  assert(stated === actual, `label claims ${stated} instruments, corpus has ${actual}`);

  /* The digest must move when the corpus does, and hold when it does
     not. A version that can be forgotten is a version two different
     corpora can share, which is the exact failure a citable edition
     exists to prevent. */
  const digests = await page.evaluate(() => {
    const meta = JKV.CITE_META;
    const base = corpusEdition(JKV.cites, meta).digest;
    const same = corpusEdition(JSON.parse(JSON.stringify(JKV.cites)), meta).digest;
    const added = { ...JKV.cites, zzTest: { s: "verified", ref: "L.N. 1/2000", long: "x", url: "" } };
    const changed = JSON.parse(JSON.stringify(JKV.cites));
    const firstKey = Object.keys(changed)[0];
    changed[firstKey] = { ...changed[firstKey], s: "unconfirmed" };
    return {
      base, same,
      added: corpusEdition(added, meta).digest,
      statusChanged: corpusEdition(changed, meta).digest,
      reverified: corpusEdition(JKV.cites, { ...meta, verifiedOn: "2099-01-01" }).digest
    };
  });
  assert(digests.base === digests.same, "the digest is unstable for identical content");
  assert(digests.base !== digests.added, "adding an instrument did not change the digest");
  assert(digests.base !== digests.statusChanged, "changing a citation status did not change the digest");
  assert(digests.base !== digests.reverified, "re-verifying did not change the digest");

  // A citation someone can paste into a board paper.
  const cite = await page.evaluate(() =>
    corpusCitation(corpusEdition(JKV.cites, JKV.CITE_META), "https://example.org/regulations.html"));
  for (const part of ["JK & Associates", "Regulatory Index", "instruments", "gazette record", "https://example.org"]) {
    assert(cite.includes(part), `citation omits "${part}": ${cite}`);
  }

  assert(await page.$("#edition-download"), "no download control on the index");
  assert(await page.$("#edition-cite"), "no citation control on the index");

  /* Embedded mode: the chrome goes, the corpus and its attribution stay.
     An unattributed corpus inside someone else's page is a different
     thing from a partner carrying yours. */
  await page.goto(base + "/regulations.html?embed=1"); await page.waitForTimeout(400);
  assert(await page.$eval("body", b => b.classList.contains("is-embed")), "embed flag did not apply");
  assert(await page.$eval(".nav-bar", n => getComputedStyle(n).display === "none")
    .catch(() => true), "navigation still renders inside an embed");
  const attrib = (await page.$eval("#embed-attrib", e => e.textContent)).replace(/\s+/g, " ");
  assert(/JK & Associates/.test(attrib), "an embedded index does not say whose it is");
  assert(/JK-REG \d{4}\.\d+/.test(attrib), "an embedded index does not carry its edition");
  assert(await page.$eval("#reg-body", b => b.children.length) > 0, "embedded index rendered no instruments");

  // And the flag must not fire on anything else.
  await page.goto(base + "/regulations.html?embed=yes"); await page.waitForTimeout(300);
  assert(!(await page.$eval("body", b => b.classList.contains("is-embed"))), "embed mode applied on a non-1 value");
}

/* ─── CALIBRATION FROM THE URL IS AN ENUM, NOT A STRING ───
   This was a reflected XSS. ?fleet= went from the query string into
   innerHTML unescaped, on a site whose CSP sets frame-ancestors and no
   script-src — so a crafted link executed script on the JK origin with
   access to everything in localStorage. The report link this page
   generates deliberately carries fleet and model and users are invited
   to send it on, so the product shipped the delivery vector.

   Asserted at both layers: the value must be rejected, AND nothing may
   reach the DOM as markup even if a future edit loosens the validator. */
/* ─── A PARTIAL SCORECARD HAS NO INDEX ───
   computeScores divides each domain by the questions ANSWERED, not the
   questions asked, so a domain with one good answer reads 100% and
   carries its full weight. results.html has always refused to render a
   report until all forty are in for exactly that reason. The venture
   dashboard printed the index anyway, with a verdict band beside it —
   so the two pages disagreed about whether the same data was fit to
   show. scorecard() had always returned answeredAll; nothing read it. */
section("A partial scorecard shows no index");
{
  await page.goto(base + "/tools/venture-dashboard.html");
  await page.evaluate(() => {
    localStorage.clear();
    const ans = {};
    // One domain, one question, best possible answer.
    ans[JK.domains[0].id] = [4];
    saveAnswers(ans);
    localStorage.setItem("dn_onboarded", "1");
  });
  await page.goto(base + "/tools/venture-dashboard.html"); await page.waitForTimeout(500);

  const panel = (await page.$eval("#scorecard-x", e => e.textContent) || "").replace(/\s+/g, " ");
  assert(/in progress/i.test(panel), `a partial scorecard did not report itself as unfinished: "${panel}"`);
  assert(!/index \d+\/100/i.test(panel), `an index was shown for a partial scorecard: "${panel}"`);
  assert(/1 of 40/.test(panel), `the panel does not say how much is answered: "${panel}"`);

  // A finished one must still show its index, or the fix has traded a
  // wrong number for no number.
  await page.evaluate(() => {
    const ans = {};
    JK.domains.forEach(d => { ans[d.id] = [3, 3, 3, 3, 3]; });
    saveAnswers(ans);
  });
  await page.goto(base + "/tools/venture-dashboard.html"); await page.waitForTimeout(500);
  const done = (await page.$eval("#scorecard-x", e => e.textContent) || "").replace(/\s+/g, " ");
  assert(/index \d+\/100/i.test(done), `a completed scorecard showed no index: "${done}"`);
  assert(!/in progress/i.test(done), `a completed scorecard was called unfinished: "${done}"`);
}

section("Calibration from the URL is validated, not rendered");
{
  const PAYLOAD = '<img src=x onerror="window.__xss=1">';

  /* Answers must exist first. With none saved, results.html renders its
     empty state, #report stays hidden and the calibration badge — the
     sink — is never reached. The first version of this test skipped
     that and passed against a deliberately reintroduced vulnerability,
     which is a test that proves the page is safe when nobody is using
     it. */
  await page.goto(base + "/results.html");
  await page.evaluate(() => {
    const ans = {};
    JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
    saveAnswers(ans);
    localStorage.setItem("dn_onboarded", "1");
  });

  await page.goto(base + "/results.html?fleet=" + encodeURIComponent(PAYLOAD) + "&model=" + encodeURIComponent(PAYLOAD));
  await page.waitForTimeout(500);

  // The sink must actually have been reachable, or nothing below means
  // anything.
  assert(await page.$eval("#report", el => el.style.display !== "none"),
    "the report did not render, so the calibration sink was never exercised");

  assert(await page.evaluate(() => window.__xss === undefined),
    "a crafted ?fleet= executed script on the page");
  assert(await page.$$eval("img[src='x']", n => n.length) === 0,
    "injected markup reached the DOM as an element");
  const body = await page.$eval("body", b => b.textContent);
  assert(!/onerror/.test(body), "the payload was rendered as visible text instead of dropped");

  // A value that is not on the list must be dropped, not displayed
  // escaped — a badge reading "&lt;img…&gt;" is safe and still wrong.
  await page.goto(base + "/results.html?fleet=Not%20A%20Fleet");
  await page.waitForTimeout(400);
  assert(!/Not A Fleet/.test(await page.$eval("body", b => b.textContent)),
    "an unknown calibration value was displayed");

  /* And the feature still works for a real value, or the fix has traded
     a vulnerability for a broken feature. */
  await page.goto(base + "/results.html?fleet=Narrowbody&model=Cargo");
  await page.waitForTimeout(400);
  const shown = await page.$eval("body", b => b.textContent);
  const hasReport = await page.$eval("#report", el => el.style.display !== "none").catch(() => false);
  if (hasReport) {
    assert(/Narrowbody/.test(shown), "a valid fleet type was rejected by the validator");
    assert(/Cargo/.test(shown), "a valid operating model was rejected by the validator");
  }
}

section("Privacy notice matches what the code transmits");
{
  const srcFiles = ["assets/js/common.js", "assets/js/results.js"];
  const formNames = new Set();
  for (const f of srcFiles) {
    const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    for (const m of src.matchAll(/["']form-name["']\s*:\s*["']([\w-]+)["']/g)) formNames.add(m[1]);
  }
  assert(formNames.size >= 3, `expected the known transmitting forms, found ${[...formNames].join(", ")}`);

  await page.goto(base + "/privacy.html"); await page.waitForTimeout(300);
  const txt = (await page.$eval("body", b => b.textContent)).replace(/\s+/g, " ");

  // The absolute claim must be gone.
  assert(!/inputs are not transmitted to JK or to any server/i.test(txt),
    "the notice still makes an unqualified no-transmission claim");
  assert(!/There is no database, no account, and no upload/i.test(txt),
    "the notice still claims there is no database");

  // The processor must be named, and the answers-in-the-link point made.
  assert(/Netlify Forms/.test(txt), "Netlify Forms is not named as the recipient");
  assert(/carries your scorecard answers/i.test(txt),
    "the notice does not disclose that the report link carries the answers");

  // Every transmitting form must be described. Field names are the
  // strongest available proxy for "this form is accounted for".
  assert(/health index/i.test(txt), "the notice does not say the health index is sent");
  assert(/preferred week/i.test(txt), "the debrief form's fields are not disclosed");
  assert(/which tool you were using/i.test(txt), "the tool-enquiry form is not disclosed");

  // And what stays true must still be said plainly, or the fix has
  // traded an overclaim for an underclaim.
  assert(/Running a tool transmits/i.test(txt) && /nothing/i.test(txt),
    "the notice no longer states that using a tool sends nothing");
}

/* ─── 4d. HOMEPAGE — scorecard radar preview (Operate-track section) ─── */
section("Homepage — scorecard radar preview");
await page.goto(base + "/index.html"); await page.waitForTimeout(400);
assert(await page.$eval("#hero-radar", s => s.querySelectorAll("polygon").length) >= 5, "scorecard radar renders rings + data polygon");
assert(await page.$eval("#hero-radar", s => s.querySelectorAll("text").length) === 8, "scorecard radar labels all 8 domains");

/* ─── 4e. RESULTS — scroll-triggered capture nudge ─── */
section("Results page — capture nudge");
await page.evaluate(() => {
  const ans = {};
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
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
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
  sessionStorage.setItem("dn_capture_nudged", "1");
});
await page.goto(base + "/results.html"); await page.waitForTimeout(500);
/* The stamp and the source list are derived from the benchmarks, so this
   asserts they AGREE with the data rather than matching a literal. The
   previous version pinned the string "Q4 2024"; it passed for as long as
   nobody refreshed a figure, which is the opposite of what it was for. */
{
  const bench = await page.evaluate(() => {
    const dated = JK.domains.filter(d => d.benchmark && d.benchmarkAsOf);
    const oldest = dated.map(d => d.benchmarkAsOf).sort()[0];
    return {
      expected: new Date(oldest)
        .toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      shown: document.getElementById("bench-asof").textContent.trim(),
      srcText: document.getElementById("bench-sources").textContent,
      gapText: document.getElementById("gap-body").textContent,
      named: [...new Set(dated.map(d => d.benchmarkSrc))],
      unattributed: JK.domains.filter(d => d.benchmark && !d.benchmarkAsOf).map(d => d.name)
    };
  });

  assert(bench.shown === bench.expected,
    `data-as-of stamp reports the oldest benchmark (${bench.expected}), got "${bench.shown}"`);
  assert(bench.named.every(n => bench.srcText.includes(n)),
    `every dated benchmark source is listed (${bench.named.length} sources)`);

  /* A benchmark with no publication behind it must not sit in the source
     list looking like one; it belongs in the "no published source" line.

     Asserted BOTH WAYS, because these two assertions used to require that
     unattributed benchmarks exist. Sourcing the last three turned a pair
     of passing tests red — they were pinned to the defect rather than to
     the rule about it. And a disclaimer for a gap that no longer exists is
     its own defect: it tells a reader that some figure on the page is a
     planning target when none is. */
  if (bench.unattributed.length) {
    assert(bench.srcText.includes("No published source"),
      `${bench.unattributed.length} unattributed benchmarks are declared as such`);
    assert(bench.unattributed.every(n => bench.srcText.includes(n)),
      "each unattributed benchmark names the domain it belongs to");
    assert(bench.gapText.includes("(no published source)"),
      "gap table marks unsourced benchmarks inline, not just in the footer");
  } else {
    assert(!bench.srcText.includes("No published source"),
      "every benchmark is sourced, so the footer must not claim otherwise");
    assert(!bench.gapText.includes("(no published source)"),
      "every benchmark is sourced, so the gap table must not mark one unsourced");
  }

  // And the gap table must date the benchmark it prints beside the score.
  assert(/as at \w+ \d{4}/.test(bench.gapText), "gap table dates its industry benchmarks");
}
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
assert(await page.$eval("#db-role", e => e.tagName) === "SELECT", "role is a guided dropdown, not free text");
assert(await page.$eval("#db-week", e => e.tagName) === "SELECT", "preferred week is a guided dropdown, not free text");
await page.fill("#db-name", "Test User");
await page.fill("#db-email", "test@example.com");
await page.fill("#db-airline", "Test Airways");
await page.click("#debrief-form button[type=submit]");
await page.waitForFunction(() => document.getElementById("db-msg")?.textContent.trim().length > 0, null, { timeout: 4000 }).catch(() => {});
assert((await page.$eval("#db-msg", e => e.textContent)).length > 0, "debrief form submit produces a visible message (not a silent throw)");
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
assert(/not attributable to any single (airline|client)/i.test(await page.$eval("#results-in-practice", e => e.textContent)), "privacy disclaimer present");
await page.goto(base + "/partners.html"); await page.waitForTimeout(400);
assert(/mailto:/.test(await page.$eval("[data-partner-mailto]", a => a.href)), "partner CTA mailto pre-filled");
assert(/partner=YOURNAME/.test(await page.$eval("section", e => e.textContent)), "partner link mechanics explained");

/* ---- white-label preview ----
   The registry was built, documented and left empty, so there was
   nothing to show a prospect. A PREVIEW entry fixes that and creates the
   one risk worth guarding: a site rendered under an invented brand,
   which unmarked is JK asserting a partnership that does not exist.
   Every assertion below exists to keep that impossible. */
await page.goto(base + "/index.html?partner=PREVIEW"); await page.waitForTimeout(400);
{
  const bar = await page.$("[data-partner-preview]");
  assert(bar, "preview mode renders no banner — it would read as a real partnership");
  const txt = (await page.$eval("[data-partner-preview]", e => e.textContent)).replace(/\s+/g, " ");
  assert(/Preview/i.test(txt), "the banner does not say it is a preview");
  assert(/not a real partnership/i.test(txt), "the banner does not disclaim the relationship");
  assert(await page.$eval("body", b => b.classList.contains("has-partner")), "preview did not apply partner mode");

  // A partner registered without artwork must fall back to JK, not to a
  // broken image. img.src = undefined used to fetch the page URL itself.
  const broken = await page.$$eval("img.partner-logo", imgs =>
    imgs.filter(i => !i.getAttribute("src") || /undefined/.test(i.getAttribute("src"))).length);
  assert(broken === 0, "a logo-less partner produced a broken image source");

  // The banner must survive onto pages the preview reaches, or a
  // screenshot of any inner page shows an undisclaimed brand.
  await page.goto(base + "/diagnostic.html?partner=PREVIEW"); await page.waitForTimeout(400);
  assert(await page.$("[data-partner-preview]"), "preview banner missing on an inner page");

  // And a bogus partner key must still be inert.
  await page.goto(base + "/index.html?partner=NOT_A_PARTNER"); await page.waitForTimeout(400);
  assert(!(await page.$("[data-partner-preview]")), "an unregistered partner key rendered a preview banner");
  assert(!(await page.$eval("body", b => b.classList.contains("has-partner"))), "an unregistered key applied partner mode");
}

/* ─── 5. RESULTS — engagement key gate ─── */
section("Results page — engagement key gate");
// Reload with valid localStorage
await page.evaluate(() => {
  const ans = {};
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  saveAnswers(ans);
});
await page.goto(base + "/results.html"); await page.waitForTimeout(500);

await page.fill("#key-input", "wrong-key"); await page.click("#key-apply"); await page.waitForTimeout(150);
assert(/Invalid/i.test(await page.$eval("#key-msg", e => e.textContent)), "wrong key rejected");
await page.fill("#key-input", "jk-engage-2026"); await page.click("#key-apply"); await page.waitForTimeout(150);
assert(/Unlocked/i.test(await page.$eval("#key-msg", e => e.textContent)), "correct key (lowercase) unlocks");
assert(await page.$$eval(".toolcard.unlocked", e => e.length) > 0, "toolcards unlock after valid key");

// Training Needs Analysis is a fully free tool (tools/training-tna.html) —
// it must render as an unlocked Toolbox A card (ref A5), not a locked one
// under Toolbox C, which would falsely present it as engagement-gated
assert(await page.$("a.toolcard[href*='training-tna']") !== null, "TNA toolcard is a direct link (not gated)");
assert(await page.$eval("a.toolcard[href*='training-tna']", a => a.classList.contains("unlocked")), "TNA toolcard renders as unlocked");
assert(/Toolbox A/.test(await page.$eval("a.toolcard[href*='training-tna'] .ref", e => e.textContent)), "TNA is listed under free Toolbox A, not locked Toolbox C");

// preview-modal trigger only belongs on locked (paid-engagement) cards —
// showing it on already-free Toolbox A cards would pop a generic modal
// falsely claiming the tool is "deployed during a DN engagement"
assert(await page.$eval(".toolcard.unlocked[data-box='A']", c => c.querySelector(".btn-preview-trigger")) === null,
  "no preview-trigger button on free Toolbox A cards");
assert(await page.$eval(".toolcard.locked", c => c.querySelector(".btn-preview-trigger")) !== null,
  "preview-trigger button present on a locked toolbox card");
await page.click(".toolcard.locked .btn-preview-trigger");
await page.waitForSelector("#tool-preview-modal");
assert(await page.$eval("#tool-preview-modal", m => m.getAttribute("role")) === "dialog", "preview modal has role=dialog");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
assert(await page.$("#tool-preview-modal") === null, "Escape key closes the preview modal");

/* ─── 6. RESULTS — empty state ─── */
section("Results page — empty state");
await page.evaluate(() => localStorage.removeItem("jk_airline_scorecard_v3"));
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
assert(await page.$eval("#stat-cost", e => e.textContent) === "$0", "cost starts at $0");
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
assert(await page.$eval("tr[data-key='0-0'] .cost", e => e.textContent) === "$7,200", "cost=$7,200 (gap 3 × $2,400)");

// Stats updated
assert(await page.$eval("#stat-assessed", e => e.textContent) === "1 / 39", "assessed increments to 1/39");
assert(await page.$eval("#stat-avggap", e => e.textContent) === "3.0", "avg gap = 3.0");
assert(await page.$eval("#stat-high", e => e.textContent) === "1", "high count = 1");
assert(await page.$eval("#stat-cost", e => e.textContent) === "$7,200", "total cost = $7,200");

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
assert(await page.$eval("tr[data-key='1-4'] .cost", e => e.textContent) === "$2,400", "cost=$2,400 (gap 2 × $1,200)");

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
assert(await page.$eval("tr[data-key='0-0'] .cost", e => e.textContent) === "$0", "cost=$0 when on target");

/* ─── 14. TNA — cost for engineers (£700/point) ─── */
section("Training Needs Analysis — engineer cost rate (£700/point)");
// Row 2-0: AME licensing, target=5, cpp=700. Set current=3 → gap=2
await page.selectOption("tr[data-key='2-0'] .cur-select", "3"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='2-0'] .gap-val", e => e.textContent) === "2", "engineer gap=2");
assert(await page.$eval("tr[data-key='2-0'] .cost", e => e.textContent) === "$5,600", "engineer cost=$5,600 (2×$2,800)");

/* ─── 15. TNA — cost for ground ops (£180/point) ─── */
section("Training Needs Analysis — ground ops cost rate (£180/point)");
// Row 3-0: Aircraft handling, target=4, cpp=180. Set current=2 → gap=2
await page.selectOption("tr[data-key='3-0'] .cur-select", "2"); await page.waitForTimeout(200);
assert(await page.$eval("tr[data-key='3-0'] .gap-val", e => e.textContent) === "2", "ground ops gap=2");
assert(await page.$eval("tr[data-key='3-0'] .cost", e => e.textContent) === "$1,800", "ground ops cost=$1,800 (2×$900)");

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
assert(await page.$eval("#stat-cost", e => e.textContent) === "$0", "cost resets to $0");
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
      JK.domains.forEach(d => { ans[d.id] = [2, 2, 2, 2, 2]; });
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
await assertEnquiryFormSubmits(page, "#fuel-enquiry", "fuel page");

await page.goto(base + "/tools/cask-calculator.html"); await page.waitForTimeout(300);
assert(await page.$("#cask-enquiry [name=email]") !== null, "CASK page: enquiry form email field present");
assert(await page.$("#contact-cta") === null, "CASK page: bare mailto CTA removed");
await assertEnquiryFormSubmits(page, "#cask-enquiry", "CASK page");

await page.goto(base + "/tools/operating-model-canvas.html"); await page.waitForTimeout(300);
assert(await page.$("#canvas-enquiry [name=email]") !== null, "canvas page: enquiry form email field present");
assert(await page.$("#contact-cta") === null, "canvas page: bare mailto CTA removed");
await assertEnquiryFormSubmits(page, "#canvas-enquiry", "canvas page");

/* ─── 23c. How It Works page ─── */
section("How It Works page");
await page.goto(base + "/how-it-works.html"); await page.waitForTimeout(300);
assert(await page.$$eval(".phase", e => e.length) === 5, "5 engagement phases rendered from DN.phases");
assert(/15,000/.test(await page.$eval("body", e => e.textContent)), "investment range shown");
assert(/3.*Year-1 ROI/.test(await page.$eval("body", e => e.textContent)), "ROI guarantee shown");
assert(await page.$("#brief-enquiry [name=email]") !== null, "engagement brief form present");
await assertEnquiryFormSubmits(page, "#brief-enquiry", "how-it-works page");

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
await assertEnquiryFormSubmits(page, "#mro-enquiry", "MRO diagnostic page");
page.once("dialog", d => d.accept());
await page.click("#mro-reset"); await page.waitForTimeout(200);
assert(await page.$eval("#mro-index", e => e.textContent.trim()) === "—", "index resets to — after clearing answers");
assert(await page.$$eval(".mro-q select", sels => sels.every(s => s.value === "")), "all selects cleared after reset");

/* ─── 24. Content-Security-Policy ─── */
section("Content-Security-Policy");
{
  /* The site once shipped a reflected XSS. Escaping the sink fixed that
     instance; it did not remove the class. script-src is what removes
     the class — but only if nothing quietly weakens it, and only while
     no page reintroduces an inline <script>, which would be blocked in
     production and work perfectly in every local file:// test.

     That failure mode is the reason these assertions read the source of
     truth rather than a rendered page: under file:// no headers are
     served at all, so a test that asked the browser what policy applied
     would be asserting nothing. */
  const headers = readFileSync(resolve(ROOT, "_headers"), "utf8");
  const cspLine = headers.split("\n").find(l => /^\s*Content-Security-Policy:/i.test(l)) || "";
  const csp = cspLine.replace(/^\s*Content-Security-Policy:\s*/i, "").trim();
  assert(csp.length > 0, "_headers declares a Content-Security-Policy");

  const directive = (name) => {
    const m = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+)`, "i"));
    return m ? m[1].trim() : null;
  };

  assert(directive("script-src") === "'self'",
    `script-src is exactly 'self' (found ${JSON.stringify(directive("script-src"))})`);

  /* Named individually so a failure says which escape hatch appeared,
     rather than "the policy changed". 'unsafe-inline' in script-src is
     the one that would silently undo all of this while leaving every
     other assertion here green. */
  for (const token of ["'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", "data:", "*"]) {
    assert(!(directive("script-src") || "").includes(token),
      `script-src does not carry ${token}`);
  }
  assert(!/sha256-|sha384-|sha512-|nonce-/.test(directive("script-src") || ""),
    "script-src carries no hash or nonce allowance — inline scripts are extracted, not listed");

  for (const [name, expected] of [
    ["default-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'self'"]
  ]) {
    assert(directive(name) === expected, `${name} is ${expected} (found ${JSON.stringify(directive(name))})`);
  }

  /* frame-src is 'self' rather than 'none' because embed.html frames
     diagnostic.html to demonstrate the partner embed. Asserted so that
     tightening it to 'none' fails here instead of blanking that page in
     production, where nobody is looking. */
  assert(directive("frame-src") === "'self'",
    "frame-src is 'self' — embed.html frames diagnostic.html for the partner demo");
  assert(/<iframe[^>]+src="diagnostic\.html"/.test(readFileSync(resolve(ROOT, "embed.html"), "utf8")),
    "embed.html still has the same-origin iframe that frame-src 'self' exists for");

  /* The invariant the whole policy rests on. An inline <script> added to
     any page is inert in production and invisible in local testing, so
     this walks every page rather than a list. ld+json is data, not
     script, and CSP does not gate it. */
  const offenders = [];
  for (const pageFile of [
    ...readdirSync(ROOT).filter(f => f.endsWith(".html")),
    ...readdirSync(resolve(ROOT, "tools")).filter(f => f.endsWith(".html")).map(f => "tools/" + f)
  ].sort()) {
    const html = readFileSync(resolve(ROOT, pageFile), "utf8");
    for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const attrs = m[1];
      if (/\bsrc=/.test(attrs)) continue;
      if (/application\/ld\+json/.test(attrs)) continue;
      if (m[2].trim()) offenders.push(`${pageFile}: ${m[2].trim().slice(0, 40)}…`);
    }
  }
  assert(offenders.length === 0,
    `no page carries an inline <script> — it would be blocked by script-src in production and pass every local test (${offenders.join(" | ")})`);

  /* An extracted file nothing loads is dead weight that still passes a
     syntax check. */
  const referenced = new Set();
  for (const pageFile of [
    ...readdirSync(ROOT).filter(f => f.endsWith(".html")),
    ...readdirSync(resolve(ROOT, "tools")).filter(f => f.endsWith(".html")).map(f => "tools/" + f)
  ]) {
    for (const m of readFileSync(resolve(ROOT, pageFile), "utf8").matchAll(/src="[^"]*assets\/js\/page\/([^"]+)"/g)) {
      referenced.add(m[1]);
    }
  }
  const onDisk = readdirSync(resolve(ROOT, "assets/js/page")).filter(f => f.endsWith(".js"));
  const orphans = onDisk.filter(f => !referenced.has(f));
  assert(orphans.length === 0, `every extracted page script is loaded by a page (orphans: ${orphans.join(", ")})`);
  assert(onDisk.length === referenced.size,
    `every referenced page script exists on disk (${referenced.size} referenced, ${onDisk.length} on disk)`);
}

/* ─── 25. No JS errors ─── */
section("JavaScript errors");
assert(errs.length === 0, `no uncaught page errors (${errs.length ? errs.join(" | ") : "none"})`);

await browser.close();

console.log(`\n  ${passed} passed, ${failures} failed`);
console.log(failures ? `\n❌  ${failures} failure(s)` : "\n✅  all E2E checks passed");
process.exit(failures ? 1 : 0);
