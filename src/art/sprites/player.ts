// Pompón, el payaso protagonista. Cabeza y cuerpo van por separado: la cabeza
// mira hacia donde dispara y el cuerpo hacia donde camina.
import { ascii, SpriteDef } from '../bake';

const HEAD_DOWN = [
  '...o......o...',
  '..ooo....ooo..',
  '.oooo.oo.oooo.',
  'ooooowwwwooooo',
  '.oowwwwwwwwoo.',
  '..wwwwwwwwww..',
  '..wkkwwwwkkw..',
  '..wkWwwwwkWw..',
  '.wwwwwRRwwwww.',
  '.wMwwRRRRwwMw.',
  '..wwwwRRwwww..',
  '..wRwwwwwwRw..',
  '...wRRRRRRw...',
  '....wwwwww....',
];

const HEAD_UP = [
  '...o......o...',
  '..ooo....ooo..',
  '.oooo.oo.oooo.',
  'oooooooooooooo',
  '.oooooooooooo.',
  '..oooooooooo..',
  '..oowwwwwwoo..',
  '..owwwwwwwwo..',
  '.wwwwwwwwwwww.',
  '.wwwwwwwwwwww.',
  '..wwwwwwwwww..',
  '..wwwwwwwwww..',
  '...wwwwwwww...',
  '....wwwwww....',
];

const HEAD_SIDE = [
  '....o.....o...',
  '...ooo...ooo..',
  '..oooo.o.oooo.',
  '.ooooowwwooooo',
  '..oowwwwwwwoo.',
  '..owwwwwwwww..',
  '..wwwwwwwkkw..',
  '..wwwwwwwkWw..',
  '.wwwwwwwwwwRR.',
  '.wwwwwwwMwRRRR',
  '..wwwwwwwwwRR.',
  '..wwwwwwwwRww.',
  '...wwwwwRRRw..',
  '....wwwwwww...',
];

/** Versión con los ojos apretados (al disparar). */
function squint(rows: string[]): string[] {
  return rows.map((r, i) => (i === 6 ? r.replace(/k/g, 'w') : i === 7 ? r.replace(/W/g, 'k') : r));
}

const BODY_DOWN = [
  [
    '...yyyyyy...',
    '..yWyWyWyWy.',
    '..ppPyyPpp..',
    '.wppPyyPppw.',
    '.wpRpyypRpw.',
    '..ppPyyPpp..',
    '..pp....pp..',
    '.RRR....RRR.',
  ],
  [
    '...yyyyyy...',
    '..yWyWyWyWy.',
    '..ppPyyPpp..',
    '.wppPyyPppw.',
    '.wpRpyypRpw.',
    '..ppPyyPpp..',
    '..pp...pp...',
    '.RRR...RRR..',
  ],
  [
    '...yyyyyy...',
    '..yWyWyWyWy.',
    '..ppPyyPpp..',
    '.wppPyyPppw.',
    '.wpRpyypRpw.',
    '..ppPyyPpp..',
    '...pp...pp..',
    '..RRR...RRR.',
  ],
];

const BODY_SIDE = [
  [
    '...yyyyyy...',
    '...yWyWyWy..',
    '...pPyyPp...',
    '...pPyyPpw..',
    '...pRyyRp...',
    '...pPyyPp...',
    '....pp.pp...',
    '...RRRRRRR..',
  ],
  [
    '...yyyyyy...',
    '...yWyWyWy..',
    '...pPyyPp...',
    '..wpPyyPp...',
    '...pRyyRp...',
    '...pPyyPp...',
    '...pp...pp..',
    '..RRR...RRRR',
  ],
  [
    '...yyyyyy...',
    '...yWyWyWy..',
    '...pPyyPp...',
    '...pPyyPpw..',
    '...pRyyRp...',
    '...pPyyPp...',
    '.....ppp....',
    '....RRRRRR..',
  ],
];

export const PLAYER_SPRITES: Record<string, SpriteDef> = {
  // Fotogramas: 0 abajo, 1 abajo disparando, 2 arriba, 3 arriba disparando,
  // 4 lado (derecha), 5 lado disparando.
  pompon_cabeza: ascii([
    HEAD_DOWN,
    squint(HEAD_DOWN),
    HEAD_UP,
    HEAD_UP,
    HEAD_SIDE,
    squint(HEAD_SIDE),
  ]),
  // 0-2 frente (quieto, paso A, paso B), 3-5 lado.
  pompon_cuerpo: ascii([...BODY_DOWN, ...BODY_SIDE]),

  // Disfraces que se superponen a la cabeza (misma rejilla de 14×14).
  disfraz_nariz: ascii([
    [
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '......RR......',
      '.....RRRR.....',
      '....RRmRRR....',
      '.....RRRR.....',
      '......RR......',
    ],
  ], false),
  disfraz_barba: ascii([
    [
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '.n..........n.',
      '.nn.nnnnnn.nn.',
      '..nnnnNnnnnn..',
      '...nnnnnnnn...',
      '....nnnnnn....',
      '.....nnnn.....',
    ],
  ], false),
  disfraz_llamas: ascii([
    [
      '..y.....o..y..',
      '.yoy...yoy.oy.',
      '.oRo..yoRo.Ro.',
    ],
    [
      '...y..o....y..',
      '..yoy.oy..yoy.',
      '..oRo.Ro..oRo.',
    ],
  ], false),
  disfraz_monoculo: ascii([
    [
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '........yyyy..',
      '.......y....y.',
      '.......y....y.',
      '........yyyy..',
      '...........y..',
      '...........y..',
    ],
  ], false),
  disfraz_pajarita: ascii([['.R....R.', 'RRR..RRR', 'RRRyyRRR', 'RRR..RRR', '.R....R.']]),
  disfraz_zancos: ascii([['n....n', 'n....n', 'N....N', 'n....n', 'n....n', 'N....N', 'n....n']]),
};
