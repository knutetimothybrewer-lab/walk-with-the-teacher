import type { ActionDef, InterventionDef, LabModule } from '../../engine/types';
import P from './params.json';
import * as M from './model';

export * from './model';

export const ACTIONS: ActionDef[] = [
  { id: 'interview_cases', label: 'Interview cases', description: 'Ask people on the line list what they ate, drank and did before they got sick. Answers rely on memory, so they are imperfect.', cost: 6, days: 1, resultDelay: 0,
    params: [{ key: 'n', label: 'How many', options: [{ value: '5', label: '5 cases' }, { value: '10', label: '10 cases' }, { value: '20', label: '20 cases' }] }] },
  { id: 'survey_residents', label: 'Survey residents (ill and not ill)', description: 'Interview a random sample of residents, whether or not they were sick. This lets you compare illness rates between people who did and did not have an exposure.', cost: 12, days: 1, resultDelay: 0,
    params: [
      { key: 'n', label: 'Sample size', options: [{ value: '15', label: '15 residents' }, { value: '30', label: '30 residents' }, { value: '60', label: '60 residents' }] },
      { key: 'scope', label: 'Who to sample', options: [{ value: 'all', label: 'Anyone in Riverton' }, { value: 'festival', label: 'Festival attendees' }, ...['oldtown', 'riverside', 'southfield', 'millworks', 'eastside', 'westbrook', 'hillcrest', 'pinewood'].map((h) => ({ value: h, label: `Residents of ${M.hoodName(h)}` }))] }] },
  { id: 'water_sample', label: 'Test water', description: 'Send tap-water samples to the lab. Results take two days, and tests are not perfect.', cost: 8, days: 0, resultDelay: 2,
    params: [{ key: 'hood', label: 'Where', options: ['oldtown', 'riverside', 'southfield', 'millworks', 'eastside', 'westbrook', 'hillcrest', 'pinewood'].map((h) => ({ value: h, label: M.hoodName(h) })) }] },
  { id: 'inspect', label: 'Inspect a place', description: 'Send an inspector to check food safety or pool conditions.', cost: 6, days: 1, resultDelay: 0,
    params: [{ key: 'target', label: 'Where', options: [{ value: 'wraps', label: 'Big Al’s Wraps (festival)' }, { value: 'tacos', label: 'Lopez Tacos (festival)' }, { value: 'diner', label: 'Maple Street Diner' }, { value: 'pool', label: 'Riverside public pool' }] }] },
  { id: 'specimens', label: 'Collect lab specimens', description: 'Stool tests confirm the germ. They tell you what is making people sick, not where it came from.', cost: 10, days: 0, resultDelay: 2 },
  { id: 'active_case_finding', label: 'Active case finding', description: 'Contact clinics and call households to find sick people who never got tested. This reduces underreporting.', cost: 15, days: 2, resultDelay: 0,
    params: [{ key: 'hood', label: 'Where', options: [{ value: 'all', label: 'All of Riverton' }, ...['oldtown', 'riverside', 'southfield', 'millworks', 'eastside', 'westbrook', 'hillcrest', 'pinewood'].map((h) => ({ value: h, label: M.hoodName(h) }))] }] },
  { id: 'wait', label: 'Wait one day', description: 'Let a day pass for results to arrive. Cases keep occurring.', cost: 0, days: 1, resultDelay: 0 },
];

export const INTERVENTIONS: InterventionDef[] = [
  { id: 'boil_water', label: 'Boil-water notice', description: 'Tell residents to boil tap water. Works only if the water is the source, and depends on how many people follow it (community trust).' },
  { id: 'fix_main', label: 'Repair the water main', description: 'Fix the break and flush the pipes. Stops the contamination at its source.' },
  { id: 'close_vendor', label: 'Close the food vendor', description: 'Order the vendor to stop serving until inspected.' },
  { id: 'close_pool', label: 'Close the public pool', description: 'Close and disinfect the pool.' },
  { id: 'hand_hygiene', label: 'Hand-hygiene campaign', description: 'Posters, soap and sanitizer, and reminders. Helps a little against any person-to-person spread.' },
  { id: 'exclusion', label: 'Exclude sick people from school or work', description: 'Sick students, staff and residents stay home until 48 hours after symptoms stop.' },
];

/** A seed is "viable" if the outbreak is big enough to investigate and is noticed. Keeps tiny, fizzled seeds out of class. */
export function viableTruth(seed: number, scenario: M.Scenario | 'random'): M.Truth {
  for (let k = 0; k < 40; k++) {
    const t = M.generateTruth(seed + k * 7919, scenario);
    const s = M.simulate(t);
    if (s.infections.length < 80 || M.alertDay(t, s) == null) continue;
    const c = M.classifyCurve(M.epiCurve(s.infections.filter((i) => i.sym).map((i) => ({ onsetHr: i.onsetHr })), 24).map((b) => b.count));
    if (c !== t.source.curve) continue; // the curve must show its source type clearly
    return t;
  }
  return M.generateTruth(seed, scenario);
}

export const outbreakLab: LabModule<M.Scenario, M.Truth, M.Sim, M.Iv> = {
  id: 'outbreak',
  scenarios: M.SCENARIOS,
  generate: viableTruth,
  actions: ACTIONS,
  interventions: INTERVENTIONS,
  simulate: (t, ivs) => M.simulate(t, ivs),
  tools: ['lineList', 'epiCurve', 'spotMap', 'twoByTwo', 'resample'],
  content: {
    title: 'Outbreak in Riverton',
    tagline: 'Find the source of a stomach-illness outbreak before more people get sick.',
    alert: { headline: 'ER visits for stomach illness are climbing', body: 'The health department dashboard shows more people than usual arriving at Riverton emergency rooms with vomiting and diarrhea. Is this an outbreak?' },
    lessons: ['lab-chain-surveillance', 'lab-casedef-epicurve', 'lab-attack-rr-confounding'],
    underTheHood: {
      assumptions: [
        'The pathogen is fictional but behaves like a norovirus-type stomach bug: a short, right-skewed incubation and mostly short illness.',
        'Residents are a sample of about 6,000 people spread across Riverton’s neighborhoods in proportion to population.',
        'Each outbreak has one true source, fixed by the seed. Investigators see it only through noisy surveillance and interviews.',
        'Only a small share of sick people are ever tested and reported (the surveillance pyramid), and reports arrive days late.',
        'Interview answers have realistic memory errors that grow with time since the exposure.',
        'Whether people follow an intervention depends on community trust from Crossroads.',
      ],
      parameters: [
        { name: 'Incubation', value: `median ${P.incubation.medianHours} h, range ${P.incubation.minHours}–${P.incubation.maxHours} h (right-skewed)`, note: 'Lognormal, as in norovirus outbreak reports.' },
        { name: 'Symptomatic share', value: `${P.symptomaticShare * 100}%`, note: 'The rest are infected without symptoms.' },
        { name: 'Seek care → tested → reported', value: `${P.pyramid.seekCare * 100}% → ${P.pyramid.tested * 100}% → ${P.pyramid.reported * 100}%`, note: 'Why reported cases are far fewer than true cases.' },
        { name: 'Report delay', value: `${P.pyramid.reportDelayDays[0]}–${P.pyramid.reportDelayDays[1]} days after onset`, note: 'Lab confirmation and paperwork take time.' },
        { name: 'Memory error', value: `${P.recall.forgetPerDay * 100}% more forgotten per day, up to ${P.recall.forgetMax * 100}%`, note: 'Recall bias grows with time.' },
        { name: 'Household / school / nursing-home spread', value: `${P.contact.household} / ${P.contact.school} / ${P.contact.nursing} per infectious contact-day`, note: 'Higher in the person-to-person scenario.' },
      ],
      sources: ['CDC Field Epidemiology / Steps of an Outbreak Investigation (the 10-step approach)', 'CDC norovirus clinical overview: incubation about 12–48 h, illness 1–3 days, high secondary attack rates in institutions', 'CDC FoodNet surveillance pyramid concept (illness → care → specimen → lab confirmation → report)'],
      limitations: [
        'Real investigators also use genetic testing of the germ to link cases; this model does not.',
        'Real reporting systems have more steps, more partners, and more messy data.',
        'People change behavior in many ways beyond following or ignoring one notice.',
        'The pathogen, restaurants, and places are fictional; real outbreaks have more than one possible source at once.',
      ],
    },
  },
};
