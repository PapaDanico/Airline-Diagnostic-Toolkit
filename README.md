# DN Consultancy — Airline Diagnostic Toolkit (v2.0)

DN Consultancy's free, neutral **"first step"** in any African airline's digital-transformation
journey: the **Airline Health Scorecard** (Tool A1) and supporting point solutions. A static,
fully client-side web app — **no backend, no signup, no data ever leaves the visitor's browser** —
deployed on Netlify.

> **Privacy by design.** Every answer is stored only in the visitor's `localStorage`. There is no
> API, no analytics, no AI call-home — so the "stays on your device / works offline" promise is
> literally true. (An opt-in AI narrative could be added later behind explicit consent.)

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Landing — "First Step" narrative, trust strip, 5-phase engagement model, 14-tool spotlight, 3× ROI guarantee. |
| `diagnostic.html` | **Airline Health Scorecard** — 40 questions × 8 weighted domains. Privacy panel, progress tracking, partner-aware, iframe-embeddable. |
| `results.html` | **Strategic gap report** — weighted health index ring, weakest-first findings table, radar profile, *"Next Steps: From Diagnosis to Solution"* prescriber, and DN-Engagement-Key-gated Toolboxes B/C/D. |
| `tools/fuel-optimizer.html` | **Fuel Contract Optimizer Lite** — client-side savings estimator; full tool gated behind a Contact CTA. |
| `embed.html` | Sample partner (white-label) embed using `?partner=AFRAA`. |

## Shared assets

- `assets/css/dn.css` — DN design system (charcoal/steel/gold palette, Cormorant Garamond + DM Sans).
- `assets/js/data.js` — domains, 40 questions, weights, benchmarks, prescriber mapping, 14-tool catalogue, partner registry.
- `assets/js/common.js` — partner/white-label handling, inline DN monogram logo (SVG), storage, scoring engine.
- `assets/js/diagnostic.js` / `results.js` — page logic.

## Scoring

8 domains, each weighted (Safety 18, Operations 14, Cost & Fuel 14, Revenue 13, Fleet & Network 12,
Commercial 10, Financial 10, People 9 = 100%). Each question scores 0–4. Domain % = avg(scores)/4×100.
**Health Index = Σ(domain % × weight)**. RAG bands: <45 critical, 45–64 attention, ≥65 strong.

## White-label / embed

Append `?partner=AFRAA` to swap the accent colour, show the partner logo, and add a co-branding line.
Partner keys live in `assets/js/data.js` → `DN.partners`. Framing is allowed only from whitelisted
domains via `Content-Security-Policy: frame-ancestors` in `_headers` (**never** `*`).

## Run locally

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

No build step. `netlify.toml` publishes the repo root as-is.

## Brand & docs

DN corporate identity applies throughout (see `docs/` Appendix B). `docs/` also holds the v2.0 review
& project plan and the anonymised handover.

*v2.0 — Strategic Diagnostic & Point Solutions · DN Consultancy · Shaping Africa's Future, Together.*
