'use strict';
// Shared constants for assessment content. Authoring files mix public content with private keys;
// tools/split.js separates them so keys never reach the public bundle.

const VERSION = '2026.1.0';

// Source filenames as listed in the assignment. None of these files were available to the builder
// (see docs/SOURCE_STATUS.md), so locators are TOPIC-LEVEL and must be confirmed against the originals.
const SRC = {
  DET: 'Determinants_of_Health (1).pptx',
  PHH: 'PublicHealth_vs_Healthcare (1).pptx',
  ENV: 'Environmental_Health_Risk (1).pptx',
  ENV1: 'Day_1_Environment_and_Health (1).docx',
  PREV: 'Prevention_Challenge_Risk_Reduction_Plan_Worksheet (1).docx',
  INV: 'Community_Health_Investigation (1).docx',
  INVW: 'Community_Health_Investigation_Student_Worksheet_Blank_Spaces (1).docx',
  DISP: 'Health_Disparities_Credible_Source_Challenge_Expanded (1).docx',
  MKN: 'Marketing_Media_Literacy_Guided_Notes (3).docx',
  MKP: 'marketing_influences_lesson (1).pptx',
  ADVN: 'Community_Health_Advocacy_Guided_Notes (1).docx',
  ADVP: 'Community_Health_Advocacy_Planning (1).pptx',
  CMC: 'Counter_Message_Challenge_Student_Outline_Redesigned (1).docx',
  EXAM: 'Unit3_Community_Environmental_Health_Exam (1).docx'
};

const MODULES_META = [
  { id: 1, key: 'neighborhood', title: 'Neighborhood Investigation', place: 'Riverbend Neighborhood', minutes: 8, points: 18, units: 5 },
  { id: 2, key: 'ops', title: 'Public Health Operations Center', place: 'County Health Operations Center', minutes: 6, points: 12, units: 4 },
  { id: 3, key: 'lab', title: 'Environmental Safety Lab', place: 'Environmental Safety Lab', minutes: 11, points: 22, units: 6 },
  { id: 4, key: 'data', title: 'Health Data Observatory', place: 'Health Data Observatory', minutes: 6, points: 12, units: 4 },
  { id: 5, key: 'media', title: 'Media and Source Studio', place: 'Media and Source Studio', minutes: 8, points: 16, units: 5 },
  { id: 6, key: 'action', title: 'Community Action Council', place: 'Community Action Council Hall', minutes: 9, points: 20, units: 5 }
];

// Concept codes used in the alignment (A-G match the assignment's required-content list).
const TARGETS = {
  A1: 'A. Match community conditions to social/environmental determinants',
  A2: 'A. Distinguish individual behavior from environmental/systemic influences; avoid blaming residents',
  A3: 'A. Select case evidence, affected groups, and protective factors',
  A4: 'A. Weigh overlapping determinants, strengths and missing information',
  A5: 'A. Prioritize feasible interventions within a budget using access and feasibility',
  B1: 'B. Individual clinical care versus population protection (and overlap)',
  B2: 'B. Compare exposures in an outbreak without assuming a cause (epidemiology)',
  B3: 'B. Agent-host-environment and the steps of an investigation',
  B4: 'B. Prevention levels and local/state/federal roles',
  C1: 'C. Hazard, exposure, dose, duration, susceptibility, risk; short- vs long-term effects',
  C2: 'C. Layered prevention for air quality / wildfire smoke (AQI)',
  C3: 'C. Layered prevention for UV',
  C4: 'C. Noise intensity-duration and limits of guidelines',
  C5: 'C. Layered prevention and modify/pause/stop decisions for extreme heat',
  C6: 'C. Drinking-water advisories',
  D1: 'D. Read tables/graphs to support a priority',
  D2: 'D. Absolute differences, ratios, rates per 1,000, percentage points',
  D3: 'D. Association vs causation; group averages vs individuals',
  D4: 'D. Sample, representativeness, time period, missing variables',
  E1: 'E. Identify marketing techniques',
  E2: 'E. Sponsorship, disclosure and financial relationships',
  E3: 'E. Apply P.A.U.S.E.',
  E4: 'E. Evaluate the evidence behind a health claim',
  F1: 'F. Apply STOP to choose useful, credible sources for a specific question',
  G1: 'G. Awareness vs advocacy; problem-to-evaluation planning sequence',
  G2: 'G. Repair a weak advocacy plan (audience with power, feasible solution, accurate message, evaluation)',
  G3: 'G. Evaluation measures: reach, understanding, action, improvement',
  G4: 'G. Build an ethical counter-message',
  G5: 'G. Defend plan choices with evidence and reasons'
};

module.exports = { VERSION, SRC, MODULES_META, TARGETS };
