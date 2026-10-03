/* ============================================================
   MODEL — turns slider choices into vitals, labs and organ states.
   Simplified teaching model: directions and rough sizes are realistic,
   but numbers are NOT medical predictions.
   ============================================================ */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

function defaultState() {
  const s = { skin: 2, units: 'us' };
  SLIDERS.forEach(d => (s[d.id] = d.def));
  TOGGLES.forEach(d => (s[d.id] = d.def));
  return s;
}

function compute(s) {
  const yrs = s.years, age = s.age;
  const cw = 1 - Math.exp(-yrs / 8);      // slow damage accumulates over years
  const cwM = 1 - Math.exp(-yrs / 3);     // medium (weight, blood sugar)
  const cf = 1 - Math.exp(-yrs / 1.5);    // fast (fitness adaptations)
  const ageDecl = clamp((age - 25) / 55);

  const cigP = s.cigs / 20, vapeN = s.vape / 5, alcL = s.alcohol / 14;
  const sugarN = s.sugar / 50, sodN = s.sodium / 2300, fryN = s.fried / 3;
  const fiberN = s.fiber / 30, fvN = s.fruitveg / 5, caffN = s.caffeine / 200;
  const A = s.cardio / 60, S = clamp(s.strength / 3, 0, 1.5);
  const sedN = clamp((s.sitting - 6) / 8, -0.2, 1);
  const asthma = s.asthma ? 1 : 0, sick = s.sick ? 1 : 0;
  const famDM = s.famDM ? 1 : 0, famHeart = s.famHeart ? 1 : 0;

  // sleep need depends on age
  const [sLo, sHi] = age <= 18 ? [8, 10] : age <= 64 ? [7, 9] : [7, 8];
  const sleepEff = s.sleep - 0.3 * s.screens;   // bright screens before bed cut sleep quality
  const sleepDef = clamp((sLo - sleepEff) / 4);
  const sleepExc = clamp((s.sleep - sHi - 1) / 3) * 0.5;
  const sleepBad = Math.max(sleepDef, sleepExc);

  const sE = clamp(s.stress / 10 * (1.2 - s.social / 10 * 0.35) - s.relax / 60 * 0.25);

  // hydration
  const need = 7 + 3 * clamp(A, 0, 1.5) + 1.5 * sick + Math.max(0, caffN - 1) + alcL * 0.8;
  const hydIdx = clamp(s.water / need, 0, 1.3);
  const dehyd = clamp(1 - hydIdx);

  // tobacco / air toxins
  const lungTox = cigP + vapeN * 0.45 + s.pollution / 10 * 0.35;
  const nicAcute = clamp(cigP, 0, 2) * 6 + vapeN * 3;
  const pastPack = s.packyrs / 20, rec = 1 - Math.exp(-s.quitYrs / 6);   // past smoking + recovery after quitting
  const lungDmg = clamp(lungTox * cw * 1.05 + pastPack * 0.85 * (1 - 0.45 * rec));
  const ciliaFunc = 1 - clamp(lungTox * 0.85);
  const airway = clamp(asthma * 0.55 + sick * 0.15 + vapeN * 0.1 + s.pollution / 40);

  // ---------- body composition ----------
  const energy = s.energy;
  const fatDriver = 0.9 * Math.tanh(energy / 600) + 0.25 * (sugarN - 1) + 0.2 * (fryN - 0.5) + 0.2 * sleepDef +
    0.2 * sE + 0.15 * clamp(sedN, -0.5, 1) - 0.45 * clamp(A, 0, 1.5) - 0.12 * S - 0.1 * (fiberN - 0.5);
  const cwFat = 1 - Math.exp(-yrs / 2.5);
  const fatPct = clamp(20 + 9 * fatDriver * cwFat + 0.06 * Math.max(0, age - 30), 7, 46);

  const W0 = 22 * Math.pow(s.height / 100, 2);
  const protNeed = W0 * (0.8 + 0.5 * Math.min(S, 1.5) / 1.5);
  const pn = clamp(s.protein / protNeed, 0, 1.4);
  const fuel = energy > -300 ? 1 : 0.5;
  const gain = 0.30 * clamp(S, 0, 1.5) / 1.5 * 1.5 * (0.45 + 0.55 * clamp(pn, 0, 1.1)) * fuel + 0.07 * clamp(A, 0, 1.2);
  const loss = 0.12 * clamp(alcL, 0, 2) + 0.12 * Math.max(0, -energy - 200) / 400 + 0.06 * sleepDef + 0.09 * clamp(sedN, 0, 1) +
    0.1 * Math.max(0, age - 40) / 40 + 0.05 * clamp(cigP, 0, 1.5) + 0.06 * (1 - clamp(pn, 0, 1));
  const muscle = clamp(1 + (gain - 0.16) * cf - loss * cw, 0.62, 1.55);

  const lean = W0 * 0.8 * (1 + 0.6 * (muscle - 1));
  const weight = lean / (1 - fatPct / 100);
  const bmi = weight / Math.pow(s.height / 100, 2);

  // bone
  const ca = s.calcium / 3;
  const boneIdx = clamp(1 + cf * (0.12 * clamp(S, 0, 1.2) + 0.08 * clamp(A, 0, 1.2) + 0.04 * (ca - 0.67) + 0.02 * (pn - 0.8) - 0.098) -
    cw * (0.12 * clamp(cigP, 0, 1.5) + 0.06 * vapeN + 0.1 * clamp(alcL, 0, 2) + 0.07 * Math.max(0, -energy) / 500 + 0.05 * clamp(sedN, 0, 1)) -
    0.0045 * Math.max(0, age - 30) - 0.03 * Math.max(0, 0.5 - ca) - 0.04 * pastPack * (1 - 0.5 * rec), 0.55, 1.25);
  const tScore = (boneIdx - 1) * 10;

  // ---------- fitness ----------
  const vo2 = clamp(32 + 16 * clamp(A, 0, 1.4) * cf + 4 * S * cf - 14 * lungDmg - 0.35 * (fatPct - 20) - 12 * ageDecl - 2 * sleepDef - 3 * clamp(cigP * (1 - cw), 0, 1) * 0, 16, 74);
  const fev1 = clamp(100 - 38 * lungDmg - 7 * asthma * 0.55 * 1.8 - 5 * sick + 3 * clamp(A, 0, 1.2) * cf - 6 * ageDecl, 38, 112);

  // ---------- vitals ----------
  const rhr = clamp(76 - 17 * clamp(A, 0, 1.4) * cf - 3 * clamp(S, 0, 1) * cf + nicAcute + 3 * clamp(caffN, 0, 3) +
    2.5 * clamp(alcL, 0, 2) + 6 * sleepBad + 9 * sE + 6 * dehyd + 5 * clamp(sedN, 0, 1) + 0.35 * (fatPct - 20) * cwM + 14 * sick, 38, 135);
  const sv = 5000 * (1 + 0.04 * sick) / rhr; // stroke volume mL (cardiac output ~5 L/min)

  const fishD = s.fish - 1;
  const LDL = clamp(84 + 13 * s.fried - 1.5 * fishD + 0.8 * (fatPct - 20) * cwM + 30 * famHeart + 9 * clamp(cigP, 0, 1.5) * cw +
    0.15 * Math.max(0, age - 16) + 6 * (sugarN - 1) - 20 * clamp(fiberN, 0, 1.5) * 0.5 - 6 * clamp(A, 0, 1.2) * cf - 4 * (fvN - 0.6), 45, 260);
  const IR = clamp(0.7 * (0.5 * (fatPct - 20) / 15 + 0.35 * (sugarN - 1) + 0.25 * famDM + 0.2 * sE + 0.2 * sleepDef + 0.12 * (fryN - 0.5) * 0.6 -
    0.45 * clamp(A, 0, 1.5) - 0.15 * S - 0.15 * fiberN + 0.1 * clamp(sedN, 0, 1) + 0.1 * Math.max(0, age - 16) / 60 + 0.42), 0, 1.2);
  const HDL = clamp(52 + 1 * fishD + 12 * clamp(A, 0, 1.4) * cf + 3 * S * cf - 0.6 * (fatPct - 20) - 12 * clamp(cigP, 0, 1.5) * 0.8 - 4 * Math.max(0, sugarN - 1.5) + 2 * (fvN - 0.6), 22, 90);
  const TG = clamp(78 - 6 * fishD + 1.3 * (s.sugar - 50) + 25 * clamp(alcL, 0, 2) + 2.5 * (fatPct - 20) + 22 * IR - 12 * clamp(A, 0, 1.4) * cf + 6 * s.fried, 38, 520);
  const TC = LDL + HDL + TG / 5;
  const glucose = clamp(83 + 6 * IR + 30 * IR * IR + 2 * sick * 0 + 3 * sE, 62, 220);
  const a1c = (glucose * 1.12 + 8 + 46.7) / 28.7;

  // plaque + stiffness
  const sys0 = 108 + clamp(3.5 * (s.sodium - 2300) / 1000, -5, 10) + 0.3 * (fatPct - 20) * cwM + 3.2 * clamp(cigP, 0, 2) + 1.5 * vapeN +
    5 * clamp(alcL, 0, 2) + 8 * sE + 2 * clamp(caffN, 0, 3) - 8 * clamp(A, 0, 1.3) * cf - 2.5 * (clamp(fvN, 0, 1.6) - 0.6) +
    0.28 * Math.max(0, age - 16) + 3 * sleepBad + 3 * clamp(sedN, 0, 1) + 3 * dehyd;
  const plaque = clamp((0.5 * Math.max(0, (LDL - 100) / 80) + 0.55 * clamp(cigP, 0, 2) + 0.2 * vapeN + 0.35 * Math.max(0, (sys0 - 120) / 40) +
    0.35 * IR + 0.25 * clamp(alcL, 0, 2) * 0.5 + 0.15 * Math.max(0, age - 16) / 60 + 0.15 * sE - 0.2 * clamp(A, 0, 1.4) - 0.1 * fvN) * cw * 1.3 + pastPack * 0.5 * (1 - 0.55 * rec));
  const sys = clamp(sys0 + 8 * plaque, 84, 205);
  const dia = clamp(68 + 0.55 * (sys - 108) - 0.1 * Math.max(0, age - 40), 50, 125);

  const rr = clamp(14.5 + 3.5 * lungDmg + 4 * airway + 7 * sick + 1.5 * sE + 2.5 * Math.max(0, fatPct - 25) / 15 - 1.8 * clamp(A, 0, 1.4) * cf +
    1.5 * clamp(cigP, 0, 1.5) * (1 - cw) * 0.5 + 0.8 * vapeN, 9, 34);
  const tempF = 98.2 + 2.6 * sick + 0.25 * dehyd + 0.15 * sE + 0.1 * Math.max(0, caffN - 2);
  const coHb = clamp(0.8 + 5.2 * clamp(cigP, 0, 2) + 1.2 * vapeN + 0.35 * s.pollution, 0.5, 14);
  const spo2 = clamp(98.8 - 3.2 * lungDmg - 1.1 * airway - 1.6 * sick + 0.4 * clamp(A, 0, 1.2) * cf, 86, 100);

  const crp = clamp(0.5 + 0.12 * Math.max(0, fatPct - 18) + 0.8 * clamp(cigP, 0, 2) * (0.4 + cw) + 0.4 * clamp(alcL, 0, 2) + 0.6 * sE + 0.6 * sleepBad +
    0.4 * Math.max(0, sugarN - 1) + 0.3 * fryN - 0.5 * clamp(A, 0, 1.2) - 0.08 * fishD + 4 * sick, 0.2, 14);

  // ---------- system scores (0-100, higher = better) ----------
  const cog = clamp(100 - 28 * sleepBad - 12 * sE - 10 * clamp(alcL, 0, 2) - 6 * Math.max(0, caffN - 2.5) + 3 * clamp(caffN, 0, 1.2) + 8 * clamp(A, 0, 1.2) * cf +
    4 * clamp(fvN, 0, 1) + 1.5 * fishD - 8 * clamp(cigP, 0, 1.5) - 4 * clamp(vapeN, 0, 1.5) - 8 * dehyd - 6 * sick - 0.1 * Math.max(0, age - 60) * 2, 5, 100, 5);
  const mood = clamp(72 + 16 * clamp(A, 0, 1.2) * cf - 24 * sE - 18 * sleepBad - 10 * sick + 8 * (s.social / 10 - 0.5) * 1.6 - 4 * clamp(sedN, 0, 1) + 3 * (fvN - 0.6) - 4 * clamp(alcL, 0, 2) + 6 * (s.relax / 60), 5, 100);
  const immune = clamp(82 - 25 * sleepBad - 14 * sE - 10 * clamp(alcL, 0, 2) - 10 * clamp(cigP, 0, 1.5) - 8 * Math.max(0, sugarN - 1.5) + 8 * clamp(fvN, 0, 1) + 6 * clamp(A, 0, 1) +
    (s.vaccines ? 7 : -3) + (s.handwash ? 4 : -2) - 6 * Math.max(0, fatPct - 28) / 12 - 8 * clamp(ageDecl, 0, 1) * 0.6, 12, 100);
  const uvDose = s.sun * (1 - 0.85 * s.sunscreen / 100);
  const uvDmg = clamp(uvDose / 3 * (0.25 + 0.75 * cw) * 1.4);
  const smokeSkin = clamp(cigP * cw * 1.1 + vapeN * cw * 0.3 + pastPack * 0.45 * (1 - 0.4 * rec));
  const skinHealth = clamp(92 - 38 * uvDmg - 28 * smokeSkin - 9 * sleepBad - 7 * Math.max(0, sugarN - 1) - 10 * dehyd + 7 * clamp(fvN, 0, 1) - 0.3 * Math.max(0, age - 20) - 5 * sE, 8, 100);
  const liverFat = clamp(2.5 + 16 * clamp(0.5 * clamp(alcL, 0, 2) * cw + 0.4 * Math.max(0, sugarN - 0.8) * cwM + 0.35 * Math.max(0, fatPct - 25) / 20 + 0.25 * IR + 0.1 * fryN * cwM - 0.15 * clamp(A, 0, 1.2) * cf, 0, 1.2), 1.5, 40);
  const kidney = clamp(16 + 18 * clamp(sodN - 1, 0, 2) + 20 * dehyd + 22 * Math.max(0, (sys - 120) / 40) + 12 * IR + 0.2 * Math.max(0, age - 40), 5, 100);
  const gutH = clamp(70 + 15 * clamp(fiberN, 0, 1.5) + 10 * clamp(fvN, 0, 1.2) - 14 * Math.max(0, sugarN - 1) - 10 * clamp(alcL, 0, 2) - 8 * sE - 5 * fryN + 6 * hydIdx - 4 * sleepBad * 3, 8, 100);
  const dental = clamp(100 - 38 * clamp(sugarN * (s.brush ? 0.5 : 1.25) * 0.8 + clamp(cigP, 0, 1.5) * 0.35 + (s.brush ? 0 : 0.35) - 0.12 * clamp(s.water / 8, 0, 1), 0, 1.6) * (0.4 + 0.6 * cw), 20, 100);

  const urine = clamp(1 + 7 * (1 - clamp(hydIdx, 0, 1.05)) * 0.98 - (hydIdx > 1.1 ? 0.5 : 0), 1, 8);

  // ---------- radar profile (0-1) ----------
  const prof = {
    Heart: clamp(1 - (rhr - 52) / 60 * 0.6 - Math.max(0, sys - 118) / 70 * 0.7 - plaque * 0.6 + 0.3 * clamp(sv / 100 - 0.7, 0, 0.5)),
    Lungs: clamp((fev1 - 40) / 62),
    Muscle: clamp((muscle - 0.6) / 0.9),
    Bones: clamp((boneIdx - 0.55) / 0.65),
    Brain: clamp(cog / 100),
    Metabolism: clamp(1 - IR * 0.7 - Math.max(0, (LDL - 100) / 150) * 0.4 - Math.max(0, (TG - 100) / 300) * 0.4),
    Immune: clamp(immune / 100),
    Skin: clamp(skinHealth / 100),
  };

  const moodFace = clamp((mood - 50) / 40, -1, 1);

  return {
    // vitals
    rhr, bpSys: sys, bpDia: dia, rr, temp: tempF, spo2, sleepdur: s.sleep, sv,
    // labs
    glucose, a1c, tc: TC, ldl: LDL, hdl: HDL, tg: TG, crp, cohb: coHb,
    // body
    weight, bmi, bodyfat: fatPct, muscle: muscle * 100, bone: tScore, vo2, fev1, hydration: urine,
    // systems
    focus: cog, mood, immune, skin: skinHealth, liver: liverFat, kidney, gut: gutH, dental,
    prof,
    // visual drivers
    vis: {
      lungDmg, ciliaFunc, airway, lungTox, plaque, heartScale: 1 + 0.14 * clamp(A, 0, 1.4) * cf + 0.1 * Math.max(0, (sys - 125) / 35) * cw,
      heartStress: clamp((rhr - 70) / 50 + Math.max(0, sys - 125) / 60),
      muscle, fatPct, boneIdx, IR, sleepBad, sleepDef, stress: sE, uvDmg, smokeSkin, dehyd, hydIdx, urine,
      liverFat, kidney, gut: gutH / 100, dental: dental / 100, cigP, vapeN, alcL, caffN, fiberN, sugarN, sodN, fryN,
      age, ageDecl, moodFace, sick, asthma, A, S, sedN, cw, cf, cwM, glucose, nic: clamp(cigP + vapeN * 0.6, 0, 2),
      pollution: s.pollution / 10, famHeart, water: s.water, energy, brush: s.brush ? 1 : 0,
    },
  };
}

/* ---------- status of each metric: 'good' | 'warn' | 'bad' ---------- */
function statusOf(id, m, s) {
  const youth = s.age < 20;
  const band = (v, goodLo, goodHi, warnLo, warnHi) =>
    v >= goodLo && v <= goodHi ? 'good' : v >= warnLo && v <= warnHi ? 'warn' : 'bad';
  switch (id) {
    case 'rhr': return band(m.rhr, 50, 100, 40, 110);
    case 'bp': {
      const a = m.bpSys, d = m.bpDia;
      if (a < 90 || d < 55) return 'warn';
      if (a < 120 && d < 80) return 'good';
      if (a < 130 && d < 80) return 'warn';
      if (a < 140 && d < 90) return 'warn';
      return 'bad';
    }
    case 'rr': return band(m.rr, 12, youth ? 18 : 20, 10, 24);
    case 'temp': return m.temp >= 100.4 ? 'bad' : m.temp > 99.3 ? 'warn' : 'good';
    case 'spo2': return m.spo2 >= 95 ? 'good' : m.spo2 >= 92 ? 'warn' : 'bad';
    case 'sleepdur': {
      const [lo, hi] = s.age <= 18 ? [8, 10] : s.age <= 64 ? [7, 9] : [7, 8];
      return s.sleep >= lo && s.sleep <= hi ? 'good' : s.sleep >= lo - 1 && s.sleep <= hi + 1 ? 'warn' : 'bad';
    }
    case 'sv': return m.sv >= 60 && m.sv <= 125 ? 'good' : m.sv >= 50 ? 'warn' : 'bad';
    case 'glucose': return m.glucose < 100 ? 'good' : m.glucose < 126 ? 'warn' : 'bad';
    case 'a1c': return m.a1c < 5.7 ? 'good' : m.a1c < 6.5 ? 'warn' : 'bad';
    case 'tc': return youth ? (m.tc < 170 ? 'good' : m.tc < 200 ? 'warn' : 'bad') : (m.tc < 200 ? 'good' : m.tc < 240 ? 'warn' : 'bad');
    case 'ldl': return youth ? (m.ldl < 110 ? 'good' : m.ldl < 130 ? 'warn' : 'bad') : (m.ldl < 100 ? 'good' : m.ldl < 160 ? 'warn' : 'bad');
    case 'hdl': return youth ? (m.hdl > 45 ? 'good' : m.hdl >= 40 ? 'warn' : 'bad') : (m.hdl >= 40 ? 'good' : m.hdl >= 35 ? 'warn' : 'bad');
    case 'tg': return youth ? (m.tg < 90 ? 'good' : m.tg < 130 ? 'warn' : 'bad') : (m.tg < 150 ? 'good' : m.tg < 200 ? 'warn' : 'bad');
    case 'crp': return m.crp < 1 ? 'good' : m.crp <= 3 ? 'warn' : 'bad';
    case 'cohb': return m.cohb < 2.5 ? 'good' : m.cohb < 5 ? 'warn' : 'bad';
    case 'bmi': return m.bmi >= 18.5 && m.bmi < 25 ? 'good' : m.bmi >= 17 && m.bmi < 30 ? 'warn' : 'bad';
    case 'bodyfat': return m.bodyfat >= 10 && m.bodyfat <= 30 ? 'good' : m.bodyfat >= 7 && m.bodyfat <= 38 ? 'warn' : 'bad';
    case 'muscle': return m.muscle >= 95 ? 'good' : m.muscle >= 80 ? 'warn' : 'bad';
    case 'bone': return m.bone >= -1 ? 'good' : m.bone > -2.5 ? 'warn' : 'bad';
    case 'vo2': return m.vo2 >= 40 ? 'good' : m.vo2 >= 30 ? 'warn' : 'bad';
    case 'fev1': return m.fev1 >= 80 ? 'good' : m.fev1 >= 70 ? 'warn' : 'bad';
    case 'hydration': return m.hydration <= 3 ? 'good' : m.hydration <= 5 ? 'warn' : 'bad';
    case 'liver': return m.liver < 5 ? 'good' : m.liver < 10 ? 'warn' : 'bad';
    case 'kidney': return m.kidney < 35 ? 'good' : m.kidney < 60 ? 'warn' : 'bad';
    default: { const v = m[id]; return v >= 70 ? 'good' : v >= 45 ? 'warn' : 'bad'; }
  }
}

/* ---------- display specs: value text + range bar scale ---------- */
function metricDisplay(id, m, s) {
  const us = s.units === 'us';
  const f1 = x => x.toFixed(1), f0 = x => Math.round(x).toString();
  const youth = s.age < 20;
  switch (id) {
    case 'rhr': return { v: f0(m.rhr), u: 'bpm', min: 35, max: 130, lo: 60, hi: 100 };
    case 'bp': return { v: f0(m.bpSys) + '/' + f0(m.bpDia), u: 'mmHg', min: 80, max: 190, lo: 90, hi: 119, p: m.bpSys };
    case 'rr': return { v: f0(m.rr), u: 'breaths/min', min: 8, max: 34, lo: 12, hi: youth ? 18 : 20 };
    case 'temp': return us ? { v: f1(m.temp), u: '°F', min: 96, max: 104, lo: 97, hi: 99, p: m.temp }
      : { v: f1((m.temp - 32) / 1.8), u: '°C', min: 35.5, max: 40, lo: 36.1, hi: 37.2, p: (m.temp - 32) / 1.8 };
    case 'spo2': return { v: f0(m.spo2), u: '%', min: 86, max: 100, lo: 95, hi: 100 };
    case 'sleepdur': return { v: f1(s.sleep), u: 'hours', min: 3, max: 12, lo: s.age <= 18 ? 8 : 7, hi: s.age <= 18 ? 10 : 9 };
    case 'sv': return { v: f0(m.sv), u: 'mL/beat', min: 40, max: 130, lo: 60, hi: 100 };
    case 'glucose': return { v: f0(m.glucose), u: 'mg/dL', min: 60, max: 180, lo: 70, hi: 99 };
    case 'a1c': return { v: f1(m.a1c), u: '%', min: 4.5, max: 9, lo: 4.5, hi: 5.6 };
    case 'tc': return { v: f0(m.tc), u: 'mg/dL', min: 100, max: 320, lo: 125, hi: youth ? 169 : 199 };
    case 'ldl': return { v: f0(m.ldl), u: 'mg/dL', min: 40, max: 220, lo: 40, hi: youth ? 109 : 99 };
    case 'hdl': return { v: f0(m.hdl), u: 'mg/dL', min: 20, max: 90, lo: youth ? 46 : 40, hi: 90 };
    case 'tg': return { v: f0(m.tg), u: 'mg/dL', min: 30, max: 400, lo: 30, hi: youth ? 89 : 149 };
    case 'crp': return { v: f1(m.crp), u: 'mg/L', min: 0, max: 10, lo: 0, hi: 0.99 };
    case 'cohb': return { v: f1(m.cohb), u: '%', min: 0, max: 12, lo: 0, hi: 2 };
    case 'bmi': return { v: f1(m.bmi), u: 'kg/m²', min: 14, max: 40, lo: 18.5, hi: 24.9 };
    case 'bodyfat': return { v: f0(m.bodyfat), u: '%', min: 5, max: 45, lo: 10, hi: 30 };
    case 'muscle': return { v: f0(m.muscle), u: '% of typical', min: 60, max: 155, lo: 95, hi: 155 };
    case 'bone': return { v: (m.bone > 0 ? '+' : '') + f1(m.bone), u: 'T-score', min: -4, max: 2.5, lo: -1, hi: 2.5 };
    case 'vo2': return { v: f0(m.vo2), u: 'mL/kg/min', min: 16, max: 72, lo: 40, hi: 72 };
    case 'fev1': return { v: f0(m.fev1), u: '% predicted', min: 40, max: 110, lo: 80, hi: 110 };
    case 'hydration': return { v: 'Level ' + f0(m.hydration), u: 'urine color 1–8', min: 1, max: 8, lo: 1, hi: 3, p: m.hydration, urine: m.hydration };
    case 'liver': return { v: f1(m.liver), u: '% liver fat', min: 0, max: 30, lo: 0, hi: 5 };
    case 'kidney': return { v: f0(m.kidney), u: 'strain /100', min: 0, max: 100, lo: 0, hi: 35 };
    default: return { v: f0(m[id]), u: 'score /100', min: 0, max: 100, lo: 70, hi: 100 };
  }
}

/* ---------- body-weight display ---------- */
function fmtWeight(kg, units) { return units === 'us' ? Math.round(kg * 2.2046) + ' lb' : Math.round(kg) + ' kg'; }
function fmtHeight(cm, units) {
  if (units !== 'us') return Math.round(cm) + ' cm';
  const inches = cm / 2.54; return Math.floor(inches / 12) + '′ ' + Math.round(inches % 12) + '″';
}
function fmtTemp(f, units) { return units === 'us' ? f.toFixed(1) + ' °F' : ((f - 32) / 1.8).toFixed(1) + ' °C'; }

/* ---------- clinical-thinking notes (the worksheet's key idea: context!) ---------- */
function contextNotes(m, s) {
  const v = m.vis, out = [];
  if (m.bmi >= 25 && m.bodyfat < 22 && v.muscle > 1.15)
    out.push(['⚖️', 'BMI says “higher than typical,” but body fat is low and muscle is high. BMI can’t tell muscle from fat — one number isn’t the whole picture.']);
  if (m.bmi < 18.5 && v.energy < -200)
    out.push(['⚖️', 'A low BMI plus a big calorie shortfall means the body may not have enough fuel for bones, muscles and growth.']);
  if (m.spo2 >= 95 && m.cohb >= 5)
    out.push(['☁️', 'SpO₂ looks normal, but carbon monoxide is hogging hemoglobin. A pulse oximeter can be fooled — context matters.']);
  if (m.rhr < 58 && v.A > 1 && s.cardio >= 60)
    out.push(['💓', 'A low resting heart rate can be a sign of a very strong heart in an athlete — not a problem when there are no symptoms.']);
  if (m.rhr > 90 && (v.caffN > 1.25 || v.nic > 0.2 || v.stress > 0.5))
    out.push(['💓', 'Caffeine, nicotine and stress temporarily speed the pulse. Doctors repeat measurements at rest before drawing conclusions.']);
  if (m.bpSys >= 120 && (v.caffN > 1.25 || v.stress > 0.5 || v.nic > 0.2))
    out.push(['🩺', 'One high blood-pressure reading may be caused by stress, caffeine or nicotine. Diagnosis needs repeated readings at rest.']);
  if (m.glucose >= 100 && m.glucose < 126)
    out.push(['🍬', 'Fasting glucose in the 100–125 range is “prediabetes” — a warning that habits can often reverse. It must be measured after ≥8 hours without food.']);
  if (s.age < 20 && (m.ldl >= 110 || m.tg >= 90))
    out.push(['🧪', 'Cholesterol ranges are different for teens than for adults — always use age-appropriate references.']);
  if (s.sick)
    out.push(['🌡️', 'Fever raises temperature, heart rate and breathing rate together. When one vital sign changes, check the others for context.']);
  if (s.sleep < 7 && s.age <= 18)
    out.push(['🛌', 'Teens need 8–10 hours. Short sleep nudges heart rate, blood pressure, blood sugar and mood all at once.']);
  if (v.stress > 0.55)
    out.push(['😰', 'Stress is a lifestyle factor that touches many metrics at once: heart rate, blood pressure, blood sugar, sleep and immunity.']);
  if (s.asthma && m.fev1 < 90)
    out.push(['🫁', 'Asthma flare-ups come and go. A single lung measurement can look different on a good day vs. a bad day.']);
  if (m.hdl < 40 && m.ldl < 100)
    out.push(['🧪', 'LDL looks fine, but HDL is low. Look at the whole lipid panel, not just one number.']);
  if (!out.length)
    out.push(['🩺', 'A single measurement rarely tells the whole story. Health professionals look at age, symptoms, trends over time, and measurement conditions.']);
  return out.slice(0, 4);
}
