/* Unit tests for the client toolkit gate (netlify/edge-functions/lib/gate.mjs).
 *
 * The gate runs at Netlify's edge, which nothing else in this suite can
 * reach: the browser suites open pages over file:// or a local server
 * where no edge function runs. So the logic lives in a plain ES module
 * and is tested here directly — the locked-path list, the signed
 * cookie, the password comparison, the redirect guard and the unlock
 * page.
 *
 * No real password appears here or anywhere in the repository. Every
 * secret and password below is generated at runtime and thrown away.
 *
 * Run: node tests/gate.mjs  (also run by tests/audit.mjs, so CI and the
 * deploy packager both execute it). Exits non-zero on any failure. */

import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const gate = await import("../netlify/edge-functions/lib/gate.mjs");
const {
  LOCKED_PAGES, LOCKED_SCRIPTS, isLocked, signCookie, verifyCookie,
  passwordMatches, safeNext, unlockPage, toolNameFor
} = gate;

let pass = 0;
const fails = [];
function ok(cond, name) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fails.push(name); console.log(`  FAIL  ${name}`); }
}

const rnd = () => randomBytes(24).toString("base64url");
const SECRET = rnd();
const PW_A = rnd();
const PW_B = rnd();

/* The spec's table, written out independently of the module so the
   module cannot quietly drop a tool and still pass. */
const SPEC_LOCKED = [
  "venture-dashboard", "venture-builder", "revenue-builder", "corporate-structure",
  "implementation-planner", "aoc-acquisition", "returns-solver", "fleet-crew",
  "plan-consistency", "safety-map", "organogram-planner", "mro-readiness", "training-tna"
];
const FREE_PAGES = [
  "/diagnostic.html", "/regulations.html", "/tools/certification-navigator.html",
  "/tools/cask-calculator.html", "/tools/route-economics.html", "/tools/fuel-optimizer.html",
  "/tools/operating-model-canvas.html", "/tools/data-request.html", "/tools/index.html",
  "/tools/", "/", "/index.html", "/embed.html", "/offline.html"
];

console.log("\nlocked paths");
ok(isLocked("/tools/venture-builder.html") === "page", "venture-builder.html is a locked page");
ok(isLocked("/TOOLS/Venture-Builder.HTML") === "page", "case variant is locked");
ok(isLocked("/tools/venture-builder") === "page", "extensionless form is locked");
ok(isLocked("/tools/venture-builder/") === "page", "trailing-slash form is locked");
ok(isLocked("/tools/Venture-Builder") === "page", "extensionless case variant is locked");
ok(isLocked("/tools/venture-builder.html/") === "page", ".html with trailing slash is locked");
for (const p of FREE_PAGES) ok(isLocked(p) === null, `${p} is free`);
for (const p of FREE_PAGES.filter((x) => x.endsWith(".html"))) {
  ok(isLocked(p.replace(/\.html$/, "")) === null, `${p} extensionless is free`);
}
ok(isLocked("/assets/js/page/tools-venture-builder.js") === "script", "venture-builder script is locked");
ok(isLocked("/ASSETS/JS/PAGE/Tools-Venture-Builder.JS") === "script", "script case variant is locked");
ok(isLocked("/assets/js/common.js") === null, "common.js is free");
ok(isLocked("/assets/js/data.js") === null, "data.js is free");
ok(isLocked("/assets/js/data-ventures.js") === null, "data-ventures.js is free (used by free tools)");
ok(isLocked("/assets/js/page/tools-cask-calculator.js") === null, "cask script is free");
ok(isLocked("/tools/venture-builder.html.bak") === null, "a lookalike path is not a locked page");
ok(isLocked("") === null && isLocked(null) === null, "empty or null is not locked");
ok(LOCKED_PAGES.length === 13, `13 locked pages (got ${LOCKED_PAGES.length})`);
for (const slug of SPEC_LOCKED) {
  ok(LOCKED_PAGES.includes(`/tools/${slug}.html`), `spec tool ${slug} is in LOCKED_PAGES`);
  ok(isLocked(`/tools/${slug}`) === "page", `spec tool ${slug} extensionless is locked`);
  ok(typeof toolNameFor(`/tools/${slug}.html`) === "string" && toolNameFor(`/tools/${slug}.html`).length > 3,
    `spec tool ${slug} has a display name`);
}

/* Read from the tree, not trusted from the module: every page script a
   locked page loads, and every shared script loaded ONLY by locked
   pages, must be locked; every script a free page loads must not be. */
const scriptsOf = (file) => [...readFileSync(join(ROOT, file), "utf8").matchAll(/<script[^>]*\ssrc="([^"]+)"/g)]
  .map((m) => "/" + m[1].replace(/^(\.\.\/)+/, "").replace(/^\//, ""));
const htmlAll = [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
  ...readdirSync(join(ROOT, "tools")).filter((f) => f.endsWith(".html")).map((f) => "tools/" + f)
];
const usedByFree = new Set();
const usedByLocked = new Set();
for (const f of htmlAll) {
  const set = LOCKED_PAGES.includes("/" + f) ? usedByLocked : usedByFree;
  for (const s of scriptsOf(f)) set.add(s);
}
for (const s of usedByLocked) {
  if (!usedByFree.has(s)) ok(isLocked(s) === "script", `${s} (only locked pages load it) is locked`);
}
for (const s of usedByFree) ok(isLocked(s) === null, `${s} (a free page loads it) is free`);
ok(LOCKED_SCRIPTS.every((s) => usedByLocked.has(s) && !usedByFree.has(s)),
  "every LOCKED_SCRIPTS entry is loaded by a locked page and by no free page");

console.log("\nsigned cookie");
const now = Date.now();
const exp = now + 30 * 24 * 3600 * 1000;
const c = await signCookie(exp, SECRET, PW_A);
ok(/^\d+\.[0-9a-f]{64}$/.test(c), "cookie is <expiry>.<hex sha256 mac>");
ok(await verifyCookie(c, now, SECRET, PW_A), "round trip verifies");
ok(!(await verifyCookie(await signCookie(now - 1000, SECRET, PW_A), now, SECRET, PW_A)), "expired cookie is rejected");
const [e, mac] = c.split(".");
const flipped = e + "." + (mac[0] === "a" ? "b" : "a") + mac.slice(1);
ok(!(await verifyCookie(flipped, now, SECRET, PW_A)), "flipped MAC character is rejected");
ok(!(await verifyCookie(e + "." + mac.slice(0, 40), now, SECRET, PW_A)), "truncated MAC is rejected");
ok(!(await verifyCookie(String(Number(e) + 1e9) + "." + mac, now, SECRET, PW_A)), "changed expiry with old MAC is rejected");
ok(!(await verifyCookie(c, now, SECRET, PW_B)), "cookie made before a password change is rejected");
ok(!(await verifyCookie(c, now, rnd(), PW_A)), "cookie made with another secret is rejected");
ok(!(await verifyCookie("", now, SECRET, PW_A)) && !(await verifyCookie(null, now, SECRET, PW_A)),
  "empty or missing cookie is rejected");
ok(!(await verifyCookie("garbage", now, SECRET, PW_A)), "malformed cookie is rejected");
ok(!(await verifyCookie(c, now, "", "")), "empty secret and password never verify");
const far = await signCookie(now + 400 * 24 * 3600 * 1000, SECRET, PW_A);
ok(!(await verifyCookie(far, now, SECRET, PW_A)), "an expiry beyond 31 days is rejected");

console.log("\npassword comparison");
ok(await passwordMatches(PW_A, PW_A), "same password matches");
ok(!(await passwordMatches(PW_A, PW_B)), "different password does not match");
ok(!(await passwordMatches("", PW_A)), "empty given password does not match");
ok(!(await passwordMatches("", "")), "empty configured password never matches");
ok(!(await passwordMatches(PW_A.slice(0, -1), PW_A)), "a prefix does not match");
ok(!(await passwordMatches(null, PW_A)), "null does not match");

console.log("\nredirect guard");
for (const bad of ["https://evil.example", "//evil.example", "/tools/../index.html", null, "",
  "/tools/cask-calculator.html", "javascript:alert(1)", "/\\evil.example", "/tools/venture-builder.html?x=//evil",
  " /tools/venture-builder.html", "/tools/%2e%2e/index.html"]) {
  ok(safeNext(bad) === "/tools/", `safeNext(${JSON.stringify(bad)}) → /tools/`);
}
ok(safeNext("/tools/venture-builder.html") === "/tools/venture-builder.html", "safeNext keeps a locked page");
ok(safeNext("/tools/venture-builder") === "/tools/venture-builder", "safeNext keeps an extensionless locked page");

console.log("\nunlock page");
const plain = unlockPage({ toolName: "Greenfield Venture Builder", next: "/tools/venture-builder.html", error: false, cssHref: "/assets/css/jk.css" });
const errd = unlockPage({ toolName: "Greenfield Venture Builder", next: "/tools/venture-builder.html", error: true, cssHref: "/assets/css/jk.css" });
const amp = unlockPage({ toolName: "Fleet & Crew <Planner>", next: "/tools/fleet-crew.html", error: false, cssHref: "/assets/css/jk.css" });
const evilNext = unlockPage({ toolName: "x", next: '"><script>alert(1)</script>', error: false, cssHref: "/assets/css/jk.css" });
ok(/^<!DOCTYPE html>/i.test(plain), "is a full HTML document");
ok(plain.includes("<h1>Client toolkit</h1>"), 'heading "Client toolkit"');
ok(plain.includes("This tool is part of the JK &amp; Associates client toolkit. Enter the access password you were given."), "exact intro copy");
ok(plain.includes("JK &amp; Associates gives the client toolkit password to clients.") && />Contact us</.test(plain), "access line and Contact us link");
ok(!plain.includes("That password is not right.") && errd.includes("That password is not right."), "error copy only when error:true");
ok(plain.includes('method="post"') && plain.includes('action="/unlock"'), "plain POST form to /unlock");
ok(plain.includes("Greenfield Venture Builder"), "names the tool");
ok(amp.includes("Fleet &amp; Crew &lt;Planner&gt;") && !amp.includes("<Planner>"), "tool name is HTML-escaped");
ok(!/<script/i.test(plain) && !/<script/i.test(errd) && !/<script/i.test(evilNext), "no <script> tag, even with a hostile next");
ok(/name="robots" content="noindex/.test(plain), "carries noindex");
ok(plain.includes('value="/tools/venture-builder.html"'), "carries next as a hidden field");
ok(evilNext.includes('value="/tools/"'), "hostile next is replaced by /tools/");
ok(plain.includes('href="/assets/css/jk.css"'), "uses the site stylesheet");
ok(/type="password"/.test(plain) && /autocomplete="current-password"/.test(plain), "password input");
ok(/<footer/.test(plain) && plain.includes('href="/privacy.html"') && plain.includes('href="/terms.html"'), "has a footer with Privacy and Terms");

console.log(`\n${fails.length ? "❌" : "✅"} gate: ${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
