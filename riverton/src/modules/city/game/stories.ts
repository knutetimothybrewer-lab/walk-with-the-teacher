import { CAST } from '../../../platform/art/characters';
import world from '../../../content/shared/riverton-world.json';
import type { CityState } from '../sim';

export interface Story { id: string; name: string; role: string; hood: string; text: string }
const has = (s: CityState, type: string, hood: string) => s.placed.some((p) => p.type === type && p.status !== 'building' && (p.cov[hood] ?? 0) > 0.25);

/** A resident story that changes with the city's conditions, so numbers have faces. */
export function storyFor(s: CityState, hood: string, pick: number): Story {
  const people = world.characters.filter((c) => c.home === hood);
  const c = people.length ? people[pick % people.length] : { id: 'kid', story: '' };
  const spec = CAST.find((x) => x.id === c.id) ?? CAST[CAST.length - 1];
  const h = s.hoods[hood]; const d = h.det;
  const lines: string[] = [];
  if (spec.id === 'alvarez') lines.push(has(s, 'clinic', hood) || has(s, 'school_clinic', hood) ? 'Since the clinic opened with evening hours, my son’s asthma checks happen on time and we have skipped the ER.' : 'My son has asthma. The clinic is closed when I get off work, so we end up at the ER.');
  else if (spec.id === 'whitfield') lines.push(has(s, 'supermarket', hood) ? 'I can walk to a real grocery now. My sugar numbers are better than they were.' : 'The closest real grocery is a bus ride away. I mostly shop at the corner store.');
  else if (spec.id === 'jordan') lines.push(has(s, 'park', hood) || has(s, 'ymca', hood) ? 'There is finally a safe place to hang out. My little brother plays outside again.' : 'There is nowhere safe and free to be active near me.');
  else if (spec.id === 'bell') lines.push(h.displacedPct >= 2 ? 'Families from my congregation are moving away as rents climb.' : s.policies.housing_protection != null ? 'Tenant protections mean my neighbors can stay.' : 'People worry that improvements will raise rents.');
  else if (spec.id === 'park') lines.push(has(s, 'corner_store', hood) ? 'The healthy-food grant let me stock fresh produce, and customers notice.' : 'I would stock more fresh food if I could afford the coolers.');
  else if (spec.id === 'imani') lines.push(d.walkability > 60 ? 'I can get around the neighborhood in my chair much more easily now.' : 'Broken curbs and few bus stops make getting around hard.');
  else lines.push(d.water < 60 ? 'We still boil our water some weeks.' : 'Things are steady here.');
  if (d.air < 50) lines.push('On smoggy days the air makes it hard to breathe.');
  return { id: spec.id, name: spec.name, role: spec.role, hood, text: lines.join(' ') };
}
