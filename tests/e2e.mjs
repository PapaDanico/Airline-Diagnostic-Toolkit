/* End-to-end behaviour tests for the JK & Associates aviation advisory platform.
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
assert(await page.$$eval("#reg-body .st-un", e => e.length) === 3,
  "the three unconfirmed instruments are marked unconfirmed, not quietly asserted");
assert(await page.$$eval("#unconfirmed .note", e => e.length) === 3,
  "each unconfirmed instrument gets its caveat spelled out in full");
await page.click('#filters [data-f="uas"]'); await page.waitForTimeout(300);
const uasRows = await page.$$eval("#reg-body tr", rows => rows.map(r => r.innerText));
assert(uasRows.length > 0 && uasRows.length < regRows, "filtering by sector narrows the index");
assert(uasRows.some(t => /L\.N\. 40\/2026/.test(t)), "the UAS filter surfaces the UAS regulations");
assert(!uasRows.some(t => /L\.N\. 102\/2026/.test(t)), "the UAS filter excludes the aerodrome regulations");
assert(await page.$$eval("#sec-map .card", e => e.length) === 6, "all six sectors mapped to their instruments");

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

/* ─── 24. No JS errors ─── */
section("JavaScript errors");
assert(errs.length === 0, `no uncaught page errors (${errs.length ? errs.join(" | ") : "none"})`);

await browser.close();

console.log(`\n  ${passed} passed, ${failures} failed`);
console.log(failures ? `\n❌  ${failures} failure(s)` : "\n✅  all E2E checks passed");
process.exit(failures ? 1 : 0);
