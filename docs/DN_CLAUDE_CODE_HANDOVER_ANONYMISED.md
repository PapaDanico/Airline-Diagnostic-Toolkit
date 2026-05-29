# DN CONSULTANCY × CASE-STUDY CARRIER
## Claude Code Handover Document
### Prepared: May 2026 | Status: Active Production Project

> **Anonymised copy.** Confidential client, third-party, and personal identifiers have been replaced with role-based placeholders (e.g. *the Case-Study Carrier*, *Reg-1…5*, *Prospect Carrier A/B*, *[name withheld]*). DN Consultancy's own brand, methodology, and technical patterns are retained intact. Original retained privately.

---

## 1. PROJECT OVERVIEW

This is a dual-track active project combining:

1. **DN Consultancy** — a specialist aviation management consulting firm (Nairobi, Kenya). Claude is the full analytical and production engine. The firm's **Principal** is the human domain expert and decision-maker.

2. **The Case-Study Carrier** — the primary case-study client. A full operational management Excel suite (21 workbooks) has been built for this carrier. These workbooks serve as both operational tools AND proof-of-capability portfolio for DN Consultancy.

**Relationship:** DN Consultancy uses the Case-Study Carrier's deliverables as the reference implementation of its proprietary 14-tool Diagnostic Toolkit. Everything built for the carrier is a template for future client engagements.

---

## 2. ENVIRONMENT & DEPENDENCIES

### Python (openpyxl builds)
```bash
pip install openpyxl Pillow --break-system-packages
python3 --version  # 3.12 confirmed working
```

### Node.js (Word document builds)
```bash
npm install -g docx  # docx@9.6.1 confirmed working
node --version       # Check availability
```

### Logo files (must be present before any build)
```
/mnt/user-data/uploads/1.png          # DN Consultancy logo (500×500px, original)
/home/claude/dn_logo.png              # Full-size processed (500×500px RGBA)
/home/claude/dn_logo_thumb.png        # Excel thumbnail (120×120px)
/home/claude/logo_b64.txt             # Base64 encoded (for HTML embedding)
```

### Logo prep (run at session start if files not present)
```python
from PIL import Image as PILImage
import base64

# Process from upload
pil = PILImage.open("/mnt/user-data/uploads/1.png").convert("RGBA")
pil = pil.crop(pil.getbbox())
pil.save("/home/claude/dn_logo.png", "PNG")

# Thumbnail for Excel
tw = 120
pil.resize((tw, int(pil.height*tw/pil.width)), PILImage.LANCZOS).save(
    "/home/claude/dn_logo_thumb.png", "PNG")

# Base64 for HTML
with open("/home/claude/dn_logo.png", "rb") as f:
    with open("/home/claude/logo_b64.txt", "w") as out:
        out.write(base64.b64encode(f.read()).decode())
```

### Validation script (mandatory after every Excel build)
```bash
python /mnt/skills/public/xlsx/scripts/recalc.py FILE.xlsx 90 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Status: {d[\"status\"]} | Formulas: {d[\"total_formulas\"]} | Errors: {d[\"total_errors\"]}')
if d.get('error_summary'):
    for k,v in d['error_summary'].items():
        print(f'  {k}: {v[\"count\"]} @ {v[\"locations\"][:4]}')
"
# Zero errors are non-negotiable before delivery
```

---

## 3. BRAND SPECIFICATION

### Colours (exact hex, no substitutions)
```python
DN_DARK    = "1C1C1C"   # Charcoal — primary text, headers, dark backgrounds
DN_STEEL   = "4A7FA5"   # Steel blue — section banners, links, accents
DN_STEEL_LT= "D6E4F0"   # Light steel — backgrounds, tints, alternating rows
DN_GOLD    = "C9A84C"   # Warm gold — dividers, highlights, callouts
DN_GOLD_LT = "FFF8E6"   # Light gold — callout panels, guarantee boxes
DN_FOG     = "F4F4F2"   # Off-white fog — alternating rows, left panels
DN_MUTED   = "6B7280"   # Muted grey — body text, captions, notes
DN_WHITE   = "FFFFFF"
DN_GREEN   = "1E8449"   # Positive outcomes, compliant status
DN_RED     = "C0392B"   # Alerts, critical findings, errors
DN_AMBER   = "D4AC0D"   # Watch items, warnings, marginal status
```

### Typography
- **Cormorant Garamond** — display/headings in HTML (serif, elegant)
- **DM Sans** — body/UI text in HTML (clean, modern)
- **Calibri** — all Excel and Word documents (universally available)

### Input cell convention (Excel)
- Yellow `FFEAA7` + blue text `0000FF` = user input cells
- White/fog background + black text = formula outputs (do not overwrite)
- `FFEAA7` italic text = placeholder/sample values

### Logo usage
- Embed in all Excel workbooks (anchor typically `K1` or `L1`, 80×80px display)
- Embed in all Word documents (top-left, ~72×72px)
- In HTML: embed as base64 data URI
- On dark backgrounds: CSS `filter: brightness(0) invert(1)`

---

## 4. COMPLETE FILE INVENTORY

### DN Consultancy Core Documents
| File | Location | Description | Status |
|------|----------|-------------|--------|
| `DN_Toolkit_AB_Toolboxes_A_and_B.xlsx` | outputs + project knowledge | Tools A1–B5, 436 formulas | ✅ Zero errors |
| `DN_Toolkit_CD_Toolboxes_C_and_D.xlsx` | outputs + project knowledge | Tools C1–D4, 208 formulas | ✅ Zero errors |
| `DN_Consultancy_Website.html` | outputs + project knowledge | Full animated website, logo embedded | ✅ Complete |
| `DN_Capability_Statement.html` | outputs + project knowledge | A4 print-ready one-pager | ✅ Complete |
| `DN_Engagement_Proposal_Template.docx` | outputs + project knowledge | 8-section McKinsey proposal | ✅ Complete |
| `DN_MASTER_SKILL_REFERENCE.md` | outputs + project knowledge | Full technical build reference | ✅ Complete |

### Case-Study Carrier Workbook Suite (21 files)
| File # | Name | Key Content | Formula Count |
|--------|------|-------------|---------------|
| 01 | `CARRIER_01_FTL_Compliance.xlsx` | FTL tracking, duty limits, rest periods | ~120 |
| 02 | `CARRIER_02_MEL_Manager.xlsx` | MEL items, categories, dispatch decisions | ~95 |
| 03 | `CARRIER_03_Fuel_Analytics.xlsx` | Fuel consumption, uplifts, efficiency | ~140 |
| 04 | `CARRIER_04_Safety_KPIs.xlsx` | SMS KPIs, safety performance indicators | ~110 |
| 05 | `CARRIER_05_Revenue_Yield.xlsx` | Revenue by route, yield analytics | ~155 |
| 06 | `CARRIER_06_Flight_Ops_Control.xlsx` | OCC dashboard, sector tracking | ~130 |
| 07 | `CARRIER_07_5Year_Business_Plan.xlsx` | Financial model, 5-year projections | ~280 |
| 08 | `CARRIER_08_Crew_Rostering.xlsx` | Crew scheduling, currency tracking | ~195 |
| 09 | `CARRIER_09_Ground_Handling_SLA.xlsx` | GHA performance, SLA monitoring | ~115 |
| 10 | `CARRIER_10_Cargo_RMS.xlsx` | Belly cargo, revenue management | ~140 |
| 11 | `CARRIER_11_Training_Tracker.xlsx` | Training records, currency, gaps | ~160 |
| 12 | `CARRIER_12_Board_KPI_Scorecard.xlsx` | Board dashboard, 12 KPIs, RAG | ~145 |
| 13 | `CARRIER_13_Fleet_Planning.xlsx` | Fleet schedule, maintenance slots | ~125 |
| 14 | `CARRIER_14_ACMI_Wet_Lease.xlsx` | ACMI provider/operator model | 428 |
| 16 | `CARRIER_16_Regulatory_Audit_Tracker.xlsx` | KCAA + RVSM/PBN + EASA/FAA | 34 |
| 18 | `CARRIER_18_Charter_Revenue_Management.xlsx` | 4-segment charter P&L | 384 |
| 19 | `CARRIER_19_IROPS_Cost_Controller.xlsx` | Disruption costs, compensation | ~180 |
| 20 | `CARRIER_20_Ancillary_Revenue_Optimiser.xlsx` | 6-stream ancillary programme | ~220 |
| 21 | `CARRIER_21_Fuel_FX_Risk_Manager.xlsx` | Hedge positions, FX exposure | ~165 |

*Files 15 and 17 are intentional gaps in the numbering sequence.*
*Files 01–13 were built in earlier sessions; exact formula counts are approximations.*

### Build Scripts (at `/home/claude/` in session)
```
build_acmi.py          # File 14 builder
build_16_audit.py      # File 16 builder
build_18_charter.py    # File 18 builder
build_19_20_21.py      # Files 19-21 builder
build_dn_ab.py         # DN Toolkit A+B builder
build_dn_cd.py         # DN Toolkit C+D builder
build_proposal.js      # DN Proposal Word doc builder
```

---

## 5. ARCHITECTURAL PATTERNS

### Excel Workbook Structure (all files follow this pattern)
Every workbook has:
1. **Tab 1: Cover/Assumptions** — airline identity block, shared rate assumptions, legend
2. **Tabs 2–N: Tool tabs** — named with emoji prefix (e.g., `📊 Route P&L`)
3. **Final tab: Dashboard** — KPI tiles, RAG scorecard, sign-off block

### KPI Tile Pattern (Excel)
```python
# 2-column wide tile: label row + value row + note row
ws.merge_cells(start_row=r, start_column=col, end_row=r, end_column=col+1)
t = ws.cell(r, col, value=label)
t.font = Font(bold=True, sz=9, color=WHITE); t.fill = FL(bg_color)

ws.merge_cells(start_row=r+1, start_column=col, end_row=r+2, end_column=col+1)
v = ws.cell(r+1, col, value=formula_string)
v.number_format = fmt
v.font = Font(name="Calibri", bold=True, size=18, color=WHITE)
v.fill = FL(bg_color)
```

### DataValidation (critical pattern — must use .add() not sqref +=)
```python
dv = DataValidation(type="list", formula1='"OPEN,CLOSED,IN PROGRESS"', allow_blank=True)
ws.add_data_validation(dv)
dv.add(f"G{row}")   # CORRECT — avoids ValueError
# dv.sqref += f" G{row}"  # WRONG — breaks on " G9" with leading space
```

### RAG Conditional Formatting
```python
def rag_cf(ws, rng):
    for txt, fc, fnc in [
        ("🟢", "D5F5E3", "1E8449"),
        ("🔴", "FADBD8", "C0392B"),
        ("🟡", "FDEBD0", "D4AC0D")
    ]:
        ws.conditional_formatting.add(rng, FormulaRule(
            formula=[f'ISNUMBER(SEARCH("{txt}",{rng.split(":")[0]}))'],
            fill=PatternFill("solid", fgColor=fc),
            font=Font(bold=True, color=fnc)))
```

### Word Document (docx.js) — Critical Rules
```javascript
// Page: A4 = width:11906, height:16838 DXA (1440 DXA = 1 inch)
// Content width (1" margins each side): 11906 - 2*1134 = 9638 DXA
// OR with 0.787" margins: 11906 - 2*1134 = 9638 DXA

// NEVER use \n — use separate Paragraph elements
// NEVER use unicode bullets (•) — use LevelFormat.BULLET
// ALWAYS ShadingType.CLEAR (not SOLID) for table cells
// ALWAYS set BOTH columnWidths array AND width on each cell
// ALWAYS WidthType.DXA — never WidthType.PERCENTAGE
```

### HTML Pattern
```css
/* Always use these Google Fonts */
Cormorant Garamond (display) + DM Sans (body)

/* Always use CSS variables */
--ink: #1C1C1C; --steel: #4A7FA5; --gold: #C9A84C;

/* Logo embedding */
src="data:image/png;base64,{logo_b64_string}"
```

---

## 6. CASE-STUDY CARRIER — CLIENT CONTEXT

> All identifiers in this section are anonymised. Operational detail is retained as illustrative case-study material only.

### Fleet
```
Reg-1  B737-800  155 seats  (primary — ACMI provider, charters)
Reg-2  B737-800  155 seats  (secondary)
Reg-3  E190      90 seats   (RNP AR in progress)
Reg-4  E190      90 seats   (⚠️ RVSM renewal due — critical)
Reg-5  DH8D-400  68 seats   (domestic/regional)
```

### AOC & Regulatory
```
AOC Number:   KCAA/AOC/[withheld]/2024
Expiry:       31-Dec-2026
Regulator:    KCAA — Wilson Airport, Nairobi
RVSM:         Reg-4 renewal submitted Feb-2026, expires 31-Mar-2026 ⚠️
EASA TCO:     Phase 2 documentation review — Phase 3 expected Q2-2026
FAA IASA:     Category 1 maintained
```

### Key Personnel
```
Accountable Manager:          CEO — Case-Study Carrier
Chief Pilot / Dir Flight Ops: [Named individual]
Director Engineering / CAMO:  [Named individual]
Director Safety & Quality:    [Named individual] (SMS vacancy resolved Jan 2026)
KCAA Inspector:               [name withheld] — Senior Flight Ops
```

### ACMI Relationships
- **Provider TO:** [ACMI Provider 1], [ACMI Provider 2]
- **Operator FROM:** [ACMI Operator 1], [ACMI Operator 2] (as needed)
- File 14 models BOTH perspectives in a single dual-architecture workbook

### Open Issues (as of April 2026)
1. [KCAA finding ref withheld]: FDP excess (Level 1 Finding) — CAP in progress, target 28-Feb-2026
2. Reg-4 RVSM renewal — expires 31-Mar-2026, application submitted
3. Reg-3 (E190) RNP AR approval — target Mar-2026
4. EASA TCO Phase 3 site visit — expected Q2-2026

---

## 7. DN CONSULTANCY — TOOLKIT DETAIL

### The 14 Tools (full specification)

**TOOLBOX A — Entry Diagnostic**
| Ref | Tool Name | Tabs | Key Logic |
|-----|-----------|------|-----------|
| A1 | Airline Health Scorecard | Cover, Scorecard, Summary | 40 questions × 8 domains, weighted health index, radar chart data |
| A2 | CASK Benchmark Calculator | Cover, Inputs, Calculated KPIs, Interpretation | CASK = TotalCost/(ASK×1000), benchmarked vs Regional LCC ($0.088) / Regional FSC ($0.110) / Africa avg ($0.110) |
| A3 | 48-Hour Data Request | Cover, Request List | 28 items, priority flags CRITICAL/HIGH/MEDIUM, received dropdown |
| A4 | Operating Model Canvas | Cover, Canvas (9 panels) | Revenue/Cost/Fleet/Customers/Regulatory/Partnerships/Talent/Technology/Risks |

**TOOLBOX B — Deep Diagnostic**
| Ref | Tool Name | Tabs | Key Logic |
|-----|-----------|------|-----------|
| B1 | Route Profitability | Cover, Shared Assumptions, Route Table, Summary | Fuel=BH×burn×price, break-even PLF=cost/((fare+ancillary)×seats), viability flag |
| B2 | Staff Cost Analyser | Cover, Headcount Table | Ratio = headcount / fleet size, vs benchmarks (captains 3.5/acft, cabin 8.5/acft, engineers 6.5/acft) |
| B3 | Fleet Utilisation | Cover, Monthly BH matrix, Turn-Time Audit | Daily avg = annual BH/365, target 8.5 BH/day, colour scale CF on monthly data |
| B4 | Safety Maturity | Cover, Level Definitions, 14 Assessment Questions | ICAO SMS 5-level (Deficient→Reactive→Proactive→Predictive→Optimising), score 1-5 per question |
| B5 | Revenue Mix | Cover, Stream Inputs, Diversification Score | Africa avg vs Global LCC benchmarks, concentration risk if scheduled >85% |

**TOOLBOX C — Recommendations**
| Ref | Tool Name | Tabs | Key Logic |
|-----|-----------|------|-----------|
| C1 | 90-Day Sprint | Cover, Sprint KPIs, 3 Financial Targets, 5 Ops Fixes, 2 Commercial Initiatives | Progress %, days elapsed/remaining formulas, status dropdowns |
| C2 | Quick Win Identifier | Cover, Quadrant Legend, 15-item Scoring Table, Summary | Quadrant = IF(impact≥4, IF(effort≤2,"DO NOW","PLAN"), IF(effort≤2,"DELEGATE","RECONSIDER")) |
| C3 | Board Deck Template | Cover, 8 Slide Content Tabs | Situation/Findings/Root Cause/Financial Impact/Recommendations/Roadmap/Governance/Next Steps |
| C4 | KPI Governance | Cover, 12-KPI Table, RAG Summary | 12 KPIs with RAG dropdown, trend dropdown, commentary field, monthly cadence |
| C5 | Training TNA | Cover, 4 Staff Group Tables (Flight Crew/Cabin/Engineers/Ground) | 39 competencies, gap = target - current, priority flag, cost estimate |

**TOOLBOX D — Sector Specific**
| Ref | Tool Name | Tabs | Key Logic |
|-----|-----------|------|-----------|
| D1 | AOC Readiness | Cover, 30-item Checklist | KCAA CAR Part 8 requirements, MANDATORY-BLOCKING/MANDATORY/REQUIRED flags, % complete bar |
| D2 | Airport Viability | Cover, 45-criteria Assessment (9 domains), Viability Score | Score avg across all criteria, IF(≥4,"GO",IF(≥3,"CONDITIONAL","NO-GO")) |
| D3 | Codeshare Mapper | Cover, 16-criteria Scoring (4 domains), Weighted Totals | 5 candidate partners (Partner 1–5), SUMPRODUCT(weights×scores)/SUM(weights), rank and recommend |
| D4 | Fuel Procurement | Cover, Tender Spec, Supplier Matrix (9 criteria), Hedge Triggers | Weighted scores, 6-level hedge trigger from "no action" to "board approval" |

---

## 8. ENGAGEMENT PROPOSAL TEMPLATE — STRUCTURE

```
Cover Page:
  - Logo block + company name
  - Document type banner (dark background)
  - Proposal fields table (airline, contact, ref, date, type)
  - 4-cell KPI highlights bar (14 tools / 90 days / 5-12% / Day 1)

Section 1: Executive Summary
  - Situation + burning platform (two-column table)
  - Key findings preview table (finding / implication / value at stake)

Section 2: Situation Assessment
  - Operating context (3-5 paragraphs)
  - Preliminary performance assessment (5-domain two-column table)
  - Toolkit advantage explanation

Section 3: Scope of Work
  - Engagement objective (one sentence)
  - Scope inclusions (bullet list)
  - Scope exclusions (bullet list)
  - Key assumptions (bullet list)

Section 4: Methodology & Workplan
  - 5-phase description
  - Timeline table (Phase / Days / Activities / Deliverable)
  - Data requirements
  - Client commitment required

Section 5: Deliverables
  - 9 guaranteed deliverables with due dates (two-column table)

Section 6: Investment
  - Fee structure table (5 rows + total with guarantee box)
  - Payment terms (50/25/25%)
  - IP terms

Section 7: Credentials
  - Who we are
  - Full 14-tool toolkit listing (two-column)
  - Reference engagement template

Section 8: T&Cs + Next Steps
  - Confidentiality / conflicts / liability / governing law / validity
  - 5-step next steps panel (blue background)
  - Signature page
```

---

## 9. WEBSITE STRUCTURE

```
DN_Consultancy_Website.html — single-file, self-contained, ~133KB

Sections (in order):
  1. Fixed nav — logo, links, Engage Us CTA
  2. Hero — split layout, floating logo + stat pills, fade-in animation
  3. Ticker marquee — 11 service areas, dark background, gold separators
  4. Value Proposition — sticky left column, 4 animated cards (right)
  5. Services — 6-card grid on fog background
  6. Toolkit Spotlight — 14-tool grid
  7. Metrics Dark Band — 6-cell KPI grid (dark background)
  8. Approach — 6-step grid with phase labels
  9. Sectors — horizontal scrolling chip row
  10. CTA Band — steel blue gradient, email link
  11. Footer — brand, links, copyright

Animations: scroll-triggered fade-up, staggered card reveals,
            floating hero logo (CSS keyframes), ticker loop
```

---

## 10. CAPABILITY STATEMENT STRUCTURE

```
DN_Capability_Statement.html — A4 print-ready, ~51KB
Print to PDF: Chrome/Edge → File → Print → Save as PDF

Layout: Two-column (63mm left + remainder right)

LEFT COLUMN:
  - Vision block (dark background, italic quote)
  - Metrics grid (14 tools / 21 models / 90 days / 5× ROI)
  - Practice area chips (12 chips)
  - Regulatory framework list (8 items)
  - Geographic coverage

RIGHT COLUMN:
  - Value proposition (2 paragraphs)
  - 4-practice grid (cost / safety / revenue / strategy)
  - Toolkit strip (dark, 14 badges)
  - 5-step engagement model (timeline dots)
  - DN Difference callout box

Footer: Three-column (contact / tagline / copyright)
```

---

## 11. RECENT CONTEXT (May 2026 updates)

Since the original toolkit build, the following work has been completed in separate sessions:

### Flag-Carrier Manuals Analysis (May 2026)
- 13 Operations Manuals from a major regional flag carrier uploaded to Google Drive
- Full structural analysis completed — extracted "Template Architecture Reference" (DN/REF/FLAGCO-TAR/001/2026)
- That structure is now the master template for all DN Consultancy OM deliverables
- **Critical:** the source manuals cite KCARs 2018 (revoked) — all DN deliverables must use **KCAR 2025 (L.N. 17–51)**
- Reference OM library: Part A (698pp V13), Part B7 (Performance), Part C1 (Route Guide), Part D + 7 appendices, Part L (Runway Analysis)
- Full reference saved as `flagco-omd-reference-v2.md` in Google Drive

### ClickUp Command Centre (May 2026)
- DN Consultancy ClickUp workspace fully structured with 6 folders:
  1. 🎯 DN Strategic Vision 2025–2030
  2. 📈 DN Business Development
  3. 🛠️ DN Toolkit Development
  4. 💰 DN Revenue & Finance
  5. 🌍 DN Market Intelligence
  6. 📚 DN Knowledge Operations
- Lists, tasks, and vision documents populated under each folder

### OPSAT Product Development (May 2026)
- Active work on **OPSAT** — an AI-anchored operational safety analytics tool for sub-scale EAC operators
- Core thesis: small EAC AOCs collect more operational data than they can analyse — pattern blindness is the hidden risk
- Pricing model under development: USD 1,950/month (Standard), USD 3,200/month (Pro)
- Break-even modelled at ~3 operators
- Self-funded build — not venture-backed

---

## 12. PENDING WORK / NEXT BUILD OPPORTUNITIES

### Case-Study Carrier — Remaining Gaps
- **File 15:** Not assigned (intentional gap or potential new tool)
- **File 17:** Cadet Bond & Return of Service Tracker (discussed, not built)
- **Files 22+:** Suite can be extended — natural candidates:
  - Aircraft Performance Manual (APM) calculator
  - Passenger Compensation Claims tracker
  - Station Performance Scorecard
  - Codeshare Revenue Accounting

### DN Consultancy — Potential Next Builds
- **Prospect Carrier A proposal** (DN-P-PCA-F70100-001) — partially built, fee fields need completion
- **Prospect Carrier B AOC suite** — docs in progress, regulatory references updated to KCAR 2025
- **OPSAT MVP** — operational safety analytics product (see Section 11)
- **Flag-carrier-templated Operations Manual** — generate a compliant Part A for a new client using the flag-carrier skeleton
- **LMS Course content** — convert toolkit tools into training modules per the lms-course-creator skill

### HTML/Web
- Website needs live domain + hosting (currently static HTML)
- Dark mode toggle would improve the website
- Mobile nav hamburger menu needed for responsive use

---

## 13. KNOWN ISSUES & GOTCHAS

### Excel
1. **DataValidation `sqref +=` breaks** — always use `.add(cell_ref)` method
2. **Sheet names cannot contain `/`** — replace with `-` (e.g., `RVSM/MNPS/PBN` → `RVSM-MNPS-PBN`)
3. **MergedCell conflicts** — check for existing merges before writing to a cell
4. **Circular references** — avoid formulas that reference their own cell (fixed in D2 Airport Viability `F62`)
5. **`÷` and `×` in formulas** — openpyxl will store as formula strings, causing `#VALUE!` — use `/` and `*`

### Word (docx.js)
1. **`\n` in TextRun** — always use separate Paragraph elements
2. **`ShadingType.SOLID`** — always use `CLEAR` to prevent black cell backgrounds
3. **Missing `columnWidths`** — always set array on Table AND `width` on each cell
4. **Unicode bullets** — always use `LevelFormat.BULLET` with numbering config

### HTML
1. **Logo embedding** — must convert to base64 first (`logo_b64.txt`), then embed as data URI
2. **Capability statement print** — use Chrome or Edge for accurate A4 rendering, not Firefox
3. **Cormorant Garamond** — requires internet connection for Google Fonts; embed locally for offline

---

## 14. REGULATORY QUICK REFERENCE

### KCAA (Current — KCAR 2025, L.N. series)
```
CAR Part 8:   Flight Operations (FTL, ops manual, crew licensing)
CAR Part 65:  Flight Dispatch
CAR Part 66:  AME Licensing
CAR Part 141: Approved Training Organisations (ATOs)
CAR Part 145: Aircraft Maintenance Organisations
CAR Part 17:  Aviation Security
CAR Part 139: Aerodromes
CAA-AC-SMS009: SMS Advisory Circular
CAA-AC-OPS005C: Flight Crew Training
CAA-AC-OPS033: FDT Schemes
CAA-AC-OPS003A: Quality Management Systems
```

### ICAO Standards
```
Annex 6:  Operation of Aircraft (performance, ops procedures)
Annex 9:  Facilitation
Annex 14: Aerodromes
Annex 17: Security
Annex 19: Safety Management Systems
Doc 9859 (4th Ed.): Safety Management Manual
Doc 9587: Air Services Agreements
Doc 9868: PANS-TRG (CBTA)
```

### African Aviation Context
```
RASG-AFI accident rate: 10.59 per million sectors (2024, up from 8.36 in 2023)
Yamoussoukro Decision: AU liberalisation framework
EAC/COMESA: Regional air services frameworks
ESAC/EUROCONTROL: RVSM Height Monitoring Programme
```

---

## 15. FILE NAMING & OUTPUT CONVENTIONS

```
# DN Consultancy deliverables
DN_[DocumentName].[ext]
DN_Toolkit_AB_Toolboxes_A_and_B.xlsx
DN_Engagement_Proposal_Template.docx
DN_Consultancy_Website.html
DN_Capability_Statement.html
DN_MASTER_SKILL_REFERENCE.md

# Client workbooks (anonymised prefix)
CARRIER_[NN]_[Name].xlsx       (NN = zero-padded number)
CARRIER_14_ACMI_Wet_Lease_Workbook.xlsx
CARRIER_16_Regulatory_Audit_Tracker.xlsx

# Client proposals
DN-P-[CLIENT]-[SCOPE]-[NNN]    (document control reference)
DN-P-PCA-F70100-001            (Prospect Carrier A, F70/100, first issue)

# Build scripts
build_[description].py         (Python/openpyxl)
build_[description].js         (Node.js/docx)
```

---

## 16. QUICK-START FOR CLAUDE CODE

To resume work on this project:

1. **Verify logo files are present** — run logo prep block from Section 2 if not
2. **Check Node.js and npm** — `npm list -g docx` should return `docx@9.6.1`
3. **Check Python** — `pip show openpyxl Pillow` should confirm both installed
4. **Read `DN_MASTER_SKILL_REFERENCE.md`** from project knowledge — full brand + build specs
5. **Read project knowledge files** — especially the two toolkit Excel files for structure reference

To build a new Excel workbook:
```python
# Standard opener for any new client or DN file
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.drawing.image import Image as XLImage
from PIL import Image as PILImage

# Then follow patterns in build_dn_ab.py or build_16_audit.py
# Always: prep logo → build → validate → copy to outputs
```

To build a new Word document:
```javascript
// Standard opener — follow build_proposal.js pattern
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak, LevelFormat, ImageRun,
        UnderlineType, LineRuleType } = require('docx');
const fs = require('fs');

// Page: A4 = 11906×16838 DXA, margins 1134 each = content width 9638 DXA
```

---

*Handover prepared: May 2026 (anonymised copy)*
*DN Consultancy | Shaping Africa's Future, Together.*
*info@dnconsultancy.aero | Nairobi, Kenya*
