// Estado de una partida: piso, salas, inventario y progreso. Sin Phaser.
import { RngStreams, normalizeSeed } from './rng';
import { generateFloor, roomDoors, Dir, FloorLayout, RoomType, DIR_VEC } from './floorgen';
import { ItemPools } from './itempool';
import { StatMods } from './stats';
import { ITEMS } from '../data/items';
import { actDef } from '../data/acts';
import { BossKind } from '../data/enemies';
import { GOLOSINA_COLORS, GOLOSINA_EFFECTS, GolosinaColor, GolosinaEffect } from '../data/golosinas';

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
  seenItems: string[];
  /** Medios globos curados al empezar el acto actual (para avisar). */
  actHeal: number;
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
    stocked: false,
    data: {},
  };
}

/** Genera el piso de un acto (salas, contrato y jefe) con su propio flujo de azar. */
export function buildAct(streams: RngStreams, act: number): Pick<RunState, 'layout' | 'rooms' | 'contract' | 'boss' | 'cur'> {
  const def = actDef(act);
  // El Acto I usa el flujo "mapa" sin sal para que las semillas antiguas no cambien.
  const mapRng = act === 1 ? streams.get('mapa') : streams.get('mapa', String(act));
  const layout = generateFloor(mapRng, { minNormal: def.minNormal, maxNormal: def.maxNormal });
  const templates = def.templates;

  const rooms = new Map<string, RoomState>();
  for (const r of layout.rooms) {
    const room = newRoom(r.x, r.y, r.type, r.dist, roomDoors(layout, r.x, r.y));
    if (r.type === 'normal') {
      // Más dificultad cuanto más lejos del inicio.
      const allowed = r.dist <= 1 ? [0, 1, 1, 2] : r.dist <= 3 ? [1, 2, 2, 3] : [2, 3, 3];
      const want = mapRng.pick(allowed);
      const options = templates.filter((t) => t.diff === want);
      const tpl = mapRng.pick(options.length ? options : templates);
      room.templateId = tpl.id;
      room.flipX = mapRng.chance(0.5);
      room.flipY = mapRng.chance(0.5);
      if (tpl.diff === 0) room.cleared = true;
    }
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

export function createRun(seedInput: string, now = 0): RunState {
  const seed = normalizeSeed(seedInput) || 'CARPA000';
  const streams = new RngStreams(seed);
  const floor = buildAct(streams, 1);

  // Golosinas: cada color con un efecto distinto.
  const gRng = streams.get('golosinas');
  const effects = gRng.shuffle(Object.keys(GOLOSINA_EFFECTS) as GolosinaEffect[]);
  const golosinaMap = {} as Record<GolosinaColor, GolosinaEffect>;
  GOLOSINA_COLORS.forEach((c, i) => (golosinaMap[c] = effects[i]));

  return {
    seed,
    streams,
    act: 1,
    actName: actDef(1).name,
    ...floor,
    player: {
      maxHp: 6,
      hp: 6,
      shield: 0,
      tickets: 0,
      bombs: 1,
      keys: 1,
      passives: [],
      active: null,
      charge: 0,
      golosina: null,
      bonus: {},
      redDamageTaken: false,
    },
    pools: new ItemPools(ITEMS),
    golosinaMap,
    golosinaKnown: [],
    contractOpen: false,
    bossDefeated: false,
    kills: 0,
    roomsCleared: 0,
    startedAt: now,
    seenItems: [],
    actHeal: 0,
  };
}

/** Pasa al siguiente acto conservando al jugador, sus objetos y las reservas. */
export function advanceAct(run: RunState): void {
  run.act++;
  run.actName = actDef(run.act).name;
  Object.assign(run, buildAct(run.streams, run.act));
  run.contractOpen = false;
  run.bossDefeated = false;
  run.player.redDamageTaken = false;
  // Entre actos se recupera al menos un globo rojo.
  const p = run.player;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + 2);
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
