import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { simulateActTickets } from '../src/core/loot';

describe('economía', () => {
  it('en un acto entran boletos para un objeto del puesto y algo más', () => {
    const rng = new Rng(1234);
    const N = 4000;
    let sum = 0;
    const runs: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = simulateActTickets(rng);
      sum += t;
      runs.push(t);
    }
    const mean = sum / N;
    runs.sort((a, b) => a - b);
    const p10 = runs[Math.floor(N * 0.1)];
    // Media: más que un objeto normal (15) pero sin llegar a vaciar el puesto.
    expect(mean).toBeGreaterThan(15);
    expect(mean).toBeLessThan(35);
    // Incluso en una mala racha se puede comprar algo barato.
    expect(p10).toBeGreaterThanOrEqual(6);
  });

  it('la suerte ayuda', () => {
    const a = new Rng(9),
      b = new Rng(9);
    let s0 = 0,
      s3 = 0;
    for (let i = 0; i < 2000; i++) {
      s0 += simulateActTickets(a, 10, 0.6, 40, 0);
      s3 += simulateActTickets(b, 10, 0.6, 40, 3);
    }
    expect(s3).toBeGreaterThan(s0);
  });
});
