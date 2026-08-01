/* ============================================================
   JK & ASSOCIATES — GLOSSARY (v3.3)

   The vocabulary an African aviation venture actually meets, across
   five languages that rarely appear in one place: the regulator's,
   the lender's, the corporate lawyer's, the operator's and Kenya's.

   Each entry:
     t    term as it is normally written
     full expansion, where the term is an initialism
     cat  regulatory | roles | finance | corporate | ops | kenya
     d    definition — written for someone meeting the term for the
          first time in a real document, not for someone revising
     why  (optional) why it matters / what goes wrong around it.
          This is the part a dictionary would not carry and the part
          that earns the page.
     see  (optional) related terms, matched on `t`
     cite (optional) key into JKV.cites

   ── ON ACCURACY ─────────────────────────────────────────────
   Definitions describe general practice and, where Kenyan, the
   position as understood at JKV.CITE_META.verifiedOn. They are not
   legal advice and thresholds change. Where a figure would date
   quickly (fee levels, exact limits), the entry says what the figure
   is *for* rather than asserting a number.
   ============================================================ */

const JKG = {

  cats: [
    { id: "regulatory", label: "Regulatory & certification", icon: "⚖️",
      blurb: "The instruments, approvals and process language the Authority uses." },
    { id: "roles",      label: "Roles & postholders", icon: "👥",
      blurb: "The named posts a regulator accepts, and who is answerable for what." },
    { id: "finance",    label: "Capital & finance", icon: "💷",
      blurb: "What a lender or investment committee means by the words in your model." },
    { id: "corporate",  label: "Corporate structure", icon: "🏛️",
      blurb: "Holding chains, ownership tests and the governance around them." },
    { id: "ops",        label: "Operations & performance", icon: "✈️",
      blurb: "The unit economics and reliability measures an operating carrier lives by." },
    { id: "kenya",      label: "Kenya & the region", icon: "🇰🇪",
      blurb: "Bodies, statutes and initiatives specific to Kenya and East Africa." }
  ],

  terms: [
    /* ---------------- REGULATORY & CERTIFICATION ---------------- */
    { t:"AOC", full:"Air Operator Certificate", cat:"regulatory", cite:"aoc",
      d:"The certificate authorising an operator to conduct commercial air transport. It is issued with operations specifications that define exactly what you may do — aircraft types, areas of operation, and any special approvals.",
      why:"An AOC alone does not entitle you to sell transport. In Kenya you also need an Air Service Licence, and the two run on separate tracks that must be sequenced together.",
      see:["Air Service Licence","Operations Specifications","Five-Phase Process"] },

    { t:"Air Service Licence", full:"", cat:"regulatory", cite:"airsvc",
      d:"The economic authorisation to sell air transport on a route or in a market, distinct from the safety approval represented by the AOC.",
      why:"Applicants routinely discover this late. It carries its own ownership-and-control test, which is where a foreign-majority shareholding chain most often fails.",
      see:["AOC","Ownership and Control"] },

    { t:"ATO", full:"Approved Training Organisation", cat:"regulatory", cite:"ato",
      d:"An organisation approved to deliver training toward licences and ratings, under an approved scope listing exactly which courses and devices are covered.",
      why:"The scope of approval is the product. Adding a course or a device after certification is a defined amendment process, not an internal decision.",
      see:["FSTD","Head of Training","Scope of Approval"] },

    { t:"AMO", full:"Approved Maintenance Organisation", cat:"regulatory", cite:"amo",
      d:"An organisation approved to perform maintenance on aircraft or components, certified against a capability list.",
      why:"Scope discipline decides your timeline. A narrow initial capability list certifies far faster than an ambitious one, and every line must be evidenced with data, tooling, trained staff and facility.",
      see:["Capability List","MOE","Certifying Staff"] },

    { t:"Five-Phase Process", full:"", cat:"regulatory", cite:"ac5phase",
      d:"The certification and approval sequence used by KCAA: pre-application, formal application, document evaluation, demonstration and inspection, then certification.",
      why:"Each phase has a gate. The Authority does not advance a partially-closed phase, so a single unclosed finding stops everything behind it. Most ventures fail on sequencing, not merit.",
      see:["Gate Item","Schedule of Events","Finding"] },

    { t:"PASI", full:"Pre-Application Statement of Intent", cat:"regulatory", cite:"acOps001",
      d:"The opening declaration of what you intend to do — aircraft types, areas of operation, type of service — that begins the certification conversation.",
      why:"It sets the scope the Authority resources against. Overstating it here buys you a longer, more expensive process than you needed." },

    { t:"Schedule of Events", full:"SOE", cat:"regulatory", cite:"ac5phase",
      d:"The dated, resourced plan from formal application through to certificate issue, agreed with the Authority.",
      why:"The Authority resources its certification team against your SOE. If your procurement or recruitment drifts from it, inspector availability drifts too — and that lost slot is not recovered by working harder." },

    { t:"Gate Item", full:"", cat:"regulatory",
      d:"A requirement that blocks progression to the next certification phase until it is closed. In the JK Navigator these are marked distinctly from ordinary items.",
      why:"Gate items are the real critical path. Closing thirty ordinary items while one gate item stays open advances you by nothing.",
      see:["Five-Phase Process","Finding"] },

    { t:"Finding", full:"", cat:"regulatory",
      d:"A documented non-compliance raised by the Authority during document evaluation or inspection, which must be corrected and accepted before the process continues.",
      why:"Findings are normal and expected — an application with none usually means the evaluation has not started properly. What matters is the closure loop: how fast you correct, resubmit and get acceptance.",
      see:["Level 1 Finding","Gate Item"] },

    { t:"Level 1 Finding", full:"", cat:"regulatory",
      d:"The most serious category of non-compliance, typically indicating an immediate safety concern or a systemic failure, requiring immediate corrective action.",
      why:"For a certificate holder, open Level 1 findings can suspend or limit the certificate. For an applicant they stop the process outright.",
      see:["Finding"] },

    { t:"Operations Specifications", full:"Ops Specs", cat:"regulatory", cite:"aoc",
      d:"The schedule attached to a certificate setting out precisely what the holder is authorised to do — aircraft, areas, approvals, limitations.",
      why:"Anything not on the Ops Specs is not authorised. Read every line on issue: applicants frequently assume an authorisation they never actually applied for.",
      see:["AOC","Scope of Approval"] },

    { t:"Scope of Approval", full:"", cat:"regulatory",
      d:"The equivalent of operations specifications for a training or maintenance organisation — the courses, devices or capabilities the approval actually covers.",
      see:["ATO","AMO","Capability List"] },

    { t:"Capability List", full:"", cat:"regulatory", cite:"amo",
      d:"The definitive list of what an AMO may work on, by aircraft type, component and level of maintenance.",
      why:"Every line needs current technical data, calibrated tooling, trained and authorised staff, and suitable facilities. No evidence, no capability — however obvious the work seems." },

    { t:"MOE", full:"Maintenance Organisation Exposition", cat:"regulatory", cite:"amo",
      d:"The governing document of an AMO: scope, procedures, personnel, facilities and how compliance is assured.",
      see:["AMO","Capability List"] },

    { t:"CAME", full:"Continuing Airworthiness Management Exposition", cat:"regulatory", cite:"aoc",
      d:"The document describing how an operator manages the continuing airworthiness of its fleet — the maintenance programme, reliability monitoring and the contracted maintenance chain.",
      see:["CAMO","Maintenance Programme"] },

    { t:"Maintenance Programme", full:"AMP", cat:"regulatory", cite:"aoc",
      d:"The approved schedule of maintenance tasks and intervals for a specific aircraft, derived from the manufacturer's recommendations and adjusted for how the operator actually uses it.",
      why:"It is operator-specific, not a manufacturer document you adopt unchanged. Utilisation, route environment and configuration all change the intervals, and the Authority approves the result.",
      see:["CAME","CAMO","Reliability Programme"] },

    { t:"Reliability Programme", full:"", cat:"regulatory",
      d:"The process of monitoring in-service defect and removal data to confirm the maintenance programme is working, and to adjust intervals where it is not.",
      see:["Maintenance Programme","Dispatch Reliability"] },

    { t:"CAMO", full:"Continuing Airworthiness Management Organisation", cat:"regulatory",
      d:"The function responsible for keeping aircraft airworthy between maintenance events — airworthiness directives, service bulletins, records and the maintenance programme.",
      why:"Often confused with the AMO. The CAMO decides what must be done and when; the AMO does it and releases the aircraft to service.",
      see:["AMO","CAME"] },

    { t:"MEL", full:"Minimum Equipment List", cat:"regulatory", cite:"aoc",
      d:"The approved list of equipment that may be inoperative for dispatch, with the conditions and time limits attached.",
      why:"An operator-specific MEL is derived from the manufacturer's Master MEL and must be approved. Dispatch discipline against it is one of the first things surveillance examines." },

    { t:"SMS", full:"Safety Management System", cat:"regulatory", cite:"annex19",
      d:"The systematic approach to managing safety — policy, hazard identification, risk management, safety assurance and promotion — expected under ICAO Annex 19.",
      why:"An SMS copied from an airline into a drone operation fails, and so does the reverse. It must be proportionate to the risk of what you actually fly.",
      see:["Hazard","Safety Performance Indicator"] },

    { t:"Hazard", full:"", cat:"regulatory",
      d:"A condition or object with the potential to cause injury, damage or loss. Distinct from the risk, which is the assessed likelihood and severity of its consequence.",
      why:"Confusing hazard with risk is the most common defect in a first SMS submission — hazard registers that list consequences, or risk matrices with no identified hazard behind them.",
      see:["SMS"] },

    { t:"Safety Performance Indicator", full:"SPI", cat:"regulatory",
      d:"A measurable parameter used to monitor and assess safety performance, usually paired with a target and an alert level.",
      see:["SMS"] },

    { t:"C of A", full:"Certificate of Airworthiness", cat:"regulatory", cite:"instr",
      d:"The certificate attesting that an individual aircraft conforms to its approved type design and is in a condition for safe operation.",
      see:["Conformity Inspection"] },

    { t:"Conformity Inspection", full:"", cat:"regulatory",
      d:"The physical inspection confirming an aircraft matches its documentation and approved configuration before it goes on a certificate.",
      see:["C of A","Proving Flight"] },

    { t:"Proving Flight", full:"", cat:"regulatory", cite:"aoc",
      d:"A demonstration flight flown to the proposed schedule with Authority inspectors aboard, showing the operation works as the manuals describe.",
      why:"Proving flights fail on ordinary things — dispatch paperwork, crew briefing discipline, load control — far more often than on flying." },

    { t:"FSTD", full:"Flight Simulation Training Device", cat:"regulatory", cite:"ato",
      d:"A simulator or training device qualified to a defined standard, from a basic procedures trainer up to a full-flight simulator.",
      why:"Each device is qualified in its own right before it can be used for credit, and requires recurrent re-qualification. Device delivery and installation, not paperwork, is usually the binding constraint on an ATO timeline.",
      see:["ATO","Qualification Test Guide"] },

    { t:"Qualification Test Guide", full:"QTG", cat:"regulatory",
      d:"The document of objective and subjective tests demonstrating an FSTD meets its qualification standard.",
      see:["FSTD"] },

    { t:"DGR", full:"Dangerous Goods Regulations", cat:"regulatory", cite:"dgr",
      d:"The rules governing acceptance, handling, packing and carriage of dangerous goods by air.",
      why:"Applies even if you do not intend to carry dangerous goods — you still need procedures for recognising and refusing them, and trained staff to apply those procedures." },

    { t:"IOSA", full:"IATA Operational Safety Audit", cat:"regulatory",
      d:"An internationally recognised airline safety audit programme. Not a regulatory requirement, but a condition of IATA membership and frequently of interline and codeshare relationships.",
      why:"IOSA-registered carriers show materially better accident rates than non-registered ones. Commercial partners often treat it as a gate long before a regulator would.",
      see:["ISAGO"] },

    { t:"ISAGO", full:"IATA Safety Audit for Ground Operations", cat:"regulatory",
      d:"The equivalent audit programme for ground handling providers.",
      why:"Airline customers audit ground handlers to ISAGO. Plan for it even though no regulator requires it — it decides which contracts you can win.",
      see:["IOSA"] },

    { t:"Surveillance", full:"", cat:"regulatory",
      d:"The Authority's ongoing oversight of a certificate holder — audits, inspections, reporting obligations and change notifications.",
      why:"The surveillance clock starts the day the certificate is issued, not a year later. Ventures that treat certification as the finish line meet their first audit unprepared." },

    { t:"Legal Notice", full:"L.N.", cat:"regulatory",
      d:"The instrument number under which subsidiary legislation is gazetted in Kenya.",
      why:"Kenya's 2025 civil aviation regulations were gazetted through 2026, so a regulation titled \"…Regulations, 2025\" carries a 2026 Legal Notice number. Cite both, always — quoting only one is how applications end up referencing a regulation that does not exist.",
      see:["KCARs","Kenya Gazette"] },

    { t:"Advisory Circular", full:"AC", cat:"regulatory",
      d:"Guidance published by the Authority on an acceptable means of compliance. Not law, but the working document that shows what the Authority expects to see.",
      why:"Regulations tell you what must be achieved; the AC tells you what a submission that satisfies it actually looks like. Ignoring ACs produces technically compliant submissions that still attract findings." },

    /* ---------------- ROLES & POSTHOLDERS ---------------- */
    { t:"Accountable Manager", full:"", cat:"roles", cite:"aoc",
      d:"The individual with corporate authority and financial control over the operation, personally answerable to the Authority for compliance. The post is non-delegable.",
      why:"The Authority accepts the person, not the job title. Changing who holds it triggers re-approval, which makes it a real governance dependency — codify the post's statutory authority in a board resolution so safety decisions cannot be overridden by commercial vote.",
      see:["Postholder","Nominated Person"] },

    { t:"Postholder", full:"", cat:"roles",
      d:"A named manager whose appointment the Authority must accept before the organisation can be certificated — typically flight operations, training, maintenance, quality, safety and security.",
      why:"Certification does not proceed on a vacant postholder position. Every named post should also have a documented deputy: an uncovered post becomes an operational stop the moment that person is unavailable.",
      see:["Accountable Manager","Deputy","Single Point of Failure"] },

    { t:"Nominated Person", full:"", cat:"roles",
      d:"An alternative term for a postholder in some regulatory frameworks — an individual nominated to the Authority for a specific area of responsibility.",
      see:["Postholder"] },

    { t:"Head of Training", full:"HT", cat:"roles", cite:"acAto001",
      d:"The postholder personally responsible to the Authority for training quality, instructor standardisation, approved-course management and the technical content of the training manual.",
      why:"Acceptance requires evidence of course management and training integration, not only instructional hours — a strong instructor is not automatically an acceptable Head of Training. The HT typically attends a personal interview with the Authority.",
      see:["CFI","ATO"] },

    { t:"CFI", full:"Chief Flight Instructor", cat:"roles",
      d:"The postholder responsible for the conduct and standardisation of flight instruction within an ATO.",
      why:"May be combined with the Head of Training at single-site scale — recognised practice, but evidence the course-management capability separately, not just the flying.",
      see:["Head of Training"] },

    { t:"Quality Manager", full:"", cat:"roles", cite:"amo",
      d:"The postholder responsible for the independent audit programme and corrective-action tracking.",
      why:"Independence from production is the point and it is tested. A Quality Manager reporting to the person whose output they audit will not be accepted.",
      see:["Postholder"] },

    { t:"Safety Manager", full:"", cat:"roles", cite:"annex19",
      d:"The postholder responsible for the day-to-day operation of the SMS — hazard identification, risk management and safety assurance.",
      why:"Distinct from the Accountable Manager, who owns the safety outcome. The Safety Manager runs the system; the Accountable Manager answers for it.",
      see:["SMS","Accountable Manager"] },

    { t:"Certifying Staff", full:"", cat:"roles", cite:"amo",
      d:"Individuals authorised to issue a certificate of release to service after maintenance, authorised individually against the capability list and aircraft type.",
      see:["AMO","Release to Service"] },

    { t:"Release to Service", full:"CRS", cat:"roles",
      d:"The certification that maintenance has been completed correctly and the aircraft or component is fit to return to operation.",
      see:["Certifying Staff"] },

    { t:"Deputy", full:"", cat:"roles",
      d:"A named alternate for a postholder, documented in the relevant manual so the arrangement is visible to the Authority at surveillance.",
      why:"Not always mandated, but a key post with no named cover is both a continuity risk and a certification risk.",
      see:["Postholder","Single Point of Failure"] },

    { t:"Single Point of Failure", full:"SPOF", cat:"roles",
      d:"A named post held by one person with no documented deputy, so that person's unavailability stops the activity.",
      why:"Where the post is one the Authority accepts personally — an Accountable Manager or Head of Training — an unplanned departure can trigger re-approval of the whole organisation, not just a recruitment exercise.",
      see:["Deputy","Postholder"] },

    { t:"Remote Pilot", full:"", cat:"roles", cite:"uas",
      d:"The person manipulating the controls of, or otherwise responsible for, an unmanned aircraft during flight.",
      see:["BVLOS","UAS"] },

    /* ---------------- CAPITAL & FINANCE ---------------- */
    { t:"CAPEX", full:"Capital Expenditure", cat:"finance",
      d:"Spending on assets that will be used over multiple years — aircraft deposits, ground equipment, hangar fit-out, simulators — as opposed to running costs.",
      why:"In a greenfield model the distinction matters because lenders size senior debt against fixed CAPEX, not against working capital.",
      see:["Working Capital","Advance Rate"] },

    { t:"Working Capital", full:"", cat:"finance",
      d:"The cash needed to fund operations before revenue covers costs — salaries, fuel, lease payments, insurance — usually modelled as a number of months.",
      why:"The line that kills first-time ventures. Certification runs on a fixed clock and burns cash the whole way, with no revenue against it. Under-provisioning here is the most common reason a funded venture still fails.",
      see:["CAPEX","Runway"] },

    { t:"Runway", full:"", cat:"finance",
      d:"How long the venture can continue at its current burn rate before it runs out of money.",
      why:"For a pre-certification venture the relevant comparison is runway against certification lead time. If the lead band is 12–24 months and you have funded 14, you have funded the optimistic case only.",
      see:["Working Capital"] },

    { t:"Capital Stack", full:"", cat:"finance",
      d:"The layered composition of funding — senior debt, subordinated debt, grant, and equity — ordered by claim priority in an enforcement.",
      why:"Priority is the whole point of the word \"stack\". Senior debt is paid first and equity last, which is why the cost of each layer differs so sharply.",
      see:["Senior Debt","Subordinated Debt","Equity"] },

    { t:"Senior Debt", full:"", cat:"finance",
      d:"Borrowing that ranks first for repayment and usually carries security over assets. The cheapest external capital, and the most conditional.",
      see:["Capital Stack","Covenant","Security"] },

    { t:"Subordinated Debt", full:"Sub-debt", cat:"finance",
      d:"Borrowing that ranks behind senior debt in an enforcement, and therefore prices higher.",
      why:"Shareholder loans are often intended to count as equity for covenant purposes. If so, that treatment belongs in an intercreditor deed — a side letter is disputable exactly when it matters.",
      see:["Intercreditor Deed","Capital Stack"] },

    { t:"Mezzanine", full:"", cat:"finance",
      d:"Capital sitting between senior debt and equity in priority, often with an equity conversion or warrant attached.",
      see:["Capital Stack","Subordinated Debt"] },

    { t:"Equity", full:"", cat:"finance",
      d:"Ownership capital. Last in an enforcement, unlimited on the upside, and the layer that carries control.",
      see:["Capital Stack","Look-Through"] },

    { t:"DSCR", full:"Debt Service Coverage Ratio", cat:"finance",
      d:"Cash available for debt service divided by the debt service due in the same period. A DSCR of 1.00× means the operation exactly covers its debt payments and nothing more.",
      why:"Lenders set a covenant floor — commonly around 1.20–1.35× for infrastructure-like assets — and breaching it can trigger a lock-up or a default. A model that only just clears 1.00× at base case has no room for the first bad quarter.",
      see:["Covenant","Debt Service","EBITDA"] },

    { t:"Debt Service", full:"", cat:"finance",
      d:"The principal and interest payable in a period. A level-payment (amortising) facility keeps this constant across the term.",
      why:"Interest-only periods flatter early DSCR and then step up. Test the ratio at the point the amortisation starts, not at drawdown.",
      see:["DSCR","Amortisation"] },

    { t:"Amortisation", full:"", cat:"finance",
      d:"The repayment of principal over the life of a facility, as opposed to a bullet repayment at maturity.",
      see:["Debt Service"] },

    { t:"Covenant", full:"", cat:"finance",
      d:"A contractual undertaking in a facility agreement — financial (maintain a DSCR floor), or non-financial (no new debt without consent).",
      why:"A new-debt veto set at a low threshold can block the very expansion round the structure was built to enable. Carve out development-finance facilities and refinancing of the senior facility.",
      see:["DSCR","Dividend Lock-up"] },

    { t:"Advance Rate", full:"LTV", cat:"finance",
      d:"The proportion of an asset's value a lender will finance — expressed as loan-to-value or as a percentage of fixed CAPEX.",
      why:"If your model assumes more debt than the advance rate supports, the facility will be cut at credit committee and the shortfall lands on equity. Better to discover that in a spreadsheet than at signing.",
      see:["Senior Debt","CAPEX"] },

    { t:"EBITDA", full:"Earnings Before Interest, Tax, Depreciation and Amortisation", cat:"finance",
      d:"A proxy for operating cash generation, used because it is comparable across differently financed and differently taxed businesses.",
      why:"It is a proxy, not cash. It ignores maintenance reserves, tax and reinvestment — all of which are real and large in aviation. Payback measured on EBITDA is a floor, never a forecast.",
      see:["DSCR","Payback"] },

    { t:"Payback", full:"", cat:"finance",
      d:"How long the venture takes to return its invested capital, commonly measured against EBITDA.",
      see:["EBITDA"] },

    { t:"Break-even", full:"", cat:"finance",
      d:"The level of revenue at which the operation covers a defined obligation — total costs, debt service, or a covenant floor.",
      why:"Be explicit about which. \"Break-even\" against operating costs and break-even against a 1.25× covenant are very different revenue numbers.",
      see:["DSCR","Covenant"] },

    { t:"Funding Gap", full:"", cat:"finance",
      d:"The shortfall between the total capital requirement and the funding actually committed.",
      why:"A gap must close before a Schedule of Events is agreed. Starting certification against an unfunded plan converts a financing problem into a regulatory one." },

    { t:"Contingency", full:"", cat:"finance",
      d:"A deliberate allowance above the modelled capital requirement, for a first-time build commonly 10–15% of fixed CAPEX.",
      why:"Not padding. A greenfield build has no historical cost base to estimate from, and the estimate is being made by the party most motivated to be optimistic." },

    { t:"Security", full:"", cat:"finance",
      d:"Rights over assets granted to a lender, enforceable on default — mortgages over aircraft, charges over shares or accounts.",
      see:["Security Trustee","Senior Debt"] },

    { t:"Dividend Lock-up", full:"", cat:"finance",
      d:"A contractual bar on distributions to shareholders while defined conditions are unmet, typically a DSCR test.",
      why:"Also called a dividend blocker. It protects debt service ahead of shareholder return, and in a three-tier structure it usually sits at the SPV.",
      see:["SPV","Covenant"] },

    /* ---------------- CORPORATE STRUCTURE ---------------- */
    { t:"HoldCo", full:"Holding Company", cat:"corporate",
      d:"The entity that holds shares in the operating business, where shareholding, governance and future fundraising sit.",
      why:"Admitting a new investor at HoldCo leaves the certificate untouched. Doing it at OpCo can trigger a change-of-control notification to the Authority.",
      see:["OpCo","SPV","Look-Through"] },

    { t:"OpCo", full:"Operating Company", cat:"corporate",
      d:"The entity that holds the certificate, employs the staff and runs the operation.",
      why:"This is the entity the Authority certificates, so it is the entity the ownership-and-control test applies to — no matter how the chain above it is arranged.",
      see:["HoldCo","Ownership and Control"] },

    { t:"SPV", full:"Special Purpose Vehicle", cat:"corporate",
      d:"An entity created for a defined purpose — typically as the borrower, so that lender covenants, security and distribution controls live in one ring-fenced place.",
      why:"The clean lender interface is the reason it exists. It also lets enforcement be insulated from the shareholder relationship, which matters most when the lender is also a shareholder.",
      see:["HoldCo","Dividend Lock-up","Security Trustee"] },

    { t:"Look-Through", full:"Effective Interest", cat:"corporate",
      d:"The economic interest a party really holds once every layer of the ownership chain is multiplied out — as opposed to what the immediate share register shows.",
      why:"A party appearing both directly at OpCo and through the chain has both paths summed. That is the number a regulator reconstructs, and the one applicants most often get wrong by reading only the OpCo register.",
      see:["Ownership and Control","Beneficial Ownership"] },

    { t:"Ownership and Control", full:"", cat:"corporate", cite:"airsvc",
      d:"The test, common in air-service licensing, requiring substantial ownership and effective control by nationals of the licensing state.",
      why:"A structure can satisfy company law and still fail the aviation test. And \"effective control\" is not only economics — voting rights, board composition and veto rights all count. Confirm how the Authority measures it before you incorporate.",
      see:["Look-Through","Air Service Licence"] },

    { t:"Beneficial Ownership", full:"", cat:"corporate",
      d:"The natural persons who ultimately own or control an entity, disclosed on a register regardless of how many corporate layers sit between.",
      why:"Adding offshore layers does not remove the disclosure obligation; it usually complicates it.",
      see:["Look-Through","CR12"] },

    { t:"Substance", full:"Economic Substance", cat:"corporate",
      d:"The requirement that an entity claiming a jurisdiction's tax treatment genuinely operates there — resident directors, local board meetings, a local bank account, audited local accounts.",
      why:"An offshore holding entity that fails substance tests loses its preferential rate and may lose treaty access entirely. Budget it from incorporation, not as a retrofit — it is a recurring annual cost per entity, not a one-off.",
      see:["Double Tax Agreement","HoldCo"] },

    { t:"Double Tax Agreement", full:"DTA", cat:"corporate",
      d:"A treaty allocating taxing rights between two states, often reducing withholding on dividends, interest and royalties.",
      why:"Treaty networks change and individual treaties get invalidated. Build the structure so it works on domestic law alone and treat any treaty benefit as upside.",
      see:["Substance"] },

    { t:"Intercreditor Deed", full:"", cat:"corporate",
      d:"The agreement between creditors setting out ranking, enforcement rights and how shareholder loans are treated relative to senior debt.",
      why:"If shareholder loans are to count as equity for covenant purposes, that belongs here — not in a side letter.",
      see:["Subordinated Debt","Security Trustee"] },

    { t:"Security Trustee", full:"", cat:"corporate",
      d:"An independent party holding security on behalf of creditors and administering enforcement.",
      why:"Best practice wherever a lender also holds equity: without it, the same institution sits on both sides of every waiver, distribution and enforcement decision.",
      see:["Security","Intercreditor Deed"] },

    { t:"ESOP", full:"Employee Share Option Plan", cat:"corporate",
      d:"A formal scheme granting employees rights to acquire shares, with defined vesting and tax treatment.",
      why:"A direct founder-to-executive share transfer is not an option scheme and the tax treatment differs accordingly. Name it correctly and take advice on the charge point before executing." },

    { t:"CR12", full:"", cat:"corporate",
      d:"The official extract from Kenya's Registrar of Companies confirming an entity's shareholders and directors as recorded.",
      why:"Requested at pre-application. It shows the immediate register only — the Authority will still reconstruct the chain above it.",
      see:["Beneficial Ownership","Look-Through"] },

    /* ---------------- OPERATIONS & PERFORMANCE ---------------- */
    { t:"ASK", full:"Available Seat Kilometre", cat:"ops",
      d:"One seat flown one kilometre. The standard measure of passenger capacity produced.",
      see:["RPK","CASK","Load Factor"] },

    { t:"RPK", full:"Revenue Passenger Kilometre", cat:"ops",
      d:"One paying passenger flown one kilometre. The standard measure of traffic carried.",
      see:["ASK","Load Factor"] },

    { t:"Load Factor", full:"", cat:"ops",
      d:"RPK divided by ASK — the proportion of capacity actually sold.",
      why:"A high load factor is not automatically good. It can mean capacity is under-priced; read it alongside yield, never alone.",
      see:["ASK","RPK","Yield"] },

    { t:"CASK", full:"Cost per Available Seat Kilometre", cat:"ops",
      d:"Total operating cost divided by ASK — the unit cost of producing capacity.",
      why:"Only comparable between carriers of similar stage length and fleet type. African carriers run roughly double the industry average unit cost, which is the structural problem behind the region's thin margins.",
      see:["RASK","ASK","Stage Length"] },

    { t:"RASK", full:"Revenue per Available Seat Kilometre", cat:"ops",
      d:"Total operating revenue divided by ASK — the unit revenue earned on capacity produced.",
      why:"RASK minus CASK is the unit margin. That single subtraction is the clearest one-line test of whether a network is viable.",
      see:["CASK","Yield"] },

    { t:"Yield", full:"", cat:"ops",
      d:"Revenue per RPK — the average fare per passenger-kilometre.",
      see:["RASK","Load Factor"] },

    { t:"Stage Length", full:"", cat:"ops",
      d:"The average distance flown per flight across a network or fleet, usually quoted in kilometres and weighted by departures.",
      why:"Unit costs fall as stage length rises, because fixed per-departure costs spread over more kilometres. Comparing CASK across very different stage lengths is meaningless without adjustment.",
      see:["CASK"] },

    { t:"ACMI", full:"Aircraft, Crew, Maintenance and Insurance", cat:"ops",
      d:"A wet-lease arrangement where the lessor provides the aircraft with crew, maintenance and insurance, and the lessee carries the commercial risk.",
      see:["Dry Lease"] },

    { t:"Dry Lease", full:"", cat:"ops",
      d:"A lease of the aircraft alone; the lessee provides crew, maintenance and insurance and operates it on its own certificate.",
      see:["ACMI"] },

    { t:"OTP", full:"On-Time Performance", cat:"ops",
      d:"The proportion of departures or arrivals within a defined tolerance of schedule, most commonly 15 minutes.",
      why:"Always check which measure is quoted. Departure OTP and arrival OTP differ, and both differ from completion rate.",
      see:["Dispatch Reliability"] },

    { t:"Dispatch Reliability", full:"", cat:"ops",
      d:"The proportion of flights departing without a technical delay or cancellation beyond a threshold.",
      why:"A technical measure, distinct from OTP, which also absorbs weather, ATC and ground causes.",
      see:["OTP","MEL"] },

    { t:"IROPS", full:"Irregular Operations", cat:"ops",
      d:"Disruption to the planned operation — weather, technical, ATC or crew — and the process of recovering the schedule.",
      why:"Recovery decisions are cost decisions. An OCC that recovers the schedule without a cost lens routinely spends more than the disruption was worth.",
      see:["OCC"] },

    { t:"OCC", full:"Operations Control Centre", cat:"ops",
      d:"The function that monitors and controls the daily operation and manages disruption.",
      see:["IROPS"] },

    { t:"Turnaround", full:"Turn Time", cat:"ops",
      d:"The elapsed time from arrival on blocks to departure off blocks.",
      why:"On short sectors, turn time is a fleet-productivity lever: shaving minutes can add a rotation per aircraft per day without buying an aircraft.",
      see:["Utilisation"] },

    { t:"Utilisation", full:"", cat:"ops",
      d:"Block hours flown per aircraft per day — the productive time an airframe earns, measured from off-blocks to on-blocks rather than wheels-up to wheels-down.",
      why:"Ownership cost is largely fixed per aircraft, so utilisation is the denominator under most of the unit-cost equation.",
      see:["Turnaround","CASK"] },

    { t:"VLOS", full:"Visual Line of Sight", cat:"ops", cite:"uas",
      d:"Unmanned operations conducted within the remote pilot's unaided visual range of the aircraft.",
      see:["BVLOS","UAS"] },

    { t:"BVLOS", full:"Beyond Visual Line of Sight", cat:"ops", cite:"uas",
      d:"Unmanned operations beyond the remote pilot's unaided visual range, requiring substantially greater approval effort and mitigation.",
      why:"The step from VLOS to BVLOS is where drone economics usually become viable and where the regulatory burden steps up sharply. Plan the two as different businesses.",
      see:["VLOS","UAS"] },

    { t:"UAS", full:"Unmanned Aircraft System", cat:"ops", cite:"uas",
      d:"The unmanned aircraft together with its control station, command-and-control links and supporting elements.",
      see:["BVLOS","Remote Pilot","UTO"] },

    { t:"UTO", full:"Unmanned Training Organisation", cat:"ops", cite:"uas",
      d:"An organisation approved to train remote pilots.",
      see:["UAS","ATO"] },

    { t:"GSE", full:"Ground Support Equipment", cat:"ops",
      d:"Vehicles and equipment used to service aircraft on the ground — steps, loaders, tugs, ground power, de-icing.",
      why:"The dominant capital line for a ramp-handling business, and a recurring maintenance obligation that thin models routinely omit." },

    { t:"FBO", full:"Fixed Base Operator", cat:"ops",
      d:"A facility providing handling, fuelling and passenger services to business and general aviation at an airport.",
      why:"Economically a property play with a service wrapper. Concession fees and aerodrome charges are the recurring line that decides viability." },

    /* ---------------- KENYA & THE REGION ---------------- */
    { t:"KCAA", full:"Kenya Civil Aviation Authority", cat:"kenya", cite:"act",
      d:"Kenya's civil aviation regulator, responsible for certification, licensing and safety oversight under the Civil Aviation Act.",
      why:"JK & Associates is not affiliated with or endorsed by KCAA, and nothing on this platform is issued or approved by it." },

    { t:"KCARs", full:"Kenya Civil Aviation Regulations", cat:"kenya",
      d:"The subsidiary legislation made under the Civil Aviation Act, covering operations, licensing, airworthiness, aerodromes, air traffic services and more.",
      why:"The 2025 set was gazetted through 2026 — always cite the title year and the Legal Notice number together.",
      see:["Legal Notice","Kenya Gazette"] },

    { t:"Kenya Gazette", full:"", cat:"kenya",
      d:"The official government publication in which legislation, including Legal Notices, is published and takes effect.",
      see:["Legal Notice","KCARs"] },

    { t:"ODPC", full:"Office of the Data Protection Commissioner", cat:"kenya",
      d:"Kenya's data-protection regulator under the Data Protection Act, 2019, responsible for registration of controllers and processors and for complaints.",
      why:"Relevant to any aviation venture handling passenger, crew or — for drone operators — imagery data.",
      see:["Data Protection Act"] },

    { t:"Data Protection Act", full:"DPA 2019", cat:"kenya",
      d:"Kenya's data-protection statute, setting out lawful bases for processing, data-subject rights and controller obligations.",
      see:["ODPC"] },

    { t:"NEMA", full:"National Environment Management Authority", cat:"kenya",
      d:"Kenya's environmental regulator, whose approval is required for projects needing an environmental and social impact assessment.",
      why:"For an aerodrome project the NEMA track frequently runs longer than the aviation certification track. Start it first, not second." },

    { t:"KoTDA", full:"Konza Technopolis Development Authority", cat:"kenya",
      d:"The authority developing and administering Konza Technopolis, including zoning, land allocation and development approvals within it.",
      see:["SEZ"] },

    { t:"SEZ", full:"Special Economic Zone", cat:"kenya",
      d:"A designated zone offering a distinct fiscal and regulatory regime to licensed enterprises operating within it.",
      why:"An SEZ licence is its own approval track, parallel to and independent of aviation certification. Sequence the two deliberately — neither authority will wait for the other.",
      see:["KoTDA"] },

    { t:"SAATM", full:"Single African Air Transport Market", cat:"kenya",
      d:"The African Union initiative to liberalise intra-African air services, implementing the Yamoussoukro Decision.",
      why:"It has opened more than 110 new intra-African routes, including fifth-freedom services. Demand access is not the constraint on African aviation; cost and execution are.",
      see:["AFRAA","Fifth Freedom"] },

    { t:"Fifth Freedom", full:"", cat:"kenya",
      d:"The right to carry traffic between two foreign states on a service originating or terminating in the carrier's own state.",
      see:["SAATM"] },

    { t:"AFRAA", full:"African Airlines Association", cat:"kenya",
      d:"The trade association of African carriers, and a primary source of regional traffic, cost and performance data.",
      see:["SAATM"] },

    { t:"AFCAC", full:"African Civil Aviation Commission", cat:"kenya",
      d:"The specialised agency of the African Union for civil aviation, and the executing agency for SAATM.",
      see:["SAATM"] },

    { t:"ICAO", full:"International Civil Aviation Organization", cat:"kenya",
      d:"The United Nations agency setting international standards and recommended practices for civil aviation, published as Annexes to the Chicago Convention.",
      why:"National regulations implement ICAO Annexes. Where a national instrument is silent or unclear, the Annex and its guidance material usually indicate what the Authority expects.",
      see:["SMS"] }
  ],

  /* helpers ------------------------------------------------- */
  byCat(catId) { return this.terms.filter(t => t.cat === catId); },
  find(term) {
    const k = String(term || "").toLowerCase();
    return this.terms.find(t => t.t.toLowerCase() === k) || null;
  },
  /* Case-insensitive contains across term, expansion and definition —
     someone who half-remembers "the ratio lenders test" should find DSCR. */
  search(q) {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return this.terms;
    return this.terms.filter(t =>
      t.t.toLowerCase().includes(s) ||
      (t.full || "").toLowerCase().includes(s) ||
      t.d.toLowerCase().includes(s) ||
      (t.why || "").toLowerCase().includes(s));
  },
  sorted() {
    return this.terms.slice().sort((a, b) => a.t.localeCompare(b.t, "en", { sensitivity: "base" }));
  }
};

if (typeof window !== "undefined") window.JKG = JKG;
if (typeof module !== "undefined" && module.exports) module.exports = { JKG };
