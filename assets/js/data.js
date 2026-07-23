/* ============================================================
   DN CONSULTANCY — Airline Health Scorecard (Tool A1)
   Data model: 8 domains × 5 questions = 40, weighted health index.
   All scoring is client-side. Each option carries a 0–4 score
   (0 = absent, 4 = best-practice). Domain % = avg(scores)/4*100.
   Health index = Σ(domain% × weight).
   ============================================================ */

const DN = {
  brand: {
    name: "DN Consultancy",
    tagline: "Shaping Africa's Future, Together.",
    email: "info@aviationhubkenya.org",
    location: "Nairobi, Kenya",
    version: "v2.0 — Strategic Diagnostic & Point Solutions"
  },

  // Soft "DN Engagement Key" gate for Toolboxes B/C/D (marketing gate, not security).
  engagementKey: "DN-ENGAGE-2026",

  // Partner white-label registry. Empty by default — this is a DN
  // Consultancy product. To co-brand for a real partner, add an entry
  // keyed by the ?partner= value (matched case-insensitively), e.g.:
  //   EXAMPLE: { label: "Example Assoc.", accent: "#0E6B3A", accentDeep: "#0a4f2b",
  //              cobrand: "Powered by DN Consultancy, in collaboration with Example Assoc.",
  //              logo: "assets/partner-example.png" }
  // Then whitelist their domain in _headers (frame-ancestors) before go-live.
  partners: {},

  // 5-point maturity scale fallback (when a question reuses generic anchors)
  scaleGeneric: [
    "No capability / not in place",
    "Basic / informal",
    "Developing / partially in place",
    "Strong / structured",
    "Best-practice / continuously improving"
  ],

  // Pre-diagnostic calibration options
  calibration: {
    fleetTypes: ["Turboprop", "Regional Jet", "Narrowbody", "Mixed Fleet"],
    operatingModels: ["Scheduled Regional", "ACMI & Charter", "Flag Carrier", "Cargo"]
  },

  // Dynamic weighting matrix adjustment based on fleet type & operating model
  getAdjustedWeights(fleetType, opModel) {
    const base = { safety: 18, ops: 14, fleet: 12, cost: 14, revenue: 13, commercial: 10, people: 9, finance: 10 };
    if (!fleetType && !opModel) return base;

    const adj = { ...base };

    if (opModel === "Cargo") {
      adj.ops += 3; adj.cost += 3; adj.safety += 2;
      adj.commercial = Math.max(2, adj.commercial - 4);
      adj.revenue = Math.max(3, adj.revenue - 4);
    } else if (opModel === "ACMI & Charter") {
      adj.fleet += 3; adj.ops += 3; adj.safety += 2;
      adj.commercial = Math.max(2, adj.commercial - 4);
      adj.revenue = Math.max(3, adj.revenue - 4);
    } else if (opModel === "Flag Carrier") {
      adj.revenue += 2; adj.commercial += 2; adj.finance += 2;
      adj.cost = Math.max(8, adj.cost - 2);
      adj.ops = Math.max(10, adj.ops - 2);
      adj.fleet = Math.max(8, adj.fleet - 2);
    }

    if (fleetType === "Turboprop") {
      adj.cost += 2; adj.ops += 1; adj.commercial = Math.max(2, adj.commercial - 2); adj.fleet = Math.max(8, adj.fleet - 1);
    } else if (fleetType === "Narrowbody") {
      adj.revenue += 2; adj.fleet += 1; adj.cost = Math.max(8, adj.cost - 1); adj.ops = Math.max(10, adj.ops - 2);
    } else if (fleetType === "Regional Jet") {
      adj.ops += 2; adj.cost += 1; adj.commercial = Math.max(2, adj.commercial - 2); adj.revenue = Math.max(8, adj.revenue - 1);
    } else if (fleetType === "Mixed Fleet") {
      adj.fleet += 2; adj.finance += 1; adj.safety += 1; adj.cost = Math.max(8, adj.cost - 2); adj.revenue = Math.max(8, adj.revenue - 2);
    }

    const sum = Object.values(adj).reduce((a, b) => a + b, 0);
    const result = {};
    let normSum = 0;
    const keys = Object.keys(adj);
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        result[k] = 100 - normSum;
      } else {
        result[k] = Math.round((adj[k] / sum) * 100);
        normSum += result[k];
      }
    });
    return result;
  },

  domains: [
    {
      id: "safety", name: "Safety & SMS Maturity", weight: 18,
      blurb: "ICAO SMS maturity, reporting culture, regulatory standing and safety-data analysis.",
      rxCategory: "Aviation SMS platforms and flight-data analysis (FDM/FOQA) tooling; independent safety-culture and SMS maturity assessment.",
      dnTool: "DN B4 — Safety Culture Maturity Assessment (ICAO SMS 5-level)",
      benchmark: "64 African airlines are IOSA-registered; IOSA carriers average 0.92 vs 1.70 accidents per million flights, and IOSA is a condition of AFRAA & IATA membership.",
      benchmarkSrc: "IATA 2024 Safety Report",
      standard: "IOSA · ICAO SMS (Annex 19)",
      questions: [
        { t: "How mature is your Safety Management System (SMS)?",
          o: ["Deficient — SMS largely on paper only","Reactive — responds after events","Proactive — hazard identification embedded","Predictive — data-driven risk management","Optimising — continuous, fully integrated"] },
        { t: "What is your voluntary safety reporting rate (reports per 100 flight hours)?",
          o: ["< 1 — very low","1–2","2–4","4–6","> 6 (target ≥ 4.0)"] },
        { t: "How would you characterise your reporting / just culture?",
          o: ["Absent","Punitive — staff fear reporting","Mixed / inconsistent","Supportive just culture","Fully embedded, trusted"] },
        { t: "What is the status of your regulatory (KCAA) findings?",
          o: ["Multiple open Level-1 findings","Several open findings","Minor open items only","Closed on time, none overdue","None + proactive self-disclosure"] },
        { t: "How do you analyse safety data (FDM/FOQA, SPIs, trending)?",
          o: ["No structured analysis","Manual, ad hoc","Basic FDM in place","Structured FDM + safety performance indicators","Predictive analytics + closed-loop action"] }
      ]
    },
    {
      id: "ops", name: "Operational Reliability", weight: 14,
      blurb: "On-time performance, dispatch reliability, turnaround and disruption (IROPS) management.",
      rxCategory: "OCC / IROPS management systems, OTP and turn-time analytics, and movement-control tooling.",
      dnTool: "DN B3 — Fleet Utilisation & Turn-Time Audit; C4 — KPI Governance Framework",
      benchmark: "Best-practice on-time performance (departures within 15 min) sits around 80–82%, with technical dispatch reliability ≥ 98.5%.",
      benchmarkSrc: "Industry planning target",
      standard: "IATA GADM operational data",
      questions: [
        { t: "What is your on-time performance (departures within 15 min)?",
          o: ["< 65%","65–72%","72–78%","78–82%","≥ 82% (DN target)"] },
        { t: "What is your technical dispatch reliability?",
          o: ["< 95%","95–96.5%","96.5–98%","98–98.5%","≥ 98.5% (DN target)"] },
        { t: "How is aircraft turnaround managed?",
          o: ["No standard times","Informal","Standard turn times defined","Actively monitored vs target","Optimised + continuously improved"] },
        { t: "What is your OCC / IROPS disruption-handling capability?",
          o: ["None","Reactive, manual","Basic OCC desk","Structured IROPS playbook","Integrated, cost-aware OCC"] },
        { t: "How mature is MEL / defect management?",
          o: ["Ad hoc","Manual log","Structured MEL process","Tracked with trend analysis","Linked to predictive maintenance"] }
      ]
    },
    {
      id: "fleet", name: "Fleet & Network Planning", weight: 12,
      blurb: "Aircraft utilisation, route economics, fleet-network fit and planning horizon.",
      rxCategory: "Network and schedule planning tools and route-profitability / connectivity optimisers.",
      dnTool: "DN B1 — Route Profitability Diagnostic; D2 — Airport Viability; D3 — Codeshare Mapper",
      benchmark: "AFRAA members flew 209bn ASKs and 144.7bn RPKs in 2024, with traffic up 13.2% year-on-year — capacity is growing, so fleet-network fit is decisive.",
      benchmarkSrc: "AFRAA Q4 2024 report",
      standard: "Network & fleet-planning best practice",
      questions: [
        { t: "What is your average aircraft utilisation (block hours per day)?",
          o: ["< 5","5–6.5","6.5–7.5","7.5–8.5","≥ 8.5 (DN target)"] },
        { t: "How rigorously do you assess route profitability?",
          o: ["Not assessed","Revenue only","Basic route P&L","Route P&L with break-even load factor","Full contribution + network value"] },
        { t: "How well does your fleet fit your network (right-gauging)?",
          o: ["Severe mismatch","Partial fit","Adequate","Good fit","Optimised right-gauge by route"] },
        { t: "How is the schedule built / optimised?",
          o: ["Manual, fixed","Seasonal manual","Tool-assisted","Connectivity-optimised","Data-driven, dynamic"] },
        { t: "What is your fleet-planning horizon?",
          o: ["None","< 1 year","1–2 years","3–5 year plan","Rolling 5-year with scenarios"] }
      ]
    },
    {
      id: "cost", name: "Cost & Fuel Efficiency", weight: 14,
      blurb: "Unit cost (CASK) position, fuel as a share of cost, procurement and cost discipline.",
      rxCategory: "Fuel-efficiency and tankering tools, MRO/maintenance cost systems, and procurement/cost-analytics platforms.",
      dnTool: "DN A2 — CASK Benchmarking Calculator; D4 — Fuel Procurement Optimisation",
      benchmark: "Fuel is ~40% of operating cost for African carriers vs ~25% globally, and African unit costs run close to double the rest of the world.",
      benchmarkSrc: "IATA, Cost Disadvantage of African Airlines, 2025",
      standard: "IATA Airline Cost Management Group (ACMG)",
      fuelLink: true,
      caskLink: true,
      questions: [
        { t: "Where does your unit cost (CASK, USD per seat-km) sit?",
          o: ["> 0.13","0.11–0.13","0.09–0.11","0.08–0.09","< 0.08 (DN target ≤ 0.09)"] },
        { t: "What share of operating cost is fuel?",
          o: ["> 38%","34–38%","32–34%","30–32%","< 30% (DN target ≤ 32%)"] },
        { t: "How developed is your fuel-efficiency programme?",
          o: ["None","Awareness only","Some initiatives","Structured fuel programme","Continuous (tankering, APU, flight-path)"] },
        { t: "How do you procure fuel and major contracts?",
          o: ["Spot only","Single supplier","Multi-supplier","Tendered + benchmarked","Strategic with hedging triggers"] },
        { t: "How disciplined is cost control?",
          o: ["No budget tracking","Annual budget only","Monthly variance review","Unit-cost KPIs tracked","Zero-based + continuous improvement"] }
      ]
    },
    {
      id: "revenue", name: "Revenue & Yield Management", weight: 13,
      blurb: "Load factor, RM capability, pricing discipline, demand forecasting and yield vs market.",
      rxCategory: "Revenue management systems with demand forecasting and dynamic-pricing capability.",
      dnTool: "DN B5 — Revenue Mix Diagnostic; B1 — Route Profitability",
      benchmark: "African airlines averaged a 74.5% passenger load factor in 2024 — a regional record, but still the world's lowest, vs ~83.5% globally.",
      benchmarkSrc: "AFRAA / IATA, 2024",
      standard: "IATA revenue benchmarking",
      fuelLink: false,
      questions: [
        { t: "What is your passenger load factor?",
          o: ["< 60%","60–68%","68–71%","71–75%","≥ 75% (DN target ≥ 72%)"] },
        { t: "What revenue-management capability do you have?",
          o: ["None","Manual","Basic class control","RMS with forecasting","Advanced with dynamic pricing"] },
        { t: "How disciplined is your pricing?",
          o: ["Cost-plus, fixed","Occasional changes","Fare families","Structured fences","Dynamic, data-driven"] },
        { t: "How do you forecast demand?",
          o: ["No forecasting","Historical only","Seasonal","Model-based","ML-assisted, continuous"] },
        { t: "How does your yield compare to market?",
          o: ["Well below","Below market","At market","Above market","Market-leading"] }
      ]
    },
    {
      id: "commercial", name: "Commercial & Ancillary", weight: 10,
      blurb: "Ancillary revenue, distribution mix, loyalty/CRM, cargo and digital experience.",
      rxCategory: "Ancillary merchandising engines, NDC/distribution platforms, loyalty/CRM, and cargo revenue management.",
      dnTool: "DN B5 — Revenue Mix Diagnostic",
      benchmark: "Leading carriers earn $20+ in ancillary revenue per passenger; many African carriers remain in single digits.",
      benchmarkSrc: "Industry range",
      standard: "IATA NDC / airline retailing",
      questions: [
        { t: "What is your ancillary revenue per passenger (USD)?",
          o: ["< 5","5–8","8–12","12–22","≥ 22 (DN target)"] },
        { t: "How developed is your distribution mix?",
          o: ["GSA / manual","Single channel","Web + OTA","Multi-channel","NDC + optimised direct"] },
        { t: "What loyalty / CRM capability exists?",
          o: ["None","Basic","Loyalty programme","Data-driven CRM","Personalised engagement"] },
        { t: "How well is cargo / belly capacity monetised?",
          o: ["Not monetised","Ad hoc","Basic","RMS-managed","Yield-optimised"] },
        { t: "How strong is your brand and digital experience?",
          o: ["Weak","Basic website","Booking flow works","Strong digital","Omnichannel leader"] }
      ]
    },
    {
      id: "people", name: "People & Organisation", weight: 9,
      blurb: "Staffing ratios, turnover, training currency, structure and leadership capacity.",
      rxCategory: "Training-management / LMS systems, competency-based training tools, and workforce-planning solutions.",
      dnTool: "DN A5 — Training Needs Analysis; B2 — Staff Cost Efficiency Analyser",
      benchmark: "Lean, well-run carriers target staff turnover under ~15% and benchmark headcount per aircraft against peer fleets.",
      benchmarkSrc: "Industry planning target",
      standard: "Competency-based training (ICAO/IATA)",
      questions: [
        { t: "How do staffing ratios compare to benchmark (per aircraft)?",
          o: ["Severely off","Off benchmark","Near benchmark","At benchmark","Optimised"] },
        { t: "What is your staff turnover?",
          o: ["> 25%","20–25%","15–20%","10–15%","< 10% (DN target ≤ 15%)"] },
        { t: "How is training currency and needs managed?",
          o: ["Gaps / expired items","Reactive","Tracked","TNA-driven","Competency-based, continuous"] },
        { t: "How clear is org structure and accountability?",
          o: ["Unclear","Functional silos","Defined roles","KPI-linked roles","High-performance culture"] },
        { t: "What is your leadership and change capacity?",
          o: ["Limited","Stretched","Adequate","Strong","Transformation-ready"] }
      ]
    },
    {
      id: "finance", name: "Financial Health & Strategy", weight: 10,
      blurb: "Profitability, liquidity, business planning, board governance and strategic execution.",
      rxCategory: "Financial-planning & analysis (FP&A) and board-reporting / KPI-governance tooling.",
      dnTool: "DN C1 — 90-Day Sprint; C3 — Board Presentation; C4 — KPI Governance; A4 — Operating Model Canvas",
      canvasLink: true,
      benchmark: "African airlines posted a net margin of only ~1% in 2024 — roughly $1.20 profit per passenger — the thinnest of any region.",
      benchmarkSrc: "IATA, 2024",
      standard: "IATA Airline Performance Review (APR)",
      questions: [
        { t: "What is your operating profitability?",
          o: ["Heavy losses","Around break-even","Small profit","Healthy margin","Strong, sustained"] },
        { t: "How is your liquidity / cash position?",
          o: ["Critical","Tight","Adequate","Comfortable","Strong reserves"] },
        { t: "How good is your business plan?",
          o: ["None","Outdated","Annual only","3–5 year with model","Rolling + scenario-tested"] },
        { t: "How strong is board governance and KPI reporting?",
          o: ["Weak","Informal","Monthly reporting","Structured KPI governance","Best-practice board"] },
        { t: "How clear and well-executed is strategy?",
          o: ["No clear strategy","Vague","Defined","Cascaded + tracked","Disciplined execution engine"] }
      ]
    }
  ],

  // RAG thresholds (domain or index %)
  rag(p){ if (p < 45) return "red"; if (p < 65) return "amber"; return "green"; },
  ragLabel(p){ if (p < 45) return "Critical gap"; if (p < 65) return "Needs attention"; return "Strong"; },

  // Full 14-tool catalogue (A free / B,C,D gated)
  toolboxes: [
    { box:"A", locked:false, title:"Entry Diagnostic", tools:[
      {ref:"A1", n:"Airline Health Scorecard", d:"40 questions, 8 domains, weighted health index (this tool)."},
      {ref:"A2", n:"CASK Benchmarking Calculator", d:"Cost efficiency vs African and LCC benchmarks."},
      {ref:"A3", n:"48-Hour Data Request", d:"28-item structured priority data pack."},
      {ref:"A4", n:"Operating Model Canvas", d:"9-panel airline model on one page."},
      {ref:"A5", n:"Training Needs Analysis", d:"Competency-gap assessment, 4 staff groups."} ]},
    { box:"B", locked:true, title:"Deep Diagnostic", tools:[
      {ref:"B1", n:"Route Profitability Diagnostic", d:"Fast P&L with break-even load factor per route."},
      {ref:"B2", n:"Staff Cost Efficiency Analyser", d:"Labour-ratio benchmarking across all staff groups."},
      {ref:"B3", n:"Fleet Utilisation & Turn-Time Audit", d:"Block hours, AOG and turnaround analysis."},
      {ref:"B4", n:"Safety Culture Maturity Assessment", d:"ICAO SMS 5-level scoring framework."},
      {ref:"B5", n:"Revenue Mix Diagnostic", d:"Diversification gap vs IATA Africa benchmarks."} ]},
    { box:"C", locked:true, title:"Recommendations & Delivery", tools:[
      {ref:"C1", n:"90-Day Sprint Template", d:"3 financial targets, 5 ops fixes, 2 commercial initiatives."},
      {ref:"C2", n:"Quick Win Identifier", d:"Impact × effort priority matrix."},
      {ref:"C3", n:"Board Presentation Template", d:"8-slide board-structure findings deck."},
      {ref:"C4", n:"KPI Governance Framework", d:"12-KPI monthly management report."} ]},
    { box:"D", locked:true, title:"Sector-Specific", tools:[
      {ref:"D1", n:"AOC Startup Readiness Checklist", d:"30-item KCAA application tracker."},
      {ref:"D2", n:"African Airport Viability Scorecard", d:"45-criteria Go / No-Go assessment."},
      {ref:"D3", n:"Codeshare & Interline Mapper", d:"Partner evaluation framework."},
      {ref:"D4", n:"Fuel Procurement Optimisation", d:"Tender template + hedge-trigger framework."} ]}
  ],

  benchmarkMeta: {
    asOf: "Q4 2024 – mid-2025",
    sources: [
      "AFRAA Q4 2024 Airline Performance Update",
      "IATA 2024 Safety Report",
      "IATA, Cost Disadvantage of African Airlines (2025)",
      "IATA GADM / ACMG operational and cost data"
    ]
  },

  phases: [
    {days:"Days 1–2", t:"Entry Diagnostic", d:"Health Scorecard, CASK benchmark, Operating Model Canvas, data request. Baseline + hypotheses.",
      tools:["Airline Health Scorecard","CASK Benchmarking Calculator","Operating Model Canvas","48-Hour Data Request"],
      outcome:"A quantified baseline and a shortlist of hypotheses agreed with your leadership team."},
    {days:"Days 3–14", t:"Deep Analysis", d:"Route P&L, staff cost, fleet utilisation, safety maturity, revenue mix — quantified, root-caused.",
      tools:["Route P&L model","Staff cost benchmarks","Fleet utilisation analysis","SMS maturity review"],
      outcome:"Every gap root-caused and sized in currency, not adjectives."},
    {days:"Days 10–14", t:"Prioritisation", d:"Impact × effort matrix. Build the 90-day sprint framework.",
      tools:["Impact × effort matrix","Quick-win register","Sprint charter templates"],
      outcome:"A sequenced 90-day plan your team can actually staff and fund."},
    {days:"Days 14–21", t:"Board Delivery", d:"Board-structure presentation, governance framework, training TNA.",
      tools:["Board presentation pack","Governance framework","Training Needs Analysis"],
      outcome:"Board sign-off with clear owners, budgets and decision rights."},
    {days:"Days 21–90", t:"Sprint Implementation", d:"Weekly check-ins, monthly reviews, results verification, final report.",
      tools:["Weekly sprint reviews","KPI dashboard","Results verification pack"],
      outcome:"Verified results against the baseline — the 3× first-year ROI guarantee is measured here."}
  ]
};

// expose for non-module use
if (typeof window !== "undefined") window.DN = DN;
