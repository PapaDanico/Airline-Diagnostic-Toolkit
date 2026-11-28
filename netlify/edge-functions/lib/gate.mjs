/* Client toolkit gate — all of the logic, none of the runtime.
 *
 * Thirteen detailed tools are offered to clients only. Access is one
 * generic password, issued to clients outside the website. This module
 * decides which paths are locked, signs and checks the access cookie,
 * compares the password, guards the post-unlock redirect and renders
 * the unlock page.
 *
 * It is a plain ES module on purpose: it runs in Netlify's Deno edge
 * runtime (via toolkit-gate.mjs) AND is imported by `node tests/gate.mjs`.
 * So it uses only Web-standard APIs present in both — globalThis.crypto
 * .subtle and TextEncoder — and nothing Deno- or Node-specific.
 *
 * The password and the signing secret are never in this file or the
 * repository. They are Netlify environment variables (TOOLKIT_PASSWORD,
 * TOOLKIT_SECRET), read by the handler and passed in as arguments. */

/* The locked tools: path → display name (the <h3> on tools/index.html).
   One list; the edge binding, the sitemap guard, the service worker
   guard and the footer badges are all checked against it. */
const TOOLS = [
  ["venture-dashboard", "Venture Control Room"],
  ["venture-builder", "Greenfield Venture Builder"],
  ["revenue-builder", "Revenue Model Builder"],
  ["corporate-structure", "Corporate Structure Designer"],
  ["implementation-planner", "Implementation & Programme Planner"],
  ["aoc-acquisition", "AOC Acquisition Analyser"],
  ["returns-solver", "Returns & Reverse-Solve"],
  ["fleet-crew", "Fleet & Crew Planner"],
  ["plan-consistency", "Plan Consistency Check"],
  ["safety-map", "Safety Assurance Map"],
  ["organogram-planner", "Organogram & Postholder Planner"],
  ["mro-readiness", "MRO & Technical Readiness Diagnostic"],
  ["training-tna", "Training Needs Analysis"]
];

const NAMES = new Map(TOOLS.map(([slug, name]) => [`/tools/${slug}.html`, name]));

export const LOCKED_PAGES = TOOLS.map(([slug]) => `/tools/${slug}.html`);

/* Each locked page's own script(s), read from its <script> tags, plus
   the three shared files that ONLY locked pages load (the acquisition
   and implementation data, and the Venture File). Shared files a free
   page also loads (data.js, data-ventures.js, common.js) stay open —
   locking them would break the free tools. tests/gate.mjs re-derives
   this split from the HTML and fails if it drifts. */
export const LOCKED_SCRIPTS = [
  "/assets/js/page/tools-venture-dashboard.js",
  "/assets/js/page/tools-venture-builder.js",
  "/assets/js/page/tools-revenue-builder.js",
  "/assets/js/page/tools-corporate-structure.js",
  "/assets/js/page/tools-implementation-planner.js",
  "/assets/js/page/tools-aoc-acquisition.js",
  "/assets/js/page/tools-returns-solver.js",
  "/assets/js/page/tools-fleet-crew.js",
  "/assets/js/page/tools-plan-consistency.js",
  "/assets/js/page/tools-safety-map.js",
  "/assets/js/page/tools-organogram-planner.js",
  "/assets/js/page/tools-mro-readiness.js",
  "/assets/js/page/tools-training-tna-1.js",
  "/assets/js/page/tools-training-tna-2.js",
  "/assets/js/data-acquisition.js",
  "/assets/js/data-implementation.js",
  "/assets/js/venture-file.js"
];

const PAGE_SET = new Set(LOCKED_PAGES);
const SCRIPT_SET = new Set(LOCKED_SCRIPTS);

export const COOKIE_NAME = "jk_toolkit";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // seconds
const MAX_AGE_MS = COOKIE_MAX_AGE * 1000;
const SKEW_MS = 24 * 60 * 60 * 1000; // an expiry further out than 31 days was not minted here

/* Normalise a request path the way a liberal static server might, so
   that every spelling that could reach a locked file is recognised:
   percent-decoding, repeated slashes, dot segments, case, a trailing
   slash and the missing .html of a pretty URL. Matching MORE spellings
   than the server serves is the safe direction for a lock. */
function canonical(pathname) {
  if (typeof pathname !== "string" || !pathname) return null;
  let p = pathname;
  try { p = decodeURIComponent(p); } catch { return null; }
  if (!p.startsWith("/") && !p.startsWith("\\")) return null;
  p = p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  try { p = new URL(p, "https://gate.invalid").pathname; } catch { return null; }
  p = p.toLowerCase();
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p;
}

/** "page" | "script" | null */
export function isLocked(pathname) {
  const p = canonical(pathname);
  if (!p) return null;
  if (SCRIPT_SET.has(p)) return "script";
  if (PAGE_SET.has(p)) return "page";
  if (PAGE_SET.has(p + ".html")) return "page";
  return null;
}

/** The display name for a locked page path, or a generic label. */
export function toolNameFor(pathname) {
  const p = canonical(pathname);
  if (!p) return "Client toolkit";
  return NAMES.get(p) || NAMES.get(p + ".html") || "Client toolkit";
}

/* The redirect after a correct password. Only a same-site locked page,
   spelt plainly; anything else — another host, a protocol-relative URL,
   dot segments, encodings, a query — goes to the tools index. This is
   the open-redirect guard, and it is deliberately stricter than
   isLocked: isLocked must recognise every spelling, safeNext must only
   accept a clean one. */
export function safeNext(next) {
  if (typeof next !== "string") return "/tools/";
  if (!/^\/[A-Za-z0-9._\/-]*$/.test(next)) return "/tools/";
  if (next.includes("//") || next.includes("..")) return "/tools/";
  return isLocked(next) === "page" ? next : "/tools/";
}

/* ---- crypto ---- */

const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

async function sha256(str) {
  return new Uint8Array(await subtle().digest("SHA-256", enc.encode(str)));
}

function hex(bytes) {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

/* Constant-time over equal-length inputs: no early exit. */
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* The HMAC key is SHA-256(secret + "\n" + password): changing the
   password changes the key, so every cookie minted under the old one
   stops verifying. That is what makes rotation lock everyone out. */
async function macFor(expiryMs, secret, password) {
  const raw = await sha256(`${secret}\n${password}`);
  const key = await subtle().importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await subtle().sign("HMAC", key, enc.encode(String(expiryMs)))));
}

export async function signCookie(expiryMs, secret, password) {
  const e = Math.floor(Number(expiryMs));
  return `${e}.${await macFor(e, secret, password)}`;
}

export async function verifyCookie(value, nowMs, secret, password) {
  if (!secret || !password || typeof value !== "string") return false;
  const m = /^(\d{1,16})\.([0-9a-f]{64})$/.exec(value);
  if (!m) return false;
  const expiry = Number(m[1]);
  if (!(expiry > nowMs) || expiry > nowMs + MAX_AGE_MS + SKEW_MS) return false;
  const want = await macFor(expiry, secret, password);
  return equalBytes(enc.encode(want), enc.encode(m[2]));
}

/* Compare SHA-256 digests byte by byte, so the time taken does not
   depend on how much of the password was right, or on its length. */
export async function passwordMatches(given, password) {
  if (typeof given !== "string" || typeof password !== "string" || !password) return false;
  const [a, b] = await Promise.all([sha256(given), sha256(password)]);
  return equalBytes(a, b) && given.length > 0;
}

export function cookieHeader(value) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

/** Read one cookie from a Cookie request header. */
export function readCookie(header, name = COOKIE_NAME) {
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/* ---- the unlock page ---- */

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Same CSP as _headers. Netlify's custom headers do not apply to a
   response an edge function returns, so the page carries its own. */
export const UNLOCK_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; " +
  "font-src 'self'; connect-src 'self'; form-action 'self'; frame-src 'self'; " +
  "frame-ancestors 'self'; base-uri 'self'; object-src 'none';";

/* No script at all: the form is a plain POST, so the page works with
   JavaScript off and adds nothing for the CSP to allow. The contact
   link goes to the engagement-brief capture form (CLAUDE.md §9: a form,
   not a mailto). */
export function unlockPage({ toolName, next, error, cssHref = "/assets/css/jk.css" }) {
  const name = esc(toolName || "Client toolkit");
  const dest = esc(safeNext(next));
  const css = esc(cssHref);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Client toolkit — ${name} | JK &amp; Associates</title>
<link rel="icon" type="image/png" href="/assets/img/jk-badge.png">
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="${css}">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<nav class="nav">
  <div class="wrap">
    <a class="brand" href="/"><img class="logo" src="/assets/img/jk-badge.png" alt="" width="42" height="42"><span>JK &amp; Associates<small>Client toolkit</small></span></a>
  </div>
</nav>
<main id="main">
<section class="section band-parchment">
  <div class="wrap legal">
    <p class="eyebrow">${name}</p>
    <h1>Client toolkit</h1>
    <p>This tool is part of the JK &amp; Associates client toolkit. Enter the access password you were given.</p>
    ${error ? '<p class="note warn" role="alert">That password is not right.</p>' : ""}
    <form method="post" action="/unlock" class="card card-flat">
      <input type="hidden" name="next" value="${dest}">
      <div class="field">
        <label for="toolkit-password">Access password</label>
        <input id="toolkit-password" name="password" type="password" autocomplete="current-password" required>
      </div>
      <button class="btn btn-amber" type="submit">Unlock ${name}</button>
    </form>
    <p>JK &amp; Associates gives the client toolkit password to clients. <a href="/how-it-works.html#brief-enquiry">Contact us</a></p>
    <p><a href="/tools/">See the free tools →</a></p>
  </div>
</section>
</main>
<footer class="footer">
  <div class="wrap">
    <p class="f-note">Free diagnostics and client toolkits that run in your browser. Nothing you type leaves your device unless you press Send.</p>
    <div class="ver">
      <span>&copy; JK &amp; Associates · Shaping Africa's Future, Together.</span>
      <span><a href="/tools/">All tools</a> · <a href="/privacy.html">Privacy Notice</a> · <a href="/terms.html">Terms of Use</a></span>
    </div>
  </div>
</footer>
</body>
</html>
`;
}
