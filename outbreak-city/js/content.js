/* =====================================================================
   OUTBREAK CITY: CONTENT TABLES  (safe to edit)
   Mayor's Briefing deck, endings, news ticker, concept notes, reflection
   questions and tutorial text. Keep it PG-13 and school-appropriate.
   ---------------------------------------------------------------------
   EVENT OPTION FORMAT
     label  : button text
     hint   : one-line tradeoff shown under the button (optional)
     fx     : immediate effects (object) OR function(game) returning one
     result : text shown after choosing
     later  : [{ waves: n, fx: {...}, text: '...' }]  delayed consequences
   EFFECT KEYS
     budget, vaccines, trust, panic, beds     (add)
     mods: { transmission, mobility, income, uptake, reveal, selfReport,
             spawn, imports, hospitalSpeed, militiaDamage, militiaStray,
             capture, militiaTrust }                       (multiply)
           { compliance, vaxEff, cureEff }                 (add)
     temp: { waves: n, mods: {...} }   modifiers that expire
     access: { east: +0.1, ... }       district health-care access
     flags: { name: true }, inc: { spin: 1, auth: 1 }
     freeTower: 'chw'                  next tower of that type is free
     custom: 'detain'                  special-case code in sim.js
   ===================================================================== */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var D = NS.data = NS.data || {};

  D.SPEAKERS = {
    mayor:   { name: 'Mayor Penny Pruitt', role: 'Mayor', color: '#E69F00', hat: 'bun' },
    brick:   { name: 'Commander Rex Brick', role: 'City Militia', color: '#D55E00', hat: 'beret' },
    okafor:  { name: 'Dr. Amara Okafor', role: 'Chief Health Officer', color: '#009E73', hat: 'none' },
    skip:    { name: 'Skip Hollis', role: 'Deputy Press Aide', color: '#56B4E9', hat: 'cap' },
    gold:    { name: 'Thaddeus Goldworth III', role: 'Heights Golf Committee', color: '#CC79A7', hat: 'top' },
    cora:    { name: 'Cora Reyes', role: 'Eastside Tenants Union', color: '#0072B2', hat: 'none' },
    lin:     { name: 'Prof. Wen Lin', role: 'Mercy Falls University', color: '#F0E442', hat: 'none' }
  };

  /* ------------------------------------------------------------------ */
  D.EVENTS = [
    {
      id: 'honesty', speaker: 'skip', priority: true, title: 'The Numbers',
      text: 'Reporters want case counts. I drafted two press releases. One says "{true} known cases and rising." The other says "Zombies? Never heard of her." Your call, boss.',
      options: [
        { label: 'Publish the real numbers, every day', hint: 'Panic up now; trust and self-reporting up. Federal aid likes honesty.',
          fx: { panic: 8, trust: 9, flags: { honest: true }, mods: { selfReport: 1.2 } },
          result: 'The daily dashboard goes live. People are scared, but they believe you.',
          later: [{ waves: 1, fx: { budget: 110 }, text: 'Federal emergency aid arrives. Inspectors cite your "unusually believable" data.' }] },
        { label: 'Spin it: "Just a few cranky residents"', hint: 'Calmer streets today.',
          fx: { panic: -6, trust: 2, inc: { spin: 1 }, mods: { selfReport: 0.85 } },
          result: 'Skip delivers the line with a big smile. Nobody asks follow-up questions. Yet.',
          later: [{ waves: 2, fx: { trust: -18, panic: 10 }, text: 'LEAKED: the Mayor\'s office hid the real counts. Trust plummets.' }] },
        { label: 'No comment', hint: 'A small trust hit. Rumors fill the silence.',
          fx: { trust: -3, mods: { uptake: 0.95 } },
          result: 'The press corps writes "Mayor declines to comment" in 400 different fonts.' }
      ]
    },
    {
      id: 'curfew', speaker: 'brick', title: 'Lights Out, Mercy Falls',
      text: 'Commander Brick wants a 7 p.m. curfew "enforced with enthusiasm." Fewer people outside means fewer bites. It also means night-shift workers can\'t get home.',
      options: [
        { label: 'Strict curfew, militia-enforced', hint: 'Travel way down for 2 waves. Trust, income and Eastside access take hits.',
          fx: { trust: -8, inc: { auth: 1 }, temp: { waves: 2, mods: { mobility: 0.55, income: 0.85 } }, access: { east: -0.05, port: -0.04 } },
          result: 'The streets empty at 7 sharp. So do the paychecks of everyone on night shift.' },
        { label: 'Voluntary "stay-in evenings" campaign', hint: 'Modest travel drop for 2 waves; works better with high trust.',
          fx: function (g) { return { trust: 2, temp: { waves: 2, mods: { mobility: 0.95 - 0.2 * g.trust / 100 } } }; },
          result: 'Posters go up: "Stay in. Binge something. Save a neighbor."' },
        { label: 'No curfew', hint: 'Panic rises a little.',
          fx: { panic: 5 },
          result: 'Life goes on, nervously.' }
      ]
    },
    {
      id: 'schools', speaker: 'okafor', title: 'School\'s Out?',
      text: 'Schools are mixing kids from every district. Closing them cuts spread, but many Eastside families rely on school meals and can\'t stay home from work.',
      options: [
        { label: 'Close schools', hint: 'Travel down for 2 waves; income and Eastside access drop.',
          fx: { temp: { waves: 2, mods: { mobility: 0.82, income: 0.92 } }, access: { east: -0.05 }, trust: -2 },
          result: 'Schools close. Parents discover that "remote learning" also means "remote parenting."' },
        { label: 'Stay open with testing & meal programs ($70)', hint: 'Transmission down only if you have Testing Labs.',
          fx: function (g) { return g.countTowers('lab') > 0 ? { budget: -70, mods: { transmission: 0.95 }, access: { east: 0.04 }, trust: 3 } : { budget: -70, mods: { transmission: 1.04 }, trust: 1 }; },
          result: 'Schools stay open with screening at the door. It works as well as your testing system does.' },
        { label: 'Business as usual', hint: 'Transmission up.',
          fx: { mods: { transmission: 1.08 } },
          result: 'The bell rings. So does the infection curve.' }
      ]
    },
    {
      id: 'masks', speaker: 'okafor', title: 'Face Guards',
      text: 'Lab data shows a cloth face guard cuts bite-to-infection transmission. Do we require them, or just hand them out?',
      options: [
        { label: 'Mandate face guards', hint: 'Transmission down; small trust cost. Works best when trust is high.',
          fx: function (g) { return { trust: -4, inc: { auth: 0.5 }, mods: { transmission: 0.78 + 0.12 * (1 - g.trust / 100) } }; },
          result: 'Face guards become law. A man in Maple Sprawl writes a 40-page blog post about it.' },
        { label: 'Free face guards + explain why ($60)', hint: 'Smaller transmission drop; trust up.',
          fx: { budget: -60, trust: 3, mods: { transmission: 0.9 } },
          result: 'Volunteers hand out guards with a one-page explainer. Most people wear them.' },
        { label: 'Do nothing', hint: 'No change.', fx: {}, result: 'The guards stay in the warehouse.' }
      ]
    },
    {
      id: 'donors', speaker: 'gold', title: 'A Generous Offer',
      text: 'Thaddeus Goldworth III offers $280, on one condition: the next clinic goes in Gilded Heights, "where the important people live." Heights has the fewest cases in the city.',
      options: [
        { label: 'Take the money; prioritize the Heights', hint: '+$280. Heights access up, Eastside down. People notice.',
          fx: { budget: 280, access: { hill: 0.15, east: -0.04 }, flags: { donors: true } },
          result: 'A gold-plated ribbon is cut on a clinic nobody in the Heights really needed.',
          later: [{ waves: 2, fx: { trust: -7, panic: 3 }, text: 'Eastside residents learn the clinic went to the hill. Protest signs appear.' }] },
        { label: 'Decline; fund an Eastside clinic program instead (-$100)', hint: 'Eastside access up; trust up.',
          fx: { budget: -100, access: { east: 0.18 }, trust: 4 },
          result: 'Goldworth leaves in a huff. Cora Reyes shakes your hand in the parking lot.' },
        { label: 'Negotiate: split the program', hint: '+$100; small access gains for both.',
          fx: { budget: 100, access: { hill: 0.05, east: 0.05 } },
          result: 'Everyone is mildly disappointed, which is how you know it was a compromise.' }
      ]
    },
    {
      id: 'batch', speaker: 'skip', title: 'Deal of the Century',
      text: 'A company called "DocBro Pharma" is offering 400 vaccine doses at a discount. They have no safety data, but their website has a lot of flames on it.',
      options: [
        { label: 'Accept all 400 doses now', hint: '+400 doses, but lower efficacy and possible side-effect rumors.',
          fx: { vaccines: 400, mods: { vaxEff: -0.18 } },
          result: 'The doses arrive in a van with a dolphin painted on it.',
          later: [{ waves: 1, fx: { trust: -6, temp: { waves: 2, mods: { uptake: 0.8 } } }, text: 'Side-effect rumors spread about the DocBro batch. Vaccine uptake drops.' }] },
        { label: 'Reject it; wait for a tested shipment', hint: 'Extra tested doses arrive next wave.',
          fx: {},
          result: 'You say no. DocBro calls you a "hater" on social media.',
          later: [{ waves: 1, fx: { vaccines: 180 }, text: 'A tested vaccine shipment arrives from the state.' }] },
        { label: 'Test a sample first ($80)', hint: '+250 doses, safe ones only.',
          fx: { budget: -80, vaccines: 250 },
          result: 'The lab tests the batch. About two-thirds pass. You keep those.' }
      ]
    },
    {
      id: 'rumor', speaker: 'okafor', title: 'The Megaphone Guy',
      text: 'A man with a megaphone downtown says the vaccine "turns you into a zombie faster" and that zombies are "a hoax by Big Brain." Clinic lines are getting shorter.',
      options: [
        { label: 'Fund a myth-busting broadcast ($80)', hint: 'Trust up; rumor contained.',
          fx: { budget: -80, trust: 3, mods: { uptake: 1.05 } },
          result: 'Dr. Okafor goes on air with nurses and neighbors. Calm, clear, and kind of funny.' },
        { label: 'Ban the megaphone guy', hint: 'Looks like censorship. Trust down; rumor half survives.',
          fx: { trust: -6, inc: { auth: 0.5 }, mods: { uptake: 0.9 } },
          result: 'He is now "the man they tried to silence" and has twice the audience.' },
        { label: 'Ignore it', hint: 'Uptake falls for 2 waves (less if you have Radio Towers).',
          fx: function (g) { return { temp: { waves: 2, mods: { uptake: g.countTowers('radio') > 0 ? 0.88 : 0.72 } } }; },
          result: 'The rumor spreads faster than the virus. Almost.' }
      ]
    },
    {
      id: 'stockpile', speaker: 'okafor', title: 'Who Goes First?',
      text: 'We have doses for some people, not everyone. Who gets priority?',
      options: [
        { label: 'Highest risk first: crowded districts & essential workers', hint: 'Eastside & Port access up; transmission down.',
          fx: { access: { east: 0.1, port: 0.06 }, mods: { transmission: 0.95 }, trust: 2 },
          result: 'Mobile teams start with the most crowded blocks. Spread slows where it was fastest.' },
        { label: 'First come, first served', hint: 'People with cars and free time get there first.',
          fx: { access: { hill: 0.1, sub: 0.05, east: -0.05 } },
          result: 'The line at the clinic is mostly SUVs.' },
        { label: 'Random lottery', hint: 'Fair-ish. Small trust bump.',
          fx: { trust: 2 },
          result: 'Ping-pong balls decide who gets vaccinated. Everyone agrees it is at least fair.' }
      ]
    },
    {
      id: 'patrol', speaker: 'brick', title: 'Operation Clean Streets',
      text: 'Commander Brick wants armed "neighborhood patrols" in Eastside Flats. "That\'s where the trouble is," he says. Eastside has the fewest clinics.',
      options: [
        { label: 'Approve Eastside patrols', hint: 'Fewer arriving zombies; Eastside trust & access crash.',
          fx: { trust: -10, inc: { auth: 1 }, access: { east: -0.07 }, mods: { spawn: 0.9 }, flags: { patrol: true } },
          result: 'Patrols roll in. Some zombies are stopped. So is the bus. And the corner store.' },
        { label: 'Deny it', hint: 'Trust up a bit; panic up a bit.',
          fx: { trust: 2, panic: 3 },
          result: 'Brick sulks in his armored golf cart.' },
        { label: 'Patrol every district equally', hint: 'Smaller trust hit; fewer arriving zombies.',
          fx: { trust: -5, inc: { auth: 1 }, mods: { spawn: 0.92 } },
          result: 'Even Gilded Heights gets patrols. Goldworth calls to complain. Twice.' }
      ]
    },
    {
      id: 'surge', speaker: 'okafor', title: 'Surge Capacity',
      text: 'If cases spike, our hospitals will overflow. We can buy capacity now or hope for the best.',
      options: [
        { label: 'Build a surge wing ($150)', hint: '+12 beds citywide (needs at least one hospital).',
          fx: { budget: -150, beds: 12 },
          result: 'Contractors build a surge wing in record time. It smells like fresh paint and hope.' },
        { label: 'Hire traveling nurses ($90)', hint: 'Hospitals treat faster for 2 waves.',
          fx: { budget: -90, temp: { waves: 2, mods: { hospitalSpeed: 1.5 } } },
          result: 'Nurses arrive from three states away, carrying coffee.' },
        { label: 'Hope for the best', hint: 'Free. Optimistic.',
          fx: {},
          result: 'You knock on wood. The wood does not respond.' }
      ]
    },
    {
      id: 'stadium', speaker: 'brick', title: 'The Stadium Plan',
      text: 'Brick proposes rounding up everyone the labs flag as Exposed and holding them in Mercy Stadium. "Problem solved," he says, chewing a toothpick menacingly.',
      options: [
        { label: 'Detain all known-Exposed in the stadium', hint: 'Removes known cases now, but people start hiding symptoms.',
          fx: { custom: 'detain', trust: -15, inc: { auth: 2 }, mods: { selfReport: 0.6, reveal: 0.8 } },
          result: 'The stadium fills. Families wait outside the gates. Next week, far fewer people get tested.' },
        { label: 'Support home isolation with deliveries ($100)', hint: 'Compliance up across the city.',
          fx: { budget: -100, mods: { compliance: 0.14 }, trust: 3 },
          result: 'Volunteers deliver groceries and medicine to everyone isolating. Compliance jumps.' },
        { label: 'Offer free hotel rooms for isolation ($60)', hint: 'Compliance up a little.',
          fx: { budget: -60, mods: { compliance: 0.08 } },
          result: 'The Grand Mercy Hotel becomes the Grand Mercy Isolation Suites.' }
      ]
    },
    {
      id: 'influencer', speaker: 'skip', title: 'Going Viral (The Other Kind)',
      text: 'Famous streamer "xX_ZedHunter_Xx" wants to livestream from the outbreak zone. 3 million followers. Zero judgment.',
      options: [
        { label: 'Partner up for a vaccine promo', hint: 'Uptake up; a bit of panic.',
          fx: { panic: 3, mods: { uptake: 1.18 } },
          result: 'The stream "I GOT THE SHOT (NOT CLICKBAIT)" gets 4 million views.' },
        { label: 'Politely decline', hint: 'No change.', fx: {}, result: 'He streams a sandwich instead. It also gets 4 million views.' },
        { label: 'Let them do whatever', hint: 'Panic up; "zombie tourists" increase travel.',
          fx: { panic: 6, trust: -2, temp: { waves: 1, mods: { mobility: 1.15 } } },
          result: 'Thrill-seekers flood into town. Some of them leave with souvenirs. Bad ones.' }
      ]
    },
    {
      id: 'gates', speaker: 'mayor', title: 'Close the City Gates?',
      text: 'Each wave, new cases arrive from outside. We could close the highways, but trucks bring food and vaccine.',
      options: [
        { label: 'Close the gates for 2 waves', hint: 'Fewer arrivals; income and vaccine shipments drop.',
          fx: { trust: -3, temp: { waves: 2, mods: { spawn: 0.75, imports: 0.6, income: 0.85 } }, vaccines: -80 },
          result: 'The highways close. The grocery shelves get emptier.' },
        { label: 'Screen travelers at the gates ($80)', hint: 'Half as many hidden cases slip in (needs a lab to work fully).',
          fx: function (g) { return { budget: -80, mods: { imports: g.countTowers('lab') > 0 ? 0.5 : 0.75 } }; },
          result: 'Screening tents go up on every highway. Lines are long but polite.' },
        { label: 'Keep the city open', hint: 'Income up a little.', fx: { mods: { income: 1.05 } }, result: 'Trucks roll in. So does everything else.' }
      ]
    },
    {
      id: 'sickleave', speaker: 'cora', title: 'Can\'t Afford to Stay Home',
      text: 'Port and Eastside workers say: "If we stay home sick, we don\'t get paid." So they come to work Exposed.',
      options: [
        { label: 'Fund emergency paid sick leave ($120)', hint: 'Compliance & self-reporting up; Port & Eastside access up.',
          fx: { budget: -120, mods: { compliance: 0.1, selfReport: 1.2 }, access: { port: 0.1, east: 0.05 }, trust: 4 },
          result: 'For the first time, staying home sick is not a financial disaster.' },
        { label: '"Tough it out"', hint: 'Income up a little; transmission up; trust down.',
          fx: { mods: { income: 1.05, transmission: 1.06 }, trust: -5 },
          result: 'The docks stay busy. So does the virus.' },
        { label: 'Protective gear only ($50)', hint: 'Transmission down a little.',
          fx: { budget: -50, mods: { transmission: 0.96 } },
          result: 'Workers get gloves and guards. Better than nothing.' }
      ]
    },
    {
      id: 'research', speaker: 'lin', title: 'The Cure Lab',
      text: 'The university can improve treatment if we fund them now. Results take time.',
      options: [
        { label: 'Fund research ($150)', hint: 'Better cures, but only in 2 waves.',
          fx: { budget: -150 },
          result: 'Prof. Lin\'s team stops sleeping. Science happens.',
          later: [{ waves: 2, fx: { mods: { cureEff: 0.1, hospitalSpeed: 1.3, capture: 1.3 } }, text: 'BREAKTHROUGH: the university\'s improved antiviral reaches your hospitals.' }] },
        { label: 'Not now', hint: 'Keep the money.', fx: {}, result: 'Prof. Lin goes back to grading papers, sadly.' }
      ]
    },
    {
      id: 'hoarding', speaker: 'skip', title: 'Panic Buying',
      text: 'Stores are out of toilet paper, canned beans, and for some reason, pool noodles. Prices are spiking.',
      options: [
        { label: 'Ration essentials & stock pantries ($80)', hint: 'Panic down a lot; Eastside access up.',
          fx: { budget: -80, panic: -12, access: { east: 0.03 } },
          result: 'Purchase limits and pantry restocks. The pool noodle crisis ends.' },
        { label: 'Let the market sort it out', hint: 'Panic up; poorer districts hit hardest.',
          fx: { panic: 8, access: { east: -0.05, port: -0.03 } },
          result: 'The market sorts it out by giving everything to people with the fastest cars.' }
      ]
    },
    {
      id: 'mall', speaker: 'gold', title: 'Grand Re-Opening',
      text: 'The Maple Sprawl Mega Mall wants to reopen with a "Zombie Days Sale." Big tax money, big crowds.',
      options: [
        { label: 'Reopen fully', hint: '+$150; transmission up for 2 waves.',
          fx: { budget: 150, temp: { waves: 2, mods: { transmission: 1.1 } } },
          result: 'Doorbusters! The doors get busted. So do some other things.' },
        { label: 'Curbside pickup only', hint: '+$50; safe.', fx: { budget: 50 }, result: 'Cars line up. Nobody touches anyone. The mall is grumpy but solvent.' },
        { label: 'Stay closed', hint: 'Trust up a hair; income down a hair.', fx: { trust: 1, mods: { income: 0.97 } }, result: 'The mall stays dark. The food court pretzels are lost to history.' }
      ]
    },
    {
      id: 'app', speaker: 'lin', title: 'There\'s an App for That',
      text: 'A contact-tracing app could find exposed people faster. Brick wants it mandatory with full location tracking. Prof. Lin prefers an opt-in, privacy-first version.',
      options: [
        { label: 'Mandatory tracking app', hint: 'Detection up a lot; trust and privacy down.',
          fx: { trust: -8, inc: { auth: 1 }, mods: { reveal: 1.35 }, flags: { surveil: true } },
          result: 'Every phone now reports every step. Detection improves. So does paranoia.' },
        { label: 'Opt-in, privacy-first app ($60)', hint: 'Detection up (more if trust is high); trust up.',
          fx: function (g) { return { budget: -60, trust: 2, mods: { reveal: 1 + 0.3 * g.trust / 100 } }; },
          result: 'People who trust you download it. That turns out to be a lot of people.' },
        { label: 'No app', hint: 'No change.', fx: {}, result: 'Contact tracers keep using clipboards. Very sturdy clipboards.' }
      ]
    },
    {
      id: 'transit', speaker: 'cora', title: 'The Number 9 Bus',
      text: 'Buses mix people from every district. But for many Eastside residents, the bus is the only way to reach a clinic.',
      options: [
        { label: 'Shut down buses', hint: 'Travel down for 2 waves; Eastside access drops.',
          fx: { temp: { waves: 2, mods: { mobility: 0.78 } }, access: { east: -0.08 }, trust: -3 },
          result: 'The buses stop. So do clinic visits for anyone without a car.' },
        { label: 'Keep buses, add cleaning ($50)', hint: 'Transmission down slightly.',
          fx: { budget: -50, mods: { transmission: 0.97 } },
          result: 'Buses get scrubbed every hour. The drivers get hazard pay.' },
        { label: 'Free shuttles to clinics ($90)', hint: 'Uptake up; Eastside access up.',
          fx: { budget: -90, mods: { uptake: 1.12 }, access: { east: 0.08 } },
          result: 'The "Shot Shuttle" becomes the most popular ride in town.' }
      ]
    },
    {
      id: 'volunteers', speaker: 'cora', title: 'Neighbors Helping Neighbors',
      text: 'Two hundred residents have volunteered. How should we use them?',
      options: [
        { label: 'Train them as Community Health Workers', hint: 'Your next CHW team is free; trust up.',
          fx: { freeTower: 'chw', trust: 3 },
          result: 'The volunteers get training, vests and very official clipboards.' },
        { label: 'Arm them as militia auxiliaries', hint: 'Your next turret is free; trust down; more stray fire.',
          fx: { freeTower: 'militia', trust: -4, inc: { auth: 1 }, mods: { militiaStray: 1.25 } },
          result: 'Untrained volunteers get rifles. Brick is thrilled. Nobody else is.' },
        { label: 'Thank them politely', hint: 'Tiny trust bump.', fx: { trust: 1 }, result: 'Everyone gets a nice certificate.' }
      ]
    },
    {
      id: 'inspector', speaker: 'mayor', minWave: 3, title: 'The Federal Inspector',
      text: 'A federal inspector is reviewing whether Mercy Falls deserves more emergency aid. She wants to see the real data.',
      options: [
        { label: 'Open the books completely', hint: 'Honest cities get aid. Spinning cities... get caught.',
          fx: function (g) { return g.counters.spin > 0 ? { trust: -8, budget: 60, inc: { spin: 0 } } : { budget: 220, trust: 3 }; },
          result: 'The inspector reads every spreadsheet. Twice.' },
        { label: 'Stage a tidy photo op ($50)', hint: 'Looks good on camera.',
          fx: { budget: -50, trust: 2, inc: { spin: 1 } },
          result: 'You are photographed pointing at a clean whiteboard. It says "CLEAN WHITEBOARD."',
          later: [{ waves: 2, fx: { trust: -6 }, text: 'The inspector\'s report calls your photo op "a whiteboard-based distraction."' }] }
      ]
    },
    {
      id: 'language', speaker: 'cora', title: 'Lost in Translation',
      text: 'All health messages are in one language. Many Eastside and Port families speak others at home, so they\'re missing guidance.',
      options: [
        { label: 'Translate everything & partner with community radio ($60)', hint: 'Eastside & Port access up; compliance up.',
          fx: { budget: -60, access: { east: 0.1, port: 0.06 }, mods: { compliance: 0.04 }, trust: 3 },
          result: 'Messages go out in seven languages. Turnout at clinics jumps in two districts.' },
        { label: 'Too expensive, skip it', hint: 'Saves money; access and compliance slip.',
          fx: { access: { east: -0.03, port: -0.02 }, mods: { compliance: -0.03 } },
          result: 'The flyers stay one-language-only.' }
      ]
    },
    {
      id: 'premium', speaker: 'gold', title: 'Concierge Cure',
      text: 'A private company wants to open a "Platinum Recovery Spa" in the Heights, with priority treatment for those who can pay $9,000 a night.',
      options: [
        { label: 'Allow it (city gets a $110 fee)', hint: '+$110; Heights access way up; equity down.',
          fx: { budget: 110, access: { hill: 0.2 }, flags: { premium: true } },
          result: 'The spa opens with a string quartet. The Eastside clinic still has a 3-hour wait.' },
        { label: 'Cap prices and keep care public', hint: 'Trust up.',
          fx: { trust: 3 },
          result: 'The company leaves town, taking the string quartet with it.' }
      ]
    },
    {
      id: 'memorial', speaker: 'mayor', minDeaths: 40, title: 'A City in Mourning',
      text: 'Many residents have been lost. Families are asking for a memorial gathering.',
      options: [
        { label: 'Hold an outdoor vigil with safety measures ($30)', hint: 'Trust up; panic down.',
          fx: { budget: -30, trust: 5, panic: -6 },
          result: 'Candles line the river. People stand apart but together.' },
        { label: 'Ban all gatherings', hint: 'Transmission down a hair; trust down.',
          fx: { mods: { transmission: 0.97 }, trust: -3, inc: { auth: 0.5 } },
          result: 'The vigil is cancelled. Grief goes somewhere else.' }
      ]
    },
    {
      id: 'families', speaker: 'okafor', title: '"They\'re Still Our Grandparents"',
      text: 'Families of the turned are protesting at City Hall. They want hospitals to try to save freshly turned people instead of the militia just shooting them.',
      options: [
        { label: 'Adopt a "treat-first" policy', hint: 'Hospitals catch more fresh zombies; militia costs more trust.',
          fx: { trust: 4, mods: { capture: 1.5, militiaTrust: 1.3 } },
          result: 'Hospital teams get new protocols for "early turners." Brick rolls his eyes so hard he sprains something.' },
        { label: 'Adopt a "shoot-first" policy', hint: 'Militia damage up; trust down.',
          fx: { trust: -6, inc: { auth: 1 }, mods: { militiaDamage: 1.2 } },
          result: 'Brick gets bigger bullets. The protesters get louder.' }
      ]
    },
    {
      id: 'evictions', speaker: 'cora', title: 'Eviction Notices',
      text: 'Landlords are evicting people who lost work in the outbreak. Evicted families move in with relatives across the city.',
      options: [
        { label: 'Pass an eviction moratorium ($40)', hint: 'Less travel; Eastside access up.',
          fx: { budget: -40, mods: { mobility: 0.93 }, access: { east: 0.05 }, trust: 2 },
          result: 'Families stay put. So does the virus, more or less.' },
        { label: 'Allow evictions', hint: 'Travel and panic up.',
          fx: { mods: { mobility: 1.1 }, panic: 4, access: { east: -0.04 } },
          result: 'Moving trucks everywhere. Each one a little mixing machine.' }
      ]
    },
    {
      id: 'blame', speaker: 'skip', title: 'The Blame Game',
      text: 'Talk radio is blaming Eastside Flats for the outbreak. Some people now hide symptoms so they won\'t be blamed.',
      options: [
        { label: 'Publicly reject the blame and stigma', hint: 'Trust & self-reporting up.',
          fx: { trust: 4, mods: { selfReport: 1.15 } },
          result: 'You say it plainly: viruses don\'t check addresses. People start coming forward again.' },
        { label: 'Stay quiet', hint: 'Self-reporting down; trust down.',
          fx: { trust: -3, mods: { selfReport: 0.85 } },
          result: 'Silence is heard as agreement.' },
        { label: 'Lean in: "Eastside should get its act together"', hint: 'Calms the Heights. Stigma makes people hide.',
          fx: { panic: -3, trust: -7, mods: { selfReport: 0.7 }, access: { east: -0.05 }, inc: { spin: 1 } },
          result: 'The Heights applauds. Eastside stops answering contact tracers\' calls.' }
      ]
    },
    {
      id: 'neighbor', speaker: 'mayor', title: 'A Neighbor in Need',
      text: 'The town of Oak Hollow, just up the highway, is out of vaccine. They ask to borrow 100 doses.',
      options: [
        { label: 'Share 100 doses', hint: 'Lose doses now...',
          fx: { vaccines: -100, trust: 1 },
          result: 'A truck heads up the highway with a bow on it.',
          later: [{ waves: 2, fx: { vaccines: 220, mods: { imports: 0.85 } }, text: 'Oak Hollow controlled its outbreak, sent back extra doses, and fewer cases now arrive from up the highway.' }] },
        { label: 'Refuse', hint: 'Keep your doses.',
          fx: {},
          result: 'Oak Hollow sends a sad emoji.',
          later: [{ waves: 2, fx: { mods: { imports: 1.15, spawn: 1.05 } }, text: 'Oak Hollow\'s outbreak spills over. More cases arrive from up the highway.' }] }
      ]
    },
    {
      id: 'wastewater', speaker: 'lin', title: 'What the Sewers Know',
      text: 'Prof. Lin can monitor sewer water for virus traces. It won\'t name individuals, but it shows which buildings are heating up, citywide.',
      options: [
        { label: 'Fund wastewater monitoring ($90)', hint: 'See infection pressure on every building.',
          fx: { budget: -90, flags: { wastewater: true } },
          result: 'Sensors go into the sewers. The city map lights up with early warnings.' },
        { label: 'Skip it', hint: 'Keep the money.', fx: {}, result: 'The sewers keep their secrets.' }
      ]
    },
    {
      id: 'bounty', speaker: 'brick', title: 'Cash for Zombies',
      text: 'Brick wants to pay militia a bounty per zombie stopped. "Incentives!" he shouts, to no one in particular.',
      options: [
        { label: 'Pay bounties', hint: '$3 per militia kill; more stray fire; trust down.',
          fx: { flags: { bounty: true }, mods: { militiaStray: 1.3 }, trust: -3 },
          result: 'The militia gets very, very motivated.' },
        { label: 'No bounties', hint: 'No change.', fx: {}, result: 'Brick mutters something about "the free market."' }
      ]
    }
  ];

  /* ------------------------------------------------------------------ */
  D.ENDINGS = {
    collapse: {
      title: 'Collapse', art: 'collapse',
      headline: 'CITY COUNCIL MEETING CANCELLED DUE TO EVERYONE BEING A ZOMBIE',
      sub: 'Mercy Falls falls. Officials "still assessing the situation" from a helicopter.',
      body: 'The outbreak outran every response. Hidden cases spread faster than the city could find, treat or protect people.'
    },
    zombieMayor: {
      title: 'Secret Ending: The Mayor Was a Zombie', art: 'zombieMayor', secret: true,
      headline: 'INVESTIGATION: MAYOR HAS BEEN A ZOMBIE SINCE WAVE 3; APPROVAL RATING UNCHANGED',
      sub: 'Press office insists the groaning was "a policy position."',
      body: 'You spun the numbers again and again. When trust collapses this far, nobody can tell the truth from the zombie anymore.'
    },
    modelCity: {
      title: 'Secret Ending: Model City', art: 'modelCity', secret: true,
      headline: 'MERCY FALLS NAMED "LEAST APOCALYPTIC CITY"; OTHER CITIES ASK WHAT THE TRICK WAS',
      sub: 'The trick was testing, vaccines, care, trust and fairness. Also no turrets.',
      body: 'You beat the outbreak without a single gun, kept trust high and protected every district fairly. That is what public health looks like when it works.'
    },
    hollow: {
      title: 'Hollow Victory', art: 'hollow',
      headline: 'OUTBREAK OVER; CITIZENS NOT ALLOWED TO SAY SO WITHOUT A PERMIT',
      sub: 'Searchlights stay on "just in case." Nobody remembers what "just in case" means.',
      body: 'You controlled the outbreak, but by force. Trust is gone, rights were trampled, and the next emergency will be much harder.'
    },
    twoTier: {
      title: 'Two-Tier City', art: 'twoTier',
      headline: 'HEIGHTS HOSTS "POST-OUTBREAK GALA"; EASTSIDE STILL WAITING FOR FIRST CLINIC',
      sub: 'Officials call the recovery "a success, depending on your zip code."',
      body: 'The city survived, but protection went to people who already had the most. Deaths piled up where access was lowest.'
    },
    eradication: {
      title: 'Eradication', art: 'eradication',
      headline: 'LAST ZOMBIE CURED; RETIRES TO FLORIDA',
      sub: 'Health officials cautiously optimistic, immediately start planning for the next one.',
      body: 'You found hidden cases, protected people before exposure, treated the sick and kept the public with you. The outbreak is over.'
    },
    endemic: {
      title: 'Controlled Endemic', art: 'endemic',
      headline: 'ZOMBIES NOW "JUST A SEASONAL THING," SAYS CITY; RESIDENTS ADVISED TO GET ANNUAL BOOSTER',
      sub: 'Zombie season now falls between allergy season and tax season.',
      body: 'The city survived and the outbreak is under control, but not gone. It will keep coming back unless immunity and surveillance stay strong.'
    }
  };

  /* ------------------------------------------------------------------ */
  D.TICKER = {
    filler: [
      'LOCAL OFFICIAL ASSURES PUBLIC ZOMBIES "TOTALLY FINE"',
      'MAN WHO "DID HIS OWN RESEARCH" STILL RESEARCHING',
      'WEATHER: CLOUDY WITH A CHANCE OF SHAMBLING',
      'MERCY FALLS LIBRARY EXTENDS DUE DATES "UNTIL FURTHER NOTICE OR UNDEATH"',
      'SURVEY: 9 OUT OF 10 ZOMBIES PREFER UNVACCINATED NEIGHBORHOODS',
      'HIGH SCHOOL HEALTH CLASS SUDDENLY VERY POPULAR',
      'HANDWASHING STILL WORKS, EXPERTS REPEAT FOR 400TH TIME',
      'LOCAL DOG UNIMPRESSED BY APOCALYPSE',
      'CITY REMINDS RESIDENTS: A "MYSTERY BITE" IS NOT A FUN SURPRISE',
      'GOLF COURSE REMAINS OPEN, "FOR MORALE"',
      'PODCAST HOSTS EXPLAIN EPIDEMIOLOGY, INCORRECTLY, FOR 3 HOURS',
      'TRAFFIC: BRIEF DELAYS ON 5TH STREET DUE TO SLOW-MOVING UNDEAD'
    ],
    waveStart: ['WAVE {w}: NEW ARRIVALS SPOTTED ON THE HIGHWAY', 'OFFICIALS URGE CALM AS WAVE {w} BEGINS', 'BREAKING: MORE ZOMBIES. WE CHECKED. TWICE.'],
    firstBite: ['RESIDENT BITTEN, FEELS "PRETTY OKAY ACTUALLY" (THAT IS THE PROBLEM)'],
    firstTurn: ['NEIGHBOR WHO "SEEMED FINE YESTERDAY" IS NO LONGER FINE'],
    stray: ['STRAY FIRE HITS BYSTANDER; MILITIA CALLS IT "A LEARNING MOMENT"', 'RESIDENTS ASK WHY THE TURRET IS POINTED AT THE BUS STOP', 'CIVILIAN HIT BY MILITIA FIRE; TRUST IN CITY HALL DROPS'],
    overflow: ['HOSPITAL BEDS FULL; PATIENTS TREATED IN PARKING LOT', 'NURSES: "WE NEED MORE BEDS, NOT MORE THANK-YOU POSTERS"'],
    lowTrust: ['POLL: RESIDENTS TRUST CITY HALL LESS THAN A WEATHER APP', 'PROTESTERS DEMAND "LITERALLY ANY STRAIGHT ANSWER"'],
    highPanic: ['PANIC BUYING REACHES POOL NOODLE AISLE', 'RESIDENTS FLEE ACROSS TOWN, ACCIDENTALLY SPREADING THE THING THEY ARE FLEEING'],
    vaccinate: ['CLINIC LINE WRAPS AROUND THE BLOCK; FREE STICKERS CITED', 'GRANDMA GETS SHOT, CALLS IT "A LITTLE PINCH FOR A LOT OF PEACE"'],
    cure: ['FIELD HOSPITAL DISCHARGES RECOVERED PATIENTS; BALLOONS INVOLVED', 'FORMER ZOMBIE SAYS HE "MOSTLY REMEMBERS WANTING SNACKS"'],
    reveal: ['TESTING LAB FINDS HIDDEN CASES BEFORE THEY TURN', 'CONTACT TRACERS: "WE JUST CALL PEOPLE. IT WORKS."'],
    barricades: ['BARRICADES CUT OFF NEIGHBORHOODS; CORNER STORES STRUGGLE'],
    militiaMany: ['MORE TURRETS, MORE NOISE: "THE GUNFIRE DRAWS THEM IN," WARNS EXPERT'],
    calm: ['CASES FALLING; RESIDENTS CAUTIOUSLY RETURN TO ARGUING ABOUT PARKING'],
    carrier: ['LAB UNMASKS A "CARRIER": LOOKED HEALTHY, WAS NOT'],
    mega: ['SUPER-SPREADER SIGHTED ON THE HIGHWAY; EXPERTS: "THAT IS A VERY LARGE BOY"', 'GIANT ZOMBIE INFECTS ENTIRE BIRTHDAY PARTY; CAKE UNHARMED'],
    rising: ['CASES RISING FAST; R-NUMBER ABOVE {r}', 'EXPERTS: "EACH CASE IS MAKING MORE THAN ONE NEW CASE. THAT IS BAD."'],
    consequence: ['UPDATE: {text}']
  };

  /* ------------------------------------------------------------------
     Concept notes: "what really happened in real life" (factual, short). */
  D.CONCEPTS = {
    r0: { name: 'R0 and R_eff (reproduction number)', text: 'R0 is how many people one case infects in a fully susceptible population. R_eff is the number right now, after immunity and interventions. Above 1, outbreaks grow; below 1, they shrink.',
      real: 'Measles has an R0 of about 12 to 18, so it needs about 95% immunity to stop spreading. Public health agencies track R_eff to see whether measures are working.' },
    incubation: { name: 'Incubation period', text: 'The time between infection and symptoms. People can look healthy while infected, and with some diseases they can spread it before they feel sick.',
      real: 'Incubation periods vary: about 2 days for flu, up to 21 days for Ebola. That is why quarantine periods are based on the longest likely incubation.' },
    prevention: { name: 'Primary, secondary and tertiary prevention', text: 'Primary prevention stops infection (vaccines). Secondary prevention catches it early (screening, testing). Tertiary prevention treats it to reduce harm (hospitals).',
      real: 'Real health systems use all three. Vaccines prevent disease, screening finds it early, and treatment limits the damage.' },
    herd: { name: 'Herd (community) immunity', text: 'When enough people are immune, an infection can\'t find new hosts fast enough, so even unprotected people are safer.',
      real: 'Vaccination programs eliminated smallpox worldwide (certified in 1980) and greatly reduced polio, using high coverage and surveillance.' },
    surveillance: { name: 'Surveillance and contact tracing', text: 'Public health surveillance means systematically collecting data to detect and track disease. Contact tracing finds people exposed to a case.',
      real: 'Contact tracing has been used for decades against tuberculosis, sexually transmitted infections and Ebola. Wastewater monitoring was widely adopted during COVID-19.' },
    quarantine: { name: 'Quarantine vs. isolation', text: 'Isolation separates people who are sick or infected. Quarantine separates people who were exposed and might become sick. Both work better when people are supported.',
      real: 'Studies show people comply more with isolation when they get paid leave, food and housing support. Coercive measures can drive people to hide symptoms.' },
    sdoh: { name: 'Social determinants of health', text: 'The conditions where people live, work and play (income, housing, transportation, language, job type) shape their health and their ability to follow advice.',
      real: 'In many outbreaks, essential workers and people in crowded housing had higher infection rates because they could not stay home, not because of personal choices.' },
    equity: { name: 'Health equity', text: 'Everyone should have a fair chance to be healthy. That often means directing more resources to communities with less access.',
      real: 'Community health workers, mobile clinics and translated materials have repeatedly increased vaccine uptake in underserved neighborhoods.' },
    riskcomm: { name: 'Risk communication', text: 'Clear, honest, timely communication from trusted messengers. Spinning or hiding bad news destroys the trust you need later.',
      real: 'Public health guidance is to "be first, be right, be credible." When officials were caught hiding outbreak data, trust and cooperation fell.' },
    ethics: { name: 'Public health ethics', text: 'Autonomy (respect choices), beneficence (do good), non-maleficence (avoid harm), justice (fair distribution) and proportionality (least restrictive measure that works).',
      real: 'Ethicists ask whether a restriction is necessary, effective, proportional, fair and as short as possible. History includes forced quarantines that targeted marginalized groups.' },
    superspread: { name: 'Super-spreading', text: 'Most infected people infect few others, but a small number infect many. Crowded indoor places and long contact make super-spreading more likely.',
      real: 'In many outbreaks (SARS, measles, COVID-19), roughly 20% of cases caused about 80% of the spread. Limiting large indoor gatherings and boosting immunity target this.' },
    essential: { name: 'The 10 Essential Public Health Services', text: 'A national framework describing what public health systems do, from monitoring health to building equitable access and strong infrastructure.',
      real: 'The 10 Essential Public Health Services were updated in 2020 to put equity at the center of the framework.' }
  };

  /* The 10 Essential Public Health Services (2020 version, short labels) */
  D.ESSENTIAL_SERVICES = [
    { n: 1, label: 'Assess and monitor population health', how: 'Build Testing Labs or fund wastewater monitoring' },
    { n: 2, label: 'Investigate, diagnose and address health hazards', how: 'Reveal Exposed cases and carriers; contact tracing' },
    { n: 3, label: 'Communicate effectively to inform and educate', how: 'Radio Towers, honest numbers, myth-busting' },
    { n: 4, label: 'Strengthen, support and mobilize communities', how: 'Community Health Workers, volunteers, pantries' },
    { n: 5, label: 'Create, champion and implement policies', how: 'Make Mayor\'s Briefing decisions that protect health' },
    { n: 6, label: 'Utilize legal and regulatory actions', how: 'Mandates, quarantine barricades, curfews (with their costs)' },
    { n: 7, label: 'Assure an effective system that enables equitable access', how: 'Put clinics and hospitals where access is lowest' },
    { n: 8, label: 'Build and support a diverse and skilled workforce', how: 'CHW teams, nurses, hospital upgrades' },
    { n: 9, label: 'Improve and innovate through evaluation and research', how: 'Fund cure research; use data to adjust' },
    { n: 10, label: 'Build and maintain a strong organizational infrastructure', how: 'Hospital capacity, surge planning, budgeting' }
  ];

  /* Real-world notes per tower (shown in info panels and the report) */
  D.TOWER_REAL = {
    militia: 'Force can stop what it can see, but outbreaks spread through people who look healthy. Heavy-handed enforcement in real epidemics has often reduced cooperation and harmed communities that were already over-policed.',
    lab: 'Testing and contact tracing find infections before they spread further. They are the "eyes" of public health. Without them, officials are guessing.',
    clinic: 'Vaccines train the immune system before exposure. High coverage protects whole communities, including people who can\'t be vaccinated.',
    hospital: 'Hospitals save lives, but they have a fixed number of beds and staff. "Flattening the curve" was about keeping cases below hospital capacity.',
    barricade: 'Travel restrictions can delay spread, but rarely stop it, and they disrupt food, jobs and care. Real health agencies weigh benefits against these costs.',
    radio: 'Clear, honest, repeated messages from trusted sources increase protective behavior. Misinformation spreads fast, so communication has to be faster.',
    chw: 'Community health workers are trusted local people trained in basic health support. They have improved care in underserved communities around the world.',
    pantry: 'Food, rent and paid leave support make isolation possible. Without them, asking people to stay home asks them to choose between health and survival.'
  };

  /* Meter help text */
  D.METERS = {
    budget: { name: 'Budget', text: 'Money to build and upgrade. Comes from taxes (healthy, working residents) and emergency grants after each wave.' },
    vaccines: { name: 'Vaccine Stock', text: 'Doses available to clinics. Shipments arrive after each wave. Run out and clinics stop.' },
    beds: { name: 'Hospital Capacity', text: 'Beds in use / total beds. When full, sick people can\'t get treated. That is surge capacity.' },
    trust: { name: 'Public Trust', text: 'How much residents believe and cooperate with you. Drives compliance with isolation and vaccine uptake. Hurt by force, spin and deaths; helped by honesty and communication.' },
    panic: { name: 'Panic', text: 'Fear in the streets. Panicked people flee across town (spreading infection), buy everything, and follow guidance less.' },
    equity: { name: 'Equity Index', text: 'How fairly protection and outcomes are shared across districts (100 = perfectly fair). Starts low because some districts begin with far less health-care access.' },
    reff: { name: 'R_eff (estimate)', text: 'Average new infections caused by each infected person right now. Above 1 = growing outbreak. Below 1 = shrinking. Estimates are more reliable with Testing Labs.' },
    counts: { name: 'Who is who', text: 'Healthy = not infected. Known Exposed = infected but not yet turned, found by testing. Infected = active zombies. Dead = lost residents. Many Exposed cases stay hidden unless you test.' }
  };

  /* ------------------------------------------------------------------
     Reflection questions: generated from what the student actually did.
     Each has a condition on the report stats object r (see sim.js report()). */
  D.REFLECTIONS = [
    { when: function (r) { return r.towerCounts.militia >= 4 && r.towerCounts.lab === 0; }, q: 'You relied heavily on Militia Turrets and never built a Testing Lab. Why didn\'t shooting visible zombies stop the outbreak? What were you missing?' },
    { when: function (r) { return r.strayDeaths > 0; }, q: 'Militia stray fire killed {strayDeaths} residents. How do you weigh "containment by force" against harm to bystanders? Which ethical principles are in tension?' },
    { when: function (r) { return r.detectionRate < 0.35; }, q: 'Only about {detectionPct}% of infections were ever detected. How does an incubation period with no symptoms make an outbreak harder to control?' },
    { when: function (r) { return r.detectionRate >= 0.35; }, q: 'You detected about {detectionPct}% of infections. How did finding Exposed people early (secondary prevention) change what your hospitals and clinics could do?' },
    { when: function (r) { return r.vaxCoverage < 0.3; }, q: 'Only {vaxPct}% of residents were vaccinated. What stopped coverage from getting higher: stock, trust, clinic placement or something else? What would herd immunity have required?' },
    { when: function (r) { return r.vaxCoverage >= 0.3; }, q: '{vaxPct}% of residents were vaccinated. How did protecting people before exposure (primary prevention) change your epidemic curve?' },
    { when: function (r) { return r.equity < 45; }, q: 'Your final Equity Index was {equity}. The worst-hit district was {worstDistrict}. What social determinants of health made that district more vulnerable from the start?' },
    { when: function (r) { return r.equity >= 45; }, q: 'You kept equity at {equity}. Which choices helped protection reach the districts that started with the least access?' },
    { when: function (r) { return r.spin > 0; }, q: 'You spun or hid the numbers {spin} time(s). What happened to trust later? Why is honest risk communication important even when the news is bad?' },
    { when: function (r) { return r.flags.honest; }, q: 'You published honest numbers even though it raised panic. Was it worth it? What did honesty buy you later in the game?' },
    { when: function (r) { return r.auth >= 3; }, q: 'You chose several coercive measures (curfews, patrols, detention, tracking). Were they proportional? Which could have been replaced with less restrictive options?' },
    { when: function (r) { return r.overflowSeconds > 20; }, q: 'Your hospitals were full for about {overflowSeconds} seconds. What does "flattening the curve" mean, and how does surge capacity connect to deaths?' },
    { when: function (r) { return r.peakR > 1.5; }, q: 'Your R_eff peaked around {peakR}. What does that number mean, and which of your actions brought it down (or failed to)?' },
    { when: function (r) { return r.towerCounts.barricade >= 4; }, q: 'You built {barricades} quarantine barricades. What is the difference between quarantine and isolation, and what did the barricades cost the city?' },
    { when: function (r) { return r.towerCounts.chw === 0; }, q: 'You never deployed Community Health Workers. How might trusted local messengers have changed uptake in Eastside Flats or Rustwater Port?' },
    { when: function (r) { return r.megaInf >= 15; }, q: 'Super-Spreaders caused {megaInf} infections in your city. In real outbreaks, what kinds of places and events lead to super-spreading, and how can public health reduce them?' },
    { when: function (r) { return r.ruined >= 10; }, q: '{ruined} buildings were completely overrun. Which neighborhoods were they in, and what could have protected them earlier?' },
    { when: function () { return true; }, q: 'If you replayed this exact outbreak (seed {seed}), what is the first thing you would do differently, and why?' },
    { when: function () { return true; }, q: 'Which of the 10 Essential Public Health Services did your strategy use the most? Which did you neglect?' }
  ];

  /* ------------------------------------------------------------------
     Tutorial: a playable first wave. `until` names a condition in ui.js. */
  D.TUTORIAL = [
    { id: 'hello', text: 'Welcome, Acting Health Commissioner! This is {city}. Drag to move the map and scroll or pinch to zoom.', until: 'next' },
    { id: 'lab', text: 'Some residents are already infected but look healthy. Only testing can find them. Press 2 (or tap the Testing Lab below) and place it near the glowing building.', until: 'built:lab', highlight: 'lab' },
    { id: 'militia', text: 'Zombies will arrive by road. A Militia Turret (1) stops the ones you can see. Put one near the flashing road entrance.', until: 'built:militia', highlight: 'militia' },
    { id: 'start', text: 'Ready? Press "Start Wave" (or Enter). You can keep building while the wave runs.', until: 'wave', highlight: 'start' },
    { id: 'exposed', text: 'Orange ◆ markers are known Exposed people your lab found. They\'ll turn into zombies after their incubation period unless they\'re treated.', until: 'reveal' },
    { id: 'hospital', text: 'Build a Field Hospital (4) near known Exposed cases. It cures people before they turn.', until: 'built:hospital', highlight: 'hospital' },
    { id: 'clinic', text: 'A Vaccination Clinic (3) protects people before they\'re ever bitten. Watch your vaccine stock at the top.', until: 'built:clinic', highlight: 'clinic' },
    { id: 'meters', text: 'Watch Trust, Panic and Equity at the top, and R_eff (below 1 means you are winning). Hover any meter to learn more. Good luck!', until: 'next' }
  ];

  D.TITLE_TAGLINES = [
    'A public health tower defense. Shooting is the easy part.',
    'You can\'t shoot your way out of an epidemic. (You can try.)',
    'Flatten the curve. Not the citizens.'
  ];
})(typeof window !== 'undefined' ? window : globalThis);
