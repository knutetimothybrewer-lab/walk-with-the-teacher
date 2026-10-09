// Sources and Research panel (Teacher Mode only).  Static on purpose: every entry says what was verified, when, and what was NOT.
// Rule used throughout the build: invented data is labeled FICTIONAL on screen, real research is cited, and nothing is presented as research that is not.
import { h } from '../util.js';

const CHECKED = '2026-10-09';
const RESEARCH = [
  { cite: 'Fiorillo, C. D., Tobler, P. N., & Schultz, W. (2003). Discrete coding of reward probability and uncertainty by dopamine neurons. Science, 299(5614), 1898–1902.', doi: '10.1126/science.1077349', url: 'https://pubmed.ncbi.nlm.nih.gov/12649484/',
    used: 'Neuroscience Lab, Station 1 (reward signal): an uncertainty-related signal that was largest at a 50% chance of reward.', status: 'Bibliographic record and abstract checked against PubMed.', caveat: 'Experiment on macaque monkeys. The lab’s model is a simplified illustration, not a measurement of human brains.' },
  { cite: 'Clark, L., Lawrence, A. J., Astley-Jones, F., & Gray, N. (2009). Gambling near-misses enhance motivation to gamble and recruit win-related brain circuitry. Neuron, 61(3), 481–490.', doi: '10.1016/j.neuron.2008.12.031', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/',
    used: 'Neuroscience Lab, Station 2 (near-miss darts): near-misses were rated less pleasant than full misses but increased the desire to play.', status: 'Bibliographic record and abstract checked.', caveat: 'The effect in the paper depended on the player having personal control over the gamble. A seven-throw classroom exercise cannot replicate it; the lab says so.' },
  { cite: 'Casey, B. J., Jones, R. M., & Hare, T. A. (2008). The adolescent brain. Annals of the New York Academy of Sciences, 1124, 111–126.', doi: '10.1196/annals.1440.010', url: 'https://doi.org/10.1196/annals.1440.010',
    used: 'Neuroscience Lab, Station 4 (teen brain): the idea that reward-related systems and cognitive-control systems mature on different timelines.', status: 'Bibliographic record confirmed. The full text was not read in this build.', caveat: 'The lab’s curves are a teaching sketch, labeled as not measured data.' },
  { cite: 'National Institute of Mental Health. The Teen Brain: 7 Things to Know.', doi: '', url: 'https://www.nimh.nih.gov/health/publications/the-teen-brain-7-things-to-know',
    used: 'Station 4 note and the “still developing” framing: development continues into the mid-to-late 20s; the prefrontal cortex is among the last regions to mature.', status: 'Current page read.', caveat: 'The unit slides say “mid-20s”; the current NIMH page says “mid-to-late 20s.” Both are approximate and vary by person. The assessment avoids a precise age.' },
  { cite: 'National Council on Problem Gambling. National Problem Gambling Helpline: 1-800-GAMBLER (1-800-426-2537) and 1-800-522-4700; ncpgambling.org.', doi: '', url: 'https://www.ncpgambling.org/',
    used: 'Chapter 6 help resources and the helpline note on several screens.', status: 'Numbers are those printed in the unit materials. Website not re-checked in this build.', caveat: 'Before each school year, confirm the numbers on ncpgambling.org and edit the text in the question bank if they change.' }
];
const STATS = [
  ['“Only about 3–5% of sports bettors are profitable over the long run.”', 'Day 2 student handout, citing “studies.”', 'Secondary claim; the primary studies are not named. The assessment does not ask students to recall it.'],
  ['“You need to win 52.4% of bets at −110 odds to break even.”', 'Day 2 handout.', 'Arithmetic, verified independently: 110 ÷ 210 = 52.38%. Used as math, not as a recalled fact.'],
  ['“$16.8 billion in sportsbook revenue” and a “2025 U.S. News Sports Betting & Debt Survey.”', 'Day 2 handout (AGA data via ESPN; RG.org; U.S. News).', 'Secondary sources, not re-verified. Not used in graded items.'],
  ['Average yearly lottery spending by household income ($10,000 → $645; $30,000 → $412; $75,000 → $105).', 'Day 2 handout (Bankrate surveys; Clotfelter, Cook, Edell & Moore).', 'Used in one question and labeled “CLASS HANDOUT (consumer surveys),” with the note that surveys rely on self-report.'],
  ['Powerball jackpot odds of 1 in 292,201,338; lightning “about 1 in 1,000,000.”', 'Day 2 handout.', 'Used in one question as given in the handout. The lightning figure is an approximate, commonly quoted number; the question asks only for the ratio.']
];
const FICTION = [
  'All companies, apps, ads, athletes, teams, players, fans, posts and quotes are invented. Brand names were chosen to avoid real organizations.',
  'Sportsbook odds, implied probabilities, team ratings, home-court advantage and player stats are generated from a disclosed model (an Elo-style rating formula plus a stated margin).',
  'Viewer-age percentages in the Ad Lab, the social-feed counts and the “customer report” are made up for teaching. They are not statistics about any real app.',
  'Neuroscience Lab curves, the reward-prediction-error trials and the darts are simplified teaching models.',
  'Coins, dice, the house-edge game and the 10,000-slip test run on deterministic pseudo-random streams so the server can recompute every graded number. Real gambling products are not random-number-free either, but this is a classroom model.',
  'Tokens are pretend. No real money, real wagering or real gambling is offered or simulated for money.'
];
const DISCREPANCIES = [
  ['Class “Roll & Risk” station (Brain Lab packet, Station 3)', 'The payout table (2–5: 0×, 6–8: 1×, 9–10: 2×, 11: 3×, 12: 5×) has an expected return of 41/36 ≈ 1.14× the wager, so the player, not the house, has the edge in that one station. The lesson message is “the house always wins.”', 'The assessment does not reuse that table as a claim about real gambling. Consider adjusting the station (for example, 6–8 returns 0.5×) before the next class.'],
  ['Teen brain timing', 'Slides say “mid-20s”; the current NIMH page says “mid-to-late 20s.”', 'The assessment says development continues “into the twenties” and cites NIMH.'],
  ['Prediction Markets video', 'The video itself was not available during the build; only its Guide questions were used.', 'Chapter 1 item c1-market and Chapter 4 “building a book” rely on the guide’s questions, not the footage. Please review them against the video.'],
  ['Time estimate', 'The master brief asks for about 60 minutes. The model estimates about 56–66 minutes for a typical student and up to the 90-minute cap for a slow reader.', 'These are estimates from a timing model, not measurements. Run a pilot with one class and adjust.']
];

export async function build(host) {
  const link = (u, t) => h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, t || u);
  host.append(h('h2', null, 'Sources and research'),
    h('p', { class: 'muted' }, `For teachers only. Citations were checked on ${CHECKED}. “Checked” means the bibliographic record or abstract was confirmed; it does not mean every claim in a paper was audited.`),
    h('section', { class: 'panel' }, h('h3', null, 'Real research used in the labs'),
      RESEARCH.map((r) => h('div', { class: 'src' }, h('p', { class: 'src-cite' }, r.cite), r.doi ? h('p', { class: 'small' }, 'DOI ', link('https://doi.org/' + r.doi, r.doi)) : null, h('p', { class: 'small' }, link(r.url)),
        h('p', null, h('strong', null, 'Used for: '), r.used), h('p', { class: 'small' }, h('strong', null, 'Verification: '), r.status), h('p', { class: 'small' }, h('strong', null, 'Limits: '), r.caveat)))),
    h('section', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Statistics that come from the unit’s own handouts'), h('p', { class: 'muted small' }, 'These came with your curriculum files. They are secondary claims and were not independently re-verified in this build.'),
      h('div', { class: 't-scroll' }, h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Claim', 'Where it appears', 'Status in this assessment'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', null, STATS.map((s) => h('tr', null, s.map((c, i) => (i ? h('td', null, c) : h('th', { scope: 'row' }, c))))))))),
    h('section', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'What is fictional (and labeled on screen)'), h('ul', null, FICTION.map((f) => h('li', null, f)))),
    h('section', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Discrepancies and open items from the curriculum audit'),
      h('div', { class: 't-scroll' }, h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Item', 'What we found', 'How the assessment handles it'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', null, DISCREPANCIES.map((d) => h('tr', null, h('th', { scope: 'row' }, d[0]), h('td', null, d[1]), h('td', null, d[2]))))))),
    h('section', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'The unit’s curriculum files'), h('p', { class: 'small' }, 'Every learning objective is mapped to a source file and slide in the Answer key tab and in docs/CURRICULUM_ALIGNMENT.md. The 20 files were: Day 1 lesson plan, slides, guided notes, materials and Prediction Markets video guide; Day 2 lesson plan, neuroscience slides, brain-lab station packet, sports-betting and lottery handout and materials; Day 3 lesson plan, marketing lesson slides and packet, and mock-ad slogans; Day 4 lesson plan, two-reader scenarios, decision-making slides and inquiry-based assessment; and the Day 5 summative.')));
}
