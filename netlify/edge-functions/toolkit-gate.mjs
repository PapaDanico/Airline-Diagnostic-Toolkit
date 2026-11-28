/* Netlify Edge Function: the client toolkit gate.
 *
 * A thin wrapper. Every decision is made in ./lib/gate.mjs, which the
 * Node suite unit-tests (tests/gate.mjs); this file only reads the
 * request, the environment and the cookie, and builds the response.
 *
 *   GET  locked page,   valid cookie  → the page (context.next())
 *   GET  locked page,   no cookie     → 401 + branded unlock page
 *   GET  locked script, no cookie     → 401, empty body
 *   POST /unlock, right password      → 303 to the tool + Set-Cookie
 *   POST /unlock, wrong password      → 401 + unlock page with the error
 *
 * Fails closed: if TOOLKIT_PASSWORD or TOOLKIT_SECRET is not set, every
 * locked request gets the unlock page and nothing unlocks. The log line
 * names the variable, never a value. onError "fail" keeps an exception
 * closed too — Netlify's error page, never the tool.
 *
 * The binding is computed from the same lists as the logic (one source)
 * and checked by tests/audit.mjs "toolkit gate is wired". It is a regex
 * `pattern` rather than URLPattern `path` strings so that one binding
 * covers every case spelling, the extensionless pretty URL, a trailing
 * slash and repeated slashes. Any path containing "%" is also routed
 * here, so a percent-encoded spelling of a locked file cannot slip past
 * the pattern; the handler decodes it and passes free paths through.
 * Edge functions run before _redirects, so the extensionless 200
 * rewrites there cannot route around the gate. */

import {
  LOCKED_PAGES, LOCKED_SCRIPTS, COOKIE_MAX_AGE, UNLOCK_CSP,
  isLocked, toolNameFor, signCookie, verifyCookie, passwordMatches,
  safeNext, unlockPage, cookieHeader, readCookie
} from "./lib/gate.mjs";

/* "Venture" → "[vV][eE]…", "/" → "/+", "." → "\." */
const ci = (s) => s.replace(/[a-z]/gi, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const rx = (path) => path.split("/").filter(Boolean).map((seg) => ci(seg).replace(/\./g, "\\.")).join("/+");
const pagesRx = LOCKED_PAGES.map((p) => rx(p.replace(/\.html$/, ""))).join("|");
const scriptsRx = LOCKED_SCRIPTS.map(rx).join("|");
const PATTERN =
  `^/+(?:(?:${pagesRx})(?:\\.${ci("html")})?/*|(?:${scriptsRx})|${ci("unlock")}/*)$` +
  "|^/[^?#]*%";

export const config = {
  pattern: PATTERN,
  onError: "fail"
};

const SECURITY_HEADERS = {
  "Content-Security-Policy": UNLOCK_CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex"
};

function envGet(name) {
  try { return globalThis.Netlify?.env?.get(name) || ""; } catch { return ""; }
}

function unlockResponse(next, error) {
  return new Response(unlockPage({ toolName: toolNameFor(next), next, error, cssHref: "/assets/css/jk.css" }), {
    status: 401,
    headers: { ...SECURITY_HEADERS, "Content-Type": "text/html; charset=utf-8" }
  });
}

function deny(kind, pathname) {
  if (kind === "script") return new Response(null, { status: 401, headers: SECURITY_HEADERS });
  return unlockResponse(pathname, false);
}

export default async function toolkitGate(request, context) {
  const url = new URL(request.url);
  const password = envGet("TOOLKIT_PASSWORD");
  const secret = envGet("TOOLKIT_SECRET");
  const missing = !password ? "TOOLKIT_PASSWORD" : !secret ? "TOOLKIT_SECRET" : null;

  if (/^\/+unlock\/*$/i.test(url.pathname)) {
    if (request.method !== "POST") {
      return new Response(null, { status: 303, headers: { ...SECURITY_HEADERS, Location: "/tools/" } });
    }
    let given = "", next = null;
    try {
      const form = await request.formData();
      given = String(form.get("password") || "");
      next = form.get("next");
      next = typeof next === "string" ? next : null;
    } catch { /* an unreadable body is a wrong password */ }
    const dest = safeNext(next);
    if (missing) {
      console.error(`toolkit gate: ${missing} not set`);
      return unlockResponse(dest, false);
    }
    if (await passwordMatches(given, password)) {
      const value = await signCookie(Date.now() + COOKIE_MAX_AGE * 1000, secret, password);
      return new Response(null, {
        status: 303,
        headers: { ...SECURITY_HEADERS, Location: dest, "Set-Cookie": cookieHeader(value) }
      });
    }
    return unlockResponse(dest, true);
  }

  const kind = isLocked(url.pathname);
  if (!kind) return; // a free path routed here only because it contains "%"

  if (missing) {
    console.error(`toolkit gate: ${missing} not set`);
    return deny(kind, url.pathname);
  }

  const cookie = readCookie(request.headers.get("cookie"));
  if (!(await verifyCookie(cookie, Date.now(), secret, password))) return deny(kind, url.pathname);

  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("Vary", "Cookie");
  return out;
}
