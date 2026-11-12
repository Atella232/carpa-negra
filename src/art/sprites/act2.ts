// Arte del Acto II: Las Jaulas.
import { ascii, SpriteDef } from '../bake';
import { Pix } from '../pix';

const icon = (paint: (p: Pix) => void): SpriteDef => ({ w: 14, h: 14, paint });

const lion = (p: Pix, f: number) => {
  // 0-1 andar, 2 agazapado, 3 saltando
  const crouch = f === 2 ? 2 : 0;
  const legs = f === 3 ? 'stretch' : f === 1 ? 'b' : 'a';
  p.ellipse(9, 9 + crouch, 6, 3.5, 'N'); // cuerpo
  p.disc(4, 6 + crouch, 4, 'n'); // melena raída
  p.px(1, 4 + crouch, 'K').px(6, 2 + crouch, 'K').px(2, 9 + crouch, 'K');
  p.disc(3.5, 6.5 + crouch, 2.3, 'N');
  p.px(2, 6 + crouch, 'R').px(4, 6 + crouch, 'R'); // ojos rojos
  p.rect(2, 8 + crouch, 3, 1, 'w'); // dientes
  p.line(15, 8 + crouch, 17, 5 + crouch, 'N').px(17, 4 + crouch, 'n'); // cola
  p.px(9, 8 + crouch, 'e').px(12, 10 + crouch, 'e'); // calvas
  if (legs === 'a') p.rect(5, 12, 2, 3, 'N').rect(12, 12, 2, 3, 'N');
  else if (legs === 'b') p.rect(6, 12, 2, 3, 'N').rect(11, 12, 2, 3, 'N');
  else p.line(4, 12, 1, 14, 'N').line(14, 11, 17, 13, 'N');
};

export const ACT2_SPRITES: Record<string, SpriteDef> = {
  leon: { w: 18, h: 15, frames: 4, paint: (p, f) => lion(p, f) },
  cobra: {
    w: 14,
    h: 20,
    frames: 3,
    paint: (p, f) => {
      // Cesto de mimbre; 0 escondida, 1 asomando, 2 fuera
      p.rect(2, 13, 10, 7, 'N');
      for (let y = 14; y < 20; y += 2) p.rect(2, y, 10, 1, 'n');
      p.rect(1, 12, 12, 2, 'n');
      if (f === 0) {
        p.rect(3, 11, 8, 1, 'N');
        return;
      }
      const top = f === 1 ? 8 : 1;
      p.rect(6, top + 3, 3, 12 - top - 3 + 1, 'V');
      p.ellipse(7.5, top + 2, 4, 2.5, 'v').ellipse(7.5, top + 2, 2, 1.5, 'V');
      p.px(5, top + 1, 'y').px(10, top + 1, 'y');
      if (f === 2) p.px(7, top + 5, 'R').px(8, top + 6, 'R');
      p.px(7, top + 7, 'l').px(7, top + 9, 'l');
    },
  },
  oso: {
    w: 18,
    h: 18,
    frames: 4,
    paint: (p, f) => {
      // 0-1 andar, 2-3 girando
      const spin = f >= 2;
      p.ellipse(9, 11, 6.5, 6, 'n');
      p.ellipse(9, 12, 4, 4, 'N');
      p.disc(9, 4.5, 4, 'n').disc(5.5, 1.5, 1.5, 'n').disc(12.5, 1.5, 1.5, 'n');
      p.ellipse(9, 5.5, 2, 1.5, 'N').px(9, 5, 'k');
      p.px(7, 3, 'k').px(11, 3, 'k');
      p.rect(5, 0, 8, 1, 'P').rect(7, -1, 4, 1, 'P'); // sombrerito
      p.rect(4, 8, 10, 2, 'R'); // tutú
      p.stripesV(3, 9, 12, 2, 'm', 'R', 2);
      if (spin) {
        p.line(1, f === 2 ? 6 : 12, 4, 9, 'n').line(17, f === 2 ? 12 : 6, 14, 9, 'n');
      } else {
        p.rect(2, 9, 2, 4, 'n').rect(14, 9, 2, 4, 'n');
      }
      p.rect(5 + (f === 1 ? 1 : 0), 16, 3, 2, 'n').rect(10 - (f === 1 ? 1 : 0), 16, 3, 2, 'n');
    },
  },
  loro: {
    w: 16,
    h: 12,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(8, 6, 4, 3, 'R');
      p.disc(12, 4, 2.5, 'R').px(13, 3, 'W').px(13, 3, 'k');
      p.rect(14, 4, 2, 2, 'y').px(15, 6, 'y'); // pico
      p.line(4, 7, 0, 9, 'B').line(4, 6, 0, 7, 'y');
      if (f === 0) p.ellipse(7, 2, 4, 2, 'B').px(5, 1, 'V');
      else p.ellipse(7, 9, 4, 2, 'B').px(5, 10, 'V');
      p.px(9, 6, 'e').px(7, 7, 'K'); // plumas arrancadas
    },
  },
  domador: {
    w: 16,
    h: 20,
    frames: 3,
    paint: (p, f) => {
      // Uniforme rojo con galones; piel verdosa de no-muerto
      p.rect(4, 0, 8, 3, 'k').rect(3, 3, 10, 1, 'k').rect(4, 2, 8, 1, 'R');
      p.disc(8, 6, 3, 'l').px(6, 6, 'k').px(10, 6, 'k').rect(6, 8, 4, 1, 'e');
      p.rect(4, 10, 8, 6, 'R').rect(7, 10, 2, 6, 'y').rect(4, 10, 8, 1, 'y');
      p.rect(5, 16, 2, 4, 'k').rect(9, 16, 2, 4, 'k');
      p.rect(2, 11, 2, 4, 'R');
      if (f === 2) {
        p.rect(12, 6, 2, 5, 'R').line(13, 5, 15, 0, 'n');
      } else {
        p.rect(12, 11, 2, 4, 'R').line(13, 15, 15, 18 - f, 'n');
      }
    },
  },
  payasito: {
    w: 10,
    h: 12,
    frames: 2,
    paint: (p, f) => {
      p.disc(5, 4, 3.5, 'w').rect(1, 0, 3, 2, 'B').rect(6, 0, 3, 2, 'B');
      p.px(3, 3, 'k').px(6, 3, 'k').line(3, 4, 3, 6, 'b').px(5, 5, 'R');
      p.line(3, 7, 6, 7, 'k');
      p.rect(2, 8, 6, 3, 'P').px(4, 8, 'y');
      if (f === 0) p.rect(2, 11, 2, 1, 'R').rect(6, 11, 2, 1, 'R');
      else p.rect(3, 11, 2, 1, 'R').rect(5, 11, 2, 1, 'R');
    },
  },
  leoncito: {
    w: 12,
    h: 10,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(7, 6, 4, 2.5, 'y').disc(3, 4, 3, 'o').disc(3, 4.5, 1.8, 'y');
      p.px(2, 4, 'k').px(4, 4, 'k').line(11, 5, 11, 3, 'y');
      p.rect(4 + f, 8, 1, 2, 'y').rect(9 - f, 8, 1, 2, 'y');
    },
  },
  bestia: {
    w: 42,
    h: 36,
    frames: 4,
    paint: (p, f) => {
      // Hombre-león encadenado. 0-1 andar, 2 rugido/agazapado, 3 salto
      const oy = f === 2 ? 3 : 0;
      p.ellipse(21, 23 + oy, 13, 9, 'N');
      p.disc(14, 14 + oy, 10, 'n');
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        p.disc(14 + Math.cos(a) * 9, 14 + oy + Math.sin(a) * 9, 2, i % 2 ? 'n' : 'e');
      }
      p.disc(14, 15 + oy, 6, 'N');
      p.px(11, 13 + oy, 'R').px(17, 13 + oy, 'R').px(11, 12 + oy, 'Y').px(17, 12 + oy, 'Y');
      if (f === 2) p.ellipse(14, 19 + oy, 3.5, 2.5, 'k').px(12, 18 + oy, 'w').px(16, 18 + oy, 'w');
      else p.rect(11, 18 + oy, 7, 1, 'k').px(12, 19 + oy, 'w').px(16, 19 + oy, 'w');
      // cadena y grillete
      p.rect(8, 22 + oy, 12, 2, 'x');
      for (let x = 20; x < 40; x += 3) p.rect(x, 25 + oy + ((x / 3) % 2), 2, 1, 'g');
      // patas
      if (f === 3) {
        p.line(10, 30, 4, 34, 'N').line(32, 28, 40, 30, 'N');
      } else {
        const s = f === 1 ? 2 : 0;
        p.rect(11 + s, 30, 5, 6, 'N').rect(26 - s, 30, 5, 6, 'N');
        p.rect(10 + s, 34, 7, 2, 'n').rect(25 - s, 34, 7, 2, 'n');
      }
      p.line(34, 20 + oy, 40, 14 + oy, 'N').disc(40, 13 + oy, 1.5, 'n');
    },
  },
  serpiente_cabeza: {
    w: 18,
    h: 16,
    frames: 2,
    paint: (p, f) => {
      // Contorsionista: cabeza humana con cuello de serpiente. 0 mira a la derecha, 1 a la izquierda.
      const flip = (x: number) => (f === 1 ? 17 - x : x);
      p.disc(9, 8, 6, 'w');
      for (const [x, y] of [[4, 3], [6, 2], [9, 1], [12, 2], [14, 4]]) p.disc(flip(x), y, 2, 'k');
      p.px(flip(10), 7, 'k').px(flip(13), 7, 'k').px(flip(10), 6, 'V').px(flip(13), 6, 'V');
      p.line(flip(9), 11, flip(14), 11, 'R').px(flip(15), 10, 'R');
      p.px(flip(16), 12, 'R').px(flip(17), 13, 'R'); // lengua bífida
      p.px(flip(5), 9, 'M');
      p.rect(3, 13, 12, 3, 'V');
    },
  },
  serpiente_cuerpo: {
    w: 12,
    h: 10,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(5.5, 4.5, 5.5, 4.5, f === 0 ? 'V' : 'v');
      p.ellipse(5.5, 6, 3.5, 2, 'l');
      p.px(3, 2, f === 0 ? 'v' : 'V').px(8, 2, f === 0 ? 'v' : 'V');
    },
  },
  jaula: {
    w: 16,
    h: 18,
    paint: (p) => {
      p.rect(0, 0, 16, 2, 'S').rect(0, 16, 16, 2, 'S');
      for (let x = 0; x < 16; x += 3) p.rect(x, 2, 1, 14, 'g');
      p.rect(0, 8, 16, 1, 's');
      p.px(1, 0, 'x').px(14, 0, 'x');
    },
  },
  paja: {
    w: 16,
    h: 16,
    paint: (p) => {
      p.rect(1, 3, 14, 12, 'y').rect(1, 3, 14, 2, 'Y');
      for (let x = 2; x < 15; x += 2) p.line(x, 5, x + 1, 14, x % 4 ? 't' : 'N');
      p.rect(1, 7, 14, 1, 'n').rect(1, 11, 14, 1, 'n');
      p.px(0, 6, 'Y').px(15, 9, 'Y').px(4, 2, 'Y');
    },
  },
  pelota_veneno: ascii([['..vv..', '.vVVl.', 'vVlllV', 'vVVlVV', '.vVVv.', '..vv..']]),
  bala_veneno: ascii([
    ['.vVv.', 'vVlVv', 'VlWlV', 'vVlVv', '.vVv.'],
    ['.vvv.', 'vVVVv', 'VVlVV', 'vVVVv', '.vvv.'],
  ], 'k'),

  // Iconos de objetos
  obj_melenaLeon: icon((p) => {
    p.disc(6.5, 6.5, 6, 'n');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.disc(6.5 + Math.cos(a) * 5.5, 6.5 + Math.sin(a) * 5.5, 1.6, i % 2 ? 'o' : 'n');
    }
    p.disc(6.5, 6.5, 3, 'K');
  }),
  obj_colmilloCobra: icon((p) => {
    p.line(4, 1, 9, 12, 'w').line(5, 1, 10, 12, 'W').line(3, 1, 8, 11, 'G');
    p.px(10, 13, 'V').px(11, 12, 'l').disc(11, 10, 1.2, 'V');
  }),
  obj_plumaLoro: icon((p) => {
    p.line(2, 12, 11, 1, 'n');
    for (let i = 0; i < 6; i++) {
      p.line(3 + i * 1.5, 11 - i * 1.7, 7 + i * 1.3, 10 - i * 1.9, i < 2 ? 'B' : i < 4 ? 'y' : 'R');
    }
  }),
  obj_corazonOso: icon((p) => {
    p.disc(4, 5, 3.5, 'r').disc(9, 5, 3.5, 'r').rect(1, 6, 11, 2, 'r');
    p.line(1, 7, 6.5, 13, 'r').line(12, 7, 6.5, 13, 'r');
    for (let y = 7; y < 13; y++) p.rect(1 + (y - 7) * 0.9, y, 11 - (y - 7) * 1.8, 1, 'r');
    p.px(3, 3, 'm').px(4, 3, 'M').line(5, 8, 8, 8, 'n').px(6, 7, 'n');
  }),
  obj_collarPinchos: icon((p) => {
    p.ring(6.5, 6.5, 5, 'n').ring(6.5, 6.5, 4, 'N');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.px(6.5 + Math.cos(a) * 6.5, 6.5 + Math.sin(a) * 6.5, 'X');
    }
    p.rect(5, 11, 3, 3, 'y');
  }),
  obj_bolaEquilibrista: icon((p) => {
    p.disc(6.5, 7, 6, 'B').ellipse(6.5, 7, 6, 1.5, 'y').rect(1, 6, 12, 1, 'R');
    p.px(4, 3, 'W').px(5, 3, 'W');
  }),
  obj_leoncito: icon((p) => {
    p.ellipse(8, 8, 5, 3, 'y').disc(4, 5, 4, 'o').disc(4, 5.5, 2.5, 'y');
    p.px(3, 5, 'k').px(5, 5, 'k').rect(5, 11, 1, 2, 'y').rect(10, 11, 1, 2, 'y');
  }),
  obj_jaulaPortatil: icon((p) => {
    p.rect(1, 2, 12, 2, 'S').rect(1, 12, 12, 2, 'S');
    for (let x = 1; x < 13; x += 3) p.rect(x, 4, 1, 8, 'x');
    p.rect(5, 0, 4, 2, 'y');
  }),
  // Foca Amaestrada (familiar): 0 quieta, 1 dando el cabezazo.
  foquita: {
    w: 14,
    h: 12,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(7, 8, 5.5, 3, 's').ellipse(7, 9, 4, 1.5, 'g');
      const hy = f === 1 ? 2 : 4;
      p.disc(11, hy, 2.5, 's').px(12, hy - 1, 'k').px(13, hy, 'k');
      p.line(1, 9, 0, 11, 's');
      p.disc(11, hy - 4, 1.5, 'R').px(10, hy - 5, 'W');
    },
  },
  // --- Nuevas del Acto II ---
  // Foca equilibrista: 0 deslizándose, 1 con la pelota en alto (aviso).
  foca: {
    w: 18,
    h: 14,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(9, 9.5, 7, 4, 's').ellipse(9, 10.5, 5, 2.5, 'g');
      p.disc(14, 6, 3, 's').px(15, 5, 'k').px(16, 7, 'k').px(13, 7, 'G').px(17, 7, 'G');
      p.line(2, 10, 0, 13, 's').line(3, 11, 1, 13, 'S');
      p.line(10, 12, 12, 14, 'S');
      if (f === 1) {
        p.disc(14, 1.5, 2, 'R').px(13, 1, 'W').px(15, 2, 'y').px(14, 0, 'B');
      } else p.disc(6, 4, 2, 'R').px(5, 3, 'W').px(7, 4, 'y');
    },
  },
  pelota_foca: {
    w: 8,
    h: 8,
    paint: (p) => {
      p.disc(3.5, 3.5, 3.5, 'R').rect(0, 3, 8, 2, 'y').rect(3, 0, 2, 8, 'B').px(2, 2, 'W');
    },
  },
  // Mono ladrón: 0-1 corriendo, 2 con el saco de boletos.
  titi: {
    w: 14,
    h: 14,
    frames: 3,
    paint: (p, f) => {
      p.disc(7, 9, 3.5, 'N').ellipse(7, 10, 2, 2, 't');
      p.disc(7, 4.5, 3, 'N').ellipse(7, 5.5, 2, 1.5, 't');
      p.px(6, 4, 'k').px(8, 4, 'k').px(7, 6, 'k');
      p.rect(5, 0, 4, 2, 'v').px(7, 0, 'y'); // fez
      p.line(10, 10, 13, 7, 'N').px(13, 6, 'N');
      const leg = f === 1 ? 1 : 0;
      p.rect(5 - leg, 12, 1, 2, 'n').rect(8 + leg, 12, 1, 2, 'n');
      if (f === 2) p.disc(2.5, 8.5, 2.5, 'y').px(2, 6, 'n').px(1, 9, 'Y');
    },
  },
  // Faquir: 0 andando, 1 sentado tocando la flauta (aviso).
  faquir: {
    w: 16,
    h: 18,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(8, 3, 4, 3, 'W').px(8, 0, 'R'); // turbante
      p.disc(8, 6, 2.5, 'n').px(7, 6, 'k').px(9, 6, 'k').rect(6, 8, 5, 1, 'k');
      if (f === 0) {
        p.rect(5, 9, 6, 6, 'o').rect(5, 13, 6, 1, 'R');
        p.rect(6, 15, 2, 3, 'n').rect(9, 15, 2, 3, 'n');
        p.rect(3, 10, 2, 4, 'n').rect(11, 10, 2, 4, 'n');
      } else {
        p.ellipse(8, 14, 6, 3.5, 'o').rect(4, 15, 9, 1, 'R');
        p.rect(5, 9, 6, 5, 'o');
        p.line(9, 8, 14, 10, 'N').px(14, 11, 'y').px(15, 10, 'y');
      }
    },
  },
};
