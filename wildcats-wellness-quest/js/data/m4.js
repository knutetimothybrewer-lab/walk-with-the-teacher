/* Mission 4 — Fact or Fiction Media Lab (18 points)
 * 5 case types x (rating 1 + evidence 2) = 15, + 3-point checklist application.
 * EVERY post, account, product and study excerpt here is FICTIONAL and labeled as such in the interface.
 * Real guidance is cited separately (NCCIH, NLM MedlinePlus "Evaluating Internet Health Information").
 * Source: Wildcats_Health_Media_Literacy deck + curriculum spec (Health media literacy). Prevalence percentages from the deck are intentionally not used.
 * Ratings: Credible / Questionable / Not Credible. Adjacent ratings earn half credit; evidence credit depends on the rating chosen.
 * Each case type has a Credible, a Questionable and a Not Credible variant across its three versions (primary: NC, Q, C, NC, Q).
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;
  var RATE = ['cred', 'ques', 'notc'], RNAME = { cred: 'Credible', ques: 'Questionable', notc: 'Not Credible' };

  function ratingOpts(key) {
    var ki = RATE.indexOf(key);
    return RATE.map(function (r, i) { return [r, RNAME[r], Math.abs(i - ki) === 0 ? 1 : Math.abs(i - ki) === 1 ? 0.5 : 0]; });
  }
  // evidence = [[id,text,level]] level: 2 strong, 1 medium (true but not decisive), 0 weak/irrelevant
  function evMatrix(key, ev) {
    var m = {}, ki = RATE.indexOf(key);
    RATE.forEach(function (r, i) {
      var d = Math.abs(i - ki); m[r] = {};
      ev.forEach(function (e) {
        var base = e[2] === 2 ? 1 : e[2] === 1 ? 0.5 : 0;
        m[r][e[0]] = d === 0 ? base : d === 1 ? Math.min(base, 0.5) : 0;
      });
    });
    return m;
  }
  function post(id, key, p, ev) {
    return V(id, '', [
      P('rating', 'Credibility rating', 'radio', ratingOpts(key), { fixed: true, hint: 'Weigh all four tabs: who, what evidence, why posted, and whether independent sources agree.' }),
      P('evid', 'Pick the 2 pieces of evidence that most strongly support YOUR rating', 'multi', ev.map(function (e) { return [e[0], e[1], 0]; }), { pick: 2, w: 2, dep: 'rating', matrix: evMatrix(key, ev),
        hint: 'Strong evidence is specific and checkable. Confidence, polish, popularity and a sales motive alone do not decide credibility.' })
    ], { vis: { type: 'post', post: p }, key: key });
  }
  function PO(platform, handle, text, author, evidence, purpose, indep, art) {
    return { platform: platform, handle: handle, text: text, tabs: { author: author, evidence: evidence, purpose: purpose, indep: indep }, art: art || 'photo' };
  }
  var CASEHINT = 'Use all four tabs. A sales motive deserves scrutiny but does not alone prove a claim false; credentials also need evidence; copies of one post are not independent verification.';
  function defCase(id, type, topic, variants) {
    W.defItem({ id: id, m: 4, st: '4.' + id.slice(-1), pts: 3, cls: 'complex', d: 'A', topic: topic, src: 'Wildcats_Health_Media_Literacy deck + NCCIH / NLM MedlinePlus evaluation frameworks', kind: 'form', hint: CASEHINT,
      why: 'Credibility comes from checkable evidence: who is behind the claim, what research actually supports it, why it was posted, and whether INDEPENDENT sources agree. Polish, popularity, confident delivery and a sales motive alone do not decide it.', variants: variants, caseType: type });
  }

  /* ---------- Case 1: fad diet ---------- */
  defCase('m4.c1', 'fad diet', 'Media literacy: fad diet claim', [
    post('m4.c1.a', 'notc', PO('Fictional feed', '@PureGlowDetox', '“5-Day Lemon Flush: toxins GONE, fatigue cured, GUARANTEED! Drink only lemon-maple juice. 10,000 happy people!”',
      'Account opened 3 weeks ago. No name or credentials.', 'Cites “a big study” with no title or link; six testimonial screenshots.', 'Links to an $89 kit with a code and a countdown: “Only 3 left!”',
      'No health group backs it. Fictional Public Health Library: juice-only cleanses are not shown to remove toxins or cure fatigue.', 'bottle'),
      [['a', 'Promises guaranteed results and cures: a miracle claim.', 2], ['b', 'Only testimonials and an unnamed study with no link.', 2], ['c', 'No independent source supports it; a health library disagrees.', 2], ['d', 'Sells a kit with a code (a motive to scrutinize).', 1], ['e', 'Thousands liked and shared it.', 0], ['f', 'The photos look bright and professional.', 0]]),
    post('m4.c1.b', 'ques', PO('Fictional feed', '@jess.eats.well', '“A protein-rich breakfast can help you feel more alert. A small study found it did! My 21-day plan is $29.”',
      '“Jess R., RDN” (fictional) lists credentials; no license number shown.', 'Fictional study: 24 adults, 3 weeks, self-reported alertness. Funded by a breakfast brand (disclosed).', 'Sells a $29 plan; also posts free tips.',
      'Two fictional articles describe similar small studies and say larger trials are needed.', 'plate'),
      [['a', 'Small, short study with a self-reported measure.', 2], ['b', 'Funded by a breakfast-food brand.', 2], ['c', 'Independent articles say larger trials are needed.', 2], ['d', 'Lists credentials, but no license to check.', 1], ['e', 'Sells a $29 plan (a motive worth noting).', 1], ['f', 'Has 50,000 followers.', 0]]),
    post('m4.c1.c', 'cred', PO('Fictional clinic page', '@HillcrestRD', '“Do juice cleanses “detox” you? Your liver and kidneys already do. A review of 12 studies found no benefit; guidance linked below.”',
      'Dr. Amara Lee, RD (fictional): hospital clinic; license number listed and checkable.', 'Links fictional national nutrition guidance and a 12-study review; explains the limits.', 'No product sold; educational account run by the clinic.',
      'A university health service and a public health library (fictional) give the same advice.', 'plate'),
      [['a', 'Cites a many-study review and public guidance, not testimonials.', 2], ['b', 'Independent organizations give the same advice.', 2], ['c', 'No product is sold; the purpose is education.', 2], ['d', 'The author is a registered dietitian (still needs checking).', 1], ['e', 'The post is long and detailed.', 0], ['f', 'It has a hospital logo.', 0]])
  ]);

  /* ---------- Case 2: supplement ad ---------- */
  defCase('m4.c2', 'supplement ad', 'Media literacy: supplement ad', [
    post('m4.c2.a', 'ques', PO('Fictional ad', 'NutraPeak (ad)', '“FocusPlus capsules: studied ingredient X may support attention. Try it for 30 days. AD”',
      'Brand account for a fictional supplement company; labeled “AD.”', 'Fictional 8-week study, 40 adults, tested a higher dose than the capsules contain; modest results.', 'Sells capsules; subscription discount.',
      'A fictional university review calls the evidence limited and mixed.', 'bottle'),
      [['a', 'The study used a higher dose than the product.', 2], ['b', 'An independent review calls the evidence limited and mixed.', 2], ['c', 'The study’s results were modest.', 2], ['d', 'Labeled ad with cautious wording (“may support”).', 1], ['e', 'Sells capsules (motive to scrutinize).', 1], ['f', 'Hundreds of five-star reviews.', 0]]),
    post('m4.c2.b', 'notc', PO('Fictional ad', 'NeuroBoost Gummies', '“Instantly boost IQ by 300%! Cures anxiety. ZERO side effects! Buy 2 get 1 free: ends in 10 minutes!”',
      'Seller page; no address, staff or credentials.', 'Only near-identical five-star reviews; no research.', 'Time-limited offer to rush a purchase.',
      'No outside tests or reviews. A fictional consumer-safety site lists it as “unverified.”', 'bottle'),
      [['a', 'Impossible claims: +300% IQ, a cure, zero side effects.', 2], ['b', 'Only similar-sounding reviews; no research.', 2], ['c', 'Pressures buyers with a 10-minute deadline.', 2], ['d', 'The seller lists no address or staff.', 1], ['e', 'The gummy packaging is colorful.', 0], ['f', 'Many people clicked.', 0]]),
    post('m4.c2.c', 'cred', PO('Fictional pharmacy ad', 'Hillcrest Pharmacy (ad)', '“People whose clinician finds low iron may be advised to take iron. Ask your clinician or pharmacist first. AD”',
      'A fictional pharmacy chain; a licensed pharmacist’s name and number are listed.', 'Links public guidance from a fictional health agency; modest claim; says ask a clinician first.', 'Sells supplements but sends readers to a clinician first.',
      'The fictional agency and a clinic site give consistent advice.', 'bottle'),
      [['a', 'Links public guidance; keeps the claim modest.', 2], ['b', 'Tells readers to ask a clinician first.', 2], ['c', 'Independent agencies give consistent advice.', 2], ['d', 'It is an ad, so keep the sales motive in mind.', 1], ['e', 'The logo looks official.', 0], ['f', 'It has many shares.', 0]])
  ]);

  /* ---------- Case 3: influencer claim ---------- */
  defCase('m4.c3', 'influencer claim', 'Media literacy: influencer claim', [
    post('m4.c3.a', 'cred', PO('Fictional feed', '@CoachDani', '“Teens need about 8–10 hours of sleep, says the CDC. Link below. Try phone-off at 10:30 this week.”',
      'Coach Dani (fictional): certified athletic trainer; certification number can be verified.', 'Links the CDC sleep page and summarizes the teen range accurately.', 'Free education; no products or codes.',
      'The CDC and pediatric guidance give the same range.', 'avatar'),
      [['a', 'Links the original CDC guidance and summarizes it accurately.', 2], ['b', 'Independent sources give the same range.', 2], ['c', 'No product sold; the purpose is education.', 2], ['d', 'The certification can be verified.', 1], ['e', 'The tone is friendly and fun.', 0], ['f', 'Many followers.', 0]]),
    post('m4.c3.b', 'ques', PO('Fictional feed', '@TeenFitTyler', '“Straight A’s after Mega Greens every morning! I also sleep 9 hours and eat breakfast. #sponsored”',
      'Tyler (fictional): teen creator, 200,000 followers, no health training.', 'One personal story; he also changed sleep and breakfast, so the drink’s effect can’t be separated.', 'Sponsored by the brand (disclosed); promo code.',
      'No independent source links greens drinks to grades.', 'avatar'),
      [['a', 'Changed several habits at once; the drink’s effect can’t be separated.', 2], ['b', 'No independent source links the drink to grades.', 2], ['c', 'One personal story, not research.', 2], ['d', 'Sponsorship is disclosed: honest, but still a motive.', 1], ['e', 'He is not a trained expert.', 1], ['f', 'He has 200,000 followers.', 0]]),
    post('m4.c3.c', 'notc', PO('Fictional feed', '@HealthTruthHank', '“Cold showers cure anxiety better than ANY treatment. Experts hide this. Don’t ask your doctor!”',
      'Anonymous; bio says “I read a lot.”', 'One personal story and “studies prove it,” none named.', 'Sells a $49 cold-plunge course; says “doctors are lying.”',
      'No independent source agrees. A fictional medical library says cold exposure doesn’t replace professional care.', 'avatar'),
      [['a', 'Tells people not to ask a doctor.', 2], ['b', '“Studies prove it,” but none named.', 2], ['c', 'No independent source agrees; a medical library disagrees.', 2], ['d', 'Sells a $49 course.', 1], ['e', 'The video is short and catchy.', 0], ['f', 'Many views.', 0]])
  ]);

  /* ---------- Case 4: manipulated before/after photo ---------- */
  defCase('m4.c4', 'before/after photo', 'Media literacy: manipulated before/after photo', [
    post('m4.c4.a', 'notc', PO('Fictional feed', '@ShredPowderPro', '“30-day transformation! Same person, same body, only my Shred Powder.”',
      'Sells fitness products; no credentials.', 'Photos differ in lighting, angle, clothes and background. The “before” is on a stock-photo site. Tiny print: “results not typical.”', 'Sells powder with a code.',
      'No trial or test supports it; only the stock-photo match is found.', 'beforeafter'),
      [['a', 'Photos differ in lighting, angle and pose, so they aren’t comparable.', 2], ['b', 'The “before” photo is on a stock-photo site.', 2], ['c', 'No independent trial or test supports it.', 2], ['d', 'Sells powder with a code (a motive).', 1], ['e', 'The “after” photo looks impressive.', 0], ['f', 'Lots of comments.', 0]]),
    post('m4.c4.b', 'ques', PO('Fictional clinic page', '@RiverbendPT', '“Meet Chris, 8 weeks into physical therapy. Shared with consent. Results vary.”',
      'Fictional physical therapy clinic; licensed therapists listed.', 'Same lighting, angle and clothes; consent given; but only one patient shown.', 'Promotes its services but says “results vary.”',
      'Matches general guidance, but gives no data on other patients.', 'beforeafter'),
      [['a', 'One patient says little about how likely results are for others.', 2], ['b', 'No data on other patients to check how common this is.', 2], ['c', 'The clinic promotes its own services.', 1], ['d', 'Consistent photos and consent are a good sign.', 1], ['e', '“Results vary” shows honest framing.', 1], ['f', 'The patient looks happy.', 0]]),
    post('m4.c4.c', 'cred', PO('Fictional university page', '@RiversideUniPosture', '“Posture study: same camera, distance and lighting for 60 participants. Averages and limits shown.”',
      'Fictional university lab; researchers and contacts listed.', 'Fixed photo protocol; measured results for all 60 shown as averages with limits.', 'Study summary; no product sold.',
      'Another fictional university found a similar result.', 'beforeafter'),
      [['a', 'Fixed photo protocol for 60 people, with averages shown.', 2], ['b', 'The study’s limits are stated openly.', 2], ['c', 'A separate university found a similar result.', 2], ['d', 'No product sold; the purpose is education.', 1], ['e', 'It has a university logo.', 0], ['f', 'The photos are large and clear.', 0]])
  ]);

  /* ---------- Case 5: AI / deepfake advice ---------- */
  defCase('m4.c5', 'AI/deepfake advice', 'Media literacy: AI-generated or deepfake advice', [
    post('m4.c5.a', 'ques', PO('Fictional video', '@WellnessWithVita (AI narrator)', '“AI narrator ‘Dr. Vita’: Sleep is the single cause of all mood problems. Sleep 9 hours and your mood will be perfect.”',
      'Labeled “AI-generated.” No person, group or credentials named.', 'No sources cited. Sleep affecting mood matches public guidance, but “single cause” and “perfect” are overstated.', 'Promotes a channel; sells nothing.',
      'Independent sources agree sleep affects mood, not that it is the only cause.', 'avatar'),
      [['a', 'No sources named, so claims can’t be checked.', 2], ['b', 'Independent sources don’t say sleep is the single cause.', 2], ['c', 'Overstated words: “perfect,” “single cause.”', 2], ['d', 'It is AI-generated, but that alone doesn’t decide truth.', 1], ['e', 'Part of it matches public guidance.', 1], ['f', 'The visuals are polished.', 0]]),
    post('m4.c5.b', 'cred', PO('Fictional health department video', '@RiversideHealthDept (AI-assisted)', '“AI-assisted summary: teens 13–17 need about 8–10 hours of sleep. Sources on screen and linked. Reviewed by our health educator.”',
      'Fictional county health department; human reviewer’s name and role listed.', 'Citations on screen and in the description link to the original guidance, which matches.', 'Public education; no product sold.',
      'The CDC and pediatric guidance give the same range.', 'avatar'),
      [['a', 'Sources shown and linked; they match the summary.', 2], ['b', 'A named human reviewed it; independent sources agree.', 2], ['c', 'No product sold; the purpose is education.', 2], ['d', 'AI help is disclosed.', 1], ['e', 'It has a health department logo.', 0], ['f', 'The narrator sounds confident.', 0]]),
    post('m4.c5.c', 'notc', PO('Fictional video', '@DrHaleOfficial?', '“Famous Dr. Hale (video): I take these gummies myself. They cure everything! Link in bio.”',
      'Account opened last week; lip-sync glitches, robotic voice; official page not linked.', 'No study cited; relies on the doctor’s apparent endorsement.', 'Link goes to a store; a countdown says the price ends tonight.',
      'The real Dr. Hale’s official page (fictional) denies endorsing gummies. A fact-check found the video synthetic.', 'avatar'),
      [['a', 'The doctor’s official page denies endorsing it.', 2], ['b', 'A fact-check found the video synthetic, with glitches.', 2], ['c', '“Cures everything” with no study cited.', 2], ['d', 'A countdown pushes a quick decision.', 1], ['e', 'The video looks very realistic.', 0], ['f', 'Many shares.', 0]])
  ]);

  /* ---------- Checklist application (3 pts) ---------- */
  var CL = [
    ['expert', 'Expertise: qualifications shown AND checkable?'],
    ['research', 'Evidence: cited research actually supports the claim?'],
    ['miracle', 'Language: miracle, instant or guaranteed wording?'],
    ['incentive', 'Purpose: product or affiliate incentive?'],
    ['pressure', 'Pressure: fear or urgency to push action?'],
    ['indep', 'Verification: independent sources can confirm it?']
  ];
  function checklist(id, text, art, tabs, ans) {
    return V(id, '', CL.map(function (c, i) {
      return P(c[0], c[1], 'radio', [['y', 'Yes', ans[i] === 'y' ? 1 : 0], ['n', 'No', ans[i] === 'n' ? 1 : 0]], { fixed: true, hint: 'Check the post’s tabs for this question.' });
    }), { vis: { type: 'post', post: { platform: 'Fictional feed', handle: art.handle, text: text, tabs: tabs, art: art.art } }, ans: ans });
  }
  W.defItem({ id: 'm4.check', m: 4, st: '4.6', pts: 3, cls: 'complex', d: 'A', topic: 'Applying a credibility checklist', src: 'Wildcats_Health_Media_Literacy deck + NLM MedlinePlus evaluation framework', kind: 'form',
    hint: 'Answer each question using only what the four tabs say, not your overall feeling.',
    why: 'A checklist checks each criterion on its own. Posts can have some strengths and some red flags; no single flag settles everything, and a verifiable credential does not replace evidence.',
    variants: [
      checklist('m4.check.a', '“HydroHero electrolyte chews: instant energy in 60 seconds, works for every athlete. Today only!”', { handle: '@HydroHero', art: 'bottle' }, {
        author: 'Sam Ortiz, sports dietitian (fictional), license number checkable.', evidence: 'One study on a different ingredient, in mice; none on these chews.', purpose: 'Sells the chews; banner says “Today only.”', indep: 'No independent source confirms the chews work.' },
        ['y', 'n', 'y', 'y', 'y', 'n']),
      checklist('m4.check.b', '“Stretch breaks help desk workers move more. Our trial of 120 employees is linked, with limits explained.”', { handle: '@OfficeWell', art: 'avatar' }, {
        author: 'Anonymous account; no names or credentials.', evidence: 'Links a fictional 120-person trial that measured movement breaks and states its limits.', purpose: 'Sells a stretching app (link in bio) but doesn’t push readers here.', indep: 'Two other fictional studies found similar results and link their data.' },
        ['n', 'y', 'n', 'y', 'n', 'y']),
      checklist('m4.check.c', '“This tea fixes sleep forever. Doctors are shocked. Order at the link in my bio.”', { handle: '@NightTeaNation', art: 'bottle' }, {
        author: 'A registered nurse (fictional); license checkable on a state site.', evidence: 'No studies cited; one customer story.', purpose: 'The page belongs to the tea shop; the link goes to its store.', indep: 'No independent source confirms it; the CDC gives sleep guidance but doesn’t mention the tea.' },
        ['y', 'n', 'y', 'y', 'n', 'n'])
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
