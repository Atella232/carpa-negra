import { describe, expect, it } from 'vitest';
import { TimeTrail } from '../src/core/trail';

/** Mueve un punto a 68 px/s durante 2 s y devuelve a qué distancia va el seguidor. */
function follower(hz: number, lag: number): number {
  const tr = new TimeTrail(1.2);
  const dt = 1 / hz;
  let x = 0;
  for (let i = 0; i < 2 * hz; i++) {
    x += 68 * dt;
    tr.push(x, 0, dt);
  }
  return x - tr.at(lag)!.x;
}

describe('TimeTrail', () => {
  it('el retraso no depende de los hercios (salvo un fotograma)', () => {
    const lag = 5 / 60;
    const at60 = follower(60, lag);
    for (const hz of [30, 120, 144]) expect(Math.abs(follower(hz, lag) - at60)).toBeLessThanOrEqual(68 / hz + 1e-6);
  });

  it('a 60 Hz reproduce el rastro por fotogramas de antes', () => {
    // Antes: trail[(i+1)*5] con un punto por fotograma → 5 pasos de 68/60 px.
    expect(follower(60, 5 / 60)).toBeCloseTo(5 * (68 / 60), 5);
  });

  it('sin historia suficiente devuelve el punto más antiguo', () => {
    const tr = new TimeTrail(1);
    tr.push(3, 4, 1 / 60);
    expect(tr.at(0.5)).toMatchObject({ x: 3, y: 4 });
  });
});
