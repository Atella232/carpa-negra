// Generador de pisos (actos): rejilla de salas conectadas en árbol, con salas
// especiales en los callejones sin salida y una sala secreta escondida.
import { Rng } from './rng';

export type RoomType =
  | 'inicio'
  | 'normal'
  | 'jefe'
  | 'camerino'
  | 'puesto'
  | 'diana'
  | 'barraca'
  | 'secreta'
  | 'contrato'
  // Actos III y IV
  | 'pitonisa'
  | 'reto'
  // Salas especiales que pueden salir en cualquier acto
  | 'almacen'
  | 'clavos'
  | 'curandero';

export type Dir = 'N' | 'S' | 'E' | 'W';
export const DIRS: Dir[] = ['N', 'S', 'E', 'W'];
export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};
export const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

export interface FloorRoom {
  x: number;
  y: number;
  type: RoomType;
  /** Distancia (en salas) desde la sala de inicio. */
  dist: number;
  /** 'super': la segunda sala secreta (la trastienda). */
  tag?: 'super';
}

export interface FloorLayout {
  w: number;
  h: number;
  rooms: FloorRoom[];
  start: { x: number; y: number };
}

export interface FloorGenOptions {
  w?: number;
  h?: number;
  minNormal?: number;
  maxNormal?: number;
  /** Salas especiales obligatorias (en callejones). */
  required?: RoomType[];
  /** Bolsa de salas especiales extra, con pesos: se sortean sin repetir. */
  extras?: { value: RoomType; weight: number }[];
  /** Cuántas extras (mínimo y máximo). */
  extraCount?: [number, number];
  /** Probabilidad de una segunda sala secreta (la trastienda). */
  superSecret?: number;
}

const DEFAULTS: Required<FloorGenOptions> = {
  w: 9,
  h: 8,
  minNormal: 8,
  maxNormal: 10,
  required: ['jefe', 'camerino', 'puesto'],
  extras: [
    { value: 'diana', weight: 1 },
    { value: 'barraca', weight: 1 },
  ],
  extraCount: [2, 2],
  superSecret: 0,
};

const key = (x: number, y: number) => `${x},${y}`;

export function neighbors(x: number, y: number): { x: number; y: number; dir: Dir }[] {
  return DIRS.map((dir) => ({ x: x + DIR_VEC[dir].x, y: y + DIR_VEC[dir].y, dir }));
}

/** Genera un piso. Reintenta internamente hasta cumplir las condiciones. */
export function generateFloor(rng: Rng, opts: FloorGenOptions = {}): FloorLayout {
  const o = { ...DEFAULTS, ...opts };
  for (let attempt = 0; attempt < 2000; attempt++) {
    const layout = tryGenerate(rng, o, attempt);
    if (layout) return layout;
  }
  throw new Error('No se pudo generar el piso');
}

function tryGenerate(
  rng: Rng,
  o: Required<FloorGenOptions>,
  attempt: number,
): FloorLayout | null {
  const start = { x: Math.floor(o.w / 2), y: Math.floor(o.h / 2) };
  // Cuántas salas extra; tras muchos intentos se piden menos.
  let want = rng.int(o.extraCount[0], o.extraCount[1]);
  if (attempt > 600) want = 0;
  else if (attempt > 300) want = Math.min(want, 1);
  const specials = o.required.length + want;
  const normals = rng.int(o.minNormal, o.maxNormal);
  const target = 1 + normals + specials;

  const occ = new Map<string, { x: number; y: number; dist: number }>();
  occ.set(key(start.x, start.y), { ...start, dist: 0 });
  const queue: { x: number; y: number; dist: number }[] = [{ ...start, dist: 0 }];

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < o.w && y < o.h;
  const occNeighbors = (x: number, y: number) =>
    neighbors(x, y).filter((n) => occ.has(key(n.x, n.y))).length;

  // Crecimiento en anchura con probabilidad: produce árboles ramificados.
  let guard = 0;
  while (occ.size < target && guard++ < 500) {
    if (queue.length === 0) {
      // Se reabre la cola con salas al azar para seguir creciendo.
      const all = [...occ.values()];
      queue.push(rng.pick(all));
    }
    const cur = queue.shift()!;
    for (const n of rng.shuffle(neighbors(cur.x, cur.y))) {
      if (occ.size >= target) break;
      if (!inBounds(n.x, n.y) || occ.has(key(n.x, n.y))) continue;
      if (occNeighbors(n.x, n.y) > 1) continue; // evita bucles y bloques
      if (rng.chance(0.5)) continue;
      const room = { x: n.x, y: n.y, dist: cur.dist + 1 };
      occ.set(key(n.x, n.y), room);
      queue.push(room);
    }
  }
  if (occ.size < target) return null;

  const cells = [...occ.values()];
  const deadEnds = cells.filter(
    (c) => !(c.x === start.x && c.y === start.y) && occNeighbors(c.x, c.y) === 1,
  );
  if (deadEnds.length < specials) return null;

  // Jefe: el callejón más lejano, que no sea vecino del inicio.
  deadEnds.sort((a, b) => b.dist - a.dist);
  const boss = deadEnds[0];
  if (boss.dist < 3) return null;

  const types = new Map<string, RoomType>();
  for (const c of cells) types.set(key(c.x, c.y), 'normal');
  types.set(key(start.x, start.y), 'inicio');
  types.set(key(boss.x, boss.y), 'jefe');

  const rest = rng.shuffle(deadEnds.slice(1));
  // Las extras se sacan de la bolsa sin repetir (según su peso).
  const bag = o.extras.slice();
  const extras: RoomType[] = [];
  for (let i = 0; i < want && bag.length; i++) {
    const t = rng.weighted(bag);
    extras.push(t);
    bag.splice(bag.findIndex((b) => b.value === t), 1);
  }
  const toPlace = [...o.required.filter((t) => t !== 'jefe'), ...extras];
  for (const t of toPlace) {
    const c = rest.shift();
    if (!c) return null;
    types.set(key(c.x, c.y), t);
  }

  // Sala secreta: celda vacía junto a varias salas (sin tocar al jefe).
  const secret = placeSecret(rng, o, occ, types);
  if (!secret) return null;

  const rooms: FloorRoom[] = cells.map((c) => ({
    x: c.x,
    y: c.y,
    dist: c.dist,
    type: types.get(key(c.x, c.y))!,
  }));
  rooms.push({ x: secret.x, y: secret.y, dist: -1, type: 'secreta' });

  // A veces, una segunda secreta (la trastienda): pegada a una sola sala normal.
  if (o.superSecret > 0 && rng.chance(o.superSecret)) {
    const sup = placeSuperSecret(rng, o, occ, types, secret);
    if (sup) rooms.push({ x: sup.x, y: sup.y, dist: -1, type: 'secreta', tag: 'super' });
  }

  return { w: o.w, h: o.h, rooms, start };
}

/**
 * Celda vacía que toca exactamente una sala, y que esa sala sea normal (ni el
 * jefe ni la otra secreta al lado). Se elige la que cuelga de la sala normal
 * más lejana del inicio: la trastienda premia explorar.
 */
function placeSuperSecret(
  rng: Rng,
  o: Required<FloorGenOptions>,
  occ: Map<string, { x: number; y: number; dist: number }>,
  types: Map<string, RoomType>,
  secret: { x: number; y: number },
): { x: number; y: number } | null {
  const isSecret = (x: number, y: number) => x === secret.x && y === secret.y;
  let best: { x: number; y: number }[] = [];
  let bestDist = -1;
  for (let y = 0; y < o.h; y++) {
    for (let x = 0; x < o.w; x++) {
      if (occ.has(key(x, y)) || isSecret(x, y)) continue;
      const adj = neighbors(x, y).filter((n) => occ.has(key(n.x, n.y)) || isSecret(n.x, n.y));
      if (adj.length !== 1) continue;
      const n = adj[0];
      if (isSecret(n.x, n.y) || types.get(key(n.x, n.y)) !== 'normal') continue;
      const d = occ.get(key(n.x, n.y))!.dist;
      if (d > bestDist) {
        bestDist = d;
        best = [{ x, y }];
      } else if (d === bestDist) best.push({ x, y });
    }
  }
  return best.length ? rng.pick(best) : null;
}

function placeSecret(
  rng: Rng,
  o: Required<FloorGenOptions>,
  occ: Map<string, { x: number; y: number }>,
  types: Map<string, RoomType>,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number; score: number }[] = [];
  for (let y = 0; y < o.h; y++) {
    for (let x = 0; x < o.w; x++) {
      if (occ.has(key(x, y))) continue;
      const adj = neighbors(x, y).filter((n) => occ.has(key(n.x, n.y)));
      if (adj.length === 0) continue;
      if (adj.some((n) => types.get(key(n.x, n.y)) === 'jefe')) continue;
      // Preferimos vecinos que sean salas "normales" o el inicio.
      const good = adj.filter((n) => {
        const t = types.get(key(n.x, n.y));
        return t === 'normal' || t === 'inicio';
      }).length;
      if (good === 0) continue;
      candidates.push({ x, y, score: adj.length });
    }
  }
  if (candidates.length === 0) return null;
  for (const min of [3, 2, 1]) {
    const pool = candidates.filter((c) => c.score >= min);
    if (pool.length > 0) return rng.pick(pool);
  }
  return null;
}

/** Puertas de cada sala: hacia qué direcciones hay sala vecina. */
export function roomDoors(layout: FloorLayout, x: number, y: number): Dir[] {
  const set = new Set(layout.rooms.map((r) => key(r.x, r.y)));
  return DIRS.filter((d) => set.has(key(x + DIR_VEC[d].x, y + DIR_VEC[d].y)));
}

export function roomAt(layout: FloorLayout, x: number, y: number): FloorRoom | undefined {
  return layout.rooms.find((r) => r.x === x && r.y === y);
}
