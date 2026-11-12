import { describe, expect, it } from 'vitest';
import { createRun, advanceAct } from '../src/core/run';
import { serializeRun, deserializeRun } from '../src/core/runSave';
import { defaultSave, migrate } from '../src/core/save';
import { recordEvent, lockedItems, ITEM_UNLOCKS, CARTELES } from '../src/core/meta';
import { dailyKey, dailySeed, dailyScore } from '../src/core/daily';
import { ITEMS } from '../src/data/items';
import { setBonuses } from '../src/data/sets';
import { CHARACTERS } from '../src/data/characters';

describe('guardar y continuar', () => {
  it('ida y vuelta conserva la partida y su azar', () => {
    const run = createRun('GUARDADO', { character: 'bruno' });
    advanceAct(run);
    run.player.passives.push('tripleMalabar');
    run.streams.get('botin').next();
    const copy = deserializeRun(serializeRun(run))!;
    expect(copy).not.toBeNull();
    expect(copy.act).toBe(2);
    expect(copy.player).toEqual(run.player);
    expect([...copy.rooms.keys()].sort()).toEqual([...run.rooms.keys()].sort());
    // El azar sigue igual: las siguientes tiradas coinciden.
    for (const s of ['botin', 'objetos', 'combate'] as const) {
      expect(copy.streams.get(s).next()).toBe(run.streams.get(s).next());
    }
    expect(copy.pools.draw('camerino', copy.streams.get('objetos'))).toBe(run.pools.draw('camerino', run.streams.get('objetos')));
  });

  it('descarta guardados con objetos desconocidos', () => {
    const run = createRun('MALO');
    const json = serializeRun(run).replace('"passives":[]', '"passives":["objetoQueNoExiste"]');
    expect(deserializeRun(json)).toBeNull();
  });

  it('migra perfiles antiguos sin perder nada', () => {
    const old = { album: ['narizRoja'], settings: { sfx: 0.2, music: 0, muted: true }, runs: 7, wins: 1 };
    const s = migrate(old);
    expect(s.album).toEqual(['narizRoja']);
    expect(s.settings.sfx).toBe(0.2);
    expect(s.settings.shake).toBe(1); // ajuste nuevo con su valor por defecto
    expect(s.runs).toBe(7);
    expect(s.carteles).toEqual([]);
  });
});

describe('carteles', () => {
  it('desbloquean objetos y no se repiten', () => {
    const s = defaultSave();
    expect(lockedItems(s.carteles).has('megafono')).toBe(true);
    const got = recordEvent(s, { k: 'jefe', boss: 'bestia', clean: false });
    expect(got.map((c) => c.id)).toEqual(['jefe_bestia']);
    expect(lockedItems(s.carteles).has('megafono')).toBe(false);
    expect(recordEvent(s, { k: 'jefe', boss: 'bestia', clean: false })).toEqual([]);
  });

  it('los dos finales dan su cartel', () => {
    const s = defaultSave();
    recordEvent(s, { k: 'final', ending: 'libertad' });
    const got = recordEvent(s, { k: 'final', ending: 'maestro' });
    expect(got.map((c) => c.id)).toContain('dos_finales');
  });

  it('todo desbloqueo apunta a un cartel y a un objeto que existen', () => {
    for (const [id, c] of Object.entries(ITEM_UNLOCKS)) {
      expect(ITEMS.some((i) => i.id === id), id).toBe(true);
      expect(CARTELES.some((k) => k.id === c), c).toBe(true);
    }
    for (const ch of CHARACTERS) if (ch.unlock) expect(CARTELES.some((k) => k.id === ch.unlock), ch.id).toBe(true);
  });

  it('las partidas con objetos bloqueados no los sacan', () => {
    const run = createRun('BLOQUEO', { locked: ['megafono'] });
    expect(run.pools.has('megafono')).toBe(false);
  });
});

describe('función del día y trajes', () => {
  it('la semilla del día es la misma para todos y cambia cada día', () => {
    expect(dailySeed('2026-11-12')).toBe(dailySeed('2026-11-12'));
    expect(dailySeed('2026-11-12')).not.toBe(dailySeed('2026-11-13'));
    expect(dailyKey(new Date(Date.UTC(2026, 10, 12, 23, 59)))).toBe('2026-11-12');
    expect(dailyScore({ act: 4, kills: 100, rooms: 40, time: 1800, victory: true })).toBeGreaterThan(
      dailyScore({ act: 2, kills: 100, rooms: 40, time: 600, victory: false }),
    );
  });

  it('los trajes se completan con sus piezas', () => {
    expect(setBonuses(['tripleMalabar', 'pelotasGoma']).length).toBe(0);
    expect(setBonuses(['tripleMalabar', 'pelotasGoma', 'bolaCanon']).map((s) => s.id)).toEqual(['malabarista']);
    for (const s of setBonuses([])) expect(s).toBeFalsy();
  });
});
