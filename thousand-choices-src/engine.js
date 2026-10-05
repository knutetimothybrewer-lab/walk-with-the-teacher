// ===== ENGINE: state, effects, chronic "time passes" model, vitals =====
// Fictional, simplified model for teaching. Every number is tunable here.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const DOMAINS = {
  phys: { name: 'Physical',      color: '#e4572e', icon: '💪' },
  ment: { name: 'Mental',        color: '#2a9d8f', icon: '🧠' },
  emo:  { name: 'Emotional',     color: '#d6336c', icon: '💛' },
  soc:  { name: 'Social',        color: '#5f3dc4', icon: '🤝' },
  env:  { name: 'Environmental', color: '#2f9e44', icon: '🌱' }
};
const DOM_KEYS = ['phys', 'ment', 'emo', 'soc', 'env'];

const STAT_START = { lungs: 98, heart: 95, skin: 92, brain: 94, muscle: 70, bone: 92, liver: 96, metab: 92,
  teeth: 90, immune: 88, fit: 72, mood: 72, stress: 30, social: 68, env: 70, bmi: 21.5 };
// habits: positive = healthier (-2..2) except smoke/drink/drugs which are 0 (none) .. 3 (heavy)
const HAB_KEYS = ['sleep', 'diet', 'move', 'water', 'screen', 'coping', 'connect', 'outdoor', 'sun',
  'smoke', 'drink', 'drugs', 'tidy', 'dental', 'mind', 'care', 'eco'];
const SUBSTANCE = ['smoke', 'drink', 'drugs'];
const GRADE_DEFAULT_S = { A: { mood: 2, stress: -2 }, B: {}, C: { mood: -3, stress: 3 } };

function newState() {
  const h = {}; HAB_KEYS.forEach(k => h[k] = 0);
  return { age: 14, s: Object.assign({}, STAT_START), h, burn: 0, pts: 0,
    ptsDom: { phys: 0, ment: 0, emo: 0, soc: 0, env: 0 }, log: [], events: [], fired: {} };
}

const SMIN = { bmi: 15, stress: 0 };
function addStat(st, k, d) {
  if (k === 'burn') { st.burn = clamp(st.burn + d, 0, 1.2); return; }
  const v = st.s[k] + d;
  st.s[k] = k === 'bmi' ? clamp(v, 15, 42) : clamp(v, k === 'stress' ? 0 : 2, 100);
}

function setHabits(st, hmap) {
  for (const key in hmap) {
    const v = hmap[key];
    if (key.endsWith('+')) { const k = key.slice(0, -1); st.h[k] = Math.max(st.h[k], v); }
    else if (key.endsWith('-')) { const k = key.slice(0, -1); st.h[k] = Math.min(st.h[k], v); }
    else st.h[key] = v;
  }
}

// grade -> points: A = +weight, B = 0, C = -weight (worksheet scale)
function optionPts(sc, opt) { return opt.p !== undefined ? opt.p : (opt.g === 'A' ? sc.w : opt.g === 'C' ? -sc.w : 0); }

function applyOption(st, sc, opt) {
  const pts = optionPts(sc, opt);
  const d = Object.assign({}, GRADE_DEFAULT_S[opt.g], opt.s || {});
  for (const k in d) addStat(st, k, d[k]);
  let hm = opt.h;
  if (!hm && sc.k) hm = { [sc.k]: opt.g === 'A' ? 2 : opt.g === 'C' ? -2 : 0 };
  if (hm) setHabits(st, hm);
  st.pts += pts; st.ptsDom[sc.dom] += pts;
  return pts;
}

// ---- chronic effects: what a habit does to the body over `dt` years ----
function tick(st, dt) {
  const h = st.h, s = st.s, a = st.age + dt / 2;
  const ag = 0.16 + Math.max(0, a - 30) * 0.020;               // natural aging per year
  const hi = Math.max(0, (s.stress - 50) / 10);                 // chronic-stress load
  const d = (k, v) => addStat(st, k, v * dt);
  d('lungs', -ag * 0.8 - 0.55 * h.smoke - 0.22 * h.drugs + 0.09 * h.move + 0.03 * h.outdoor + 0.04 * h.eco);
  d('heart', -ag * 0.9 + 0.20 * h.move + 0.12 * h.diet - 0.38 * h.smoke - 0.14 * h.drink - 0.10 * h.drugs - 0.10 * hi + 0.08 * h.care + 0.05 * h.sleep);
  d('skin',  -ag * 0.8 + 0.20 * h.sun - 0.16 * h.smoke + 0.04 * h.water + 0.04 * h.sleep + 0.03 * h.diet);
  d('brain', -ag * 0.7 + 0.07 * h.sleep + 0.04 * h.move - 0.14 * h.drink - 0.20 * h.drugs - 0.04 * hi + 0.04 * h.mind + 0.02 * h.screen);
  d('muscle', -ag * 1.2 + 0.26 * h.move + 0.07 * h.diet);
  d('bone',  -ag * 0.6 + 0.08 * h.move + 0.05 * h.diet + 0.03 * h.outdoor - 0.07 * h.smoke - 0.04 * h.drink);
  d('liver', -ag * 0.3 + 0.04 * h.diet - 0.34 * h.drink - 0.20 * h.drugs);
  d('metab', -ag * 0.8 + 0.16 * h.diet + 0.12 * h.move + 0.04 * h.sleep + 0.04 * h.water + 0.04 * h.care);
  d('teeth', -ag * 0.6 + 0.30 * h.dental + 0.07 * h.diet + 0.04 * h.water - 0.12 * h.smoke);
  d('immune', -ag * 0.8 + 0.10 * h.sleep + 0.07 * h.diet + 0.06 * h.move + 0.04 * h.connect - 0.08 * h.smoke - 0.04 * h.drink + 0.06 * h.care);
  d('fit',   -ag * 1.0 + 0.38 * h.move - 0.20 * h.smoke);
  // moods & environments drift toward what the habits support
  const toward = (k, target, rate) => { const f = Math.min(1, rate * dt); s[k] = clamp(s[k] + (target - s[k]) * f, k === 'stress' ? 0 : 2, 100); };
  toward('mood', 60 + 3.2 * (h.coping + h.connect + h.sleep + h.mind) + 1.5 * h.outdoor - 2.5 * h.drugs - 1.5 * h.drink, 0.5);
  toward('stress', 45 - 5 * h.coping - 2.5 * h.sleep - 2 * h.mind - 1.5 * h.move - 1.2 * h.screen + 2 * h.drugs + 1.5 * h.drink, 0.5);
  toward('social', 55 + 6.5 * h.connect - 3 * h.drugs - 1.5 * h.drink + 1.5 * h.mind, 0.4);
  toward('env', 56 + 7 * h.tidy + 3 * h.outdoor + 3 * h.eco, 0.45);
  const x = -(1.6 * h.diet + 0.9 * h.move + 0.3 * h.water + 0.3 * h.sleep);
  toward('bmi', 22.3 + (x < 0 ? x * 0.12 : x * 1.15) + Math.max(0, a - 30) * 0.02, 0.3);
  st.burn *= Math.exp(-dt / 0.7);
  st.age += dt;
}

// ---- derived vital signs ----
function vitals(st) {
  const s = st.s, h = st.h, a = st.age;
  const sys = Math.round(clamp(104 + (a - 14) * 0.18 + (100 - s.heart) * 0.38 + (s.stress - 30) * 0.10 + Math.max(0, s.bmi - 24) * 1.1 + h.smoke * 1.2 + h.drink * 1.0, 96, 190));
  const dia = Math.round(clamp(66 + (sys - 108) * 0.5, 60, 118));
  const rhr = Math.round(clamp(58 + (100 - s.fit) * 0.28 + (100 - s.heart) * 0.18 + (s.stress - 30) * 0.12 + h.smoke * 2, 48, 118));
  const rr = Math.round(clamp(12 + (100 - s.lungs) * 0.09 + (100 - s.fit) * 0.02 + (s.stress - 30) * 0.02, 11, 30));
  const spo2 = Math.round(clamp(99.4 - Math.max(0, 100 - s.lungs) * 0.13, 80, 99));
  const glucose = Math.round(clamp(80 + (100 - s.metab) * 0.5 + Math.max(0, s.bmi - 25) * 1.2, 72, 230));
  const ldl = Math.round(clamp(80 + (100 - s.metab) * 1.1 + Math.max(0, s.bmi - 25) * 2, 70, 230));
  const sleep = Math.round(clamp(7.6 + h.sleep * 0.9, 4.2, 9.4) * 10) / 10;
  const energy = Math.round(clamp(52 + (s.fit - 50) * 0.3 + h.sleep * 8 - (s.stress - 30) * 0.3 + (s.metab - 60) * 0.15 + (s.mood - 60) * 0.15, 5, 100));
  const sick = Math.round(clamp(2 + (100 - s.immune) * 0.14, 1, 24));
  return { sys, dia, rhr, rr, spo2, glucose, ldl, sleep, energy, sick, bmi: Math.round(s.bmi * 10) / 10 };
}

function bmiScore(b) { return b >= 18.5 && b <= 24.9 ? 100 : clamp(100 - 9 * (b < 18.5 ? 18.5 - b : b - 24.9), 0, 100); }
function vitality(st) {
  const s = st.s;
  return clamp(.12 * s.lungs + .16 * s.heart + .09 * s.brain + .07 * s.muscle + .06 * s.bone + .07 * s.liver + .10 * s.metab +
    .06 * s.immune + .08 * s.fit + .04 * s.skin + .03 * s.teeth + .06 * s.mood + .04 * bmiScore(s.bmi) + .02 * (100 - s.stress), 0, 100);
}
function domainScores(st) {
  const s = st.s, v = vitals(st);
  return {
    phys: (s.lungs + s.heart + s.fit + s.metab + s.immune + s.muscle + s.bone) / 7,
    ment: .45 * s.brain + .35 * (100 - s.stress) + .20 * v.energy,
    emo: s.mood, soc: s.social, env: s.env
  };
}
function bodyAge(st) {
  const f = Math.min(1, Math.max(0, (st.age - 10) / 40));
  return Math.round(st.age + clamp((70 - vitality(st)) * 0.6 * f, -15, 25));
}
function lifeExpectancy(st) { return Math.round(st.age + 4 + vitality(st) * 0.27); }

// ---- life events: fire once when a threshold is crossed ----
const EVENTS = [
  { id: 'wind',   bad: 1, t: s => s.lungs < 72, title: 'Winded on the stairs', text: 'Climbing stairs leaves them gasping. Their lung capacity is dropping.' },
  { id: 'cough',  bad: 1, t: s => s.lungs < 52, title: 'Chronic cough', text: 'A doctor diagnoses early lung disease (COPD). Airways are inflamed and scarred.' },
  { id: 'oxy',    bad: 1, t: s => s.lungs < 32, title: 'Needs oxygen', text: 'Lungs can no longer supply enough oxygen. A portable oxygen tank becomes part of daily life.' },
  { id: 'bp',     bad: 1, t: s => s.heart < 66, title: 'High blood pressure', text: 'A routine visit finds high blood pressure. It strains the heart and arteries every day.' },
  { id: 'attack', bad: 1, t: (s, st) => s.heart < 42 && st.age > 35, title: 'Heart attack', text: 'Clogged arteries cut off blood to the heart. Emergency surgery and a long recovery follow.' },
  { id: 'pre',    bad: 1, t: s => s.metab < 58, title: 'Prediabetes', text: 'Blood sugar is running high. Without change, type 2 diabetes is next.' },
  { id: 'diab',   bad: 1, t: s => s.metab < 38, title: 'Type 2 diabetes', text: 'Daily glucose checks, medication, and a strict diet are now necessary.' },
  { id: 'skin',   bad: 1, t: s => s.skin < 62, title: 'Sun damage found', text: 'A dermatologist finds sun spots and removes a suspicious mole.' },
  { id: 'skin2',  bad: 1, t: s => s.skin < 38, title: 'Skin cancer treatment', text: 'Years of unprotected sun exposure lead to skin cancer treatment and scars.' },
  { id: 'liver',  bad: 1, t: s => s.liver < 58, title: 'Fatty liver', text: 'Blood tests show a stressed liver. It is working overtime to clear toxins.' },
  { id: 'liver2', bad: 1, t: s => s.liver < 36, title: 'Liver disease', text: 'Scarring has damaged the liver, which affects energy, digestion, and thinking.' },
  { id: 'teeth',  bad: 1, t: s => s.teeth < 48, title: 'Gum disease & cavities', text: 'Painful dental work and tooth loss; mouth health affects the heart too.' },
  { id: 'bone',   bad: 1, t: s => s.bone < 48 && s.muscle < 50, title: 'Weak bones', text: 'Bones have thinned. A simple fall now means a fracture.' },
  { id: 'brain',  bad: 1, t: s => s.brain < 56, title: 'Memory and focus problems', text: 'Brain fog, forgetfulness, and trouble concentrating make everyday life harder.' },
  { id: 'dep',    bad: 1, t: s => s.mood < 32, title: 'A very hard stretch', text: 'Long-term stress and isolation pile up. Support and treatment make recovery possible.' },
  { id: 'lung+',  bad: 0, t: (s, st) => st.age > 45 && s.lungs > 90, title: 'Lungs of a younger person', text: 'A doctor says their lung tests look decades younger than their age.' },
  { id: 'run',    bad: 0, t: (s, st) => st.age > 40 && s.fit > 85, title: 'Finishes a 10K', text: 'Strong heart and muscles: they cross the finish line and feel great.' },
  { id: 'soc+',   bad: 0, t: (s, st) => st.age > 40 && s.social > 88, title: 'Surrounded by loved ones', text: 'Close friends and family fill the house for a milestone birthday.' },
  { id: 'check',  bad: 0, t: (s, st) => st.age > 50 && s.heart > 85 && s.metab > 80, title: 'Perfect check-up', text: 'Blood pressure, cholesterol, and blood sugar are all in the healthy range.' }
];
function checkEvents(st) {
  const out = [];
  EVENTS.forEach(e => {
    if (!st.fired[e.id] && e.t(st.s, st)) {
      st.fired[e.id] = 1;
      const ev = { id: e.id, bad: e.bad, title: e.title, text: e.text, age: Math.floor(st.age) };
      st.events.push(ev); out.push(ev);
    }
  });
  return out;
}

// ---- descriptive bands for the patient chart ----
// each band: [upperBound, status class (g good / y caution / r concern), label, plain-language description]
const BANDS = {
  bp: v => v.sys < 120 && v.dia < 80 ? ['g', 'Normal', 'Arteries are relaxed and blood flows easily.'] :
           v.sys < 130 ? ['y', 'Elevated', 'Pressure is creeping up; the heart works a little harder.'] :
           v.sys < 140 ? ['y', 'High (Stage 1)', 'Arteries are under steady strain, which damages them over time.'] :
           ['r', 'High (Stage 2)', 'Dangerous pressure: raises the risk of heart attack and stroke.'],
  rhr: v => v.rhr < 60 ? ['g', 'Athletic', 'A strong heart pumps a lot per beat, so it beats slowly.'] :
            v.rhr <= 75 ? ['g', 'Healthy', 'Heart is efficient at rest.'] :
            v.rhr <= 90 ? ['y', 'Fast', 'The heart has to beat more often to deliver the same blood.'] :
            ['r', 'Very fast', 'The heart is overworked even while resting.'],
  rr: v => v.rr <= 16 ? ['g', 'Normal', 'Easy, relaxed breathing.'] :
           v.rr <= 20 ? ['y', 'Quick', 'Lungs need more breaths to get the oxygen the body needs.'] :
           ['r', 'Labored', 'Breathing is hard work, even at rest.'],
  spo2: v => v.spo2 >= 96 ? ['g', 'Normal', 'Blood is carrying plenty of oxygen.'] :
             v.spo2 >= 93 ? ['y', 'Slightly low', 'Damaged lungs are not passing along all the oxygen.'] :
             v.spo2 >= 90 ? ['r', 'Low', 'Organs are not getting enough oxygen.'] :
             ['r', 'Dangerously low', 'Needs supplemental oxygen.'],
  bmi: v => v.bmi < 18.5 ? ['y', 'Underweight', 'Not enough fuel: weaker muscles, bones, and immune system.'] :
            v.bmi < 25 ? ['g', 'Healthy range', 'Weight supports energy and a healthy heart.'] :
            v.bmi < 30 ? ['y', 'Overweight', 'Extra weight adds strain on heart, joints, and blood sugar.'] :
            ['r', 'Obesity range', 'Much higher risk of diabetes, heart disease, and joint damage.'],
  glucose: v => v.glucose < 100 ? ['g', 'Normal', 'Body handles sugar well.'] :
                v.glucose < 126 ? ['y', 'Prediabetes range', 'Insulin is struggling; this is the warning zone.'] :
                ['r', 'Diabetes range', 'Blood sugar stays too high and damages vessels and nerves.'],
  ldl: v => v.ldl < 100 ? ['g', 'Optimal', 'Little fatty buildup in the arteries.'] :
            v.ldl < 130 ? ['g', 'Near optimal', 'Fine for now.'] :
            v.ldl < 160 ? ['y', 'Borderline high', 'Plaque starts building inside artery walls.'] :
            ['r', 'High', 'Plaque narrows the arteries and raises heart attack risk.'],
  sleep: v => v.sleep >= 7 ? ['g', 'Restorative', 'Brain and body fully recover each night.'] :
              v.sleep >= 6 ? ['y', 'Short', 'Mild sleep debt: slower focus and weaker immunity.'] :
              ['r', 'Sleep deprived', 'Memory, mood, and heart health suffer.'],
  energy: v => v.energy >= 65 ? ['g', 'High', 'Plenty of energy for the day.'] :
               v.energy >= 40 ? ['y', 'Moderate', 'Gets tired quickly.'] : ['r', 'Low', 'Constantly drained.'],
  sick: v => v.sick <= 4 ? ['g', 'Few', 'Strong immune system.'] : v.sick <= 9 ? ['y', 'Some', 'Catches most bugs going around.'] : ['r', 'Many', 'Immune system is worn down.']
};
