// MISSION 1: FUEL LAB (Nutrition Foundations)  -  domain "found"  -  13 points
export default {
  id: 'm1', num: 1, title: 'Fuel Lab', theme: 'fuel', est: 8, kicker: 'MISSION 1',
  blurb: 'Nutrients, MyPlate and balanced eating. Real situations, not definitions.',
  stages: [
    { kind: 'q', block: 'm1', q: {
      id: 'f-roles', domain: 'found', concept: 'macro-roles', skill: 'classify', difficulty: 1, qt: 'drag-and-drop sort', lvl: 'K', pts: 2, sec: 80,
      type: 'sort', prompt: 'Sort each description by the nutrient group doing the main job.',
      bins: [['carb', 'Carbohydrates'], ['prot', 'Protein'], ['fat', 'Fats'], ['micro', 'Vitamins & minerals']],
      items: [['a', 'The main fuel muscles and the brain draw on during a basketball game'], ['b', 'Supplies the amino acids used to build and repair muscle tissue'], ['c', 'Helps the body absorb vitamins A, D, E and K'], ['d', 'Calcium and vitamin D working together to support bone growth'], ['e', 'Used to make enzymes and many hormones'], ['f', 'Iron that helps red blood cells carry oxygen']],
      ans: { a: 'carb', b: 'prot', c: 'fat', d: 'micro', e: 'prot', f: 'micro' },
      hints: ['Ask what each description does in the body, then match it to the group whose job that is.', 'Vitamins and minerals do not provide energy; they help body processes work. Fats help carry some vitamins.'],
      explain: 'Carbohydrates are the main fuel for muscles and the brain. Protein supplies amino acids for repair, enzymes and hormones. Fats help absorb vitamins A, D, E and K. Calcium, vitamin D and iron are micronutrients (vitamins and minerals) that support bones and oxygen transport.'
    } },
    { kind: 'pool', id: 'f-kcal-pool', groups: [{ pick: 1, items: [
      [18, 5, 8, 164], [32, 3, 4, 176], [24, 7, 5, 169]
    ].map(([c, p, f, k], i) => ({ kind: 'q', block: 'm1', q: {
      id: 'f-kcal-' + i, slot: 'f-kcal', domain: 'found', concept: 'energy-calc', skill: 'calculate', difficulty: 2, qt: 'numeric entry', lvl: 'AP', pts: 1, sec: 60,
      type: 'num', range: [0, 700, 1],
      prompt: `A snack contains ${c} g of carbohydrate, ${p} g of protein and ${f} g of fat. Use 4 calories per gram for carbohydrate and protein and 9 calories per gram for fat. About how many calories does the snack provide?`,
      ans: k, hints: ['Multiply each nutrient\'s grams by its calories per gram first, then add the three results.', 'Fat has more than twice the calories per gram of the other two, so calculate that part separately.'],
      explain: `${c} × 4 = ${c * 4}, ${p} × 4 = ${p * 4}, ${f} × 9 = ${f * 9}. The total is ${k} calories.`
    } })) }] },
    { kind: 'pool', id: 'f-plate-pool', groups: [{ pick: 1, items: [
      { kind: 'q', block: 'm1b', q: {
        id: 'f-plate-a', slot: 'f-plate', domain: 'found', concept: 'myplate-build', skill: 'apply', difficulty: 2, qt: 'build-a-plate', lvl: 'AP', pts: 3, sec: 150, major: true,
        type: 'slots', plate: true,
        prompt: '{N1} is vegetarian (eats eggs and dairy), has track practice after school, and wants a MyPlate lunch with: whole fruit with no added sugar, a raw vegetable, a whole-grain food, a plant-based protein, and a food from the dairy group. Build the plate by choosing one item for each section.',
        slots: [
          { k: 'fruit', label: 'Fruit', opts: [['f1', 'Orange slices'], ['f2', 'Fruit-flavored gummy snacks'], ['f3', 'Fruit punch drink (10% juice)'], ['f4', 'Fruit cup in heavy syrup']] },
          { k: 'veg', label: 'Vegetables', opts: [['v1', 'Carrot and bell-pepper strips'], ['v2', 'Onion rings'], ['v3', 'Potato chips'], ['v4', 'Ketchup packets']] },
          { k: 'grain', label: 'Grains', opts: [['g1', 'Whole-wheat pita'], ['g2', 'Frosted toaster pastry'], ['g3', 'White-flour tortilla chips'], ['g4', 'Sweetened cereal bar']] },
          { k: 'prot', label: 'Protein', opts: [['p1', 'Black bean and lentil chili'], ['p2', 'Turkey slices'], ['p3', 'Chicken nuggets'], ['p4', 'Beef jerky']] },
          { k: 'dairy', label: 'Dairy', opts: [['d1', 'Low-fat plain yogurt'], ['d2', 'Coffee creamer'], ['d3', 'Cream cheese bagel spread'], ['d4', 'Whipped topping']] }
        ],
        ans: { fruit: 'f1', veg: 'v1', grain: 'g1', prot: 'p1', dairy: 'd1' },
        hints: ['Check each section against the exact requirement written in the scenario: whole fruit, raw vegetable, whole grain, plant-based protein, dairy group.', 'Some foods that sound like they belong to a group do not count: creamers, cream cheese and whipped topping are not in the dairy group, and ketchup is not a serving of vegetables.'],
        explain: 'Orange slices are whole fruit with no added sugar. Raw carrot and pepper strips are a vegetable. Whole-wheat pita is a whole grain. Bean and lentil chili is plant-based protein. Yogurt is in the dairy group; creamer, cream cheese and whipped topping are not.'
      } },
      { kind: 'q', block: 'm1b', q: {
        id: 'f-plate-b', slot: 'f-plate', domain: 'found', concept: 'myplate-build', skill: 'apply', difficulty: 2, qt: 'build-a-plate', lvl: 'AP', pts: 3, sec: 150, major: true,
        type: 'slots', plate: true,
        prompt: '{N1} avoids dairy, plays soccer, and wants a MyPlate dinner with: whole fruit, a leafy or colorful vegetable, a whole grain, a lean unprocessed animal protein, and a calcium-rich dairy-group alternative. Build the plate by choosing one item for each section.',
        slots: [
          { k: 'fruit', label: 'Fruit', opts: [['f1', 'Apple slices'], ['f2', 'Fruit roll-up'], ['f3', 'Fruit punch pouch'], ['f4', 'Fruit cocktail in syrup']] },
          { k: 'veg', label: 'Vegetables', opts: [['v1', 'Side salad with spinach and tomato'], ['v2', 'French-fried onion topping'], ['v3', 'Kettle potato chips'], ['v4', 'Tomato-flavored candy']] },
          { k: 'grain', label: 'Grains', opts: [['g1', 'Brown rice'], ['g2', 'Sugary breakfast pastry'], ['g3', 'Buttery crackers'], ['g4', 'Frosted cereal']] },
          { k: 'prot', label: 'Protein', opts: [['p1', 'Grilled chicken breast'], ['p2', 'Hot dog'], ['p3', 'Pepperoni slices'], ['p4', 'Bacon bits']] },
          { k: 'dairy', label: 'Dairy', opts: [['d1', 'Calcium-fortified soy milk'], ['d2', 'Coffee creamer'], ['d3', 'Almond-flavored candy'], ['d4', 'Whipped topping']] }
        ],
        ans: { fruit: 'f1', veg: 'v1', grain: 'g1', prot: 'p1', dairy: 'd1' },
        hints: ['Match each section to the exact requirement in the scenario: whole fruit, leafy or colorful vegetable, whole grain, lean unprocessed protein, calcium-rich dairy alternative.', 'Fortified soy milk is the only listed item counted with the dairy group as a calcium-rich alternative.'],
        explain: 'Apple slices are whole fruit. A spinach and tomato salad is a vegetable. Brown rice is a whole grain. Grilled chicken breast is a lean, unprocessed protein. Calcium-fortified soy milk counts in the dairy group as a dairy-free alternative.'
      } }
    ] }] },
    { kind: 'q', block: 'm1', q: {
      id: 'f-micro', domain: 'found', concept: 'micro-functions', skill: 'match', difficulty: 1, qt: 'matching', lvl: 'K', pts: 2, sec: 70,
      type: 'match', prompt: 'Match each micronutrient to the job it is best known for.',
      items: [['m1', 'Calcium'], ['m2', 'Iron'], ['m3', 'Vitamin C'], ['m4', 'Potassium']],
      choices: [['x1', 'Builds and maintains strong bones and teeth'], ['x2', 'Helps red blood cells carry oxygen'], ['x3', 'Supports healing and the immune system'], ['x4', 'Helps nerves, muscles and fluid balance'], ['x5', 'Is the body\'s long-term energy storage']],
      ans: { m1: 'x1', m2: 'x2', m3: 'x3', m4: 'x4' },
      hints: ['Think about the body system each mineral or vitamin is linked to: bones, blood, immune system, nerves and muscles.', 'One choice describes a macronutrient, not a micronutrient. You will not use it.'],
      explain: 'Calcium builds bones and teeth, iron helps carry oxygen in red blood cells, vitamin C supports healing and immunity, and potassium supports nerves, muscles and fluid balance. Long-term energy storage is a job of body fat.'
    } },
    { kind: 'q', block: 'm1c', q: {
      id: 'f-data', domain: 'found', concept: 'produce-data', skill: 'interpret graph', difficulty: 2, qt: 'graph interpretation', lvl: 'AP', pts: 2, sec: 90,
      type: 'multi', stim: { chart: 'produce' },
      prompt: 'Select ALL conclusions that the data in the graph support.',
      opts: [['a', 'Fewer than 1 in 10 high school students met the federal recommendation for fruit.'], ['b', 'Students met the vegetable recommendation less often than the fruit recommendation.'], ['c', 'Most teens skip vegetables because they dislike the taste.'], ['d', 'About 98 of every 100 students did not meet the vegetable recommendation.'], ['e', 'Eating fruit and vegetables has little effect on health.'], ['f', 'About 1 in 3 students met the fruit recommendation.']],
      ans: ['a', 'b', 'd'],
      hints: ['Only choose statements you could prove using just the two bars. Ask whether the graph shows a reason or only an amount.', 'Subtract each percentage from 100 to find how many students did not meet a recommendation.'],
      explain: 'The graph shows 7.1% met the fruit recommendation and 2.0% met the vegetable recommendation, so fewer than 1 in 10 met fruit, vegetables were met less often, and about 98 of 100 missed the vegetable target. The graph cannot show why students eat as they do, and it says nothing about health effects.'
    } },
    { kind: 'q', block: 'm1c', q: {
      id: 'f-balance', domain: 'found', concept: 'balanced-pattern', skill: 'evaluate', difficulty: 2, qt: 'scenario', lvl: 'AP', pts: 2, sec: 60,
      type: 'mc', stim: { title: 'Scenario', paras: ['{N1} eats pizza at the school party on Friday. Most other days {N1} eats vegetables, fruit, whole grains and a mix of protein foods. A friend says, "Pizza does not count as healthy eating, so you ruined your whole week."'] },
      prompt: 'Which response best reflects a balanced eating pattern?',
      opts: [['a', 'Balance comes from the overall pattern across days and weeks, so one pizza meal can fit alongside the other food groups.'], ['b', 'Pizza should be avoided entirely, because a single food can cancel out an otherwise balanced pattern.'], ['c', 'A daily multivitamin makes the rest of the eating pattern unimportant, so food choices do not matter.'], ['d', 'The only balanced pattern is eating the same perfectly measured meal at every meal, every day.']],
      ans: 'a',
      hints: ['Think about the time frame: is balance judged by one meal, or by the whole pattern?', 'Look for the option that focuses on variety and the overall pattern rather than ranking single foods.'],
      explain: 'Balanced eating is judged across the whole pattern of meals over days and weeks. Variety from all food groups matters more than any single food, and supplements do not replace a varied pattern.'
    } },
    { kind: 'q', block: 'm1c', q: {
      id: 'f-rank', domain: 'found', concept: 'food-group-count', skill: 'rank', difficulty: 2, qt: 'ranking', lvl: 'AP', pts: 1, sec: 70,
      type: 'seq', prompt: 'Rank these breakfasts from the MOST MyPlate food groups (top) to the FEWEST (bottom). Count fruit, vegetables, grains, protein foods and dairy.',
      steps: [['b1', 'Scrambled eggs with spinach, whole-wheat toast, orange slices and milk'], ['b2', 'Whole-grain cereal with berries and milk'], ['b3', 'Plain toast'], ['b4', 'Yogurt with sliced strawberries'], ['b5', 'Whole-wheat bagel with peanut butter, apple slices and milk']],
      ans: ['b1', 'b5', 'b2', 'b4', 'b3'],
      hints: ['List the MyPlate groups in each breakfast, then count them. Nut butters count as protein foods.', 'Two breakfasts have three groups and four groups; check where each one lands.'],
      explain: 'Eggs-spinach-toast-orange-milk has five groups (protein, vegetable, grain, fruit, dairy). The bagel meal has four (grain, protein, fruit, dairy). Cereal with berries and milk has three. Yogurt with strawberries has two. Plain toast has one.'
    } }
  ]
};
