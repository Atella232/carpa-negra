import { describe, expect, it } from 'vitest';
import { computeStats, BASE } from '../src/core/stats';

describe('computeStats', () => {
  it('sin objetos devuelve las estadísticas base', () => {
    const s = computeStats([]);
    expect(s.damage).toBe(BASE.damage);
    expect(s.shotsPerSecond).toBeCloseTo(BASE.shotsPerSecond);
    expect(s.range).toBe(BASE.range);
    expect(s.shot.extraShots).toBe(0);
  });

  it('suma planos y multiplica multiplicadores', () => {
    const s = computeStats([{ stats: { damage: 1 } }, { stats: { damage: 1, damageMult: 1.5 } }]);
    expect(s.damage).toBeCloseTo((3.5 + 2) * 1.5);
  });

  it('la cadencia tiene rendimientos decrecientes y límites', () => {
    const one = computeStats([{ stats: { tears: 1 } }]).shotsPerSecond;
    const two = computeStats([{ stats: { tears: 2 } }]).shotsPerSecond;
    expect(two - one).toBeLessThan(one - BASE.shotsPerSecond + 0.001);
    expect(computeStats([{ stats: { tears: 100 } }]).shotsPerSecond).toBeLessThanOrEqual(9);
    expect(computeStats([{ stats: { tears: -100 } }]).shotsPerSecond).toBeGreaterThanOrEqual(0.7);
  });

  it('combina modificadores de disparo (sinergias)', () => {
    const s = computeStats([
      { shot: { extraShots: 2, spread: 12 } },
      { shot: { pierce: true } },
      { shot: { bounce: 2 } },
      { shot: { sizeMult: 2 } },
      { shot: { sizeMult: 1.25 } },
    ]);
    expect(s.shot.extraShots).toBe(2);
    expect(s.shot.spread).toBe(12);
    expect(s.shot.pierce).toBe(true);
    expect(s.shot.bounce).toBe(2);
    expect(s.shot.sizeMult).toBeCloseTo(2.5);
  });

  it('el daño nunca baja de 0,5', () => {
    expect(computeStats([{ stats: { damage: -50 } }]).damage).toBe(0.5);
  });
});
