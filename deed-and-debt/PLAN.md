# DEED & DEBT: Build Plan (for review)

Your answers so far: build all 8 stages without stopping (each stage committed and pushed as a working build), auto-scale turns to group size, align to CEE National Standards, and use an invented town. Nothing gets coded until you approve this plan.

**Town:** Port Juniper. **Mascot:** Dex the Beaver, a beaver in a yellow hard hat with a ledger under one arm. (Beavers build infrastructure, and Dex pops up to deliver Econ Insights.)
**Location:** `deed-and-debt/` folder, like the other apps in this repo. The repo's root `index.html` is already your AI-literacy walkthrough, so the game becomes `deed-and-debt/index.html`. I'll add a section for it to the root README.

---

## A. Decisions I need you to approve (where I'd change or interpret the brief)

1. **Salary timing.** With 2 turns per Year, a player passes the start space about once every 3 Years (only 3–4 times a game). That makes income too random for the cash-flow and career lessons to work. **My recommendation:** each player gets their **annual paycheck at the start of every Year** (shown on the Annual Report), and passing **PAYDAY** (the start space) pays a **"Bonus Check" equal to 25% of salary**. If you'd rather keep "passing GO pays the full salary" exactly as written, I can, but cash flow will be lumpy and the sim will show it.
2. **Turns per Year (auto-scale).** The target is about 80 turns per game. 2 players: 4 turns each per Year. 3 players: 3 each. 4 players: 2 each. 5–6 players: 1 turn each, plus a bonus turn for half the players, alternating each Year so every player ends with the same total.
3. **No inlined GSAP or Chart.js.** Chart.js alone adds ~200 KB. I'll hand-write the few charts needed (line, stacked bar, sparklines) on 2D canvas and do all animation in CSS and small JS tweens. The file should stay around 350–450 KB.
4. **"Mortgage" keeps the Monopoly-style rule** (get 50% of value now, no rent while mortgaged, buy back at +10%), with a *Real world:* footnote explaining that a real mortgage is a monthly loan and you keep using the property. The real version is taught by the separate **Home mortgage** (rent vs. buy) and **Bank loans**.
5. **Landlord-tenant situations** are their own small deck called **"Tenant Notices"** (8 cards), drawn at Year end by one random landlord. Advanced difficulty only, as the brief says. The 500-game sim runs Standard; a separate test run on Advanced triggers every card.
6. **Old Town starts as a Historic District** (no hotels). A ballot measure can add a second one.
7. **The "mortgage" wording on property.** To avoid confusion with the home mortgage, the board action is labeled **"Mortgage (pledge to Bank)"**.

---

## B. Data model

Everything lives in one plain, serializable `state` object. The engine is a set of pure functions, `step(state, action, content) → { state, fx[] }`, where `fx` is a list of things for the renderer to animate (`move`, `cash`, `flip`, `build`, `shake`, `confetti`, …). The renderer never changes state directly. The sim loads the same `GAME_CONTENT` and engine `<script>` blocks from `index.html` in Node, so it tests the exact shipped code.

```js
state = {
  v: 1, seed, rng,                      // rng = current seeded RNG state (mulberry32), saved with the game
  groupName, createdAt, savedAt,
  settings: { years: 10, yearTimer: true, yearTimerMin: 4, turnTimer: true, turnTimerSec: 45,
              quickChecks: true, ballots: true, prePost: true, difficulty: 'standard',
              anim: 'normal', muted: false },
  flow: { screen: 'setup'|'precheck'|'careers'|'yearStart'|'ballot'|'event'|'turn'|'yearEnd'|'results',
          year, turnQueue: [playerIds], turnIdx, step: 'roll'|'moving'|'landed'|'resolve'|'done',
          doubles, pending: { kind: 'buy'|'auction'|'card'|'decision'|'debt'|'quickcheck'|'trade'|'tenant'|..., ...data } },
          // `pending` holds any open prompt, so a save made mid-prompt resumes exactly there
  economy: { phase: 'expansion'|'peak'|'recession'|'recovery', phaseYears, baseRate, inflation, cpi,
             millage, buildCost, incomeTaxBrackets, demand: { groupId: 0.5–2.0 },
             mods: [{ id, effect, yearsLeft }], bubble: false, headline },
  spaces: [{ id, owner, houses, hotel, mortgaged, zoning: 'R'|'C', historic, variance, lien,
             vacant, boughtFor, easement, corridorBoost }],          // 40 entries, dynamic data only
  players: [{
    id, name, token, cpu, strategy,                                    // strategy used by CPU only
    career: { path: 'college'|'trade'|'work', salary, startsYear, backToSchool },
    home: { mode: 'rent'|'own', switched, value, rentCost, loanId },
    cash, savings, fund, emergency,                                    // fund = index fund
    insurance: { health, property, renters },
    loans: [{ id, kind: 'bank'|'student'|'home'|'emergency'|'plan', principal, balance, rate,
              rateType: 'fixed'|'variable', years, payment, missed, collateral }],
    credit, position, audit: { inAudit, tries }, keepCards: [],
    bankruptcy: null | { type: 'ch7'|'ch13', year, planYearsLeft },
    stats: { interestPaid, taxesPaid, rentCollected, rentPaid, interestEarned, insuranceSaved,
             salaryEarned, votes, ... },
    yearly: [{ year, income, expenses, cashFlow, netWorth, cash, debt, credit, ... }],   // charts + reports
    decisions: [{ year, id, choice, value, explain }],                // best/worst decision
    checks: { pre: [], post: [] }, reflections: {}
  }],
  decks: { opportunity, civic, events, decision, tenant: { order: [], i } },   // seeded shuffles
  ballots: { used: [], results: [{ year, id, yes, no, passed }] },
  markers: [{ year, label }],           // chart markers: "Recession – Year 4"
  log: [{ year, turn, player, type, text, amount }]   // CSV export source
}
```

**Saving:** `localStorage['deedndebt:' + groupName]` is written after every action that ends a step (and always at turn end). The start screen lists saves with group name, Year, players and last-saved time, plus **Resume** and **Delete** (Delete asks to confirm).

**Year flow:** Year start (paycheck, banner "YEAR 3 of 10") → Ballot Measure (Years 3/6/9 Standard; 3/5 Short; 3/6/9/12 Long) → Life/Economy Event card → turns → Year end: annual expenses, loan payments, property tax, vacancy rolls, savings interest, index-fund returns, credit updates, Tenant Notice (Advanced), then Annual Report cards → next Year.

**Business cycle:** Expansion (2–3 Years) → Peak (1) → Recession (1–2) → Recovery (1–2) → Expansion. Each event card has a weight for each phase, and some events move the phase (for example, Recession Hits forces Recession).

**Starting numbers (tuned in the sim):** cash $500, credit 680, base rate 5%, inflation 2%, millage 20 (2% of assessed value), all Demand Indexes 1.0×.

---

## C. The board (40 spaces)

Residential = **R**, Commercial = **C**. Each color group also has an **icon and a pattern**, so color never carries meaning by itself.

| # | Space | Type | Group / zoning | List $ | Base rent |
|---|---|---|---|---|---|
| 0 | **PAYDAY** (start) | corner | Bonus Check | | |
| 1 | Cotton Mill Row | lot | 🧱 Mill Flats (brown, diagonal stripes) R | 60 | 4 |
| 2 | Civic Duty | card | | | |
| 3 | Tannery Court | lot | 🧱 Mill Flats R | 60 | 6 |
| 4 | **Income Tax** | tax | progressive brackets | | |
| 5 | **Lakeshore Line** station | rail | 🚆 | 200 | 25 / 50 / 100 / 200 |
| 6 | Aspen Way | lot | 🌲 Juniper Heights (light blue, dots) R | 100 | 8 |
| 7 | Opportunity | card | | | |
| 8 | Birch Street | lot | 🌲 Juniper Heights R | 100 | 8 |
| 9 | Cedar Lane | lot | 🌲 Juniper Heights R | 120 | 10 |
| 10 | **AUDIT** / Just Visiting | corner | (jail) | | |
| 11 | Lantern Street | lot | 🏛️ Old Town (pink, crosshatch) R, Historic | 140 | 12 |
| 12 | Juniper Power & Light | utility | ⚡ | 150 | 4× / 10× dice |
| 13 | Bell Tower Square | lot | 🏛️ Old Town R, Historic | 140 | 12 |
| 14 | Cobble Alley | lot | 🏛️ Old Town R, Historic | 160 | 14 |
| 15 | **Ironwood Line** station | rail | 🚆 | 200 | |
| 16 | Willow Bend | lot | 🌊 Riverside (orange, waves) R | 180 | 16 |
| 17 | Civic Duty | card | | | |
| 18 | Ferry Road | lot | 🌊 Riverside R | 180 | 16 |
| 19 | Heron Point | lot | 🌊 Riverside R | 200 | 18 |
| 20 | **TOWN SQUARE** | corner | (free parking; the Rail Bond measure can add a transit stop here) | | |
| 21 | Corner Market | lot | 🛒 Market District (red, checkerboard) C retail | 220 | 24 |
| 22 | **Decision Point** | dilemma | | | |
| 23 | Bazaar Row | lot | 🛒 Market District C retail | 220 | 24 |
| 24 | Main Street Shops | lot | 🛒 Market District C retail | 240 | 28 |
| 25 | **Prairie Line** station | rail | 🚆 | 200 | |
| 26 | Ledger Avenue | lot | 💼 Midtown Office (yellow, vertical stripes) C office | 260 | 30 |
| 27 | Clocktower Plaza | lot | 💼 Midtown Office C office | 260 | 30 |
| 28 | Port Juniper Water Works | utility | 💧 | 150 | |
| 29 | Exchange Street | lot | 💼 Midtown Office C office | 280 | 34 |
| 30 | **GO TO AUDIT** | corner | | | |
| 31 | Foundry Lane | lot | ⚙️ Foundry District (green, zigzag) C industrial | 300 | 36 |
| 32 | Rivet Works | lot | ⚙️ Foundry District C industrial | 300 | 36 |
| 33 | Civic Duty | card | | | |
| 34 | Steam Mill Yard | lot | ⚙️ Foundry District C industrial | 320 | 40 |
| 35 | **Harbor Line** station | rail | 🚆 | 200 | |
| 36 | Opportunity | card | | | |
| 37 | Lighthouse Drive | lot | ⚓ Harbor Point (navy, diamonds) R luxury | 350 | 38 |
| 38 | **Decision Point** | dilemma | | | |
| 39 | Bayview Terrace | lot | ⚓ Harbor Point R luxury | 400 | 50 |

**Summary:** 13 residential lots, 9 commercial lots, 4 rail lines, 2 utilities, 3 Civic Duty, 2 Opportunity, 2 Decision Point, 1 Income Tax.

**Rent with buildings:** about 5× / 15× / 40× / 55× base for 1–4 houses and 70× for a hotel. The exact numbers sit in `GAME_CONTENT` per lot and are tuned by the sim. House cost is $50 / $100 / $150 / $200 by board side, times the Build Cost Index, plus a **building permit fee** (10% of house cost).

**Zoning:**
* **R lots:** up to 4 houses, no hotel.
* **C lots:** hotels allowed. Commercial rent is about 1.2× residential, but a recession cuts commercial demand 1.5× as hard, and there's a **vacancy roll each Year** (10%; 20% in a recession) that leaves the space empty and earning nothing.
* **Variance:** costs $50. Approval chance is 45%, plus 15% if a neighboring lot is commercial, plus 10% if it's on a rail corridor, minus 15% in Harbor Point. If approved, an R lot can take a hotel.
* **Historic** lots (Old Town) can never have a hotel, even with a variance.

**Rail corridors (+25% Demand)** cover the 2 nearest lots on each side of each station:
* Lakeshore Line: Cotton Mill, Tannery, Aspen, Birch
* Ironwood Line: Bell Tower, Cobble, Willow, Ferry
* Prairie Line: Bazaar, Main St, Ledger, Clocktower
* Harbor Line: Rivet, Steam Mill, Lighthouse, Bayview
* If the Rail Bond passes, a **Town Square Transit Stop** adds a corridor for Ferry, Heron, Corner Market and Bazaar.

**Demand Index (0.5–2.0×):** recomputed each Year as
`1.0 × scarcity (+5% per owned lot in the group) × phase (expansion +10%, recession −20%; commercial ×1.5) × event/ballot mods × corridor`, then clamped.
Price and rent both scale with it. Every deed shows an ↑ or ↓ arrow and "now $X (list $Y)".

**Utilities** teach *natural monopoly* and *regulated utilities* (the Civic Duty "Rate Hearing" card caps them).

---

## D. Careers, home, money

| Path | Upfront | Debt | Salary / Year | Notes |
|---|---|---|---|---|
| 🎓 College | 4-year degree | $600 student loan, 5 Years, fixed 5% | $0 in Year 1, then $340 | highest ceiling, +3% raise each Year |
| 🔧 Trade program | 1-year program | $200 loan, 3 Years | $180 in Year 1, then $280 | "skilled-trade demand" bonus events |
| 💼 Straight to work | — | none | $220 | +2% raise each Year; can "go back to school" for $300 (or a loan), paying +$80/Year after 1 Year |

All numbers are game-scaled and tuned by the sim to hit <40% win rate per path. The results page shows a lifetime-earnings chart for all three paths, carried on to age 65, so students see the real long-run tradeoff (*Real world:* footnote cites median earnings by education level, BLS).

* **Home:**
  * **Rent** costs $120/Year, rising with inflation. Renters insurance is optional.
  * **Buy** a $900 starter home: 10% down, the rest as a 5-Year home mortgage, fixed or variable. The home appreciates with the residential Demand average. Owners pay property tax and maintenance of 1% a Year.
  * A player can switch once. *Real world:* home mortgages usually last 15–30 years.
* **Bank & Market panel (on your turn):**
  * **Savings:** APY = base rate − 2% (minimum 0.5%), compounded yearly.
  * **Index fund:** Expansion +10%, Peak +3%, Recession −15%, Recovery +14%, plus or minus seeded noise. The Crash event takes −30%.
  * **Emergency fund:** absorbs bad personal events. Funded at ≥1 Year of expenses = "Fully Funded" badge.
  * Every deposit or purchase shows a line like "This $400 in savings would be ~$520 by Year 10."
* **Insurance (yearly premiums):**
  * Health: $40, with a $50 deductible.
  * Property: 1.5% of building value, with a $50 deductible.
  * Renters: $15.
  * Outcomes show "Your insurance saved you $X."
* **Loans:**
  * Terms of 3, 4 or 5 Years, amortized annually, with the full schedule shown before signing.
  * Rate = base rate + credit premium: 800+ → +0%, 740+ → +1%, 670+ → +2%, 580+ → +4%, under 580 → +7%, and +3% more for 4 Years after bankruptcy. Variable rates start 1% lower and follow the base rate.
  * Borrowing limit is set by debt-to-income.
  * A missed payment adds a late fee ($25), −40 credit, and a second miss puts a lien on a property, then foreclosure.
  * An on-time payment year gives +15 credit. A high DTI (>40%) gives −10 a Year.
* **Taxes:**
  * **Income Tax space:** brackets 0% to $200, 10% to $500, 20% to $1,000, 30% above, applied to this Year's income so far, with a bracket breakdown animation.
  * **Property tax:** each Year, assessed value × millage.
  * **Capital gains:** 15% on profit when you sell or trade a lot for more than you paid, or when eminent domain pays out.
  * **Depreciation:** an optional deduction on rental buildings, Advanced only.
  * Unpaid tax becomes a **tax lien**.
  * Easy mode turns off taxes, credit and inflation.
* **Bankruptcy (no elimination):**
  1. Forced sales are walked through step by step: sell buildings at 50%, then mortgage lots.
  2. If the player is still short, they choose, side by side:
     * **Ch. 7-style Liquidation:** creditors take most lots (keep the 2 cheapest), debts are cleared, credit drops to ~500, restart with $200.
     * **Ch. 13-style Repayment plan:** keep everything; 70% of salary goes to creditors for 3 Years; credit drops to ~580.
  3. Friendly animation: Dex hands over a "Fresh Start" folder.
* **CPU players:** 5 strategies (residential-heavy, commercial-heavy, rail-heavy, saver/investor, balanced), each with a career and rent/buy choice. They bid up to their valuation, accept a trade if it is worth at least 110% to them, and vote from their own self-interest plus a little randomness.

---

## E. Card lists

Every card ends with a **💡 Econ Insight** (1–2 sentences) and a **📘 Vocab** term. Cards that simplify reality get a **Real world:** footnote. *(Effects below are summaries. Full 8th-grade text is written in `GAME_CONTENT`.)*

### Opportunity (24): market and choice

1. **Payday Shortcut**: advance to PAYDAY, collect your Bonus Check. *(income)*
2. **Catch the Train**: advance to the nearest station; if it's owned, pay double fare. *(network effect)*
3. **Bulk Order Discount**: your next house this turn costs 50% less. *(economies of scale)*
4. **Weekend Side Gig**: collect $60. *(income diversification)*
5. **An Investor Wants In** (choice): sell one lot for 120% of market value or say no; capital gains tax applies. *(market value, capital gains)*
6. **Bank Auction**: the Bank auctions a random unowned lot right now. *(auctions, price discovery)*
7. **Dividend Day**: if you hold the index fund, receive 4% of it. *(dividend)*
8. **"Guaranteed" 50% Return** (choice): pay $100 to a too-good-to-be-true deal; 80% chance you lose it. *(fraud, risk)* *Real world:* guaranteed high returns are a warning sign of fraud.
9. **Startup Pitch** (choice): invest $100 in a friend's startup; 1-in-3 chance it returns $400. *(risk vs. return)*
10. **Business Expo**: advance to Main Street Shops. *(commercial real estate)*
11. **Price War**: Market District rents −20% this Year. *(competition)*
12. **Shop Local Weekend**: Market District rents +30% this Year. *(demand)*
13. **Refinance Offer** (choice): refinance one loan at today's rate for a $20 fee. *(refinancing)*
14. **Comparison Shopping**: you compare prices and save $40. *(comparison shopping)*
15. **Road Construction Detour**: move back 3 spaces. *(infrastructure)*
16. **Lumber Prices Drop**: building costs −25% this Year. *(supply)*
17. **Franchise Deal** (choice): pay $150; one commercial lot gets +20% rent for the rest of the game. *(brand value, investment)*
18. **Friend Needs a Loan** (choice): lend $100; 50% chance you get $110 back, 50% chance it's never repaid. *(credit risk)*
19. **Impulse Buy?** (choice): buy a new phone for $120 or skip it; shows the opportunity cost. *(opportunity cost)*
20. **Hire an Agent** (choice): sell a lot to the Bank at full market value minus a 6% commission. *(liquidity, transaction costs)*
21. **Rent Your Spare Room**: homeowners get +$40/Year for 3 Years; renters get nothing. *(sharing economy)*
22. **Raise the Rent?** (choice): +30% rent on one lot for a Year, with a 30% chance the tenant leaves (vacant). *(price elasticity)*
23. **Paperwork Mix-up**: go to Audit. *(recordkeeping)*
24. **Grand Opening Buzz**: advance to the nearest commercial lot; if it's unowned, you may buy at 10% off. *(market entry)*

### Civic Duty (24): government, law and tax

1. **Tax Refund**: too much was withheld, collect $60. *(withholding)*
2. **Jury Duty**: you serve on a jury; collect $15 juror pay. *(civic duty)* *Real world:* juror pay is small and set by each court.
3. **Property Reassessment**: your lots' assessed value +10%, so your property tax rises. *(assessed value)*
4. **Building Code Inspection**: pay $25 per house and $100 per hotel for repairs. *(building codes)*
5. **Clean Records**: keep this card; use it to leave Audit free. *(recordkeeping)*
6. **Filing Error**: go to Audit. *(tax compliance)*
7. **Census Counts**: accurate counts bring more state and federal funding; every player gets $20. *(census, apportionment)*
8. **Register to Vote**: +1 Civic Voter point, collect $10. *(voter registration)*
9. **Utility Easement**: a power line crosses one of your lots; its value is −10% and you're paid $40. *(easement)*
10. **Eminent Domain: New Road**: the city takes your cheapest lot without buildings and pays its fair market value. *(eminent domain, "just compensation", Fifth Amendment)*
11. **HOA Dues**: pay $20 per lot in Juniper Heights and Harbor Point. *(HOA)*
12. **Permit Fee Waived**: your next building permit is free. *(incentives)*
13. **Small Business Grant**: commercial owners collect $80. *(government incentives)*
14. **Sales Tax Holiday**: save $30. *(sales tax)*
15. **Tax Records Check**: no missed payments, nothing owed; otherwise pay a $50 penalty. *(compliance)*
16. **Zoning Board Hearing**: apply for one variance at half price now. *(variance)*
17. **Public Works: New Sidewalks**: +10% Demand in your highest-value group. *(public goods)*
18. **Utility Rate Hearing**: the regulator caps utility rent at 4× dice this Year. *(regulated monopoly)*
19. **Small Claims Court**: a contractor didn't finish the job; you win $50. *(courts, contracts)*
20. **Read the Fine Print**: pay a $40 fee you agreed to in a contract. *(contracts)*
21. **Free Tax Help**: a free tax-prep program saves you $30. *(VITA)*
22. **Fair Housing Training**: landlords pay $10 for a required course on the Fair Housing Act's protected classes. *(fair housing)*
23. **City Bond Pays Interest**: collect $25. *(municipal bond)*
24. **Permit Fees Rise**: permits cost +$10 for the rest of the Year. *(fees)*

### Decision Points (12): two choices, with the outcome shown later and logged

1. **Refinance or Keep?** Refinance all loans at today's rate (+$30 fee) or keep them. The outcome is checked when rates next change.
2. **Health Insurance?** Buy now at the premium or go without. The outcome is checked at the next medical event.
3. **Job Offer Across Town**: +$40/Year salary, but $100 moving cost and +$20 rent if you're renting.
4. **Extended Warranty?** $30 covers repair events for 3 Years.
5. **Pay Down Debt or Invest?** $200 extra toward your highest-rate loan, or $200 into the index fund.
6. **Lease or Buy a Car?** Lease at $40/Year, or buy for $150 now.
7. **Co-sign for a Friend?** 30% chance they default: you pay $150 and lose 40 credit points.
8. **Night Classes?** $120 now for +$30/Year salary starting next Year.
9. **Buy Now, Pay Later?** A TV for $50/Year × 3 ($150 total) or $120 cash now.
10. **Raise Rents on All Homes?** +15% rent, with a 20% vacancy chance on each lot.
11. **Emergency Fund or Vacation?** $150 into the fund or a trip. *("Fun has value too. The game just can't measure it.")*
12. **Solar Panels for Your Home?** $200 now, saves $30/Year, and adds to the home's value (homeowners only; renters see "talk to your landlord").

### Life/Economy Events (34): one drawn each Year, weighted by economic phase

**Macro (21):**
1. **Recession Hits**: Demand −30%, commercial vacancy doubles, salaries −10% (layoffs), screen shake and gray wash.
2. **Economic Boom**: Demand +20%, salaries +5%, gold shimmer.
3. **The Fed Raises Rates**: base rate +1.5%; variable loans reprice.
4. **The Fed Cuts Rates**: base rate −1%.
5. **Inflation Spike**: inflation 7%; living costs +7%, building costs +10%, salaries +4%, rents +5%.
6. **Stock Market Crash**: index fund −30%.
7. **Housing Bubble Inflates**: residential Demand +35%, bubble flag set.
8. **Housing Bubble Pops** (only after #7): residential Demand −40%.
9. **Supply-Chain Shortage**: building costs +30% for 2 Years.
10. **Tax Reform**: new brackets (the first bracket widens and the top rate drops to 25%).
11. **New Rail Line Announced**: one station's corridor boost doubles for 2 Years (land value rises on the news). Insight: how railroads created towns.
12. **New Factory Opens**: Foundry +30%, Mill Flats +15% (workers need housing).
13. **Tech Company Moves to Midtown**: Office +30%.
14. **Online Shopping Surge**: Retail −20%, Industrial +15% (warehouses). *(creative destruction)*
15. **Remote Work Trend**: Office −20%, residential +10%.
16. **Steady Growth**: Demand +5%, a calm Year.
17. **Gas Price Spike**: living costs +10%, rail rents +25%.
18. **Recovery Begins**: Demand +10%, phase moves to Recovery.
19. **State Raises Minimum Wage**: Straight-to-work salary +$30, commercial maintenance +5%. Balanced insight: economists debate the effects.
20. **Skilled-Trade Shortage**: Trade-path players get +$80.
21. **Tourism Boom**: Harbor Point and Old Town +20%.

**Personal (13, one random player):**
22. **Inheritance**: +$200. *Real world:* a few states have inheritance taxes.
23. **Medical Bill**: $250; health insurance pays everything over the $50 deductible.
24. **Promotion**: salary +15%.
25. **Layoff**: next paycheck is cut 60%. *Real world:* unemployment insurance replaces part of lost pay.
26. **Storm Damage**: $150 plus $40 per building; property insurance covers it minus the deductible.
27. **Car Repair**: $150, paid from the emergency fund if it's funded (otherwise a high-rate emergency loan is offered).
28. **Your Lot Is Rezoned**: one of your lots switches R ↔ C.
29. **Eminent Domain: Highway**: the city takes one of your lots (not one with a hotel) and pays fair market value.
30. **Apartment Fire**: renters lose $150 of belongings; renters insurance covers it.
31. **Identity Theft**: credit −40; a dispute restores +30 next Year.
32. **Employer Tuition Help**: student loan −$150 (or +$60 if you have none).
33. **Side Business Takes Off**: +$100.
34. **Burst Pipe in a Rental**: $100 repair; property insurance covers it.

### Ballot Measures (10): 3 drawn per Standard game, no repeats

Each one has a summary, a "Yes means… / No means…" box, a fiscal impact line, and one balanced **Supporters say / Opponents say** pair.

1. **School Levy:** +3 mills; residential Demand +10%.
2. **Property Tax Cut:** −3 mills; school budget cut, residential Demand −5%.
3. **Zoning Referendum: Upzone Juniper Heights:** R → C; hotels allowed.
4. **Rezone Foundry District to Mixed Use:** allows residential conversions, Demand +10%; vacancy falls.
5. **Rail Bond:** builds the Town Square Transit Stop corridor; +1 mill for 4 Years.
6. **Historic District: Riverside:** no new hotels, Demand +10% (existing buildings grandfathered).
7. **Rent Control:** residential rents capped at inflation + 2%; renters' living cost is capped; residential prices −10%.
8. **Factory Tax Incentive:** the factory pays no property tax for 5 Years; Foundry +30%; everyone else +1 mill.
9. **Parks & Trails Bond:** +1 mill; Riverside and Juniper Heights +10%.
10. **Inclusionary Housing:** new hotels on R-variance lots must include affordable units (−15% rent), but variances get easier (+20% approval).

### Tenant Notices (8, Advanced only)

1. **Security deposit dispute:** itemize deductions; normal wear and tear can't be charged.
2. **No heat in winter:** habitability means you must repair it ($60).
3. **Tenant stops paying:** choose to file an eviction (court fee $80 plus 1 Year of lost rent while it goes through) or set up a payment plan.
4. **"Just change the locks?"** Explains that self-help lockouts are illegal; the only legal path is the court process. (Not offered as a choice that "works.")
5. **Service animal in a no-pets building:** reasonable accommodation required.
6. **Two applicants:** apply the same written criteria to both; refusing someone for a protected characteristic is illegal under the Fair Housing Act.
7. **Proper notice:** tenant gives 30 days' notice; the unit is vacant 1 Year unless it re-rents.
8. **Lead paint disclosure:** required for pre-1978 housing; pay $20 for testing.

*Real world:* landlord-tenant law varies by state and city.

### Other content

* **Quick Checks:** 24 one-question multiple-choice items, keyed to the kind of space landed on (tax, loan, rail, zoning, …). A right answer earns +$20. They can be skipped and never block play.
* **Pre/Post check:** the same 5 questions before and after (opportunity cost, compound interest, credit score, a property-tax calculation, real vs. nominal value).
* **Glossary:** 42 terms, including all the terms in your list plus natural monopoly, deductible, premium, dividend, assessment, withholding, fair market value, habitability, variance, and Chapter 7 / Chapter 13.

---

## F. Screens and UI (1366×768 first, scaled for 1920×1080)

* **Start:** saved games (Resume / Delete), New Game, How to Play, Teacher Debrief Guide.
* **Setup:** group name, 2–6 players (name plus token: 🚲 🎒 🛹 🎧 🪴 ☕ 🐢 🚀), CPU fill, teacher settings, difficulty preset. Then the pre-check (passed around privately) and the career + home picks.
* **Game screen:**
  * Economy Ticker on top.
  * Board in the center (CSS grid; the middle holds the dice, Year banner and Dex).
  * Right rail with player dashboards (cash plus real value, net worth, credit, debt, cash flow, sparklines).
  * Action bar at the bottom: Roll, Build, Bank & Market, Trade, Mortgage, Glossary, Settings, End Game Now.
* **Modals:** every card and prompt has 🔊 read-aloud and a **Why?** button, and glossary terms are tappable.
* **Results:** podium, charts, stats, awards, best/worst decision, reflection prompts, post-check, exports (copy text, CSV, print), Play Again, Debrief Guide.

## G. Build stages (each committed and pushed as a working build)

1. **Core loop:** board, dice, movement, buy/auction, rent, building, mortgage, Audit, trades, CPU, save/resume.
2. **Years and events:** Year banner, event deck, phases, Annual Report, timers, End Game Now.
3. **Econ systems:** demand, loans/credit, zoning/variance, corridors, taxes, inflation, vacancy, easement/eminent domain.
4. **Life layer:** careers, rent/buy, Bank & Market, insurance, Decision Points, bankruptcy.
5. **Civics layer:** ballots, Civic Duty deck, Tenant Notices.
6. **Animation and sound:** dice, hops, flying cash, flips, shake/shimmer, confetti, Web Audio, speed settings.
7. **Results and export:** podium, charts, awards, reflections, CSV, copy, print, pre/post, Debrief Guide.
8. **Polish and testing:** tutorial, glossary underlines, Quick Checks, keyboard/ARIA, the 500-game sim and tuning, Playwright checks (layout at both sizes, keyboard play, no network, save/resume, reduced motion), and the docs.

**Testing tools:**
* `sim/simulate.js`: Node, no dependencies, reads the engine from `index.html`; writes `sim/REPORT.md`.
* `sim/trigger-all.js`: forces every card, event, measure, Decision Point and Tenant Notice.
* `sim/ui-check.js`: Playwright, already installed in this environment.
