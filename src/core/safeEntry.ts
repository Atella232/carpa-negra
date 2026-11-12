// Entrada segura (sin Phaser): ninguna criatura aparece a menos de 3 baldosas
// de la puerta por la que entras. Las que caen demasiado cerca se recolocan en
// la baldosa libre más cercana que esté lo bastante lejos.
import type { Dir } from './floorgen';
import { DOOR_CELLS, ROOM_COLS, ROOM_ROWS } from '../data/rooms/template';
import { TILES } from '../data/tiles';

export interface Spawn {
  ch: string;
  c: number;
  r: number;
}

/** Distancia mínima (en baldosas, tipo rey de ajedrez) a la puerta de entrada. */
export const SAFE_DIST = 3;

const cheb = (a: { c: number; r: number }, b: { c: number; r: number }) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));

/**
 * Criaturas de una plantilla ya volteada, con las demasiado cercanas a la
 * puerta `entry` recolocadas. `isCreature` dice qué letras son criaturas.
 */
export function safeSpawns(rows: string[], isCreature: (ch: string) => boolean, entry: Dir | null): Spawn[] {
  const spawns: Spawn[] = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => isCreature(ch) && spawns.push({ ch, c, r })));
  if (!entry) return spawns;
  const door = DOOR_CELLS[entry];
  const taken = new Set(spawns.map((s) => `${s.c},${s.r}`));
  const free = (c: number, r: number) => {
    const ch = rows[r][c];
    return (ch === '.' || TILES[ch]?.walkable === true && TILES[ch].kind === 'suelo') && !taken.has(`${c},${r}`);
  };
  for (const s of spawns) {
    if (cheb(s, door) >= SAFE_DIST) continue;
    // Búsqueda en anchura desde su sitio hasta una baldosa libre y lejos de la puerta.
    const seen = new Set([`${s.c},${s.r}`]);
    const q = [{ c: s.c, r: s.r }];
    let dest: { c: number; r: number } | null = null;
    while (q.length && !dest) {
      const cur = q.shift()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = cur.c + dc,
          r = cur.r + dr;
        if (c < 0 || r < 0 || c >= ROOM_COLS || r >= ROOM_ROWS || seen.has(`${c},${r}`)) continue;
        seen.add(`${c},${r}`);
        const ch = rows[r][c];
        const passable = ch === '.' || !!TILES[ch]?.walkable || isCreature(ch);
        if (!passable) continue;
        if (free(c, r) && cheb({ c, r }, door) >= SAFE_DIST) {
          dest = { c, r };
          break;
        }
        q.push({ c, r });
      }
    }
    if (dest) {
      taken.delete(`${s.c},${s.r}`);
      taken.add(`${dest.c},${dest.r}`);
      s.c = dest.c;
      s.r = dest.r;
    }
  }
  return spawns;
}
