/* End-to-end behaviour tests for the JK & Associates aviation advisory platform.
   Runs the real pages in headless Chromium and asserts the core flows.
   Exits non-zero on any failure so CI fails loudly. Run: node tests/e2e.mjs */
import { chromium } from "playwright";
import { record } from "./verification.mjs";
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

/* ─── 1b. A DEFICIENT SMS SURVIVES THE AVERAGE ───
   The health index is a weighted mean across eight domains and safety
   is eighteen of a hundred, so seven strong commercial domains carry a
   paper-only safety management system to a healthy-looking headline.
   Driving it proved the case: index 96, verdict "Best-in-class
   trajectory · Strong across the board", SMS answered "Deficient".

   The index is deliberately NOT capped — SM ICG's own guidance is that
   an SMS evaluation should not be scored, still less turned into a pass
   mark. What must hold is that the fact travels anyway: a flag beside
   the ring, and a verdict sentence that stops claiming strength across
   a board one plank of which is missing. */
section("A deficient SMS is not averaged away");
for (const [level, rung, flagged] of [[0, "Deficient", true], [1, "Reactive", true], [2, "Proactive", false]]) {
  await page.goto(base + "/results.html");
  await page.evaluate((lvl) => {
    const ans = {};
    JK.domains.forEach(d => { ans[d.id] = d.questions.map(() => 4); });
    ans.safety[0] = lvl;
    localStorage.setItem("jk_airline_scorecard_v3", JSON.stringify(ans));
  }, level);
  await page.reload(); await page.waitForTimeout(500);

  const flag = await page.$(".index-flag");
  assert(Boolean(flag) === flagged,
    `SMS answered "${rung}" ${flagged ? "raises" : "raises no"} flag beside the index`);

  if (flagged) {
    const text = await page.$eval(".index-flag", e => e.textContent);
    assert(text.includes(rung), `the flag names the answer that raised it ("${rung}")`);
    const verdict = await page.$eval("#index-text", e => e.textContent);
    assert(!/strong across the board/i.test(verdict),
      `the verdict stops claiming strength across the board with a ${rung.toLowerCase()} SMS`);
    // The whole point of a flag is that it reaches a board pack.
    const printed = await page.$eval(".index-flag", e => !e.classList.contains("no-print"));
    assert(printed, "the flag is not excluded from print");
  }
}

/* Put the shared answers back. This block rewrites localStorage to make
   its own case, and everything after it reads the [1,2,3,2,4] spread set
   in section 1 — leaving all-fours behind silently broke the prescriber
   assertions two sections down, which is a check failing for a reason
   that has nothing to do with what it tests. */
await page.evaluate(() => {
  const ans = {};
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  localStorage.setItem("jk_airline_scorecard_v3", JSON.stringify(ans));
});

/* ─── 1c. A SCREENING DOMAIN SAYS SO, ON THE PAGE ───
   The safety domain was corrected to state that five questions screen
   rather than assess — Annex 19 defines twelve elements and this asks
   about one. That correction went into the data and reached nothing:
   `screensOnly` and `fullAssessment` travelled through computeScores
   and were rendered by no one, so the row still read as an assessment
   and the honest sentence sat in a source file no client would open.

   A caveat nobody sees is not a caveat. This asserts it is on the page,
   and that it carries the link — telling a carrier its SMS score is
   indicative without saying what would be definitive leaves them where
   they started. */
section("A screening domain says so where a client will read it");
await page.goto(base + "/results.html");
await page.evaluate(() => {
  const ans = {};
  JK.domains.forEach(d => { ans[d.id] = [1, 2, 3, 2, 4]; });
  localStorage.setItem("jk_airline_scorecard_v3", JSON.stringify(ans));
});
await page.reload(); await page.waitForTimeout(500);
{
  const screens = await page.$$(".screens");
  assert(screens.length > 0, "the screening caveat renders on the results page");
  const text = await page.$eval(".screens", e => e.textContent);
  assert(/twelve elements/i.test(text), "the caveat says how many elements Annex 19 defines");
  assert(/does not assess/i.test(text), "the caveat distinguishes screening from assessing");
  const href = await page.$eval(".screens a", a => a.getAttribute("href"));
  assert(Boolean(href) && /toolkits\/maturity/.test(href),
    `the caveat links to the twelve-element instrument (got ${href})`);
  // Exactly the domain that declares it, and no other.
  const declared = await page.evaluate(() => JK.domains.filter(d => d.screensOnly).length);
  assert(screens.length === declared,
    `one caveat per declaring domain (${screens.length} rendered, ${declared} declared)`);
}

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

/* -- the printed pack opens with the answer, not the working --

   A board reader gets the conclusion and what is behind it on page one,
   and decides from that page whether to read further. The pack used to
   print the tool in screen order with the headline finding somewhere in
   the middle, which is a transcript rather than a deliverable.

   Three things are asserted, and the third is the one that matters:
   the summary exists, it is absent from the screen (the reader already
   has these findings in place; twice is noise), and the verdict carries
   a FIGURE. An answer-first title states the conclusion — "unfunded gap
   of USD 5.33M" — and a title with no number in it has slid back into
   being a topic label. */
await page.goto(base + "/tools/venture-builder.html");
await page.evaluate(() => localStorage.clear());
await page.reload(); await page.waitForTimeout(500);
await page.fill("#f-equity", "1000000"); await page.waitForTimeout(400);
{
  const ps = await page.evaluate(() => {
    const el = document.querySelector(".print-summary");
    return el && {
      onScreen: getComputedStyle(el).display !== "none",
      verdict: el.querySelector(".ps-verdict")?.textContent.trim() || "",
      items: [...el.querySelectorAll(".ps-item")].map(i => i.querySelector("b")?.textContent.trim() || ""),
      sev: [...el.querySelectorAll(".ps-item")].map(i => i.className)
    };
  });
  assert(!!ps, "the printed pack carries an executive summary");
  assert(ps && !ps.onScreen, "the executive summary is print-only and does not repeat itself on screen");
  assert(ps && /[0-9]/.test(ps.verdict),
    `the summary verdict states a figure rather than a topic — got "${ps && ps.verdict}"`);
  assert(ps && ps.items.length > 0, "the summary lists at least one finding");
  assert(ps && ps.sev.some(c => /is-(stop|warn|ok)/.test(c)),
    "each finding carries a severity, so the pack reads in monochrome");
  /* Underfunded by 5.33M, so the gap must be the FIRST thing said. An
     executive summary that leads with anything else is mis-ordered. */
  assert(ps && /gap/i.test(ps.items[0]),
    `an unfunded gap outranks every other finding — first item was "${ps && ps.items[0]}"`);
}

await page.emulateMedia({ media: "print" });
assert(await page.evaluate(() => getComputedStyle(document.querySelector(".print-summary")).display) === "block",
  "the executive summary appears under print media");
await page.emulateMedia({ media: "screen" });

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
/* Five cards, four of them scored. The Revenue Model Builder reports
   here but carries no weight in the index — see JKW.WEIGHTS — so the
   ladder below still runs 40 → 60 → 85 → 100 on the original four. */
assert(await page.$$eval(".mod", e => e.length) === 5, "five build modules rendered");
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

/* ─── Footer references: present, and present once ───

   This used to assert the strip carried all four links on every page.
   It passed on pages whose columns already carried one of them, because
   listing a page twice satisfies "all four" exactly as well as listing
   it once — the Control Room and the glossary both offered the
   regulatory index in the Reference column AND as a Regulations card,
   one page under two names in one footer.

   The assertion is now the property that matters: every reference is
   reachable from the footer, and reachable exactly once, whether it got
   there via a column or via the strip. */
/* ─── Running prose keeps a readable measure ───

   Characters per line — not pixels, and not `ch`. Both of those lie.

   Pixels lie because the same 720px is a comfortable measure at one
   type size and 92 characters at another, and this site sets measures
   at four different sizes. `ch` lies because it is the advance width of
   "0", which in DM Sans is about 11px against an average character of
   8 — so the familiar "65ch" advice, taken at face value, gives a
   column holding nearer 90. The first attempt at this fix set 72ch and
   re-measured at 97 characters, which is where it started.

   So this counts characters, on a canvas, against each element's own
   computed font. It is the only form of the check that cannot be
   satisfied by a number that merely looks right: at 1440px the glossary
   ran at 141 characters a line, the company profile at 163, methodology
   at 102, privacy, terms and about at 97 and the regulatory index at 92
   — and every one of them had a max-width set, and looked in the
   stylesheet like it had been thought about. */
section("Running prose keeps a readable measure");
{
  const MAX_CHARS = 90;   // comfortable is 45-75; past ~90 the eye loses the line
  for (const pg of ["privacy.html", "terms.html", "methodology.html", "glossary.html",
                    "about.html", "regulations.html", "company-profile.html", "tutorial.html", "faq.html"]) {
    await page.goto(base + "/" + pg); await page.waitForTimeout(350);
    const worst = await page.evaluate(() => {
      const ctx = document.createElement("canvas").getContext("2d");
      const main = document.querySelector("main") || document.body;
      let count = 0, text = "";
      for (const el of main.querySelectorAll("p, li")) {
        const t = (el.textContent || "").trim();
        /* running prose only: short labels wrap on their own, and a
           block containing other blocks is a layout box, not a sentence */
        if (t.length < 200 || el.querySelector("p, li, div, table")) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const avg = ctx.measureText("abcdefghijklmnopqrstuvwxyz ").width / 27;
        const w = el.getBoundingClientRect().width -
          parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const chars = Math.round(w / avg);
        if (chars > count) { count = chars; text = t.slice(0, 40); }
      }
      return { count, text };
    });
    assert(worst.count <= MAX_CHARS,
      `${pg}: widest prose line is ${worst.count} characters (max ${MAX_CHARS})` +
      (worst.count > MAX_CHARS ? ` — "${worst.text}…"` : ""));
  }
}

section("Footer references");
const REFERENCES = ["tutorial.html", "faq.html", "glossary.html", "regulations.html"];
for (const pg of ["index.html", "diagnostic.html", "tools/index.html", "regulations.html", "tools/venture-dashboard.html", "glossary.html"]) {
  await page.goto(base + "/" + pg); await page.waitForTimeout(350);
  const counts = await page.evaluate(() => {
    const norm = (h) => (h || "").replace(/^(\.\.\/)+/, "").replace(/^\//, "").split(/[#?]/)[0].toLowerCase();
    const out = {};
    for (const a of document.querySelectorAll(".footer a[href]")) {
      const d = norm(a.getAttribute("href"));
      if (d) out[d] = (out[d] || 0) + 1;
    }
    return { out, here: (location.pathname.split("/").pop() || "index.html").toLowerCase() };
  });
  for (const ref of REFERENCES) {
    const n = counts.out[ref] || 0;
    /* the current page renders as non-navigating text, so it is reachable
       by definition and zero links to it is the correct answer */
    const isSelf = counts.here === ref;
    assert(isSelf ? n === 0 : n === 1,
      `${pg}: footer links ${ref} ${n} time(s)${isSelf ? " (current page — zero is right)" : ", expected exactly 1"}`);
  }
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
        /* A wash TINTS; it does not hide. This fell straight through, so
           a semi-transparent background-color was dropped from the
           composite and its text was measured against whatever opaque
           surface sat behind it — a lighter ground than the one the text
           actually sits on, and therefore a flattering ratio.

           .metrics paints rgba(255,255,255,.12) and the amber callout
           rgba(255,255,255,.07), both with text on top. Same handling as
           a transparent gradient stop five lines up, which is what makes
           this an omission rather than a judgement call. */
        if (c.a > 0) overlays.push(c);
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
      let measured = 0;
      let textured = 0;

      for (const sh of (shapes.length ? shapes : [svg])) {
        const scs = getComputedStyle(sh);
        const elOpacity = Number(scs.opacity);
        /* fill-opacity and stroke-opacity are separate properties and
           getComputedStyle().stroke ignores them. Reading the colour
           alone would wave through a stroke-opacity of 0.05 as if it
           were solid. */
        for (const [paint, po] of [[scs.fill, scs.fillOpacity], [scs.stroke, scs.strokeOpacity]]) {
          if (!paint || paint === 'none') continue;

          /* A paint can be a server rather than a colour: fill:
             url(#id). Refusing it outright fails on any textured mark —
             it did on the sister platform's wordmark grain — and
             skipping every url() would be a loophole an entire icon
             could hide behind. So it is resolved by what it points AT.

             A gradient has stops, and stops are colours, measured like
             any other with the worst one counting. A pattern, filter or
             mask is a texture whose contrast is not a single ratio, so
             it is skipped but counted, and an icon painted ONLY by one
             is reported rather than silently exempted.

             Nothing on this platform uses a paint server today. It is
             here so the two checks stay the same check, and so the first
             gradient-filled icon someone adds is measured rather than
             failing as an unresolved hole. */
          let paints = [paint];
          const ref = paint.match(/^\s*url\(["']?#([^"')]+)["']?\)/);
          if (ref) {
            const def = document.getElementById(ref[1]);
            const kind = def ? def.tagName.toLowerCase() : '';
            if (kind === 'lineargradient' || kind === 'radialgradient') {
              paints = [...def.querySelectorAll('stop')].map(st => {
                const ss = getComputedStyle(st);
                return ss.stopColor || st.getAttribute('stop-color') || '';
              }).filter(Boolean);
              if (!paints.length) { unresolved.push({ text: 'svg gradient', bg: '#' + ref[1] + ' has no stops' }); continue; }
            } else if (kind === 'pattern' || kind === 'filter' || kind === 'mask') {
              textured++;
              continue;
            } else {
              unresolved.push({ text: 'svg paint', bg: paint.slice(0, 40) });
              continue;
            }
          }

          for (const one of paints) {
          const c = toRgb(one);
          if (!c) { unresolved.push({ text: 'svg paint', bg: one.slice(0, 40) }); continue; }
          const alpha = c.a
            * (Number.isFinite(Number(po)) ? Number(po) : 1)
            * (Number.isFinite(elOpacity) ? elOpacity : 1);
          if (alpha <= 0.01) continue;
          const r = Math.min(...bg.stops.map(stop =>
            ratio(alpha >= 0.99 ? c.rgb : over(c.rgb, alpha, stop), stop)));
          if (r < 3) {
            svgOut.push(`<svg ${String(svg.getAttribute('class') || host?.className || '').slice(0, 30)}> ${one}${alpha < 0.99 ? ' @' + alpha.toFixed(2) : ''} ${r.toFixed(2)}:1`);
          }
          measured++;
          }
        }
      }
      /* Texture is only safe to skip because something else on the same
         icon was measured. An icon whose every paint is a pattern has
         been checked by nobody. */
      if (textured && !measured) {
        svgOut.push(`<svg ${String(svg.getAttribute('class') || host?.className || '').slice(0, 30)}> painted only by a pattern/filter — nothing measurable`);
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
  /* Not `.catch(() => true)`.

     This read `$eval(".nav-bar", …).catch(() => true)`, and .nav-bar has
     never existed — the class is .nav. $eval rejected on every run, the
     catch turned that into a pass, and the check reported success
     without once looking at a navigation bar. The nav rendered in full
     inside embeds the whole time.

     An absent element is now a distinct failure from a visible one:
     one is a stale selector, the other is a rule that stopped applying,
     and they want different fixes. */
  const navHidden = await page.$eval(".nav", (n) => getComputedStyle(n).display === "none")
    .catch(() => null);
  assert(navHidden === true, navHidden === null
    ? "embed: no .nav on the page — the selector this test asserts on has gone stale"
    : "navigation still renders inside an embed");
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

  /* Age, not just agreement.

     Everything around this asserts the PAGE agrees with the DATA — the
     stamp matches the oldest date, every source is listed. None of it
     asks whether the data is still current, so every benchmark could
     age out together and the suite would stay green describing them
     accurately.

     Cadence-aware: an annual source at thirteen months has missed a
     cycle, a semiannual one at thirteen months has missed two. The
     grace is publication lag. None is overdue today — the oldest is
     Cost & Fuel at about thirteen months against a fifteen-month
     limit — which is when this is worth writing, rather than after a
     reader has priced a route off a superseded figure. */
  /* Read from JK.score(), the projection results.js actually renders,
     not from JK.domains.

     The first version read JK.domains and passed while the page printed
     "the next undefined edition may be due" — the projection carried
     benchmarkAsOf and dropped benchmarkCadence, so the raw data had a
     cadence and the UI did not. A check reading a different object than
     the product does is the same mistake as a check reading the source
     with a different parser, and it gave a green tick to a visible
     defect. */
  const aged = await page.evaluate(() => {
    const CYCLE = { annual: 12, semiannual: 6, quarterly: 3 };
    const GRACE = 3;
    const scored = computeScores(loadAnswers());
    return scored.domains
      .filter(d => d.benchmark && d.benchmarkAsOf)
      .map(d => {
        const months = (Date.now() - new Date(d.benchmarkAsOf)) / (1000 * 60 * 60 * 24 * 30.44);
        const cycle = CYCLE[d.benchmarkCadence] ?? 12;
        return { name: d.name, src: d.benchmarkSrc, cadence: d.benchmarkCadence || "unstated",
                 months: Math.round(months), overdue: months > cycle + GRACE };
      });
  });
  /* Reported, not failed — and the distinction is the whole point.

     This asserted overdue.length === 0, which made the passage of time
     a build failure. The oldest figure here is thirteen and a half
     months against a fifteen-month limit, so that gate was about six
     weeks from firing on whoever next touched this repository, for a
     reason no commit of theirs could fix. The only ways out would have
     been to re-source an IATA report on the spot or delete the check,
     and people delete the check.

     The sister platform reached this conclusion first and wrote it
     down in scripts/check-data.mjs: "Going stale is not a defect in the
     code and no commit can fix it — a gate that fails on the passage of
     time blocks unrelated work until someone does research, and gates
     like that get deleted rather than satisfied." Two products under
     one charter had opposite answers to the same question, with nothing
     recording which was deliberate. This is the reconciliation, and it
     goes the sister platform's way.

     What still fails is anything a commit CAN fix: a benchmark with no
     date, or with a cadence the age rule cannot read. Those are code
     defects. Age is a research task, and it is loud rather than
     blocking. */
  const overdue = aged.filter(b => b.overdue);
  if (overdue.length) {
    console.log(`  WARN :: ${overdue.length} benchmark(s) past their publication cycle — ` +
      overdue.map((b) => `${b.name}: ${b.src}, ${b.months}mo on a ${b.cadence} cycle`).join("; "));
    console.log("         Re-source or restate them. This does not fail the build: no commit " +
      "can make a figure younger, and a gate that fails on elapsed time gets deleted.");
  }
  assert(true,
    `benchmark ages checked against their own cycles (oldest ${Math.max(...aged.map(b => b.months))}mo ` +
    `of ${aged.length}, ${overdue.length} overdue)`);

  /* A date that exists but does not parse IS a code defect, and unlike
     age it is fixable by a commit — so this one fails.

     Scoped deliberately to dates that are stated and unreadable. A
     benchmark with NO date is a different thing, already governed
     further down: those are planning targets, they are allowed, and the
     rule about them is that the page must say so.

     Written the obvious way — filter `aged`, call it "every benchmark
     carries a date" — this assertion could not fail, because `aged`
     drops undated entries before it sees them. It read as the stricter
     check and was the weaker one, which is worse than absent: the same
     shape as the .catch(() => true) this suite was already caught with.
     Break-tested both ways: benchmarkAsOf "soon" fails here,
     benchmarkAsOf null passes here and trips the disclosure rules. */
  const unreadable = aged.filter((b) => !Number.isFinite(b.months));
  assert(unreadable.length === 0,
    `every stated benchmark date parses (${aged.length} checked)` +
      (unreadable.length ? ` — ${unreadable.map((b) => b.name).join(", ")}` : ""));

  /* A cadence the age rule does not recognise falls back to annual,
     which is the lenient answer and the wrong one for a quarterly
     source. Better to require the field than to guess it. */
  const unstated = aged.filter(b => b.cadence === "unstated");
  assert(unstated.length === 0,
    "every dated benchmark declares its cadence, so its age can be judged" +
      (unstated.length ? ` — ${unstated.map(b => b.name).join(", ")}` : ""));

  /* The same claim, on the other page that makes it.

     methodology.html carried "current as of Q4 2024 – mid-2025" as
     literal prose while the data had moved to June 2026 — a year of
     refreshes the page describing the refresh policy never heard about.
     results.html had this exact bug, it was fixed there by deriving the
     stamp, and the fix reached one of the two pages.

     Asserted against the data rather than against a string, for the
     reason the results.html version already records: a pinned literal
     passes for exactly as long as nobody updates a figure. */
  await page.goto(base + "/methodology.html"); await page.waitForTimeout(350);
  const meth = await page.evaluate(() => ({
    shown: document.getElementById("meth-asof")?.textContent.trim(),
    sources: document.getElementById("meth-sources")?.textContent.trim(),
    expected: JK.benchmarkMeta.asOf,
    expectedSources: JK.benchmarkMeta.sources
  }));
  assert(meth.shown === meth.expected,
    `methodology's data-as-of stamp says "${meth.shown}" and the benchmarks say "${meth.expected}"`);
  for (const src of meth.expectedSources) {
    assert(meth.sources.includes(src),
      `methodology's source list omits ${src}, which the benchmarks name`);
  }
  assert(!/Q4 2024/.test(await page.content()),
    "methodology still carries a hardcoded benchmark date");

  /* The verification panel has to actually show the verification.

     It renders from a fetched assets/verification.json, and the failure
     mode that matters is not an error — it is the panel quietly showing
     its fallback while the page around it still says "every push runs
     the checks below". A reassuring placeholder where the evidence
     should be is the exact defect this whole page is about.

     So: the rendered list must carry every headline the file carries,
     and must not be the fallback. */
  {
    /* The panel fills from a fetch, so wait for it to settle rather than
       reading whatever is on screen 350ms after navigation. Reading too
       early would fail on the placeholder and teach whoever hit it that
       this assertion is flaky — which is how a real one gets deleted. */
    await page.waitForFunction(
      () => !/Loading the current figures/.test(document.getElementById("verif-body")?.innerText || ""),
      null, { timeout: 5000 }
    ).catch(() => {});
    const shown = await page.$eval("#verif-body", (e) => e.innerText);
    const file = JSON.parse(readFileSync(resolve(ROOT, "assets/verification.json"), "utf8"));
    assert(!/could not be loaded|Loading the current figures/i.test(shown),
      "methodology's verification panel is showing a placeholder, not the figures");
    for (const suite of file.suites) {
      assert(shown.includes(suite.headline),
        `methodology's verification panel omits the ${suite.suite} line: "${suite.headline}"`);
    }
    assert(file.suites.length >= 7,
      `only ${file.suites.length} suites in the published verification file`);
  }

  /* Back to results — the checks after this one continue there, and the
     saved answers that put it in a scored state are still in storage. */
  await page.goto(base + "/results.html"); await page.waitForTimeout(400);

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

/* ─── 6b. RESULTS — the charter deviation: partial is refused ─── */

/* docs/DIAGNOSTIC-CHARTER.md records that this platform refuses to
   score a part-answered scorecard, where the sister platform
   renormalises and prints a confidence figure. Opposite remedies to the
   same problem, both deliberate: a lender's boardroom will not tolerate
   a caveated number, and a border post cannot wait for a complete one.

   The empty state above proves the zero-answer case. It does not prove
   this one, and this one is where the money is: 39 of 40 answered still
   has to refuse, because a scorecard is flattered by whichever domains
   the respondent filled in first. A deviation nobody checks is a
   comment, and nothing here would have noticed this platform quietly
   adopting the other's behaviour. */
section("Results page — a part-answered scorecard is refused, not renormalised");
{
  await page.goto(base + "/results.html");
  const total = await page.evaluate(() => {
    /* Every question but the last one of the last domain. */
    const ans = {};
    JK.domains.forEach(d => { ans[d.id] = d.questions.map((_, i) => i % 5); });
    const last = JK.domains[JK.domains.length - 1];
    ans[last.id][last.questions.length - 1] = null;
    saveAnswers(ans);
    return JK.domains.reduce((n, d) => n + d.questions.length, 0);
  });
  await page.goto(base + "/results.html"); await page.waitForTimeout(300);

  assert(await page.$eval("#empty", e => getComputedStyle(e).display !== "none"),
    `${total - 1} of ${total} answered must still show the empty state, not a report`);
  assert(await page.$eval("#report", e => getComputedStyle(e).display === "none"),
    "no report is rendered from a part-answered scorecard");

  /* And the refusal has to explain itself. "Nothing here" and "not
     enough here yet" are different messages, and the second is the only
     one that tells someone what to do. */
  const msg = (await page.$eval("#empty", e => e.textContent) || "").replace(/\s+/g, " ");
  assert(/\d+\s+questions?/i.test(msg),
    `the refusal should name what is missing (got: "${msg.slice(0, 90)}")`);

  /* The engine itself must agree with the page — a projection that
     reported answeredAll true while the page refused would mean two
     parts of the product disagreeing about the same data. */
  const state = await page.evaluate(() => {
    const s = computeScores(loadAnswers());
    return { answeredAll: s.answeredAll, index: s.index };
  });
  assert(state.answeredAll === false,
    "computeScores must report the scorecard incomplete, matching what the page shows");

  /* Completing it flips both, which is the negative control: without
     this, a page that refused everything would pass every line above. */
  await page.evaluate(() => {
    const ans = loadAnswers();
    const last = JK.domains[JK.domains.length - 1];
    ans[last.id][last.questions.length - 1] = 3;
    saveAnswers(ans);
  });
  await page.goto(base + "/results.html"); await page.waitForTimeout(300);
  assert(await page.$eval("#report", e => getComputedStyle(e).display !== "none"),
    "the same scorecard renders a report once the last answer is supplied");
  assert(await page.$eval("#empty", e => getComputedStyle(e).display === "none"),
    "and the empty state goes away");

  await page.evaluate(() => localStorage.removeItem("jk_airline_scorecard_v3"));
}

/* ─── 6c. COMPANY PROFILE — counted, not typed ─── */

/* The deck this page replaces was headed "Twelve tools. Free." and
   listed nine. The count was right and the list was three short — Fuel
   Contract Optimizer, MRO Readiness and the Venture Control Room, the
   flagship. Three live products invisible to anyone reading the company
   profile, and nothing could have noticed: a slide cannot tell that the
   toolbox grew.

   Every figure on the page is derived, and this reads them back off the
   rendered DOM and compares them with the registries. Charter rule 10,
   the same guard the sister platform carries. */
section("Company profile counts itself from the registries");
{
  await page.goto(base + "/company-profile.html"); await page.waitForTimeout(350);

  const seen = await page.evaluate(() => ({
    stats: [...document.querySelectorAll("#cp-stats div b")].map(e => e.textContent.trim()),
    toolLinks: [...document.querySelectorAll("#cp-tools a")].map(a => a.getAttribute("href")),
    groups: document.querySelectorAll("#cp-tools .cp-group").length,
    sectors: document.querySelectorAll("#cp-sectors li").length,
    rows: document.querySelectorAll(".cp-table tbody tr").length,
    body: document.body.innerText.replace(/\s+/g, " ")
  }));
  const truth = await page.evaluate(() => ({
    tools: TOOL_MENU.reduce((n, g) => n + g.items.length, 0),
    files: TOOL_MENU.flatMap(g => g.items.map(i => i.file)),
    groups: TOOL_MENU.length,
    sectors: JKV.sectors.length,
    phases: JKV.phaseSpine.length,
    domains: JK.domains.length,
    questions: JK.domains.reduce((n, d) => n + d.questions.length, 0),
    weight: JK.domains.reduce((n, d) => n + d.weight, 0)
  }));

  assert(seen.stats.includes(String(truth.tools)),
    `the profile should state ${truth.tools} tools (stats read: ${seen.stats.join(", ")})`);
  assert(seen.stats.includes(String(truth.sectors)),
    `the profile should state ${truth.sectors} sectors`);
  assert(seen.stats.includes(String(truth.phases)),
    `the profile should state ${truth.phases} certification phases`);

  /* The count alone is what the deck got right. Every tool must also be
     PRESENT — that is the half that was wrong, and a count check would
     have passed against the deck unchanged. */
  assert(seen.toolLinks.length === truth.tools,
    `the toolbox lists ${seen.toolLinks.length} tools but the registry has ${truth.tools}`);
  const missing = truth.files.filter(f => !seen.toolLinks.includes(f));
  assert(missing.length === 0, `tools in the menu but absent from the profile: ${missing.join(", ")}`);
  assert(seen.groups === truth.groups, `expected ${truth.groups} track groups, found ${seen.groups}`);

  assert(seen.sectors === truth.sectors, `expected ${truth.sectors} sectors listed, found ${seen.sectors}`);
  assert(seen.rows === truth.domains, `expected ${truth.domains} domain rows, found ${seen.rows}`);
  assert(new RegExp(`${truth.questions} questions`).test(seen.body),
    `the profile should state ${truth.questions} questions`);
  assert(new RegExp(`${truth.weight}%`).test(seen.body),
    `the profile should print the ${truth.weight}% weight total`);

  /* Stamped when read, which is the whole reason this is a page. */
  const year = String(new Date().getFullYear());
  assert(new RegExp(year).test(seen.body), "the profile states the date it was read");
}

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

/* An empty field is not a finding.

   Clearing the spend used to print "On benchmark" and congratulate the
   visitor on a contract the tool had been told nothing about. The two
   states share a zero and nothing else: no spend means no answer, on
   benchmark means the answer is that there is no gap. */
{
  const fuelState = async () => await page.evaluate(() => ({
    rng: document.getElementById("range").textContent.trim(),
    qual: document.getElementById("qual").innerText
  }));

  await page.goto(base + "/tools/fuel-optimizer.html"); await page.waitForTimeout(300);
  const seeded = await fuelState();
  assert(/^\$[\d,]+ – \$[\d,]+$/.test(seeded.rng),
    `fuel: seeded defaults produce a range (got "${seeded.rng}")`);

  for (const [value, label] of [["", "cleared"], ["0", "typed 0"]]) {
    await page.$eval("#spend", (e, v) => {
      e.value = v; e.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await page.waitForTimeout(150);
    const s = await fuelState();
    assert(s.rng === "—", `fuel: spend ${label} shows no verdict (got "${s.rng}")`);
    assert(!/benchmark/i.test(s.rng), `fuel: spend ${label} is not called "On benchmark"`);
    assert(!/\$0\.000|Infinity|NaN/.test(s.qual),
      `fuel: spend ${label} quotes no per-litre price built from nothing`);
  }

  /* Recoverable — the neutral state is a state, not a dead end. */
  await page.$eval("#spend", (e) => {
    e.value = "24000000"; e.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(150);
  assert(/^\$[\d,]+ – \$[\d,]+$/.test((await fuelState()).rng),
    "fuel: restoring the spend brings the range back");

  /* And the genuine verdict still reads as one. */
  await page.$eval("#premium", (e) => {
    e.value = "1"; e.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(150);
  assert(/On benchmark/i.test((await fuelState()).rng),
    "fuel: a premium below the benchmark is still reported as on benchmark");
}

/* ─── Route economics ───
   The arithmetic is asserted against figures worked out by hand, not
   against the tool's own output, so a regression in the model cannot
   re-bless itself. */
{
  const set = async (id, v) => { await page.$eval("#" + id, (e, x) => {
    e.value = x; e.dispatchEvent(new Event("input", { bubbles: true }));
  }, v); };
  const txt = async (id) => (await page.$eval("#" + id, (e) => e.innerText)).replace(/\s+/g, " ");

  await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(350);
  for (const [id, v] of [["re-stage","1200"],["re-seats","160"],["re-cask","11.07"],
                         ["re-fare","145"],["re-anc","12"],["re-cargo","1800"],["re-lf","78"]]) await set(id, v);
  await page.waitForTimeout(250);

  /* ASK 192,000 · trip cost $21,254 · rev/pax $157 · pax 124.8
     BLF = (21254 − 1800) / (160 × 157) = 77.4% */
  const blf = await page.$eval("#re-blf", (e) => e.textContent.trim());
  assert(blf === "77.4%", `route: break-even load factor should be 77.4%, got ${blf}`);
  const table = await txt("re-table");
  for (const want of ["$21,254", "$19,594", "$21,394", "11.14 US¢", "11.07 US¢", "13.08 US¢"]) {
    assert(table.includes(want), `route: result table omits ${want} — got ${table}`);
  }
  assert(!/NaN|Infinity|undefined/.test(table), `route: table carries a non-number — ${table}`);

  /* A fare that cannot cover the sector at any load factor is a
     different statement from a difficult one, and is worded as one. */
  await set("re-fare", "40"); await set("re-anc", "0"); await set("re-cargo", "0");
  await page.waitForTimeout(250);
  assert(/Cannot break even/i.test(await page.$eval("#re-band", (e) => e.textContent)),
    "route: a sector that cannot break even at any load factor does not say so");

  /* Suspicious but calculable: warn, and still compute. */
  await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(350);
  await set("re-cask", "930"); await page.waitForTimeout(250);
  assert(/Check the inputs/i.test(await txt("re-contrib")),
    "route: a 100x unit-cost slip draws no caution");

  /* Impossible: refuse, and name the field. */
  for (const [id, v, needle] of [["re-stage","0","sector length"],["re-lf","0","load factor"],
                                 ["re-lf","120","load factor"],["re-fare","-10","fare"]]) {
    await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(300);
    await set(id, v); await page.waitForTimeout(200);
    const err = await txt("re-error");
    assert(new RegExp(needle, "i").test(err), `route: ${id}=${v} should be refused naming "${needle}" — got "${err}"`);
  }

  /* The chain. A pre-filled figure with no provenance is worse than an
     empty field, so the carry-over has to say where it came from — and
     has to stop saying it when the source stops being valid. */
  await page.goto(base + "/tools/cask-calculator.html"); await page.waitForTimeout(350);
  await set("opcost", "310000000"); await set("ask", "2800000000"); await page.waitForTimeout(300);
  await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(350);
  assert(await page.$eval("#re-cask", (e) => e.value) === "11.07",
    "route: the CASK calculation did not carry across");
  assert(/Carried over/i.test(await txt("re-cask-src")),
    "route: a carried-over unit cost does not say where it came from");

  await page.goto(base + "/tools/cask-calculator.html"); await page.waitForTimeout(300);
  await set("ask", "0"); await page.waitForTimeout(300);
  await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(350);
  assert(!/Carried over/i.test(await txt("re-cask-src")),
    "route: an invalidated CASK still pre-fills — a stale number wearing a provenance line is the worst case");

  /* ── which aircraft on this sector ──
     The point of the comparison is the case where unit cost and the
     right answer disagree. If it only ever agreed with CASK it would be
     telling operators something they already had. */
  await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(350);
  const hidden = () => page.$eval("#re-fleet-panel", (e) => e.hidden);
  const verdict = async () => (await page.$eval("#re-fleet-verdict", (e) => e.innerText)).replace(/\s+/g, " ");

  /* Thin: 700km, $70+$5, 55% LF. The 737 has the lower CASK and the
     E190 the better contribution — hand-checked: trip $10,416 vs
     $7,840, contribution −$3,216 vs −$3,115. */
  for (const [id, v] of [["re-stage","700"],["re-seats","160"],["re-cask","9.3"],["re-fare","70"],
                         ["re-anc","5"],["re-cargo","600"],["re-lf","55"],
                         ["ac0-name","B737-800"],["ac0-seats","160"],["ac0-cask","9.3"],
                         ["ac1-name","E190"],["ac1-seats","100"],["ac1-cask","11.2"]]) await set(id, v);
  await page.waitForTimeout(300);
  assert(await hidden() === false, "route: two aircraft named and the comparison stays hidden");
  let v = await verdict();
  assert(/E190/.test(v) && /loses least/i.test(v),
    `route: on a thin sector the smaller gauge should lose least — got "${v}"`);
  assert(/lower unit cost/i.test(v) && /worse choice/i.test(v),
    `route: the CASK-versus-contribution divergence is not called out — got "${v}"`);
  assert(!/contributes most — -\$/.test(v),
    "route: an all-negative comparison still says 'contributes most' with a negative figure");

  /* Dense: same types, more traffic — now the gauge wins and the
     verdict has to change with it. */
  for (const [id, v2] of [["re-fare","190"],["re-lf","88"],["re-stage","1400"]]) await set(id, v2);
  await page.waitForTimeout(300);
  v = await verdict();
  assert(/B737-800/.test(v) && /contributes most/i.test(v),
    `route: on a dense sector the larger gauge should win — got "${v}"`);

  /* One named type is not a comparison. */
  await set("ac1-name", ""); await page.waitForTimeout(300);
  assert(await hidden() === true, "route: a single aircraft still renders a comparison table");

  /* ── the house judgement is labelled as one ──
     Every other figure on this site traces to a source. The break-even
     bands do not — they are JK's reading — so the page has to say so,
     and the cut-offs it quotes have to be the ones the code uses. A
     panel naming different numbers from BLF_BANDS would be a sourcing
     note that had itself stopped being true, which is the failure this
     whole suite exists to catch. */
  await page.goto(base + "/tools/route-economics.html"); await page.waitForTimeout(350);
  const note = (await page.$eval("#re-blf", (e) => e.closest(".result-panel").innerText)).replace(/\s+/g, " ");
  assert(/JK's reading/i.test(note), "route: the break-even bands are not attributed to JK");
  assert(/not a published standard/i.test(note), "route: the bands do not say they are unpublished");
  for (const cut of ["65%", "80%", "90%"]) {
    assert(note.includes(cut), `route: the bands note omits the ${cut} cut-off the code uses`);
  }
  assert(/fact rather than a view/i.test(note),
    "route: the 100% line is arithmetic and should be distinguished from the house bands");

  await assertEnquiryFormSubmits(page, "#route-enquiry", "route economics page");
}

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

/* ─── 23b. The two tools added with the acquisition work ───

   Both shipped with no assertions at all, and one of them shipped
   broken: the planner called fmtDate, which was a const private to the
   venture dashboard's IIFE rather than a shared helper, so every gate
   date threw. Nothing caught it because the throw needs a target date
   to be set, and no suite set one — drive.mjs loads each page in its
   default state, where the timeline is deliberately absent.

   So these assertions deliberately exercise the interaction rather than
   the load: set a date, commit capital, and read what comes back. */
section("Implementation & Programme Planner");
await page.evaluate(() => {
  localStorage.removeItem("jk_implementation_v3");
  localStorage.removeItem("jk_venture_file_v3");
});
await page.goto(base + "/tools/implementation-planner.html"); await page.waitForTimeout(300);
assert(await page.$$eval("#gates .chk", e => e.length) === 20, "renders 20 evidence criteria across the gates");
assert(/set a target date/.test(await page.$eval("#gates", e => e.textContent)),
  "gates read 'set a target date' before one is given");

/* The exact path that threw in production. */
await page.fill("#vf-target", "2028-06-01");
await page.dispatchEvent("#vf-target", "input");
await page.waitForTimeout(400);
{
  const dated = await page.$eval("#gates", e => e.textContent);
  assert(!/set a target date/.test(dated), "every gate takes a date once the target is set");
  assert(/\d{1,2}\s\w{3}\s20\d\d/.test(dated), "and the date is formatted, not a raw Date or NaN");
}

/* Capital at risk — the one figure this tool exists for. */
await page.fill("#cap-g3", "12355000");
await page.dispatchEvent("#cap-g3", "input");
await page.waitForTimeout(300);
assert(/12\.4M|12,355,000/.test(await page.$eval("#prog-kpis", e => e.textContent)),
  "capital committed against an unevidenced gate is reported as at risk");
assert(/ahead of its evidence/i.test(await page.$eval("#status-band", e => e.textContent)),
  "and the verdict leads on it rather than on the schedule");

section("AOC Acquisition Analyser");
await page.evaluate(() => localStorage.removeItem("jk_tool_acquisition"));
await page.goto(base + "/tools/aoc-acquisition.html"); await page.waitForTimeout(300);
assert(await page.$$eval("#route-seg .seg", e => e.length) === 2, "offers both deal structures");
{
  /* An asset purchase does not acquire the certificate, and the tool
     must refuse to evaluate it on price. */
  await page.click('[data-route="asset"]'); await page.waitForTimeout(300);
  assert(/No certificate/i.test(await page.$eval("#verdict-head", e => e.textContent)),
    "an asset purchase is reported as acquiring no certificate");
  assert(/n\/a/i.test(await page.$eval("#deal-kpis", e => e.textContent)),
    "and no certificate premium is priced against it");
  await page.click('[data-route="share"]'); await page.waitForTimeout(300);
}
{
  /* The premium is the tool's central number: price less net tangible. */
  await page.fill("#a-price", "4387206");
  await page.fill("#a-owned", "3787206");
  await page.fill("#a-cash", "0"); await page.fill("#a-debt", "0"); await page.fill("#a-lease", "0");
  await page.waitForTimeout(300);
  assert(/USD 600K/.test(await page.$eval("#premium-table", e => e.textContent)),
    "certificate premium computes to price less net tangible assets");
}
{
  /* Below net tangible assets there is no premium, and the figure must
     not be presented as one. The prose note always handled this; the
     KPI tile and the printed summary did not, and they are the two
     places a reader meets the number without the explanation. */
  await page.fill("#a-price", "0");
  await page.fill("#a-owned", "40000000");
  await page.fill("#a-cash", "5000000");
  await page.waitForTimeout(300);
  assert(!/-\s*USD|USD\s*-/.test(await page.$eval("#deal-kpis", e => e.textContent)),
    "a negative premium is never shown as a negative figure in the KPI tiles");
  assert(/None/.test(await page.$eval("#deal-kpis", e => e.textContent)),
    "the premium tile reads None when the price is below net tangible assets");
  assert(/Discount to net tangible assets/.test(await page.$eval("#premium-table", e => e.textContent)),
    "and the build-up names it a discount rather than a negative premium");
  assert(/below net tangible assets/.test(await page.$eval(".print-summary", e => e.textContent)),
    "the printed summary says so too, since the pack is read away from the note");
}

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

/* ─── The contact address survives without JavaScript ───
   Every `data-email` and `data-version` element on the site shipped
   empty, filled in by common.js at load. With scripting blocked — a
   corporate proxy, a strict extension, a script that 404s — the privacy
   notice's "how to contact us" section rendered an empty anchor. That
   is the one address a person exercising a data-protection right needs,
   and it was the one thing on the page that required the site to be
   working in order to read.

   Fixed by putting the text in the markup and letting the JS keep it in
   step, the same way the registered-entity line already works. That
   trade needs a guard of its own: a fallback that drifts from the data
   is a second source of truth, so the markup and JK.brand must agree. */
section("No-JavaScript fallbacks");
{
  const { readFileSync, readdirSync } = await import("node:fs");
  const dataJs = readFileSync(resolve(ROOT, "assets/js/data.js"), "utf8");
  const email = dataJs.match(/email:\s*"([^"]+)"/)[1];
  const version = dataJs.match(/version:\s*"([^"]+)"/)[1];

  const pages = [
    ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
    ...readdirSync(resolve(ROOT, "tools")).filter((f) => f.endsWith(".html")).map((f) => "tools/" + f)
  ];
  assert(pages.length >= 25, `${pages.length} pages checked for empty hooks`);

  let emptyEmail = 0, emptyVersion = 0, wrongEmail = 0, checkedEmail = 0;
  for (const page of pages) {
    const src = readFileSync(resolve(ROOT, page), "utf8");
    emptyEmail += (src.match(/<a data-email><\/a>/g) || []).length;
    emptyVersion += (src.match(/<span data-version><\/span>/g) || []).length;
    for (const m of src.matchAll(/<a data-email>([^<]*)<\/a>/g)) {
      checkedEmail++;
      if (m[1].trim() !== email) wrongEmail++;
    }
  }
  assert(checkedEmail > 0, `${checkedEmail} email fallbacks found to check`);
  assert(emptyEmail === 0, `no page renders an empty contact address without JS (${emptyEmail} empty)`);
  assert(emptyVersion === 0, `no page renders an empty version without JS (${emptyVersion} empty)`);
  assert(wrongEmail === 0, `every email fallback matches JK.brand.email (${wrongEmail} drifted)`);

  // The privacy notice specifically: the section a data subject uses.
  const privacy = readFileSync(resolve(ROOT, "privacy.html"), "utf8");
  const contact = privacy.slice(privacy.indexOf('id="contact"'));
  assert(contact.includes(email), "the privacy notice's contact section carries the address in markup");
  assert(!/class="todo"/.test(privacy), "the privacy notice carries no unfilled placeholder");
  assert(!/\[[a-z][^\]]{8,}\]/.test(privacy.replace(/<[^>]+>/g, " ")), "no bracketed placeholder in privacy copy");
}

/* ─── A vulnerability report has somewhere to go ─── */
section("Security policy");
{
  const { readFileSync } = await import("node:fs");
  const sec = readFileSync(resolve(ROOT, "SECURITY.md"), "utf8");
  assert(sec.length > 700, `SECURITY.md has substance (${sec.length} chars)`);
  assert(/info@aviationhubkenya\.org/.test(sec), "SECURITY.md names a reporting address");
  assert(/working days/i.test(sec), "SECURITY.md commits to a response time");
  assert(/out of scope/i.test(sec), "SECURITY.md says what is out of scope");
  assert(/safe harbour|safe harbor/i.test(sec), "SECURITY.md offers safe harbour to good-faith reporters");
}

/* ─── The licence exists and matches the Terms ───
   This repository has been publicly readable with no LICENSE file.
   Copyright still applied, but GitHub renders that absence as "no
   license", which a good many readers take to mean "help yourself" —
   and it is exactly the ambiguity a partnership conversation surfaces.
   Terms of Use section 7 has always said the opposite.

   Asserted rather than trusted because the failure mode is quiet and
   one-way: a LICENSE swapped for MIT is a grant of rights that cannot be
   withdrawn, and nothing else in this suite would notice. These checks
   are about posture, not wording. */
section("Licence");
{
  const { readFileSync } = await import("node:fs");
  const licence = readFileSync(resolve(ROOT, "LICENSE"), "utf8");

  assert(licence.length > 800, `LICENSE has substance (${licence.length} chars)`);
  assert(/all rights reserved/i.test(licence), "LICENSE reserves rights");
  assert(/not an open.source licence/i.test(licence), "LICENSE says plainly that it is not open source");

  // Named, so adopting one has to be deliberate rather than arriving in
  // a copied template or a well-meaning pull request.
  for (const osi of ["MIT License", "Apache License", "GNU GENERAL PUBLIC", "BSD License"]) {
    assert(!licence.includes(osi), `LICENSE is not ${osi} (that grant cannot be withdrawn)`);
  }

  // Both halves of the bargain the Terms strike. Without the grant the
  // tools look unusable; without the restriction the methodology is free
  // to take.
  assert(/you may use the tools/i.test(licence), "LICENSE grants use of the tools and their outputs");
  assert(/may not[\s\S]{0,400}redistribute/i.test(licence), "LICENSE restricts redistribution");

  // Entity naming must match the rest of the site, which is
  // mid-incorporation — the same overclaim just removed from the
  // Privacy Notice would be worse in a copyright assertion.
  assert(/incorporation/i.test(licence), "LICENSE states the incorporation position, as the legal pages do");

  const pkg = JSON.parse(readFileSync(resolve(ROOT, "tests", "package.json"), "utf8"));
  assert(
    pkg.license === "SEE LICENSE IN LICENSE",
    `tests/package.json points at the licence file (found ${JSON.stringify(pkg.license)})`
  );
}

/* ─── The incorporation position is stated, not left blank ───
   The Privacy Notice shipped a highlighted
   "[full registered legal name and company registration number]" on the
   live site, inside the one section the Data Protection Act, 2019
   requires to identify the controller. A reader who sees a bracketed
   blank there learns the notice was never finished.

   Two-sided on purpose. While incorporation is pending the pages must
   say so; once it completes and data.js flips, they must carry the
   registered name instead — and this fails until they do, rather than
   leaving the "in progress" wording to outlive the certificate. */
section("Incorporation status is disclosed");
{
  const pendingWording = /incorporation in progress/i;
  for (const path of ["/privacy.html", "/about.html"]) {
    await page.goto(base + path);
    await page.waitForTimeout(300);
    const body = await page.$eval("body", e => e.innerText);

    assert(!/\[[^\]]*registration number[^\]]*\]/i.test(body),
      `${path} carries no bracketed registration placeholder`);
    assert(!/\[full registered legal name/i.test(body),
      `${path} carries no unfilled registered-entity blank`);

    const pending = await page.evaluate(() => window.JK.brand.incorporationPending === true);
    if (pending) {
      assert(pendingWording.test(body), `${path} states that incorporation is in progress`);
    } else {
      assert(!pendingWording.test(body),
        `${path} must drop the "incorporation in progress" wording once data.js says it completed`);
    }
  }

  /* The statement has to survive with JavaScript off. Bound only from
     common.js, the Privacy Notice would render an empty <span> for a
     visitor with scripting disabled — a blank in place of a blank. */
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const bare = await noJs.newPage();
  await bare.goto(base + "/privacy.html");
  const bareText = await bare.$eval("[data-registered-name]", e => e.textContent.trim());
  assert(bareText.length > 20,
    `the registered-entity line renders without JavaScript ("${bareText.slice(0, 40)}")`);
  await noJs.close();
}

/* ─── 25. No JS errors ─── */
section("JavaScript errors");
assert(errs.length === 0, `no uncaught page errors (${errs.length ? errs.join(" | ") : "none"})`);

await browser.close();

record("e2e", { passed: failures === 0, assertions: passed, failures,
  headline: `${passed} behaviour assertions across the site` });
console.log(`\n  ${passed} passed, ${failures} failed`);
console.log(failures ? `\n❌  ${failures} failure(s)` : "\n✅  all E2E checks passed");
process.exit(failures ? 1 : 0);
