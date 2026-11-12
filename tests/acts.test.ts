import { describe, expect, it } from 'vitest';
import { createRun, newRun, advanceAct, bossRoom } from '../src/core/run';
import { ACTS, actDef } from '../src/data/acts';
import { generateFloor } from '../src/core/floorgen';
import { Rng } from '../src/core/rng';
import { ITEMS } from '../src/data/items';
import { ItemPools } from '../src/core/itempool';

describe('cuatro actos', () => {
  it('se recorren del I al IV conservando al jugador', () => {
    const run = createRun('RECORRIDO');
    run.player.passives.push('narizRoja');
    for (let a = 2; a <= 4; a++) {
      advanceAct(run);
      expect(run.act).toBe(a);
      expect(run.actName).toBe(actDef(a).name);
      expect(actDef(a).bosses).toContain(run.boss);
      expect(bossRoom(run)).toBeTruthy();
      expect(run.player.passives).toContain('narizRoja');
    }
    expect(actDef(4).exit).toBe('final');
    expect(ACTS.filter((a) => a.exit === 'final').length).toBe(1);
  });

  it('al cambiar de acto se olvida la puerta de entrada', () => {
    const run = createRun('PUERTA');
    run.entry = 'E';
    advanceAct(run);
    expect(run.entry).toBeNull();
  });

  it('cada acto genera bien sus pisos en 1000 semillas', () => {
    for (const def of ACTS) {
      for (let i = 0; i < 1000; i++) {
        const f = generateFloor(new Rng(i * 7919 + def.n), {
          minNormal: def.minNormal, maxNormal: def.maxNormal,
          required: def.specials.required, extras: def.specials.extras,
          extraCount: def.specials.extraCount, superSecret: def.specials.superSecret,
        });
        const types = f.rooms.map((r) => r.type);
        for (const t of def.specials.required) expect(types).toContain(t);
        const secrets = f.rooms.filter((r) => r.type === 'secreta');
        expect(secrets.length).toBeGreaterThanOrEqual(1);
        expect(secrets.length).toBeLessThanOrEqual(2);
        // Extras: las de la bolsa, sin repetir (el camerino puede ser el segundo).
        const extras = types.filter((t) => def.specials.extras.some((e) => e.value === t) && !def.specials.required.includes(t));
        expect(new Set(extras).size).toBe(extras.length);
        const camerinos = types.filter((t) => t === 'camerino').length;
        expect(camerinos).toBeLessThanOrEqual(2);
        const total = extras.length + camerinos - 1;
        expect(total).toBeLessThanOrEqual(def.specials.extraCount[1]);
      }
    }
  });

  it('la curación entre actos premia no perder rojos', () => {
    // Tres globos (6 medios) sin perder rojos; dos (4) si se perdieron.
    const a = createRun('CURA');
    a.player.maxHp = 10;
    a.player.hp = 2;
    advanceAct(a);
    expect(a.player.hp).toBe(8);
    const b = createRun('CURA');
    b.player.maxHp = 10;
    b.player.hp = 2;
    b.player.redDamageTaken = true;
    advanceAct(b);
    expect(b.player.hp).toBe(6);
  });

  it('ninguna reserva se queda vacía en una partida completa', () => {
    // Peor caso razonable por acto: camerino, jefe, secreta, 2 del puesto, barraca, 2 de El Contrato.
    for (let seed = 0; seed < 200; seed++) {
      const rng = new Rng(seed);
      const pools = new ItemPools(ITEMS);
      for (let act = 1; act <= 4; act++) {
        for (const pool of ['camerino', 'jefe', 'secreta', 'puesto', 'puesto', 'barraca'] as const) expect(pools.draw(pool, rng)).not.toBeNull();
        if (actDef(act).contract) for (let k = 0; k < 2; k++) expect(pools.draw('contrato', rng)).not.toBeNull();
      }
    }
  });
});

describe('objetos sorteados al generar el acto', () => {
  const pre = (run: ReturnType<typeof newRun>) =>
    [...run.rooms.values(), run.contract]
      .flatMap((r) => Object.entries(r.data).filter(([k]) => k.startsWith('pre')).map(([k, v]) => `${r.type}:${k}:${v}`))
      .sort();

  it('la misma semilla da los mismos objetos aunque se juegue distinto', () => {
    const a = newRun('MISMOSOBJ');
    const b = newRun('MISMOSOBJ');
    expect(pre(a)).toEqual(pre(b));
    // En una de las dos partidas pasan cosas (cofres, ruleta...) antes de cambiar de acto.
    b.pools.draw('barraca', b.streams.get('objetos'));
    b.pools.draw('camerino', b.streams.get('objetos'));
    for (let k = 0; k < 3; k++) {
      advanceAct(a);
      advanceAct(b);
      expect(pre(a)).toEqual(pre(b));
    }
  });

  it('cada sala especial tiene sus objetos', () => {
    const run = newRun('SALAS');
    const by = (t: string) => [...run.rooms.values()].find((r) => r.type === t)!;
    expect(typeof by('camerino').data.pre0).toBe('string');
    expect(typeof by('puesto').data.pre1).toBe('string');
    expect(typeof by('jefe').data.pre0).toBe('string');
    expect(typeof run.contract.data.pre0).toBe('string');
    // En el Acto IV no hay Contrato.
    for (let i = 0; i < 3; i++) advanceAct(run);
    expect(run.contract.data.pre0).toBeUndefined();
  });
});

describe('reservas con el sorteo previo', () => {
  it('ningún acto se queda sin objeto de jefe, camerino, puesto ni Contrato', () => {
    for (let i = 0; i < 300; i++) {
      const run = newRun(`RESERVA${i}`);
      for (const def of ACTS) {
        const it = run.preItems![def.n];
        expect(it.jefe.length, `jefe acto ${def.n}`).toBe(1);
        expect(it.camerino.length).toBe(1);
        expect(it.puesto.length).toBe(2);
        if (def.contract) expect(it.contrato.length).toBe(2);
      }
      // Y aún queda margen para cofres, ruletas y dianas.
      expect(run.pools.remaining('camerino')).toBeGreaterThan(10);
    }
  });
});
