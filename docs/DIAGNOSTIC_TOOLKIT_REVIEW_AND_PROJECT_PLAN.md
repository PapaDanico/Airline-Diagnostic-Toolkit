# DN Consultancy — Airline Diagnostic Toolkit
## Review, Analysis & Project Plan (v2.0)

**Prepared:** 2026-05-29 · Nairobi
**Subject site:** https://dnconsultancydiagnostictoolkit.netlify.app/
**Owner:** Capt. Daniel Moi Ng'ong'a, DN Consultancy
**Status of this document:** Working draft for review

---

## 0. How this review was assembled (sourcing & caveats)

I was asked to review the live site, cross-reference Drive + project memory, and build a project plan. For transparency, here is exactly what I could and could not inspect:

| Source | Result |
|---|---|
| Live Netlify site (`/`, `/diagnostic.html`, `/results.html`) | **Could not fetch.** Netlify returned HTTP 403 to the fetcher (bot protection), and the host is outside the sandbox network allowlist. |
| GitHub repo `papadanico/airline-diagnostic-toolkit` | **Empty** — no commits / no default branch. The deployed source is not under version control here. |
| Drive `dn-diagnostic/` folder (`tools/`, `assets/`) | **Empty scaffold** — folders exist but contain no files. |
| Drive v2.0 enhancement brief (`deepseek_text_20260525…txt`) | **Read in full** — describes the *current* toolkit structure and the intended v2 upgrade. |
| Sibling product `integrated-woman-diagnostic.html` (115 KB) | **Decoded & analysed in full** — same engine/template as the airline toolkit; reveals the real architecture, JS patterns, privacy model and AI integration. |
| DN Consultancy project-memory (`dn-consultancy.md`, `index.md`) | **Read** — strategic roadmap, positioning, pricing, blockers. |

**Implication:** the current-state findings below are *reconstructed* from the v2 brief, the sibling app (same codebase), and memory — not from a direct read of the live airline HTML. Anything dependent on the exact live markup is flagged as **[verify on live]**. The single highest-value next action is to put the deployed source into this repo so review and CI can run against the real thing (see §6, Workstream 0).

---

## 1. What the product is

The **Airline Health Scorecard / Diagnostic Toolkit** is a static, client-side web app positioned as *the trusted, neutral "first step" in any African airline's digital-transformation journey.* It is DN Consultancy's **top-of-funnel lead magnet** — a free, no-signup diagnostic that produces a credibility-building report and routes qualified operators toward paid DN engagements.

**Current structure (per the v2 brief & memory):**
- `index.html` — landing page introducing the Airline Health Scorecard.
- `diagnostic.html` — a **40-question** scorecard across **8 domains**.
- `results.html` — a **strategic gap report** with scores and benchmarks.
- **Toolboxes A–D** — 14 tools total; **B, C, D are locked** behind a *"DN Engagement Key"* (the productised/paid gate).
- Vanilla JS + CSS, **localStorage** for all data, **no backend**, hosted on Netlify.

**Where it sits in the DN portfolio (from project memory, 2026-05-28):**
- The toolkit is described as **complete** ("14 tools, Toolboxes A–D"); this v2.0 effort is an *enhancement/conversion* layer, not a rebuild.
- Product roadmap sequence: **#1 Ratiba** (AI crew rostering — already live on Render), **#2 Operational Pattern Blindness** (deferred). The Diagnostic Toolkit is the **funnel** that feeds prospects into the consultancy and, ultimately, the products.
- A **sibling consumer product** — *The Integrated Woman Diagnostic* (purpose/profession/faith assessment for African women, `theintegratedwomandiagnostic.tiiny.site`) — runs on the **same diagnostic engine**. This is strong evidence the engine is being treated as a **reusable platform**, which materially changes the plan (see §5).

---

## 2. Architecture & tech stack (reconstructed from the sibling app)

The Integrated Woman Diagnostic is the same engine, so its internals are a reliable proxy:

- **Single-file HTML app** (~113 KB) — markup, one `<style>` block, three `<script>` blocks inline. No build step, no framework.
- **Multi-step form flow:** intake → "Analysing your profile…" interstitial → personalised report (scored dimensions, lowest/"constraint" dimension highlighted) → share card → action plan.
- **Persistence:** single `localStorage` key for progress (`iwd_progress` in the sibling; the airline app will have its own key **[verify on live]**).
- **AI narrative feature:** the report calls an LLM **via a Cloudflare Worker → Anthropic API** (`fetch(...)`). The worker is the secret-keeping proxy; if not configured, the app degrades gracefully ("you may skip the AI narrative; all other features still work").
- **Legal surface:** full **Privacy Notice** and **Terms of Use** baked in (data collection, AI feature disclosure, retention, rights, third-party services, governing law).
- **Distribution:** Open Graph / Twitter card meta for WhatsApp/LinkedIn/Facebook previews — built for social sharing.

**Stack summary:** static HTML/CSS/vanilla-JS + localStorage + an optional serverless LLM proxy (Cloudflare Worker fronting Anthropic). Production-simple, cheap to host, offline-capable for the core scorecard.

---

## 3. Strategic analysis — strengths, gaps, risks

### Strengths
- **Right strategic wedge.** "Free neutral diagnostic → paid engagement" is a proven consultancy funnel, and "neutral first step" is a defensible position against vendor-led tools (Cirium, Maureva, etc.).
- **Architecturally lean.** No backend = near-zero hosting cost, trivial scaling, genuine offline capability — a real trust asset for the privacy pitch.
- **Reusable engine.** The same template already powers a second product. Treating it as a platform multiplies ROI on every engine improvement.
- **Productisation hook already present.** The locked Toolboxes B/C/D + "DN Engagement Key" give an existing monetisation/sales mechanism to build on.

### Gaps (vs. the v2.0 vision)
1. **Narrative is generic, not strategic.** Results show scores but don't *prescribe* next steps mapped to the weakest domains.
2. **Trust signals are implicit, not explicit.** The "private, lightweight, no-signup" advantages aren't surfaced as visible badges/copy.
3. **No partner/white-label path.** No embed support, no `?partner=` co-branding — blocks the AFRAA distribution play.
4. **No standalone paid "point solution"** to convert interest into immediate value (the brief proposes a Fuel Contract Optimizer Lite).
5. **No version tracking / change discipline** — the source isn't even in Git.

### Risks (must address)
- **🔴 Privacy claim vs. AI reality (highest priority).** The v2 copy promises *"stays on your device… we never see your data… works offline."* But the AI-narrative feature **sends answers to an external API** (Anthropic via Cloudflare Worker). Without precise, prominent wording this is a **factual contradiction and a data-protection exposure** — especially under Kenya's **KDPA** (the same data-residency concern already flagged for Ratiba). *The privacy badge and the AI feature must be reconciled in copy and in behaviour (opt-in, clearly scoped).*
- **🟠 Brand / contact inconsistency — RESOLVED.** Per the DN Consultancy project configuration the canonical address is **`info@aviationhubkenya.org`**. The sibling app's footer (`info@dnconsultancy.co.ke`) is therefore the error to correct on any shared-engine output.
- **🟠 Embed security trade-off.** The brief asks to *remove* `X-Frame-Options` / open `frame-ancestors *` for iframing. Wide-open framing invites clickjacking; scope `frame-ancestors` to known partner domains (AFRAA etc.), not `*`.
- **🟠 "Lead magnet" vs. "no data collection" tension.** A funnel needs to capture leads; the product promises not to. Resolve deliberately: capture only on explicit CTA (e.g., "email me my report"), keep the scorecard itself data-free.
- **🟡 Legal/registration blocker.** Memory notes DN entity registration + website go-live are pending legal setup, and VAT status is unconfirmed. Partner/commercial steps shouldn't front-run that.

---

## 4. The v2.0 vision (from the enhancement brief)

The brief defines six workstreams, in intended build order:
1. **"First Step" narrative** — hero headline + neutral-positioning subtext on landing; reassurance strip on the scorecard.
2. **Strategic prescriber** — on results, a *"Next Steps: From Diagnosis to Solution"* section that maps each low-scoring domain to neutral, educational tool categories (with a non-endorsement disclaimer).
3. **Trust signals** — explicit "Privacy & Access Guarantee" panel (local-storage / offline / no-account) + a shorter landing strip.
4. **White-label / embed foundation** — iframe-embeddable, `?partner=AFRAA` co-branding (logo + accent swap + "Powered by DN Consultancy, in collaboration with AFRAA"), and a sample `embed.html`.
5. **Paid point solution — Fuel Contract Optimizer Lite** — `tools/fuel-optimizer.html`, a client-side savings calculator; detailed report/strategy gated behind a Contact CTA; linked from results when Revenue/Fuel domains are weak.
6. **Polish & consistency** — reuse design language, "Free Tools" nav, footer version note *"v2.0 – Strategic Diagnostic & Point Solutions"*, no regressions.

---

## 5. Recommended plan shape (how I'd adjust the brief)

The brief is sound. Three adjustments based on the wider context:

- **Add Workstream 0 (source control first).** Get the deployed site into this repo before changing anything. You cannot safely review or iterate on a site whose source lives only on Netlify.
- **Promote privacy/AI reconciliation to a blocking pre-requisite**, not part of "polish." It gates the trust narrative *and* the partner pitch.
- **Treat the engine as a platform.** Because the same code powers the Integrated Woman Diagnostic, factor shared logic (scoring, report rendering, privacy panel, AI-worker client) so improvements land in both products. Don't hard-fork per vertical.

---

## 6. Project plan — phased workstreams

Effort: S ≈ <½ day · M ≈ ½–1 day · L ≈ 1–2 days (single developer).

### Workstream 0 — Foundation & source of truth *(do first)*
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 0.1 | Pull the **live Netlify site source** into this repo (`/site` or root) and commit | M | Repo builds/serves the current live site locally |
| 0.2 | Add `netlify.toml` + `_headers` (CSP scoped, not `*`) under version control | S | Headers reproducible; no `X-Frame-Options: DENY` blocking intended embeds |
| 0.3 | Stand up a **SessionStart hook / dev server** (`python -m http.server` or `netlify dev`) + a link-check/HTML-validate script | S | `npm run dev` / documented one-liner serves the site; CI can lint HTML |
| 0.4 | Apply the **DN brand standards** to the toolkit (now defined — see §B); record in `brand.md` | S | Canonical email `info@aviationhubkenya.org`, DN palette, Cormorant Garamond / DM Sans, and logo (`1.png`, dark-bg `filter: brightness(0) invert(1)`) applied consistently |

### Workstream 1 — Trust & privacy reconciliation *(blocking pre-req for partner work)*
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 1.1 | Audit the AI-narrative data flow; document exactly what leaves the device | S | Written data-flow note in repo |
| 1.2 | Rework privacy copy so it is **true with the AI feature on** (opt-in, scoped wording) | M | No claim contradicts actual behaviour; AI narrative is explicit opt-in |
| 1.3 | Build the **"Privacy & Access Guarantee"** panel (scorecard) + landing trust strip | M | Renders on both pages; matches design language |
| 1.4 | KDPA position note (mirror the Ratiba data-residency discipline) | S | Documented stance; worker region/retention confirmed |

### Workstream 2 — "First Step" narrative
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 2.1 | Landing hero headline + neutral-positioning subtext | S | Copy live on `index.html` |
| 2.2 | Scorecard reassurance line ("stays on your device… no sales calls") | S | Live on `diagnostic.html`, consistent with WS1 wording |

### Workstream 3 — Results page → strategic prescriber
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 3.1 | Domain→solution-category **mapping object** for all 8 domains (neutral, no affiliate links) | M | Lowest-scoring domains drive recommendations dynamically |
| 3.2 | *"Next Steps: From Diagnosis to Solution"* section + non-endorsement disclaimer | M | Renders beneath gap table; disclaimer present |
| 3.3 | Cross-link to Fuel Optimizer when Revenue/Fuel domain is weak | S | Conditional CTA appears correctly |

### Workstream 4 — White-label / embed foundation
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 4.1 | Make scorecard iframe-embeddable; **scope `frame-ancestors` to partner domains** (not `*`) | M | Embeds on allowed origins; clickjacking risk contained |
| 4.2 | `?partner=AFRAA` support — logo swap, accent CSS class, co-branding line | M | Query param flips branding; default unchanged |
| 4.3 | Sample `embed.html` with documented iframe snippet | S | Partner can copy-paste to embed |

### Workstream 5 — Paid point solution: Fuel Contract Optimizer Lite
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 5.1 | `tools/fuel-optimizer.html` client-side calculator (spend × (premium − 2% benchmark)) | M | Returns a $ savings range + qualitative message; 100% client-side |
| 5.2 | Gate detailed report/playbook behind a **Contact CTA** (mailto / form) | S | CTA opens contact path; no data sent automatically |
| 5.3 | Add to **"Free Tools"** nav | S | Discoverable from nav across pages |

### Workstream 6 — Polish, QA & release
| # | Task | Effort | Acceptance |
|---|---|---|---|
| 6.1 | Design-language consistency pass (palette, type, spacing) | S | New elements indistinguishable from existing |
| 6.2 | Footer version note **"v2.0 – Strategic Diagnostic & Point Solutions"** | S | Visible site-wide |
| 6.3 | Regression test: scorecard flow, localStorage, locked Toolboxes B/C/D intact | M | All original functionality verified |
| 6.4 | Test matrix: partner param, fuel calc, embed, results recommendations | M | Documented test pass; PR opened |

**Suggested sequence:** WS0 → WS1 → WS2 → WS3 → WS4 → WS5 → WS6. WS1 is a hard gate before WS4 (can't pitch partners on a privacy promise that isn't true). WS2/WS3 can run in parallel with WS1 once the privacy wording is settled.

---

## 7. Open decisions for Capt. Dan
1. **AI narrative on the airline toolkit — keep, make opt-in, or drop?** Drives all of WS1.
2. ~~**Canonical contact:** `info@aviationhubkenya.org` vs `info@dnconsultancy.co.ke`?~~ **RESOLVED — `info@aviationhubkenya.org`** (DN project configuration).
3. **Lead capture:** stay strictly data-free, or add an explicit opt-in "email me my report" capture? (Funnel vs. privacy trade-off.)
4. **Embed scope:** which partner domains are whitelisted for framing (AFRAA confirmed)?
5. **Engine strategy:** factor a shared core across the airline + Integrated Woman diagnostics now, or keep iterating per-product and refactor later?
6. **Gating before legal:** how far to take partner/commercial steps while entity registration + VAT are unresolved?

---

## 8. Immediate next actions (this week)
- [ ] **WS0.1** — get the live site source into this repo (unblocks everything; needs the Netlify project or a copy of the deployed files).
- [ ] **Decide #1** above (AI narrative keep/opt-in/drop) — the one remaining one-line decision that unblocks WS1. *(#2 canonical email now resolved → `info@aviationhubkenya.org`.)*
- [ ] **WS1.1/1.2** — reconcile privacy copy with the AI data flow.
- [ ] Track these as tasks in the existing **ClickUp — DN Consultancy / Advisory & Training** space alongside the Ratiba and I-Fly workstreams.

---

*Caveat restated: current-state findings are reconstructed from the v2.0 brief, the sibling Integrated Woman Diagnostic (same engine), and DN project memory. Items marked **[verify on live]** require a direct read of the deployed airline HTML, which was not reachable from this environment.*

---

## Appendix B — DN brand standards (apply to all toolkit work)

Authoritative per the DN Consultancy project configuration. The Diagnostic Toolkit uses the **DN corporate identity** (unlike Ratiba, which deliberately carries its own Kenyan earth-tone brand).

- **Firm:** DN Consultancy · Nairobi, Kenya · **`info@aviationhubkenya.org`** · *"Shaping Africa's Future, Together."*
- **Palette:** `DN_DARK #1C1C1C` (headers/primary text) · `DN_STEEL #4A7FA5` (secondary/banners) · `DN_STEEL_LT #D6E4F0` (tints) · `DN_GOLD #C9A84C` (accents/dividers) · `DN_GOLD_LT #FFF8E6` (callouts) · `DN_FOG #F4F4F2` (off-white rows/panels) · `DN_MUTED #6B7280` (body/captions) · `DN_GREEN #1E8449` (compliant/positive) · `DN_RED #C0392B` (critical) · `DN_AMBER #D4AC0D` (watch/warnings).
- **Type:** Cormorant Garamond (display/headings) · DM Sans (body/UI) · Calibri (Office docs).
- **Logo:** D/N monogram (`1.png`); embed in HTML/Excel/Word; on dark backgrounds apply `filter: brightness(0) invert(1)`.
- **Naming alignment:** the public scorecard is **A1 — Airline Health Scorecard** (40 questions, 8 domains, weighted health index); the gated tools are **Toolboxes B/C/D** behind the *DN Engagement Key*. v2.0 copy and the results "prescriber" should respect the existing 5-phase engagement model and the 3× ROI guarantee.
