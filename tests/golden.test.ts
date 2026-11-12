// Semillas doradas: fijan los mapas de los actos I y II para que ningún
// cambio del motor los altere sin querer. Si este test falla, una semilla
// antigua ya no da la misma partida.
import { describe, expect, it } from 'vitest';
import { createRun, advanceAct, RunState } from '../src/core/run';
import { ACTO1_ROOMS } from '../src/data/rooms/acto1';
import { ACTO2_ROOMS } from '../src/data/rooms/acto2';
import { hashString } from '../src/core/rng';

const SEEDS = [
  'CARPA000', 'K7QM2ZPA', 'AAAAAAAA', 'ZZZZZZZZ', 'PAYASO22', 'BESTIA99', 'JAULAS23', 'MAESTRO8',
  'POMPON44', 'TRAPECIO', 'GLOBO777', 'H3L4D0XX', 'SERPIEN5', 'FORZUDO2', 'SIAMESE3', 'NARIZROJ',
  'CONFETI9', 'BOLETO88', 'CHISTERA', 'TELON555', 'RULETA42', 'DIANA234', 'PETARDO7', 'GOLOSINA', 'QWERTY23',
];

function snap(run: RunState) {
  return {
    act: run.act,
    boss: run.boss,
    start: run.layout.start,
    rooms: [...run.rooms.values()]
      .map((r) => [r.x, r.y, r.type, r.dist, r.templateId ?? '', r.flipX, r.flipY, r.cleared].join(':'))
      .sort(),
  };
}

describe('semillas doradas', () => {
  it('las plantillas de los actos I y II no cambian', () => {
    expect(hashString(JSON.stringify(ACTO1_ROOMS))).toMatchSnapshot();
    expect(hashString(JSON.stringify(ACTO2_ROOMS))).toMatchSnapshot();
  });

  for (const seed of SEEDS) {
    it(`semilla ${seed}`, () => {
      const run = createRun(seed);
      const a1 = snap(run);
      const golosinas = run.golosinaMap;
      advanceAct(run);
      expect({ a1, a2: snap(run), golosinas }).toMatchSnapshot();
    });
  }
});
