// Formato de las plantillas de sala (13×7 interiores) y sus volteos.
import { TILES } from '../tiles';

export interface RoomTemplate {
  id: string;
  diff: number; // 0 descanso … 3 difícil
  rows: string[];
  /** Oleadas extra ("números"): capas de 13×7 solo con criaturas. */
  waves?: string[][];
  /** Sala a oscuras (apagón). */
  dark?: boolean;
}

export const ROOM_COLS = 13;
export const ROOM_ROWS = 7;

/** Aplica volteos a una plantilla (las baldosas con dirección se giran). */
export function flipRows(rows: string[], flipX: boolean, flipY: boolean): string[] {
  let out = rows.slice();
  if (flipY) out = out.reverse().map((r) => [...r].map((ch) => TILES[ch]?.flipY ?? ch).join(''));
  if (flipX) out = out.map((r) => [...r].reverse().map((ch) => TILES[ch]?.flipX ?? ch).join(''));
  return out;
}

/** Celdas interiores justo delante de cada puerta: siempre libres. */
export const DOOR_CELLS = {
  N: { c: 6, r: 0 },
  S: { c: 6, r: 6 },
  W: { c: 0, r: 3 },
  E: { c: 12, r: 3 },
} as const;
