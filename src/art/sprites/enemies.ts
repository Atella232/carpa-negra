// Criaturas del Acto I y sus jefes.
import { SpriteDef } from '../bake';
import { Pix } from '../pix';

const mimeHead = (p: Pix, oy: number) => {
  p.disc(7.5, 5 + oy, 4, 'w');
  p.rect(5, 1 + oy, 6, 2, 'k').px(8, 0 + oy, 'k'); // boina
  p.px(6, 5 + oy, 'k').px(9, 5 + oy, 'k');
  p.px(6, 6 + oy, 'k').px(6, 7 + oy, 'k'); // lágrima negra
  p.px(7, 8 + oy, 'R').px(8, 8 + oy, 'R');
  p.line(9, 2 + oy, 11, 6 + oy, 'g'); // grieta
};

export const ENEMY_SPRITES: Record<string, SpriteDef> = {
  mimo: {
    w: 16,
    h: 16,
    frames: 2,
    paint: (p, f) => {
      const oy = f;
      p.stripesH(5, 9 + oy, 6, 5, 'k', 'w');
      p.rect(3, 10 + oy, 2, 3, 'w').rect(11, 10 + oy, 2, 3, 'w');
      p.px(3, 13 + oy, 'W').px(12, 13 + oy, 'W');
      mimeHead(p, oy);
      if (f === 0) p.rect(6, 14, 1, 2, 'k').rect(9, 14, 1, 2, 'k');
      else p.rect(7, 15, 1, 1, 'k').rect(8, 15, 1, 1, 'k');
    },
  },
  polilla: {
    w: 16,
    h: 14,
    frames: 2,
    paint: (p, f) => {
      if (f === 0) {
        p.ellipse(3.5, 6, 3.5, 4.5, 'G').ellipse(12, 6, 3.5, 4.5, 'G');
        p.disc(3.5, 5, 1.5, 'y').disc(12, 5, 1.5, 'y').px(3, 5, 'k').px(12, 5, 'k');
      } else {
        p.ellipse(4.5, 4, 3, 3, 'G').ellipse(11, 4, 3, 3, 'G');
        p.px(4, 4, 'y').px(11, 4, 'y');
      }
      p.ellipse(7.5, 7, 1.5, 4, 'n').px(7, 3, 'R').px(8, 3, 'R');
      p.line(6, 2, 5, 0, 'n').line(9, 2, 10, 0, 'n');
    },
  },
  mono: {
    w: 18,
    h: 16,
    frames: 3,
    paint: (p, f) => {
      // 0 quieto, 1 platillos juntos, 2 embistiendo
      p.disc(8.5, 11, 4, 'n');
      p.disc(8.5, 5.5, 3.5, 'n').ellipse(8.5, 6.5, 2.5, 2, 'm');
      p.px(7, 5, 'Y').px(10, 5, 'Y').px(7, 4, 'k').px(10, 4, 'k');
      p.rect(7, 8, 3, 1, 'k');
      p.rect(7, 0, 3, 2, 'R').px(9, 0, 'y');
      p.rect(5, 11, 7, 2, 'R');
      const cx = f === 1 ? 4 : f === 2 ? 1.5 : 1.5;
      p.ellipse(cx, 10, 1.5, 3, 'y').ellipse(17 - cx, 10, 1.5, 3, 'y');
      p.px(cx, 9, 'Y').px(17 - cx, 9, 'Y');
      p.rect(6, 15, 2, 1, 'n').rect(10, 15, 2, 1, 'n');
      if (f === 2) p.rect(6, 8, 5, 1, 'W');
    },
  },
  lanzacuchillos: {
    w: 16,
    h: 18,
    frames: 2,
    paint: (p, f) => {
      p.disc(7.5, 5, 3.5, 'w');
      p.rect(4, 0, 8, 2, 'k').rect(3, 2, 10, 1, 'k'); // bombín
      p.px(6, 5, 'k').px(9, 5, 'k');
      p.rect(5, 7, 6, 1, 'k').px(4, 8, 'k').px(11, 8, 'k'); // bigote
      p.rect(4, 9, 8, 7, 'r').rect(7, 9, 2, 7, 'W').rect(4, 9, 8, 1, 'k');
      p.rect(5, 16, 2, 2, 'k').rect(9, 16, 2, 2, 'k');
      if (f === 0) {
        p.rect(2, 10, 2, 5, 'r').rect(12, 10, 2, 5, 'r');
        p.line(13, 14, 15, 16, 'X');
      } else {
        p.rect(2, 10, 2, 5, 'r').rect(12, 5, 2, 5, 'r');
        p.line(13, 4, 15, 0, 'X');
      }
    },
  },
  caja: {
    w: 16,
    h: 22,
    frames: 3,
    paint: (p, f) => {
      // 0 cerrada, 1 a punto, 2 abierta
      const by = 10;
      p.rect(2, by, 12, 11, 'p').rect(2, by, 12, 2, 'P');
      p.rect(2, by + 10, 12, 1, 'y').rect(2, by + 2, 1, 9, 'y').rect(13, by + 2, 1, 9, 'y');
      p.rect(6, by + 4, 4, 4, 'y').px(7, by + 5, 'R').px(8, by + 6, 'R');
      p.rect(14, by + 4, 2, 1, 'x').rect(15, by + 2, 1, 3, 'x');
      if (f === 0) p.rect(1, by - 1, 14, 2, 'P');
      if (f === 1) p.rect(1, by - 3, 14, 2, 'P').rect(6, by - 1, 4, 1, 'w');
      if (f === 2) {
        p.line(0, by - 1, 3, by - 4, 'P');
        for (let y = by - 1; y > 6; y -= 2) p.rect(6 + ((y / 2) % 2), y, 3, 1, 'x');
        p.disc(7.5, 4, 4, 'w');
        p.rect(4, 0, 8, 2, 'P').px(3, 1, 'y').px(12, 1, 'y');
        p.px(6, 3, 'k').px(9, 3, 'k');
        p.line(5, 6, 10, 6, 'R').px(4, 5, 'R').px(11, 5, 'R');
        p.px(6, 7, 'W').px(9, 7, 'W');
      }
    },
  },
  monociclista: {
    w: 16,
    h: 22,
    frames: 2,
    paint: (p, f) => {
      p.disc(7.5, 17.5, 4, 'S').disc(7.5, 17.5, 2.5, 'g').px(7, 17, 'k');
      if (f === 0) p.line(5, 17, 10, 17, 'S');
      else p.line(7, 15, 7, 20, 'S');
      p.rect(7, 11, 1, 3, 'x');
      p.rect(5, 6, 6, 6, 'B').stripesH(5, 6, 6, 6, 'B', 'b', 2);
      p.rect(3, 7, 2, 1, 'B').rect(11, 7, 2, 1, 'B');
      p.disc(7.5, 3.5, 3, 'w').px(6, 3, 'k').px(9, 3, 'k').px(7, 5, 'R').px(8, 5, 'R');
      p.px(4, 1, 'V').px(11, 1, 'V').rect(3, 2, 2, 2, 'V').rect(11, 2, 2, 2, 'V');
    },
  },
  tragafuegos: {
    w: 16,
    h: 18,
    frames: 2,
    paint: (p, f) => {
      p.disc(7.5, 4.5, 3.5, 'N').px(6, 1, 'n').px(9, 2, 'n');
      p.px(6, 4, 'k').px(9, 4, 'k');
      if (f === 0) p.rect(6, 6, 4, 1, 'k');
      else p.ellipse(7.5, 7, 2, 1.5, 'k');
      p.stripesH(4, 9, 8, 6, 'R', 'o', 2);
      p.rect(2, 10, 2, 4, 'N').rect(12, 10, 2, 4, 'N');
      p.rect(5, 15, 2, 3, 'k').rect(9, 15, 2, 3, 'k');
      p.rect(13, 8, 1, 4, 'n');
      if (f === 0) p.px(13, 7, 'y').px(13, 6, 'o');
    },
  },
  pulga: {
    w: 16,
    h: 14,
    frames: 2,
    paint: (p, f) => {
      const oy = f === 1 ? -2 : 0;
      p.ellipse(8, 7 + oy, 5.5, 4, 'n').ellipse(7, 5 + oy, 3, 1.5, 'N');
      p.disc(3, 7 + oy, 2.2, 'n').px(2, 6 + oy, 'R');
      p.rect(9, 1 + oy, 4, 2, 'R').px(11, 0 + oy, 'y'); // gorrito
      if (f === 0) {
        p.line(5, 10, 3, 13, 'k').line(8, 11, 8, 13, 'k').line(11, 10, 14, 13, 'k');
      } else {
        p.line(5, 8, 2, 12, 'k').line(11, 8, 15, 12, 'k').line(8, 9, 8, 12, 'k');
      }
    },
  },
  // Familiares
  globo_perro: {
    w: 14,
    h: 12,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(6.5, 5, 4, 2.5, 'm').disc(11, 3, 2.5, 'm').disc(2, 3, 1.5, 'm');
      p.rect(4, 7, 2, 3 + f, 'm').rect(8, 7, 2, 4 - f, 'm');
      p.px(12, 2, 'k').px(11, 1, 'W').px(5, 4, 'W');
    },
  },
  mono_juguete: {
    w: 12,
    h: 14,
    frames: 2,
    paint: (p, f) => {
      p.disc(5.5, 9, 3.5, 'N').disc(5.5, 4, 3, 'N').ellipse(5.5, 5, 2, 1.5, 'm');
      p.px(4, 3, 'k').px(7, 3, 'k');
      p.rect(10, 7 + f, 2, 2, 'x').px(11, 6 + f, 'x'); // llave de cuerda
      p.rect(3, 12, 2, 2, 'n').rect(7, 12, 2, 2, 'n');
    },
  },
  pulga_fiel: {
    w: 10,
    h: 8,
    frames: 2,
    paint: (p, f) => {
      p.ellipse(5, 4 - f, 3.5, 2.5, 'N').px(2, 3 - f, 'k').rect(5, 0, 2, 1, 'B');
      p.line(3, 6, 2, 7, 'k').line(7, 6, 8, 7, 'k');
    },
  },

  // --- Jefes ---
  forzudo: {
    w: 40,
    h: 40,
    frames: 3,
    paint: (p, f) => {
      // 0 quieto, 1 brazos arriba, 2 agachado (pisotón)
      const oy = f === 2 ? 3 : 0;
      // piernas
      p.rect(12, 30, 6, 10, 'N').rect(22, 30, 6, 10, 'N');
      p.rect(11, 37, 8, 3, 'k').rect(21, 37, 8, 3, 'k');
      // malla de leopardo
      p.ellipse(19.5, 23 + oy, 11, 10, 'y');
      for (const [x, y] of [
        [12, 18], [17, 22], [24, 17], [26, 25], [14, 28], [21, 28], [19, 15],
      ])
        p.disc(x, y + oy, 1.3, 'n');
      p.rect(9, 30 + oy, 22, 2, 'n');
      // cabeza pequeña
      p.disc(19.5, 9 + oy, 5, 'N').rect(14, 4 + oy, 11, 2, 'n');
      p.px(17, 8 + oy, 'k').px(22, 8 + oy, 'k').px(17, 7 + oy, 'k').px(22, 7 + oy, 'k');
      p.rect(15, 11 + oy, 10, 2, 'k').px(14, 10 + oy, 'k').px(25, 10 + oy, 'k');
      // brazos
      if (f === 1) {
        p.ellipse(6, 10, 4, 9, 'N').ellipse(33, 10, 4, 9, 'N');
        p.disc(6, 2, 3, 'N').disc(33, 2, 3, 'N');
      } else {
        p.ellipse(6, 22 + oy, 4.5, 9, 'N').ellipse(33, 22 + oy, 4.5, 9, 'N');
        p.disc(5, 31 + oy, 3, 'N').disc(34, 31 + oy, 3, 'N');
        p.px(5, 19 + oy, 'n').px(34, 19 + oy, 'n');
      }
    },
  },
  siames_a: {
    w: 22,
    h: 26,
    frames: 2,
    paint: (p, f) => siames(p, f, 'R', 'r'),
  },
  siames_b: {
    w: 22,
    h: 26,
    frames: 2,
    paint: (p, f) => siames(p, f, 'B', 'b'),
  },
  // --- Nuevas del Acto I ---
  // Vendedor de globos: gorra a rayas, delantal y un ramo de globos (1 = soltando uno).
  globero: {
    w: 18,
    h: 24,
    frames: 2,
    paint: (p, f) => {
      // Ramo de globos sobre la cabeza.
      const lift = f === 1 ? 1 : 0;
      p.line(13, 9, 11, 4 - lift, 'w').line(13, 9, 15, 3 - lift, 'w').line(13, 9, 16, 6 - lift, 'w');
      p.ellipse(11, 3 - lift, 2.5, 3, 'P').px(10, 2 - lift, 'h');
      p.ellipse(15, 2 - lift, 2.5, 3, 'R').px(14, 1 - lift, 'm');
      if (f === 0) p.ellipse(16.5, 6, 1.5, 2.5, 'V');
      // Cabeza y gorra.
      p.disc(6.5, 11, 3.5, 'w');
      p.stripesV(3, 6, 7, 3, 'R', 'W', 1).rect(2, 8, 9, 1, 'R');
      p.px(5, 11, 'k').px(8, 11, 'k').rect(5, 13, 4, 1, 'r');
      // Cuerpo con delantal.
      p.rect(3, 15, 8, 6, 'b').rect(5, 15, 4, 6, 'w');
      p.rect(11, 14, 2, 4, 'b').px(12, 9, 'w').rect(12, 10, 1, 5, 'w');
      p.rect(1, 15, 2, 4, 'b');
      p.rect(4, 21, 2, 3, 'k').rect(8, 21, 2, 3, 'k');
    },
  },
  // Globo suelto: un globo con sonrisa torcida (1 = a punto de reventar).
  globoSuelto: {
    w: 12,
    h: 16,
    frames: 2,
    paint: (p, f) => {
      const c = f === 1 ? 'm' : 'P';
      p.ellipse(5.5, 5.5, 5, 5.5, c).ellipse(4, 3.5, 1.5, 2, 'h');
      p.px(3, 5, 'k').px(7, 5, 'k');
      p.line(3, 8, 5, 9, 'k').line(5, 9, 8, 7, 'k');
      p.px(5, 11, c).px(6, 11, c).line(6, 12, 5, 15, 'w');
    },
  },
  // Malabarista: traje de rombos (las mazas se dibujan aparte).
  malabarista: {
    w: 16,
    h: 18,
    frames: 2,
    paint: (p, f) => {
      p.disc(7.5, 5, 3.5, 'w');
      p.rect(4, 0, 8, 2, 'y').px(4, 2, 'y').px(11, 2, 'y');
      p.px(6, 5, 'k').px(9, 5, 'k').rect(6, 7, 4, 1, 'R');
      for (let y = 9; y < 15; y++) for (let x = 4; x < 12; x++) p.px(x, y, (x + y) % 4 < 2 ? 'o' : 'p');
      if (f === 0) p.rect(1, 9, 3, 2, 'w').rect(12, 9, 3, 2, 'w');
      else p.rect(1, 6, 3, 2, 'w').rect(12, 6, 3, 2, 'w');
      p.rect(5, 15, 2, 3, 'k').rect(9, 15, 2, 3, 'k');
    },
  },
  maza: {
    w: 6,
    h: 10,
    paint: (p) => {
      p.ellipse(2.5, 3.5, 2.5, 3.5, 'W').rect(2, 6, 2, 3, 'R').px(2, 9, 'y').px(3, 9, 'y');
      p.px(1, 2, 'R').px(3, 3, 'R');
    },
  },
  // Perrito amaestrado: 0-1 corriendo, 2 ladrando (aviso del mordisco).
  perrito: {
    w: 16,
    h: 12,
    frames: 3,
    paint: (p, f) => {
      p.ellipse(7, 7, 5, 3, 'G').rect(3, 6, 2, 2, 'w');
      p.disc(12.5, 4.5, 2.5, 'G').px(13, 4, 'k').rect(14, 5, 2, 1, 'k');
      p.px(11, 1, 'g').px(11, 2, 'g').px(10, 2, 'g');
      p.rect(9, 7, 2, 1, 'R').px(10, 8, 'y'); // collar
      p.line(2, 6, 0, 4, 'G');
      // Gorrito de circo.
      p.px(13, 1, 'R').px(13, 0, 'y').px(12, 2, 'R').px(14, 2, 'R');
      const leg = f === 1 ? 1 : 0;
      p.rect(4 + leg, 10, 1, 2, 'g').rect(9 - leg, 10, 1, 2, 'g');
      if (f === 2) p.rect(14, 6, 2, 2, 'm').px(15, 3, 'W');
    },
  },
};

function siames(p: Pix, f: number, a: string, b: string): void {
  // Gemelo acróbata con cuello de gorguera y sonrisa cosida.
  p.rect(6, 21, 4, 5, 'k').rect(12, 21, 4, 5, 'k');
  p.stripesV(4, 11, 14, 11, a, b, 2);
  p.rect(1, 12, 3, 7, a).rect(18, 12, 3, 7, a);
  if (f === 1) p.rect(18, 6, 3, 6, a);
  p.ellipse(10.5, 10.5, 8, 1.8, 'W');
  p.disc(10.5, 5, 5, 'w');
  p.px(8, 4, 'k').px(13, 4, 'k').px(8, 3, 'k').px(13, 3, 'k');
  p.line(7, 7, 14, 7, 'R');
  for (let x = 8; x <= 13; x += 2) p.px(x, 8, 'k');
  p.rect(5, 0, 11, 2, a).px(4, 1, 'y').px(16, 1, 'y');
}
