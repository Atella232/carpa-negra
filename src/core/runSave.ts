// Guardar y continuar: una sola partida guardada, aparte del perfil. Se guarda
// al entrar en una sala (antes de construirla) y poco después de limpiarla; se
// borra al morir o al terminar. Como el azar va guardado, no se pueden volver a
// tirar los premios saliendo y entrando.
import { RunState, RoomState, roomKey } from './run';
import { ItemPools } from './itempool';
import { restoreStreams, snapshotStreams } from './rng';
import { ITEMS } from '../data/items';
import { findTemplate } from '../data/acts';
import { BOSS_NAMES } from '../data/enemies';

const KEY = 'carpa-negra:partida';
export const RUN_SAVE_VERSION = 1;

type Serialized = Omit<RunState, 'streams' | 'rooms' | 'pools'> & {
  v: number;
  streams: Record<string, number>;
  rooms: RoomState[];
  pools: string[];
  savedAt: number;
};

export function serializeRun(run: RunState): string {
  const { streams, rooms, pools, ...rest } = run;
  const data: Serialized = {
    ...rest,
    v: RUN_SAVE_VERSION,
    streams: snapshotStreams(streams),
    rooms: [...rooms.values()],
    pools: pools.toJSON(),
    savedAt: Date.now(),
  };
  return JSON.stringify(data);
}

/** Recrea la partida; null si el guardado no vale (versión, objetos o salas desconocidos). */
export function deserializeRun(json: string): RunState | null {
  try {
    const d = JSON.parse(json) as Serialized;
    if (d.v !== RUN_SAVE_VERSION) return null;
    const known = new Set(ITEMS.map((i) => i.id));
    const items = [...d.player.passives, ...(d.player.active ? [d.player.active] : [])];
    if (items.some((id) => !known.has(id))) return null;
    if (!(d.boss in BOSS_NAMES)) return null;
    for (const r of d.rooms) if (r.templateId && !findTemplate(r.templateId, d.act)) return null;
    const { v: _v, savedAt: _s, streams, rooms, pools, ...rest } = d;
    const p = new ItemPools(ITEMS.filter((i) => !(d.locked ?? []).includes(i.id)));
    p.restore(pools);
    return {
      ...rest,
      streams: restoreStreams(d.seed, streams),
      rooms: new Map(rooms.map((r) => [roomKey(r.x, r.y), r])),
      pools: p,
    } as RunState;
  } catch {
    return null;
  }
}

export function saveRun(run: RunState): void {
  try {
    window.localStorage.setItem(KEY, serializeRun(run));
  } catch {
    /* sin almacenamiento */
  }
}

export function loadRunSave(): RunState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? deserializeRun(raw) : null;
  } catch {
    return null;
  }
}

export function hasRunSave(): boolean {
  return loadRunSave() !== null;
}

export function clearRunSave(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}
