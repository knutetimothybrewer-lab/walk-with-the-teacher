import world from '../../../content/shared/riverton-world.json';
import { hash01 } from '../engine/hash';
import { pointInPolygon, type Pt } from '../../city/sim/geometry';

/** Stable pin position inside a neighborhood polygon (same case, same spot, every render). */
export function pinFor(id: number, hood: string, seed: number): { x: number; y: number } {
  const poly = world.neighborhoods.find((h) => h.id === hood)!.polygon;
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let k = 0; k < 30; k++) {
    const p: Pt = [x0 + (x1 - x0) * hash01(seed, id, k, 1), y0 + (y1 - y0) * hash01(seed, id, k, 2)];
    if (pointInPolygon(p, poly)) return { x: p[0], y: p[1] };
  }
  const l = world.neighborhoods.find((h) => h.id === hood)!.label; return { x: l[0], y: l[1] };
}
