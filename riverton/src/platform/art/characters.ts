export type Expression = 'neutral' | 'happy' | 'worried' | 'angry' | 'surprised' | 'sad' | 'thinking';
export type Age = 'child' | 'teen' | 'adult' | 'elder';
export type Body = 'slim' | 'regular' | 'broad';
export type Aid = 'none' | 'cane' | 'wheelchair';
export type Pose = 'stand' | 'wave' | 'think';
export type Hair = 'short' | 'long' | 'bun' | 'curly' | 'bald' | 'cap';

export interface CharacterSpec {
  id: string; name: string; role: string;
  skin: string; hair: string; hairStyle: Hair; top: string; bottom: string;
  age: Age; body: Body; aid: Aid; glasses?: boolean;
}

export const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'worried', 'angry', 'surprised', 'sad', 'thinking'];

/** Recurring cast: the same spec renders identically in every module. */
export const CAST: CharacterSpec[] = [
  { id: 'okafor', name: 'Dr. Amara Okafor', role: 'Health Director', skin: '#8d5a3b', hair: '#2a1d17', hairStyle: 'bun', top: '#2f8fd8', bottom: '#2b3a4d', age: 'adult', body: 'regular', aid: 'none', glasses: true },
  { id: 'whitfield', name: 'Mr. Walter Whitfield', role: 'Eastside elder', skin: '#b98262', hair: '#d8d8d8', hairStyle: 'short', top: '#9c5a3c', bottom: '#4a4a52', age: 'elder', body: 'regular', aid: 'cane' },
  { id: 'alvarez', name: 'Ms. Rosa Alvarez', role: 'Parent, two jobs', skin: '#d9a47c', hair: '#1f1612', hairStyle: 'long', top: '#e1604a', bottom: '#33425a', age: 'adult', body: 'regular', aid: 'none' },
  { id: 'bell', name: 'Pastor Grace Bell', role: 'Faith leader', skin: '#6e4530', hair: '#1a1210', hairStyle: 'curly', top: '#6f4fb8', bottom: '#2b2b3a', age: 'adult', body: 'broad', aid: 'none' },
  { id: 'jordan', name: 'Jordan Reyes', role: 'Teen activist', skin: '#c68863', hair: '#2c1b12', hairStyle: 'cap', top: '#f2a93b', bottom: '#3b4a63', age: 'teen', body: 'slim', aid: 'none' },
  { id: 'lin', name: 'Dr. Mei Lin', role: 'Clinic director', skin: '#f0c9a4', hair: '#15151a', hairStyle: 'short', top: '#4cb86a', bottom: '#2b3a4d', age: 'adult', body: 'slim', aid: 'none', glasses: true },
  { id: 'hale', name: 'Marcus Hale', role: 'Developer', skin: '#f3d2b4', hair: '#7a5a3a', hairStyle: 'short', top: '#3b4a63', bottom: '#23303d', age: 'adult', body: 'broad', aid: 'none' },
  { id: 'park', name: 'Mr. Daniel Park', role: 'Corner-store owner', skin: '#e8bf98', hair: '#222', hairStyle: 'bald', top: '#d9650b', bottom: '#3b3b46', age: 'adult', body: 'regular', aid: 'none' },
  { id: 'imani', name: 'Imani Brooks', role: 'Commissioner, wheelchair user', skin: '#7a4a32', hair: '#120c0a', hairStyle: 'curly', top: '#0072b2', bottom: '#2b3a4d', age: 'adult', body: 'regular', aid: 'wheelchair' },
  { id: 'kid', name: 'Mateo', role: 'Student', skin: '#c9946f', hair: '#2a1a10', hairStyle: 'short', top: '#56b4e9', bottom: '#3b4a63', age: 'child', body: 'regular', aid: 'none' },
];
