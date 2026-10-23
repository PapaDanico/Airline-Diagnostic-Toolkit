# Platform audit — October 2026

**Date** 23 October 2026 · **Scope** every page and tool, the print/PDF output of
all of them, and the test suite · **Method** the existing suites run unmodified,
then a purpose-built render harness (Playwright, Chromium, served over HTTP,
`reducedMotion: "reduce"`, print media emulated, PDF rasterised and read page by
page).

Written so that the next session can see what was swept, what was found, what
was changed and what is still open, without re-deriving any of it.

---

## 1. Baseline

`npm test` (e2e, audit, csp, focus, offline, drive, sliders) and
`scripts/check-data.mjs` were green on arrival: 1,599 focusable elements with a
visible indicator, every tool driven (1,400+ controls), data model clean,
glossary in sync. Nothing below was found by a failing check. That is the
finding: **the suite does not look at paper.**

## 2. Defects found and fixed

| # | Defect | Where | Evidence | Fix |
|---|---|---|---|---|
| 1 | **Stat tiles overprint each other.** "USD 3.20M–USD 9.45M" ran through the neighbouring "USD 2.05M" tile. On screen at 1280 px and in the PDF. | `.kpi .kv` | Screenshot of `#deal-kpis`; the overflow sweep also flagged "USD 6.33M" (venture builder) and "USD 33K/yr" (corporate structure) | Tile text now sizes from its own tile (`container-type: inline-size`, `cqi`), not from the viewport; a range may wrap only at its dash (`.nb` + `<wbr>`), a single figure never wraps. Sweep is clean on desktop, mobile and print. |
| 2 | **The JK mark never printed on any tool pack.** The print header's logo carried `loading="lazy"`, but the header is `display:none` on screen, so the image is never fetched. Every PDF opened with a blank where the logo belongs. | `mountPrintHead` in `common.js` | PDF page 1 of every tool | Lazy attribute removed. |
| 3 | **The sample report printed with no brand header at all.** The lead magnet most often saved and forwarded was the one unbranded document. | `demo-results.html` | 4-page PDF | Print header added, captioned "Sample … Illustrative data". |
| 4 | **The Strategic Gap Report ran to 10 pages** with real answers: the domain column took a third of the page, so each domain's benchmark paragraph wrapped at about twenty characters and stretched down half a sheet; a heading was stranded at the foot of a page and a two-line paragraph sat alone on the last. | `results.html`, `.gap-table` | 10-page PDF | Fixed column proportions in print, benchmark text at the 2xs token, `What to fix first` starts its own page, trailing notes tightened. 8 pages, no orphans. |
| 5 | **Slider tracks printed as form chrome**, and the tool's own on-screen introduction repeated the pack's title block. | `.calc`, `.tool-head` | AOC Acquisition PDF pages 2–5 | Range inputs and the intro hidden in print; the value box beside each slider remains. |
| 6 | **No page numbers or provenance on any sheet after the first.** A loose page could not be placed in its pack. | `@page` | — | `@page` margin boxes: "JK & Associates · jkassociates.enterprises" and "Page n of N". Current Chromium honours them; other engines ignore them harmlessly. |

One regression was introduced and caught by the suite during this work: two new
hard-coded font sizes in the print block tripped **"design values bounded"**.
They were replaced with the existing `--fs-2xs` token and the guard is green
again. It is recorded because it is the guard doing exactly what the README says
it is for.

## 3. Open — not fixed, with the reason

| # | Finding | Why it is open |
|---|---|---|
| A | **A printed pack is still a transcript of the tool.** Inputs print as boxed form fields with raw numbers ("2500000"), an empty date prints as `mm/dd/yyyy`, and page one is an answer-first summary followed by the working in screen order. Packs of 5–8 pages for a 1-answer tool. | The right fix is an architecture change, not a stylesheet one: a dedicated print template per tool that renders the working as a formatted assumptions table. Specified in the roadmap (item 4). |
| B | **No cover page, contents or sources appendix** on any pack. | Same. |
| C | **The scorecard report prints a "3× Year-1 ROI guarantee"** (`results.html`, `.guarantee`). | A claim about the business and a commercial commitment. It is the owner's to confirm or withdraw, not an engineering call. Flagged. |
| D | **`netlify.toml` form notification** cannot be verified from here. | Per `CLAUDE.md` §9 it is recorded as enabled; the only way to prove it is a live submission. |
| E | **Tanzania (and any non-Kenyan regime) is outside the verified regulatory registry.** | Registry growth requires gazette verification per instrument; promoting anything to "verified" without that is the one thing the README forbids. |

## 4. Harness notes (so the next audit does not repeat these)

- **Render over HTTP, not `file://`.** Under `file://` the self-hosted fonts are
  blocked by CORS and every PDF silently falls back to a system font, so layout
  conclusions are wrong. This is a harness artefact, not a site defect.
- **Detect overflow by geometry, not by eye.** `.kv`, `.kpi *`, `.metrics .v`,
  `.stack-row .sv` and `.meter-val` whose rect leaves its container, at 1280,
  390 and print widths. That is how defect 1 was found on three tools at once.
- **`pdftoppm` + a contact sheet** shows pagination defects (orphans, stranded
  headings, half-empty pages) at a glance that a text assertion never will. The
  existing "every printable tool opens with an executive summary" guard is true
  and was passing on the packs above while their logo was missing.

## 5. Suite additions — built and watched failing

Shipped in `tests/audit.mjs` as a print pass over every page, in print media at
A4 width over HTTP. Each was **seen to fail on the condition it claims to
catch** before it was trusted (README, `docs/VERIFICATION.md`):

| Guard | Watched failing on | Note |
|---|---|---|
| A figure may not leave its tile | the old tile CSS together with the old plain-text markup: flagged "USD 3.20M–USD 9.45M" | Restoring the old CSS alone did **not** fail it, because the new `.nb`/`<wbr>` markup wraps without the CSS. The guard was only proven against the true original (CSS + markup). |
| Print-header logo present | `loading="lazy"` put back: all 15 tool packs and the report flagged | A first version checked only that the image had loaded and **passed with the bug present**: emulating print makes the header visible, so a lazy image loads, whereas a PDF is cut before it does. The guard now checks the attribute, which is the defect. |
| Pack-length ceiling (9 sheets) | the full print-table revert: the report ran to 10 sheets | A first partial revert did not fail it; only the full original reproduced the 10 sheets. |

Also found and fixed on the way: **the audit seeded `results.html` under a dead
storage key** (`dn_airline_scorecard_v2`, unread since the rebrand), so only
the report's empty state had ever been audited. It now seeds the live key with
varied scores and audits the populated report. `npm test` also omitted
`storage.mjs`, which CI and the packager both run; it now matches.

## 6. Still recommended

Each must be **watched to fail first** (`docs/VERIFICATION.md`).

1. **Print-geometry guard** — the overflow sweep above, run in print media over
   every tool, failing on any figure that leaves its tile.
2. **Pack-length ceiling** — render each pack to PDF and fail if it exceeds a
   per-tool page budget; the 10-page report would have failed at 6.
3. **Pack provenance** — assert the print header's image has actually loaded
   (`naturalWidth > 0`) in print media.
