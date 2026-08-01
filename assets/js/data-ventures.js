/* ============================================================
   JK & ASSOCIATES — Greenfield / Venture data model (v3.0)

   Powers the "build" track: the KCAA Certification Navigator,
   Venture Builder, Corporate Structure Designer and Organogram
   Planner. Loaded alongside data.js (which carries the operating-
   carrier scorecard).

   ── ON REGULATORY CITATIONS ─────────────────────────────────
   Every citation in this file carries an explicit `status`:

     "verified"  — the instrument and its Legal Notice number were
                   confirmed against the Kenya Law gazette record on
                   the date in CITE_META.verifiedOn.
     "unconfirmed" — the instrument is referenced in KCAA guidance
                   and industry practice, but its gazettement or L.N.
                   number could not be confirmed from public record.

   Unconfirmed citations render with a visible "?" chip and a link
   out to source. This is deliberate: a certification tool that
   quietly asserts a wrong Legal Notice number is worse than one
   that shows its working. Do not promote a citation to "verified"
   without re-checking the gazette.
   ============================================================ */

const JKV = {

  /* ---------------------------------------------------------
     CITATION REGISTRY
     --------------------------------------------------------- */
  CITE_META: {
    verifiedOn: "2026-08-01",
    note: "Kenya's 2025 civil aviation regulations were gazetted through 2026, so a regulation titled \"…Regulations, 2025\" carries a 2026 Legal Notice number. Always cite both.",
    sources: [
      { label: "Kenya Law — civil aviation legal notices", url: "https://new.kenyalaw.org/" },
      { label: "KCAA — published regulations 2025", url: "https://www.kcaa.or.ke/published-regs-2025" },
      { label: "KCAA — advisory circulars & forms", url: "https://www.kcaa.or.ke/legislation-publications/aviation-regulations" }
    ]
  },

  cites: {
    act:      { s:"verified",    ref:"Civil Aviation Act, 2013",  long:"Civil Aviation Act, No. 21 of 2013 (as amended)", url:"https://new.kenyalaw.org/akn/ke/act/2013/21/eng@2024-04-26" },
    aoc:      { s:"verified",    ref:"L.N. 42/2026",  long:"Civil Aviation (Air Operator Certification and Administration) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/42/eng@2026-03-06" },
    amo:      { s:"verified",    ref:"L.N. 20/2026",  long:"Civil Aviation (Approved Maintenance Organization) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/20/eng@2026-03-03" },
    pel:      { s:"verified",    ref:"L.N. 50/2026",  long:"Civil Aviation (Personnel Licensing) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/50/eng@2026-03-25" },
    uas:      { s:"verified",    ref:"L.N. 40/2026",  long:"Civil Aviation (Unmanned Aircraft Systems) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/40/eng@2026-03-06" },
    aerodrome:{ s:"verified",    ref:"L.N. 102/2026", long:"Civil Aviation (Aerodromes Design and Operations) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/102/eng@2026-06-05" },
    ats:      { s:"verified",    ref:"L.N. 30/2026",  long:"Civil Aviation (Air Traffic Services) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/30/eng@2026-03-03" },
    aerialwk: { s:"verified",    ref:"L.N. 44/2026",  long:"Civil Aviation (Aerial Work — General Operations) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/44/eng@2026-03-25" },
    genav:    { s:"verified",    ref:"L.N. 47/2026",  long:"Civil Aviation (Operation of Aircraft — General Aviation — Aeroplanes) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/47/eng@2026-03-25" },
    rota:     { s:"verified",    ref:"L.N. 48/2026",  long:"Civil Aviation (Rules of the Air) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/48/eng@2026-03-25" },
    instr:    { s:"verified",    ref:"L.N. 49/2026",  long:"Civil Aviation (Instruments, Equipment and Flight Documents) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/49/eng@2026-03-25" },
    dgr:      { s:"verified",    ref:"L.N. 51/2026",  long:"Civil Aviation (Safe Transport of Dangerous Goods by Air) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/51/eng@2026-03-25" },
    ais:      { s:"verified",    ref:"L.N. 45/2026",  long:"Civil Aviation (Aeronautical Information Service) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/45/eng@2026-03-25" },
    airsvc:   { s:"verified",    ref:"L.N. 22/2026",  long:"Civil Aviation (Licensing of Air Services) Regulations, 2025 — supersedes the 2018 Regulations (L.N. 167/2018) that this toolkit previously cited", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/22/eng@2026-03-03" },

    // ---- not confirmed against the gazette record ----
    ato:      { s:"verified",    ref:"L.N. 93/2018",  long:"Civil Aviation (Approved Training Organizations) Regulations, 2018 — THE INSTRUMENT CURRENTLY IN FORCE. The 2025 revision is among the instruments KCAA lists as still awaiting Kenya Gazette publication, so plan against this one and AC-ATO 001C. Re-check before submission: when the 2025 Regulations are gazetted they will carry a new Legal Notice number and supersede this.", url:"https://new.kenyalaw.org/akn/ke/act/ln/2018/93/eng@2018-05-04" },
    atoNew:   { s:"unconfirmed", ref:"ATO Regs 2025 (pending)", long:"Civil Aviation (Approved Training Organisations) Regulations, 2025 — listed by KCAA among revised regulations at an advanced stage awaiting Kenya Gazette publication. Not in force at the verification date and carries no Legal Notice number yet.", url:"https://www.kcaa.or.ke/published-regs-2025" },
    sms:      { s:"verified",    ref:"L.N. 32/2026",  long:"Civil Aviation (Safety Management) Regulations — gazetted 3 March 2026 and titled \"…Regulations, 2026\" on the Kenya Law record, unlike its sister instruments which kept a 2025 title. ICAO Annex 19 and Doc 9859 remain the substantive standard behind it.", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/32/eng@2026-03-03" },
    gh:       { s:"unconfirmed", ref:"Ground handling", long:"No dedicated ground-handling instrument was found in the 2025/2026 gazette series. Provision is licensed across the Civil Aviation Act, the Licensing of Air Services Regulations (L.N. 22/2026) and the aerodrome instruments (L.N. 41/2026, L.N. 102/2026). Confirm the applicable licensing route, categories and fee schedule with KCAA in writing before building a compliance matrix.", url:"https://www.kcaa.or.ke/" },

    // ---- found during the August 2026 gazette sweep; previously missing ----
    cat:      { s:"verified",    ref:"L.N. 29/2026",  long:"Civil Aviation (Operation of Aircraft for Commercial Air Transport — Aeroplanes) Regulations, 2025 — the operating rules an AOC holder flies to, distinct from the certification rules in L.N. 42/2026", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/29/eng@2026-03-03" },
    airworth: { s:"verified",    ref:"L.N. 37/2026",  long:"Civil Aviation (Airworthiness) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/37/eng@2026-03-06" },
    security: { s:"verified",    ref:"L.N. 31/2026",  long:"Civil Aviation (Security) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/31/eng@2026-03-03" },
    fatigue:  { s:"verified",    ref:"L.N. 90/2026",  long:"Civil Aviation (Fatigue Management) Regulations, 2025", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/90/eng@2026-05-22" },
    aerocert: { s:"verified",    ref:"L.N. 41/2026",  long:"Civil Aviation (Certification, Licensing and Registration of Aerodromes) Regulations, 2025 — the certification instrument for an aerodrome, distinct from the design and operations standards in L.N. 102/2026", url:"https://new.kenyalaw.org/akn/ke/act/ln/2026/41/eng@2026-03-06" },

    // ---- advisory circulars / guidance (not law, but the working documents) ----
    ac5phase: { s:"verified",    ref:"CAA-O-GEN003C", long:"The Five Phase Certification and Approval Process (KCAA)", url:"https://www.kcaa.or.ke/published-regs-2025" },
    acOps001: { s:"verified",    ref:"CAA-AC-OPS001D", long:"Advisory Circular — Certification of an Air Operator (KCAA)", url:"https://www.kcaa.or.ke/sites/default/files/circulars/CAA-AC-OPS001D%20Cert%20of%20Air%20Operator.pdf" },
    acAws006: { s:"verified",    ref:"CAA-AC-AWS006D", long:"Advisory Circular — Certification of a Domestic/Local Maintenance Organisation (KCAA)", url:"https://www.kcaa.or.ke/sites/default/files/CAA-AC-AWS006D%20Certification%20of%20Domestic-Local%20Maintenance%20Organization.pdf" },
    acAto001: { s:"verified",    ref:"AC-ATO 001C",   long:"Advisory Circular — Certification of an Approved Training Organisation (KCAA)", url:"https://www.kcaa.or.ke/sites/default/files/publication/PEL/AC-ATO%20001C%20%20Certification%20of%20an%20Approved%20Training%20Organisation.pdf" },
    annex19:  { s:"verified",    ref:"ICAO Annex 19", long:"ICAO Annex 19 — Safety Management (with Doc 9859, Safety Management Manual)", url:"https://www.icao.int/" },
    doc9868:  { s:"verified",    ref:"ICAO Doc 9868", long:"ICAO Doc 9868 — Procedures for Air Navigation Services: Training (PANS-TRG)", url:"https://www.icao.int/" }
  },

  /* ---------------------------------------------------------
     THE FIVE PHASES (KCAA CAA-O-GEN003C)
     Common spine; each sector supplies its own items per phase.
     --------------------------------------------------------- */
  phaseSpine: [
    { n:1, id:"pre",   t:"Pre-application",
      d:"Initial enquiry and the pre-application meeting. You establish intent and scope; the Authority establishes whether you understand what you are asking for.",
      auth:"Receives the statement of intent, assigns a certification team, holds the pre-application meeting.",
      gate:"You leave with an agreed scope, the applicable regulations, and a target Schedule of Events." },
    { n:2, id:"formal", t:"Formal Application",
      d:"The formal application package. This is where most African applications stall — not on merit, but on incomplete submissions.",
      auth:"Reviews the submission, assesses its own resource needs, holds the formal application meeting, and issues a letter accepting or rejecting the application.",
      gate:"A written acceptance letter. A rejection here returns you to Phase 1 and burns months of runway." },
    { n:3, id:"docs",  t:"Document Evaluation",
      d:"The Authority evaluates every manual, programme and personnel qualification you submitted. Findings are raised and must be closed.",
      auth:"Evaluates manuals, training programmes and personnel qualifications; raises findings for correction.",
      gate:"All documents accepted and findings closed before any on-site activity is scheduled." },
    { n:4, id:"demo",  t:"Demonstration & Inspection",
      d:"On-site validation. You demonstrate that what the manuals describe is what actually happens — facilities, equipment, people, records and drills.",
      auth:"Conducts on-site inspection and witnesses demonstrations; raises and tracks findings to closure.",
      gate:"Inspection complete with all findings closed. Partial closure does not advance you." },
    { n:5, id:"cert",  t:"Certification",
      d:"Issue of the certificate and its associated operations specifications / scope of approval.",
      auth:"Completes the approval form, prepares and issues the certificate and specifications.",
      gate:"Certificate in hand — and the surveillance clock starts the same day." }
  ],

  /* ---------------------------------------------------------
     SECTORS
     Each sector: identity, applicable citations, required
     postholders, indicative capital model, and per-phase items.
     `items` are keyed by phase id; each item is
       { t: title, d: detail, c: [citation keys], crit: true|false }
     `crit` marks a critical-path item — one that blocks the gate.
     --------------------------------------------------------- */
  sectors: [
    /* ============ 1. AIRLINE / AOC ============ */
    {
      id:"aoc", icon:"✈️", name:"Airline — Air Operator Certificate",
      short:"Airline / AOC",
      blurb:"Scheduled, charter, ACMI or cargo air transport. The AOC plus an Air Service Licence.",
      regLine:"AOC Regs 2025 + Air Service Licence",
      cites:["aoc","cat","airsvc","act","acOps001","sms","airworth","security","fatigue","dgr","instr"],
      leadMonths:[12,24], leadNote:"12–24 months from pre-application to certificate for a first-time applicant with financing already in place.",
      postholders:[
        {r:"Accountable Manager", kcaa:true, note:"Corporate authority and financial control over the operation. Non-delegable."},
        {r:"Head / Director of Flight Operations", kcaa:true},
        {r:"Head of Training", kcaa:true},
        {r:"Head of Maintenance (CAMO / Continuing Airworthiness)", kcaa:true},
        {r:"Quality Manager", kcaa:true},
        {r:"Safety Manager", kcaa:true, note:"SMS accountable function under ICAO Annex 19."},
        {r:"Security Manager", kcaa:true},
        {r:"Chief Pilot / Fleet Manager", kcaa:false},
        {r:"Ground Operations Manager", kcaa:false},
        {r:"Dangerous Goods focal point", kcaa:false}
      ],
      manuals:["Operations Manual Parts A–D","Minimum Equipment List (MEL)","Continuing Airworthiness Management Exposition (CAME)","Maintenance Programme","Safety Management System Manual","Quality Assurance Manual","Security Programme","Dangerous Goods Manual","Training Manual","Emergency Response Plan","Aircraft Flight Manual / Ops Specs"],
      capital:{
        unit:"USD",
        note:"Indicative planning ranges for a 2–3 aircraft regional start-up in East Africa. Aircraft are assumed leased, not purchased — ownership shifts the model entirely.",
        lines:[
          {k:"Aircraft — lease deposits & delivery", lo:900000,  hi:2400000, cat:"capex"},
          {k:"Initial spares & rotables",            lo:400000,  hi:1200000, cat:"capex"},
          {k:"Ground support equipment",             lo:150000,  hi:600000,  cat:"capex"},
          {k:"Certification & regulatory programme", lo:180000,  hi:450000,  cat:"capex"},
          {k:"Manuals, systems & IT",                lo:120000,  hi:400000,  cat:"capex"},
          {k:"Initial crew training & type ratings", lo:250000,  hi:900000,  cat:"capex"},
          {k:"Working capital — 6 months",           lo:1200000, hi:3500000, cat:"wc"}
        ]
      },
      items:{
        pre:[
          {t:"Pre-Application Statement of Intent (PASI)", d:"Declare the intended scope: aircraft types, areas of operation, type of service (scheduled / non-scheduled / cargo).", c:["acOps001"], crit:true},
          {t:"Evidence of legal entity & Kenyan ownership structure", d:"Incorporation certificate, CR12, beneficial-ownership register. Substantial ownership and effective control tests apply.", c:["act","airsvc"], crit:true},
          {t:"Nominated Accountable Manager identified", d:"Named individual with corporate authority and financial control. The Authority assesses the person, not just the post.", c:["aoc"], crit:true},
          {t:"Pre-application meeting held and minuted", d:"Confirm applicable regulations, the certification team, and the shape of the Schedule of Events.", c:["ac5phase"], crit:true},
          {t:"Air Service Licence application lodged", d:"Runs in parallel with the AOC — the AOC alone does not entitle you to sell transport.", c:["airsvc"], crit:true}
        ],
        formal:[
          {t:"Formal application letter + prescribed forms", d:"The single most common cause of rejection is an incomplete or unsigned form set. Check every signature block.", c:["acOps001"], crit:true},
          {t:"Schedule of Events (SOE)", d:"Dated, resourced plan through to certification. The Authority resources its team against this.", c:["ac5phase"], crit:true},
          {t:"Compliance statement / cross-reference matrix", d:"Regulation-by-regulation mapping to where compliance is demonstrated in your manuals.", c:["aoc"], crit:true},
          {t:"Management personnel CVs + qualification evidence", d:"Every nominated postholder, with licences, hours and prior post-holding experience.", c:["aoc","pel"], crit:true},
          {t:"Financial adequacy demonstration", d:"Funding plan showing the operation can be sustained through certification and initial operations without revenue.", c:["aoc","airsvc"], crit:true},
          {t:"Aircraft documents — lease, registration, airworthiness path", d:"Lease agreements, proposed registration marks, and the route to a Certificate of Airworthiness.", c:["aoc"], crit:true},
          {t:"Draft manual set submitted", d:"OM A–D, MEL, CAME, SMS, Quality, Security, DG, Training.", c:["aoc","sms"], crit:true},
          {t:"Written acceptance letter received", d:"THE GATE. Nothing in Phase 3 begins until this letter exists.", c:["ac5phase"], crit:true}
        ],
        docs:[
          {t:"Operations Manual Parts A–D accepted", d:"Findings raised on each part must be closed and re-submitted.", c:["aoc"], crit:true},
          {t:"Training programmes evaluated & approved", d:"Initial, recurrent, conversion, CRM, DG and security training.", c:["aoc","doc9868"], crit:true},
          {t:"SMS manual and safety policy accepted", d:"Hazard identification, risk management, safety assurance, promotion — with named accountabilities.", c:["sms","annex19"], crit:true},
          {t:"Maintenance programme & CAME accepted", d:"Including reliability programme and the maintenance contract chain.", c:["aoc","amo"], crit:true},
          {t:"Security programme accepted", d:"Aligned to the National Civil Aviation Security Programme.", c:["security","act"], crit:false},
          {t:"Personnel qualifications verified", d:"Licences, ratings, medicals and currency for all nominated postholders and initial crew.", c:["pel"], crit:true},
          {t:"Third-party agreements evidenced", d:"Ground handling, maintenance, training, catering, fuel — signed, not draft.", c:["aoc"], crit:false},
          {t:"All Phase 3 findings closed", d:"THE GATE. On-site activity is not scheduled while findings remain open.", c:["ac5phase"], crit:true}
        ],
        demo:[
          {t:"Facilities inspection — offices, OCC, crew, records", d:"The Authority verifies the physical operation matches the manuals.", c:["aoc"], crit:true},
          {t:"Aircraft conformity inspection & C of A issued", d:"Each aircraft on the certificate inspected and registered.", c:["aoc","instr"], crit:true},
          {t:"Proving flights / demonstration flights completed", d:"Flown to the approved schedule, with Authority inspectors aboard.", c:["aoc"], crit:true},
          {t:"Emergency response exercise witnessed", d:"Full activation of the ERP, including the crisis centre and next-of-kin process.", c:["aoc","sms"], crit:true},
          {t:"Records & document control demonstrated", d:"Crew records, tech log, maintenance records, training records — retrievable on demand.", c:["aoc"], crit:false},
          {t:"Dangerous goods & security procedures demonstrated", d:"Acceptance, handling and screening as described in the manuals.", c:["dgr"], crit:false},
          {t:"All Phase 4 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        cert:[
          {t:"Air Operator Certificate issued", d:"With the operations specifications defining exactly what you may do.", c:["aoc"], crit:true},
          {t:"Air Service Licence issued", d:"The commercial authority to sell the service.", c:["airsvc"], crit:true},
          {t:"Operations specifications reviewed and understood", d:"Every limitation, authorisation and special approval on the certificate.", c:["aoc"], crit:true},
          {t:"Continuing surveillance plan agreed", d:"Annual audit cycle, reporting obligations and change-notification duties begin immediately.", c:["aoc"], crit:false},
          {t:"Insurance in force and evidenced", d:"Hull, liability and passenger cover at the levels required.", c:["act"], crit:true}
        ]
      }
    },

    /* ============ 2. ATO / FLIGHT SCHOOL + SIMULATOR ============ */
    {
      id:"ato", icon:"🎓", name:"Approved Training Organisation & Simulator Hub",
      short:"ATO / Training",
      blurb:"Flight school, type-rating or simulator training centre, including FSTD qualification.",
      regLine:"ATO Regs 2018 (L.N. 93/2018) + PEL Regs 2025 (L.N. 50/2026)",
      cites:["ato","atoNew","pel","acAto001","doc9868","sms"],
      leadMonths:[10,20], leadNote:"10–20 months. Device procurement and installation, not paperwork, is usually the binding constraint.",
      warn:"The 2025 ATO Regulations are NOT yet gazetted — KCAA lists them among instruments still awaiting Kenya Gazette publication. The instrument in force is the Civil Aviation (Approved Training Organizations) Regulations, 2018 (L.N. 93/2018), read with AC-ATO 001C. Plan against those, and re-check before submission: gazettement will bring a new Legal Notice number and supersede them.",
      postholders:[
        {r:"Accountable Manager", kcaa:true, note:"Must demonstrate financial adequacy to the Authority. Non-transferable — KCAA accepts the person."},
        {r:"Head of Training (HT)", kcaa:true, note:"Personally responsible to the Authority for training quality, instructor standardisation, approved-course management and manual technical content."},
        {r:"Chief Flight Instructor (CFI)", kcaa:true, note:"May be combined with HT at single-site scale — recognised practice, but evidence the course-management capability, not just instructional hours."},
        {r:"Quality Manager", kcaa:true},
        {r:"Safety Manager", kcaa:true, note:"May be dual-hatted in the first months; plan a dedicated post."},
        {r:"Deputy CFI / Deputy HT", kcaa:false, note:"Not always mandated, but a single-point-of-failure on a KCAA post is a certification and continuity risk. Name a deputy in the manual."},
        {r:"Ground Instructor(s)", kcaa:false},
        {r:"FSTD Technical Manager", kcaa:false, note:"Required in substance once a qualified device is on site."}
      ],
      manuals:["Training Manual","Operations Manual","Training Programmes / Approved Courses","Quality Manual","Safety Management System Manual","FSTD Qualification & Guide per device","Student Records System","Instructor Standardisation Procedures"],
      capital:{
        unit:"USD",
        note:"Anchored on a three-device simulator hub in a Kenyan SEZ. Device pricing dominates: a single FNPT/FTD-class device is a fraction of a full-flight simulator, so confirm the device class before using these ranges.",
        lines:[
          {k:"Training devices (FSTD) & shipping",   lo:1400000, hi:5200000, cat:"capex"},
          {k:"Building fit-out / hangar & classrooms", lo:900000, hi:2600000, cat:"capex"},
          {k:"Device installation & qualification",  lo:180000,  hi:520000,  cat:"capex"},
          {k:"Aircraft for flight training (if any)", lo:0,      hi:1800000, cat:"capex"},
          {k:"Courseware, LMS & systems",            lo:90000,   hi:320000,  cat:"capex"},
          {k:"Certification & regulatory programme", lo:120000,  hi:340000,  cat:"capex"},
          {k:"Working capital — 9 months",           lo:600000,  hi:1900000, cat:"wc"}
        ]
      },
      items:{
        pre:[
          {t:"Statement of intent & scope of training sought", d:"Which licences, ratings and courses; which devices; which regulatory basis.", c:["acAto001"], crit:true},
          {t:"Confirm the applicable ATO instrument with KCAA", d:"L.N. 93/2018 is in force and the 2025 revision is still awaiting gazettement — but that can change mid-application. Get the position in writing at pre-application, because it determines your entire compliance matrix.", c:["ato","atoNew"], crit:true},
          {t:"Site secured with tenure evidence", d:"Lease or title, plus zoning/planning consent. SEZ or technopolis siting adds a licensing track of its own.", c:["acAto001"], crit:true},
          {t:"Accountable Manager & Head of Training identified", d:"HT acceptance requires evidence of course management and training integration, not only instructional hours.", c:["pel"], crit:true},
          {t:"Pre-application meeting held", d:"Agree the certification team and Schedule of Events.", c:["ac5phase"], crit:true}
        ],
        formal:[
          {t:"Formal application + prescribed ATO forms", d:"Complete form set with all signature blocks executed.", c:["acAto001"], crit:true},
          {t:"Schedule of Events aligned to device delivery", d:"Sequence the regulatory milestones against procurement and installation — the two must not drift apart.", c:["ac5phase"], crit:true},
          {t:"Training Manual & Operations Manual submitted", d:"Including the technical content the Head of Training is personally answerable for.", c:["acAto001"], crit:true},
          {t:"Approved-course syllabi submitted", d:"Each course mapped to the competency framework and the licensing requirement it serves.", c:["doc9868","pel"], crit:true},
          {t:"Instructor establishment & qualifications", d:"CFI, instructors and examiners with licences, ratings and currency evidenced.", c:["pel"], crit:true},
          {t:"Financial adequacy demonstration", d:"The Accountable Manager demonstrates resources to sustain approved training.", c:["ato"], crit:true},
          {t:"Written acceptance letter received", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        docs:[
          {t:"Training Manual accepted", d:"Findings closed and re-submitted.", c:["acAto001"], crit:true},
          {t:"Each approved course evaluated", d:"Ground, flight and simulator elements integrated — the HT's core statutory responsibility.", c:["doc9868"], crit:true},
          {t:"Instructor standardisation procedures accepted", d:"How instructors are checked, calibrated and re-checked.", c:["acAto001"], crit:true},
          {t:"SMS and Quality manuals accepted", d:"Including a safety policy signed by the Accountable Manager.", c:["sms","annex19"], crit:true},
          {t:"Student records & progress-tracking system accepted", d:"Auditable per-student progression against the syllabus.", c:["acAto001"], crit:false},
          {t:"Personnel qualifications verified — HT interview", d:"The Head of Training typically attends a personal interview with the Authority.", c:["pel"], crit:true},
          {t:"All Phase 3 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        demo:[
          {t:"FSTD qualification test guide accepted per device", d:"Objective and subjective testing against the qualification standard for the device class.", c:["ato"], crit:true},
          {t:"Devices qualified and certificates issued", d:"Each device qualified in its own right before it can be used for credit.", c:["ato"], crit:true},
          {t:"Facilities inspection — classrooms, briefing, records", d:"Including student welfare and briefing capacity against planned throughput.", c:["acAto001"], crit:true},
          {t:"Demonstration training sortie / lesson observed", d:"An actual lesson delivered and assessed by the Authority.", c:["acAto001"], crit:true},
          {t:"Emergency & evacuation procedures demonstrated", d:"For the training facility itself.", c:["sms"], crit:false},
          {t:"All Phase 4 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        cert:[
          {t:"ATO certificate issued with scope of approval", d:"Listing exactly which courses and devices are approved.", c:["ato"], crit:true},
          {t:"Instructor and examiner authorisations issued", d:"Individual authorisations flow from the organisational approval.", c:["pel"], crit:true},
          {t:"Surveillance and device re-qualification calendar set", d:"FSTDs require recurrent qualification; diarise it from day one.", c:["ato"], crit:true},
          {t:"Postholder change-notification process in place", d:"Any change of Accountable Manager or Head of Training requires Authority acceptance.", c:["ato"], crit:false}
        ]
      }
    },

    /* ============ 3. AMO / MRO ============ */
    {
      id:"amo", icon:"🔧", name:"Approved Maintenance Organisation",
      short:"AMO / MRO",
      blurb:"Line, base or component maintenance. Certification is scoped to a capability list.",
      regLine:"AMO Regs 2025 (L.N. 20/2026)",
      cites:["amo","airworth","acAws006","sms","act"],
      leadMonths:[9,18], leadNote:"9–18 months. Scope discipline is decisive — a narrow initial capability list certifies far faster than an ambitious one.",
      postholders:[
        {r:"Accountable Manager", kcaa:true},
        {r:"Quality Manager", kcaa:true, note:"Independent of production. This independence is tested."},
        {r:"Maintenance / Production Manager", kcaa:true},
        {r:"Safety Manager", kcaa:true},
        {r:"Certifying Staff", kcaa:true, note:"Individually authorised against the capability list and type."},
        {r:"Stores & Quarantine Controller", kcaa:false},
        {r:"Technical Records Manager", kcaa:false},
        {r:"Training & Competence Manager", kcaa:false}
      ],
      manuals:["Maintenance Organisation Exposition (MOE)","Capability List","Quality Manual","Safety Management System Manual","Technical Procedures Manual","Human Factors Training Programme","Tooling & Calibration Register","Stores Procedures"],
      capital:{
        unit:"USD",
        note:"Line-maintenance-only entry is a fraction of a base-maintenance hangar. The hangar decision dominates the model.",
        lines:[
          {k:"Hangar / facility (lease fit-out or build)", lo:600000, hi:6500000, cat:"capex"},
          {k:"Tooling, GSE & test equipment",         lo:350000,  hi:2200000, cat:"capex"},
          {k:"Initial spares & consumables",          lo:200000,  hi:1100000, cat:"capex"},
          {k:"Calibration & workshop equipment",      lo:80000,   hi:420000,  cat:"capex"},
          {k:"Certification & regulatory programme",  lo:110000,  hi:300000,  cat:"capex"},
          {k:"Staff training & type authorisations",  lo:150000,  hi:700000,  cat:"capex"},
          {k:"Working capital — 6 months",            lo:400000,  hi:1600000, cat:"wc"}
        ]
      },
      items:{
        pre:[
          {t:"Statement of intent with draft capability list", d:"Scope by aircraft type, component and maintenance level. Be ruthless — every line must be evidenced.", c:["acAws006"], crit:true},
          {t:"Facility identified with tenure evidence", d:"Hangar or workshop with lease/title, plus aerodrome access agreement if on-airport.", c:["amo"], crit:true},
          {t:"Accountable Manager & Quality Manager identified", d:"Quality independent from production — the reporting line is examined.", c:["amo"], crit:true},
          {t:"Pre-application meeting held", d:"Agree scope, applicable regulations and Schedule of Events.", c:["ac5phase"], crit:true}
        ],
        formal:[
          {t:"Formal application + prescribed AMO forms", d:"Complete and executed form set.", c:["acAws006"], crit:true},
          {t:"Maintenance Organisation Exposition (MOE) submitted", d:"The organisation's governing document — scope, procedures, personnel, facilities.", c:["amo"], crit:true},
          {t:"Capability list with supporting evidence", d:"For each line: data, tooling, trained staff, facility. No evidence, no capability.", c:["amo"], crit:true},
          {t:"Certifying staff nominations & authorisations", d:"Licences, type training and experience for each nominated individual.", c:["amo","pel"], crit:true},
          {t:"Schedule of Events", d:"Dated and resourced through certification.", c:["ac5phase"], crit:true},
          {t:"Written acceptance letter received", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        docs:[
          {t:"MOE accepted", d:"All findings closed and re-submitted.", c:["amo"], crit:true},
          {t:"Quality assurance programme accepted", d:"Independent audit programme with corrective-action tracking.", c:["amo"], crit:true},
          {t:"SMS manual accepted", d:"Including maintenance-specific hazard identification.", c:["sms","annex19"], crit:true},
          {t:"Human Factors training programme accepted", d:"Mandatory for maintenance personnel.", c:["amo"], crit:true},
          {t:"Technical data control procedures accepted", d:"Current, controlled manufacturer data for every capability claimed.", c:["amo"], crit:true},
          {t:"Personnel qualifications verified", d:"Certifying staff assessed individually.", c:["amo"], crit:true},
          {t:"All Phase 3 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        demo:[
          {t:"Facility inspection — hangar, workshops, stores, quarantine", d:"Including environmental controls where the capability requires them.", c:["amo"], crit:true},
          {t:"Tooling and calibration system demonstrated", d:"Every tool traceable, in calibration, and controlled.", c:["amo"], crit:true},
          {t:"Stores & quarantine control demonstrated", d:"Receipt inspection, segregation, shelf life, unserviceable quarantine.", c:["amo"], crit:true},
          {t:"Sample maintenance task witnessed", d:"A task from the capability list performed and certified end to end.", c:["amo"], crit:true},
          {t:"Technical records system demonstrated", d:"Traceable from work order to certificate of release to service.", c:["amo"], crit:true},
          {t:"All Phase 4 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        cert:[
          {t:"AMO certificate issued with approved capability list", d:"You may only work within the listed scope.", c:["amo"], crit:true},
          {t:"Certifying staff authorisations issued", d:"Individual authorisations under the organisational approval.", c:["amo"], crit:true},
          {t:"Capability-extension procedure understood", d:"Adding capability post-certification is a defined amendment process, not an internal decision.", c:["amo"], crit:false},
          {t:"Surveillance calendar set", d:"Audit cycle and continued-compliance obligations begin.", c:["amo"], crit:false}
        ]
      }
    },

    /* ============ 4. GROUND HANDLING & FBO ============ */
    {
      id:"gha", icon:"🛬", name:"Ground Handling & FBO",
      short:"Ground handling / FBO",
      blurb:"Ramp, passenger and cargo handling, or a fixed-base operation serving business aviation.",
      regLine:"Air services licensing + aerodrome access",
      cites:["gh","act","aerodrome","aerocert","security","dgr","airsvc"],
      leadMonths:[6,14], leadNote:"6–14 months. The binding constraint is usually the aerodrome operator's concession, not the regulator.",
      warn:"Ground-handling licensing sits across the Civil Aviation Act and aerodrome/air-service instruments rather than in one dedicated regulation. Confirm the current licensing instrument, categories and fee schedule directly with KCAA before building a compliance matrix.",
      postholders:[
        {r:"Accountable Manager", kcaa:true},
        {r:"Operations Manager", kcaa:false},
        {r:"Safety Manager", kcaa:true, note:"Ground-handling SMS is expected under Annex 19 and by airline customers."},
        {r:"Quality Manager", kcaa:false},
        {r:"Training Manager", kcaa:false, note:"Ramp competence and recurrency drive both safety and airline audit outcomes."},
        {r:"Security Manager", kcaa:true},
        {r:"Dangerous Goods focal point", kcaa:false}
      ],
      manuals:["Ground Operations Manual","Safety Management System Manual","Training & Competence Programme","Security Programme","Dangerous Goods Acceptance Procedures","Emergency Response Plan","Service Level Agreements","Equipment Maintenance Programme"],
      capital:{
        unit:"USD",
        note:"GSE dominates ramp handling; an FBO is a property play with a service wrapper. Concession fees and aerodrome charges are the recurring line that kills thin models.",
        lines:[
          {k:"Ground support equipment fleet",       lo:450000,  hi:3200000, cat:"capex"},
          {k:"FBO terminal / facility fit-out",      lo:0,       hi:4500000, cat:"capex"},
          {k:"Concession & aerodrome entry fees",    lo:60000,   hi:600000,  cat:"capex"},
          {k:"IT, DCS & ramp systems",               lo:70000,   hi:340000,  cat:"capex"},
          {k:"Certification & regulatory programme", lo:70000,   hi:220000,  cat:"capex"},
          {k:"Staff recruitment & initial training", lo:120000,  hi:520000,  cat:"capex"},
          {k:"Working capital — 6 months",           lo:300000,  hi:1400000, cat:"wc"}
        ]
      },
      items:{
        pre:[
          {t:"Statement of intent & service categories", d:"Ramp, passenger, cargo, fuelling, de-icing, FBO — each may carry a distinct authorisation.", c:["gh"], crit:true},
          {t:"Confirm the licensing instrument with KCAA in writing", d:"Establish which categories require licensing and under which instrument before designing the compliance matrix.", c:["gh"], crit:true},
          {t:"Aerodrome concession / access agreement secured", d:"Usually the true critical path. Engage the aerodrome operator before the regulator.", c:["aerodrome"], crit:true},
          {t:"Legal entity & ownership evidence", d:"Incorporation, CR12, beneficial ownership.", c:["act"], crit:true},
          {t:"Pre-application meeting held", d:"Agree scope and Schedule of Events.", c:["ac5phase"], crit:true}
        ],
        formal:[
          {t:"Formal application + prescribed forms", d:"Complete and executed.", c:["gh"], crit:true},
          {t:"Ground Operations Manual submitted", d:"Procedures for every service category applied for.", c:["gh"], crit:true},
          {t:"Equipment schedule & maintenance programme", d:"GSE inventory with serviceability and maintenance regime.", c:["gh"], crit:true},
          {t:"Training & competence programme submitted", d:"Including recurrency and airside driving.", c:["gh"], crit:true},
          {t:"Insurance evidence at required limits", d:"Third-party and aircraft-damage liability — airline customers will set higher bars than the regulator.", c:["act"], crit:true},
          {t:"Written acceptance letter received", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        docs:[
          {t:"Ground Operations Manual accepted", d:"Findings closed.", c:["gh"], crit:true},
          {t:"SMS manual accepted", d:"Ramp-specific hazards, reporting and risk management.", c:["sms","annex19"], crit:true},
          {t:"Security programme accepted", d:"Staff vetting, airside passes, screening interfaces.", c:["act"], crit:true},
          {t:"Dangerous goods acceptance procedures accepted", d:"Where cargo or acceptance is in scope.", c:["dgr"], crit:false},
          {t:"Training records & competence matrix accepted", d:"Per-individual competence traceable to the task.", c:["gh"], crit:false},
          {t:"All Phase 3 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        demo:[
          {t:"Facility & equipment inspection", d:"GSE serviceability, storage, workshop and staff facilities.", c:["gh"], crit:true},
          {t:"Live turnaround demonstration", d:"A full turnaround performed under observation.", c:["gh"], crit:true},
          {t:"Emergency & spill response demonstrated", d:"Including fuel spill and aircraft-damage reporting.", c:["sms"], crit:true},
          {t:"Airside driving & safety compliance verified", d:"Permits, training and discipline on the ramp.", c:["aerodrome"], crit:false},
          {t:"All Phase 4 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        cert:[
          {t:"Licence / authorisation issued per service category", d:"Scope-limited to what was demonstrated.", c:["gh"], crit:true},
          {t:"Aerodrome concession executed and in force", d:"The commercial counterpart to the regulatory approval.", c:["aerodrome"], crit:true},
          {t:"Airline SLAs and ISAGO readiness planned", d:"Airline customers audit to ISAGO; plan for it even though it is not a regulatory requirement.", c:["gh"], crit:false}
        ]
      }
    },

    /* ============ 5. AERODROME ============ */
    {
      id:"aero", icon:"🛫", name:"Aerodrome / Airport",
      short:"Aerodrome",
      blurb:"Certification or licensing of an aerodrome, including greenfield airstrips and private-use fields.",
      regLine:"Aerodrome Certification (L.N. 41/2026) + Design & Operations (L.N. 102/2026)",
      cites:["aerocert","aerodrome","act","ais","ats","sms"],
      leadMonths:[18,42], leadNote:"18–42 months. Land, environmental approval and physical works dominate; certification is the tail, not the dog.",
      postholders:[
        {r:"Accountable Manager / Aerodrome Operator", kcaa:true},
        {r:"Aerodrome Manager", kcaa:true},
        {r:"Safety Manager", kcaa:true},
        {r:"Rescue & Fire Fighting Officer", kcaa:true, note:"RFF category drives both capital and establishment."},
        {r:"Operations / Airside Manager", kcaa:false},
        {r:"Wildlife Hazard Management focal point", kcaa:false},
        {r:"Maintenance Manager (pavements, lighting, systems)", kcaa:false}
      ],
      manuals:["Aerodrome Manual","Safety Management System Manual","Emergency Plan","Wildlife Hazard Management Plan","Aerodrome Works Safety Plan","Obstacle Limitation Surface survey","Pavement & Lighting Maintenance Programme","Security Programme"],
      capital:{
        unit:"USD",
        note:"Enormously site-dependent. A code-2C unpaved strip and a code-4E international field differ by orders of magnitude — treat these as a rough sanity band for a small regional aerodrome only.",
        lines:[
          {k:"Land acquisition / lease",              lo:200000,  hi:8000000,  cat:"capex"},
          {k:"Runway, taxiway & apron works",         lo:2500000, hi:45000000, cat:"capex"},
          {k:"Terminal & landside",                   lo:600000,  hi:20000000, cat:"capex"},
          {k:"Lighting, navaids & met",               lo:400000,  hi:6000000,  cat:"capex"},
          {k:"Rescue & fire fighting establishment",  lo:350000,  hi:3200000,  cat:"capex"},
          {k:"Surveys, EIA & certification programme",lo:250000,  hi:1400000,  cat:"capex"},
          {k:"Working capital — 12 months",           lo:400000,  hi:2600000,  cat:"wc"}
        ]
      },
      items:{
        pre:[
          {t:"Statement of intent & aerodrome reference code", d:"Critical aircraft type drives the entire design standard.", c:["aerodrome"], crit:true},
          {t:"Land tenure and title secured", d:"Including the obstacle limitation surfaces beyond the boundary — control of adjacent land matters.", c:["aerodrome"], crit:true},
          {t:"Environmental & social impact assessment lodged", d:"NEMA approval is a separate track and frequently the longest one.", c:["act"], crit:true},
          {t:"Airspace and ATS implications raised early", d:"Airspace design, procedures and any ATS provision must be agreed, not assumed.", c:["ats","ais"], crit:true},
          {t:"Pre-application meeting held", d:"Agree scope, reference code and Schedule of Events.", c:["ac5phase"], crit:true}
        ],
        formal:[
          {t:"Formal application + prescribed forms", d:"Complete and executed.", c:["aerodrome"], crit:true},
          {t:"Aerodrome Manual submitted", d:"The governing document — physical characteristics, procedures, personnel, emergency arrangements.", c:["aerodrome"], crit:true},
          {t:"Obstacle limitation surface survey submitted", d:"Surveyed, not modelled, with identified infringements and mitigation.", c:["aerodrome"], crit:true},
          {t:"Aeronautical study for any non-compliance", d:"Where a standard cannot be met, an accepted aeronautical study is the route to an equivalent level of safety.", c:["aerodrome"], crit:false},
          {t:"Rescue & fire fighting category declared and resourced", d:"Vehicles, agents, staffing and response-time evidence.", c:["aerodrome"], crit:true},
          {t:"Written acceptance letter received", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        docs:[
          {t:"Aerodrome Manual accepted", d:"Findings closed.", c:["aerodrome"], crit:true},
          {t:"SMS manual accepted", d:"Including works-in-progress and runway-safety risk management.", c:["sms","annex19"], crit:true},
          {t:"Emergency plan accepted", d:"With mutual-aid agreements from off-airport responders.", c:["aerodrome"], crit:true},
          {t:"Wildlife hazard management plan accepted", d:"Based on an actual site wildlife survey.", c:["aerodrome"], crit:true},
          {t:"Aeronautical information for publication agreed", d:"AIP entry, charts and NOTAM arrangements.", c:["ais"], crit:true},
          {t:"All Phase 3 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        demo:[
          {t:"Physical inspection — pavements, markings, lighting, signage", d:"Against the declared reference code.", c:["aerodrome"], crit:true},
          {t:"Rescue & fire fighting response demonstration", d:"Response time to the critical point, with full turnout.", c:["aerodrome"], crit:true},
          {t:"Full-scale or table-top emergency exercise", d:"With external agencies participating.", c:["aerodrome"], crit:true},
          {t:"Lighting and navaid flight check completed", d:"Where an instrument procedure or lighting system is provided.", c:["aerodrome","ats"], crit:true},
          {t:"Serviceability inspection & reporting demonstrated", d:"Daily inspection regime and defect reporting in practice.", c:["aerodrome"], crit:false},
          {t:"All Phase 4 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        cert:[
          {t:"Aerodrome certificate / licence issued", d:"With any conditions and limitations attached.", c:["aerodrome"], crit:true},
          {t:"AIP entry published", d:"The aerodrome does not operationally exist to crews until it is published.", c:["ais"], crit:true},
          {t:"Safety oversight and audit cycle agreed", d:"Continuing compliance obligations begin.", c:["aerodrome"], crit:false}
        ]
      }
    },

    /* ============ 6. UAS / RPAS + UTO ============ */
    {
      id:"uas", icon:"🛩️", name:"UAS / RPAS Operator & Training Organisation",
      short:"UAS / Drone + UTO",
      blurb:"Remotely piloted aircraft operations — survey, agriculture, inspection, delivery — and drone training.",
      regLine:"UAS Regs 2025 (L.N. 40/2026)",
      cites:["uas","act","pel","sms"],
      leadMonths:[3,12], leadNote:"3–12 months. The fastest regulatory entry of the six sectors, and the one where market economics — not regulation — most often decides the outcome.",
      postholders:[
        {r:"Accountable Manager", kcaa:true},
        {r:"Head of UAS Operations", kcaa:true},
        {r:"Safety Manager", kcaa:true, note:"Proportionate to the risk class of operations flown."},
        {r:"Chief Remote Pilot", kcaa:true},
        {r:"Head of Training (UTO only)", kcaa:true, note:"Required where the organisation also trains remote pilots."},
        {r:"Maintenance / Airworthiness focal point", kcaa:false},
        {r:"Quality / Compliance Manager", kcaa:false}
      ],
      manuals:["UAS Operations Manual","Safety Management System Manual","Maintenance & Airworthiness Procedures","Training Manual (UTO)","Emergency Response Procedures","Risk Assessment per operation type","Remote Pilot Competency Records","Data & Privacy Handling Policy"],
      capital:{
        unit:"USD",
        note:"By far the lightest capital entry. The real cost driver is the aircraft class and payload: a survey quadcopter fleet and a BVLOS fixed-wing logistics platform are different businesses.",
        lines:[
          {k:"Aircraft fleet & payloads",             lo:35000,  hi:900000,  cat:"capex"},
          {k:"Ground control, comms & C2 links",      lo:15000,  hi:260000,  cat:"capex"},
          {k:"Processing software & workstations",    lo:12000,  hi:140000,  cat:"capex"},
          {k:"Operating base / hangar fit-out",       lo:20000,  hi:320000,  cat:"capex"},
          {k:"Certification & regulatory programme",  lo:25000,  hi:110000,  cat:"capex"},
          {k:"Remote pilot training & authorisations",lo:18000,  hi:160000,  cat:"capex"},
          {k:"Working capital — 6 months",            lo:60000,  hi:480000,  cat:"wc"}
        ]
      },
      items:{
        pre:[
          {t:"Statement of intent & operational category", d:"Risk class, VLOS or BVLOS, payload, and whether operations are over people or controlled airspace.", c:["uas"], crit:true},
          {t:"UAS registration & import clearance path", d:"Aircraft registration and any import/security clearance for the airframes and payloads.", c:["uas"], crit:true},
          {t:"Remote pilot licensing route confirmed", d:"Which licences and ratings the intended operations require.", c:["uas","pel"], crit:true},
          {t:"Security & data-protection posture", d:"Imagery capture engages Kenya's data-protection regime as well as aviation security.", c:["act"], crit:true},
          {t:"Pre-application meeting held", d:"Agree scope and Schedule of Events.", c:["ac5phase"], crit:true}
        ],
        formal:[
          {t:"Formal application + prescribed UAS forms", d:"Complete and executed form set.", c:["uas"], crit:true},
          {t:"UAS Operations Manual submitted", d:"Covering every operation type applied for.", c:["uas"], crit:true},
          {t:"Operational risk assessment per operation type", d:"Ground and air risk with mitigations — the core of a modern UAS approval.", c:["uas","sms"], crit:true},
          {t:"Remote pilot establishment & qualifications", d:"Licences, ratings, currency and type familiarity.", c:["uas","pel"], crit:true},
          {t:"Training Manual submitted (UTO applicants)", d:"Where remote pilot training is in scope, the training approval runs alongside the operator approval.", c:["uas","doc9868"], crit:false},
          {t:"Insurance evidence", d:"Third-party liability appropriate to the operation.", c:["act"], crit:true},
          {t:"Written acceptance letter received", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        docs:[
          {t:"UAS Operations Manual accepted", d:"Findings closed.", c:["uas"], crit:true},
          {t:"Risk assessments accepted per operation type", d:"Each approved operation is scoped by its accepted assessment.", c:["uas"], crit:true},
          {t:"SMS accepted, proportionate to risk", d:"Scaled to the operation — not an airline SMS copied across.", c:["sms","annex19"], crit:true},
          {t:"Maintenance & airworthiness procedures accepted", d:"Including battery management and firmware control.", c:["uas"], crit:false},
          {t:"Training programme accepted (UTO)", d:"Syllabus, instructor qualifications and assessment standards.", c:["uas"], crit:false},
          {t:"All Phase 3 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        demo:[
          {t:"Operational demonstration flight witnessed", d:"Representative of the highest-risk operation applied for.", c:["uas"], crit:true},
          {t:"Emergency & lost-link procedures demonstrated", d:"Including flyaway containment and emergency landing.", c:["uas"], crit:true},
          {t:"Base, storage & charging facilities inspected", d:"Battery storage and charging safety is a common finding.", c:["uas"], crit:false},
          {t:"Records & flight logging demonstrated", d:"Per-flight logging, maintenance and pilot currency records.", c:["uas"], crit:false},
          {t:"All Phase 4 findings closed", d:"THE GATE.", c:["ac5phase"], crit:true}
        ],
        cert:[
          {t:"UAS operator certificate issued", d:"Scoped to the demonstrated operations.", c:["uas"], crit:true},
          {t:"UTO approval issued (where applicable)", d:"Training approval with its scope of courses.", c:["uas"], crit:false},
          {t:"Operational authorisations / permits process understood", d:"Individual flight permissions may still be needed per operation or location.", c:["uas"], crit:true},
          {t:"Surveillance and renewal calendar set", d:"Continuing compliance obligations begin.", c:["uas"], crit:false}
        ]
      }
    }
  ],

  /* ---------------------------------------------------------
     CORPORATE STRUCTURE TEMPLATES
     --------------------------------------------------------- */
  structures: [
    {
      id:"simple", name:"Single Kenyan OpCo",
      when:"Domestic investors, no foreign capital, no project debt.",
      pros:["Cheapest to run — one set of filings","No substance requirements","Simplest for KCAA ownership and control tests"],
      cons:["No asset-protection firewall","Harder to admit foreign investors later","No clean lender interface"],
      tiers:[ {k:"op", jur:"Kenya", name:"OpCo", note:"Holds the certificate, employs staff, runs the operation."} ]
    },
    {
      id:"holdco", name:"HoldCo / OpCo",
      when:"Mixed local and foreign shareholders; equity only, or modest bank debt.",
      pros:["Separates ownership from operations","Admits new investors at HoldCo without touching the certificate","Asset-protection firewall"],
      cons:["Two sets of filings","Foreign HoldCo may need substance","Watch the ownership-and-control test at OpCo"],
      tiers:[
        {k:"hold", jur:"Kenya or offshore", name:"HoldCo", note:"Shareholding, governance and future fundraising."},
        {k:"op",   jur:"Kenya", name:"OpCo", note:"Holds the certificate and operates."}
      ]
    },
    {
      id:"threetier", name:"HoldCo / SPV / OpCo (project finance)",
      when:"Senior project debt, a development finance institution, or a lender taking equity alongside its loan.",
      pros:["Clean lender interface — covenants and security live in the SPV","Dividend blocker protects debt service","Ready for later DFI rounds without restructuring","Enforcement can be insulated from the shareholder relationship"],
      cons:["Highest running cost — substance budget per offshore entity","Complex beneficial-ownership disclosure","Requires an intercreditor deed and, ideally, a security trustee"],
      tiers:[
        {k:"trust",jur:"Kenya", name:"Founder trust (optional)", note:"Succession vehicle; can hold super-voting shares and a direct local stake."},
        {k:"hold", jur:"Offshore", name:"HoldCo", note:"Shareholding, governance, future rounds. Substance required."},
        {k:"spv",  jur:"Offshore", name:"SPV / Borrower", note:"Lender interface, security, dividend blocker."},
        {k:"op",   jur:"Kenya", name:"OpCo", note:"Holds the certificate, employs staff, runs the operation."}
      ]
    }
  ],

  /* Governance and lender-conflict checks surfaced by the structure tool.
     Derived from institutional project-finance practice. */
  structureChecks: [
    {id:"control", t:"Ownership & effective control test", d:"Air-service licensing regimes commonly require substantial ownership and effective control by nationals. A foreign-majority chain can satisfy company law and still fail the aviation test. Model the look-through, not just the register.", sectors:["aoc"]},
    {id:"local",   t:"Local stake as a tax and licensing hedge", d:"A meaningful direct local shareholding at OpCo hedges against loss of a preferential tax status and strengthens the beneficial-ownership position. It is cheap insurance relative to the exposure.", sectors:["*"]},
    {id:"substance", t:"Offshore substance from day one", d:"An offshore holding entity that fails substance tests loses its preferential rate and may lose treaty access entirely. Resident directors, local board meetings, local bank account and audited local accounts — budgeted from incorporation, not retrofitted.", sectors:["*"]},
    {id:"dta",     t:"Do not assume a treaty is in force", d:"Treaty networks change and individual treaties get invalidated. Build the structure so it works on domestic law alone, and treat any treaty benefit as upside.", sectors:["*"]},
    {id:"dual",    t:"Lender-as-shareholder conflict", d:"When your lender also takes equity, the same institution sits on both sides of every waiver, distribution and enforcement decision. Mitigate with a dividend lock-up, a bar on the shareholder representative voting to waive lender covenants, independent-director approval for related-party dealings, and — best practice — a third-party security trustee.", sectors:["*"]},
    {id:"inter",   t:"Intercreditor deed, not a side letter", d:"If shareholder loans are to count as equity for covenant purposes, that treatment belongs in an intercreditor deed. A side letter is disputable exactly when it matters.", sectors:["*"]},
    {id:"fx",      t:"Currency mismatch across the stack", d:"Equipment priced in one currency, debt drawn in a second, revenue earned in a third is a three-way exposure. Price hedging into the model rather than discovering it at drawdown.", sectors:["*"]},
    {id:"am",      t:"Accountable Manager as governance leverage", d:"Regulator acceptance of an Accountable Manager is personal and non-transferable. Changing that person triggers re-approval. Codify the post's statutory authority — safety decisions cannot be overridden by commercial vote — in a board resolution.", sectors:["*"]},
    {id:"esop",    t:"Equity incentives before a formal scheme exists", d:"A direct founder-to-executive share transfer is not an option scheme, and the tax treatment differs accordingly. Name it correctly and take advice on the charge point before executing.", sectors:["*"]},
    {id:"veto",    t:"Minority vetoes vs the growth plan", d:"A new-debt veto set at a low threshold can block the very expansion round the structure was built to enable. Carve out development-finance facilities and refinancing of the senior facility.", sectors:["*"]}
  ],

  /* ---------------------------------------------------------
     ORGANOGRAM — generic departmental scaffold layered under
     the sector-specific postholders.
     --------------------------------------------------------- */
  orgScaffold: [
    { dep:"Executive & Regulatory", roles:["Chief Executive Officer","Accountable Manager","Company Secretary"] },
    { dep:"Safety, Quality & Compliance", roles:["Safety Manager","Quality Manager","Compliance Officer"] },
    { dep:"Operations", roles:["Operations Manager","Duty Manager","Operations Controller"] },
    { dep:"Technical & Engineering", roles:["Technical Manager","Engineer / Technician","Technical Records Officer"] },
    { dep:"Training", roles:["Head of Training","Instructor","Training Administrator"] },
    { dep:"Commercial", roles:["Commercial Manager","Business Development","Marketing"] },
    { dep:"Finance & Administration", roles:["Finance Controller","Accountant","Procurement Officer","HR Officer"] }
  ],

  /* Headcount ramp multipliers by sector at launch / year 3 / year 5.
     Indicative planning figures for a small-to-mid greenfield entrant. */
  headcount: {
    aoc:  { launch:78,  y3:135, y5:210 },
    ato:  { launch:30,  y3:52,  y5:78  },
    amo:  { launch:34,  y3:66,  y5:104 },
    gha:  { launch:95,  y3:180, y5:270 },
    aero: { launch:48,  y3:82,  y5:120 },
    uas:  { launch:11,  y3:24,  y5:42  }
  },

  /* ---------------------------------------------------------
     MARKET CONTEXT — the numbers that frame every conversation.
     Refresh these with each IATA/AFRAA release.
     --------------------------------------------------------- */
  market: {
    asOf: "IATA December 2025 outlook for 2026; AFRAA 2024–25 data",
    stats: [
      { v:"$1.3",  l:"Net profit per passenger, African carriers", sub:"vs $7.9 globally", src:"IATA 2026 outlook" },
      { v:"1.3%",  l:"Net margin — the world's thinnest",          sub:"$0.2bn on 6% traffic growth", src:"IATA 2026 outlook" },
      { v:"~2×",   l:"African unit cost vs industry average",      sub:"~140 US¢ per ATK", src:"IATA" },
      { v:"110+",  l:"New intra-African routes under SAATM",       sub:"incl. 19 fifth-freedom services", src:"AFCAC / SAATM" }
    ],
    narrative: "Demand is not the constraint. African traffic is growing around 6% a year and SAATM has opened more than 110 new intra-African routes. The constraint is execution: unit costs roughly double the global average, the thinnest margins of any region, and a certification pathway that quietly consumes the runway of well-funded ventures before they ever carry a passenger."
  },

  /* helpers ------------------------------------------------- */
  sector(id){ return this.sectors.find(s => s.id === id) || null; },
  cite(key){ return this.cites[key] || null; },
  totalItems(sector){
    return this.phaseSpine.reduce((n,p) => n + ((sector.items[p.id] || []).length), 0);
  },
  criticalItems(sector){
    return this.phaseSpine.reduce((n,p) => n + (sector.items[p.id] || []).filter(i => i.crit).length, 0);
  }
};

if (typeof window !== "undefined") window.JKV = JKV;
