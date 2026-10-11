import { Application, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import world from '../../../content/shared/riverton-world.json';
import { INTERVENTIONS, type CityState } from '../sim';
import { pointInPolygon, type Pt } from '../sim/geometry';
import type { BuildingKind } from '../../../platform/art/Buildings';
import { buildTextures } from './textures';

export type Overlay = { kind: 'out' | 'det'; key: string; better: 1 | -1 } | null;
const HOODS = world.neighborhoods;
const hex = (v: string) => parseInt(v.replace('#', ''), 16);
const NCOL: Record<string, number> = { eastside: 0xd55e00, hillcrest: 0x0072b2, millworks: 0x7a6a58, pinewood: 0x009e73, oldtown: 0xcc79a7, riverside: 0x56b4e9, westbrook: 0xe6b800, southfield: 0x6f4fb8 };
const KIND: Record<string, { kind: BuildingKind; s: number }> = {
  hospital: { kind: 'clinic', s: 0.62 }, clinic: { kind: 'clinic', s: 0.44 }, mobile_van: { kind: 'ambulance', s: 0.34 }, supermarket: { kind: 'grocery', s: 0.46 }, farmers_market: { kind: 'grocery', s: 0.3 }, corner_store: { kind: 'grocery', s: 0.26 },
  ymca: { kind: 'ymca', s: 0.46 }, park: { kind: 'park', s: 0.5 }, sidewalks: { kind: 'tree', s: 0.3 }, bus_route: { kind: 'bus', s: 0.34 }, school_clinic: { kind: 'clinic', s: 0.32 }, mental_health: { kind: 'clinic', s: 0.3 },
  mixed_income_redevelopment: { kind: 'home', s: 0.6 }, affordable_housing: { kind: 'home', s: 0.5 }, water_upgrade: { kind: 'water', s: 0.5 }, tree_buffer: { kind: 'tree', s: 0.4 },
};
const BADGE: Record<string, [string, number]> = { lead_replacement: ['Pb', 0x7a6a58], chw_outreach: ['CHW', 0x2f8fd8], nutrition_ed: ['Ed', 0x4cb86a], insurance_drive: ['Ins', 0x6f4fb8], factory_controls: ['Air', 0x56b4e9] };

interface Agent { x: number; y: number; tx: number; ty: number; hood: number; jog: boolean; sp: number; s: Sprite }
export interface SceneHandlers { onHood?: (id: string) => void; onMap?: (x: number, y: number, hood: string) => void; onMove?: (x: number, y: number) => void; onBuilding?: (uid: string) => void; onAgent?: (hood: string, n: number) => void }

export class CityScene {
  app!: Application; host!: HTMLElement; handlers: SceneHandlers = {};
  world = new Container(); gHoods = new Graphics(); gRiver = new Graphics(); gSmog = new Graphics(); gGhost = new Graphics(); gClouds = new Container(); gNight = new Graphics(); private cloudList: Graphics[] = [];
  labels = new Container(); buildings = new Container(); agentsLayer = new Container(); tex: Record<string, Texture> = {};
  placing = false; lowQuality = false; state: CityState | null = null; overlay: Overlay = null; selected: string | null = null; reduceMotion = false; zoom = 1; pan = { x: 0, y: 0 };
  agents: Agent[] = []; visibleAgents = 220; fps = 60; t = 0; private dot!: Texture; private labelText = new Map<string, Text>(); private built = new Map<string, { c: Container; status: string; born: number }>();
  private dragging: { x: number; y: number; moved: boolean } | null = null; private lastFpsCheck = 0; private destroyed = false; private ro: ResizeObserver | null = null;

  static async create(host: HTMLElement, handlers: SceneHandlers = {}): Promise<CityScene> {
    const s = new CityScene(); s.host = host; s.handlers = handlers;
    s.app = new Application();
    await s.app.init({ resizeTo: host, background: 0xcfe8f5, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 1.5), autoDensity: true, powerPreference: 'low-power' });
    if (s.destroyed) return s;
    host.appendChild(s.app.canvas); s.app.canvas.style.touchAction = 'none'; s.app.canvas.setAttribute('role', 'img'); s.app.canvas.setAttribute('aria-label', 'Animated map of Riverton. Use the panels to explore.');
    s.tex = await buildTextures(['clinic', 'grocery', 'ymca', 'park', 'water', 'bus', 'ambulance', 'tree', 'home', 'factory']);
    const dg = new Graphics().circle(0, 0, 3).fill(0xffffff); s.dot = s.app.renderer.generateTexture(dg);
    s.world.addChild(s.gHoods, s.gRiver, s.gSmog, s.labels, s.buildings, s.agentsLayer, s.gGhost); s.app.stage.addChild(s.world, s.gClouds, s.gNight);
    for (let i = 0; i < 4; i++) { const c = new Graphics().ellipse(0, 0, 70, 16).fill({ color: 0xffffff, alpha: 0.35 }).ellipse(30, -10, 38, 14).fill({ color: 0xffffff, alpha: 0.35 }); c.position.set(i * 330, 30 + i * 70); s.gClouds.addChild(c); s.cloudList.push(c); }
    s.spawnAgents(); s.bind(); s.layout(); s.app.ticker.add((tk) => s.tick(tk.deltaMS));
    s.ro = new ResizeObserver(() => s.layout()); s.ro.observe(host);
    return s;
  }

  // ---------------------------------------------------------------- layout and input
  layout() {
    if (this.destroyed || !this.app?.screen) return;
    const W = this.app.screen.width, H = this.app.screen.height; const base = Math.min(W / 1000, H / 640);
    const sc = base * this.zoom; this.world.scale.set(sc);
    this.world.position.set((W - 1000 * sc) / 2 + this.pan.x, (H - 640 * sc) / 2 + this.pan.y);
    this.drawBg(); this.drawHoods(); this.gNight.clear().rect(0, 0, W, H).fill(0x141a44); this.gNight.alpha = 0;
  }
  private toWorld(ev: { offsetX: number; offsetY: number }): Pt { const p = this.world.toLocal({ x: ev.offsetX, y: ev.offsetY }); return [p.x, p.y]; }
  private hoodAt(p: Pt) { return HOODS.find((h) => pointInPolygon(p, h.polygon))?.id ?? null; }
  zoomBy(f: number, cx?: number, cy?: number) {
    const W = this.app.screen.width, H = this.app.screen.height; const z0 = this.zoom; this.zoom = Math.min(5, Math.max(0.8, this.zoom * f));
    const k = this.zoom / z0; const ox = (cx ?? W / 2) - W / 2, oy = (cy ?? H / 2) - H / 2; this.pan.x = ox - (ox - this.pan.x) * k; this.pan.y = oy - (oy - this.pan.y) * k; this.layout(); this.refreshAgentVisibility();
  }
  focusOn(x: number, y: number, zoom = 2.2) { const W = this.app.screen.width, H = this.app.screen.height; const base = Math.min(W / 1000, H / 640); this.zoom = zoom; const sc = base * zoom; this.pan.x = W / 2 - (W - 1000 * sc) / 2 - x * sc; this.pan.y = H / 2 - (H - 640 * sc) / 2 - y * sc; this.layout(); this.refreshAgentVisibility(); }
  resetView() { this.zoom = 1; this.pan = { x: 0, y: 0 }; this.layout(); this.refreshAgentVisibility(); }
  private bind() {
    const c = this.app.canvas;
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY); }, { passive: false });
    c.addEventListener('pointerdown', (e) => { this.dragging = { x: e.clientX, y: e.clientY, moved: false }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect(); const ev = { offsetX: e.clientX - r.left, offsetY: e.clientY - r.top };
      if (this.dragging) { const dx = e.clientX - this.dragging.x, dy = e.clientY - this.dragging.y; if (this.dragging.moved || Math.hypot(dx, dy) > 6) { this.dragging.moved = true; this.pan.x += dx; this.pan.y += dy; this.dragging.x = e.clientX; this.dragging.y = e.clientY; this.layout(); } }
      const p = this.toWorld(ev); this.handlers.onMove?.(p[0], p[1]);
    });
    c.addEventListener('pointerup', (e) => {
      const moved = this.dragging?.moved; this.dragging = null; if (moved) return;
      const r = c.getBoundingClientRect(); const p = this.toWorld({ offsetX: e.clientX - r.left, offsetY: e.clientY - r.top });
      if (this.zoom >= 1.6) { const a = this.agents.find((g, i) => i < this.visibleAgents && Math.hypot(g.x - p[0], g.y - p[1]) < 11 / Math.max(1, this.zoom * 0.7)); if (a) { this.handlers.onAgent?.(HOODS[a.hood].id, this.agents.indexOf(a)); return; } }
      if (this.state && !this.placing) for (const pl of this.state.placed) { const pos = this.posOf(pl); if (pos && pl.at && Math.hypot(pos[0] - p[0], pos[1] - p[1]) < 20) { this.handlers.onBuilding?.(pl.uid); return; } }
      const h = this.hoodAt(p); if (h) { this.handlers.onMap?.(p[0], p[1], h); this.handlers.onHood?.(h); }
    });
  }

  // ---------------------------------------------------------------- state
  setState(s: CityState) { this.state = s; this.drawHoods(); this.syncBuildings(); this.syncAgents(); }
  setOverlay(o: Overlay) { this.overlay = o; this.drawHoods(); }
  setSelected(id: string | null) { this.selected = id; this.drawHoods(); }
  setReduceMotion(b: boolean) { this.reduceMotion = b; }
  setPlacing(b: boolean) { this.placing = b; }
  setGhost(g: { x: number; y: number; r: number } | null) { this.gGhost.clear(); if (g) { this.gGhost.circle(g.x, g.y, g.r).fill({ color: 0x2f8fd8, alpha: 0.16 }).stroke({ width: 2, color: 0x2f8fd8, alpha: 0.8 }); this.gGhost.circle(g.x, g.y, 5).fill(0x2f8fd8); } }

  private color(h: (typeof HOODS)[number]): { fill: number; alpha: number; text: string } {
    const o = this.overlay; if (!o || !this.state) return { fill: NCOL[h.id], alpha: 0.82, text: '' };
    const get = (id: string) => (o.kind === 'out' ? (this.state!.hoods[id].out as unknown as Record<string, number>)[o.key] : this.state!.hoods[id].det[o.key as 'food']);
    const vals = HOODS.map((x) => get(x.id)); const mean = vals.reduce((a, b) => a + b, 0) / vals.length; const span = Math.max(1e-6, Math.max(...vals) - Math.min(...vals));
    const z = Math.max(-1, Math.min(1, ((get(h.id) - mean) / span) * 2 * (o.kind === 'det' ? 1 : o.better))); // + = better
    const mix = (a: number, b: number, t: number) => { const ch = (c: number, s: number) => (c >> s) & 255; const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t); return (m(16) << 16) | (m(8) << 8) | m(0); };
    const fill = z >= 0 ? mix(0xf3efe6, 0x2b6cb0, z) : mix(0xf3efe6, 0xd9650b, -z);
    const v = get(h.id); return { fill, alpha: 0.95, text: `${z >= 0.15 ? '▲' : z <= -0.15 ? '▼' : '●'} ${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}` };
  }
  private drawBg() { const W = this.app.screen.width, H = this.app.screen.height; this.app.renderer.background.color = this.reduceMotion ? 0xcfe8f5 : 0xcfe8f5; void W; void H; this.gRiver.clear(); const p = world.map.river.match(/-?\d+(\.\d+)?/g)!.map(Number); this.gRiver.moveTo(p[0], p[1]).quadraticCurveTo(p[2], p[3], p[4], p[5]).quadraticCurveTo(p[6], p[7], p[8], p[9]).quadraticCurveTo(p[10], p[11], p[12], p[13]).stroke({ width: 14, color: 0x56b4e9, alpha: 0.95, cap: 'round' }); }
  private drawHoods() {
    const g = this.gHoods; g.clear(); this.gSmog.clear();
    for (const h of HOODS) {
      const c = this.color(h); const pts = h.polygon.flat();
      g.poly(pts).fill({ color: c.fill, alpha: c.alpha }).stroke({ width: this.selected === h.id ? 7 : 3, color: this.selected === h.id ? 0x23303d : 0xfbf8f2, join: 'round' });
      if (this.state) { const air = this.state.hoods[h.id].det.air; const a = Math.max(0, (68 - air) / 68) * 0.38; if (a > 0.02) this.gSmog.poly(pts).fill({ color: 0x6b6f76, alpha: a }); }
      let t = this.labelText.get(h.id); if (!t) { t = new Text({ text: h.name, style: { fontFamily: 'Fredoka, Nunito, sans-serif', fontSize: 22, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x23303d, width: 5 }, align: 'center' } }); t.anchor.set(0.5); this.labels.addChild(t); this.labelText.set(h.id, t); }
      t.position.set(h.label[0], h.label[1] - (c.text ? 10 : 0)); t.text = c.text ? `${h.name}\n${c.text}` : h.name; t.style.fontSize = c.text ? 19 : 22;
    }
  }
  private posOf(p: { type: string; at: [number, number] | null; hood: string }): Pt | null { if (p.at) return p.at; const h = HOODS.find((x) => x.id === p.hood); return h ? [h.label[0], h.label[1] + 32] : null; }
  private syncBuildings() {
    if (!this.state) return; const keep = new Set<string>(); const badgeIdx: Record<string, number> = {};
    for (const p of this.state.placed) {
      keep.add(p.uid); const def = INTERVENTIONS[p.type]; let ent = this.built.get(p.uid);
      if (!ent) {
        const c = new Container(); const k = KIND[p.type]; let pos = this.posOf(p)!;
        if (k && p.at) { const s = new Sprite(this.tex[k.kind]); s.anchor.set(0.5, 0.9); s.scale.set(k.s); s.name = 'sprite'; c.addChild(s); c.position.set(pos[0], pos[1]); }
        else { const idx = (badgeIdx[p.hood] = (badgeIdx[p.hood] ?? this.state.placed.filter((q) => q.hood === p.hood && !q.at && q.uid < p.uid).length)); const [txt, col] = BADGE[p.type] ?? [def.name.slice(0, 3), 0x2f8fd8]; const hd = HOODS.find((x) => x.id === p.hood); pos = p.type === 'water_upgrade' ? [600, 120] : [(hd?.label[0] ?? 0) - 54 + idx * 30, (hd?.label[1] ?? 0) + 36]; const b = new Graphics().circle(0, 0, 13).fill(col).stroke({ width: 2, color: 0xffffff }); b.name = 'sprite'; const tt = new Text({ text: txt, style: { fontFamily: 'Nunito, sans-serif', fontSize: txt.length > 2 ? 8 : 11, fontWeight: '800', fill: 0xffffff } }); tt.anchor.set(0.5); c.addChild(b, tt); c.position.set(pos[0], pos[1]); }
        const sc = new Graphics(); sc.name = 'scaffold'; c.addChild(sc); this.buildings.addChild(c); ent = { c, status: p.status, born: this.t }; this.built.set(p.uid, ent);
      }
      if (ent.status === 'building' && p.status !== 'building') ent.born = this.t;
      ent.status = p.status;
      const sp = ent.c.getChildByName('sprite'); const scf = ent.c.getChildByName('scaffold') as Graphics; scf.clear();
      if (sp) { sp.alpha = p.status === 'building' ? 0.35 : p.status === 'closed' ? 0.35 : p.status === 'reduced' ? 0.7 : 1; }
      if (p.status === 'building') { const prog = Math.min(1, (this.state.month - p.builtMonth) / Math.max(1, p.openMonth - p.builtMonth)); scf.moveTo(-16, 0).lineTo(-16, -34).moveTo(16, 0).lineTo(16, -34).moveTo(-16, -12).lineTo(16, -26).moveTo(-16, -26).lineTo(16, -12).stroke({ width: 2, color: 0x8a6a2f }); scf.rect(-18, 6, 36, 5).fill(0xe0d5be).rect(-18, 6, 36 * prog, 5).fill(0x4cb86a); }
    }
    for (const [uid, e] of this.built) if (!keep.has(uid)) { this.buildings.removeChild(e.c); e.c.destroy({ children: true }); this.built.delete(uid); }
  }

  // ---------------------------------------------------------------- agents
  private spawnAgents() {
    const per = 28;
    HOODS.forEach((h, hi) => { for (let i = 0; i < per; i++) { const p = this.randIn(h.polygon); const s = new Sprite(this.dot); s.anchor.set(0.5); s.scale.set(0.9); this.agentsLayer.addChild(s); this.agents.push({ x: p[0], y: p[1], tx: p[0], ty: p[1], hood: hi, jog: false, sp: 8 + Math.random() * 10, s }); } });
    this.refreshAgentVisibility();
  }
  private randIn(poly: number[][]): Pt { const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]); for (let k = 0; k < 40; k++) { const p: Pt = [Math.min(...xs) + Math.random() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + Math.random() * (Math.max(...ys) - Math.min(...ys))]; if (pointInPolygon(p, poly)) return p; } return [poly[0][0], poly[0][1]]; }
  private syncAgents() {
    if (!this.state) return;
    for (const a of this.agents) { const h = HOODS[a.hood]; const act = this.state.hoods[h.id].beh.activity; a.jog = Math.random() < Math.max(0.08, Math.min(0.75, (act - 35) / 60)); a.s.tint = a.jog ? 0xf2a93b : (a.hood === 0 ? 0xffffff : 0xfff4de); const sick = this.state.hoods[h.id].out.preventableER; a.s.alpha = 0.95; void sick; }
  }
  private refreshAgentVisibility() { const show = this.zoom >= 1.25; this.agentsLayer.visible = show; this.agents.forEach((a, i) => { a.s.visible = show && i < this.visibleAgents; }); }

  // ---------------------------------------------------------------- frame loop
  private tick(dt: number) {
    if (this.destroyed || !this.app?.screen) return;
    this.t += dt / 1000; const sec = this.t;
    if (!this.reduceMotion) {
      for (let i = 0; i < Math.min(this.agents.length, this.visibleAgents); i++) {
        const a = this.agents[i]; if (!a.s.visible) continue; const dx = a.tx - a.x, dy = a.ty - a.y; const d = Math.hypot(dx, dy);
        if (d < 2) { const p = this.randIn(HOODS[a.hood].polygon); a.tx = p[0]; a.ty = p[1]; } else { const v = (a.jog ? a.sp * 2 : a.sp) * dt / 1000; a.x += (dx / d) * v; a.y += (dy / d) * v; a.s.position.set(a.x, a.y); }
      }
      // clouds and day/night
      const W = this.app.screen.width;
      this.cloudList.forEach((c, i) => { c.x = ((sec * (10 + i * 4) + i * 330) % (W + 300)) - 150; });
      const day = 0.5 - 0.5 * Math.cos((sec / 50) * Math.PI * 2); const night = Math.max(0, 0.34 - day * 0.5);
      const m = this.state ? this.state.month % 12 : 6; const winter = m === 11 || m <= 1;
      this.gNight.alpha = night + (winter ? 0.05 : 0); this.gNight.tint = winter ? 0x1a2a55 : 0xffffff;
      const pulse = 0.5 + 0.5 * Math.sin(sec * 2); this.gRiver.alpha = 0.85 + 0.15 * pulse;
    }
    for (const e of this.built.values()) { const age = this.t - e.born; if (age < 0.6 && e.status !== 'building') { const s = 0.7 + 0.3 * Math.min(1, age / 0.6) + Math.sin(Math.min(1, age / 0.6) * Math.PI) * 0.08; e.c.scale.set(s); } else e.c.scale.set(1); }
    if (sec - this.lastFpsCheck > 2) { this.lastFpsCheck = sec; this.fps = this.app.ticker.FPS; if (this.fps < 30 && !this.lowQuality && sec > 6) { this.lowQuality = true; this.gClouds.visible = false; this.gNight.visible = false; this.app.renderer.resolution = 1; this.app.renderer.resize(this.app.screen.width, this.app.screen.height); this.layout(); }
    if (this.fps < 38 && this.visibleAgents > 40) { this.visibleAgents = Math.max(40, Math.floor(this.visibleAgents * 0.7)); this.refreshAgentVisibility(); } else if (this.fps > 56 && this.visibleAgents < this.agents.length) { this.visibleAgents = Math.min(this.agents.length, this.visibleAgents + 20); this.refreshAgentVisibility(); } }
  }
  destroy() { this.destroyed = true; this.ro?.disconnect(); try { this.app.destroy(true, { children: true, texture: true }); } catch { /* already gone */ } }
}
