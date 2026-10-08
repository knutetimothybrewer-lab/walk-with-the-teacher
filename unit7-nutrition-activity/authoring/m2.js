// MISSION 2: LABEL DETECTIVE (Nutrition Labels)  -  domain "labels"  -  18 points
import { pctDV } from '../js/labeldata.js';

// Fictional products for the Nutrition Label Simulator. All values are invented.
const P = [
  { name: 'Honey Oat Crunch Bars', serving: '1 bar (35 g)', spc: 6, cal: 150, fat: 5, sat: 1, trans: 0, chol: 0, sod: 345, carb: 25, fiber: 2, sugars: 10, added: 8, protein: 3, vitD: 0, ca: 20, fe: 0.8, k: 110, front: 'Made with whole grains' },
  { name: 'Trail Mix Clusters', serving: '1/4 cup (30 g)', spc: 8, cal: 140, fat: 6, sat: 1, trans: 0, chol: 0, sod: 115, carb: 20, fiber: 2, sugars: 9, added: 6, protein: 3, vitD: 0, ca: 30, fe: 1, k: 120, front: 'Naturally good energy' },
  { name: 'Cocoa Crunch Cereal', serving: '3/4 cup (30 g)', spc: 12, cal: 120, fat: 1.5, sat: 0.5, trans: 0, chol: 0, sod: 230, carb: 26, fiber: 2, sugars: 8, added: 4, protein: 2, vitD: 2, ca: 100, fe: 4.5, k: 80, front: 'Fortified with 10 vitamins & minerals' }
];
const FRAC = [['half', 3, 0.5], ['one quarter', 2, 0.25], ['one third', 4, 1 / 3]];

const dualSets = [
  { name: 'Citrus Splash Sports Drink', cal: 90, added: 22 },
  { name: 'Berry Blast Fruit Drink', cal: 110, added: 26 },
  { name: 'Tropic Tea Lemonade', cal: 70, added: 18 }
];
const claimSets = [
  { cal: 110, k: 3, frac: 'one third of the bag', brand: 'Cheddar Moon Puffs' },
  { cal: 140, k: 4, frac: 'one quarter of the bag', brand: 'Sweet Corn Crisps' },
  { cal: 180, k: 2, frac: 'half of the bag', brand: 'Ranch Rolls Pretzel Bites' }
];
const hotSet = [
  { target: 'serving', prompt: 'Click the part of the label that tells you the amount of food that all the other numbers on the label are based on.', hint: 'Look at the line near the top that gives an amount in household measures and grams.', why: 'The serving size line states the amount that every other number on the label is based on.' },
  { target: 'added', prompt: 'Click the line that shows sugars that were added during processing, not sugars that occur naturally in foods.', hint: 'Look under Total Sugars for an indented line.', why: 'The "Includes Added Sugars" line (indented under Total Sugars) shows sugar and syrups added during processing.' },
  { target: 'spc', prompt: 'Click the part of the label that tells you how many servings are in the whole package.', hint: 'Look near the very top, above the serving size line.', why: 'The "servings per container" line near the top tells you how many servings the package holds.' }
];
const hotProduct = { name: 'Peanut Butter Pretzel Bites', serving: '2/3 cup (30 g)', spc: 'about 5', cal: 140, fat: 5, sat: 1, trans: 0, chol: 0, sod: 190, carb: 20, fiber: 1, sugars: 6, added: 4, protein: 4, vitD: 0, ca: 20, fe: 1, k: 90 };

const sceneFor = (i) => {
  const p = P[i], dv = (k) => pctDV(k, p[k]);
  const [fracText, fracServ] = FRAC[i];
  const total = Math.round(p.cal * fracServ * 10) / 10;
  const smallestK = (() => { for (let k = 0.5; k <= 6; k += 0.5) if (pctDV('added', p.added * k) >= 20) return k; return 6; })();
  const kSod = [2, 4, 3][i], sodTot = Math.round(p.sod * kSod), pSod = pctDV('sod', sodTot), p1 = dv('sod');
  const ds = dualSets[i], dualAdded = ds.added * 2, dualDV = pctDV('added', dualAdded), oneDV = pctDV('added', ds.added);
  const cl = claimSets[i], clTotal = cl.cal * cl.k;
  const hs = hotSet[i];
  const fmt = (x) => String(Math.round(x * 10) / 10);
  const sfx = '-' + i;
  return {
    kind: 'scene', scene: 'labelsim', id: 'ls' + sfx, title: 'Nutrition Label Simulator', block: 'm2sim',
    lead: 'Change the number of servings and watch every value on the label update. Then click parts of the label to learn how to read them. Questions unlock after you have explored.',
    cfg: { product: p },
    qs: [
      { id: 'l-total' + sfx, slot: 'l-total', domain: 'labels', concept: 'servings-calc', skill: 'calculate', difficulty: 2, qt: 'label simulation: numeric entry', lvl: 'AP', pts: 2, sec: 90, major: true, after: '@sim',
        type: 'num', range: [0, 3000, 1],
        prompt: `{N1} eats ${fracText} of a package of ${p.name}. How many calories does {N1} consume? (Use the servings per container and the calories per serving on the label.)`,
        ans: total, hints: ['First work out how many servings that part of the package is, then scale the calories per serving.', 'The simulator can show the label for a number of servings, but you must decide which number of servings to use.'],
        explain: `The package holds ${p.spc} servings, so ${fracText} is ${fmt(fracServ)} servings. ${fmt(fracServ)} × ${p.cal} calories = ${fmt(total)} calories.` },
      { id: 'l-dv' + sfx, slot: 'l-dv', domain: 'labels', concept: 'pct-dv', skill: 'interpret', difficulty: 3, qt: 'label simulation: slider', lvl: 'AP', pts: 2, sec: 100, major: true, after: '@sim',
        type: 'slider', range: [0.5, 6, 0.5], unit: 'servings',
        prompt: `A %DV of 20% or more counts as HIGH. Move the marker to the smallest number of servings of ${p.name} at which the ADDED SUGARS reach at least 20% DV.`,
        ans: smallestK, hints: ['Find the %DV for added sugars at one serving, then see how it changes as servings increase.', 'The question asks for the smallest number where the percent reaches 20 or more, not the number that gets closest from above.'],
        explain: `One serving has ${p.added} g added sugars (${dv('added')}% DV). ${fmt(smallestK)} servings gives ${fmt(p.added * smallestK)} g, which is ${pctDV('added', p.added * smallestK)}% DV, the first step at or above 20%.` },
      { id: 'l-interp' + sfx, slot: 'l-interp', domain: 'labels', concept: 'pct-dv', skill: 'interpret', difficulty: 2, qt: 'label simulation: multiple choice', lvl: 'AP', pts: 1, sec: 60, major: true, after: '@sim',
        type: 'mc', prompt: `One serving of ${p.name} has ${p1}% DV for sodium. {N1} eats ${kSod} servings. Which statement is accurate?`,
        opts: [['a', `${kSod} servings supply about ${pSod}% DV of sodium, which counts as a high amount (20% DV or more).`], ['b', `The sodium stays at ${p1}% DV no matter how much {N1} eats, because the percent is printed on the label.`], ['c', `${kSod} servings supply about ${pSod}% DV, which counts as low because it is below 50%.`], ['d', `${kSod} servings supply ${p1 + kSod}% DV, because the number of servings is added to the label percent.`]],
        ans: 'a', hints: ['Percent Daily Value is tied to the serving size on the label. What happens to it if the amount eaten changes?', 'Remember the benchmark: 5% DV or less is low and 20% DV or more is high.'],
        explain: `%DV scales with how much is eaten. ${kSod} × ${p1}% ≈ ${pSod}% DV, and 20% DV or more is considered high.` },
      { id: 'l-dual' + sfx, slot: 'l-dual', domain: 'labels', concept: 'dual-column', skill: 'interpret', difficulty: 2, qt: 'label simulation: dual-column label', lvl: 'AP', pts: 2, sec: 90, major: true, after: '@sim',
        type: 'mc',
        stim: { title: ds.name + ' (2 servings per container)', table: { cap: 'Dual-column Nutrition Facts (excerpt)', cols: ['', 'Per serving', 'Per container'], rows: [['Calories', String(ds.cal), String(ds.cal * 2)], ['Added sugars', ds.added + ' g (' + oneDV + '% DV)', dualAdded + ' g (' + dualDV + '% DV)']] } },
        prompt: `{N1} drinks the entire bottle in one sitting. Which statement is the most accurate?`,
        opts: [['a', `{N1} takes in ${dualAdded} g of added sugars, ${dualDV}% DV, because the per-container column shows the whole bottle.`], ['b', `{N1} takes in ${ds.added} g of added sugars, ${oneDV}% DV, because the label always describes the amount in the whole bottle.`], ['c', `The ${dualDV}% DV applies only to the next bottle, not the one {N1} just drank.`], ['d', 'Sugars in drinks are not counted toward added-sugar totals, so neither column matters.']],
        ans: 'a', hints: ['Decide which column describes everything in the bottle, then read the added-sugars row in that column.', 'A dual-column label exists because many people eat or drink the whole package at once.'],
        explain: `Dual-column labels show values per serving and per container. Drinking the whole bottle means using the per-container column: ${dualAdded} g added sugars (${dualDV}% DV).` },
      { id: 'l-hot' + sfx, slot: 'l-hot', domain: 'labels', concept: 'label-reading', skill: 'locate', difficulty: 1, qt: 'label simulation: clickable label', lvl: 'K', pts: 1, sec: 40, major: false, after: '@sim',
        type: 'hotspot', stim: { fig: 'label', product: hotProduct, regions: true },
        prompt: hs.prompt, regions: [['spc', 'Servings per container'], ['serving', 'Serving size'], ['cal', 'Calories'], ['sod', 'Sodium'], ['fiber', 'Dietary fiber'], ['added', 'Includes added sugars'], ['dv', '% Daily Value column']],
        ans: hs.target, hints: [hs.hint], explain: hs.why },
      { id: 'l-claim' + sfx, slot: 'l-claim', domain: 'labels', concept: 'front-vs-label', skill: 'evaluate', difficulty: 2, qt: 'label simulation: claim vs label', lvl: 'AP', pts: 2, sec: 80, major: true, after: '@sim',
        type: 'mc',
        stim: { fig: 'package', pkg: { name: cl.brand, claims: ['Only ' + cl.cal + ' calories!'], color: ['#f6b042', '#e0662b'] }, title: 'Back of the bag (excerpt)', paras: [`Serving size: ${cl.frac.replace(' of the bag', '')} of the bag. Servings per container: ${cl.k}. Calories: ${cl.cal}.`] },
        prompt: `{N1} eats the whole bag in one sitting. Which statement is the most accurate?`,
        opts: [['a', `The bag holds ${cl.k} servings, so the whole bag provides about ${clTotal} calories; the front describes one serving only.`], ['b', `The whole bag provides ${cl.cal} calories, because the front of the package lists the calories for the whole product.`], ['c', `The label shows ${cl.cal} calories because a serving size is the amount the company recommends people eat.`], ['d', 'The calories cannot be known unless the food is weighed, so the label offers no usable information.']],
        ans: 'a', hints: ['Compare what the front says with what the label says one serving is.', 'A serving size is a reference amount for comparing foods, not an instruction about how much to eat.'],
        explain: `The front calorie claim applies to one serving (${cl.frac.replace(' of the bag', '')} of the bag). With ${cl.k} servings in the bag, eating it all means ${cl.k} × ${cl.cal} = ${clTotal} calories.` }
    ]
  };
};

// ---- grocery comparison scenarios (no universally "healthiest" product: the best choice depends on the stated need) ----
const GRO = [
  { id: 1, title: 'Breakfast cereal', need: '{N1} wants a breakfast cereal with a WHOLE GRAIN as the first ingredient, at least 3 g of fiber, and no more than 5 g of added sugars per serving.',
    products: [
      { k: 'A', name: 'Berry Blast Crunch', color: ['#ff5e8a', '#7a2cff'], claims: ['Made with real fruit!', '12 vitamins & minerals'], serving: '1 cup (40 g)', cal: 160, fiber: 1, sugars: 15, added: 14, sod: 190, protein: 2, ca: 10, ingredients: 'Sugar, corn flour, whole-grain oats, rice, dried strawberries (0.5%), salt, vitamins.' },
      { k: 'B', name: 'Harvest Grain Flakes', color: ['#d99a3a', '#7a5a22'], claims: ['Naturally delicious', 'Simple goodness'], serving: '3/4 cup (30 g)', cal: 110, fiber: 5, sugars: 5, added: 4, sod: 140, protein: 3, ca: 2, ingredients: 'Whole-grain wheat, whole-grain oats, wheat bran, sugar, salt.' },
      { k: 'C', name: 'Protein Power Puffs', color: ['#2cc4b0', '#1c5fd1'], claims: ['20 g PROTEIN!', 'Zero sugar added'], serving: '1/2 cup (30 g)', cal: 180, fiber: 2, sugars: 0, added: 0, sod: 360, protein: 20, ca: 4, ingredients: 'Soy protein isolate, rice flour, tapioca starch, salt, natural flavor, sucralose.' }
    ], best: 'B', evidence: [['e1', 'Harvest Grain Flakes lists a whole grain first and has 5 g fiber and 4 g added sugars per serving, matching all three requirements.'], ['e2', 'Protein Power Puffs shows the biggest nutrient number on the front (20 g protein), so it must be the best match.'], ['e3', 'Berry Blast Crunch says "made with real fruit," which shows it fits every requirement.'], ['e4', 'Harvest Grain Flakes uses the word "Naturally" on the front, which proves it is the best.']],
    rank: ['C', 'B', 'A'], rankNote: 'Protein Power Puffs has 0 g, Harvest Grain Flakes has 4 g, and Berry Blast Crunch has 14 g added sugars per serving.' },
  { id: 2, title: 'Post-practice recovery', need: '{N1} needs a post-practice snack with AT LEAST 10 g of protein, at least 15% DV calcium, and no more than 10 g of added sugars.',
    products: [
      { k: 'A', name: 'Tropic Glow Smoothie', color: ['#ffb02e', '#ff5a36'], claims: ['100% natural', 'No artificial flavors'], serving: '1 bottle (12 fl oz)', cal: 220, fiber: 2, sugars: 40, added: 36, sod: 30, protein: 2, ca: 6, ingredients: 'Apple juice, mango puree, pineapple juice concentrate, cane juice, natural flavors.' },
      { k: 'B', name: 'Choco Recovery Shake', color: ['#8a4b2b', '#3b1d10'], claims: ['Recover like a pro', 'Made with real cocoa'], serving: '1 bottle (11 fl oz)', cal: 230, fiber: 1, sugars: 26, added: 22, sod: 210, protein: 14, ca: 30, ingredients: 'Low-fat milk, sugar, milk protein concentrate, cocoa, cellulose gum, salt.' },
      { k: 'C', name: 'Vanilla Greek Yogurt Cup', color: ['#f4ead2', '#7cc4ff'], claims: ['Thick & creamy', 'High protein'], serving: '1 cup (170 g)', cal: 130, fiber: 0, sugars: 11, added: 6, sod: 60, protein: 15, ca: 15, ingredients: 'Cultured nonfat milk, sugar, natural vanilla flavor, live and active cultures.' }
    ], best: 'C', evidence: [['e1', 'Vanilla Greek Yogurt Cup has 15 g protein, 15% DV calcium and 6 g added sugars per serving, which meets all three requirements.'], ['e2', 'Choco Recovery Shake says "Recover like a pro," so it must be built for recovery and meets every requirement.'], ['e3', 'Tropic Glow Smoothie is "100% natural," so it is the best match for any need.'], ['e4', 'Choco Recovery Shake has the most calories, which makes it the best choice for protein and calcium.']],
    rank: ['C', 'B', 'A'], rankNote: 'Vanilla Greek Yogurt Cup has 6 g, Choco Recovery Shake has 22 g, and Tropic Glow Smoothie has 36 g added sugars per serving.' },
  { id: 3, title: 'Trail snack', need: '{N1} is packing a bar for a long all-day hike. It must be NUT-FREE and provide at least 180 calories and at least 25 g of carbohydrate in one serving.',
    products: [
      { k: 'A', name: 'Nutty Trail Bar', color: ['#6fa84a', '#355c1f'], claims: ['Nature\'s energy', '200 calories'], serving: '1 bar (50 g)', cal: 200, fiber: 4, sugars: 11, added: 9, sod: 120, protein: 7, ca: 4, ingredients: 'Peanuts, almonds, oats, honey, brown rice syrup, sea salt. Contains peanuts and tree nuts.' },
      { k: 'B', name: 'Oat & Raisin Energy Bar', color: ['#c97b3a', '#6b3a1a'], claims: ['Nut-free recipe', 'Made with whole grains'], serving: '1 bar (60 g)', cal: 220, fiber: 3, sugars: 18, added: 12, sod: 140, protein: 4, ca: 2, ingredients: 'Whole-grain oats, raisins, brown rice syrup, sunflower oil, honey, salt. Made in a nut-free facility.' },
      { k: 'C', name: 'Lite Berry Bar', color: ['#d9477e', '#6a1b4d'], claims: ['Only 90 calories!', 'Low fat'], serving: '1 bar (25 g)', cal: 90, fiber: 1, sugars: 7, added: 6, sod: 70, protein: 1, ca: 2, ingredients: 'Rice crisps, sugar, dried berry pieces, glycerin, natural flavor. Nut-free.' }
    ], best: 'B', evidence: [['e1', 'Oat & Raisin Energy Bar is nut-free and gives 220 calories per serving, which meets the need; Nutty Trail Bar contains nuts and Lite Berry Bar has only 90 calories.'], ['e2', 'Lite Berry Bar is the best because "Only 90 calories!" makes it the lightest and therefore the healthiest option.'], ['e3', 'Nutty Trail Bar has the most fiber and protein, so the nut warning does not matter for this hiker.'], ['e4', 'Oat & Raisin Energy Bar must be best because its label says "whole grains," so it fits every possible need.']],
    rank: ['C', 'A', 'B'], rankNote: 'Lite Berry Bar has 6 g, Nutty Trail Bar has 9 g, and Oat & Raisin Energy Bar has 12 g added sugars per serving.' }
];
// carbs for gro 3 listed in ingredient copy only; carbohydrate numbers shown in the compact label
GRO[2].products[0].carb = 22; GRO[2].products[1].carb = 40; GRO[2].products[2].carb = 18;
GRO[0].products.forEach((p, i) => { p.carb = [34, 24, 22][i]; }); GRO[1].products.forEach((p, i) => { p.carb = [48, 34, 20][i]; });

const groceryStage = (g) => ({
  kind: 'scene', scene: 'grocery', id: 'gro-' + g.id, title: 'Grocery Comparison Challenge: ' + g.title, block: 'm2g',
  lead: 'Three products compete for the shelf. The packages are designed to persuade. Flip each package over and inspect the label, the ingredient list and the claims.',
  cfg: { need: g.need, products: g.products },
  qs: [
    { id: 'gro-best-' + g.id, slot: 'gro-best', domain: 'labels', concept: 'product-compare', skill: 'evaluate', difficulty: 3, qt: 'grocery comparison: choice + evidence', lvl: 'AN', pts: 3, sec: 130, major: true, after: '@sim',
      type: 'slots', prompt: g.need + ' Choose the product that best fits the need AND the strongest evidence for your choice.',
      slots: [{ k: 'prod', label: 'Best product for this need', opts: g.products.map((p) => [p.k, p.name]) }, { k: 'ev', label: 'Strongest evidence', opts: g.evidence }],
      ans: { prod: g.best, ev: 'e1' }, hints: ['Write down each requirement, then check every product against the label and ingredient list. Do not use the front of the package to decide.', 'The strongest evidence names label facts that match the stated requirements. Claims on the front are not evidence of a match.'],
      explain: `The best match depends on this specific need. ${g.evidence[0][1]} Front-of-package claims do not show whether a product meets the requirements.` },
    { id: 'gro-rank-' + g.id, slot: 'gro-rank', domain: 'labels', concept: 'added-sugar-names', skill: 'rank', difficulty: 2, qt: 'grocery comparison: ranking', lvl: 'AP', pts: 1, sec: 50, after: '@sim',
      type: 'seq', prompt: 'Rank the three products from the LEAST added sugars per serving (top) to the MOST (bottom).',
      steps: g.products.map((p) => [p.k, p.name]), ans: g.rank, hints: ['Use the "Includes Added Sugars" line for one serving of each product, not total sugars or the front claims.'],
      explain: g.rankNote }
  ]
});

export default {
  id: 'm2', num: 2, title: 'Label Detective', theme: 'label', est: 11, kicker: 'MISSION 2',
  blurb: 'Serving sizes, percent daily value and ingredient lists. Evidence beats packaging.',
  stages: [
    { kind: 'q', block: 'm2a', q: {
      id: 'l-sizes', domain: 'labels', concept: 'serving-portion', skill: 'distinguish', difficulty: 1, qt: 'multiple choice', lvl: 'K', pts: 1, sec: 40,
      type: 'mc', prompt: 'Which statement correctly distinguishes a SERVING SIZE from a PORTION SIZE?',
      opts: [['a', 'A serving size is a standardized amount used on the label so foods can be compared; a portion is the amount a person actually chooses to eat.'], ['b', 'A serving size is the amount a person actually eats; a portion is the standardized amount on the label.'], ['c', 'A serving size is the amount the company recommends everyone should eat; a portion is a smaller amount for children.'], ['d', 'They mean the same thing, so a label\'s servings per container always equals the number of portions eaten.']],
      ans: 'a', hints: ['Which term is set by the label and which is set by the person eating?'],
      explain: 'A serving size is a standard reference amount on the Nutrition Facts label that helps compare foods. A portion is how much a person chooses to eat, which may be more or less than one serving.'
    } },
    { kind: 'pool', id: 'ls-pool', groups: [{ pick: 1, items: [0, 1, 2].map(sceneFor) }] },
    { kind: 'q', block: 'm2b', q: {
      id: 'l-ingr', domain: 'labels', concept: 'ingredient-order', skill: 'interpret', difficulty: 2, qt: 'multiple choice', lvl: 'AP', pts: 1, sec: 50,
      type: 'mc', stim: { title: 'Ingredient list (Fictional cereal bar)', paras: ['Corn syrup, whole-grain oats, cane sugar, rice flour, honey, salt, natural flavor.'] },
      prompt: 'Ingredients are listed in order by weight, from most to least. Which conclusion does the list support?',
      opts: [['a', 'Corn syrup weighs the most, and sugar-type ingredients appear several times, so added sugars may make up a large part of the bar.'], ['b', 'Whole-grain oats are the main ingredient, because whole grains are always listed first.'], ['c', 'Salt and natural flavor weigh the most because they are listed last.'], ['d', 'The list order is alphabetical, so it says nothing about how much of each ingredient is in the bar.']],
      ans: 'a', hints: ['Which ingredient is first in the list, and what does the order mean?', 'Count how many ingredients are forms of sugar.'],
      explain: 'Ingredients are listed from the greatest weight to the least. Corn syrup comes first, and cane sugar and honey are sugars too, so added sugars are likely a large share of the bar.'
    } },
    { kind: 'q', block: 'm2b', q: {
      id: 'l-alias', domain: 'labels', concept: 'added-sugar-names', skill: 'identify', difficulty: 2, qt: 'multi-select', lvl: 'AP', pts: 2, sec: 60,
      type: 'multi', prompt: 'Select ALL of these ingredients that are sources of added sugars.',
      opts: [['a', 'Brown rice syrup'], ['b', 'Whole-grain oats'], ['c', 'Evaporated cane juice'], ['d', 'Dextrose'], ['e', 'Almonds'], ['f', 'Honey'], ['g', 'Soy lecithin']],
      ans: ['a', 'c', 'd', 'f'], hints: ['Added sugars can hide under many names: syrups, juices that are evaporated or concentrated, and words ending in -ose.', 'Whole foods such as grains and nuts are not added sugars.'],
      explain: 'Brown rice syrup, evaporated cane juice, dextrose and honey are added sugars. Oats and almonds are whole foods, and soy lecithin is an emulsifier.'
    } },
    { kind: 'pool', id: 'gro-pool', groups: [{ pick: 1, items: GRO.map(groceryStage) }] }
  ]
};
