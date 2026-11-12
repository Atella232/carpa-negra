// Guardado local: ajustes, álbum, récords y progreso. Nunca es imprescindible:
// si el navegador no deja guardar, el juego funciona igual.
const KEY = 'carpa-negra:v1';
export const SAVE_VERSION = 2;

export interface Settings {
  sfx: number;
  music: number;
  muted: boolean;
  /** 0 = sin sacudidas, 1 = normal. */
  shake: number;
  /** Destellos y parpadeos rápidos. */
  flashes: boolean;
  /** Paradas de impacto. */
  hitstop: boolean;
  transition: 'deslizar' | 'fundido';
  damageNumbers: boolean;
  /** Reasignación de teclas: acción → códigos (event.code). */
  keys?: Record<string, string[]>;
  /** Reasignación de mando: acción → botones. */
  pad?: Record<string, number[]>;
  touch: 'auto' | 'si' | 'no';
  lang: 'es' | 'en';
  /** Balas enemigas más grandes y brillantes. */
  contrast: boolean;
  /** Vibración del mando. */
  rumble: boolean;
  /** Acto y reloj de partida en el marcador. */
  timer: boolean;
}

export interface Records {
  bestTime: number | null; // segundos de la victoria más rápida
  furthestAct: number;
  streak: number;
  bestStreak: number;
  kills: number;
  deathsBy: Record<string, number>;
}

export interface SaveData {
  version: number;
  album: string[];
  settings: Settings;
  runs: number;
  wins: number;
  records: Records;
  /** Carteles conseguidos (logros). */
  carteles: string[];
  /** Finales vistos. */
  endings: string[];
  /** Nivel máximo desbloqueado de La Gira (0 = ninguno). */
  gira: number;
  /** Función del día: fecha → intentos y mejor resultado. */
  daily: Record<string, { attempts: number; best: number; act: number; time: number }>;
  /** Contadores sueltos para logros (golosinas vistas, jefes vencidos...). */
  counters: Record<string, number>;
  /** Listas sueltas para logros (jefes vencidos, golosinas identificadas...). */
  sets: Record<string, string[]>;
}

export const DEFAULT_SETTINGS: Settings = {
  sfx: 0.6, music: 0.35, muted: false, shake: 1, flashes: true, hitstop: true,
  transition: 'deslizar', damageNumbers: false, touch: 'auto', lang: 'es', contrast: false, rumble: true, timer: false,
};

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    album: [],
    settings: { ...DEFAULT_SETTINGS },
    runs: 0,
    wins: 0,
    records: { bestTime: null, furthestAct: 0, streak: 0, bestStreak: 0, kills: 0, deathsBy: {} },
    carteles: [],
    endings: [],
    gira: 0,
    daily: {},
    counters: {},
    sets: {},
  };
}

/** Mezcla profunda: lo guardado gana, lo que falta sale de los valores por defecto. */
function merge<T>(base: T, saved: unknown): T {
  if (saved === undefined || saved === null) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return saved as T;
  if (typeof saved !== 'object' || Array.isArray(saved)) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b !== undefined && typeof b === 'object' && b !== null && !Array.isArray(b) && Object.keys(b).length ? merge(b, v) : v;
  }
  return out as T;
}

/** Convierte cualquier guardado antiguo al formato actual. */
export function migrate(raw: unknown): SaveData {
  const s = merge(defaultSave(), raw);
  s.version = SAVE_VERSION;
  return s;
}

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw)) : defaultSave();
  } catch {
    cache = defaultSave();
  }
  return cache!;
}

export function writeSave(mut: (s: SaveData) => void): void {
  const s = loadSave();
  mut(s);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function settings(): Settings {
  return loadSave().settings;
}

export function setSettings(patch: Partial<Settings>): void {
  writeSave((s) => Object.assign(s.settings, patch));
}

export function addToAlbum(ids: string[]): void {
  writeSave((s) => {
    for (const id of ids) if (id !== 'calcetin' && !s.album.includes(id)) s.album.push(id);
  });
}

/** Solo para tests: olvida la caché. */
export function _resetSaveCache(): void {
  cache = null;
}
