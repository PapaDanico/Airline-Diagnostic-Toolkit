# Global benchmark and upgrade roadmap

**Prepared** 1 August 2026 · **Platform version at time of writing** v3.0 → v3.1

---

## 1. What this is, and what it is not

A product-level benchmark of the JK & Associates platform against the firms and
software an African aviation investor would otherwise encounter, followed by a
prioritised upgrade roadmap. The first brief already asked for a benchmark against
"similar service providers", and that was answered at the level of market
positioning. This goes a layer down: what these organisations actually *build*,
what a visitor can *do* on their sites, and what the gap implies for us.

**Method and its limits.** Public web research, August 2026. Several of the
platforms benchmarked — IBA Insight, Cirium Ascend, Aviatize — sit behind
subscription paywalls or refuse automated fetches, so their feature sets are read
from vendor marketing, product pages and trade coverage rather than from hands-on
use. Where a claim about a competitor could not be confirmed, it is marked. The
absence of a feature in this document means it was not found in public material,
not that it does not exist.

---

## 2. The field, in four groups

### Group A — Aviation data and analytics platforms
**Cirium Ascend, IBA Insight / InsightIQ**

The commercial centre of gravity. Fleet, valuation, utilisation, airline risk and
emissions intelligence sold as a subscription. Cirium's Ascend suite offers
portfolio monitoring with configurable alerts, exports "in flexible
configurations", API and flat-file delivery, and a dashboard aggregating news,
data and analysis. IBA's pitch is explicitly anti-silo — one connected platform
across fleet, valuation, airline and sustainability rather than separate
databases — plus scenario building: "what if" models mapping the CO₂ and financial
implications of fleet or SAF decisions, and comparison of real against
hypothetical fleets.

**What is worth taking:** three things. *One connected view instead of separate
tools.* *Scenario building and comparison as a first-class feature.* *Data the
customer can take out* — export, API, flat file.

**What is not:** their entire product is a licensed dataset. We have no dataset
and should not pretend to. Our equivalent asset is regulatory and procedural
knowledge, which is exactly what they do not carry for Kenya.

### Group B — Global advisory houses
**ICF (SH&E + AeroStrategy), Airbus Consulting, Boeing StartupBoeing**

ICF is one of the largest aviation consulting organisations in the world, covering
strategy, financial, commercial, operational, digital and human capital advice,
and it does hold proprietary tooling — a suite of airport models and databases,
and NetWorks® for air-service scenario modelling. Airbus and Boeing both run
formal "launch your airline" programmes.

**What is worth taking:** proprietary named tooling is itself a credibility
device. ICF does not describe consultants, it describes NetWorks®.

**What is not:** none of this is self-serve. The tools sit behind the engagement.
That is the gap we occupy.

### Group C — Boutique airline start-up and AOC consultancies
**Aviatica Group, Global Aviation Support, Zenith Aviation Consulting, AACS,
RAS Technic, African Aviation Services**

The closest direct competitors. They sell precisely what JK sells: AOC build-up,
manual writing, regulator engagement, postholder recruitment, business plan and
financial modelling — variously under EASA Part-OPS, FAA Part 121/135 or ICAO
equivalents. Track records are stated as narrative ("operators now thriving in
competitive markets"). African Aviation Services is the notable Africa-focused
firm, serving airlines, aviation organisations, financial institutions and
governments.

**What is worth taking:** their case-study framing. A named certification
delivered in a named jurisdiction is the proof our category runs on, and it is
proof we currently assert rather than show.

**What is not:** their websites are brochures. Across this research, no aviation
start-up consultancy was found publishing free, interactive certification or
capital tooling. **This is the single clearest differentiator the platform has.**

### Group D — Aviation compliance and operations software
**Aviatize, Comply365, Veryon, FlightLogger, OxMaint**

The operational tier, sold to certificate *holders* rather than applicants.
Aviatize consolidates compliance tracking across all certificates into a single
dashboard showing regulatory obligation status — explicitly "eliminating
information silos" — for combined ATO-AOC operators. Veryon provides interactive
Gantt charts for allocating and monitoring work. OxMaint links airworthiness
directives to work orders and sign-offs to build "a digital chain of evidence".

**What is worth taking:** the single compliance dashboard, the Gantt, and the
chain-of-evidence idea.

**What is not:** these are post-certification systems with per-seat pricing and a
backend. Our user has no certificate yet.

---

## 3. Feature matrix

Read down the rows for what a visitor can actually do, unpaid, on the public site.

| | JK v3.0 | JK v3.1 | Group A (data) | Group B (advisory) | Group C (boutique) | Group D (compliance SW) |
|---|---|---|---|---|---|---|
| Free, no-signup interactive tooling | ✅ 11 tools | ✅ 12 tools | ✗ (paywalled) | ✗ | ✗ | ✗ (trial only) |
| Kenya / KCAA-specific requirement detail | ✅ 167 items | ✅ | ✗ | partial | partial | ✗ |
| Sourced regulatory citations with verification status | ✅ | ✅ + public index | ✗ | ✗ | ✗ | ✗ |
| Cross-tool single view of one venture | ✗ | ✅ | ✅ | n/a | n/a | ✅ |
| Composite readiness index | per tool | ✅ platform-wide | ✗ | ✗ | ✗ | partial |
| Critical-path / Gantt scheduling | ✗ | ✅ | ✗ | ✅ (internal) | ✅ (internal) | ✅ |
| Scenario save + compare | ✗ | ✗ | ✅ | ✅ | ✗ | partial |
| Data export the customer keeps | print only | ✅ JSON + print | ✅ CSV/API | ✗ | ✗ | ✅ |
| Multi-user collaboration | ✗ | file hand-off | ✅ | n/a | n/a | ✅ |
| Peer benchmark bands | operate track only | operate track only | ✅ | ✅ | ✗ | ✗ |
| Named case evidence | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ |
| Privacy: nothing leaves the device | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ |

---

## 4. Where we lead, and where we lag

**Lead.** Free self-serve depth in a jurisdiction nobody else covers, with every
requirement carrying a citation *and a verification status*. No benchmarked player
publishes anything comparable for Kenya. The privacy posture — no backend, no
analytics, no account — is a genuine differentiator with investors who will not
put a cap table into someone else's SaaS.

**Lag, in order of severity.**

1. **~~Ten islands, no archipelago.~~** *(closed in v3.1)* Every tool remembered
   its own work and nothing joined them. The benchmark's clearest common lesson —
   IBA's anti-silo pitch, Aviatize's single dashboard — was the one thing we did
   not do.
2. **~~No time dimension.~~** *(closed in v3.1)* Lead times were stated as a band
   and never turned into dates. A venture's binding constraint is the calendar.
3. **~~Work was trapped in one browser.~~** *(closed in v3.1)* No account is a
   feature; no way to move or back up the work was not.
4. **No scenario comparison.** Every tool holds exactly one model. Group A sells
   "build and compare scenarios" as headline functionality. An investor asking
   "what if we lease three instead of two" has to overwrite the answer they had.
5. **No named evidence.** Group C's entire credibility rests on delivered
   certifications. Ours rests on the quality of the tools, which is a real but
   slower argument.
6. **No greenfield peer benchmarks.** The operating track compares against peer
   bands; the build track has no equivalent — a venture cannot see whether its
   capital plan is normal.
7. **No collaboration.** A greenfield venture is a founder, a CFO, counsel and a
   consultant. v3.1's export file is a hand-off, not collaboration.

---

## 5. What shipped in v3.1

Ordered by the lag it closes.

**The Venture File (`assets/js/venture-file.js`).** A `JKW` namespace holding the
venture's identity — name, sector, target certificate date — and a reader per
build tool that opens that tool's existing `localStorage` record and derives a
summary from the raw state. Deliberately *derived, not published*: no tool was
modified to report on itself, so the tools stay usable standalone and there is no
second copy of the truth to fall out of date. The coupling is one-way and
documented.

**Venture Control Room (`tools/venture-dashboard.html`).** One page carrying:

- a **Launch Readiness Index**, weighted certification 40 / capital 25 /
  organisation 20 / structure 15, with an untouched module counting zero rather
  than being excluded from the average;
- four module cards, each with progress, the headline number, and the single next
  action;
- a **critical-path Gantt** back-scheduled from the target certificate date across
  the five KCAA phases, apportioned 10/15/30/35/10 — and an explicit warning when
  the target has already slipped;
- a **sector-mismatch check**, because four tools pointing at different sectors
  would silently sum four answers to different questions;
- **workspace export and import** as a single validated JSON file;
- a **board-pack print view** — the whole venture as one document.

**Kenya Aviation Regulatory Index (`regulations.html`).** Every instrument behind
the toolkit — Legal Notice number, title, source link, binding sectors, and an
explicit verified-or-unconfirmed status — filterable by sector, with the three
unconfirmed instruments given their caveats in full. Leads on the trap that a
regulation titled "…Regulations, 2025" carries a *2026* Legal Notice number.
This is a reference asset and an SEO asset; nothing equivalent was found published
for Kenya.

**Shared-helper consolidation.** `annualDebtService` and the look-through
cascade `lookThrough(holders)` moved into `common.js`. The dashboard re-derives
DSCR and effective interest from the same saved models the tools use, and two
implementations of either would have drifted — on exactly the numbers a lender and
a regulator read. The existing e2e assertion that the cascade reproduces the
known three-tier cap table (founder 61.63%, investor 27.75%, chain totalling
100.00%) now covers the shared implementation.

**Test coverage** rose from 207 to 238 e2e assertions; the page audit covers 23
pages, clean.

---

## 6. Roadmap

Prioritised by value against effort. The zero-backend constraint is treated as
binding, per the standing instruction, so each item is marked for whether it can
be built within it.

### Tier 1 — high value, zero-backend, buildable next

| # | Upgrade | Why | Effort |
|---|---|---|---|
| 1 | **Scenario save and compare.** Named snapshots of the venture file; a side-by-side view of two or three. | Closes the largest remaining gap against Group A. Turns "what if we lease three instead of two" from an overwrite into a comparison. | M |
| 2 | **Greenfield peer bands.** Publish indicative capital, headcount and lead-time distributions per sector so a venture sees where it sits, the way the operating track already does against CASK. | Benchmarking is the thing every Group A and B player sells. We have the sector models to derive it. | M |
| 3 | **Sensitivity / tornado on the capital model.** Vary each capex line and the revenue case; rank by impact on DSCR and funding gap. | An investment committee asks "what breaks this first". The model already holds every input. | S |
| 4 | **Evidence register per requirement.** Against each of the 167 checklist items, record the document that closes it and its date. | Group D's "digital chain of evidence", applied pre-certification. Turns the Navigator from a checklist into a submission index. | M |
| 5 | **Search across every requirement.** One field over all 167 items, six sectors, postholders and manuals. | Findability. At this corpus size, browsing is no longer sufficient. | S |
| 6 | **Shareable read-only link.** Encode the venture file into a URL fragment, as the scorecard already does with `?s=`. | Collaboration without a backend. Note the ceiling: a full workspace will not always fit a URL, so this is a summary, not the file. | M |

### Tier 2 — high value, needs the constraint revisited

Each of these requires a server, and each is therefore a decision for the user,
not a default.

| # | Upgrade | What it needs | Trade-off |
|---|---|---|---|
| 7 | **Real multi-user collaboration** on one venture file | Auth + storage | Directly contradicts "nothing leaves your browser". The privacy promise is currently a differentiator; trading it needs to buy something large. |
| 8 | **Regulatory change alerts** — notify when a cited instrument is amended or an unconfirmed one is gazetted | Scheduled fetch + mail | The single highest-value data service we could offer, and the one closest to our actual expertise. Could be run as an operator-side job feeding a static file, keeping the *visitor* side backendless. |
| 9 | **Lead capture with attribution** | Form backend | Already partly present via Netlify forms; the site otherwise collects nothing by design. |

### Tier 3 — credibility, not code

| # | Upgrade | Note |
|---|---|---|
| 10 | **Named case evidence** | Group C's core proof device. Needs client consent, not engineering. |
| 11 | **A quarterly Kenya certification data note** | Turn the regulatory index into a periodical. Cirium and IBA both anchor authority on published research. |
| 12 | **Legal placeholders in `privacy.html` / `terms.html`** | Still `[bracketed]`: registered entity and number, postal address, ODPC registration, DPO. Blocks go-live. |
| 13 | **Correct L.N. 42 in `KASH-CORP-STRUCT-001`** | The brief cites L.N. 42 as the ATO Regulations; L.N. 42/2026 is the *Air Operator Certification and Administration* Regulations. Carried over from the KASH document review. |

---

## 7. What was deliberately not built

- **A backend of any kind.** The standing instruction is zero-backend, mailto and
  local-only. Every Tier 1 item respects it; every Tier 2 item is flagged as
  requiring the instruction to be revisited rather than quietly worked around.
- **An account system**, for the same reason. Export and import solve the
  portability problem that an account would have solved, without moving anyone's
  cap table onto a server.
- **Any analytics or telemetry.** The subject tag on the enquiry mailto remains
  the only attribution signal, by design.
- **A licensed dataset play.** Competing with Cirium and IBA on fleet data is not
  a fight worth picking and not one we could win. The regulatory and procedural
  corpus is the defensible asset.
- **Promoting any citation to "verified"** without re-checking the gazette. The
  three unconfirmed instruments — the 2025 ATO Regulations, the 2025 Safety
  Management Regulations and the ground-handling licensing instrument — are still
  marked unconfirmed, and the new index says so on a dedicated page.

---

## Sources

- [Cirium — Ascend Consultancy](https://www.cirium.com/analytics-services/ascend-consultancy/)
- [Cirium — Ascend aircraft analytics](https://www.cirium.com/analytics-services/aircraft-analytics/)
- [Cirium — Dashboard](https://www.cirium.com/analytics-services/dashboard/)
- [Cirium — Aviation data sets](https://www.cirium.com/data/aviation-data/)
- [IBA Group — Digital solutions](https://www.iba.aero/digital-solutions/)
- [IBA Group — Airline risk benchmarking](https://www.iba.aero/advisory-services/consulting/airline-risk-benchmarking/)
- [IBA Group — InsightIQ upgrades](https://www.iba.aero/about/news/iba-reveals-new-insightiq-upgrades-including-advanced-carbon-reporting-and-analysis/)
- [ICF — Aviation consulting and services](https://www.icf.com/work/transportation/aviation)
- [ICF — Airline industry solutions](https://www.icf.com/work/transportation/aviation/airline-solutions)
- [Airbus — Launching your business](https://www.aircraft.airbus.com/en/services/expand/airbus-consulting/launching-your-business)
- [Boeing — StartupBoeing](https://www.boeing.com/company/startupboeing)
- [Aviatica Group — Airline startup consulting](https://www.aviatica-group.com/consulting/airline-startups)
- [Global Aviation Support — Airline consulting](https://globalaviationsupport.com/airline-consulting/)
- [Zenith Aviation Consulting — Organisational start-ups](https://www.zenithaviationconsulting.com/services/organisational-start-ups)
- [RAS Technic — AOC build-up consultancy](https://rastechnic.aero/aoc-build-up-consultancy/)
- [African Aviation Services](https://www.africanaviation.org/)
- [Aviatize — AOC glossary entry](https://www.aviatize.com/glossary/aoc)
- [Veryon — MRO management](https://veryon.com/solutions/commercial-aviation/mro-management)
- [OxMaint — Airworthiness directive tracking](https://oxmaint.com/industries/aviation-management/airworthiness-directive-tracking-software)
- [FlightLogger — Aviation training software compliance features](https://www.flightlogger.net/blog/top-8-aviation-training-software-compliance-features)
