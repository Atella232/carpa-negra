// Estado de una partida: piso, salas, inventario y progreso. Sin Phaser.
import { RngStreams, normalizeSeed } from './rng';
import { generateFloor, roomDoors, Dir, FloorLayout, RoomType, DIR_VEC } from './floorgen';
import { ItemPools, PoolName } from './itempool';
import { StatMods } from './stats';
import { ITEMS } from '../data/items';
import { actDef, ACTS, SLOT_CHARS } from '../data/acts';
import type { RoomTemplate } from '../data/rooms/template';
import { BossKind } from '../data/enemies';
import { GOLOSINA_COLORS, GOLOSINA_EFFECTS, GolosinaColor, GolosinaEffect } from '../data/golosinas';
import { characterDef } from '../data/characters';

export type PickupKind =
  | 'globo'
  | 'medio_globo'
  | 'globo_plata'
  | 'boleto'
  | 'taco_boletos'
  | 'petardo'
  | 'doble_petardo'
  | 'llave'
  | 'cofre'
  | 'cofre_candado'
  | 'golosina';

export interface SavedPickup {
  kind: PickupKind;
  x: number;
  y: number;
  price?: number;
  color?: GolosinaColor;
}

export interface SavedPedestal {
  item: string | null;
  x: number;
  y: number;
  price?: number;
  contractCost?: number;
}

export interface RoomState {
  x: number;
  y: number;
  type: RoomType;
  dist: number;
  doors: Dir[];
  templateId?: string;
  flipX: boolean;
  flipY: boolean;
  visited: boolean;
  cleared: boolean;
  /** Puertas secretas descubiertas (en esta sala). */
  secretFound: Dir[];
  /** La puerta de esta sala está abierta con llave (puesto). */
  unlocked: boolean;
  /** Baldosas de obstáculos destruidos (índice c + r*13). */
  destroyed: number[];
  /** Golpes recibidos por palomitas / braseros. */
  damaged: Record<number, number>;
  pickups: SavedPickup[];
  pedestals: SavedPedestal[];
  /** Manchas del suelo que se quedan al volver (muertes, explosiones). */
  decals: { x: number; y: number; f: number; s: number; t?: number }[];
  /** Oleadas ya superadas en salas de "números". */
  wave?: number;
  /** Ya se generó el contenido especial (objeto, tienda...). */
  stocked: boolean;
  data: Record<string, number | boolean | string>;
}

export interface PlayerState {
  maxHp: number; // en medios globos
  hp: number;
  shield: number;
  tickets: number;
  bombs: number;
  keys: number;
  passives: string[];
  active: string | null;
  charge: number;
  golosina: GolosinaColor | null;
  bonus: StatMods; // efectos permanentes de golosinas
  redDamageTaken: boolean;
  /** Salas limpiadas sin recibir daño (Pluma de Sangre). */
  cleanRooms?: number;
  /** Muertes acumuladas para el Ramo de Rosas. */
  ramo?: number;
  /** La Red de Seguridad ya se usó en este acto. */
  netUsed?: boolean;
  /** Personaje elegido. */
  character?: string;
  /** Trajes ya completados (para dar su premio una sola vez). */
  setsDone?: string[];
}

export interface RunState {
  seed: string;
  streams: RngStreams;
  act: number;
  actName: string;
  layout: FloorLayout;
  rooms: Map<string, RoomState>;
  contract: RoomState;
  cur: { x: number; y: number };
  player: PlayerState;
  pools: ItemPools;
  boss: BossKind;
  golosinaMap: Record<GolosinaColor, GolosinaEffect>;
  golosinaKnown: GolosinaEffect[];
  contractOpen: boolean;
  bossDefeated: boolean;
  kills: number;
  roomsCleared: number;
  startedAt: number;
  /** Segundos de juego (sin contar la pausa). */
  playTime: number;
  seenItems: string[];
  /** Medios globos curados al empezar el acto actual (para avisar). */
  actHeal: number;
  /** El público: aplausómetro (negativo = abucheo, en el Acto IV). */
  publico: { value: number; combo: number };
  /** Tipo de partida: normal, con semilla escrita o función del día. */
  mode: 'normal' | 'semilla' | 'diaria';
  /** Nivel de La Gira (0 = normal). */
  gira: number;
  /** Contadores de la partida (para carteles y resumen). */
  stats: { bombsUsedAct: number; ovaciones: number; contratos: number; espejos: number; fuegos?: number; ladrones?: number };
  /** Objetos bloqueados al empezar la partida (se guardan para repetir semilla). */
  locked: string[];
  /** El telón debe abrirse al empezar el acto. */
  curtainOpen?: boolean;
  /** Jefes vencidos en esta partida (El Maestro los "presenta" primero). */
  beaten: BossKind[];
  /** La Pitonisa ha revelado el mapa de este acto. */
  mapRevealed?: boolean;
  /** Puerta por la que se entró en la sala actual (para continuar la partida). */
  entry?: Dir | null;
  /** Objetos de las salas especiales de cada acto, sorteados al empezar. */
  preItems?: Record<number, ActItems>;
}

export const roomKey = (x: number, y: number) => `${x},${y}`;
export const CONTRACT_KEY = 'contrato';

function newRoom(x: number, y: number, type: RoomType, dist: number, doors: Dir[]): RoomState {
  return {
    x, y, type, dist, doors,
    flipX: false, flipY: false,
    visited: false,
    cleared: type !== 'normal' && type !== 'jefe',
    secretFound: [],
    unlocked: false,
    destroyed: [],
    damaged: {},
    pickups: [],
    pedestals: [],
    decals: [],
    stocked: false,
    data: {},
  };
}

/** Genera el piso de un acto (salas, contrato y jefe) con su propio flujo de azar. */
export function buildAct(streams: RngStreams, act: number): Pick<RunState, 'layout' | 'rooms' | 'contract' | 'boss' | 'cur'> {
  const def = actDef(act);
  // El Acto I usa el flujo "mapa" sin sal para que las semillas antiguas no cambien.
  const mapRng = act === 1 ? streams.get('mapa') : streams.get('mapa', String(act));
  const layout = generateFloor(mapRng, {
    minNormal: def.minNormal, maxNormal: def.maxNormal,
    required: def.specials.required, extras: def.specials.extras,
    extraCount: def.specials.extraCount, superSecret: def.specials.superSecret,
  });

  const rooms = new Map<string, RoomState>();
  const used = new Set<string>();
  for (const r of layout.rooms) {
    const room = newRoom(r.x, r.y, r.type, r.dist, roomDoors(layout, r.x, r.y));
    if (r.type === 'normal') {
      // Más dificultad cuanto más lejos del inicio.
      const allowed = r.dist <= 1 ? [0, 1, 1, 2] : r.dist <= 3 ? [1, 2, 2, 3] : [2, 3, 3];
      const want = mapRng.pick(allowed);
      const tpl = mapRng.pick(pickableTemplates(def.templates, want, used));
      used.add(tpl.id);
      room.templateId = tpl.id;
      room.flipX = mapRng.chance(0.5);
      room.flipY = mapRng.chance(0.5);
      // Comodines: se sortean siempre (aunque la plantilla no los use) para que
      // el resto del mapa no dependa de qué plantilla ha salido.
      for (const ch of SLOT_CHARS) room.data[`slot${ch}`] = mapRng.pick(def.slots[ch]);
      if (tpl.diff === 0) room.cleared = true;
    }
    if (r.tag === 'super') room.data.super = true;
    rooms.set(roomKey(r.x, r.y), room);
  }
  rooms.get(roomKey(layout.start.x, layout.start.y))!.visited = true;
  const boss = def.bosses.length === 2 ? (mapRng.chance(0.5) ? def.bosses[0] : def.bosses[1]) : mapRng.pick(def.bosses);
  return {
    layout,
    rooms,
    contract: newRoom(-1, -1, 'contrato', 99, ['S']),
    boss,
    cur: { ...layout.start },
  };
}

/**
 * Plantillas que se pueden elegir sin repetir en el acto: las de la dificultad
 * pedida que no han salido; si no queda ninguna, las de dificultad vecina;
 * luego cualquiera que no haya salido; y si ya han salido todas, cualquiera.
 */
export function pickableTemplates(all: readonly RoomTemplate[], diff: number, used: ReadonlySet<string>): readonly RoomTemplate[] {
  const fresh = all.filter((t) => !used.has(t.id));
  const exact = fresh.filter((t) => t.diff === diff);
  if (exact.length) return exact;
  const near = fresh.filter((t) => Math.abs(t.diff - diff) === 1 && t.diff > 0);
  if (near.length) return near;
  const any = fresh.filter((t) => t.diff > 0);
  if (any.length) return any;
  const same = all.filter((t) => t.diff === diff);
  return same.length ? same : all;
}

export interface RunOptions {
  now?: number;
  character?: string;
  mode?: RunState['mode'];
  gira?: number;
  /** Objetos que el jugador aún no ha desbloqueado (no salen en la partida). */
  locked?: readonly string[];
}

export function createRun(seedInput: string, opts: RunOptions | number = {}): RunState {
  const o: RunOptions = typeof opts === 'number' ? { now: opts } : opts;
  const seed = normalizeSeed(seedInput) || 'CARPA000';
  const streams = new RngStreams(seed);
  const floor = buildAct(streams, 1);

  // Golosinas: cada color con un efecto distinto.
  const gRng = streams.get('golosinas');
  const effects = gRng.shuffle(Object.keys(GOLOSINA_EFFECTS) as GolosinaEffect[]);
  const golosinaMap = {} as Record<GolosinaColor, GolosinaEffect>;
  GOLOSINA_COLORS.forEach((c, i) => (golosinaMap[c] = effects[i]));

  const ch = characterDef(o.character);
  const locked = [...(o.locked ?? [])];
  const pools = new ItemPools(ITEMS.filter((i) => !locked.includes(i.id)));
  const passives = [...(ch.items ?? [])];
  for (const id of passives) pools.remove(id);
  if (ch.active) pools.remove(ch.active);

  return {
    seed,
    streams,
    act: 1,
    actName: actDef(1).name,
    ...floor,
    player: {
      maxHp: ch.base.maxHp,
      hp: ch.base.maxHp,
      shield: ch.base.shield,
      tickets: ch.base.tickets,
      bombs: ch.base.bombs,
      keys: ch.base.keys,
      passives,
      active: ch.active ?? null,
      charge: ch.active ? 99 : 0,
      golosina: null,
      bonus: {},
      redDamageTaken: false,
      character: ch.id,
    },
    pools,
    golosinaMap,
    golosinaKnown: [],
    contractOpen: false,
    bossDefeated: false,
    kills: 0,
    roomsCleared: 0,
    startedAt: o.now ?? 0,
    playTime: 0,
    seenItems: [],
    actHeal: 0,
    publico: { value: 0, combo: 0 },
    mode: o.mode ?? 'normal',
    gira: o.gira ?? 0,
    stats: { bombsUsedAct: 0, ovaciones: 0, contratos: 0, espejos: 0, fuegos: 0 },
    locked,
    beaten: [],
  };
}

/** Partida nueva con los objetos del primer acto ya sorteados. */
export function newRun(seedInput: string, opts: RunOptions | number = {}): RunState {
  const run = createRun(seedInput, opts);
  prerollAllActs(run);
  assignPreItems(run);
  return run;
}

/** Objetos de las salas especiales de un acto, sorteados al crear la partida. */
export interface ActItems {
  camerino: string[];
  reto: string[];
  puesto: string[];
  secreta: string[];
  secretItem: boolean;
  jefe: string[];
  contrato: string[];
  /** Segundo camerino (si sale como sala extra). */
  camerino2?: string[];
  /** Premio final de la Cama de Clavos. */
  clavos?: string[];
  /** Objeto de la trastienda (segunda secreta). */
  trastienda?: string[];
}

/**
 * Sortea al empezar la partida los objetos de las salas especiales de los
 * cuatro actos, en orden fijo y con su propio flujo de azar. Así una semilla
 * da los mismos objetos aunque cada jugador visite las salas en otro orden o
 * saque otras cosas de cofres y ruletas.
 */
export function prerollAllActs(run: RunState): void {
  const rng = run.streams.get('objetos', 'pre');
  const take = (pool: PoolName, n: number) => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const id = run.pools.draw(pool, rng);
      if (id) out.push(id);
    }
    return out;
  };
  run.preItems = {};
  for (const def of ACTS) {
    const secretItem = rng.chance(0.6);
    run.preItems[def.n] = {
      camerino: take('camerino', 1),
      reto: take('camerino', 1),
      puesto: take('puesto', 2),
      secretItem,
      secreta: secretItem ? take('secreta', 1) : [],
      jefe: take('jefe', 1),
      contrato: def.contract ? take('contrato', 2) : [],
    };
  }
  // Después de los de siempre, para no cambiar qué objetos daban ya las semillas.
  for (const def of ACTS) {
    const it = run.preItems[def.n];
    it.camerino2 = take('camerino', 1);
    it.clavos = take('camerino', 1);
    it.trastienda = take('secreta', 1);
  }
}

/** Reparte los objetos sorteados del acto actual entre sus salas (`room.data.pre0`...). */
export function assignPreItems(run: RunState): void {
  const it = run.preItems?.[run.act];
  if (!it) return;
  const put = (room: RoomState, ids: string[] | undefined) => (ids ?? []).forEach((id, i) => (room.data[`pre${i}`] = id));
  let camerinos = 0;
  // Orden estable (por posición) para que el segundo camerino sea siempre el mismo.
  const ordered = [...run.rooms.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const room of ordered) {
    if (room.type === 'camerino') put(room, camerinos++ === 0 ? it.camerino : it.camerino2);
    else if (room.type === 'reto') put(room, it.reto);
    else if (room.type === 'puesto') put(room, it.puesto);
    else if (room.type === 'jefe') put(room, it.jefe);
    else if (room.type === 'clavos') put(room, it.clavos);
    else if (room.type === 'secreta' && room.data.super) put(room, it.trastienda);
    else if (room.type === 'secreta') {
      room.data.secretItem = it.secretItem;
      put(room, it.secreta);
    }
  }
  put(run.contract, it.contrato);
}

/** Pasa al siguiente acto conservando al jugador, sus objetos y las reservas. */
export function advanceAct(run: RunState): void {
  run.act++;
  run.actName = actDef(run.act).name;
  Object.assign(run, buildAct(run.streams, run.act));
  run.contractOpen = false;
  run.bossDefeated = false;
  // Entre actos se recupera un globo (dos si no perdiste rojos en el acto).
  const p = run.player;
  const heal = p.redDamageTaken ? 2 : 4;
  run.player.redDamageTaken = false;
  run.player.netUsed = false;
  assignPreItems(run);
  run.mapRevealed = false;
  // El acto nuevo empieza en el centro de la sala de inicio, no junto a una puerta.
  run.entry = null;
  run.stats.bombsUsedAct = 0;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + Math.max(0, heal - (run.gira >= 4 ? 2 : 0)));
  run.actHeal = p.hp - before;
}

export function currentRoom(run: RunState): RoomState {
  if (run.cur.x === -1) return run.contract;
  return run.rooms.get(roomKey(run.cur.x, run.cur.y))!;
}

export function neighborRoom(run: RunState, room: RoomState, dir: Dir): RoomState | undefined {
  if (room.type === 'contrato') return dir === 'S' ? bossRoom(run) : undefined;
  return run.rooms.get(roomKey(room.x + DIR_VEC[dir].x, room.y + DIR_VEC[dir].y));
}

export function bossRoom(run: RunState): RoomState {
  return [...run.rooms.values()].find((r) => r.type === 'jefe')!;
}

/** Lado libre de la sala del jefe donde aparece la puerta de El Contrato. */
export function contractDoorDir(run: RunState): Dir {
  const b = bossRoom(run);
  const free = (['N', 'E', 'W', 'S'] as Dir[]).filter((d) => !b.doors.includes(d));
  return free[0] ?? 'N';
}

/** ¿Es visible una puerta de `room` hacia `dir`? (las secretas hay que descubrirlas) */
export function doorVisible(run: RunState, room: RoomState, dir: Dir): boolean {
  if (room.type === 'contrato') return dir === 'S';
  if (room.type === 'jefe' && run.contractOpen && dir === contractDoorDir(run)) return true;
  if (!room.doors.includes(dir)) return false;
  const other = neighborRoom(run, room, dir);
  if (!other) return false;
  if (other.type === 'secreta' || room.type === 'secreta') return room.secretFound.includes(dir);
  return true;
}

export function totalHearts(p: PlayerState): number {
  return p.hp + p.shield;
}
