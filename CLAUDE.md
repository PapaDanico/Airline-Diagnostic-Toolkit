# Working agreement for this repository

Read this before touching anything. It records how this project is worked
on, and why — most of it was learned the expensive way.

## 1. Finish the work. Do not hand assignments back.

The standing instruction from the owner is: **use every tool and resource
available and resolve the issue completely.** Do not close a session with
a list of things for him to do. He is a working airline captain; a
handover list is not a deliverable.

That means, concretely:

- If a fix is possible here, make it. Do not describe it and stop.
- If a check can be run, run it. Do not recommend that someone run it.
- If something is genuinely outside this environment — a billing change,
  an egress policy, a password-protected console — say so in one
  sentence, name exactly what is blocked, and do everything either side
  of it. Do not present it as a task list.
- Prefer doing the boring adjacent work (regenerating a manifest,
  re-running a suite, updating a doc) over mentioning that it needs doing.

The exception is a decision only the owner can make — a commercial
choice, a claim about the business, or an irreversible outward-facing
action. Ask about those. Do not ask about work.

## 2. Verify your harness before you blame the product

In one session three separate "bugs" were reported against working code,
all of them artifacts of the test harness:

- Raw `page.mouse` does not auto-scroll. An element below the fold has
  viewport coordinates outside the viewport, so the click lands nowhere
  and the control looks dead.
- `html { scroll-behavior: smooth }` is set in `jk.css`. `scrollIntoView`
  therefore animates, and a click 120 ms later lands on a moving target.
  Drive the browser with `reducedMotion: "reduce"` — the site turns
  smooth scrolling off under it — or scroll with `behavior: "instant"`.
- A cached `boundingBox()` goes stale the moment a recompute changes the
  height of anything above the element.

Before reporting that a control does not work, prove the click reached
it: `document.elementFromPoint(...)` at the control's own centre should
return the control. If it returns `null` or something else, the harness
is wrong, not the page.

Corollary: **a slider that fails one way and works another (keyboard
fine, mouse dead) is almost always the harness.** Real breakage is rarely
that selective.

## 3. The deploy gate lives in the packager, not in CI

Production is deployed direct to Netlify. `scripts/package-deploy.mjs`
runs the same twelve checks CI runs and **writes no artifact if any
fail** — there is deliberately nothing to upload after a failure. It also
refuses a dirty tree and warns when the packaged commit is not on `main`.

CI (`.github/workflows/ci.yml`) is a second opinion with no authority
over deploys. If CI and the packager ever disagree about one commit,
that disagreement is the bug.

Never reach for `--skip-tests` out of impatience. It stamps the artifact
unverified and exists only for the case where the suite has just been run
by hand.

## 4. A new check is watched to fail before it is trusted

Stated in the README and meant literally. A guard that has never been
seen to fail on the condition it claims to catch is not yet a guard.
When `package-deploy.mjs` was added, an undefined function call was
appended to a page, `e2e` caught it, and no artifact was written — only
then was it trusted.

## 5. Two AI copilots did real damage here

PRs #101 and #102 were merged with the suite red — five audit failures,
nine end-to-end failures — and everything they broke reached production:
a tool that could not be typed into, a capital figure wrong by roughly
threefold, and a storage bug that showed today's revenue against every
saved scenario. The suite caught all of it and was overridden.

Two consequences:

- **Never merge red.** If the checks cannot run, say so explicitly rather
  than letting a green-looking merge imply they passed.
- Treat generated code as a draft. Drive the actual page in a browser
  before believing it works. Reading the diff is not verification.

## 6. Re-rendering destroys the control the user is holding

The recurring defect class in this codebase. A block that rebuilds its
own `innerHTML` on every keystroke destroys the input under the cursor:
focus falls to `<body>`, panels fold shut, and characters typed into the
node being replaced are lost with it. Entering `50000000` left `50`.

The fix is always the same shape: **build the controls once, and rewrite
only derived text.** Restoring focus afterwards hides the symptom and
still drops keystrokes.

Related: `wireToolEnquiryForm` is idempotent by design, because several
pages call it from a render path. Without the guard one click would POST
the same lead several times.

## 7. Numbers must be computed once

The capital figure was computed three different ways — in the banner, in
the caption beneath it, and again when saving to the Venture File. One
formula, one place, referenced everywhere.

Figures shown to an operator are either sourced or labelled. Benchmarks
in `data.js` must carry a source and a date (`check-data.mjs` enforces
it). Planning defaults that come from nobody's publication — segment
rates, aircraft values, overhead — must say so on the page, in the
printed pack, and in the code. Never invent a citation to satisfy a
guard.

## 8. Light components inside dark bands must re-assert their ink

`.band-ember` paints every `<p>` white; `.guarantee` and `.note` bring
their own light backgrounds. Dropping one into the other yields white on
light amber at 1.11:1, and a sand focus ring at 1.43:1. There are
explicit overrides in `jk.css` for both — follow that pattern rather than
restyling the markup.

## 9. Revenue

The site's only conversion is the `tool-enquiry` Netlify form. As of
August 2026 all three registered forms had **zero submissions since
July** — with the capture mechanism verified working end to end, which
points at traffic, not plumbing. There is no analytics by design, so the
two cannot currently be told apart from the inside.

Every tool that produces a result a buyer would act on should end in a
capture form, not a `mailto:`. A `mailto:` is unmeasurable, dies on
mobile, and leaves nothing you own.
