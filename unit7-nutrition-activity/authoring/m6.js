// MISSION 6: FOOD SYSTEM (Food, Inc. 2 ideas and food-systems thinking)  -  domain "systems"  -  21 points
export default {
  id: 'm6', num: 6, title: 'Food System', theme: 'earth', est: 11, kicker: 'MISSION 6',
  blurb: 'From farm to fork: incentives, consolidation, access, evidence and policy. Health choices happen inside a food environment.',
  stages: [
    { kind: 'q', block: 'm6a', q: {
      id: 's-def', domain: 'systems', concept: 'food-vocab', skill: 'define', difficulty: 1, qt: 'matching', lvl: 'K', pts: 2, sec: 70,
      type: 'match', prompt: 'Match each term to the description that fits it best.',
      items: [['t1', 'Food environment'], ['t2', 'Consolidation'], ['t3', 'Food insecurity'], ['t4', 'Resilience']],
      choices: [['x1', 'The foods that are available, affordable and marketed where a person lives, learns and shops'], ['x2', 'A few large companies controlling a growing share of a part of the food system, such as processing'], ['x3', 'A household\'s limited or uncertain access to enough food because of lack of money or other resources'], ['x4', 'A system\'s ability to keep supplying food and recover when something disrupts it'], ['x5', 'Foods made mostly from industrial ingredients and additives']],
      ans: { t1: 'x1', t2: 'x2', t3: 'x3', t4: 'x4' }, hints: ['Pick the description that names who or what is being described: a place, a market structure, a household condition, or a system\'s ability.'],
      explain: 'The food environment is what is available, affordable and marketed around you. Consolidation is when a few companies control more of a market. Food insecurity is a household condition tied to resources. Resilience is the ability to keep supplying food and recover from disruption.' } },
    { kind: 'q', block: 'm6a', q: {
      id: 's-network', domain: 'systems', concept: 'causal-chain', skill: 'map causes', difficulty: 3, qt: 'cause-and-effect mapping', lvl: 'AN', pts: 3, sec: 140, major: true,
      type: 'multi', stim: { fig: 'net' },
      prompt: 'Each arrow in the list means "directly leads to." Select ALL the arrows that are well supported as cause-and-effect links in the food system.',
      opts: [['e1', 'Farm subsidies and crop-insurance incentives → large supply of corn and soy'], ['e2', 'Large supply of corn and soy → cheap ingredients for processed foods'], ['e3', 'Cheap ingredients → lower prices for many ultra-processed foods'], ['e4', 'Heavy marketing of processed foods → higher consumption of the advertised foods'], ['e5', 'Few large processing plants → one closure causes a large supply disruption'], ['e6', 'Few full-service grocery stores nearby → less fresh produce available near home'], ['e7', 'Higher consumption of advertised foods → new farm subsidies'], ['e8', 'Lower prices for processed foods → fewer grocery stores in a neighborhood'], ['e9', 'A supply disruption → more marketing of processed foods']],
      ans: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], hints: ['A cause must plausibly come before the effect and act through a clear mechanism. Test each arrow in both directions.', 'Some arrows point the wrong way, or link things with no direct mechanism.'],
      explain: 'Incentives influence what is grown; a large supply of commodity crops lowers ingredient cost and food prices; marketing raises consumption; fewer processing plants make one closure matter more; and few nearby stores reduce nearby fresh produce. The other arrows reverse the direction or have no direct mechanism.' } },
    { kind: 'scene', scene: 'foodsys', id: 'foodsys', title: 'Resilience vs. Efficiency Lab', block: 'm6b',
      lead: 'A fictional region processes its food in a number of plants. Move the consolidation lever and then close the largest plant. Watch cost per unit and the share of supply that disappears. Try at least three settings to unlock the questions.',
      qs: [
        { id: 's-tradeoff', domain: 'systems', concept: 'resilience-efficiency', skill: 'evaluate', difficulty: 3, qt: 'simulation: trade-off analysis', lvl: 'AN', pts: 2, sec: 90, major: true, after: '@sim',
          type: 'mc', prompt: 'Which conclusion do the lab results best support?',
          opts: [['a', 'More consolidation lowered cost per unit but also increased the share of supply lost when one large plant closed, a trade-off between efficiency and resilience.'], ['b', 'More consolidation lowered cost per unit and also made the system better at handling disruptions, so there is no trade-off.'], ['c', 'Consolidation changes who owns the plants but has no effect on either cost per unit or supply loss.'], ['d', 'The lab shows that consolidated systems are always unsafe and should never be used.']],
          ans: 'a', hints: ['Compare what happened to cost per unit and to the supply lost when the lever moved from low to high.', 'Look for the option that names both effects without absolute words like "always" or "never".'],
          explain: 'In the model, fewer, larger plants lowered cost per unit (efficiency) but one closure removed a larger share of supply (less resilience). The lab shows a trade-off; it does not prove consolidation is always bad.' },
        { id: 's-lever', domain: 'systems', concept: 'resilience-efficiency', skill: 'apply', difficulty: 2, qt: 'simulation: slider', lvl: 'AP', pts: 1, sec: 50, major: false, after: '@sim',
          type: 'slider', range: [1, 10, 1], unit: 'level',
          prompt: 'Move the marker to the LOWEST consolidation level at which closing the largest plant removes 25% or more of the region\'s supply.',
          ans: 9, hints: ['Use the simulator: for each level, read the share of supply lost when the largest plant closes, and find where it first reaches 25%.'],
          explain: 'At level 9 there are 4 equal plants, so closing one removes 25% of supply. At lower levels there are more plants and each closure removes less.' }
      ] },
    { kind: 'q', block: 'm6c', q: {
      id: 's-access', domain: 'systems', concept: 'food-access', skill: 'analyze map', difficulty: 3, qt: 'clickable map', lvl: 'AN', pts: 2, sec: 90, major: true,
      type: 'hotspot', stim: { fig: 'map' }, prompt: 'The city wants a new full-service grocery store that improves access for the MOST households without a car. Click the best location on the map.',
      regions: [['A', 'Area A: next to the existing supermarket'], ['B', 'Area B: dense apartments on a bus line'], ['C', 'Area C: highway interchange'], ['D', 'Area D: industrial park'], ['E', 'Area E: suburban cul-de-sacs']], fixedOrder: true,
      ans: 'B', hints: ['Look at the shading and the legend: which area has many households without a car, and is not already near a supermarket?'],
      explain: 'Area B has dense housing, a high share of households without a car, and a bus line, and it is far from the existing supermarket. Area A is already served, C and D have few homes, and E has high car ownership.' } },
    { kind: 'q', block: 'm6c', q: {
      id: 's-insecurity', domain: 'systems', concept: 'food-insecurity-data', skill: 'interpret graph', difficulty: 2, qt: 'graph interpretation', lvl: 'AP', pts: 2, sec: 90,
      type: 'multi', stim: { chart: 'insecurity' }, prompt: 'Select ALL conclusions that the graph supports.',
      opts: [['a', 'The share of U.S. households that were food insecure was higher in 2023 than in 2021.'], ['b', 'In 2023, about 1 in 7 U.S. households were food insecure.'], ['c', 'Food insecurity rose because people made poor food choices.'], ['d', 'The graph measures households, not individual people.'], ['e', 'Food insecurity fell each year from 2021 to 2023.'], ['f', 'Food prices alone explain the change from 2022 to 2023.']],
      ans: ['a', 'b', 'd'], hints: ['Use only what the bars and labels show. A graph of percentages cannot show why a change happened.', '13.5% is about 1 out of how many households?'],
      explain: 'The bars show 10.2% in 2021, 12.8% in 2022 and 13.5% in 2023, so the share rose, and 13.5% is about 1 in 7 households. The data are for households. The graph cannot show causes such as food choices or prices.' } },
    { kind: 'q', block: 'm6c', q: {
      id: 's-upf', domain: 'systems', concept: 'ultra-processed', skill: 'interpret graph', difficulty: 3, qt: 'graph interpretation', lvl: 'AN', pts: 2, sec: 90,
      type: 'mc', stim: { chart: 'upf' }, prompt: 'Which interpretation best connects the data to the food environment without overclaiming?',
      opts: [['a', 'Ultra-processed foods supplied about two-thirds of U.S. youth calories in 2018, so their availability, price and marketing are worth examining, though the data alone do not show that any one food causes a health outcome.'], ['b', 'The data prove that teens choose ultra-processed foods only because of weak willpower, so changing the surroundings or marketing would make no difference.'], ['c', 'The data prove that every ultra-processed food is nutritionally poor and that no teen should ever eat any food in this category, including breads and yogurts.'], ['d', 'Because the share rose by only about 6 percentage points, the trend is too small to matter for thinking about the food environment or for future policy.']],
      ans: 'a', hints: ['Pick the option that uses the numbers, mentions the food environment, and stays honest about what trend data cannot show.'],
      explain: 'The graph shows trend data: ultra-processed foods rose from about 61% to 67% of youth calories. This invites questions about the food environment, but trend data cannot show one food causes an outcome, cannot reduce the pattern to willpower, and cannot label every food in the category the same.' } },
    { kind: 'q', block: 'm6d', q: {
      id: 's-doc', domain: 'systems', concept: 'evidence-docs', skill: 'evaluate', difficulty: 3, qt: 'evidence evaluation', lvl: 'AN', pts: 2, sec: 90,
      type: 'mc', stim: { title: 'Claim from a documentary', paras: ['A documentary states that a handful of companies now control most of the meat-processing industry.'] },
      prompt: 'Which approach is the best way to evaluate this claim?',
      opts: [['a', 'Find the original data (for example, USDA reports on how much cattle purchasing is handled by the largest packers), check what was measured and when, and remember the film has a point of view.'], ['b', 'Accept the claim as fact, because documentaries are made by experts and filmmakers have already checked every number they present.'], ['c', 'Reject the claim completely, because any documentary has a point of view and therefore cannot contain accurate information at all.'], ['d', 'Judge the claim by how many people watched the film or shared clips online, because popular content is more likely to be true.']],
      ans: 'a', hints: ['A good approach neither accepts nor rejects the claim just because of the source. What would you check to test the number itself?'],
      explain: 'Documentaries persuade with a point of view and can contain accurate and inaccurate parts. Checking the original data, what it measures and when is the strongest approach. USDA reports that the four largest packers handled about 85% of steer and heifer purchases (data from 2015), but exact figures depend on what is measured.' } },
    { kind: 'q', block: 'm6d', q: {
      id: 's-tech', domain: 'systems', concept: 'emerging-tech', skill: 'evaluate', difficulty: 3, qt: 'evidence evaluation (multi-select)', lvl: 'AN', pts: 2, sec: 90,
      type: 'multi', stim: { title: 'Emerging technology', paras: ['A start-up says its cell-cultivated meat is "better for the planet and for people." It posts videos but has not shared data.'] },
      prompt: 'Select the THREE questions that would best help you evaluate this claim.',
      opts: [['a', 'What does independent research show about environmental impacts across the whole life cycle, including energy use?'], ['b', 'Has a food-safety agency reviewed the product, and how does its nutrition compare with the foods it replaces?'], ['c', 'Who paid for the studies, and what would the cost and scale be compared with current options?'], ['d', 'How many followers does the company\'s founder have?'], ['e', 'Does the product\'s name sound futuristic and modern?'], ['f', 'How many celebrities have posted about trying it?']],
      ans: ['a', 'b', 'c'], hints: ['Choose questions that get at evidence: independent research, safety and nutrition review, funding and scale.'],
      explain: 'Life-cycle research, safety and nutrition review, and funding and scale are evidence questions. Follower counts, names and celebrity posts say nothing about whether the claim is true.' } },
    { kind: 'q', block: 'm6d', q: {
      id: 's-regen', domain: 'systems', concept: 'regen-ag', skill: 'match', difficulty: 2, qt: 'matching', lvl: 'K', pts: 2, sec: 70,
      type: 'match', prompt: 'Regenerative agriculture aims to improve soil health. Match each practice to the benefit it is designed to provide.',
      items: [['r1', 'Planting cover crops between harvests'], ['r2', 'Rotating grazing animals among pastures'], ['r3', 'Reducing tillage (plowing)'], ['r4', 'Growing a diversity of crops']],
      choices: [['x1', 'Keeps soil covered, reducing erosion and adding organic matter'], ['x2', 'Gives plants time to regrow, which supports healthier grass and soil'], ['x3', 'Protects soil structure and helps keep carbon in the soil'], ['x4', 'Supports more resilient farms and can reduce pest outbreaks'], ['x5', 'Guarantees lower food prices in every region']],
      ans: { r1: 'x1', r2: 'x2', r3: 'x3', r4: 'x4' }, hints: ['Match each practice to the effect it has on soil or the farm. One choice makes a guarantee no farming practice can make.'],
      explain: 'Cover crops protect soil, rotational grazing lets plants recover, reduced tillage protects soil structure, and crop diversity supports resilience. Benefits vary by place and take time, and no practice guarantees lower prices.' } },
    { kind: 'q', block: 'm6d', q: {
      id: 's-workers', domain: 'systems', concept: 'workers-policy', skill: 'apply', difficulty: 2, qt: 'scenario multiple choice', lvl: 'AP', pts: 1, sec: 50,
      type: 'mc', stim: { title: 'Scenario', paras: ['Meat and poultry processing workers often work close together and fast. In 2020, many plants had large COVID-19 outbreaks and had to slow or close, which also disrupted supply.'] },
      prompt: 'Which policy most directly targets worker health and also supports a more resilient food supply?',
      opts: [['a', 'Stronger safety standards and enforcement in processing plants, including paid sick leave'], ['b', 'More advertising for processed foods during sports broadcasts and on social media'], ['c', 'Removing nutrition labels from packages so shoppers cannot compare products'], ['d', 'Reducing the number of grocery stores in rural areas to concentrate sales']],
      ans: 'a', hints: ['Choose the policy that changes working conditions in the plants.'],
      explain: 'Safety standards, enforcement and paid sick leave directly protect workers, and healthier workers also keep plants running. The other choices do not address worker health.' } }
  ]
};
