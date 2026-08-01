# JK & Associates — Aviation Advisory Platform (v3.3)

An end-to-end consultancy platform for **African aviation ventures**: operators holding an AOC, and
investors building greenfield aviation projects in Kenya and across the continent.

A static, fully client-side web app — **no backend, no signup, no data ever leaves the visitor's
browser** — deployable on **Netlify or Vercel** (config for both is in the repo).

> **Privacy by design.** Every answer, every name, every financial assumption is stored only in the
> visitor's `localStorage`. There is no API, no analytics, no AI call-home — so the "stays on your
> device / works offline" promise is literally true.

*Shaping Africa's Future, Together.*

---

## The two tracks

The platform serves two audiences whose problems are genuinely different, so the information
architecture splits at the front door and stays split through the nav, the tool explorer and the
footer.

| Track | Audience | Entry point |
|---|---|---|
| **Build** | Investors and founders taking a greenfield aviation project from capital to certificate | `tools/certification-navigator.html` |
| **Operate** | Carriers already flying, under cost / reliability / revenue / governance pressure | `diagnostic.html` |

## Pages

### Build track (Toolbox V — free)

| File | Purpose |
|------|---------|
| `tools/venture-dashboard.html` | **Venture Control Room (V0)** — the venture file. Reads every build tool's saved state and derives one **Launch Readiness Index** (certification 40 / capital 25 / organisation 20 / structure 15), per-module progress and next action, a **critical-path Gantt** back-scheduled from the target certificate date, a sector-mismatch check, **scenarios** (named snapshots of the whole workspace, compared side by side and restorable), **workspace export / import** as a single JSON file, and a board-pack print view. |
| `tools/certification-navigator.html` | **KCAA Certification Navigator (V1)** — the five-phase certification and approval process mapped across **six sectors**, with per-phase checklists, critical-path gates, required postholders, the document set, a weighted readiness meter, and a citation for every requirement. |
| `tools/venture-builder.html` | **Greenfield Venture Builder (V2)** — sector CAPEX bands, capital-stack construction, funding-gap detection, lender advance-rate check, level-payment debt service, DSCR sensitivity across four scenarios, and revenue break-even. |
| `tools/corporate-structure.html` | **Corporate Structure Designer (V3)** — HoldCo / SPV / OpCo archetypes with a **look-through effective-interest cascade**, ownership-and-control testing, offshore substance costing, and the governance / lender-conflict checks institutional diligence applies. |
| `tools/organogram-planner.html` | **Organogram & Postholder Planner (V4)** — the posts a regulator must accept for each sector, holder and deputy assignment, single-point-of-failure detection, departmental scaffold and a launch→Y5 headcount ramp. |

### Operate track (Toolbox A — free)

| File | Purpose |
|------|---------|
| `diagnostic.html` | **Airline Health Scorecard (A1)** — 40 questions × 8 weighted domains. Privacy panel, progress tracking, partner-aware, iframe-embeddable. |
| `results.html` | **Strategic gap report** — weighted health index ring, weakest-first findings table with sourced benchmarks, radar profile, prescriber, sources block, and Engagement-Key-gated Toolboxes B/C/D. Print produces a board-ready report. |
| `tools/cask-calculator.html` | **CASK Benchmarking Calculator (A2)** — unit-cost calculator banded against JK's competitive target and African cost context. |
| `tools/data-request.html` | **48-Hour Data Request (A3)** — 28-item diagnostic-readiness checklist with a readiness meter. |
| `tools/operating-model-canvas.html` | **Operating Model Canvas (A4)** — 9-panel one-page airline operating model. |
| `tools/training-tna.html` | **Training Needs Analysis (A5)** — competency-gap assessment across four staff groups. |
| `tools/mro-readiness.html` | **MRO & Technical Readiness Diagnostic** — 20 questions for Chief Engineers and CAMO Managers. |
| `tools/fuel-optimizer.html` | **Fuel Contract Optimizer Lite** — client-side savings estimator. |

### Shared

`index.html` (two-door landing) · `tools/index.html` (explorer, grouped by track) · `how-it-works.html` ·
`tutorial.html` (step-by-step walkthrough, both tracks) · `faq.html` (38 questions, with FAQPage structured data) ·
`glossary.html` (111 terms, searchable, cross-referenced) ·
`regulations.html` (Kenya regulatory index — every instrument, its Legal Notice, source and verification status) ·
`methodology.html` · `partners.html` · `embed.html` · `privacy.html` / `terms.html` · `404.html`

## Sectors covered (Build track)

| id | Sector | Primary instrument |
|---|---|---|
| `aoc`  | Airline — Air Operator Certificate | Air Operator Certification & Administration Regs 2025 (**L.N. 42/2026**) + Air Service Licence |
| `ato`  | Approved Training Organisation & simulator hub | ATO Regs + Personnel Licensing Regs 2025 (**L.N. 50/2026**) + FSTD qualification |
| `amo`  | Approved Maintenance Organisation | AMO Regs 2025 (**L.N. 20/2026**) |
| `gha`  | Ground handling & FBO | Civil Aviation Act + aerodrome / air-service instruments |
| `aero` | Aerodrome / airport | Aerodromes Design & Operations Regs 2025 (**L.N. 102/2026**) |
| `uas`  | UAS / RPAS operator & training organisation | UAS Regs 2025 (**L.N. 40/2026**) |

## Regulatory citations — read this before editing `data-ventures.js`

Kenya's 2025 civil aviation regulations were **gazetted through 2026**, so an instrument titled
"…Regulations, **2025**" carries a **2026** Legal Notice number. Always cite both.

Every citation in `JKV.cites` carries an explicit `status`:

- `"verified"` — instrument and Legal Notice number confirmed against the Kenya Law gazette record
  on `JKV.CITE_META.verifiedOn`.
- `"unconfirmed"` — referenced in KCAA guidance and industry practice, but gazettement or L.N.
  number could not be confirmed from public record. Renders with a visible `?` chip and a caveat.

**Do not promote a citation to `verified` without re-checking the gazette.** A certification tool
that quietly asserts a wrong Legal Notice number is worse than one that shows its working.
`scripts/check-data.mjs` enforces that every citation has a status and that every citation key
referenced by a checklist item actually resolves.

Currently `unconfirmed`: `ato`, `sms`, `gh`.

## Shared assets

- `assets/css/jk.css` — JK design system. Palette sampled directly from the phoenix mark
  (oxblood → terracotta → ember → amber → sand over warm ink and parchment), Cormorant Garamond +
  DM Sans, full motion system, print stylesheet, reduced-motion support.
- `assets/js/data.js` — `JK` namespace: brand, 8 domains, 40 questions, weights, sourced benchmarks,
  standards mapping, prescriber, tool catalogue, partner registry.
- `assets/js/data-ventures.js` — `JKV` namespace: citation registry, five-phase spine, six sectors
  with per-phase checklists / postholders / manuals / capital models, structure archetypes,
  governance checks, org scaffold, headcount ramps, market context.
- `assets/js/common.js` — partner/white-label handling, canonical nav, storage, scoring engine,
  radar, and the venture-track helpers (`toolStore`, `fmtMoney`, `citeChip`, `mountPrintHead`,
  `toolMailto`, `wireDisclosure`, `annualDebtService`, `lookThrough`). The last two live here
  rather than in the tools that own them because the Control Room re-derives DSCR and effective
  interest from the same saved models — two implementations would drift on exactly the numbers a
  lender and a regulator read.
- `assets/js/data-glossary.js` — `JKG` namespace: 111 glossary terms across six categories, each with a
  definition and, where it earns one, a "why it matters" note. Cross-references and citation keys are
  validated by `scripts/check-data.mjs`, because a dead see-also renders as a chip that goes nowhere.

  **`glossary.html` is generated from it, not rendered from it in the browser.** Run
  `node scripts/build-glossary.mjs` after editing the data; CI runs `--check` and fails on drift.
  The page originally rendered client-side and that cost **0.40 of cumulative layout shift** on every
  load — four times the threshold Google calls "good" — and left non-JS crawlers looking at a page
  with no terms on it. Pre-rendering is committed to the repo, so there is still no deploy-time build
  step. `faq.html` is authored as static markup for the same reasons.
- `assets/js/venture-file.js` — `JKW` namespace: the venture profile, one reader per build tool,
  the weighted Launch Readiness Index, the back-scheduled critical path, scenarios, and workspace
  export / import. Every reader takes a **store source** (`liveSource()` or `objSource(stores)`),
  so a saved scenario is summarised by the same code that summarises the live workspace — there is
  no second scoring path to drift from the first. A scenario never captures `SCEN_KEY` itself;
  otherwise each save would embed all previous saves and the store would double in size every time.
  **Derived, not published**: no tool writes a summary of itself; each reader
  opens that tool's existing `localStorage` record and computes the summary from raw state, so the
  tools stay standalone and there is no second copy of the truth. The coupling is one-way —
  `venture-file.js` knows the tools' store shapes; the tools do not know it exists.
- `assets/img/` — `jk-badge.png` / `jk-badge-light.png` (nav, footer, favicon),
  `jk-logo-full.png` / `jk-logo-full-light.png` (hero lockup), `og-card.png` (1200×630).
  The `-light` variants are **pre-lightened renders**, not CSS filters — `brightness(0) invert(1)`
  would flatten the phoenix gradient into a white silhouette.

## Scoring (Health Scorecard)

8 domains, each weighted (Safety 18, Operations 14, Cost & Fuel 14, Revenue 13, Fleet & Network 12,
Commercial 10, Financial 10, People 9 = 100%). Each question scores 0–4. Domain % = avg(scores)/4×100.
**Health Index = Σ(domain % × weight)**. RAG bands: <45 critical, 45–64 attention, ≥65 strong.

## Readiness (Certification Navigator)

Overall readiness weights critical-path ("gate") items at **2×** non-gate items. Closing a gate item
moves you materially closer to a certificate; closing a nice-to-have does not. A flat percentage
would flatter a badly-sequenced applicant.

## White-label / embed

Ships as a **JK & Associates-only** product — `JK.partners` in `assets/js/data.js` is empty. To
co-brand: add an entry keyed by a token, then append `?partner=<TOKEN>` to swap the accent colour,
show the partner logo and add a co-branding line. Framing is allowed only from whitelisted domains
via `Content-Security-Policy: frame-ancestors` in `_headers` / `vercel.json` (**never** `*`). The
Engagement Key that unlocks Toolbox B/C/D previews is `JK.engagementKey`.

`window.DN` remains aliased to `JK` so any older embed or bookmarklet keeps working.

## Run locally

```bash
python3 -m http.server 8080      # then open http://localhost:8080
node scripts/check-data.mjs      # data-model integrity check (also run in CI)
```

No build step. `netlify.toml` and `vercel.json` both publish the repo root as-is, with clean-URL
redirects (`/certify`, `/venture`, `/structure`, `/org`, `/scorecard`, `/cask`, `/fuel`, …) and
security headers including scoped `frame-ancestors`.

## Moving to a custom domain

Canonical / Open Graph / Twitter URLs are absolute (crawlers need them). To repoint everything —
pages, sitemap and robots — in one idempotent command:

```bash
node scripts/set-domain.mjs jkassociates.example.com   # e.g. a custom domain
```

## Lead signal (no analytics)

No analytics by design. Each tool's contact CTA opens a `mailto:` with a tagged subject —
`[JK · Certification]`, `[JK · Venture]`, `[JK · Structure]`, `[JK · Organogram]`, `[JK Toolkit · CASK]`,
`[JK Toolkit · Fuel]` — so inbound enquiries self-identify which tool converted the lead. Filter by
subject in your inbox. For traffic volume, enable server-log analytics on Netlify or Cloudflare
(no client script, no cookies).

## Testing

```bash
cd tests && npm install
node e2e.mjs     # core flows: diagnostic → results → key gate → empty state → CASK math → a11y
node audit.mjs   # full-site sweep: JS errors, h1, alt, dup IDs, broken links, overflow (desktop+mobile)
```

Chromium is pre-installed in the standard dev container under `/opt/pw-browsers`; the suites resolve
it automatically and never download a browser.

## CI

`.github/workflows/ci.yml` runs on every push/PR:
- **validate** — JS syntax, `vercel.json` validation, data-model integrity (scorecard **and**
  venture model: sectors, phases, citation-key resolution, capital bounds, headcount monotonicity),
  HTML sanity.
- **e2e** — runs the `tests/` behaviour and audit suites against the real pages.

## SEO

`sitemap.xml` (19 URLs), `robots.txt`, a branded `404.html`, per-page Open Graph/Twitter cards, and
JSON-LD (`Organization` + two `WebApplication` entries) on the landing page.

## Legal posture

Every venture-track tool carries an explicit scope disclaimer: planning aid, not legal / regulatory /
investment advice, not affiliated with or endorsed by the Kenya Civil Aviation Authority. A few
legally-specific placeholders in `privacy.html` / `terms.html` (registered entity/number, postal
address, ODPC registration, DPO) are marked `[in brackets]` and must be completed before go-live.

---

*v3.3 — End-to-End Aviation Advisory Platform · JK & Associates · Nairobi, Kenya.*
