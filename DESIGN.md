# Design language

**Warm, rigorous, grounded advisory.** The site reads like a well-made
board pack: one warm temperature throughout, figures that are sourced or
labelled, and nothing decorative that a reader has to work around.

Everything below is read from `:root` in `assets/css/jk.css`. That file
is the source of truth; if this document and the stylesheet disagree, the
stylesheet wins and this file is out of date.

## Principles

- **One temperature.** The palette is sampled from the phoenix mark:
  oxblood → terracotta → ember → amber → sand, over warm ink and
  parchment. No cool greys, no blue-shifted neutrals (the audit checks).
- **Rigour over ornament.** Type, rules and spacing carry the structure.
  Colour is reserved for the accent, the RAG signal and the dark bands.
- **Grounded.** Every number shown to an operator is sourced or labelled
  as a planning default (CLAUDE.md §7). Design never dresses up a guess.

## Palette

Contrast ratios are WCAG 2.x, computed from the hex values in `:root`.

### Brand ramp

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--jk-ink` | `#16100D` | Body text, dark bands | 18.85 on white, 17.52 on parchment |
| `--jk-ink-soft` | `#2A1E18` | Raised surface on dark; `.btn-dark` hover | white on it 16.19 |
| `--jk-oxblood` | `#5B1408` | Deepest red; ember band end stop | white on it 13.56 |
| `--jk-terracotta` | `#9E3116` | **Primary accent** — links, buttons, rules | 7.23 on white |
| `--jk-terra-deep` | `#7A2410` | Accent hover / pressed | 10.06 on white |
| `--jk-ember` | `#C4551F` | Gradients, emphasis | white on it 4.50 (large text / fills only) |
| `--jk-amber` | `#E08A34` | Highlight **on dark** only | 7.05 on ink |
| `--jk-amber-lt` | `#FDF2E4` | Callout wash | ink on it 17.05 |
| `--jk-sand` | `#E8C9A0` | Bar tracks, dark-band rule, focus ring on ember | 4.58 on terracotta |
| `--jk-sand-lt` | `#F6E7D4` | Selected-option fill | terra-deep on it 8.29 |

### Neutrals

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--jk-parchment` | `#FAF6F1` | Section background | — |
| `--jk-parchment-2` | `#F2EAE1` | Deeper parchment, meter tracks | — |
| `--jk-muted` | `#6E625C` | Secondary text | 5.89 on white, 5.48 on parchment |
| `--jk-line` / `--jk-line-2` | ink at 10% / 16% | Hairlines, borders | non-text |
| `--jk-white` | `#FFFFFF` | Cards, inputs | — |

### Semantic accent

`--accent`, `--accent-deep`, `--accent-tint`, `--accent-tint-2` default to
terracotta and are overridden at runtime by `?partner=` (set on the root
element by `common.js`). Components use `--accent`, never the terracotta
token directly, when the colour means "this brand's accent".

### RAG / status

Status is **never colour alone**: every RAG use ships with a text label
and a shape. The critical red is pushed cooler and brighter than
terracotta so the two stay separable side by side.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--jk-red` | `#C62828` | Critical fill / text | 5.62 on white |
| `--jk-red-dk` | `#A31D1D` | Critical text on the red wash | 6.40 on `--jk-red-lt` |
| `--jk-red-lt` | `#FAE7E3` | Critical wash | — |
| `--jk-amber-sig` | `#B87503` | Caution **fill** (dot, border, chart line) | 3.76 on white — not for words |
| `--jk-amber-text` | `#96600A` | Caution **text** | 5.28 on white, 4.78 on amber-lt |
| `--jk-green` | `#1E7A4A` | Good fill / text | 5.33 on white |
| `--jk-green-lt` | `#E8F3ED` | Good wash | — |
| `--jk-green-dk` | `#16603A` | Good text on the green wash | 6.67 on green-lt |

## Typography

- **Display:** Cormorant Garamond 700 (`var(--serif)`) — headings, the
  wordmark, and large figures. Only weight 700 is shipped.
- **UI and body:** DM Sans 400/500/600/700 (`var(--sans)`).
- **Self-hosted** from `assets/fonts/` via `assets/css/fonts.css`. No
  third-party font request: the site promises that data stays in the
  browser, the CSP allows no font origin but our own, and the tools must
  work offline.

Rules:

1. **Display at `--fs-2xl` and up.** The serif is drawn for size; below
   ~22px its hairlines thin out. Current sub-22px serif uses are all
   headings, the wordmark or figures (card `h3` at 18–20px, `.brand` at
   20.3px, `.kpi .kv` whose fluid floor is ~17px) — never running text.
   Do not add more; set small headings in DM Sans 700 instead (`.entity
   h3`, `.ec-body h3` and `.legal h3` already do).
2. **Figures in the serif need lining numerals.** Cormorant defaults to
   old-style figures; see the FIGURES note in `jk.css` before touching
   numeric type.
3. **Nothing a person reads renders under 11px.** `--fs-2xs` (11.2px) is
   the floor. `tests/e2e.mjs` measures rendered size (including SVG
   scaling) and fails below 11px. The one recorded exception is the home
   radar's labels on a phone, which needs a chart re-layout.

### Scale

Major second (1.125) from 1rem, named by role so a step can be retuned.

| Token | rem | px |
|---|---|---|
| `--fs-2xs` | 0.702 | 11.2 (floor) |
| `--fs-xs` | 0.790 | 12.6 |
| `--fs-sm` | 0.889 | 14.2 |
| `--fs-base` | 1 | 16 |
| `--fs-md` | 1.125 | 18 |
| `--fs-lg` | 1.266 | 20.3 |
| `--fs-xl` | 1.424 | 22.8 |
| `--fs-2xl` | 1.602 | 25.6 |
| `--fs-3xl` | 1.802 | 28.8 |
| `--fs-4xl` | 2.027 | 32.4 |
| `--fs-5xl` | 2.281 | 36.5 |
| `--fs-6xl` | 2.566 | 41.1 |

`h1`–`h3` use fluid `clamp()` sizes. One declaration is marked
`fitted:` (the score-ring figure) and belongs to a drawing rather than
to the scale.

## Shape, depth, gradient, motion

| Group | Tokens |
|---|---|
| Radius | `--radius-xs` 4px · `--radius-sm` 8px · `--radius` 12px · `--radius-lg` 18px · pills `99px` · circles `50%` |
| Elevation | `--shadow` · `--shadow-hover` · `--shadow-lg` (warm brown, low alpha) |
| Gradients | `--grad-ember` · `--grad-ember-hover` · `--grad-ember-amber` · `--grad-ink-glow` · `--grad-ink-panel` · `--grad-ink-flagship` · `--grad-hatch-red` |
| Motion | `--ease` (signature decelerate) · `--ease-out` · `--dur-fast` .18s · `--dur-base` .32s · `--dur-slow` .6s |

Deliberate literals, each commented where it sits: focus-ring radii
(2–4px), 2px-tall underline bars, the score ring's `conic-gradient`
(it reads per-element `--p`), the coloured button/card hover glows, and
the storage warning's upward edge shadow. No gradient hex sits outside
`:root`.

Motion is quiet and functional. Under `prefers-reduced-motion: reduce`
transitions stop and smooth scrolling is turned off; tests drive the
browser that way (CLAUDE.md §2).

## Layout

- Content width `--maxw` 1140px; wide layouts `--maxw-wide` 1280px;
  `.wrap` adds a 24px gutter.
- Section rhythm `--sec-y` `clamp(3.5rem, 6vw, 5.5rem)`, tight
  `--sec-y-tight` `clamp(2.5rem, 4vw, 3.5rem)`; spacing steps `--s-1`
  (.25rem) to `--s-10` (7rem).
- Bands: `.band-parchment` (light), `.band-dark` (ink), `.band-ember`
  (terracotta → oxblood). Use one dark band per movement, not back to back.
- Mobile first-class: no horizontal scroll at 375px; wide tables sit in a
  keyboard-reachable `.table-scroll`.

## Dark-band ink rule

Light components inside dark bands must re-assert their ink (CLAUDE.md §8).
`.band-ember` paints every `<p>` white and swaps the focus ring to sand;
`.guarantee` and `.note` bring light backgrounds. Dropped in unmodified
they give white on amber at 1.11:1 and a sand ring at 1.43:1. The fix is
the existing pattern in `jk.css` — an explicit override for the pair
(`.band-ember .guarantee …`, `.band-dark .note …`) — not restyled markup.
Focus rings on coloured grounds use doubled-class selectors so they win
on specificity, not source order.

## Print packs

- A printed tool is a pack: page one is the executive summary
  (`.print-summary`, then a page break), the working follows.
- `.print-head` carries the branded header on paper only; nav, footer,
  buttons, forms, sliders and `.no-print` are removed.
- Dark bands print white with ink text; RAG fills, bars and meters keep
  their colour (`print-color-adjust: exact`).
- Collapsed disclosures print expanded; scroll-reveal never reaches paper.
- Avoid breaks inside cards, KPI tiles, table rows and the disclaimer.
  The audit caps a pack at 9 sheets.

## Build controls once

The recurring defect here is a block that rebuilds its own `innerHTML`
on every keystroke and destroys the control under the cursor (CLAUDE.md
§6). **Build the controls once; rewrite only derived text.** Restoring
focus afterwards hides the symptom and still drops keystrokes. Render
paths that wire forms must be idempotent (`wireToolEnquiryForm`).

## Do / Don't

**Do**

- Reach for a token first; add one to `:root` if a value genuinely
  repeats.
- Use `--accent` for brand-accent meaning so partner theming works.
- Pair every RAG colour with a word and a shape.
- Use `--jk-amber-text` for caution words, `--jk-amber-sig` for marks.
- End every tool that produces an actionable result in a capture form.
- Check a new component on ink, ember and parchment grounds, and at 375px.

**Don't**

- Don't put hex in a component rule; the audit's colour ceiling only
  goes down.
- Don't set running text in the serif or below `--fs-2xs`.
- Don't use `--jk-amber` on light grounds (2.67:1) or ember for small text.
- Don't load fonts, icons or scripts from a third-party origin.
- Don't rebuild a form's markup to update a number.
- Don't drop a light component into a dark band without its ink override.
