// Validador de plantillas de todos los actos.
import { describe, expect, it } from 'vitest';
import { ACTS, SLOT_CHARS, isCreatureChar, creatureAt, actDef } from '../src/data/acts';
import { TILES } from '../src/data/tiles';
import { DOOR_CELLS, ROOM_COLS, ROOM_ROWS, flipRows, RoomTemplate } from '../src/data/rooms/template';
import { ENEMIES, THREAT } from '../src/data/enemies';
import { safeSpawns, SAFE_DIST } from '../src/core/safeEntry';

const FLIPS = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
] as const;

function flood(rows: string[], from: { c: number; r: number }, ok: (ch: string) => boolean): Set<string> {
  const seen = new Set<string>([`${from.c},${from.r}`]);
  const stack = [from];
  while (stack.length) {
    const { c, r } = stack.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc,
        nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= ROOM_COLS || nr >= ROOM_ROWS) continue;
      const k = `${nc},${nr}`;
      if (seen.has(k) || !ok(rows[nr][nc])) continue;
      seen.add(k);
      stack.push({ c: nc, r: nr });
    }
  }
  return seen;
}

describe.each(ACTS.map((a) => [a.n, a] as const))('plantillas del acto %i', (_n, act) => {
  const legend = act.legend;
  // Criatura: de la leyenda o comodín (5, 6, 7).
  const isCreature = (ch: string) => isCreatureChar(act, ch);
  /** ¿Vuela? Los comodines se tratan como criaturas de suelo (solo pueden ir sobre suelo). */
  const flies = (ch: string) => !!legend[ch] && !!ENEMIES[legend[ch]].flying;
  const walkable = (ch: string) => isCreature(ch) || !!TILES[ch]?.walkable;
  // Los disparos llegan a una criatura si no hay bloqueos que no se puedan romper.
  const shootable = (ch: string) => isCreature(ch) || (TILES[ch] && TILES[ch].kind !== 'bloque');

  it('las letras de baldosa y de criatura no se pisan', () => {
    for (const ch of [...Object.keys(legend), ...SLOT_CHARS]) expect(TILES[ch], `'${ch}' es baldosa y criatura`).toBeUndefined();
    for (const ch of SLOT_CHARS) expect(legend[ch], `'${ch}' es comodín y criatura`).toBeUndefined();
  });

  it('los comodines solo tienen criaturas de su presupuesto', () => {
    for (const ch of SLOT_CHARS) {
      expect(act.slots[ch].length, `comodín ${ch}`).toBeGreaterThan(0);
      for (const k of act.slots[ch]) expect(THREAT[k], `${k} en el comodín ${ch}`).toBeLessThanOrEqual(ch === '5' ? 2 : 3);
    }
  });

  it('hay plantillas de todas las dificultades', () => {
    for (const d of [0, 1, 2, 3]) expect(act.templates.some((t) => t.diff === d), `dificultad ${d}`).toBe(true);
  });

  it.each(act.templates.map((t) => [t.id, t] as const))('%s', (id, t: RoomTemplate) => {
    expect(t.rows.length, id).toBe(ROOM_ROWS);
    for (const r of t.rows) expect(r.length, id).toBe(ROOM_COLS);
    for (const r of t.rows) for (const ch of r) expect(!!TILES[ch] || isCreature(ch), `${id}: '${ch}'`).toBe(true);
    for (const w of t.waves ?? []) {
      expect(w.length).toBe(ROOM_ROWS);
      w.forEach((row, r) => {
        expect(row.length).toBe(ROOM_COLS);
        [...row].forEach((ch, c) => {
          if (ch === '.') return;
          expect(isCreature(ch), `${id} oleada: '${ch}'`).toBe(true);
          const base = t.rows[r][c];
          expect(walkable(base) || flies(ch), `${id} oleada sobre '${base}'`).toBe(true);
        });
      });
    }
    for (const [fx, fy] of FLIPS) {
      const rows = flipRows(t.rows, fx, fy);
      // Voltear dos veces deja la plantilla igual.
      expect(flipRows(rows, fx, fy)).toEqual(t.rows);
      for (const d of Object.values(DOOR_CELLS)) expect(rows[d.r][d.c], `${id} puerta`).toBe('.');
      const reach = flood(rows, DOOR_CELLS.N, walkable);
      for (const d of Object.values(DOOR_CELLS)) expect(reach.has(`${d.c},${d.r}`), `${id} puertas conectadas`).toBe(true);
      // Entrada segura: entres por donde entres, ninguna criatura a menos de 3 baldosas.
      for (const dir of ['N', 'S', 'E', 'W'] as const) {
        const door = DOOR_CELLS[dir];
        const spawns = safeSpawns(rows, isCreature, dir);
        const total = rows.join('').split('').filter(isCreature).length;
        expect(spawns.length, `${id}: se pierden criaturas`).toBe(total);
        for (const sp of spawns) {
          expect(Math.max(Math.abs(sp.c - door.c), Math.abs(sp.r - door.r)), `${id} por ${dir}: criatura en ${sp.c},${sp.r}`).toBeGreaterThanOrEqual(SAFE_DIST);
          expect(walkable(rows[sp.r][sp.c]) || flies(sp.ch), `${id}: criatura sobre obstáculo`).toBe(true);
        }
        expect(new Set(spawns.map((x) => `${x.c},${x.r}`)).size, `${id}: dos criaturas en la misma baldosa`).toBe(spawns.length);
      }
      // Toda criatura se puede matar desde alguna puerta.
      const shots = flood(rows, DOOR_CELLS.N, shootable);
      rows.forEach((row, r) =>
        [...row].forEach((ch, c) => {
          if (isCreature(ch)) expect(shots.has(`${c},${r}`), `${id}: criatura inalcanzable en ${c},${r}`).toBe(true);
        }),
      );
    }
  });
});

it('los identificadores de plantilla son únicos entre actos', () => {
  const ids = ACTS.flatMap((a) => a.templates.map((t) => t.id));
  expect(new Set(ids).size).toBe(ids.length);
});

it('los comodines salen como la criatura sorteada para la sala', () => {
  const def = actDef(1);
  const rows = ['.............', '.............', '.............', '..5...6...7..', '.............', '.............', '.............'];
  const spawns = safeSpawns(rows, (ch) => isCreatureChar(def, ch), 'N');
  expect(spawns.map((s) => s.ch)).toEqual(['5', '6', '7']);
  const data = { slot5: 'pulga', slot6: 'mono', slot7: 'caja' };
  expect(spawns.map((s) => creatureAt(def, data, s.ch))).toEqual(['pulga', 'mono', 'caja']);
  // Sin sorteo (o con una criatura que ya no está en la lista): la primera.
  expect(creatureAt(def, { slot5: 'barbuda' }, '5')).toBe(def.slots['5'][0]);
  expect(creatureAt(def, {}, 'm')).toBe('mimo');
});
