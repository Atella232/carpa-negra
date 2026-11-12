// Disfraces de los trajes completos (se dibujan sobre la cabeza de Pompón).
import { SpriteDef } from '../bake';

export const SET_COSTUMES: Record<string, SpriteDef> = {
  // Melena de fiera alrededor de la cara.
  disfraz_fiera: {
    w: 18,
    h: 16,
    frames: 1,
    paint: (p) => {
      for (let i = 0; i < 10; i++) {
        const a = Math.PI + (i / 9) * Math.PI;
        p.disc(9 + Math.cos(a) * 7, 8 + Math.sin(a) * 6, 2, i % 2 ? 'o' : 'n');
      }
    },
  },
  // Pelotas girando sobre la cabeza.
  disfraz_malabarista: {
    w: 16,
    h: 8,
    frames: 2,
    paint: (p, f) => {
      p.disc(3 + f * 2, 3, 1.5, 'C').disc(8, 1.5 + f, 1.5, 'R').disc(13 - f * 2, 3, 1.5, 'y');
    },
  },
  // Chistera pequeña.
  disfraz_mago: {
    w: 12,
    h: 10,
    frames: 1,
    paint: (p) => {
      p.rect(3, 0, 6, 6, 'K').rect(1, 6, 10, 2, 'K').rect(3, 4, 6, 1, 'p').px(4, 1, 'S');
    },
  },
  // Gorro de cascabeles.
  disfraz_payaso: {
    w: 16,
    h: 10,
    frames: 1,
    paint: (p) => {
      p.line(8, 8, 2, 1, 'R').line(8, 8, 14, 1, 'B').line(8, 8, 8, 0, 'y');
      p.disc(2, 1, 1.4, 'Y').disc(14, 1, 1.4, 'Y').disc(8, 0.5, 1.4, 'Y');
    },
  },
};
