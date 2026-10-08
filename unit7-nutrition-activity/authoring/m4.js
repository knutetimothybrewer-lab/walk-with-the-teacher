// MISSION 4: MARKETING MANIPULATION (Food & Fitness Marketing)  -  domain "marketing"  -  13 points

// Fictional social post used to EXPLORE (not scored). Notes describe what is there and prompt questions; they do not give verdicts.
const EXPLORE = {
  post: { handle: '@coach.kaylee', followers: '230K followers', tub: 'VoltUp', sub: 'Energy Chews', ba: ['Day 1', 'Day 30'], caption: 'Triple your stamina in 3 days. No training needed!', testimonial: '"I use it every day and I feel unstoppable!" (comment from a follower)', badge: 'Lab-inspired formula', code: 'Use code KAYLEE15 for 15% off', tags: '#fitfam #stamina #teamlife #grind #athlete #energy #goals #sp', missing: 'No ingredient list, serving size or research link', likes: '61K likes' },
  notes: {
    handle: ['Account @coach.kaylee has 230K followers and a check-style badge next to the name.', 'Does a large following tell you whether a claim is true?'],
    product: ['A photo of a pouch of VoltUp Energy Chews held next to the camera.', 'Is a well-staged product photo evidence of what is inside?'],
    photo: ['Two photos labeled "Day 1" and "Day 30." The first is dim with a slouched pose; the second is brightly lit with arms raised.', 'What else could explain the difference between the two photos? Who chose and edited them?'],
    claim: ['The caption says "Triple your stamina in 3 days. No training needed!"', 'How would anyone measure "triple"? Do people usually change this much without training?'],
    testimonial: ['A follower comment: "I use it every day and I feel unstoppable!"', 'Is one person\'s feeling a test of whether a product works?'],
    badge: ['A round seal reads "Lab-inspired formula."', 'Who awarded the seal? Does "inspired" mean the product was tested?'],
    code: ['The post says "Use code KAYLEE15 for 15% off."', 'Who might earn money when that code is used?'],
    disclosure: ['The last tag in a list of eight hashtags is #sp, short for "sponsored."', 'Would a reader scrolling quickly notice it? Is it clear and upfront?'],
    missing: ['The post shows no ingredient list, no serving size and no link to research.', 'What would you need to see to judge the product?']
  }
};

const VAR = [
  { id: 'a', post: { handle: '@jade.lifts', followers: '412K followers', tub: 'SprintSip', sub: 'Recovery Powder', ba: ['Day 1', 'Day 21'], caption: 'DETOX your body and get 300% more energy in 3 days!', testimonial: '"I tried it for one week and my whole team noticed!"', badge: 'Clinically-inspired formula', code: 'Use code JADE20 for 20% off', tags: '#fitfam #grind #teenathlete #goals #sprint #hustle #energy #recovery #teamlife #sp', missing: 'No ingredient list, serving size or study linked', likes: '84.2K likes' },
    items: [['p', 'Photos labeled "Day 1" and "Day 21" taken in different lighting and poses'], ['t', '"I tried it for one week and my whole team noticed!"'], ['c', '"DETOX your body and get 300% more energy in 3 days!"'], ['d', 'The tag #sp placed last in a list of ten hashtags']] },
  { id: 'b', post: { handle: '@max.studyfuel', followers: '188K followers', tub: 'BrainBoost', sub: 'Focus Gummies', ba: ['Before', 'After 14 days'], caption: 'Cure brain fog and boost your focus 300% in 3 days!', testimonial: '"My grades went up a whole letter in one month!"', badge: 'Scientist-inspired formula', code: 'Use code FOCUS15 for 15% off', tags: '#studygram #focus #grades #teenlife #hustle #brainpower #goals #examseason #grind #partner', missing: 'No ingredient list, serving size or study linked', likes: '52.7K likes' },
    items: [['p', 'Report-card photos labeled "Before" and "After 14 days"'], ['t', '"My grades went up a whole letter in one month!"'], ['c', '"Cure brain fog and boost your focus 300% in 3 days!"'], ['d', 'The tag #partner placed last in a list of ten hashtags']] }
];

const sceneFor = (v, i) => ({
  kind: 'scene', scene: 'market', id: 'mkt-' + v.id, title: 'Marketing Investigation', block: 'm4',
  lead: 'Open the phone and click each part of the post to uncover what is there and what to ask. When you have looked at most parts, the questions unlock. The scored questions use a different post.',
  cfg: { explore: EXPLORE },
  qs: [
    { id: 'm-spots-' + v.id, slot: 'm-spots', domain: 'marketing', concept: 'marketing-tech', skill: 'identify', difficulty: 3, qt: 'identify-the-misleading-claim (clickable post)', lvl: 'AN', pts: 3, sec: 120, major: true, after: '@sim',
      type: 'spots', stim: { fig: 'post', post: v.post, regions: true },
      prompt: 'Select ALL parts of this post that are RED FLAGS: reasons to pause and verify before believing or buying. (Click parts of the post, or use the checklist.)',
      regions: [['handle', 'Account name and follower count'], ['product', 'Product photo'], ['photo', 'Before and after photos'], ['claim', 'Headline claim'], ['testimonial', 'Personal testimonial'], ['badge', 'Seal or "formula" badge'], ['code', 'Discount code'], ['disclosure', 'Hashtag list and its last tag'], ['missing', 'Missing information']],
      ans: ['photo', 'claim', 'testimonial', 'badge', 'code', 'disclosure', 'missing'],
      hints: ['Ask of each part: does it give checkable evidence, or does it try to persuade? Two parts are ordinary and not red flags.', 'A number of the red flags are about what the post does NOT show, and about who is paid.'],
      explain: 'Before/after photos, a dramatic headline claim, a personal testimonial, a vague "inspired" badge, a discount code (a financial tie), a disclosure buried in a hashtag list, and missing ingredient and research information are all red flags. The account name with its follower count and the product photo are ordinary parts of a post and are not evidence either way.' },
    { id: 'm-match-' + v.id, slot: 'm-match', domain: 'marketing', concept: 'marketing-tech', skill: 'classify', difficulty: 2, qt: 'matching', lvl: 'AP', pts: 2, sec: 80, major: true, after: '@sim',
      type: 'match', prompt: 'Match each part of the post to the marketing technique it shows.',
      items: v.items, choices: [['ba', 'Before/after imagery'], ['te', 'Testimonial (a personal story, not evidence)'], ['un', 'Unrealistic claim'], ['wd', 'Weak sponsorship disclosure'], ['ex', 'Credible expert endorsement']],
      ans: { p: 'ba', t: 'te', c: 'un', d: 'wd' }, hints: ['Decide what each example is trying to do: show a change, tell a story, promise a result, or hide who is paying.'],
      explain: 'Photos at two points in time are before/after imagery. A personal quote is a testimonial. A promise of a huge change in days is an unrealistic claim. A sponsorship tag hidden at the end of many hashtags is a weak disclosure. No expert endorsement appears in this post.' },
    { id: 'm-seq-' + v.id, slot: 'm-seq', domain: 'marketing', concept: 'pqvd', skill: 'sequence', difficulty: 2, qt: 'ranking: PAUSE-QUESTION-VERIFY-DECIDE', lvl: 'K', pts: 2, sec: 70, major: true, after: '@sim',
      type: 'seq', prompt: 'Put these actions in the order of the PAUSE, QUESTION, VERIFY, DECIDE process for this post.',
      steps: [['s1', 'Stop before clicking, buying or sharing, and notice how the post is trying to make you feel.'], ['s2', 'Ask who is paying for the post, what evidence it shows, and what is missing.'], ['s3', 'Check what the CDC, FDA, a registered dietitian or peer-reviewed research say about the claim.'], ['s4', 'Choose to skip it, share it, or look for more information, based on what the evidence shows.']],
      ans: ['s1', 's2', 's3', 's4'], hints: ['Name each step: PAUSE, QUESTION, VERIFY, DECIDE. Decide which action matches each word.'],
      explain: 'PAUSE first (stop and notice your reaction), then QUESTION (who benefits, what evidence, what is missing), then VERIFY (credible sources), and finally DECIDE based on the evidence.' }
  ]
});

export default {
  id: 'm4', num: 4, title: 'Marketing Manipulation', theme: 'ads', est: 9, kicker: 'MISSION 4',
  blurb: 'Posts, packages and promises. Separate marketing from evidence.',
  stages: [
    { kind: 'pool', id: 'mkt-pool', groups: [{ pick: 1, items: VAR.map(sceneFor) }] },
    { kind: 'q', block: 'm4b', q: {
      id: 'm-halo', domain: 'marketing', concept: 'health-halo', skill: 'explain', difficulty: 2, qt: 'package analysis', lvl: 'K', pts: 2, sec: 80, major: true,
      type: 'mc',
      stim: { fig: 'package', pkg: { name: 'Sunny Orchard Fruit Bites', claims: ['ORGANIC', 'Gluten-free', 'No artificial colors', 'Made with real fruit'], color: ['#7ed957', '#f6b93b'] }, title: 'Nutrition Facts (excerpt)', table: { cap: 'One pouch (28 g) is one serving', cols: ['', 'Per serving'], rows: [['Calories', '100'], ['Added sugars', '14 g (28% DV)'], ['Dietary fiber', '0 g']] } },
      prompt: 'Which statement best explains the HEALTH HALO effect in this example?',
      opts: [['a', 'Positive claims about one feature (organic, gluten-free) can make the whole product seem healthy, even though the label shows 14 g of added sugars (28% DV).'], ['b', 'Organic foods are always higher in nutrients, so the claims prove the fruit bites are a healthy choice.'], ['c', 'Claims on the front are regulated so strictly that a product with claims cannot contain much added sugar.'], ['d', 'The health halo effect happens only when a product has no Nutrition Facts label to check.']],
      ans: 'a', hints: ['A halo effect means one good-sounding feature changes your impression of everything else. Which option describes that, and uses the label as the check?'],
      explain: 'The health halo effect is when a positive claim about one feature leads people to assume the whole product is healthy. The label shows the product has 14 g of added sugars (28% DV) and no fiber, so the claims do not tell the whole story.' } },
    { kind: 'q', block: 'm4b', q: {
      id: 'm-sources', domain: 'marketing', concept: 'source-credibility', skill: 'evaluate', difficulty: 2, qt: 'source credibility sort', lvl: 'AP', pts: 2, sec: 80,
      type: 'sort', prompt: 'A post claims a supplement helps teens recover faster. Sort each possible source by how credible it is for checking that claim.',
      bins: [['cred', 'More credible'], ['weak', 'Less credible']],
      items: [['a', 'A CDC or NIH web page summarizing research on the topic'], ['b', 'A peer-reviewed study with a control group, published in a medical journal'], ['c', 'A registered dietitian explaining the research and linking sources'], ['d', 'The supplement company\'s own website listing customer testimonials'], ['e', 'An influencer\'s affiliate-link post with a discount code'], ['f', 'Five-star reviews on the product\'s sales page']],
      ans: { a: 'cred', b: 'cred', c: 'cred', d: 'weak', e: 'weak', f: 'weak' },
      hints: ['Ask of each source: does it rely on research and expertise, and does it gain money if you believe the claim?'],
      explain: 'Government health agencies, peer-reviewed research and registered dietitians who cite sources are credible. A company\'s own website, a paid affiliate post and reviews on a sales page all have a financial interest or are anecdotes, not evidence.' } },
    { kind: 'q', block: 'm4b', q: {
      id: 'm-study', domain: 'marketing', concept: 'influence-evidence', skill: 'evaluate', difficulty: 3, qt: 'data-table interpretation', lvl: 'AN', pts: 2, sec: 90,
      type: 'mc',
      stim: { title: 'Summary of a published experiment (Pediatrics, 2019)', table: { cap: 'Children saw mock social-media pages of popular vloggers, then chose snacks in a lab', cols: ['Detail', 'What was reported'], rows: [['Participants', '176 children, ages 9 to 11, randomly assigned to groups'], ['Group 1 saw', 'Vlogger photos with unhealthy snacks'], ['Group 2 saw', 'Vlogger photos with healthy snacks'], ['Group 3 saw', 'Vlogger photos with non-food products'], ['Group 1 vs Group 3', 'Ate about 26% more total snack calories'], ['Group 2 vs Group 3', 'No meaningful difference']] } },
      prompt: 'Which statement is the most accurate way to use this finding?',
      opts: [['a', 'It suggests posts showing unhealthy snacks can raise how much children eat right afterward in a lab, but it does not prove long-term effects for all teens.'], ['b', 'It proves that every influencer post about any food makes teens gain weight over time, so all influencer content should be treated the same way.'], ['c', 'It shows marketing has no effect on eating, because the healthy-snack group did not differ from the group that saw non-food products.'], ['d', 'It shows the result applies to every age group in every country, because the children were randomly assigned to the three groups in the study.']],
      ans: 'a', hints: ['Look at who was studied, where, and what was measured. Which option claims no more than the table supports?'],
      explain: 'The experiment measured immediate snack intake in one lab setting for 9- to 11-year-olds. It supports a careful conclusion about short-term effects of unhealthy-snack posts, but it cannot prove long-term effects, weight change, or results for all ages.' } }
  ]
};
