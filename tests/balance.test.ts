// Presupuesto de amenaza: cada sala suma la amenaza de sus criaturas y debe
// caber en el margen de su dificultad. Evita salas injustas (demasiadas fieras)
// o aburridas (casi vacías) para su nivel.
import { describe, expect, it } from 'vitest';
import { ACTS, ActDef } from '../src/data/acts';
import { THREAT, EnemyKind } from '../src/data/enemies';
import type { RoomTemplate } from '../src/data/rooms/template';

/** [mínimo, máximo] por dificultad; índice 0 = descanso (sin criaturas). */
const BUDGET: Record<'bajo' | 'alto', [number, number][]> = {
  // Actos I y II
  bajo: [[0, 0], [0, 8], [4, 12], [8, 15]],
  // Actos III y IV (más vida y criaturas más complejas)
  alto: [[0, 0], [0, 10], [4, 14], [8, 20]],
};
const WAVE_MAX = 14;
/** Criaturas «pesadas» (amenaza ≥ 4) como mucho en la capa base. */
const MAX_HEAVY = 3;

/** Criatura de una letra (los comodines cuentan como la más fuerte de su lista). */
function kindsOf(act: ActDef, ch: string): EnemyKind[] {
  if (act.legend[ch]) return [act.legend[ch]];
  const slots = (act as ActDef & { slots?: Record<string, EnemyKind[]> }).slots;
  return slots?.[ch] ?? [];
}

function threatOf(act: ActDef, ch: string): number {
  const ks = kindsOf(act, ch);
  return ks.length ? Math.max(...ks.map((k) => THREAT[k])) : 0;
}

export function layerThreat(act: ActDef, rows: string[]): { total: number; heavy: number } {
  let total = 0,
    heavy = 0;
  for (const r of rows)
    for (const ch of r) {
      const t = threatOf(act, ch);
      total += t;
      if (t >= 4) heavy++;
    }
  return { total, heavy };
}

describe.each(ACTS.map((a) => [a.n, a] as const))('presupuesto del acto %i', (n, act) => {
  const budget = BUDGET[n <= 2 ? 'bajo' : 'alto'];
  it.each(act.templates.map((t) => [t.id, t] as const))('%s', (id, t: RoomTemplate) => {
    const [min, max] = budget[t.diff];
    const base = layerThreat(act, t.rows);
    expect(base.total, `${id}: amenaza ${base.total} fuera de [${min}, ${max}]`).toBeGreaterThanOrEqual(min);
    expect(base.total, `${id}: amenaza ${base.total} fuera de [${min}, ${max}]`).toBeLessThanOrEqual(max);
    expect(base.heavy, `${id}: ${base.heavy} criaturas pesadas`).toBeLessThanOrEqual(MAX_HEAVY);
    for (const [i, w] of (t.waves ?? []).entries()) {
      const wt = layerThreat(act, w);
      expect(wt.total, `${id} oleada ${i + 1}: amenaza ${wt.total}`).toBeLessThanOrEqual(WAVE_MAX);
    }
  });
});

it('todas las criaturas de las plantillas tienen amenaza', () => {
  for (const act of ACTS)
    for (const k of Object.values(act.legend)) expect(THREAT[k], k).toBeGreaterThan(0);
});
