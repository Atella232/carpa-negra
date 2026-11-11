// Guardado local: ajustes y álbum de objetos vistos. Nunca es imprescindible:
// si el navegador no deja guardar, el juego funciona igual.
const KEY = 'carpa-negra:v1';

interface SaveData {
  album: string[];
  settings: { sfx: number; music: number; muted: boolean };
  runs: number;
  wins: number;
}

const DEFAULT: SaveData = { album: [], settings: { sfx: 0.6, music: 0.35, muted: false }, runs: 0, wins: 0 };

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT, ...JSON.parse(raw) } : structuredClone(DEFAULT);
  } catch {
    cache = structuredClone(DEFAULT);
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

export function addToAlbum(ids: string[]): void {
  writeSave((s) => {
    for (const id of ids) if (!s.album.includes(id)) s.album.push(id);
  });
}
