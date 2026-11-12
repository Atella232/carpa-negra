// Salas: suelo de serrín, paredes de lona, obstáculos, puertas y mobiliario.
import Phaser from 'phaser';
import { ascii, bakeCanvas, SpriteDef } from '../bake';
import { Pix } from '../pix';
import { Rng } from '../../core/rng';

export const ROOM_W = 240;
export const ROOM_H = 144;
export const TILE = 16;

export type FloorStyle =
  | 'normal'
  | 'inicio'
  | 'jefe'
  | 'camerino'
  | 'puesto'
  | 'diana'
  | 'barraca'
  | 'secreta'
  | 'contrato'
  | 'jaulas'
  | 'guarida'
  // Acto III
  | 'espejos'
  | 'mil_espejos'
  | 'pitonisa'
  | 'reto'
  // Acto IV
  | 'pista'
  | 'pista_central';

const STYLE: Record<FloorStyle, {
  floor: string; dot: string; stripeA: string; stripeB: string; ring?: string; bars?: boolean; straw?: boolean;
  /** Suelo ajedrezado (Acto III). */
  checker?: string;
  /** Marcos de espejo en las paredes (Acto III). */
  frames?: boolean;
  /** Gradas con público en las paredes (Acto IV). */
  crowd?: boolean;
}> = {
  espejos: { floor: '#1d1424', dot: '#2e1f38', stripeA: '#4a2f5c', stripeB: '#1d1424', checker: '#2a1d36', frames: true },
  mil_espejos: { floor: '#120c16', dot: '#1d1424', stripeA: '#7a4a8c', stripeB: '#120c16', checker: '#1d1424', frames: true, ring: '#c9b3ef' },
  pitonisa: { floor: '#2a1430', dot: '#3a1d44', stripeA: '#4a2f5c', stripeB: '#1d1424', ring: '#c9b3ef' },
  reto: { floor: '#3a1a10', dot: '#4f2614', stripeA: '#8f1d2c', stripeB: '#1d1424', ring: '#e8743b' },
  pista: { floor: '#6b4a2a', dot: '#8a6236', stripeA: '#8f1d2c', stripeB: '#efe6d8', crowd: true },
  pista_central: { floor: '#5a3b20', dot: '#7a5233', stripeA: '#8f1d2c', stripeB: '#f2c14e', ring: '#f2c14e', crowd: true },
  jaulas: { floor: '#4a4020', dot: '#6b5a28', stripeA: '#1f3320', stripeB: '#0f1a12', bars: true, straw: true },
  guarida: { floor: '#3a2a14', dot: '#54401c', stripeA: '#2a1a0c', stripeB: '#0f0a06', ring: '#6b1a24', bars: true, straw: true },
  normal: { floor: '#5a3b25', dot: '#7a5233', stripeA: '#5e1420', stripeB: '#2a1430' },
  inicio: { floor: '#5a3b25', dot: '#7a5233', stripeA: '#5e1420', stripeB: '#2a1430', ring: '#8f1d2c' },
  jefe: { floor: '#3e2418', dot: '#5a3020', stripeA: '#3a0c14', stripeB: '#150a12', ring: '#5e1420' },
  camerino: { floor: '#4a2f5c', dot: '#5c3c70', stripeA: '#6b5020', stripeB: '#2e1f38' },
  puesto: { floor: '#3d4a2a', dot: '#4f5e36', stripeA: '#2f6b3a', stripeB: '#1a2a1a' },
  diana: { floor: '#4a2a2a', dot: '#5e3434', stripeA: '#6b1a24', stripeB: '#efe6d8' },
  barraca: { floor: '#2b3550', dot: '#384466', stripeA: '#7a5a10', stripeB: '#1a2038' },
  secreta: { floor: '#2a2230', dot: '#382d40', stripeA: '#1d1424', stripeB: '#120c16' },
  contrato: { floor: '#1a0a10', dot: '#2a0e18', stripeA: '#3a0c14', stripeB: '#0b0710', ring: '#8f1d2c' },
};

/** Fondo completo de la sala (suelo + paredes), único por sala. */
export function bakeRoomBackground(
  scene: Phaser.Scene,
  key: string,
  style: FloorStyle,
  seed: number,
): void {
  const s = STYLE[style];
  const rng = new Rng(seed);
  bakeCanvas(scene, key, ROOM_W, ROOM_H, (p) => {
    // Suelo de serrín con motas.
    p.rect(0, 0, ROOM_W, ROOM_H, s.floor);
    for (let i = 0; i < 520; i++) {
      p.px(rng.int(16, ROOM_W - 17), rng.int(16, ROOM_H - 17), rng.chance(0.7) ? s.dot : '#2e1c12');
    }
    // Suelo ajedrezado (Acto III).
    if (s.checker) {
      for (let y = 16; y < ROOM_H - 16; y += 16)
        for (let x = 16; x < ROOM_W - 16; x += 16) if (((x + y) / 16) % 2 === 0) p.rect(x, y, 16, 16, s.checker);
      for (let i = 0; i < 40; i++) p.px(rng.int(16, ROOM_W - 17), rng.int(16, ROOM_H - 17), '#c9b3ef');
    }
    // Paja esparcida por el suelo (Acto II).
    if (s.straw) {
      for (let i = 0; i < 70; i++) {
        const x = rng.int(18, ROOM_W - 22),
          y = rng.int(18, ROOM_H - 20);
        p.line(x, y, x + rng.int(-3, 3), y + rng.int(1, 3), rng.chance(0.5) ? '#c9a24a' : '#8a6a2a');
      }
    }
    // Manchas viejas en el suelo (no todas las salas).
    const stains = rng.int(0, 3);
    for (let i = 0; i < stains; i++) {
      p.ellipse(rng.int(30, 210), rng.int(30, 115), rng.int(3, 8), rng.int(2, 4), 'rgba(40,8,16,0.45)');
    }
    if (s.ring) {
      p.ring(120, 72, 42, s.ring);
      p.ring(120, 72, 40, s.ring);
    }
    // Paredes de lona: rayas que convergen hacia el centro.
    paintWalls(p, s.stripeA, s.stripeB);
    // Barrotes de hierro sobre la lona (Acto II).
    if (s.bars) {
      for (let x = 4; x < ROOM_W; x += 8) {
        p.rect(x, 0, 2, 14, '#55505e');
        p.rect(x, ROOM_H - 14, 2, 14, '#55505e');
        p.px(x, 0, '#a3a0ad').px(x, ROOM_H - 14, '#a3a0ad');
      }
      for (let y = 20; y < ROOM_H - 16; y += 8) {
        p.rect(0, y, 14, 2, '#55505e');
        p.rect(ROOM_W - 14, y, 14, 2, '#55505e');
      }
    }
    // Marcos de espejo en las paredes (Acto III).
    if (s.frames) {
      for (let x = 24; x < ROOM_W - 24; x += 32) {
        if (Math.abs(x + 6 - ROOM_W / 2) < 14) continue;
        p.rect(x, 2, 12, 12, '#f2c14e').rect(x + 1, 3, 10, 10, '#c9b3ef').line(x + 2, 4, x + 8, 11, '#ffffff');
      }
    }
    // Gradas con público (Acto IV): siluetas y ojos que brillan.
    if (s.crowd) {
      for (let x = 2; x < ROOM_W - 2; x += 5) {
        if (Math.abs(x - ROOM_W / 2) < 12) continue;
        const h = rng.int(4, 7);
        p.rect(x, 14 - h, 4, h, '#0b0710').disc(x + 2, 14 - h, 2, '#0b0710');
        if (rng.chance(0.4)) p.px(x + 1, 14 - h, '#f2c14e').px(x + 3, 14 - h, '#f2c14e');
        const hb = rng.int(4, 7);
        p.rect(x, ROOM_H - 14, 4, hb, '#0b0710').disc(x + 2, ROOM_H - 14 + hb, 2, '#0b0710');
      }
    }
    // Sombra interior junto a las paredes.
    p.rect(16, 16, ROOM_W - 32, 3, 'rgba(0,0,0,0.35)');
    p.rect(16, 16, 3, ROOM_H - 32, 'rgba(0,0,0,0.25)');
    p.rect(ROOM_W - 19, 16, 3, ROOM_H - 32, 'rgba(0,0,0,0.25)');
  });
}

function paintWalls(p: Pix, a: string, b: string): void {
  const W = ROOM_W,
    H = ROOM_H,
    T = TILE;
  // Arriba y abajo: rayas verticales; laterales: horizontales.
  for (let x = 0; x < W; x++) {
    const c = Math.floor(x / 8) % 2 === 0 ? a : b;
    p.rect(x, 0, 1, T, c);
    p.rect(x, H - T, 1, T, c);
  }
  for (let y = T; y < H - T; y++) {
    const c = Math.floor(y / 8) % 2 === 0 ? a : b;
    p.rect(0, y, T, 1, c);
    p.rect(W - T, y, T, 1, c);
  }
  // Ribete dorado y esquinas.
  p.rect(T - 2, T - 2, W - 2 * T + 4, 2, '#6b5020');
  p.rect(T - 2, H - T, W - 2 * T + 4, 2, '#6b5020');
  p.rect(T - 2, T - 2, 2, H - 2 * T + 4, '#6b5020');
  p.rect(W - T, T - 2, 2, H - 2 * T + 4, '#6b5020');
  for (const [cx, cy] of [
    [7.5, 7.5],
    [W - 8.5, 7.5],
    [7.5, H - 8.5],
    [W - 8.5, H - 8.5],
  ]) {
    p.disc(cx, cy, 5, '#1d1424').disc(cx, cy, 3, '#6b5020').disc(cx, cy, 1, '#f2c14e');
  }
  // Bombillas a lo largo de la pared superior.
  for (let x = 28; x < W - 20; x += 24) p.disc(x, 5, 1.2, '#f2c14e').px(x, 4, '#fff2a8');
}

// --- Obstáculos ---
const crate = (p: Pix, mark: boolean) => {
  p.rect(1, 2, 14, 13, 'n');
  p.rect(1, 2, 14, 2, 'N');
  p.rect(2, 5, 12, 1, 'k').rect(2, 10, 12, 1, 'k');
  p.rect(1, 2, 1, 13, 'N');
  if (mark) {
    // Estrella de "aquí hay algo".
    p.rect(7, 6, 2, 4, 'y').rect(5, 7, 6, 2, 'y').px(7, 7, 'Y');
  } else {
    p.line(3, 6, 12, 9, 'N').px(4, 12, 'N').px(11, 13, 'N');
  }
};

export const ROOM_SPRITES: Record<string, SpriteDef> = {
  cajon: { w: 16, h: 16, paint: (p) => crate(p, false) },
  cajon_marcado: { w: 16, h: 16, paint: (p) => crate(p, true) },
  bloque: {
    w: 16,
    h: 16,
    paint: (p) => {
      p.rect(0, 2, 16, 14, 's').rect(0, 2, 16, 2, 'g').rect(1, 4, 14, 11, 'S');
      p.px(2, 5, 'g').px(13, 5, 'g').px(2, 13, 'g').px(13, 13, 'g');
      p.rect(5, 7, 6, 4, 's');
    },
  },
  palomitas: {
    w: 16,
    h: 16,
    frames: 3,
    paint: (p, f) => {
      // Caja de palomitas a rayas; los fotogramas son daños crecientes.
      const top = 4 + f * 3;
      p.stripesV(3, 8, 10, 8, 'R', 'W', 2);
      p.rect(2, 7, 12, 1, 'r');
      for (let i = 0; i < 9 - f * 3; i++) {
        p.disc(4 + ((i * 5) % 9), top + ((i * 3) % 4), 1.5, i % 3 === 0 ? 'Y' : 'W');
      }
      if (f > 0) p.line(5, 10, 8, 14, 'k');
    },
  },
  tachuelas: {
    w: 16,
    h: 16,
    outline: false,
    paint: (p) => {
      p.rect(1, 1, 14, 14, 'rgba(0,0,0,0.25)');
      for (const [x, y] of [
        [3, 3], [8, 2], [12, 4], [5, 8], [10, 8], [3, 12], [8, 12], [13, 12],
      ]) {
        p.disc(x, y + 1, 1.5, 's').px(x, y, 'X').px(x, y - 1, 'G');
      }
    },
  },
  foso: {
    w: 16,
    h: 16,
    outline: false,
    paint: (p) => {
      p.rect(0, 0, 16, 16, '#0b0710');
      p.rect(0, 0, 16, 3, '#2e1c12');
      p.rect(0, 3, 16, 1, '#1d1424');
    },
  },
  brasero: {
    w: 16,
    h: 18,
    frames: 3,
    paint: (p, f) => {
      p.rect(3, 12, 10, 4, 's').rect(2, 11, 12, 2, 'g').rect(6, 16, 4, 2, 'S');
      const o = [0, 1, -1][f];
      p.ellipse(7.5 + o, 7, 4, 5, 'o').ellipse(7.5 - o, 8, 2.5, 3.5, 'y').ellipse(7.5, 9, 1.2, 2, 'Y');
    },
  },
  brasero_apagado: {
    w: 16,
    h: 18,
    paint: (p) => {
      p.rect(3, 12, 10, 4, 's').rect(2, 11, 12, 2, 'g').rect(6, 16, 4, 2, 'S');
      p.rect(5, 10, 6, 1, 'S');
    },
  },
  taburete: {
    w: 18,
    h: 12,
    paint: (p) => {
      // Taburete-tambor de domador: pedestal de los objetos.
      p.ellipse(8.5, 2.5, 8.5, 2.5, 'y');
      p.rect(1, 3, 17, 8, 'R');
      p.stripesV(1, 3, 17, 8, 'R', 'r', 3);
      p.rect(0, 3, 18, 1, 'Y').rect(0, 10, 18, 1, 'y');
      p.ellipse(8.5, 2, 6, 1.5, 'Y');
    },
  },
  trampilla: {
    w: 24,
    h: 16,
    frames: 2,
    paint: (p, f) => {
      if (f === 0) {
        p.rect(0, 0, 24, 16, 'n').stripesV(1, 1, 22, 14, 'n', 'N', 4).rect(10, 6, 4, 4, 'y');
      } else {
        p.rect(0, 0, 24, 16, '#0b0710').rect(1, 1, 22, 3, '#2e1c12');
        p.rect(4, 6, 16, 1, 's').rect(4, 10, 16, 1, 's').rect(4, 14, 16, 1, 's');
      }
    },
  },
  diana: {
    w: 28,
    h: 32,
    frames: 2,
    paint: (p, f) => {
      p.rect(13, 22, 2, 10, 'n');
      p.disc(13.5, 12.5, 12, 'W').disc(13.5, 12.5, 9, 'R').disc(13.5, 12.5, 6, 'W').disc(13.5, 12.5, 3, 'R');
      if (f === 1) {
        // Silueta de las muñecas del "voluntario".
        p.rect(3, 6, 3, 2, 'w').rect(21, 6, 3, 2, 'w');
      }
      p.px(5, 20, 'x').px(22, 4, 'x').line(20, 18, 24, 22, 'x');
    },
  },
  ruleta: {
    w: 32,
    h: 36,
    frames: 4,
    paint: (p, f) => {
      p.rect(14, 28, 4, 8, 'n').rect(8, 34, 16, 2, 'N');
      p.disc(15.5, 15.5, 15, 'y');
      const cols = ['R', 'W', 'B', 'W', 'V', 'W', 'P', 'W'];
      for (let i = 0; i < 8; i++) {
        const a0 = ((i + f * 0.5) / 8) * Math.PI * 2;
        for (let r = 2; r < 14; r++) {
          for (let t = 0; t < 6; t++) {
            const a = a0 + (t / 6) * ((Math.PI * 2) / 8);
            p.px(15.5 + Math.cos(a) * r, 15.5 + Math.sin(a) * r, cols[i]);
          }
        }
      }
      p.disc(15.5, 15.5, 2.5, 'y').px(15, 15, 'Y');
      p.rect(14, 0, 4, 3, 'R');
    },
  },
  cartel_maestro: {
    w: 26,
    h: 30,
    paint: (p) => {
      // El Maestro de Ceremonias, siempre sonriente.
      p.rect(8, 0, 10, 8, 'k').rect(5, 7, 16, 2, 'k').rect(8, 6, 10, 1, 'R');
      p.disc(12.5, 13.5, 5, 'w').px(10, 12, 'R').px(15, 12, 'R');
      p.line(9, 16, 16, 16, 'k').px(8, 15, 'k').px(17, 15, 'k');
      p.rect(5, 19, 16, 11, 'R').rect(11, 19, 4, 11, 'w').rect(12, 19, 2, 2, 'k');
      p.rect(3, 20, 2, 7, 'R').rect(21, 20, 2, 7, 'R');
    },
  },
  candado: ascii([['..xx..', '.x..x.', '.x..x.', 'yyyyyy', 'yyNNyy', 'yyNNyy', 'yyyyyy']]),
  grieta: {
    w: 16,
    h: 16,
    outline: false,
    paint: (p) => {
      p.line(3, 2, 7, 7, 'rgba(0,0,0,0.55)').line(7, 7, 6, 12, 'rgba(0,0,0,0.55)');
      p.line(7, 7, 12, 9, 'rgba(0,0,0,0.55)');
    },
  },
};

export type DoorStyle =
  | 'normal'
  | 'jefe'
  | 'camerino'
  | 'puesto'
  | 'diana'
  | 'barraca'
  | 'secreta'
  | 'contrato'
  | 'pitonisa'
  | 'reto';

/** Puertas: orientación "superior" (32×16); las demás se rotan. 0 abierta, 1 cerrada. */
export function doorSprite(style: DoorStyle): SpriteDef {
  const frame: Record<DoorStyle, { a: string; b: string; trim: string }> = {
    normal: { a: 'r', b: 'p', trim: 'y' },
    jefe: { a: 'e', b: 'K', trim: 'w' },
    camerino: { a: 'P', b: 'p', trim: 'Y' },
    puesto: { a: 'v', b: 'c', trim: 'y' },
    diana: { a: 'R', b: 'W', trim: 'y' },
    barraca: { a: 'b', b: 'B', trim: 'y' },
    secreta: { a: 'S', b: 's', trim: 'S' },
    contrato: { a: 'k', b: 'e', trim: 'R' },
    pitonisa: { a: 'p', b: 'h', trim: 'y' },
    reto: { a: 'o', b: 'R', trim: 'Y' },
  };
  const s = frame[style];
  return {
    w: 32,
    h: 16,
    frames: 2,
    outline: false,
    paint: (p, f) => {
      if (style === 'secreta') {
        // Agujero irregular en la lona.
        p.ellipse(15.5, 10, 9, 7, '#0b0710').ellipse(15.5, 12, 7, 6, '#0b0710');
        p.px(6, 5, 'S').px(25, 6, 'S').px(9, 3, 'S').px(22, 3, 'S');
        return;
      }
      // Marco
      p.rect(4, 0, 24, 16, s.trim);
      p.rect(6, 2, 20, 14, '#0b0710');
      if (f === 1) {
        // Cortinas cerradas.
        p.stripesV(6, 2, 10, 14, s.a, s.b, 2);
        p.stripesV(16, 2, 10, 14, s.b, s.a, 2);
        p.rect(15, 2, 2, 14, '#0b0710');
      } else {
        // Cortinas recogidas a los lados.
        p.stripesV(6, 2, 3, 14, s.a, s.b, 1);
        p.stripesV(23, 2, 3, 14, s.b, s.a, 1);
        p.rect(9, 2, 14, 14, '#120c16');
      }
      if (style === 'jefe') {
        for (const x of [2, 29]) p.disc(x + 0.5, 4, 2, 'w').px(x, 4, 'k').px(x + 1, 4, 'k');
        p.disc(15.5, 1.5, 2, 'w').px(15, 1, 'k').px(16, 1, 'k');
      }
      if (style === 'camerino') p.rect(14, 0, 4, 2, 'W').px(15, 0, 'y');
      if (style === 'puesto') p.rect(12, 0, 8, 2, 'y').rect(15, 0, 2, 2, 'R');
      if (style === 'barraca') for (let x = 5; x < 28; x += 4) p.px(x, 0, x % 8 === 1 ? 'W' : 'R');
      if (style === 'contrato') p.ellipse(15.5, 1, 3, 1.2, 'R').px(15, 1, 'k');
      if (style === 'pitonisa') p.disc(15.5, 1, 2, 'h').px(15, 0, 'W');
      if (style === 'reto') p.rect(15, 0, 2, 2, 'W').px(15, 0, 'R');
    },
  };
}
