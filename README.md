# DN Consultancy — Airline Diagnostic Toolkit (v2.0)

DN Consultancy's free, neutral **"first step"** in any African airline's digital-transformation
journey: the **Airline Health Scorecard** (Tool A1) and supporting point solutions. A static,
fully client-side web app — **no backend, no signup, no data ever leaves the visitor's browser** —
deployable on **Netlify or Vercel** (config for both is in the repo).

> **Privacy by design.** Every answer is stored only in the visitor's `localStorage`. There is no
> API, no analytics, no AI call-home — so the "stays on your device / works offline" promise is
> literally true. (An opt-in AI narrative could be added later behind explicit consent.)

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Landing — "First Step" narrative, trust strip, 5-phase engagement model, 14-tool spotlight, 3× ROI guarantee. |
| `diagnostic.html` | **Airline Health Scorecard** — 40 questions × 8 weighted domains. Privacy panel, progress tracking, partner-aware, iframe-embeddable. |
| `results.html` | **Strategic gap report** — weighted health index ring, weakest-first findings table with sourced industry benchmarks, radar profile, *"Next Steps: From Diagnosis to Solution"* prescriber, sources block, and DN-Engagement-Key-gated Toolboxes B/C/D. **"Print / save as PDF"** produces a board-ready one-page report. |
| `tools/operating-model-canvas.html` | **Operating Model Canvas (Tool A4)** — 9-panel one-page airline operating model; auto-saves to `localStorage`, print / save-to-PDF, facilitated workshop gated behind a Contact CTA. |
| `tools/cask-calculator.html` | **CASK Benchmarking Calculator (Tool A2)** — client-side unit-cost calculator; bands your CASK against DN's competitive target and African cost context, full benchmarking pack gated behind a Contact CTA. |
| `tools/fuel-optimizer.html` | **Fuel Contract Optimizer Lite** — client-side savings estimator; full tool gated behind a Contact CTA. |
| `tools/data-request.html` | **48-Hour Data Request (Tool A3)** — 28-item diagnostic-readiness checklist grouped by domain; readiness meter, auto-saves to `localStorage`, print / save-to-PDF. |
| `embed.html` | Generic white-label embed sample (DN-only; the partner registry ships empty). |

## Shared assets

- `assets/css/dn.css` — DN design system (charcoal/steel/gold palette, Cormorant Garamond + DM Sans), responsive + print stylesheet.
- `assets/js/data.js` — domains, 40 questions, weights, sourced benchmarks, standards mapping, prescriber, 14-tool catalogue, partner registry (empty).
- `assets/js/common.js` — partner/white-label handling, official DN badge logo, storage, scoring engine.
- `assets/js/diagnostic.js` / `results.js` — page logic.
- `assets/img/` — `dn-logo-full.png` (hero lockup), `dn-badge.png` (nav/footer mark + favicon), `og-card.png` (1200×630 social share card). All transparent-background PNGs.

## Scoring

8 domains, each weighted (Safety 18, Operations 14, Cost & Fuel 14, Revenue 13, Fleet & Network 12,
Commercial 10, Financial 10, People 9 = 100%). Each question scores 0–4. Domain % = avg(scores)/4×100.
**Health Index = Σ(domain % × weight)**. RAG bands: <45 critical, 45–64 attention, ≥65 strong.

## White-label / embed

This ships as a **DN Consultancy-only** product — `DN.partners` in `assets/js/data.js` is empty.
The white-label engine is retained for a future real partner: add an entry keyed by a token, then
append `?partner=<TOKEN>` to swap the accent colour, show the partner logo, and add a co-branding
line. Framing is allowed only from whitelisted domains via `Content-Security-Policy: frame-ancestors`
in `_headers` / `vercel.json` (**never** `*`). The **DN Engagement Key** that unlocks Toolbox B/C/D
previews is set in `DN.engagementKey`.

## Run locally

```bash
python3 -m http.server 8080      # then open http://localhost:8080
node scripts/check-data.mjs      # data-model integrity check (also run in CI)
```

No build step. `netlify.toml` (Netlify) and `vercel.json` (Vercel) both publish the repo root as-is,
with `/scorecard` and `/fuel` redirects and security headers (incl. scoped `frame-ancestors`).

## CI

`.github/workflows/ci.yml` runs on every push/PR: JS syntax (`node --check`), `vercel.json`
validation, data-model integrity (8 domains, weights = 100, 40 questions), and an HTML sanity check.

## Brand & docs

DN corporate identity applies throughout (see `docs/` Appendix B). `docs/` also holds the v2.0 review
& project plan and the anonymised handover.

*v2.0 — Strategic Diagnostic & Point Solutions · DN Consultancy · Shaping Africa's Future, Together.*
