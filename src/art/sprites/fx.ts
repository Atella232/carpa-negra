// Disparos, sombras, salpicaduras, explosiones y otras partículas.
import { ascii, SpriteDef } from '../bake';

export const FX_SPRITES: Record<string, SpriteDef> = {
  // Pelotas del payaso: turquesa y blanco, para no confundirse con las balas rojas.
  pelota: ascii([
    ['..cc..', '.cCCW.', 'cCWWCC', 'cCCCCC', '.cCCc.', '..cc..'],
  ]),
  pelota_fuego: ascii([
    ['..oy..', '.oyYo.', 'oyWYyo', 'oyYYyo', '.oyyo.', '..oo..'],
  ]),
  cuchillo: ascii([['XXXXXXgnn.', 'xxxxxxxnnn', '.......nn.']]),
  // Balas enemigas: más grandes que su cuerpo de choque, con núcleo claro que late.
  bala: ascii([
    ['.rRr.', 'rRmRr', 'RmWmR', 'rRmRr', '.rRr.'],
    ['.rrr.', 'rRRRr', 'RRmRR', 'rRRRr', '.rrr.'],
  ], 'k'),
  bala_grande: ascii([
    ['..rrr..', '.rRRRr.', 'rRmmRRr', 'rRmRRRr', 'rRRRRRr', '.rRRRr.', '..rrr..'],
  ]),
  cuchillo_enemigo: ascii([['XXXXgn', 'xxxxnn']]),
  pesa: {
    w: 14,
    h: 7,
    paint: (p) => {
      p.rect(0, 0, 4, 7, 'S').rect(10, 0, 4, 7, 'S').rect(4, 2, 6, 3, 'g');
      p.rect(1, 1, 1, 5, 'g').rect(11, 1, 1, 5, 'g');
    },
  },
  sombra: {
    w: 12,
    h: 4,
    outline: false,
    paint: (p) => p.ellipse(5.5, 1.5, 5.5, 1.6, 'rgba(0,0,0,0.38)'),
  },
  sombra_grande: {
    w: 28,
    h: 8,
    outline: false,
    paint: (p) => p.ellipse(13.5, 3.5, 13.5, 3.5, 'rgba(0,0,0,0.38)'),
  },
  salpicadura: {
    w: 12,
    h: 12,
    frames: 4,
    outline: false,
    paint: (p, f) => {
      const r = 2 + f * 1.4;
      const c = f < 2 ? 'Y' : f < 3 ? 'y' : 'o';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + f * 0.3;
        p.px(5.5 + Math.cos(a) * r, 5.5 + Math.sin(a) * r, c);
      }
      if (f < 2) p.disc(5.5, 5.5, 2 - f, 'W');
    },
  },
  // Impacto de las pelotas turquesa.
  salpicadura_azul: {
    w: 12,
    h: 12,
    frames: 4,
    outline: false,
    paint: (p, f) => {
      const r = 2 + f * 1.4;
      const c = f < 2 ? 'W' : f < 3 ? 'C' : 'c';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + f * 0.3;
        p.px(5.5 + Math.cos(a) * r, 5.5 + Math.sin(a) * r, c);
      }
      if (f < 2) p.disc(5.5, 5.5, 2 - f, 'W');
    },
  },
  // Viñeta roja al recibir daño (se estira a toda la sala).
  vineta: {
    w: 60,
    h: 36,
    outline: false,
    paint: (p) => {
      for (let y = 0; y < 36; y++)
        for (let x = 0; x < 60; x++) {
          const dx = Math.abs(x - 29.5) / 30, dy = Math.abs(y - 17.5) / 18;
          const d = Math.max(dx, dy);
          if (d > 0.72) p.px(x, y, `rgba(212,50,63,${Math.min(0.85, (d - 0.72) * 3).toFixed(2)})`);
        }
    },
  },
  // Humo de aparición y de teletransporte.
  humo: {
    w: 14,
    h: 14,
    frames: 4,
    outline: false,
    paint: (p, f) => {
      const r = 2.5 + f * 1.5;
      const a = ['rgba(194,188,203,0.9)', 'rgba(194,188,203,0.7)', 'rgba(138,131,148,0.5)', 'rgba(138,131,148,0.25)'][f];
      for (let i = 0; i < 5; i++) {
        const an = (i / 5) * Math.PI * 2 + f;
        p.disc(6.5 + Math.cos(an) * r * 0.6, 6.5 + Math.sin(an) * r * 0.6, r * 0.6, a);
      }
    },
  },
  polvo: ascii([['.g.', 'gGg', '.g.']], false),
  // Forma de cada golosina (además del color): rosa, verde, azul, amarilla, morada, naranja, blanca.
  formas_golosina: ascii([
    ['.k.', 'kkk', '.k.'],
    ['kkk', 'k.k', 'kkk'],
    ['.k.', 'k.k', 'kkk'],
    ['k.k', '.k.', 'k.k'],
    ['kkk', '...', 'kkk'],
    ['k..', 'kk.', 'kkk'],
    ['.k.', '.k.', '.k.'],
  ], false),
  // Insignias de campeón: + resistente, » veloz, ✶ estalla, $ boletos.
  insignias: ascii([
    ['..R..', '..R..', 'RRRRR', '..R..', '..R..'],
    ['y..y.', '.y..y', '..y..', '.y..y', 'y..y.'],
    ['B.B.B', '.BBB.', 'BBBBB', '.BBB.', 'B.B.B'],
    ['.yyy.', 'y.y..', '.yyy.', '..y.y', '.yyy.'],
  ], 'k'),
  chispa: ascii([['W']], false),
  salpicadura_roja: {
    w: 12,
    h: 12,
    frames: 4,
    outline: false,
    paint: (p, f) => {
      const r = 2 + f * 1.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + f * 0.3;
        p.px(5.5 + Math.cos(a) * r, 5.5 + Math.sin(a) * r, f < 2 ? 'R' : 'r');
      }
      if (f < 2) p.disc(5.5, 5.5, 2 - f, 'm');
    },
  },
  explosion: {
    w: 48,
    h: 48,
    frames: 6,
    outline: false,
    paint: (p, f) => {
      const c = 23.5;
      const r = 6 + f * 3.6;
      if (f < 4) p.disc(c, c, r, f < 1 ? 'W' : f < 2 ? 'Y' : f < 3 ? 'y' : 'o');
      if (f >= 1) p.disc(c, c, r * 0.65, f < 3 ? 'W' : f < 4 ? 'y' : 'S');
      if (f >= 3) {
        p.ring(c, c, r, 'S');
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          p.disc(c + Math.cos(a) * r * 0.8, c + Math.sin(a) * r * 0.8, 2, f < 5 ? 'g' : 's');
        }
      }
    },
  },
  confeti: {
    w: 3,
    h: 2,
    frames: 6,
    outline: false,
    paint: (p, f) => p.rect(0, 0, 3, 2, ['R', 'y', 'B', 'V', 'm', 'W'][f]),
  },
  mancha: {
    w: 16,
    h: 10,
    frames: 3,
    outline: false,
    paint: (p, f) => {
      const pal = ['rgba(90,18,32,0.75)', 'rgba(110,22,40,0.7)', 'rgba(60,12,22,0.8)'][f];
      p.ellipse(7.5, 4.5, 5 + f, 3, pal);
      p.disc(2 + f * 3, 2, 1.2, pal);
      p.disc(13 - f, 8, 1.4, pal);
    },
  },
  fuego_suelo: {
    w: 14,
    h: 12,
    frames: 3,
    paint: (p, f) => {
      const o = [0, 1, -1][f];
      p.ellipse(6.5, 9.5, 6, 2, 'r');
      p.ellipse(6.5 + o, 6.5, 4, 5, 'o');
      p.ellipse(6.5 - o, 7.5, 2.5, 3.5, 'y');
      p.ellipse(6.5, 8.5, 1.2, 1.8, 'Y');
      p.px(3 - o, 2 + f, 'o').px(10 + o, 3 - f + 1, 'y');
    },
  },
  onda: {
    w: 64,
    h: 64,
    frames: 4,
    outline: false,
    paint: (p, f) => {
      const r = 8 + f * 7;
      p.ring(31.5, 31.5, r, f < 2 ? 'w' : 'g');
      p.ring(31.5, 31.5, r - 1.5, f < 2 ? 'g' : 's');
    },
  },
  rastro_serrin: {
    w: 8,
    h: 6,
    outline: false,
    paint: (p) => {
      p.ellipse(3.5, 2.5, 3.5, 2.5, 'rgba(214,166,107,0.65)');
      p.px(2, 2, 'N').px(5, 3, 'N').px(4, 1, 'Y');
    },
  },
  tarta_volando: {
    w: 12,
    h: 8,
    paint: (p) => {
      p.ellipse(5.5, 4.5, 5.5, 3, 'N').ellipse(5.5, 3, 5, 2.2, 'W').px(5, 1, 'R').px(6, 1, 'R');
    },
  },
  crema: {
    w: 40,
    h: 28,
    frames: 3,
    outline: false,
    paint: (p, f) => {
      const a = ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.45)'][f];
      p.ellipse(19.5, 13.5, 18 - f * 2, 12 - f * 2, a);
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2;
        p.disc(19.5 + Math.cos(an) * 17, 13.5 + Math.sin(an) * 11, 2.5, a);
      }
    },
  },
  paloma: ascii([
    ['..WW....', '.WWWWW..', 'WWkWWWWw', '..WWWWW.', '...ww...'],
    ['W......W', 'WW.WW.WW', '.WWkWWW.', '..WWWW..', '...ww...'],
  ]),
  nota: ascii([['..kk', '..kk', '..k.', '..k.', 'kkk.', 'kkk.']], 'W'),
  estrella: ascii([['..y..', '.yYy.', 'yYWYy', '.yYy.', '..y..']], false),
  calavera_icono: ascii([['.www.', 'wkwkw', 'wwwww', '.w.w.']]),
};
