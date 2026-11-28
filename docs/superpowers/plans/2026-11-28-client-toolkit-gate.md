# Client Toolkit Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock 13 detailed tools behind one generic password, enforced by a Netlify Edge Function. Reword the footer, Terms, Privacy, FAQ and every "all free" claim to match.

**Architecture:**
- A pure ES module (`netlify/edge-functions/lib/gate.mjs`) holds all logic: the locked-path list, cookie signing and verification, password comparison, the redirect guard and the unlock-page HTML. It runs in Netlify's Deno edge runtime and is imported by Node tests.
- A thin Edge Function handler (`netlify/edge-functions/toolkit-gate.mjs`) binds it to the locked paths and to `POST /unlock`.
- Site copy and the generated footer change in place.

**Tech Stack:** vanilla HTML/CSS/JS; Netlify Edge Functions (Deno, Web Crypto); Node test harness in `tests/`; Playwright e2e over `file://`.

**Spec:** `docs/superpowers/specs/2026-11-28-client-toolkit-gate-design.md`

## Global Constraints

- **Repo rules:** CLAUDE.md and DESIGN.md govern. That means:
  - tokens only, since the audit caps colour and font-size literals;
  - build controls once (§6);
  - never invent a citation (§7);
  - no client names (Ultra Caelum, Ronami, Sandpiper, SAMEL, Kibati), and no personal references.
- **Locked set:** exactly the 13 tools in the spec table, each page plus its `assets/js/page/` script(s). Confirm the file names against the tree.
- **Environment:** the password is `TOOLKIT_PASSWORD` and the signing secret is `TOOLKIT_SECRET`, both Netlify environment variables. Neither may ever appear in the repo, a test fixture, a log or a commit. Tests use a throwaway value generated in the test.
- **Cookie:** `jk_toolkit=<expiry>.<hex HMAC-SHA256>`, set with `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` (30 days).
- **Signing key:** HMAC key = SHA-256 of `TOOLKIT_SECRET + "\n" + TOOLKIT_PASSWORD`, so changing the password invalidates every cookie.
- **Locked request without a valid cookie:**
  - a page gets status 401, the unlock page, `Cache-Control: no-store` and `X-Robots-Tag: noindex`;
  - a script gets 401 with an empty body.
- **Unlock page copy (exact):**
  - heading "Client toolkit";
  - "This tool is part of the JK & Associates client toolkit. Enter the access password you were given.";
  - error "That password is not right.";
  - access line "JK & Associates gives the client toolkit password to clients." followed by a link "Contact us", using the site's existing contact route.
- **CSP:** the unlock page uses no inline script, and the form is a plain `method="post" action="/unlock"`.
- **Free set (8):** the scorecard (`diagnostic.html`), certification-navigator, `regulations.html`, cask-calculator, route-economics, fuel-optimizer, operating-model-canvas, data-request.

## Review Focus

1. **`next` parameter abuse:** for example `/unlock` posted with `next=https://evil.example`, or `//evil`, or `/tools/../x`. The redirect must go only to a locked same-site path, and otherwise to `/tools/`. This is tested in Task 1.
2. **Tampered or expired cookie:** a changed expiry, a truncated MAC, an expiry in the past, or a cookie made before the password changed. Each must be rejected. Tested in Task 1.
3. **Direct script fetch:** requesting `/assets/js/page/tools-venture-builder.js` without the cookie must not return the source. The path is covered in Task 1, and the response is checked live in Task 5.
4. **Missing environment variables at the edge:** the function must fail closed (serve the unlock page, never the tool) and log only the variable name, never a value. Tested in Task 1.
5. **Case and trailing-slash variants of locked URLs:** for example `/tools/Venture-Builder.html` or `/tools/venture-builder`. Netlify's pretty URLs serve `.html` without the extension, so the extensionless path must be locked too. Tested in Task 1 through `isLocked`.

---

### Task 1: Gate logic module + unit tests

**Files:**
- Create: `netlify/edge-functions/lib/gate.mjs`
- Create: `tests/gate.mjs` (Node test, same style as other suites: prints PASS/FAIL, exits non-zero on failure)
- Modify: `tests/package.json` (append `&& node gate.mjs` to the `test` script)

**Interfaces (produces):**
- `export const LOCKED_PAGES: string[]`: site-root paths, for example `"/tools/venture-builder.html"`.
- `export const LOCKED_SCRIPTS: string[]`: for example `"/assets/js/page/tools-venture-builder.js"`.
- `export function isLocked(pathname: string): "page" | "script" | null`
  - Matching is case-insensitive.
  - Treats `/tools/x` and `/tools/x/` as `/tools/x.html`.
- `export async function signCookie(expiryMs: number, secret: string, password: string): Promise<string>`
- `export async function verifyCookie(value: string, nowMs: number, secret: string, password: string): Promise<boolean>`
- `export async function passwordMatches(given: string, password: string): Promise<boolean>`
  - Constant-time: compare SHA-256 digests byte by byte without an early exit.
- `export function safeNext(next: string | null): string`
  - Returns `next` only if `isLocked(next) === "page"`, otherwise `"/tools/"`.
- `export function unlockPage({ toolName: string, next: string, error: boolean, cssHref: string }): string`
  - Full HTML document with the exact copy from Global Constraints.
- Use `globalThis.crypto.subtle`, which exists in both Node 22 and Deno.

- [ ] **Step 1: Write `tests/gate.mjs`** with these assertions. The test generates a random secret and password at runtime.
  - `isLocked("/tools/venture-builder.html") === "page"`.
  - `isLocked("/TOOLS/Venture-Builder.HTML") === "page"`.
  - `isLocked("/tools/venture-builder") === "page"`, and the same with a trailing `/`.
  - `isLocked("/tools/cask-calculator.html") === null`, and the same for every free page.
  - `isLocked("/assets/js/page/tools-venture-builder.js") === "script"`.
  - `isLocked("/assets/js/common.js") === null`.
  - Every one of the 13 spec pages is locked, and the arrays have 13 pages.
  - A round trip of `signCookie` then `verifyCookie` is true.
  - An expiry in the past is false; a flipped character in the MAC is false; a changed expiry with the old MAC is false; a cookie made with password A and checked with password B is false.
  - `passwordMatches("x", "x")` is true; `passwordMatches("x", "y")` is false; an empty string is false.
  - `safeNext` returns `"/tools/"` for `"https://evil.example"`, `"//evil.example"`, `"/tools/../index.html"`, `null` and `"/tools/cask-calculator.html"`. It returns `"/tools/venture-builder.html"` for that path.
  - `unlockPage({toolName:"Greenfield Venture Builder", …})` contains "Client toolkit", "That password is not right." only when `error:true`, `action="/unlock"`, the HTML-escaped tool name and no `<script` tag.
- [ ] **Step 2:** Run `cd tests && node gate.mjs`. Expected: it fails because the module isn't found.
- [ ] **Step 3:** Implement `netlify/edge-functions/lib/gate.mjs` to the interfaces above. Read the real file names from `tools/*.html` script tags so the lists are exact. Map each page to its display name, taken from the `<h3>` on `tools/index.html`, for `unlockPage`.
- [ ] **Step 4:** Run `node tests/gate.mjs`. Expected: all PASS.
- [ ] **Step 5:** Commit `netlify/edge-functions/lib/gate.mjs tests/gate.mjs tests/package.json` with the message "Gate logic: locked paths, signed cookie, safe redirect".

### Task 2: Edge Function handler + binding

**Files:**
- Create: `netlify/edge-functions/toolkit-gate.mjs`
- Modify: `netlify.toml`, to add an `[[edge_functions]]` binding for each locked page, its extensionless form, each locked script and `/unlock`. Alternatively, use an in-file `export const config = { path: [...] }`, built from the lists in Task 1 and kept as one source.
- Modify: `tests/audit.mjs`, to add a guard named "toolkit gate is wired". It checks that every entry of `LOCKED_PAGES` and `LOCKED_SCRIPTS` is covered by the binding, and that no free page is covered.

**Interfaces (consumes):** everything from Task 1.
**Behaviour:**
- **GET on a locked path** with a valid cookie: `return context.next()`.
- **GET on a locked page** without one: 401 plus `unlockPage({error:false, next: the path})`, with the headers listed in Global Constraints.
- **GET on a locked script** without one: 401 with an empty body.
- **POST `/unlock`:**
  - read the form fields `password` and `next`;
  - on a match, 303 to `safeNext(next)` with `Set-Cookie` per Global Constraints;
  - otherwise, 401 plus `unlockPage({error:true, next: safeNext(next)})`.
- **Environment variable missing:** serve the unlock page, then `console.error("toolkit gate: TOOLKIT_PASSWORD not set")`, naming the variable only.

- [ ] **Step 1:** Write the audit guard. Run `node tests/audit.mjs` and see it FAIL, because there is no binding yet.
- [ ] **Step 2:** Implement the handler and the binding.
- [ ] **Step 3:** Run `node tests/audit.mjs`. Expected: the guard passes. Add one free page to the binding, see the guard FAIL, then remove it.
- [ ] **Step 4:** If the Netlify CLI is available offline (`npx netlify dev` is not required), skip running locally; live verification happens in Task 5. Run `node --check` on both files.
- [ ] **Step 5:** Commit with the message "Toolkit gate edge function and binding".

### Task 3: Tools index, footer and licence-page copy

**Files:**
- Modify: `tools/index.html` (13 locked cards)
- Modify: `scripts/build-footer.mjs`
- Modify: `assets/css/jk.css` (a `.lock-badge` built with tokens)
- Modify: `licence-financial-fitness.html`
- Regenerate: every footer, by running `node scripts/build-footer.mjs`
- Modify: `sitemap.xml` (remove the 13 locked pages)
- Modify: the sitemap guard in `tests/audit.mjs`, which imports `LOCKED_PAGES` as the excluded list
- Test: `tests/e2e.mjs`

**Copy (exact):**
- **Locked card:** a badge "Client toolkit", and the card's button text becomes "Unlock →" with the same href.
- **Tools index header:** "<n> free tools and 13 client toolkits", with n computed as today by `data-tool-count`. The "Free forever" eyebrow becomes "Free tools · Client toolkits".
- **Footer note:** "Free diagnostics and client toolkits that run in your browser. Nothing you type leaves your device unless you press Send."
- **Footer locked items:** the tool name followed by ` <span class="lock-badge" aria-label="client toolkit">Client</span>`.
- **Licence page:** one sentence under the buttons: "The Venture Builder test is part of the JK & Associates client toolkit."

- [ ] **Step 1:** Write the e2e assertions:
  - the tools index has exactly 13 `.lock-badge` cards, and each is a locked tool;
  - the 8 free cards have none;
  - the locked buttons read "Unlock →";
  - the footer on `index.html` has 13 "Client" markers;
  - the sitemap has no locked page;
  - the licence page has the toolkit sentence.
- [ ] **Step 2:** Run `node tests/e2e.mjs`. Expected: the new assertions FAIL.
- [ ] **Step 3:** Implement the changes. `build-footer.mjs` reads the badge from the tools index card, so there is one source.
- [ ] **Step 4:** Run `node scripts/build-footer.mjs` and `node tests/e2e.mjs`. Expected: PASS, and `--check` reports clean.
- [ ] **Step 5:** Commit with the message "Mark client toolkits across index, footer, sitemap".

### Task 4: Legal documents, FAQ and "all free" claims

**Files:**
- Modify: `terms.html`, `privacy.html`, `faq.html`, and every page whose copy claims all tools are free
- Test: `tests/e2e.mjs` (or `tests/audit.mjs` for static text checks)

**Content (decided; wording within these points is the builder's):**
- **Terms of Use:** a new section headed "Client toolkits". It states that:
  - access is by password issued to clients;
  - the password is confidential to the client's organisation and must not be shared or published;
  - access may be withdrawn and the password changed at any time;
  - outputs remain indicative and every existing disclaimer applies in full.
  
  Remove every statement that the whole toolkit is free, and keep the statements that the free tools are free. Update the "Last updated" date to 28 November 2026.
- **Privacy Notice:** add the cookie `jk_toolkit`:
  - it is strictly necessary and set only after a correct password;
  - it lasts 30 days;
  - it holds an expiry time and a signature, and no personal data;
  - the password itself is sent only to unlock and is not stored.
  
  Keep the existing Kenya Data Protection Act framing. Update "Last updated".
- **FAQ:** add four questions:
  - "What is free?" (the 8 tools by name);
  - "What are the client toolkits?";
  - "How do I get access?" (from JK & Associates as a client, with the contact route);
  - "Why is there a password?" (proprietary models offered to clients).
  
  Correct any answer that says everything is free.
- **Other pages:** grep `-i "free forever\|all .*free\|every tool .*free\|free tools"` across `*.html`. Reword each claim that is now false, and keep the true ones.

- [ ] **Step 1:** Write the assertions:
  - `terms.html` contains the heading "Client toolkits" and "confidential";
  - `privacy.html` contains "jk_toolkit" and "30 days";
  - `faq.html` contains the four questions;
  - no served `.html` contains "Free forever", or "every tool" within 40 characters of "free".
- [ ] **Step 2:** Run the assertions. Expected: they FAIL.
- [ ] **Step 3:** Edit the pages, keeping the prose measure and the existing structure.
- [ ] **Step 4:** Run the assertions. Expected: they PASS. The audit's OG and description guards must still pass, so update meta descriptions that claim everything is free.
- [ ] **Step 5:** Commit with the message "Terms, Privacy, FAQ and site copy for client toolkits".

### Task 5: Full gate, environment, deploy, live verification

These steps are done by the controller (main session), not a subagent: secrets, merge and deploy.

- [ ] **Step 1:** Run `cd tests && npm test` (expect exit 0), then `node scripts/build-verification.mjs`, then `node scripts/package-deploy.mjs` (expect 13/13 PASS).
- [ ] **Step 2:** Generate the password with `crypto.randomBytes` (for example four lowercase words and a number, or 20 or more random base32 characters) and a 32-byte hex secret. Set `TOOLKIT_PASSWORD` and `TOOLKIT_SECRET` through Netlify `manage-env-vars` as secret, scope functions or runtime, context production. Print neither to a file in the repo.
- [ ] **Step 3:** PR, merge and deploy from a clean clone, with the tree matched to the verified commit.
- [ ] **Step 4:** Live checks with `curl` and Playwright against the production URL:
  - `/tools/venture-builder.html` without the cookie returns 401 and contains "Client toolkit";
  - `/tools/venture-builder` without the cookie returns 401;
  - `/assets/js/page/tools-venture-builder.js` without the cookie returns 401 with no JS;
  - a POST with a wrong password returns 401 and the error copy;
  - a POST with the right password returns 303 with `Set-Cookie` HttpOnly and Secure, and the page loads with `#asl-juris` present;
  - `/tools/cask-calculator.html` returns 200 without a cookie;
  - the scorecard and embed return 200.
- [ ] **Step 5:** Give the owner the password in chat only, with how to rotate it. Recommend making the repository private.
