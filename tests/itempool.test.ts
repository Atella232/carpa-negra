import { describe, expect, it } from 'vitest';
import { ItemPools } from '../src/core/itempool';
import { Rng } from '../src/core/rng';

describe('ItemPools', () => {
  const entries = [
    { id: 'a', pools: ['camerino', 'jefe'] as const },
    { id: 'b', pools: ['camerino'] as const },
    { id: 'c', pools: ['puesto'] as const },
  ];

  it('no repite objetos entre reservas', () => {
    const p = new ItemPools(entries);
    const rng = new Rng(1);
    const got = [p.draw('camerino', rng), p.draw('camerino', rng)];
    expect(new Set(got).size).toBe(2);
    expect(p.draw('camerino', rng)).toBeNull();
    expect(p.draw('jefe', rng)).toBeNull(); // 'a' ya salió
    expect(p.draw('puesto', rng)).toBe('c');
  });

  it('es determinista con la misma semilla', () => {
    const run = () => {
      const p = new ItemPools(entries);
      const r = new Rng(77);
      return [p.draw('camerino', r), p.draw('camerino', r)];
    };
    expect(run()).toEqual(run());
  });
});

describe('reservas con el catálogo ampliado', () => {
  it('ninguna reserva se vacía al sortear los objetos de los cuatro actos', async () => {
    const { newRun } = await import('../src/core/run');
    for (let i = 0; i < 200; i++) {
      const run = newRun(`POOL${i}`);
      for (const n of [1, 2, 3, 4]) {
        const it = run.preItems![n];
        expect(it.camerino.length, `semilla ${i} acto ${n}`).toBe(1);
        expect(it.jefe.length).toBe(1);
        expect(it.puesto.length).toBe(2);
        expect(it.camerino2?.length).toBe(1);
        expect(it.clavos?.length).toBe(1);
        expect(it.trastienda?.length).toBe(1);
      }
    }
  });
});
