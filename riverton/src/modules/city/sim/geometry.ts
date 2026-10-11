import world from '../../../content/shared/riverton-world.json';

export type Pt = [number, number];
export const HOOD_IDS: string[] = world.neighborhoods.map((n) => n.id);
export const labelOf = (id: string): Pt => world.neighborhoods.find((n) => n.id === id)!.label as Pt;
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function pointInPolygon(p: Pt, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Neighborhood containing a map point, or the nearest label if the point is on a boundary or the river. */
export function hoodAt(p: Pt): string {
  const hit = world.neighborhoods.find((n) => pointInPolygon(p, n.polygon));
  if (hit) return hit.id;
  return [...world.neighborhoods].sort((a, b) => dist(p, a.label as Pt) - dist(p, b.label as Pt))[0].id;
}
