// Estadísticas tal como las ve el jugador (pausa, panel del tabulador y avisos).
import type { FinalStats } from '../core/stats';

export interface StatRow {
  label: string;
  value: number;
  text: string;
}

const DEFS: { label: string; get: (s: FinalStats) => number; digits: number }[] = [
  { label: 'Daño', get: (s) => s.damage, digits: 2 },
  { label: 'Cadencia', get: (s) => s.shotsPerSecond, digits: 2 },
  { label: 'Alcance', get: (s) => s.range / 16, digits: 1 },
  { label: 'Vel. tiro', get: (s) => s.shotSpeed / 100, digits: 2 },
  { label: 'Velocidad', get: (s) => s.speed / 80, digits: 2 },
  { label: 'Suerte', get: (s) => s.luck, digits: 1 },
];

export function statRows(s: FinalStats): StatRow[] {
  return DEFS.map((d) => {
    const v = d.get(s);
    return { label: d.label, value: v, text: v.toFixed(d.digits) };
  });
}

/** Qué estadísticas han subido o bajado entre dos momentos. */
export function statDiff(before: FinalStats, after: FinalStats): { label: string; up: boolean }[] {
  const a = statRows(before);
  const b = statRows(after);
  const out: { label: string; up: boolean }[] = [];
  a.forEach((row, i) => {
    if (Math.abs(b[i].value - row.value) > 0.004) out.push({ label: row.label, up: b[i].value > row.value });
  });
  return out;
}
