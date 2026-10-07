// Shared authoring helpers. lvl: K = knowledge/comprehension, AP = application, AN = analysis/evaluation, SY = synthesis.
export const LVL_NAME = { K: 'Knowledge / comprehension', AP: 'Application', AN: 'Analysis / evaluation', SY: 'Synthesis' };

// Fictional first names used for {N1} {N2} {N3} substitution (gender-neutral usage; pronoun "they" or no pronoun).
import { NAMES } from '../js/names.js';
export { NAMES };

// Concept registry: powers the dashboard's "What should I reteach?" panel (deterministic, no AI).
export const CONCEPTS = {
  'macro-roles': ['found', 'Roles of carbohydrates, protein, fats and micronutrients', 'Re-teach what each nutrient group does for the body using real situations (fuel, repair, absorption, oxygen transport).', 'matching nutrient groups to the jobs they do (fuel, repair, absorption, oxygen transport)'],
  'energy-calc': ['found', 'Calories from carbohydrate, protein and fat', 'Practice the 4-4-9 calculation with labeled grams; connect calories to energy, not to "good/bad" food.', 'converting grams of carbohydrate, protein and fat into calories'],
  'myplate-build': ['found', 'Building a balanced MyPlate meal', 'Have students build plates for different needs (vegetarian, dairy-free, athlete) and check each MyPlate group.', 'choosing foods that fit each MyPlate group and the stated needs'],
  'micro-functions': ['found', 'Functions of vitamins and minerals', 'Match micronutrients to jobs and food sources; avoid supplement-first thinking.', 'linking vitamins and minerals to their functions'],
  'produce-data': ['found', 'Reading intake data (fruit and vegetables)', 'Practice separating what a graph shows from causes the graph cannot show.', 'telling what a graph shows apart from conclusions it cannot support'],
  'balanced-pattern': ['found', 'Balanced eating patterns over days and weeks', 'Reinforce that balance comes from the overall pattern; avoid "good food / bad food" framing.', 'judging balance across a whole eating pattern instead of one food'],
  'food-group-count': ['found', 'Identifying food groups in meals', 'Sort real meals into MyPlate groups, including edge cases (nut butters, cream cheese, ketchup).', 'counting MyPlate food groups in realistic meals'],
  'serving-portion': ['labels', 'Serving size versus portion size', 'Serving size is a standardized comparison amount; portion is what a person chooses to eat.', 'distinguishing serving size from portion size'],
  'servings-calc': ['labels', 'Scaling label values to the amount eaten', 'Practice multiplying every label value by servings eaten, and half/quarter-package problems.', 'scaling label values to the amount actually eaten'],
  'pct-dv': ['labels', 'Percent Daily Value (5% low, 20% high)', 'Re-teach 5% DV or less = low, 20% DV or more = high, and that %DV scales with servings.', 'distinguishing low from high %DV and recognizing that %DV grows with servings'],
  'dual-column': ['labels', 'Dual-column labels (per serving vs per container)', 'Show which column to use when the whole package is eaten in one sitting.', 'choosing the per-container column when a whole package is eaten'],
  'label-reading': ['labels', 'Locating information on the label', 'Label-hunt activity: serving size, servings per container, added sugars, %DV column.', 'locating specific information on the Nutrition Facts label'],
  'front-vs-label': ['labels', 'Front-of-package claims versus the Nutrition Facts', 'Compare claims to the label; claims describe one feature, not the whole product.', 'checking front-of-package claims against the Nutrition Facts'],
  'ingredient-order': ['labels', 'Ingredient lists are in order by weight', 'Practice reading ingredient order; the first ingredients make up the most weight.', 'using ingredient order (by weight) to judge what a product contains'],
  'added-sugar-names': ['labels', 'Recognizing added sugars by name', 'Make a class list of aliases (syrups, juice concentrates, -ose words).', 'recognizing added sugars under different names'],
  'product-compare': ['labels', 'Comparing products for a stated need', 'Choose by evidence for a scenario; the best choice changes with the need.', 'choosing a product by evidence for a stated need instead of by packaging'],
  'fitt-variables': ['activity', 'FITT variables', 'Match each change in a routine to Frequency, Intensity, Time or Type.', 'identifying which FITT variable a change adjusts'],
  'fitt-apply': ['activity', 'Applying FITT to adjust a routine', 'Diagnose a routine and name the single FITT variable that changes the challenge.', 'naming the single FITT variable that would change a routine\'s challenge'],
  'intensity-talk': ['activity', 'Talk test and intensity levels', 'Light = can sing, moderate = can talk but not sing, vigorous = only a few words.', 'using the talk test to classify intensity'],
  'effort-scale': ['activity', 'Perceived-effort scale', 'Connect 0 to 10 effort ratings to breathing and the talk test; resolve conflicting signals.', 'reading effort ratings and resolving conflicting body signals'],
  'activity-recs': ['activity', 'Teen physical-activity recommendations', '60 minutes of moderate-to-vigorous activity daily, with vigorous, muscle- and bone-strengthening on at least 3 days.', 'recalling each part of the teen activity recommendation'],
  'activity-types': ['activity', 'Aerobic, muscle- and bone-strengthening activity', 'Sort real activities by type; many activities count as more than one.', 'classifying activities as aerobic, muscle- or bone-strengthening'],
  'plan-build': ['activity', 'Designing or correcting an activity plan', 'Have students audit a weekly plan against each recommendation separately.', 'building a weekly plan that meets every recommendation at once'],
  'activity-data': ['activity', 'Interpreting teen activity data', 'Separate overall trends from sex differences and avoid over-claiming causes.', 'drawing only supported conclusions from activity data'],
  'sponsor-spotting': ['marketing', 'Spotting sponsorships and weak disclosures', 'Real disclosures are clear and prominent; a buried #sp or a discount code signals a financial tie.', 'spotting weak or buried sponsorship disclosures'],
  'marketing-tech': ['marketing', 'Naming marketing techniques', 'Testimonial, before/after, unrealistic claim, missing evidence: name each technique.', 'naming techniques such as testimonials, before/after images and unrealistic claims'],
  pqvd: ['marketing', 'PAUSE, QUESTION, VERIFY, DECIDE', 'Practice the four steps on a new post; stress VERIFY with credible sources.', 'applying PAUSE, QUESTION, VERIFY, DECIDE in order'],
  'health-halo': ['marketing', 'Health halo effect', 'One positive claim (organic, natural) can make a whole product seem healthy; check the label.', 'explaining how one positive claim can hide the rest of the label'],
  'source-credibility': ['marketing', 'Credible versus weak sources', 'Sort sources by expertise, evidence and conflict of interest.', 'judging which sources are credible and which have a stake in the claim'],
  'influence-evidence': ['marketing', 'Evaluating research on marketing influence', 'Read what a study can and cannot show (sample, setting, short-term).', 'stating what a marketing study can and cannot show'],
  'smart-components': ['goals', 'Identifying SMART components', 'Diagnose which SMART component each weak goal is missing.', 'diagnosing which SMART component a goal is missing'],
  'goal-repair': ['goals', 'Repairing a weak goal', 'Rewrite vague goals into specific, measurable, time-bound behaviors.', 'rewriting vague goals so every SMART part is present'],
  'barriers-strategies': ['goals', 'Matching barriers to strategies', 'Pair each barrier with a realistic, behavior-based strategy.', 'matching barriers to realistic strategies'],
  'goal-eval': ['goals', 'Evaluating goals for realism and relevance', 'Compare goals; reject ones that are unrealistic or driven by someone else\'s priorities.', 'choosing the goal that is both SMART and realistic'],
  'goal-process': ['goals', 'The behavior-change planning process', 'Sequence: choose behavior, set target and deadline, expect barriers, plan strategies, track and adjust.', 'sequencing the steps of a behavior-change plan'],
  'food-vocab': ['systems', 'Food-system vocabulary', 'Define food system, food environment, consolidation and resilience with local examples.', 'using food-system vocabulary precisely'],
  'causal-chain': ['systems', 'Cause-and-effect in the food system', 'Trace incentives, supply, price, marketing and access; reject links with no direct mechanism.', 'separating well-supported cause-and-effect links from reversed or unsupported ones'],
  'resilience-efficiency': ['systems', 'Resilience versus efficiency (consolidation)', 'Consolidation can lower cost per unit while raising the impact of one disruption.', 'explaining the trade-off between efficiency and resilience under consolidation'],
  'food-access': ['systems', 'Food access and food environments', 'Use maps: distance, transportation and store type shape access.', 'reading a map to decide what improves access for households without cars'],
  'food-insecurity-data': ['systems', 'Interpreting food-insecurity data', 'Food insecurity is about household resources, not individual choices.', 'interpreting food-insecurity data without blaming individual choices'],
  'ultra-processed': ['systems', 'Ultra-processed foods and the food environment', 'Interpret UPF trend data without overclaiming cause or calling foods "bad".', 'interpreting ultra-processed food trends without overclaiming'],
  'evidence-docs': ['systems', 'Evaluating documentary claims against evidence', 'Check the original data and what it measures; documentaries are persuasive and have a point of view.', 'checking documentary claims against original data'],
  'emerging-tech': ['systems', 'Evaluating emerging food technologies', 'Ask evidence questions: life-cycle impact, safety review, cost at scale, funding.', 'asking evidence questions about new food technologies'],
  'regen-ag': ['systems', 'Regenerative agriculture', 'Link each practice to its soil-health aim; evidence varies by place and takes time.', 'linking regenerative practices to their soil-health goals'],
  'workers-policy': ['systems', 'Workers, economics and policy', 'Connect worker conditions in processing to specific policy tools.', 'connecting worker conditions to specific policies'],
  'int-snack': ['integrated', 'Choosing a snack with label evidence', 'Combine need + label numbers + ignoring front claims.', 'combining a stated need with label evidence while ignoring front claims'],
  'int-plan': ['integrated', 'Adjusting a weekly plan with FITT', 'Combine FITT variables with recommendations and constraints.', 'adjusting a weekly plan using FITT and the recommendations'],
  'int-env': ['integrated', 'Individual choice within the food environment', 'Hold personal strategies and system-level influences together; avoid all-or-nothing explanations.', 'holding personal choice and the food environment together'],
  'int-claims': ['integrated', 'Applying PQVD to a fitness claim', 'Run all four steps and end with a decision.', 'running all four PQVD steps on a fitness claim'],
  'int-goal': ['integrated', 'Building a realistic goal that fits the food environment', 'Combine SMART, barriers, access and credible evidence in one plan.', 'building a realistic goal that works within the food environment']
};

export const T = (strs, ...vals) => strs.reduce((a, s, i) => a + s + (vals[i] ?? ''), '');
