// Bot de pruebas (solo desarrollo): juega partidas sin modo dios para medir si
// el juego se puede superar. Esquiva balas, avisos y charcos, apunta alineándose
// con su objetivo, recoge objetos y globos, y baja por la trampilla.
// Se mueve entre salas con `ir` (como si cruzara la puerta); el combate es real.
import type { GameScene } from '../scenes/GameScene';
import type { Action } from '../systems/Controls';
import type { RoomState } from '../core/run';

interface Warn {
  shape: { k: string; x?: number; y?: number; r?: number; x0?: number; y0?: number; x1?: number; y1?: number; w?: number; h?: number };
}

export interface RoomResult {
  act: number;
  room: string;
  secs: number;
  lost: number;
  cleared: boolean;
}

/** Peligro de estar en (x, y) dentro de `dt` segundos. */
function danger(sc: GameScene, x: number, y: number, dt: number): number {
  let c = 0;
  // Balas: distancia mínima entre su trayectoria y el punto en los próximos instantes.
  for (const sh of sc.enemyShotsNear(x, y, 150)) {
    const v = sh.body.velocity;
    for (const k of [0.08, 0.16, 0.24, dt, dt + 0.15, dt + 0.3]) {
      const bx = sh.x + v.x * k,
        by = sh.y + 5 + v.y * k;
      const d = Math.hypot(bx - x, by - (y - 2));
      if (d < 13) c += 60 * (1 - d / 13);
    }
  }
  // Criaturas (con su movimiento previsto).
  for (const e of sc.targets()) {
    const ex = e.x + e.body.velocity.x * dt,
      ey = e.y + e.body.velocity.y * dt;
    const d = Math.hypot(ex - x, ey - y);
    const r = e.isBoss ? 44 : e.flying ? 34 : 30;
    if (d < r) c += 70 * (1 - d / r) * (e.contact > 0 ? 1 : 0.2);
  }
  // Avisos en el suelo.
  const list = (sc.telegraph as unknown as { list: Warn[] }).list ?? [];
  for (const w of list) {
    const s = w.shape;
    if (s.k === 'circle' && Math.hypot(x - s.x!, y - s.y!) < s.r! + 7) c += 40;
    else if (s.k === 'rect' && x > s.x! - 6 && x < s.x! + s.w! + 6 && y > s.y! - 6 && y < s.y! + s.h! + 6) c += 40;
    else if (s.k === 'line') {
      const dx = s.x1! - s.x0!,
        dy = s.y1! - s.y0!;
      const L2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - s.x0!) * dx + (y - s.y0!) * dy) / L2));
      const d = Math.hypot(x - (s.x0! + dx * u), y - (s.y0! + dy * u));
      if (d < (s.w ?? 8) / 2 + 9) c += 40;
    }
  }
  // Cuerdas entre jefes (Los Siameses).
  const parts = sc.bossIds.filter((b) => b.active && !b.dead);
  if (parts.length === 2) {
    const [a, b] = parts;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L2));
    const d = Math.hypot(x - (a.x + dx * u), y - (a.y + dy * u + 6));
    if (d < 16) c += 45 * (1 - d / 16);
  }
  for (const k of sc.spikes) if (Math.abs(x - k.x) < 13 && Math.abs(y - k.y) < 13) c += 90;
  for (const h of sc.hazards) if (Math.hypot(x - h.x, y - h.y) < 18) c += 90;
  // Braseros encendidos: queman al tocarlos.
  for (const o of sc.g.solids.getChildren() as unknown as { kind: string; extinguished?: boolean; x: number; y: number }[]) {
    if (o.kind === 'brasero' && !o.extinguished && Math.abs(x - o.x) < 17 && Math.abs(y - o.y) < 17) c += 45;
  }
  for (const z of sc.zones) if (Math.hypot(x - z.x, y - z.y) < z.r + 4) c += 6;
  // Paredes y esquinas: quedarse sin sitio para esquivar.
  const mx = Math.max(0, 34 - x, x - 206),
    my = Math.max(0, 32 - y, y - 112);
  c += (mx * mx + my * my) * 0.08;
  return c;
}

const DIRS16 = Array.from({ length: 16 }, (_, i) => ({ x: Math.cos((i / 16) * Math.PI * 2), y: Math.sin((i / 16) * Math.PI * 2) }));

/** Un fotograma de decisiones: devuelve las acciones a mantener. */
function decide(sc: GameScene, t: number): Set<Action> {
  const acts = new Set<Action>();
  const p = sc.player;
  const speed = sc.stats.speed;
  const targets = sc.targets().filter((e) => e.alpha > 0.5);
  const e = targets.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  const want = e ? (e.isBoss ? 85 : 62) : 0;
  let best = { x: 0, y: 0 },
    bestCost = Infinity;
  for (const d of [{ x: 0, y: 0 }, ...DIRS16]) {
    const fx = p.x + d.x * speed * 0.3,
      fy = p.y + d.y * speed * 0.3;
    // Una baldosa bloqueada no se puede pisar.
    if (sc.nav.isBlocked(Math.floor((fx - 16) / 16), Math.floor((fy - 16) / 16)) && !sc.effects.hasFlag('flight')) continue;
    let cost =
      danger(sc, fx, fy, 0.3) +
      danger(sc, p.x + d.x * speed * 0.12, p.y + d.y * speed * 0.12, 0.12) +
      0.5 * danger(sc, p.x + d.x * speed * 0.5, p.y + d.y * speed * 0.5, 0.5);
    if (e) {
      const dx = e.x - fx,
        dy = e.y - fy;
      const dist = Math.hypot(dx, dy);
      cost += Math.abs(dist - want) * 0.05;
      // Alinearse en un eje para acertar.
      cost += Math.min(Math.abs(dx), Math.abs(dy)) * 0.04;
    } else {
      cost += Math.hypot(fx - 120, fy - 72) * 0.01;
    }
    // Un poco de inercia: no cambiar de idea a cada fotograma.
    cost += Math.hypot(d.x - lastDir.x, d.y - lastDir.y) * 0.3;
    if (cost < bestCost) {
      bestCost = cost;
      best = d;
    }
  }
  lastDir = best;
  const th = 0.38;
  if (best.x > th) acts.add('derecha');
  if (best.x < -th) acts.add('izquierda');
  if (best.y > th) acts.add('abajo');
  if (best.y < -th) acts.add('arriba');
  if (e) {
    // Disparar a quien ya esté alineado (si hay alguno); si no, al más cercano.
    // Posición prevista de cada objetivo cuando llegue la pelota.
    const shotSpeed = sc.stats.shotSpeed;
    const lead = (o: (typeof targets)[number]) => {
      const tt = Math.hypot(o.x - p.x, o.y - p.y) / shotSpeed;
      return { x: o.x + o.body.velocity.x * tt, y: o.y + o.body.velocity.y * tt, o };
    };
    const aligned = targets
      .filter((o) => !o.invulnerable)
      .map(lead)
      .filter((q) => Math.min(Math.abs(q.x - p.x), Math.abs(q.y - 8 - p.y)) < 7)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const aim = aligned ?? lead(e);
    const dx = aim.x - p.x,
      dy = aim.y - p.y;
    acts.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dispararDerecha' : 'dispararIzquierda') : dy > 0 ? 'dispararAbajo' : 'dispararArriba');
    const st = sc.run.player;
    if (st.active && (e.isBoss || targets.length >= 4) && Math.floor(t * 60) % 30 === 0) acts.add('activo');
  }
  return acts;
}

let lastDir = { x: 0, y: 0 };

/** Avanza un fotograma con las acciones dadas. */
function step(sc: GameScene, avanzar: (n: number) => void, acts: Set<Action>): void {
  for (const a of acts) sc.controls.virtual.add(a);
  avanzar(1);
  sc.controls.virtual.clear();
}

/** Lucha en la sala actual hasta limpiarla, morir o agotar el tiempo. */
export function fight(sc: GameScene, avanzar: (n: number) => void, maxSecs = 120): { secs: number; cleared: boolean } {
  let f = 0;
  while (!sc.room.cleared && !sc.player.dead && f < maxSecs * 60) {
    step(sc, avanzar, decide(sc, f / 60));
    f++;
  }
  return { secs: f / 60, cleared: sc.room.cleared };
}

/** Camina hasta (x, y) unos instantes (para recoger cosas o pisar la trampilla). */
export function walkTo(sc: GameScene, avanzar: (n: number) => void, x: number, y: number, maxFrames = 120): boolean {
  for (let f = 0; f < maxFrames; f++) {
    const p = sc.player;
    const dx = x - p.x,
      dy = y - p.y;
    if (Math.hypot(dx, dy) < 4) return true;
    const a = new Set<Action>();
    if (dx > 2) a.add('derecha');
    if (dx < -2) a.add('izquierda');
    if (dy > 2) a.add('abajo');
    if (dy < -2) a.add('arriba');
    step(sc, avanzar, a);
    if (sc.transitioning || sc.player.dead) return false;
  }
  return false;
}

/** Recoge lo que haya en la sala: objetos gratis y globos si le faltan. */
export function loot(sc: GameScene, avanzar: (n: number) => void): void {
  const tried = new Set<unknown>();
  for (let k = 0; k < 6; k++) {
    const ped = sc.pedestals.find((q) => q.item && q.price === 0 && q.contractCost === 0 && !sc.run.player.passives.includes(q.item) && q.item !== sc.run.player.active && !tried.has(q));
    if (!ped) break;
    // Si es un activo y ya tiene uno, se lo queda solo si no tiene.
    tried.add(ped);
    avanzar(Math.ceil(Math.max(0, ped.cooldown) * 60) + 2);
    walkTo(sc, avanzar, ped.x, ped.y + 16, 120);
    walkTo(sc, avanzar, ped.x, ped.y + 2, 40);
    avanzar(10);
    walkTo(sc, avanzar, ped.x, ped.y + 26, 40);
  }
  const st = sc.run.player;
  // Dos pasadas: los cofres sueltan más cosas.
  for (let pass = 0; pass < 2; pass++) {
    for (const pk of sc.pickupsList()) {
      if (pk.price > 0 || pk.opened) continue;
      if ((pk.kind === 'globo' || pk.kind === 'medio_globo') && st.hp >= st.maxHp) continue;
      if (pk.kind === 'cofre_candado' && st.keys <= 0) continue;
      if (pk.kind === 'golosina' && st.golosina) continue;
      walkTo(sc, avanzar, pk.x, pk.y, 90);
    }
    avanzar(40);
  }
}

/** En el puesto: si hay boletos, compra lo que pueda (vida primero si le falta). */
export function shop(sc: GameScene, avanzar: (n: number) => void): void {
  const st = sc.run.player;
  for (const pk of sc.pickupsList()) {
    if (pk.price <= 0 || pk.price > st.tickets) continue;
    if ((pk.kind === 'globo' || pk.kind === 'medio_globo') && st.hp >= st.maxHp) continue;
    walkTo(sc, avanzar, pk.x, pk.y, 120);
    avanzar(10);
  }
  for (const ped of sc.pedestals) {
    if (!ped.item || ped.price <= 0 || ped.price > st.tickets) continue;
    walkTo(sc, avanzar, ped.x, ped.y + 16, 120);
    walkTo(sc, avanzar, ped.x, ped.y + 2, 40);
    avanzar(10);
    walkTo(sc, avanzar, ped.x, ped.y + 26, 40);
  }
}

/**
 * Orden de visita: solo las salas en el camino desde el inicio hasta el
 * camerino, el puesto, la vecina de la secreta y el jefe (el piso es un árbol).
 */
export function plan(rooms: RoomState[]): RoomState[] {
  const at = new Map(rooms.map((r) => [`${r.x},${r.y}`, r]));
  const parent = (r: RoomState) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => at.get(`${r.x + dx},${r.y + dy}`))
      .find((n) => n && n.type !== 'secreta' && n.dist === r.dist - 1 && r.doors.length && n.doors.length);
  const goals = rooms.filter((r) => ['camerino', 'puesto', 'jefe'].includes(r.type));
  const secret = rooms.find((r) => r.type === 'secreta');
  if (secret) {
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at.get(`${secret.x + dx},${secret.y + dy}`)).find((n) => n && n.type === 'normal');
    if (nb) goals.push(nb);
  }
  const keep = new Set<RoomState>();
  for (const g of goals) {
    let cur: RoomState | undefined = g;
    while (cur && cur.dist > 0) {
      if (cur.type === 'normal' || cur.type === 'camerino') keep.add(cur);
      cur = parent(cur);
    }
  }
  return [...keep].sort((a, b) => a.dist - b.dist);
}
