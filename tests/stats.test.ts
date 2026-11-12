import { describe, expect, it } from 'vitest';
import { computeStats, BASE } from '../src/core/stats';
import { buildVolley } from '../src/core/volley';
import { ITEMS } from '../src/data/items';

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

describe('modificadores de la variedad', () => {
  const S = (...ids: string[]) => computeStats(ids.map((id) => ITEMS.find((i) => i.id === id)!));

  it('llegan a las estadísticas y a la ráfaga', () => {
    const cases: [string, keyof ReturnType<typeof computeStats>['shot']][] = [
      ['bumeranPayaso', 'boomerang'], ['serpentinas', 'wiggle'], ['florSolapa', 'water'], ['chicle', 'sticky'],
      ['platosChinos', 'antiBala'], ['bolos', 'linger'], ['bolaEspejos', 'prism'], ['aroHula', 'orbit'],
      ['carrusel', 'cross'], ['mazoFeria', 'ramp'], ['dobleCanon', 'parallel'],
    ];
    for (const [id, key] of cases) {
      const st = S(id);
      expect(st.shot[key], id).toBeTruthy();
      const v = buildVolley(st, { x: 1, y: 0 });
      if (key in v[0].opts) expect((v[0].opts as Record<string, unknown>)[key], id).toBe(true);
    }
  });

  it('el Doble Cañón duplica cada pelota, separadas', () => {
    const v = buildVolley(S('dobleCanon'), { x: 1, y: 0 });
    expect(v.length).toBe(2);
    expect(v.map((s) => s.offset).sort()).toEqual([-4, 4]);
  });

  it('el Trabuco dispersa de forma determinista con el mismo azar', () => {
    const st = S('trabuco');
    const seq = () => {
      let i = 0;
      const xs = [0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6, 0.05];
      return () => xs[i++ % xs.length];
    };
    const a = buildVolley(st, { x: 1, y: 0 }, 1, 0, seq());
    const b = buildVolley(st, { x: 1, y: 0 }, 1, 0, seq());
    expect(a.length).toBe(5);
    expect(a.map((s) => s.angle)).toEqual(b.map((s) => s.angle));
    expect(new Set(a.map((s) => s.speedMult.toFixed(3))).size).toBeGreaterThan(1);
  });

  it('como mucho 9 pelotas por ráfaga', () => {
    expect(buildVolley(S('trabuco', 'tripleMalabar', 'clausulaAdicional'), { x: 1, y: 0 }).length).toBe(8);
    const many = computeStats([...['trabuco', 'tripleMalabar'].map((id) => ITEMS.find((i) => i.id === id)!), { shot: { extraShots: 5 } }]);
    expect(buildVolley(many, { x: 1, y: 0 }).length).toBe(9);
  });

  it('el aro de hula manda sobre el bumerán, las serpentinas y los bolos', () => {
    const o = buildVolley(S('aroHula', 'bumeranPayaso', 'serpentinas', 'bolos'), { x: 1, y: 0 })[0].opts;
    expect(o.orbit).toBe(true);
    expect(o.boomerang || o.wiggle || o.linger).toBe(false);
  });
});
