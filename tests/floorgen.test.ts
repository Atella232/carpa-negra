import { describe, expect, it } from 'vitest';
import { Rng, hashString } from '../src/core/rng';
import { generateFloor, neighbors, roomDoors, FloorLayout } from '../src/core/floorgen';

const k = (x: number, y: number) => `${x},${y}`;

function connectedWithoutSecret(layout: FloorLayout): boolean {
  const visible = layout.rooms.filter((r) => r.type !== 'secreta');
  const set = new Set(visible.map((r) => k(r.x, r.y)));
  const seen = new Set<string>([k(layout.start.x, layout.start.y)]);
  const stack = [layout.start];
  while (stack.length) {
    const c = stack.pop()!;
    for (const n of neighbors(c.x, c.y)) {
      const key = k(n.x, n.y);
      if (set.has(key) && !seen.has(key)) {
        seen.add(key);
        stack.push(n);
      }
    }
  }
  return seen.size === set.size;
}

describe('generateFloor', () => {
  it('cumple sus invariantes en 1000 semillas', () => {
    for (let i = 0; i < 1000; i++) {
      const layout = generateFloor(new Rng(hashString(`semilla-${i}`)));
      const count = (t: string) => layout.rooms.filter((r) => r.type === t).length;

      expect(count('inicio')).toBe(1);
      expect(count('jefe')).toBe(1);
      expect(count('camerino')).toBe(1);
      expect(count('puesto')).toBe(1);
      expect(count('secreta')).toBe(1);
      expect(count('normal')).toBeGreaterThanOrEqual(8);
      expect(connectedWithoutSecret(layout)).toBe(true);

      // Sin duplicados de celda y dentro de la rejilla.
      const cells = new Set(layout.rooms.map((r) => k(r.x, r.y)));
      expect(cells.size).toBe(layout.rooms.length);
      for (const r of layout.rooms) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x).toBeLessThan(layout.w);
        expect(r.y).toBeLessThan(layout.h);
      }

      // Las salas especiales están en callejones sin salida (sin contar la secreta).
      const visible = new Set(
        layout.rooms.filter((r) => r.type !== 'secreta').map((r) => k(r.x, r.y)),
      );
      for (const r of layout.rooms) {
        if (['jefe', 'camerino', 'puesto', 'diana', 'barraca'].includes(r.type)) {
          const adj = neighbors(r.x, r.y).filter((n) => visible.has(k(n.x, n.y)));
          expect(adj.length).toBe(1);
        }
      }

      // El jefe está lejos del inicio y la secreta no lo toca.
      const boss = layout.rooms.find((r) => r.type === 'jefe')!;
      expect(boss.dist).toBeGreaterThanOrEqual(3);
      const secret = layout.rooms.find((r) => r.type === 'secreta')!;
      for (const n of neighbors(secret.x, secret.y)) {
        expect(!(n.x === boss.x && n.y === boss.y)).toBe(true);
      }
      expect(roomDoors(layout, secret.x, secret.y).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('la misma semilla produce el mismo piso', () => {
    const a = generateFloor(new Rng(42));
    const b = generateFloor(new Rng(42));
    expect(a).toEqual(b);
  });

  it('casi siempre coloca la diana y la barraca', () => {
    let both = 0;
    for (let i = 0; i < 300; i++) {
      const l = generateFloor(new Rng(hashString(`x${i}`)));
      if (l.rooms.some((r) => r.type === 'diana') && l.rooms.some((r) => r.type === 'barraca')) both++;
    }
    expect(both).toBeGreaterThan(270);
  });
});

describe('salas especiales sorteadas', () => {
  const extras = [
    { value: 'diana' as const, weight: 3 },
    { value: 'barraca' as const, weight: 3 },
    { value: 'almacen' as const, weight: 3 },
    { value: 'clavos' as const, weight: 2 },
    { value: 'curandero' as const, weight: 1 },
  ];

  it('saca entre el mínimo y el máximo, sin repetir, y varían', () => {
    const counts = new Set<number>();
    const kinds = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const l = generateFloor(new Rng(hashString(`e${i}`)), { extras, extraCount: [2, 3], minNormal: 9, maxNormal: 11 });
      const got = l.rooms.map((r) => r.type).filter((t) => extras.some((e) => e.value === t));
      expect(new Set(got).size).toBe(got.length);
      expect(got.length).toBeGreaterThanOrEqual(2);
      expect(got.length).toBeLessThanOrEqual(3);
      counts.add(got.length);
      got.forEach((t) => kinds.add(t));
    }
    expect([...counts].sort()).toEqual([2, 3]);
    expect(kinds.size).toBe(extras.length);
  });

  it('la trastienda toca exactamente una sala normal y no toca al jefe', () => {
    let found = 0;
    for (let i = 0; i < 500; i++) {
      const l = generateFloor(new Rng(hashString(`t${i}`)), { extras, extraCount: [2, 3], superSecret: 1, minNormal: 9, maxNormal: 11 });
      const sup = l.rooms.filter((r) => r.tag === 'super');
      expect(sup.length).toBeLessThanOrEqual(1);
      if (!sup.length) continue;
      found++;
      const s = sup[0];
      const adj = l.rooms.filter((r) => neighbors(s.x, s.y).some((n) => n.x === r.x && n.y === r.y));
      expect(adj.length).toBe(1);
      expect(adj[0].type).toBe('normal');
      expect(roomDoors(l, s.x, s.y).length).toBe(1);
    }
    // Casi siempre hay sitio para ella.
    expect(found).toBeGreaterThan(450);
  });
});
