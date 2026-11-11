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
