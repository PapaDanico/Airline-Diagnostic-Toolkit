# World-class benchmark, edition 3 — November 2026

**Prepared** 20 November 2026 · Extends [`WORLD_CLASS_BENCHMARK_2026-10.md`](WORLD_CLASS_BENCHMARK_2026-10.md)
(edition 2) and [`GLOBAL_BENCHMARK_AND_ROADMAP.md`](GLOBAL_BENCHMARK_AND_ROADMAP.md) (edition 1).

**What this edition adds.** Three peer groups the earlier editions did not
cover closely: **free self-serve aviation tools**, **start-up and AOC
consultancies working in Africa**, and the **AI turn in safety and compliance
software**. It then updates the October roadmap's status and records what was
built as a result.

**Method and limits.** Public web search, November 2026. Claims about peers
come from vendor pages, trade press and search excerpts, not hands-on use, and
vendor claims are marked as such. *Not found* means not found in public
material.

---

## 1. The three new groups

### Group I — Free, self-serve aviation tools

| Peer | What it offers | Lesson |
|---|---|---|
| **Aviatize** (flight-school software vendor) | A set of free calculators, including a flight-school start-up cost estimator; "no signup required". | The closest match to our model of free, frictionless tools as the front door to a paid service. Narrower: flight schools only, no regulatory content. |
| **BlackJet, Jettly** (charter marketplaces) | Charter cost calculators that return an itemised quote, a blended hourly rate and suggested aircraft; ownership against fractional, jet-card and on-demand comparisons. | Itemisation builds trust: the buyer sees each line, not one number. Our Revenue Builder prices streams but does not itemise a single trip. |
| **Avi-Go, Aviapages** | Flight-time and cost calculators, labelled as planning estimates. | The "planning estimate, not a quote" framing is now industry-standard; we already use it. |
| **Flevy marketplace** | Paid Excel templates: a three-statement private-jet charter model; a 124-page aviation start-up guide. | Founders pay for templates. A three-statement view (P&L, cash flow, balance sheet) is the format they expect; we stop at EBITDA, DSCR and returns. |

### Group J — Start-up and AOC consultancies working in Africa

| Peer | Stated scope | Lesson |
|---|---|---|
| **TACG Worldwide** | Airline and charter start-ups; notes that serious applicants prepare a business plan, financial projections, an aircraft acquisition plan, a risk register and **proof of financial fitness**. | Names the deliverable set a regulator and a lender expect. We covered all of it except a computed financial-fitness test, now built (§3). |
| **Airbus Consulting** | Business plan, organisation set-up, AOC application advisory, CAMO set-up. | A manufacturer-backed full-cycle offer; the benchmark for depth, not price. |
| **ALN (law firm network)** | AOC and maintenance-organisation approvals, licensing, ownership-and-control tests, slots and route rights, across Kenya, Tanzania, Rwanda and South Africa. | Legal-led licensing work. Its ownership-and-control focus matches our Corporate Structure Designer. |
| **Airline Factory** | AOC acquisition, IOSA certification, safety management, organisation build. | Acquisition of an existing AOC is a recognised route; our AOC Acquisition Analyser serves it. |
| **AviaPro Consulting; AFRAA consulting; African Aviation Services** | Feasibility studies and business plans for start-ups; regulatory compliance; bilateral negotiations. | The African field sells reports and engagements. None publishes interactive tools for an African jurisdiction (edition 2's finding still holds). |

### Group K — The AI turn in safety and compliance software

| Peer | Development | Lesson |
|---|---|---|
| **TrustFlight Centrik 5** | "Smart Suggestions" (July 2026): flags duplicate reports, suggests report categories, spots repeat findings (**vendor claim**). | AI is being used for triage, not judgement. Repeat-finding detection is the useful part. |
| **Ideagen (Q-Pulse)** | "Mazlan AI", marketed as agentic AI fluent in aviation (**vendor claim**); audit, supplier and SMS modules supporting ICAO Annex 19. | Incumbents now compete on AI-assisted workflow. |
| **Comply365** | Safety, content and training management; reports 480+ aviation customers; acquired ASQS, AQD and an AI firm, Beams (**vendor claims**). | Consolidation: one vendor for SMS, manuals and training. |
| **Market** | A review site lists 35 products in aviation compliance monitoring (August 2026). | Crowded, enterprise-priced, operator-side. Our place is before the certificate, not after. |

---

## 2. Positioning, unchanged and sharpened

Editions 1 and 2 found that no benchmarked player publishes free, interactive
certification and capital tooling for an African jurisdiction, with every
requirement cited and nothing leaving the user's browser. This edition finds
the same, and adds one point: **the self-serve tools that do exist (Group I)
stop at cost and price; the consultancies that cover regulation (Group J) sell
reports, not tools.** The platform sits in the gap between the two.

---

## 3. Built from this edition

**Air Service Licence financial-fitness test** (Venture Builder, air-services
sector). The Licensing of Air Services Regulations (reg. 19) ask an applicant
to show its obligations met for two years and at least three months of fixed
and operating costs covered without relying on revenue. The tool now computes
three months of operating cost (revenue less EBITDA, the same margin the debt
test uses), compares it with the working capital in the plan, states the
cover or the shortfall, and flags when the base case cannot service debt,
which would also fail the two-year test. It appears only for air services: an
ATO, an MRO or a UAS operator holds no Air Service Licence. It is covered by
end-to-end tests watched to fail first.

---

## 4. Roadmap status and next priorities

### October Tier 1, updated

| # | Item | State, 20 November 2026 |
|---|---|---|
| 1 | Reverse-solve | Shipped (Returns & Reverse-Solve) |
| 2 | Plan Integrity Linter | Shipped in first form (Plan Consistency Check) |
| 3 | Fleet unit economics | Partly shipped (Fleet & Crew Planner); per-tail yield not built |
| 4 | Report architecture | Partly shipped; assumptions table and sources appendix per pack not yet standard |
| 5 | Assumption register | Shipped in the Returns tool (grades, defaults, overrides shown); not yet cross-tool |
| 6 | Tornado and Monte Carlo | Shipped (Returns tool) |
| 7 | Safety mapping | Shipped (Safety Assurance Map) |

### Next, in order of value

| # | Item | Peer lesson | Why now |
|---|---|---|---|
| 1 | **Cross-tool assumption register in every printed pack** | Edition 2 dimension 1; Group I's "planning estimate" convention | **Shipped 20 Nov 2026**: every printable tool now ends its pack with an *Assumptions used* table (each labelled input, its value, and Changed or Default). Still to do: per-default source, date and grade, as the Returns tool already shows |
| 2 | **Three-statement view** (P&L, cash flow, balance sheet) behind the Venture Builder and Returns tool | Flevy templates; TACG's deliverable list | Founders and lenders expect it; we stop at EBITDA and DSCR |
| 3 | **Per-tail yield and an itemised trip quote** in the Revenue Builder | BlackJet and Jettly itemisation | Turns stream totals into something a charter buyer recognises |
| 4 | **Repeat-finding flag** in the Safety Assurance Map: the same weakness recorded in two areas is shown once, with both locations | Centrik Smart Suggestions | Useful triage, fully client-side, no AI service needed |
| 5 | **Group and multi-jurisdiction model** | Carried from edition 2, Tier 2 | Still the largest structural gap |

### Deliberately not recommended

- A hosted AI assistant. It would send user inputs to a third party and break the platform's core privacy property. Client-side, rule-based triage (item 4) gives most of the value.
- Competing with SMS and compliance suites after certification (Group K).
- Copying any peer's published prices or costs into our defaults.

---

## Sources

Search-returned material, November 2026.

- [Aviatize — free tools](https://www.aviatize.com/tools); [start-up cost estimator](https://www.aviatize.com/tools/startup-cost-estimator)
- [BlackJet — charter cost calculator](https://blackjet.com/post/charter-plane-cost-calculator)
- [Jettly — airplane cost calculator](https://jettly.com/post/airplane-cost-calculator)
- [Avi-Go — flight calculator](https://avi-go.com/newsroom/articles/flight-calculator)
- [Flevy — private jet charter three-statement model](https://flevy.com/browse/marketplace/private-jet-charter-3-statement-financial-model-8753)
- [TACG Worldwide — airline start-up consulting](https://www.tacgworldwide.com/Starting-An-Airline-Aviation-Consultants)
- [Airbus Consulting — launching your business](https://www.aircraft.airbus.com/en/services/expand/airbus-consulting/launching-your-business)
- [ALN — aviation practice](https://aln.africa/expertise/industries/aviation/)
- [Aviation Week — AviaPro in Africa and the Middle East](https://aviationweek.com/air-transport/spotlight-aviapro-stretching-its-wings-across-africa-middle-east)
- [African Aviation Services — consultancy](https://www.africanaviation.org/consultancy/)
- [AFRAA consulting brochure](https://afraa.org/wp-content/uploads/2020/07/AFRAA-CONSULTING-BROCHURE.pdf)
- [AIN — TrustFlight targets safety reporting workload with AI, July 2026](https://backend.ainonline.com/aviation-news/business-aviation/2026-07-22/trustflight-targets-safety-reporting-workload-ai)
- [Ideagen — aviation](https://www.ideagen.com/industries/aviation)
- [G2 — aviation compliance monitoring software](https://g2.com/categories/aviation-compliance-monitoring)
- [SafetyCulture — aviation safety management software 2026](https://safetyculture.com/app/aviation-safety-management-software)
