# World-class benchmark, edition 2 — October 2026

**Prepared** 23 October 2026 · Extends [`GLOBAL_BENCHMARK_AND_ROADMAP.md`](GLOBAL_BENCHMARK_AND_ROADMAP.md)
(August 2026), which benchmarked four groups: data platforms, global advisory
houses, boutique AOC consultancies and compliance software. This edition adds
the four groups that brief did not cover — **African and operating-track
intelligence**, **business-aviation analytics**, **safety-assurance standards**
and **network/route planning** — then sets a world-class standard, scores the
platform against it, and re-prioritises the roadmap.

**What prompted it.** An evaluation of a live, nine-figure Kenyan group
formation (not named here; see the client file, kept outside the repository)
was run through the platform. It exposed, concretely, what the platform cannot
yet model. Those gaps weight the roadmap below.

**Method and limits.** Public web search, October 2026. Direct page fetches were
blocked by the environment's network policy, so every claim about a peer is read
from search-returned excerpts, vendor marketing and trade press, not from
hands-on use. Vendor claims are marked as such. Where something was not found it
is marked *not found*, which means not found in public material, not that it
does not exist.

---

## 1. The four new groups

### Group E — African and operating-track intelligence

| Peer | What it is | What we learned |
|---|---|---|
| **AFRAA AviAnalysis** (built by AviaPro Consulting, promoted by AFRAA under a May 2023 sales-promotion agreement) | A pay-per-analysis online platform: aircraft performance, aircraft operating economics and forecast passenger demand. The client browses the catalogue, orders an analysis and completes an online assumptions form; delivery without long contracts. | The nearest *productised consulting* peer to us for an African operator. Its model is **order → input form → deliverable**, priced per analysis. It is data-led on demand and aircraft performance, which we are not. It is not regulatory, not about certification or capital, and not private. AFRAA is the distribution channel. *Pricing and 2025–26 status: not found.* |
| **AFRAA Route Intelligence Portal** (with Milanamos, 2022) | Subscription portal for route-level traffic demand and revenue forecasting, beyond-connection opportunities and underserved markets; complimentary vouchers for members at launch. | Confirms AFRAA sells *route and demand* intelligence to members. A network-planning product, not a venture-build one. |
| **OAG Analyser at AFRAA** | AFRAA reports using OAG Schedules, Traffic, Connections and Mapper; OAG's own case study claims reports that took four days now take hours (**vendor claim**). | Time-to-answer is the metric these vendors sell on. |
| **IATA ACMG** | Peer cost-benchmarking cooperative: airlines submit cost data to IATA, which returns de-identified, aggregated benchmarks, a personalised BI tool and an annual report; membership described as free. | The **data-cooperative model**: members receive benchmarks because they contribute. Confidentiality is by de-identification and aggregation. *Current membership count: sources conflict.* |
| **CAPA CASK database** | Unit cost vs trip length for 100+ airlines. | Peer positioning on a single comparable axis. |
| **Oliver Wyman PlaneStats / Integrated Planning Solutions** | Aviation data plus analytical tools packaged beside consulting. | Same shape as McKinsey's Periscope: **IP, analytics and expert support sold together**. |

### Group F — Business-aviation analytics

| Peer | What it is | Relevance |
|---|---|---|
| **ARGUS (SGS) ClearView / TRAQPak / PRISM** | Flight-activity data, fleet benchmarking against industry segments (airports, routes, charter segment adjustable), custom reports, safety audits and SMS software. | The business-aviation equivalent of CASK benchmarking: utilisation, hours and fuel by segment. We have **no business-aviation benchmarks at all**. |
| **WINGX** | Global business-jet activity trackers. Reported Africa up about 15% in 2025 against about 5% globally, from about 1.4% of global traffic. | Demand-side evidence for East Africa. |
| **Conklin & de Decker** | Aircraft cost-evaluation and pricing tools for managed, charter and rotary aircraft. | The **per-aircraft operating-cost library** a charter or management business model rests on. We have none. |
| **VREF** | Aircraft value guide and valuation reports. | Source and date-stamped valuations should be an *input* to our models, not something we imitate. |
| **AfBAA** | Launched a multi-phase fleet, economic and maintenance study (Seefeld Group) in June 2026. Its chair has called for authenticated data. | A data gap exists and an industry body is trying to fill it. Early findings were not yet published when searched. |

### Group G — Safety-assurance standards

| Standard | What it does | Relevance |
|---|---|---|
| **IATA IOSA** | Audit of procedures and documentation by accredited auditors; a public registry (449 airlines as of May 2026 per IATA's fact sheet, 94 non-members); two-year cycle. | The market's trusted proxy for an operator's maturity. |
| **FSF BARS** | Risk-based standard, audit, training and data for organisations that contract operators. Bow-tie model; shared audit database to remove duplicate audits. | The standard a mining, NGO or UN customer applies to a charter operator, so it is the **commercial gate** for several of the revenue lines in a hybrid charter plan. |
| **ICAO USOAP CMA** | Protocol Questions organised by eight audit areas and eight critical elements; evidence-driven status; Online Framework. | A recognised ontology the regulator itself uses. |
| **ICAO iKits** (including an AOC iKit) | Packaged tools for regulators and service providers. | Free, authoritative and generic. Ours is Kenyan-specific, with verification status. |

### Group H — Network and route planning

**Lufthansa Systems NetLine/Plan** (O&D network-profitability simulation, scenario and competitor tests; Embraer adopted it in late 2024), **Sabre Profit Manager** (demand forecasting and schedule-scenario comparison). Both are installed enterprise software for carriers that already fly. Neither addresses a venture before its first certificate. Search found no vendor in this group advertising native Monte Carlo risk modelling.

---

## 2. Positioning, restated

The August edition's headline stands and is reinforced: **no benchmarked player
publishes free, interactive certification or capital tooling for an African
jurisdiction, with every requirement cited and carrying a verification status,
and with nothing leaving the user's browser.**

What the new groups sharpen is the line between what we should **build**, what
we should **import** and what we should **leave**:

| | Verdict | Reason |
|---|---|---|
| Regulatory, certification and capital depth for Kenya | **Build — our moat** | Nobody else has it. |
| Group, multi-entity and multi-jurisdiction structure modelling | **Build** | The live engagement needed it and the platform has no concept of it. |
| Demand forecast, schedule data, route revenue | **Import** | AFRAA/OAG/Milanamos/ARGUS own the data. Accept their exports as dated, sourced inputs. |
| Aircraft operating-cost library, valuations | **Import** | Conklin & de Decker and VREF own this. Never type it from memory. |
| Safety standards (IOSA, BARS, USOAP) | **Map** | Align our checklists and scorecards to them rather than invent a parallel scale. |
| Enterprise network planning | **Leave** | Wrong user and wrong stage. |

---

## 3. A world-class standard, and where we stand

Ten dimensions drawn from what the better peers and the better consulting
deliverables do. Ratings are this audit's judgement.

| # | Dimension | World-class means | Today | Gap |
|---|---|---|---|---|
| 1 | **Evidence and sourcing** | Every figure dated, sourced and confidence-graded; an assumption register that shows what the client replaced | Strong: benchmarks dated and enforced by `check-data.mjs`; citations carry verification status | No confidence grade; no cross-tool assumption register |
| 2 | **Model integrity** | One financial core feeding every output; no number computed twice | Shared helpers exist (`annualDebtService`, `lookThrough`); tools still own their arithmetic | No P&L, cash-flow or balance-sheet core |
| 3 | **Structure** | Group → verticals → certificate holders, shared-service allocation, consolidated view, ownership test per jurisdiction | Single venture, single sector, Kenya only | Largest gap; the live case needed it |
| 4 | **Unit economics** | Tail-by-tail, type-by-type, hours × yield × utilisation by quarter | Route-level break-even only | No fleet model |
| 5 | **Uncertainty** | Reverse-solve ("what you have to believe"), tornado, P10/P50/P90 | Four-scenario DSCR sensitivity | No solver, tornado or distribution |
| 6 | **Report architecture** | Cover, answer-first summary, action titles, sourced exhibits, assumptions appendix, running footer, versioned | Answer-first summary; footer and page numbers added this month; the rest prints the tool | Print template per tool |
| 7 | **Regulatory depth** | Machine-readable, per-jurisdiction, change-tracked, lead times calibrated on outcomes | Excellent for Kenya; static | One jurisdiction; no change feed; durations are bands |
| 8 | **Safety integration** | Mapped to IOSA/BARS/USOAP; risk register with appetite; links to gates | SMS screen (five questions); explicitly not an assessment | No mapping, no register |
| 9 | **Collaboration and governance** | Review, comment, approval, decision log, audit trail | File hand-off | None |
| 10 | **Trust** | Privacy, accessibility, security, tested | Industry-leading for the segment: no backend, CSP enforced, focus and contrast audited | Keep it; do not trade it casually |

---

## 4. Roadmap, re-prioritised

Constraint carried from the standing instruction: **zero backend**. Items that
need one are marked and left as decisions.

### Tier 1 — build next, within the constraint

| # | Item | Peer lesson | What it unlocks |
|---|---|---|---|
| 1 | **Reverse-solve ("what you have to believe")** on the capital model: given revenue and capital, solve for the margin, the debt capacity and the break-even hours per tail | NetLine/Plan's scenario stress; every investment committee's first question | Turns the Venture Builder from a calculator into an argument. Worked by hand in the live case in an afternoon. |
| 2 | **Plan Integrity Linter** — a structured "plan passport" (dates, fleet counts, headcount, capex, revenue streams) with rules that cross-check it and list contradictions with severity | None of the peers do this; it is what a Big-Four review spends its first week on | The most differentiated feature available. In the live case it found twelve contradictions inside one 37-page deck, five of them decision-changing. |
| 3 | **Fleet unit-economics module** — per tail: EIS date, hours, yield, utilisation, crew pairs, reserves; import of third-party cost and value libraries as dated, sourced inputs | Conklin & de Decker, VREF, ARGUS ClearView | Closes dimension 4. Never ships its own numbers for aircraft cost. |
| 4 | **Report architecture** — a print template per tool: cover, answer-first summary, action-titled exhibits, assumptions table (not form fields), sources appendix, version stamp | McKinsey/OW pack conventions; this audit's finding 3A | Closes dimension 6. Supersedes the "print the tool" approach. |
| 5 | **Assumption register** — every default carries source, date, grade (A sourced / B derived / C house planning figure) and shows the delta when the user overrides it | IATA ACMG's de-identified sourcing; `CLAUDE.md` §7 | Closes dimension 1, and makes "nobody's publication" defaults visible on the page, in print and in code, as the repository already requires. |
| 6 | **Tornado and a small Monte Carlo** (client-side, seeded, P10/P50/P90) on the capital and revenue models | Not found at any peer | Closes dimension 5, and is a visible differentiator. |
| 7 | **Safety mapping** — tag each checklist item to the ICAO critical element and the IOSA/BARS area it evidences; add an SMS risk register with a bow-tie view | IOSA, BARS, USOAP | Closes dimension 8, and the BARS mapping unlocks mining/NGO customers' language. |

### Tier 2 — structural; needs the constraint or a data source revisited

| # | Item | Needs |
|---|---|---|
| 8 | **Group and multi-jurisdiction model** — HoldCo → verticals (AOC, AMO, FBO, a second country), shared-service cost allocation, ownership test per licence, consolidated outputs | Mostly client-side; the gating work is **verified regulatory data for each new jurisdiction** (Tanzania first), which cannot be written from memory |
| 9 | **JK Benchmark Cooperative** — operators contribute anonymised aggregates and receive greenfield and bizav peer bands in return (the ACMG model) | A submission path and a k-anonymity threshold. Contradicts "nothing leaves the browser" unless built as explicit, opt-in, aggregate-only export. Decision for the owner |
| 10 | **Regulatory change feed** — operator-side job that diffs the gazette and ships a static file | Already item 8 in the August roadmap; still the highest-value data service available |
| 11 | **Review and approval workflow** — comments, decision log, audit trail on a venture file | Auth and storage, or end-to-end-encrypted file-based sync |

### Tier 3 — credibility, not code

- **Named, consented case evidence.** Group C's proof device; still asserted, not shown.
- **An AFRAA/AfBAA relationship.** AFRAA promotes AviAnalysis on a sales-promotion agreement; a similar arrangement for the venture-build stage complements rather than competes with it.
- **Independent validation of the engine**, published: a short method note and a named external reviewer.

### Deliberately not recommended

- A **licensed dataset play** against Cirium, IBA, OAG or ARGUS.
- **Enterprise network planning** (NetLine/Plan territory).
- **Copying any peer's published figures into our defaults.** Import with attribution and date, or leave blank.

---

## 5. What the live case says about priorities

The order above follows the engagement, not a feature wish-list. Within one
week of work the platform's existing tools covered certification gates,
acquisition mechanics, a debt-service check and a postholder test, and could not
cover: a group of four certificate holders across two countries, a fleet of
eight tails with different economics, an investment return, or a plan's internal
consistency. Items 1, 2, 3 and 8 are those four gaps. They are also the gaps a
Board, a lender and a regulator would each find first.

---

## Sources

Search-returned material, October 2026. None was fetched directly.

- [AFRAA — AviAnalysis workshop agenda](https://www.afraa.org/wp-content/uploads/2023/11/Proposed-Avianalysis-Workshop-AGENDA-.pdf)
- [AFRAA and AviaPro sales-promotion agreement (press release)](https://www.afraa.org/wp-content/uploads/2023/05/Press-Release-AFRAA-and-AviaPro-Consulting-sign-a-Sales-Promotion-Agreement-to-promote-the-use-of-AviAnalysis-a-fully-integrated-online-aviation-analysis-system.pdf)
- [Consultancy.africa — AFRAA to promote AviAnalysis](https://www.consultancy.africa/news/2000/afraa-to-promote-avianalysis-platform-of-aviapro-consulting)
- [AFRAA — Route Intelligence Portal launch](https://www.afraa.org/afraa-launches-a-route-intelligence-portal/)
- [Times Aerospace — AFRAA and Milanamos portal](https://timesaerospace.aero/news/technology/afraa-and-milanamos-launch-dedicated-aviation-route-intelligence-portal)
- [OAG — AFRAA case study](https://www.oag.com/afraa-case-study)
- [IATA — Airline Cost Management Group](https://www.iata.org/en/services/finance/airline-cost-mgmt)
- [IATA — ACMG vision brochure](https://www.iata.org/contentassets/3b5a413027704ce08976fe1890fb43e2/acmg-vision-brochure.pdf)
- [CAPA — CASK database](https://centreforaviation.com/analysis/reports/capas-new-cask-database-allows-global-airline-unit-cost-benchmarking-and-strategic-mapping-242176)
- [Cirium — Fleets Analyzer](https://www.cirium.com/products/views/fleets-analyzer/)
- [Oliver Wyman — PlaneStats](https://www.oliverwyman.com/our-expertise/insights/2013/oct/planestats-brochure.html)
- [McKinsey — Periscope](https://www.mckinsey.com/capabilities/growth-marketing-and-sales/solutions/periscope/resources/videos/periscope-overview)
- [ARGUS — ClearView](https://www.argus.aero/aviation-analytics/clear-view/)
- [ARGUS — Aviation analytics](https://www.argus.aero/aviation-analytics/)
- [WINGX Global Market Tracker, Nov 2025](https://www.blueskynews.aero/issue-822/WINGX-Global-Market-Tracker-041225.html)
- [Forbes Afrique — Jets privés](https://forbesafrique.com/jets-prives-lafrique-change-dechelle/)
- [Aviation Week — AfBAA data set](https://aviationweek.com/business-aviation/afbaa-data-set-reveal-africas-business-aviation-growth)
- [AIN — AfBAA research project, 15 June 2026](https://connect.ainonline.com/ainalerts-june-15-2026)
- [Jetcraft — Africa's business aviation market, Oct 2025](https://www.jetcraft.com/jetstream/2025/10/africas-business-aviation-market/)
- [VREF](https://vref.com/news/how-to-get-a-vref-online-subscription/)
- [AIN — VREF valuation platform](https://www.ainonline.com/aviation-news/business-aviation/2019-10-19/vref-unveils-updated-valuation-platform)
- [IATA — Safety audits fact sheet](https://www.iata.org/en/iata-repository/pressroom/fact-sheets/fact-sheet---safety-audits/)
- [SKYbrary — IOSA](https://skybrary.aero/articles/iata-operational-safety-audit)
- [SKYbrary — BARS](https://skybrary.aero/articles/basic-aviation-risk-standard-bars)
- [Flight Safety Foundation — BARS](https://flightsafety.org/resource/basic-aviation-risk-standard/)
- [ICAO — USOAP CMA evolution](https://www.icao.int/sites/default/files/Meetings/Archive%20Assembly/a40/reference-documents/Report-on-the-Evolution-of-the-USOAP-CMA.pdf)
- [ICAO — AOC iKit](https://icao.int/safety/OASIS/Pages/aoc_ikit.aspx)
- [Lufthansa Systems — NetLine/Plan](https://lhsystems.com/product-brands/netline/netline-plan)
- [Airbus Consulting — launching your business](https://www.aircraft.airbus.com/en/services/expand/airbus-consulting/launching-your-business)
- [IATA outlook for Africa, Dec 2025 (Engineering News)](https://www.engineeringnews.co.za/article/iata-forecasts-that-global-airline-profitability-will-stabilise-next-year-but-africa-will-lag-2025-12-09)
