// Nutrition Facts model (FDA Daily Values for a 2,000-calorie reference diet; label rules for adults and children 4+).
export const DV = { fat: 78, sat: 20, chol: 300, sod: 2300, carb: 275, fiber: 28, added: 50, vitD: 20, ca: 1300, fe: 18, k: 4700 };
export const pctDV = (key, amount) => Math.round((amount / DV[key]) * 100);
export const dvLevel = (pct) => (pct >= 20 ? 'high' : pct <= 5 ? 'low' : 'in between');

// Label rows in FDA order. [key, text, unit, indentLevel, hasDV]
export const LABEL_ROWS = [
  ['fat', 'Total Fat', 'g', 0, true], ['sat', 'Saturated Fat', 'g', 1, true], ['trans', 'Trans Fat', 'g', 1, false],
  ['chol', 'Cholesterol', 'mg', 0, true], ['sod', 'Sodium', 'mg', 0, true],
  ['carb', 'Total Carbohydrate', 'g', 0, true], ['fiber', 'Dietary Fiber', 'g', 1, true], ['sugars', 'Total Sugars', 'g', 1, false], ['added', 'Includes Added Sugars', 'g', 2, true],
  ['protein', 'Protein', 'g', 0, false]
];
export const MICRO_ROWS = [['vitD', 'Vitamin D', 'mcg'], ['ca', 'Calcium', 'mg'], ['fe', 'Iron', 'mg'], ['k', 'Potassium', 'mg']];

/** values for N servings. Returns the label numbers scaled (calories, nutrients and %DV). */
export function scaled(p, n) {
  const o = { cal: Math.round(p.cal * n) };
  for (const k of ['fat', 'sat', 'trans', 'chol', 'sod', 'carb', 'fiber', 'sugars', 'added', 'protein', 'vitD', 'ca', 'fe', 'k']) o[k] = Math.round(p[k] * n * 10) / 10;
  for (const k of Object.keys(DV)) o['dv_' + k] = pctDV(k, o[k]);
  return o;
}
