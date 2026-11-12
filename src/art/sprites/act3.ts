// Arte del Acto III: La Casa de los Espejos.
import { ascii, SpriteDef } from '../bake';
import { Pix } from '../pix';

const icon = (paint: (p: Pix) => void): SpriteDef => ({ w: 14, h: 14, paint });

/** Pompón en negativo (Tu Reflejo y sus copias). */
const mirrorClown = (p: Pix, f: number, mask = false) => {
  const step = f === 1 ? 1 : f === 2 ? -1 : 0;
  // Cuerpo: traje turquesa con rombos oscuros.
  p.rect(4, 11, 8, 6, 'c').px(6, 13, 'b').px(9, 14, 'b').px(7, 15, 'b');
  p.rect(2, 12, 2, 3, 'c').rect(12, 12, 2, 3, 'c');
  p.rect(5 + step, 17, 2, 3, 'K').rect(9 - step, 17, 2, 3, 'K');
  // Cabeza: cara gris azulada, pelo verde, nariz azul.
  p.disc(8, 6, 4.5, 'G');
  p.disc(3.5, 4, 2, 'V').disc(12.5, 4, 2, 'V').disc(8, 1.5, 2, 'V');
  p.px(6, 6, 'k').px(10, 6, 'k').disc(8, 7.5, 1.2, 'B');
  p.line(6, 9, 10, 9, 'b');
  if (mask) p.px(6, 5, 'W').px(10, 5, 'W');
  // Grietas de espejo.
  p.line(11, 3, 9, 8, 'X').px(10, 10, 'X');
};

export const ACT3_SPRITES: Record<string, SpriteDef> = {
  // --- Criaturas ---
  reflejo: {
    w: 14,
    h: 18,
    frames: 2,
    paint: (p, f) => {
      // Marco de espejo con un payaso dentro, que camina.
      p.ellipse(7, 7, 6, 7, 'y').ellipse(7, 7, 5, 6, 'X');
      p.ellipse(7, 7, 4, 5, 'h');
      p.disc(7, 6, 2.5, 'w').px(6, 6, 'k').px(8, 6, 'k').px(7, 7, 'R');
      p.line(3, 3, 6, 11, 'W').line(9, 2, 11, 6, 'W');
      p.rect(4 + f, 14, 2, 4, 'y').rect(8 - f, 14, 2, 4, 'y');
    },
  },
  bailarina: {
    w: 14,
    h: 18,
    frames: 4,
    paint: (p, f) => {
      // 0-1 deslizándose, 2-3 pirueta. Muñeca de caja de música con llave en la espalda.
      const spin = f >= 2;
      p.disc(7, 3.5, 2.5, 'w').px(6, 3, 'k').px(8, 3, 'k').px(7, 4, 'M');
      p.rect(5, 0, 4, 1, 'y');
      p.rect(6, 6, 3, 4, 'm');
      p.ellipse(7, 10.5, spin ? 6.5 : 5, 2, 'M').ellipse(7, 10, spin ? 6 : 4.5, 1.5, 'm');
      p.rect(6.5, 12, 1, 4, 'w');
      if (spin) p.line(1, 5, 5, 7, 'w').line(13, 9, 9, 7, 'w');
      else p.line(3, 3, 6, 7, 'w').line(11, 3, 8, 7, 'w');
      p.rect(5, 16, 5, 2, 'y').px(f % 2 ? 4 : 10, 7, 'X'); // peana y llave
    },
  },
  ilusionista: {
    w: 14,
    h: 20,
    frames: 3,
    paint: (p, f) => {
      // Capa morada con estrellas; 2 = lanzando cartas.
      p.rect(4, 0, 6, 4, 'k').rect(2, 4, 10, 1, 'k').rect(4, 3, 6, 1, 'R');
      p.disc(7, 7, 2.5, 'w').px(6, 7, 'k').px(8, 7, 'k').line(5, 9, 9, 9, 'k');
      p.rect(3, 10, 8, 8, 'p').px(4, 12, 'y').px(9, 15, 'y').px(6, 16, 'Y');
      p.rect(2, 10, 1, 8 - (f % 2), 'P').rect(11, 10, 1, 8 - ((f + 1) % 2), 'P');
      p.rect(4, 18, 2, 2, 'k').rect(8, 18, 2, 2, 'k');
      if (f === 2) p.rect(11, 6, 3, 4, 'W').rect(12, 7, 1, 2, 'R');
    },
  },
  munieco: {
    w: 14,
    h: 14,
    frames: 3,
    paint: (p, f) => {
      if (f === 2) {
        // Tirado en el suelo.
        p.ellipse(7, 11, 6, 2.5, 't').disc(3, 10, 2.5, 'w').px(2, 10, 'k').px(4, 10, 'k');
        p.line(5, 11, 12, 12, 'R');
        return;
      }
      p.disc(7, 4, 3.5, 'w').rect(4, 0, 6, 2, 'n');
      p.px(5, 4, 'k').px(9, 4, 'k').rect(5, 6, 5, 1, 'k').line(5, 7, 5, 9, 'g').line(9, 7, 9, 9, 'g'); // boca de bisagra
      p.rect(4, 8, 6, 4, 'R').rect(6, 8, 2, 4, 'W');
      p.rect(4 + f, 12, 2, 2, 'n').rect(8 - f, 12, 2, 2, 'n');
    },
  },
  ventrilocuo: {
    w: 14,
    h: 20,
    frames: 3,
    paint: (p, f) => {
      p.disc(7, 4, 3, 'w').rect(4, 0, 6, 2, 'K').px(6, 4, 'k').px(8, 4, 'k');
      p.rect(5, 6, 4, 1, f === 2 ? 'R' : 'k');
      p.rect(3, 8, 8, 8, 'b').rect(6, 8, 2, 8, 'W').px(7, 9, 'R');
      p.rect(5, 16, 2, 4, 'K').rect(8, 16, 2, 4, 'K');
      p.rect(11, 9, 3, 5, 't').disc(12.5, 8, 1.5, 'w'); // muñequito en el brazo
      if (f === 1) p.px(13, 6, 'y');
    },
  },
  tragasables: {
    w: 16,
    h: 20,
    frames: 5,
    paint: (p, f) => {
      // 0-1 en guardia, 2 preparando, 3 estocada, 4 desarmado.
      p.disc(8, 4, 3, 'o').rect(5, 0, 6, 2, 'K').px(7, 4, 'k').px(9, 4, 'k');
      p.rect(5, 8, 6, 7, 'e').rect(5, 8, 6, 1, 'y').rect(7, 9, 2, 5, 'y');
      p.rect(5 + (f % 2), 15, 2, 5, 'K').rect(9 - (f % 2), 15, 2, 5, 'K');
      if (f === 4) {
        p.line(1, 18, 5, 14, 'X').px(0, 19, 'n');
        return;
      }
      const reach = f === 3 ? 4 : f === 2 ? -2 : 0;
      p.rect(11, 9, 4, 1, 'n');
      p.line(13 + reach, 1, 13 + reach, 9, 'X').line(14 + reach, 1, 14 + reach, 9, 'W');
      p.rect(2, 9, 2, 6, 'x'); // escudo de espadas
    },
  },
  cabezudo: {
    w: 20,
    h: 20,
    frames: 2,
    paint: (p, f) => {
      // Cabeza gigante de feria sobre un cuerpecito.
      p.disc(10, 8, 8, 'w');
      p.disc(4, 3, 3, 'o').disc(16, 3, 3, 'o').disc(10, 0.5, 3, 'o');
      p.disc(7, 7, 1.5, 'k').disc(13, 7, 1.5, 'k').px(7, 6, 'W').px(13, 6, 'W');
      p.disc(10, 10, 2, 'R').ellipse(10, 13.5, 4, 1.5, 'e').rect(7, 13, 6, 1, 'W');
      p.rect(7, 16, 6, 2, 'P').rect(7 + f, 18, 2, 2, 'k').rect(11 - f, 18, 2, 2, 'k');
    },
  },
  cabecita: {
    w: 10,
    h: 10,
    frames: 2,
    paint: (p, f) => {
      p.disc(5, 5, 4, 'w').disc(2, 2, 1.5, 'o').disc(8, 2, 1.5, 'o');
      p.px(3, 4, 'k').px(6, 4, 'k').disc(4.5, 6, 1, 'R');
      p.px(f ? 1 : 8, 8, 'm');
    },
  },
  orbe: {
    w: 10,
    h: 10,
    frames: 2,
    paint: (p, f) => {
      p.disc(4.5, 4.5, 4.5, f ? 'P' : 'h').disc(4.5, 4.5, 3, 'h').disc(4.5, 4.5, 1.5, 'W');
      p.px(f ? 2 : 7, 2, 'W');
    },
  },
  tu_reflejo: { w: 16, h: 20, frames: 3, paint: (p, f) => mirrorClown(p, f, true) },
  fortuna: {
    w: 22,
    h: 24,
    frames: 3,
    paint: (p, f) => {
      // Pitonisa flotante: pañuelo, joyas y bola de cristal. 2 = sacando carta.
      p.ellipse(11, 18, 9, 6, 'p').ellipse(11, 17, 8, 5, 'P');
      for (let x = 3; x < 20; x += 3) p.px(x, 21, 'y');
      p.disc(11, 8, 4, 'o').rect(6, 2, 10, 4, 'R').rect(5, 5, 12, 1, 'y').px(11, 3, 'C');
      p.px(9, 8, 'k').px(13, 8, 'k').rect(10, 10, 3, 1, 'e');
      p.px(6, 9, 'y').px(16, 9, 'y'); // pendientes
      p.disc(11, 15, 3, 'h').disc(11, 15, 2, 'B').px(10, 14, 'W');
      if (f === 2) p.rect(17, 6, 4, 6, 'W').rect(18, 7, 2, 4, 'p');
      else p.line(5, 13 + f, 8, 15, 'o').line(17, 13 + f, 14, 15, 'o');
    },
  },
  carta_tarot: {
    w: 12,
    h: 18,
    frames: 5,
    paint: (p, f) => {
      // 0 La Torre, 1 La Rueda, 2 El Colgado, 3 La Luna, 4 La Muerte.
      p.rect(0, 0, 12, 18, 'w').rect(1, 1, 10, 16, 'Y');
      if (f === 0) {
        p.rect(4, 5, 4, 10, 'g').rect(3, 4, 6, 2, 'S').px(5, 8, 'k').px(6, 11, 'k');
        p.line(2, 2, 6, 6, 'y').line(9, 3, 7, 7, 'o');
      } else if (f === 1) {
        p.ring(6, 9, 4, 'n').disc(6, 9, 1, 'R');
        for (let i = 0; i < 4; i++) p.line(6, 9, 6 + Math.cos(i * 0.8) * 4, 9 + Math.sin(i * 0.8) * 4, 'n');
      } else if (f === 2) {
        p.line(6, 2, 6, 7, 'n').disc(6, 12, 2, 'w').rect(5, 7, 2, 4, 'b').px(5, 13, 'k');
      } else if (f === 3) {
        p.disc(6, 7, 3.5, 'w').disc(7.5, 6, 3, 'Y').px(3, 13, 'b').px(8, 14, 'b').rect(2, 15, 8, 1, 'b');
      } else {
        p.disc(6, 6, 2.5, 'w').px(5, 6, 'k').px(7, 6, 'k').rect(5, 9, 2, 6, 'k');
        p.line(8, 3, 8, 15, 'n').line(8, 3, 11, 5, 'x');
      }
      p.rect(1, 16, 10, 1, 'R');
    },
  },
  carta: ascii([['.wwwww.', 'wRwwwRw', 'wwwRwww', '.wwwww.']], 'k'),
  bala_reflejo: ascii([
    ['.cCc.', 'cCWCc', 'CWWWC', 'cCWCc', '.cCc.'],
    ['.ccc.', 'cCCCc', 'CCWCC', 'cCCCc', '.ccc.'],
  ], 'k'),
  orbe_bala: ascii([
    ['.pPp.', 'pPhPp', 'PhWhP', 'pPhPp', '.pPp.'],
    ['.ppp.', 'pPPPp', 'PPhPP', 'pPPPp', '.ppp.'],
  ], 'k'),
  guadana: {
    w: 20,
    h: 20,
    paint: (p) => {
      p.line(3, 17, 15, 5, 'n').line(4, 17, 16, 5, 'N');
      p.ellipse(13, 4, 6, 3, 'x').ellipse(14, 5, 5, 2, 'k').px(8, 3, 'W');
    },
  },
  // --- Baldosas ---
  espejo: {
    w: 16,
    h: 20,
    frames: 3,
    paint: (p, f) => {
      // Espejo de cuerpo entero con marco dorado; el reflejo tiembla.
      p.rect(1, 0, 14, 20, 'y').rect(2, 1, 12, 18, 'n');
      p.rect(3, 2, 10, 16, 'h').rect(3, 2, 10, 16, 'X');
      p.stripesV(3, 2, 10, 16, 'X', 'h', 3);
      p.line(4 + f, 3, 9 + f, 16, 'W').line(5 + f, 3, 10 + f, 16, 'W');
      p.px(2, 0, 'Y').px(13, 0, 'Y').rect(6, 18, 4, 2, 'n');
    },
  },
  cinta: {
    w: 16,
    h: 16,
    frames: 4,
    outline: false,
    paint: (p, f) => {
      // Suelo móvil que apunta a la derecha (se gira según la dirección).
      p.rect(0, 1, 16, 14, 'S').rect(0, 1, 16, 1, 'g').rect(0, 14, 16, 1, 's');
      for (let i = -1; i < 3; i++) {
        const x = i * 6 + f * 1.5;
        p.line(x + 2, 4, x + 5, 8, 'y').line(x + 5, 8, x + 2, 12, 'y');
      }
    },
  },
  // --- Familiares y efectos ---
  doble: { w: 16, h: 20, frames: 2, paint: (p, f) => mirrorClown(p, f) },
  sombra_alquilada: {
    w: 14,
    h: 20,
    paint: (p) => {
      p.disc(7, 6, 4.5, 'K').disc(3, 4, 2, 'K').disc(11, 4, 2, 'K').rect(3, 11, 8, 7, 'K');
      p.px(5, 6, 'R').px(9, 6, 'R');
    },
  },
  ojos: ascii([['R.R', '...']], false),
  haz: {
    w: 90,
    h: 40,
    outline: false,
    paint: (p) => {
      for (let x = 0; x < 90; x++) {
        const h = 6 + x * 0.36;
        p.rect(x, 20 - h / 2, 1, h, `rgba(255,242,168,${(0.9 - x / 110).toFixed(2)})`);
      }
    },
  },
  charco_crema: {
    w: 20,
    h: 14,
    outline: false,
    paint: (p) => {
      p.ellipse(10, 7, 9, 6, 'rgba(255,255,255,0.75)').ellipse(9, 6, 6, 3, 'rgba(255,255,255,0.9)');
      p.disc(3, 3, 1.5, 'rgba(255,255,255,0.7)').disc(17, 11, 1.5, 'rgba(255,255,255,0.7)').px(12, 5, 'R');
    },
  },
  // --- Iconos de objetos ---
  obj_esquirlaEspejo: icon((p) => {
    p.line(2, 12, 7, 1, 'X').line(7, 1, 12, 9, 'X').line(2, 12, 12, 9, 'X');
    for (let y = 3; y < 11; y++) p.line(4 + (y - 3) * 0.3, y + 1, 10 - (y - 3) * 0.2, 9, 'h');
    p.line(5, 6, 8, 4, 'W').px(3, 0, 'W').px(12, 2, 'W');
  }),
  obj_barajaMarcada: icon((p) => {
    p.rect(1, 3, 8, 10, 'w').rect(5, 1, 8, 10, 'W').rect(6, 2, 6, 8, 'w');
    p.disc(9, 5, 1.2, 'R').disc(9, 7, 1.2, 'R').px(9, 8, 'R').px(11, 3, 'k').px(7, 9, 'k');
  }),
  obj_sierraMago: icon((p) => {
    p.rect(1, 5, 12, 4, 'x');
    for (let x = 1; x < 13; x += 2) p.px(x, 9, 'X');
    p.rect(0, 4, 3, 6, 'n').line(5, 2, 9, 12, 'R');
  }),
  obj_varitaTrucada: icon((p) => {
    p.line(2, 12, 10, 4, 'k').line(3, 12, 11, 4, 'k').line(9, 5, 11, 3, 'W').line(10, 5, 12, 3, 'W');
    p.px(12, 1, 'Y').px(10, 1, 'y').px(13, 3, 'y').px(8, 2, 'Y');
  }),
  obj_bombaHumo: icon((p) => {
    p.disc(6.5, 8, 5, 'S').disc(5, 6.5, 1.5, 'g').rect(5, 1, 3, 3, 'n');
    p.disc(10, 2, 2, 'G').disc(12, 4, 1.5, 'G').px(9, 0, 'W');
  }),
  obj_dobleRiesgo: icon((p) => {
    p.disc(4, 5, 3, 'w').disc(10, 5, 3, 'G').px(3, 5, 'k').px(9, 5, 'k').px(4, 6, 'R').px(10, 6, 'B');
    p.rect(1, 9, 6, 4, 'R').rect(8, 9, 6, 4, 'c').line(7, 0, 7, 13, 'X');
  }),
  obj_cartaLoco: icon((p) => {
    p.rect(2, 0, 10, 14, 'w').rect(3, 1, 8, 12, 'Y');
    p.disc(7, 5, 2, 'o').rect(6, 7, 2, 4, 'V').line(8, 8, 11, 6, 'n').disc(11, 5, 1, 'R').px(5, 12, 'k');
  }),
  obj_chisteraDobleFondo: icon((p) => {
    p.rect(3, 1, 8, 9, 'K').rect(1, 10, 12, 2, 'K').rect(3, 7, 8, 2, 'R');
    p.rect(4, 12, 6, 2, 'y').px(6, 13, 'Y').px(4, 2, 'S');
  }),
  obj_almaPrenda: icon((p) => {
    p.disc(6.5, 5, 4, 'rgba(201,179,239,0.8)').rect(3, 6, 7, 6, 'rgba(201,179,239,0.8)');
    p.px(5, 4, 'k').px(8, 4, 'k').px(3, 12, 'h').px(6, 13, 'h').px(9, 12, 'h').rect(10, 1, 3, 4, 'R');
  }),
  obj_sombraAlquilada: icon((p) => {
    p.disc(6.5, 4, 3, 'K').rect(4, 7, 5, 6, 'K').px(5, 4, 'R').px(8, 4, 'R');
    p.rect(9, 9, 4, 3, 'w').px(10, 10, 'R');
  }),
  obj_relojParado: icon((p) => {
    p.disc(6.5, 7, 6, 'y').disc(6.5, 7, 5, 'w').line(6.5, 7, 6.5, 3, 'k').line(6.5, 7, 9, 8, 'k');
    p.rect(5, 0, 3, 2, 'y').line(1, 12, 12, 2, 'R');
  }),
  // --- Nuevas del Acto III ---
  // Autómata de feria: 0 quieto, 1 paso, 2 ojos encendidos (va a disparar).
  automata: {
    w: 16,
    h: 18,
    frames: 3,
    paint: (p, f) => {
      p.rect(4, 2, 8, 7, 'x').rect(4, 2, 8, 1, 'X').rect(7, 0, 2, 2, 'N');
      const eye = f === 2 ? 'R' : 'k';
      p.rect(5, 4, 2, 2, eye).rect(9, 4, 2, 2, eye);
      p.rect(6, 7, 4, 1, 's');
      p.rect(3, 9, 10, 6, 'N').rect(3, 9, 10, 1, 't');
      p.disc(8, 12, 2, 'y').px(8, 12, 'n'); // engranaje
      p.rect(1, 10, 2, 4, 'x').rect(13, 10, 2, 4, 'x');
      const step = f === 1 ? 1 : 0;
      p.rect(4 + step, 15, 3, 3, 's').rect(9 - step, 15, 3, 3, 's');
    },
  },
  // Sombra: tu silueta, oscura y con ojos rojos.
  sombra_enemiga: {
    w: 14,
    h: 16,
    outline: '#7a4a8c',
    paint: (p) => {
      p.disc(7, 5, 4, 'K').disc(3, 2, 2, 'K').disc(11, 2, 2, 'K');
      p.px(5, 5, 'R').px(9, 5, 'R');
      p.rect(4, 9, 6, 5, 'K').rect(2, 10, 2, 3, 'K').rect(10, 10, 2, 3, 'K');
      p.rect(4, 14, 2, 2, 'K').rect(8, 14, 2, 2, 'K');
    },
  },
  // Hipnotizador: 0 andando, 1 balanceando el péndulo (aviso).
  hipnotizador: {
    w: 16,
    h: 20,
    frames: 2,
    paint: (p, f) => {
      p.rect(4, 0, 8, 3, 'k').rect(4, 2, 8, 1, 'R').rect(3, 3, 10, 1, 'k'); // chistera
      p.disc(8, 6, 3, 'w').px(7, 6, 'P').px(9, 6, 'P');
      p.line(6, 8, 10, 8, 'k');
      p.rect(4, 10, 8, 7, 'P').rect(7, 10, 2, 7, 'h').rect(4, 10, 8, 1, 'h');
      p.rect(5, 17, 2, 3, 'k').rect(9, 17, 2, 3, 'k');
      const sx = f === 1 ? 14 : 12;
      p.line(12, 11, sx, 15, 'y').disc(sx, 16, 1.5, 'h');
    },
  },
  orbe_hipno: {
    w: 10,
    h: 10,
    outline: false,
    paint: (p) => {
      p.disc(4.5, 4.5, 4.5, 'h').ring(4.5, 4.5, 3, 'P').ring(4.5, 4.5, 1.5, 'd').px(4, 4, 'W');
    },
  },
};
