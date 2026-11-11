import { describe, expect, it } from 'vitest';
import { Rng, RngStreams, hashString, normalizeSeed, formatSeed } from '../src/core/rng';

describe('Rng', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('int respeta los límites', () => {
    const r = new Rng(9);
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('los flujos son independientes', () => {
    const s1 = new RngStreams('ABCD1234');
    const s2 = new RngStreams('ABCD1234');
    // Consumir el flujo de botín no altera el de mapa.
    for (let i = 0; i < 50; i++) s1.get('botin').next();
    expect(s1.get('mapa').next()).toBe(s2.get('mapa').next());
  });

  it('normaliza y formatea semillas', () => {
    expect(normalizeSeed('ab cd-12 34')).toBe('ABCD1234');
    expect(formatSeed('ABCD1234')).toBe('ABCD 1234');
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
