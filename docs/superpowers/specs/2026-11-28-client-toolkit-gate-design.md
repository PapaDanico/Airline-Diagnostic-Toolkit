# Client toolkit gate — design

**Date:** 28 November 2026 · **Status:** approved (owner delegated the calls: "your recommendations, your call")

## Intent
The detailed, proprietary tools are what clients pay for and should not be
open to everyone. A small set of lighter tools stays free as the front door.
Access to the rest is one generic password that the owner hands to paying
clients outside the website. No form, no accounts, no online payment.

## Goals
- 13 detailed tools are reachable only after the password is entered.
- The lock is enforced by Netlify before the page or its script is served,
  not by JavaScript in the page.
- The password never appears in the repository. Changing it locks out
  everyone who had the old one.
- Every page that promises "everything is free" is reworded. The footer,
  Terms of Use, Privacy Notice and FAQ describe the free tools and the
  client toolkits accurately.

## Non-goals
- Per-client passwords, accounts, request-access forms, online payment.
- Rate limiting beyond a strong generated password. This is noted as a
  limit, not built.
- Changing any tool's behaviour once unlocked.

## Anti-goals
- A lock a visitor can bypass by reading the page source or by fetching
  the page script directly.
- Breaking the free tools, the scorecard partner embed, the offline page
  or the printed packs.
- Leaking the password into a commit, a log or the built site.

## The split (owner's call delegated)
**Free (8):** Airline Health Scorecard (`diagnostic.html`), KCAA
Certification Navigator, Kenya Aviation Regulatory Index (`regulations.html`),
CASK Benchmarking, Route Economics, Fuel Contract Optimizer Lite, Operating
Model Canvas, 48-Hour Data Request Pack.

**Locked (13), each page plus its `assets/js/page/` script(s):**

| Tool | Page | Script |
|---|---|---|
| Venture Control Room | `tools/venture-dashboard.html` | `tools-venture-dashboard.js` |
| Greenfield Venture Builder | `tools/venture-builder.html` | `tools-venture-builder.js` |
| Revenue Model Builder | `tools/revenue-builder.html` | `tools-revenue-builder.js` |
| Corporate Structure Designer | `tools/corporate-structure.html` | `tools-corporate-structure.js` |
| Implementation & Programme Planner | `tools/implementation-planner.html` | `tools-implementation-planner.js` |
| AOC Acquisition Analyser | `tools/aoc-acquisition.html` | `tools-aoc-acquisition.js` |
| Returns & Reverse-Solve | `tools/returns-solver.html` | `tools-returns-solver.js` |
| Fleet & Crew Planner | `tools/fleet-crew.html` | `tools-fleet-crew.js` |
| Plan Consistency Check | `tools/plan-consistency.html` | `tools-plan-consistency.js` |
| Safety Assurance Map | `tools/safety-map.html` | `tools-safety-map.js` |
| Organogram & Postholder Planner | `tools/organogram-planner.html` | `tools-organogram-planner.js` |
| MRO & Technical Readiness | `tools/mro-readiness.html` | `tools-mro-readiness.js` |
| Training Needs Analysis | `tools/training-tna.html` | `tools-training-tna-1.js`, `-2.js` |

The builder confirms each tool's real file names before relying on this
table, and also locks any data file used only by locked tools.

## Approaches considered
1. **Netlify Basic-Auth in `_headers`.** This is the browser's grey sign-in
   box. It is unbranded, and the password would have to be written into a
   file stored on GitHub, which is public. Rejected.
2. **Netlify Edge Function and a branded unlock page. Chosen.** A
   request for a locked path without a valid access cookie gets a JK &
   Associates unlock page instead. A correct password sets the cookie for
   30 days. The password and the signing secret live in Netlify
   environment variables.
3. **Client-side check only.** Bypassable by anyone who reads the source.
   Rejected.

## How it works (decided)
- **Edge Function** (`netlify/edge-functions/`), bound to the locked
  pages and scripts, plus a `POST /unlock` route.
  - Cookie `jk_toolkit`, set `HttpOnly; Secure; SameSite=Lax; Max-Age=30 days; Path=/`.
  - The cookie value is `<expiry>.<HMAC-SHA256(expiry, key)>`, where the
    key is derived from `TOOLKIT_SECRET` and the current password.
    Changing the password therefore invalidates every existing cookie.
  - The password comparison takes the same time whatever is typed.
- **Unlock page:**
  - It is served with status 401 and the site's normal look, CSP and
    footer. It names the tool being unlocked.
  - The form is a plain HTML POST, with no script needed. It returns the
    visitor to the tool they asked for, and only to a same-site locked
    path, never an open redirect.
  - A wrong password gives a plain "That password is not right" message,
    with the same status and no lock-out.
  - It carries `noindex` and a line saying how to get access: "JK &
    Associates gives the client toolkit password to clients. Contact us."
    The link goes to the existing contact route.
- **Locked scripts requested without the cookie** get 401, not the script.
- **Password:** I generate a strong passphrase, and the owner receives it
  in chat only. It is stored as `TOOLKIT_PASSWORD`, with `TOOLKIT_SECRET`
  random, both in Netlify environment variables. Neither goes in the repo,
  a log or a test fixture.
- **Function logic:** written as a plain ES module, so the Node test suite
  can import and unit-test it. The Netlify handler is a thin wrapper.

## Site changes (decided)
- **Tools index:** locked tools stay listed, as marketing, with a
  "Client toolkit" lock badge and the button text "Unlock →". The free
  count wording changes to "8 free tools and 13 client toolkits".
- **Footer** (`scripts/build-footer.mjs`):
  - Locked tools carry a small lock marker or a "client" label.
  - The tagline "Free tools that run in your browser. Nothing you type
    leaves your device unless you press Send." keeps its privacy promise
    and drops the claim that everything is free.
  - The footer is regenerated across every page.
- **Terms of Use:**
  - The toolkit is no longer described as entirely free.
  - A new *Client toolkits* section covers: access is by password issued
    to clients; the password is confidential to the client organisation
    and must not be shared or published; access may be withdrawn or the
    password changed at any time; outputs remain indicative and the
    existing disclaimers apply in full.
- **Privacy Notice:**
  - One strictly necessary cookie is added: name, purpose, 30-day life,
    and the fact that it holds no personal data. Kenya Data Protection
    Act framing is kept.
  - "Nothing you type leaves your device" stays true. The password is
    sent only to unlock, and it is not stored.
- **FAQ:** new Q&As on what is free, what the client toolkits are, how to
  get access, and why there is a password. Any FAQ answers saying
  everything is free are corrected.
- **Every other page stating that all tools are free** (about 37 pages
  mention "free") is reworded where the claim is now wrong. Correct
  statements about the free tools stay.
- **Licence page:** its "Test your plan" buttons stay. A line notes that
  the Venture Builder test is part of the client toolkit.
- **Sitemap:** locked pages are removed, and the audit's sitemap-vs-tree
  check gets an explicit locked-pages list.
- **Service worker:** must never cache a locked page or script. Today
  `sw.js` precaches only the CASK calculator; the builder confirms this
  and guards it.

## Verification
- **Unit tests:** cookie sign and verify, expiry, password change
  invalidating old cookies, constant-time compare, the redirect guard.
- **e2e:** the existing tool tests still run locally over `file://`,
  where the function doesn't run. New checks cover:
  - the tools index badges and button text;
  - the footer markers;
  - the Terms, Privacy and FAQ wording;
  - no remaining "everything is free" claims.
  - Each check is watched to fail first.
- **Audit:** the internal-files guard, sitemap and OG checks are updated
  for the new pages. A guard fails if `TOOLKIT_PASSWORD` or any 20+
  character passphrase-like literal appears in served files.
- **Live, after deploy:**
  - a locked page and its script without the cookie return 401 and the
    unlock page;
  - a wrong password is rejected;
  - the right password returns the tool;
  - the free tools are unaffected;
  - the cookie is HttpOnly and Secure.
- **The usual gate:** 13 packager checks, PR, merge, deploy from a clean
  clone, live check.

## Owner actions recommended (outside this build)
- **Make the GitHub repository private.** It is public today, so the tool
  source can be downloaded and run locally whatever the website does. The
  live site does not depend on the repo being public.
- **Treat the password as client-confidential and rotate it periodically.**
  Rotating means changing `TOOLKIT_PASSWORD` in Netlify and redeploying.

## Left to the builder
Exact edge-function file layout and `netlify.toml` binding syntax for the
current Netlify runtime; how the unlock page is rendered (a template in the
function, or a static `unlock.html` read at the edge); badge styling within
DESIGN.md tokens; exact FAQ wording.
