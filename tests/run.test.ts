import { describe, expect, it } from 'vitest';
import { createRun, doorVisible, contractDoorDir, bossRoom, advanceAct } from '../src/core/run';
import { ACTO2_ROOMS } from '../src/data/rooms/acto2';
import { TEMPLATE_ENEMY } from '../src/data/enemies';
import { ACTO1_ROOMS, DOOR_CELLS, ROOM_COLS, ROOM_ROWS, flipRows } from '../src/data/rooms/acto1';
import { ITEMS } from '../src/data/items';
import { ITEM_ICONS as ICONS1 } from '../src/art/sprites/items';
import { ACT2_SPRITES } from '../src/art/sprites/act2';
const ITEM_ICONS = { ...ICONS1, ...ACT2_SPRITES };

const WALKABLE = new Set(['.', 'T', ...Object.keys(TEMPLATE_ENEMY)]);
const KNOWN = new Set(['.', 'T', 'C', 'X', 'P', 'M', 'O', 'F', 'J', 'H', ...Object.keys(TEMPLATE_ENEMY)]);

function reachableDoors(rows: string[]): boolean {
  const start = DOOR_CELLS.N;
  const seen = new Set<string>([`${start.c},${start.r}`]);
  const stack: { c: number; r: number }[] = [{ c: start.c, r: start.r }];
  while (stack.length) {
    const { c, r } = stack.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc,
        nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= ROOM_COLS || nr >= ROOM_ROWS) continue;
      const k = `${nc},${nr}`;
      if (seen.has(k) || !WALKABLE.has(rows[nr][nc])) continue;
      seen.add(k);
      stack.push({ c: nc, r: nr });
    }
  }
  return Object.values(DOOR_CELLS).every((d) => seen.has(`${d.c},${d.r}`));
}

describe('plantillas de sala', () => {
  it('tienen 13×7, puertas libres y todas conectadas (con volteos)', () => {
    const ids = new Set<string>();
    for (const t of [...ACTO1_ROOMS, ...ACTO2_ROOMS]) {
      for (const r of t.rows) for (const ch of r) expect(KNOWN.has(ch), `${t.id}: '${ch}'`).toBe(true);
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.rows.length).toBe(ROOM_ROWS);
      for (const r of t.rows) expect(r.length).toBe(ROOM_COLS);
      for (const fx of [false, true])
        for (const fy of [false, true]) {
          const rows = flipRows(t.rows, fx, fy);
          for (const d of Object.values(DOOR_CELLS)) expect(rows[d.r][d.c]).toBe('.');
          expect(reachableDoors(rows), t.id).toBe(true);
        }
    }
  });

  it('hay plantillas de todas las dificultades', () => {
    for (const d of [0, 1, 2, 3]) {
      expect(ACTO1_ROOMS.some((t) => t.diff === d)).toBe(true);
      expect(ACTO2_ROOMS.some((t) => t.diff === d)).toBe(true);
    }
  });
});

describe('createRun', () => {
  it('asigna plantilla a cada sala normal y es determinista', () => {
    const a = createRun('PRUEBA01');
    const b = createRun('PRUEBA01');
    for (const room of a.rooms.values()) {
      if (room.type === 'normal') expect(room.templateId).toBeTruthy();
    }
    expect([...a.rooms.values()].map((r) => r.templateId)).toEqual(
      [...b.rooms.values()].map((r) => r.templateId),
    );
    expect(a.golosinaMap).toEqual(b.golosinaMap);
    expect(a.boss).toBe(b.boss);
  });

  it('las puertas secretas empiezan ocultas y la del contrato cae en un lado libre', () => {
    for (let i = 0; i < 50; i++) {
      const run = createRun(`SEMILLA${i}`);
      for (const room of run.rooms.values()) {
        for (const d of room.doors) {
          const visible = doorVisible(run, room, d);
          if (room.type === 'secreta') expect(visible).toBe(false);
        }
      }
      const boss = bossRoom(run);
      expect(boss.doors).not.toContain(contractDoorDir(run));
    }
  });
});

describe('objetos', () => {
  it('todos tienen icono e identificador único', () => {
    const ids = new Set<string>();
    for (const it of ITEMS) {
      expect(ids.has(it.id)).toBe(false);
      ids.add(it.id);
      expect(ITEM_ICONS[`obj_${it.id}`], it.id).toBeTruthy();
      if (it.kind === 'activo') expect(it.active).toBeTruthy();
    }
    expect(ITEMS.filter((i) => !i.pools.includes('contrato')).length).toBe(38);
  });
});

describe('actos', () => {
  it('el Acto I no cambia y el Acto II usa sus plantillas y jefes', () => {
    for (let i = 0; i < 30; i++) {
      const run = createRun(`ACTO${i}`);
      expect(['forzudo', 'siameses']).toContain(run.boss);
      const before = { ...run.player, passives: ['narizRoja'] };
      run.player.passives = ['narizRoja'];
      run.player.redDamageTaken = true;
      run.player.hp = 1;
      advanceAct(run);
      expect(run.player.hp).toBe(3);
      expect(run.actHeal).toBe(2);
      expect(run.act).toBe(2);
      expect(['bestia', 'serpiente']).toContain(run.boss);
      expect(run.player.passives).toEqual(before.passives);
      expect(run.player.redDamageTaken).toBe(false);
      const ids = new Set(ACTO2_ROOMS.map((t) => t.id));
      for (const r of run.rooms.values()) if (r.type === 'normal') expect(ids.has(r.templateId!)).toBe(true);
      expect([...run.rooms.values()].filter((r) => r.type === 'normal').length).toBeGreaterThanOrEqual(9);
    }
  });
});
