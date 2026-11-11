// Iconos de los objetos (14×14) y de los recogibles.
import { ascii, SpriteDef } from '../bake';
import { Pix } from '../pix';

const icon = (paint: (p: Pix) => void): SpriteDef => ({ w: 14, h: 14, paint });

const ballFn = (p: Pix, x: number, y: number, r: number, a: string, b: string) => {
  p.disc(x, y, r, a);
  p.rect(x - r + 1, y, r * 2 - 1, 1, b);
  p.px(x - 1, y - r + 1, 'W');
};

export const ITEM_ICONS: Record<string, SpriteDef> = {
  obj_narizRoja: icon((p) => p.disc(6.5, 6.5, 5.5, 'R').disc(6.5, 6.5, 4, 'R').disc(4.5, 4.5, 1.5, 'm').px(4, 4, 'W')),
  obj_guantesBlancos: icon((p) => {
    p.rect(2, 5, 6, 7, 'W').rect(1, 6, 1, 3, 'W').rect(3, 2, 1, 4, 'W').rect(5, 1, 1, 4, 'W').rect(7, 2, 1, 4, 'W');
    p.rect(2, 11, 6, 2, 'y').line(3, 7, 3, 9, 'G').line(5, 7, 5, 9, 'G');
    p.rect(8, 6, 5, 6, 'G').rect(9, 3, 1, 3, 'G').rect(11, 3, 1, 3, 'G');
  }),
  obj_zapatones: icon((p) => {
    p.ellipse(6, 10, 6, 3, 'R').rect(1, 5, 5, 5, 'R').rect(1, 5, 5, 1, 'm');
    p.px(9, 9, 'm').px(10, 9, 'm').rect(0, 12, 13, 1, 'k').rect(3, 7, 2, 1, 'W');
  }),
  obj_pajaritaGiratoria: icon((p) => {
    p.ellipse(3, 6.5, 3, 4, 'R').ellipse(10, 6.5, 3, 4, 'R').disc(6.5, 6.5, 2, 'y');
    p.px(2, 4, 'm').px(9, 4, 'm').px(6, 6, 'Y');
  }),
  obj_cuerdaFloja: icon((p) => {
    p.line(0, 10, 13, 6, 'N').line(0, 11, 13, 7, 'n');
    p.rect(1, 9, 1, 5, 'n').rect(12, 5, 1, 9, 'n');
    p.disc(6.5, 3, 2, 'w').rect(5, 5, 3, 3, 'P');
  }),
  obj_algodonAzucar: icon((p) => {
    p.rect(6, 7, 2, 7, 'w').disc(6.5, 5, 5, 'm').disc(4, 3, 2.5, 'M').disc(9, 4, 2, 'm').px(5, 2, 'W');
  }),
  obj_manzanaCaramelo: icon((p) => {
    p.rect(6, 0, 1, 5, 'N').disc(6.5, 8, 5, 'R').ellipse(6.5, 4.5, 5, 1.5, 'r');
    p.px(4, 6, 'W').px(5, 6, 'm').px(9, 9, 'V').px(10, 10, 'V');
  }),
  obj_barbaPostiza: icon((p) => {
    p.ellipse(6.5, 8, 6, 5, 'n').ellipse(6.5, 4.5, 4, 2, 'N').rect(3, 3, 8, 2, 'n');
    p.rect(4, 5, 6, 2, 'k').px(6, 9, 'N').px(8, 11, 'N');
  }),
  obj_tripleMalabar: icon((p) => {
    ballFn(p, 3, 9, 2.5, 'R', 'y');
    ballFn(p, 7, 4, 2.5, 'B', 'W');
    ballFn(p, 11, 9, 2.5, 'V', 'y');
  }),
  obj_pelotasGoma: icon((p) => {
    p.disc(6.5, 6.5, 5.5, 'M').ring(6.5, 6.5, 3, 'm').px(4, 3, 'W').px(5, 3, 'W');
  }),
  obj_cuchillosLanzador: icon((p) => {
    p.line(1, 12, 9, 4, 'X').line(2, 12, 10, 4, 'x').line(10, 4, 12, 2, 'n').line(11, 4, 13, 2, 'n');
    p.line(4, 13, 12, 5, 'x');
  }),
  obj_malabaresLlamas: icon((p) => {
    p.ellipse(6.5, 5.5, 4, 5, 'o').ellipse(6.5, 7, 2.5, 3.5, 'y').disc(6.5, 10, 3, 'R').px(5, 9, 'm');
  }),
  obj_palomitas: icon((p) => {
    p.stripesV(3, 6, 8, 8, 'R', 'W', 2);
    for (const [x, y] of [[4, 4], [7, 3], [10, 4], [5, 2], [9, 1], [6, 5], [3, 6]]) p.disc(x, y, 1.4, 'W');
    p.px(7, 3, 'Y').px(4, 4, 'Y');
  }),
  obj_bolaCanon: icon((p) => p.disc(6.5, 7, 6, 'S').disc(4.5, 5, 1.5, 'g').px(4, 4, 'G').rect(10, 0, 2, 3, 'y')),
  obj_helio: icon((p) => {
    p.rect(3, 4, 8, 10, 'B').rect(3, 4, 8, 2, 'b').rect(5, 1, 4, 3, 'x').rect(6, 0, 2, 1, 'X');
    p.rect(5, 8, 4, 3, 'W').px(6, 9, 'B');
  }),
  obj_espejoDeformante: icon((p) => {
    p.ellipse(6.5, 6.5, 5.5, 6.5, 'y').ellipse(6.5, 6.5, 4, 5, 'C').line(5, 3, 8, 9, 'W').px(4, 5, 'h');
  }),
  obj_imanFeria: icon((p) => {
    p.rect(1, 2, 4, 9, 'R').rect(9, 2, 4, 9, 'R').rect(1, 9, 12, 4, 'R').rect(5, 9, 4, 1, 'R');
    p.rect(1, 2, 4, 2, 'W').rect(9, 2, 4, 2, 'W').rect(5, 2, 4, 7, 'k');
  }),
  obj_entradaDorada: icon((p) => {
    p.rect(0, 3, 14, 8, 'y').rect(0, 3, 14, 1, 'Y').px(0, 6, 'k').px(13, 6, 'k');
    p.rect(3, 5, 1, 4, 'n').rect(5, 5, 6, 1, 'n').rect(5, 8, 6, 1, 'n').px(7, 6, 'R').px(8, 7, 'R');
  }),
  obj_bolaCristal: icon((p) => {
    p.disc(6.5, 5.5, 5, 'P').disc(6.5, 5.5, 4, 'h').ellipse(5, 4, 1.5, 1, 'W').px(8, 7, 'P');
    p.rect(2, 10, 10, 3, 'n').rect(3, 10, 8, 1, 'N');
  }),
  obj_zancos: icon((p) => {
    p.rect(3, 0, 2, 14, 'N').rect(9, 0, 2, 14, 'N').rect(1, 6, 5, 2, 'n').rect(8, 6, 5, 2, 'n');
    p.stripesH(3, 0, 2, 6, 'R', 'W', 2).stripesH(9, 0, 2, 6, 'R', 'W', 2);
  }),
  obj_serrin: icon((p) => {
    p.ellipse(6.5, 8, 5.5, 5, 't').rect(4, 1, 5, 3, 't').rect(3, 3, 7, 2, 'N');
    p.px(4, 7, 'N').px(8, 9, 'N').px(6, 11, 'N').px(9, 6, 'Y');
  }),
  obj_maquillajeCorrido: icon((p) => {
    p.disc(6.5, 6.5, 6, 'w').px(4, 5, 'k').px(9, 5, 'k');
    p.line(4, 6, 3, 12, 'b').line(9, 6, 10, 12, 'b').line(5, 9, 8, 9, 'R');
  }),
  obj_globoPerro: icon((p) => {
    p.ellipse(6, 7, 4, 2.5, 'm').disc(11, 5, 2.5, 'm').disc(2, 5, 1.5, 'm').rect(4, 9, 2, 3, 'm').rect(8, 9, 2, 3, 'm');
    p.px(12, 4, 'k').px(11, 3, 'W');
  }),
  obj_monoJuguete: icon((p) => {
    p.disc(6.5, 9, 4, 'N').disc(6.5, 4, 3.5, 'N').ellipse(6.5, 5, 2, 1.5, 'm').px(5, 3, 'k').px(8, 3, 'k');
    p.ellipse(2, 9, 1.5, 2.5, 'y').ellipse(11, 9, 1.5, 2.5, 'y');
  }),
  obj_pulgaFiel: icon((p) => {
    p.ellipse(7, 7, 5, 3.5, 'n').ellipse(6, 5.5, 2.5, 1.2, 'N').disc(2, 7, 2, 'n').px(1, 6, 'R');
    p.line(4, 10, 2, 13, 'k').line(10, 10, 12, 13, 'k').rect(7, 2, 3, 1, 'B');
  }),
  obj_tartaCrema: icon((p) => {
    p.ellipse(6.5, 9, 6.5, 3.5, 'N').ellipse(6.5, 7, 6, 3, 'W').disc(6.5, 4, 1.5, 'R').px(6, 3, 'm');
    p.px(2, 9, 'W').px(10, 10, 'W');
  }),
  obj_sombreroCopa: icon((p) => {
    p.rect(3, 1, 8, 9, 'k').rect(0, 10, 14, 2, 'k').rect(3, 7, 8, 2, 'R').px(4, 2, 's');
    p.px(10, 0, 'W').px(11, 0, 'W');
  }),
  obj_latigoDomador: icon((p) => {
    p.rect(1, 10, 2, 4, 'n').line(2, 10, 5, 4, 'N').line(5, 4, 10, 2, 'N').line(10, 2, 13, 5, 'N').px(13, 6, 'y');
  }),
  obj_canonHumano: icon((p) => {
    p.line(2, 11, 11, 2, 'R').line(3, 11, 12, 2, 'R').line(2, 10, 11, 1, 'R').line(3, 12, 12, 3, 'r');
    p.disc(3, 11, 2.5, 'y').disc(11.5, 2.5, 1.5, 'k');
  }),
  obj_bocina: icon((p) => {
    p.disc(3, 9, 3, 'R').px(2, 8, 'm').rect(5, 8, 3, 2, 'y').line(8, 9, 13, 4, 'y').line(8, 9, 13, 13, 'y');
    p.line(13, 4, 13, 13, 'y').line(9, 9, 13, 9, 'Y');
  }),
  obj_contratoFirmado: icon((p) => {
    p.rect(2, 1, 10, 12, 'w').rect(2, 1, 10, 1, 'N');
    for (let y = 3; y < 10; y += 2) p.rect(4, y, 6, 1, 'g');
    p.line(4, 11, 9, 10, 'R').disc(10, 11, 1.5, 'R');
  }),
  obj_monoculoMaestro: icon((p) => {
    p.ring(6, 6, 4, 'y').disc(6, 6, 3, 'h').px(5, 5, 'W').line(9, 9, 12, 13, 'y');
  }),
  obj_risaEnlatada: icon((p) => {
    p.rect(2, 2, 10, 11, 'x').rect(2, 2, 10, 1, 'X').rect(2, 12, 10, 1, 'g');
    p.rect(3, 5, 8, 5, 'y').px(5, 6, 'k').px(8, 6, 'k').line(5, 8, 8, 8, 'k');
  }),
  obj_calcetin: icon((p) => {
    p.rect(4, 0, 5, 9, 'G').rect(4, 0, 5, 2, 'R').ellipse(6, 10, 5, 3, 'G').px(2, 11, 'g');
    p.px(10, 3, 'V').px(11, 1, 'V').px(12, 4, 'V');
  }),
};

// --- Recogibles ---
const balloon = (p: Pix, a: string, b: string, half: boolean) => {
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 9; x++) {
      const dx = (x - 4) / 4.35,
        dy = (y - 4) / 4.85;
      if (dx * dx + dy * dy <= 1) p.px(x, y, half && x > 4 ? 'K' : a);
    }
  p.px(2, 2, 'W').px(2, 3, b).px(4, 9, b);
};

export const PICKUP_SPRITES: Record<string, SpriteDef> = {
  globo: {
    w: 9,
    h: 14,
    paint: (p) => {
      balloon(p, 'R', 'm', false);
      p.line(4, 10, 3, 13, 'w');
    },
  },
  medio_globo: {
    w: 9,
    h: 14,
    paint: (p) => {
      balloon(p, 'R', 'm', true);
      p.line(4, 10, 5, 13, 'w');
    },
  },
  globo_plata: {
    w: 9,
    h: 14,
    paint: (p) => {
      balloon(p, 'X', 'x', false);
      p.line(4, 10, 3, 13, 'w');
    },
  },
  boleto: ascii([['yyyyyyyyy', 'yRRyyyyRy', '.yyNNNyy.', 'yRyyyyRRy', 'yyyyyyyyy']]),
  taco_boletos: ascii([
    ['..yyyyyyyyy', '.yyyyyyyyyy', 'yyyyyyyyyRy', 'yRRyyyyRyy.', '.yyNNNyyy..', 'yRyyyyRRy..', 'yyyyyyyyy..'],
  ]),
  petardo: ascii([['..y.', '.y..', 'RRRR', 'RWRR', 'RRRR', 'RyyR', 'RRRR', 'rrrr']]),
  doble_petardo: ascii([
    ['..y...y.', '.y...y..', 'RRRRRRRR', 'RWRRRWRR', 'RRRRRRRR', 'RyyRRyyR', 'RRRRRRRR', 'rrrrrrrr'],
  ]),
  llave: ascii([['.yyy.....', 'yy.yyyyyy', 'yy.yy.y.y', '.yyy.....']]),
  cofre: {
    w: 14,
    h: 11,
    frames: 2,
    paint: (p, f) => {
      if (f === 0) {
        p.rect(0, 3, 14, 8, 'n').rect(0, 0, 14, 4, 'N').rect(0, 4, 14, 1, 'y').rect(6, 3, 2, 3, 'y');
      } else {
        p.rect(0, 3, 14, 8, 'n').rect(0, 0, 14, 2, 'K').rect(1, 3, 12, 2, 'k').rect(0, 4, 14, 1, 'y');
      }
    },
  },
  cofre_candado: {
    w: 14,
    h: 11,
    frames: 2,
    paint: (p, f) => {
      if (f === 0) {
        p.rect(0, 3, 14, 8, 's').rect(0, 0, 14, 4, 'x').rect(0, 4, 14, 1, 'X').rect(5, 3, 4, 4, 'y').px(6, 5, 'k');
      } else {
        p.rect(0, 3, 14, 8, 's').rect(0, 0, 14, 2, 'K').rect(1, 3, 12, 2, 'k').rect(0, 4, 14, 1, 'X');
      }
    },
  },
  // Golosina en blanco para tintarla con el color de cada tipo.
  golosina: ascii([['G......G', 'GG.WW.GG', 'GWWWWWWG', 'GG.WW.GG', 'G......G']], true),

  // HUD
  hud_globo: { w: 7, h: 8, paint: (p) => hudBalloon(p, 'R', 'full') },
  hud_globo_medio: { w: 7, h: 8, paint: (p) => hudBalloon(p, 'R', 'half') },
  hud_globo_vacio: { w: 7, h: 8, paint: (p) => hudBalloon(p, 'R', 'empty') },
  hud_plata: { w: 7, h: 8, paint: (p) => hudBalloon(p, 'X', 'full') },
  hud_plata_medio: { w: 7, h: 8, paint: (p) => hudBalloon(p, 'X', 'half') },
  hud_boleto: ascii([['yyyyyy', 'yRyyRy', 'yyNNyy', 'yyyyyy']]),
  hud_petardo: ascii([['.y.', 'RRR', 'RWR', 'RRR', 'RRR']]),
  hud_llave: ascii([['yy....', 'y.yyyy', 'yy.y.y']]),
};

function hudBalloon(p: Pix, c: string, mode: 'full' | 'half' | 'empty'): void {
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const dx = (x - 3) / 3.4,
        dy = (y - 3) / 3.6;
      if (dx * dx + dy * dy > 1) continue;
      const filled = mode === 'full' || (mode === 'half' && x <= 3);
      p.px(x, y, filled ? c : 'K');
    }
  if (mode !== 'empty') p.px(2, 1, 'W');
  p.px(3, 7, mode === 'empty' ? 'K' : c);
}
