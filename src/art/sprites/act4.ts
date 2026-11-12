// Arte del Acto IV: La Pista Central y El Maestro de Ceremonias.
import { ascii, SpriteDef } from '../bake';
import { Pix } from '../pix';

const icon = (paint: (p: Pix) => void): SpriteDef => ({ w: 14, h: 14, paint });

/** El Maestro: frac rojo, chistera y sonrisa demasiado ancha. */
const maestro = (p: Pix, f: number) => {
  const shadow = f >= 6;
  const hat = f < 4 || f >= 6;
  if (!shadow) {
    // Traje.
    p.rect(5, 14, 10, 10, 'r').rect(9, 14, 2, 10, 'W').px(10, 16, 'k').px(10, 19, 'k');
    p.rect(3, 22, 5, 2, 'r').rect(12, 22, 5, 2, 'r');
    p.rect(6, 24, 3, 4, 'K').rect(11, 24, 3, 4, 'K');
    // Brazos: batuta (podio) o bastón (duelo).
    if (f < 2) p.rect(2, 14 - f * 3, 3, 6, 'r').line(3, 13 - f * 3, 0, 8 - f * 3, 'W');
    else p.rect(15, 15, 3, 6, 'r').line(17, 21, 19, 27, 'k').px(19, 27, 'y');
    p.rect(2, 16, 3, 5, 'r');
    p.disc(3.5, 21, 1.5, 'W').disc(16.5, 21, 1.5, 'W');
  }
  // Cabeza: pálida, monóculo y sonrisa.
  const hx = 10,
    hy = 9;
  if (!shadow) p.disc(hx, hy, 4.5, 'w');
  p.px(hx - 2, hy - 1, shadow ? 'R' : 'k').px(hx + 2, hy - 1, shadow ? 'R' : 'k');
  if (!shadow) p.ring(hx + 2, hy - 1, 1.5, 'y');
  p.line(hx - 3, hy + 2, hx + 3, hy + 2, shadow ? 'W' : 'e').px(hx - 4, hy + 1, shadow ? 'W' : 'e').px(hx + 4, hy + 1, shadow ? 'W' : 'e');
  if (shadow) for (let x = hx - 3; x <= hx + 3; x += 2) p.px(x, hy + 3, 'W');
  if (hat) p.rect(hx - 4, hy - 11, 8, 7, 'K').rect(hx - 6, hy - 5, 12, 2, 'K').rect(hx - 4, hy - 7, 8, 1, 'R');
};

export const ACT4_SPRITES: Record<string, SpriteDef> = {
  // --- Criaturas ---
  trapecista: {
    w: 16,
    h: 16,
    frames: 3,
    paint: (p, f) => {
      // 0 colgada, 1 en el extremo, 2 caída.
      if (f === 2) {
        p.ellipse(8, 12, 6, 3, 'M').disc(4, 11, 2.5, 'w').px(3, 11, 'k');
        return;
      }
      p.line(5, 0, 7, 5, 'n').line(11, 0, 9, 5, 'n').rect(4, 0, 8, 1, 'N');
      p.disc(8, 7, 2.5, 'w').px(7, 7, 'k').px(9, 7, 'k').rect(6, 4, 4, 1, 'y');
      p.rect(6, 10, 4, 4, 'M').rect(6, 10, 4, 1, 'Y');
      p.line(6, 14, f ? 3 : 5, 16, 'w').line(9, 14, f ? 12 : 10, 16, 'w');
    },
  },
  hombre_bala: {
    w: 14,
    h: 18,
    frames: 4,
    paint: (p, f) => {
      // Casco plateado y mono rojo; 2 apuntando, 3 volando.
      p.disc(7, 4, 3.5, 'x').rect(4, 4, 6, 2, 'S').px(6, 5, 'y').px(8, 5, 'y');
      p.rect(4, 8, 6, 6, 'R').rect(4, 10, 6, 1, 'y');
      if (f === 3) {
        p.line(2, 9, 0, 5, 'R').line(11, 9, 13, 5, 'R');
        p.ellipse(7, 16, 3, 2, 'o').px(7, 17, 'Y');
        return;
      }
      p.rect(4 + (f % 2), 14, 2, 4, 'K').rect(8 - (f % 2), 14, 2, 4, 'K');
      p.rect(2, 9, 2, 4, 'R').rect(10, 9, 2, 4, 'R');
      if (f === 2) p.rect(1, 6, 12, 1, 'y');
    },
  },
  zancudo: {
    w: 14,
    h: 28,
    frames: 2,
    paint: (p, f) => {
      // Payaso enorme sobre zancos de rayas.
      p.disc(7, 4, 3.5, 'w').disc(7, 0.5, 2, 'B').px(6, 4, 'k').px(8, 4, 'k').disc(7, 5.5, 1, 'R');
      p.rect(3, 8, 8, 6, 'b').stripesV(3, 8, 8, 6, 'b', 'B', 2);
      const spread = f ? 2 : 0;
      p.stripesH(4 - spread, 14, 2, 14, 'y', 'R', 2).stripesH(8 + spread, 14, 2, 14, 'y', 'R', 2);
      p.rect(1, 9, 2, 4, 'b').rect(11, 9, 2, 4, 'b');
    },
  },
  augusto: {
    w: 16,
    h: 18,
    frames: 3,
    paint: (p, f) => {
      // Payaso malo: pelo naranja, nariz enorme, ropa remendada.
      p.disc(8, 5, 4, 'w').disc(3.5, 4, 2.5, 'o').disc(12.5, 4, 2.5, 'o');
      p.px(6, 4, 'k').px(10, 4, 'k').line(5, 3, 7, 4, 'k').line(11, 3, 9, 4, 'k');
      p.disc(8, 6, 1.8, 'R').line(5, 8, 11, 8, 'e');
      p.rect(4, 10, 8, 5, 'V').rect(5, 11, 3, 2, 'y').rect(9, 13, 2, 2, 'R');
      p.rect(4 + (f % 2), 15, 3, 3, 'n').rect(9 - (f % 2), 15, 3, 3, 'n');
      if (f === 2) p.ellipse(14, 5, 2, 1.5, 'W').px(14, 4, 'R');
    },
  },
  acomodador: {
    w: 14,
    h: 18,
    frames: 3,
    paint: (p, f) => {
      // Uniforme con botones y farol; 2 = señalando.
      p.rect(4, 0, 6, 2, 'R').rect(3, 2, 8, 1, 'k');
      p.disc(7, 5, 2.5, 'G').px(6, 5, 'k').px(8, 5, 'k');
      p.rect(4, 8, 6, 6, 'R').px(5, 9, 'y').px(5, 11, 'y').px(8, 9, 'y').px(8, 11, 'y');
      p.rect(4 + (f % 2), 14, 2, 4, 'k').rect(8 - (f % 2), 14, 2, 4, 'k');
      if (f === 2) p.line(10, 9, 14, 4, 'R');
      else p.rect(11, 9, 3, 4, 'y').rect(11, 9, 3, 1, 'n').px(12, 11, 'Y');
    },
  },
  barbuda: {
    w: 20,
    h: 22,
    frames: 3,
    paint: (p, f) => {
      // Vestido de lunares y una barba que es un arma.
      p.disc(10, 5, 4, 'o').rect(6, 1, 8, 2, 'n').px(8, 5, 'k').px(12, 5, 'k');
      const long = f === 2 ? 4 : 0;
      p.ellipse(10, 10 + long / 2, 5 + long / 2, 4 + long, 'n').ellipse(10, 9, 3, 2, 'N');
      p.ellipse(10, 16, 8, 5, 'm').px(6, 15, 'W').px(12, 17, 'W').px(9, 19, 'W').px(14, 14, 'W');
      p.rect(7 + (f % 2), 20, 2, 2, 'K').rect(11 - (f % 2), 20, 2, 2, 'K');
    },
  },
  guante: {
    w: 16,
    h: 14,
    frames: 2,
    paint: (p, f) => {
      // Guante blanco gigante; 1 = puño cerrado.
      if (f) {
        p.ellipse(8, 7, 7, 5, 'W').rect(3, 4, 10, 1, 'G').rect(3, 7, 10, 1, 'G');
      } else {
        p.ellipse(8, 9, 6, 4, 'W');
        for (let i = 0; i < 4; i++) p.rect(3 + i * 3, 1 + (i % 2), 2, 7, 'W');
        p.rect(12, 7, 3, 2, 'W');
      }
      p.rect(5, 12, 6, 2, 'G');
    },
  },
  maestro: { w: 20, h: 28, frames: 8, paint: (p, f) => maestro(p, f) },
  podio: {
    w: 30,
    h: 14,
    paint: (p) => {
      p.rect(2, 2, 26, 12, 'r').rect(0, 0, 30, 3, 'y').stripesV(4, 4, 22, 9, 'r', 'e', 3);
      p.disc(15, 8, 3, 'y').px(15, 8, 'R');
    },
  },
  clavo: ascii([['.x.', 'XWX', '.x.', '.x.', '.x.']], 'k'),
  pliego: ascii([['wwwww', 'wkkkw', 'wwwww', 'wkkRw', 'wwwww']], 'k'),
  chistera_volando: ascii([
    ['..KKKK..', '..KKKK..', '..RRRR..', 'KKKKKKKK'],
  ], 'k'),
  chistera_suelo: {
    w: 16,
    h: 14,
    paint: (p) => {
      p.rect(4, 0, 8, 9, 'K').rect(4, 6, 8, 2, 'R').rect(1, 9, 14, 3, 'K').px(5, 1, 'S');
      p.ellipse(8, 13, 7, 1, 'rgba(0,0,0,0.4)');
    },
  },
  salida: {
    w: 32,
    h: 18,
    outline: false,
    paint: (p) => {
      // Una puerta abierta a la noche: estrellas y aire.
      p.rect(4, 0, 24, 18, 'y').rect(6, 2, 20, 16, 'b');
      for (const [x, y] of [[9, 4], [15, 7], [21, 3], [12, 11], [23, 12]]) p.px(x, y, 'W');
      p.disc(20, 6, 2, 'Y');
    },
  },
  telon_lateral: {
    w: 64,
    h: 144,
    outline: false,
    paint: (p) => {
      p.rect(0, 0, 64, 144, 'r');
      for (let x = 0; x < 64; x += 8) p.rect(x + 5, 0, 2, 144, 'e');
      p.rect(60, 0, 4, 144, 'y');
    },
  },
  tomate: ascii([['.vv.', 'RRRR', 'RmRR', 'RRRR', '.RR.']], 'k'),
  charco_tomate: {
    w: 20,
    h: 14,
    outline: false,
    paint: (p) => {
      p.ellipse(10, 7, 9, 6, 'rgba(212,50,63,0.7)').ellipse(8, 6, 5, 3, 'rgba(242,163,181,0.6)');
      p.px(4, 3, 'V').px(15, 10, 'R').disc(17, 4, 1.4, 'rgba(212,50,63,0.7)');
    },
  },
  aura: {
    w: 40,
    h: 24,
    outline: false,
    paint: (p) => p.ellipse(20, 12, 19, 11, 'rgba(242,193,78,0.35)'),
  },
  onda_tiro: ascii([
    ['..ww..', '.w..w.', 'w....w', 'w....w', '.w..w.', '..ww..'],
  ], false),
  foco: {
    w: 10,
    h: 10,
    paint: (p) => {
      p.rect(2, 2, 6, 6, 'S').disc(5, 5, 2.5, 'Y').px(4, 4, 'W').rect(4, 8, 2, 2, 'g');
    },
  },
  // --- Baldosas ---
  aro: {
    w: 16,
    h: 18,
    frames: 2,
    paint: (p, f) => {
      p.ring(8, 8, 7, 'o').ring(8, 8, 6, 'y');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + f * 0.4;
        p.px(8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, i % 2 ? 'Y' : 'R');
      }
      p.rect(7, 15, 2, 3, 'n');
    },
  },
  canon_pista: {
    w: 16,
    h: 16,
    frames: 2,
    paint: (p, f) => {
      p.rect(2, 9, 12, 6, 'R').stripesV(2, 9, 12, 6, 'R', 'y', 3);
      p.disc(8, 7, 5, 'S').disc(8, 7, 3, 'k');
      if (f) p.disc(8, 7, 2, 'o').px(8, 7, 'Y');
      p.line(12, 3, 14, 0, 'n');
    },
  },
  // --- Iconos de objetos ---
  obj_tomatePodrido: icon((p) => {
    p.disc(6.5, 8, 5.5, 'R').disc(4.5, 6, 1.5, 'm').rect(5, 1, 3, 3, 'v').px(9, 9, 'e').px(4, 10, 'V').px(8, 11, 'e');
  }),
  obj_megafono: icon((p) => {
    p.rect(1, 5, 3, 4, 'R');
    for (let x = 4; x < 12; x++) p.rect(x, 6 - (x - 4) * 0.6, 1, 2 + (x - 4) * 1.2, x % 2 ? 'w' : 'W');
    p.px(13, 3, 'y').px(13, 10, 'y').px(12, 6, 'y');
  }),
  obj_redSeguridad: icon((p) => {
    for (let x = 1; x < 14; x += 3) p.line(x, 2, x + 2, 12, 'G');
    for (let y = 2; y < 13; y += 3) p.line(1, y, 13, y + 1, 'G');
    p.rect(0, 1, 14, 1, 'n').rect(0, 12, 14, 1, 'n');
  }),
  obj_laClaque: icon((p) => {
    p.disc(4, 6, 3, 'o').disc(10, 6, 3, 'o').rect(3, 8, 3, 5, 'o').rect(9, 8, 3, 5, 'o');
    p.px(1, 2, 'Y').px(13, 2, 'Y').px(7, 1, 'Y').px(7, 4, 'y');
  }),
  obj_ramoRosas: icon((p) => {
    p.line(6, 13, 4, 6, 'v').line(7, 13, 7, 5, 'v').line(8, 13, 10, 6, 'v');
    p.disc(4, 4, 2.5, 'R').disc(7, 3, 2.5, 'M').disc(10, 4, 2.5, 'R').px(7, 2, 'm');
    p.rect(5, 10, 4, 2, 'y');
  }),
  obj_mascaraComedia: icon((p) => {
    p.disc(6.5, 6.5, 6, 'y').disc(6.5, 6.5, 5, 'Y');
    p.px(4, 5, 'k').px(9, 5, 'k').line(3, 8, 6.5, 10, 'k').line(6.5, 10, 10, 8, 'k');
  }),
  obj_mascaraTragedia: icon((p) => {
    p.disc(6.5, 6.5, 6, 'b').disc(6.5, 6.5, 5, 'B');
    p.px(4, 5, 'k').px(9, 5, 'k').line(3, 10, 6.5, 8, 'k').line(6.5, 8, 10, 10, 'k').px(4, 7, 'W');
  }),
  obj_focoTeatro: icon((p) => {
    p.rect(1, 3, 6, 7, 'S').disc(4, 6.5, 2.5, 'Y');
    for (let x = 7; x < 14; x++) p.rect(x, 6.5 - (x - 7) * 0.5, 1, 1 + (x - 7), 'rgba(255,242,168,0.8)');
    p.rect(3, 10, 2, 3, 'g');
  }),
  obj_canonConfeti: icon((p) => {
    p.rect(1, 7, 8, 4, 'B').stripesV(1, 7, 8, 4, 'B', 'b', 2).rect(9, 6, 2, 6, 'y');
    p.px(12, 3, 'R').px(11, 1, 'y').px(13, 6, 'V').px(12, 9, 'm');
  }),
  obj_clausulaAdicional: icon((p) => {
    p.rect(2, 0, 10, 14, 'w').rect(3, 2, 8, 1, 'k').rect(3, 4, 6, 1, 'k').rect(3, 6, 8, 1, 'k');
    p.disc(9, 11, 2, 'R').px(5, 11, 'k');
  }),
  obj_plumaSangre: icon((p) => {
    p.line(2, 12, 11, 1, 'k');
    for (let i = 0; i < 5; i++) p.line(4 + i * 1.6, 10 - i * 2, 8 + i * 1.3, 9 - i * 2, 'w');
    p.disc(2, 12, 1.5, 'R');
  }),
  obj_aplausoEterno: icon((p) => {
    p.disc(6.5, 7, 6, 'e').disc(4, 7, 2.5, 'o').disc(9, 7, 2.5, 'o');
    p.ring(6.5, 7, 6, 'R').px(6, 1, 'Y');
  }),
};
