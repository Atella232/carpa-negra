// Mini-API de dibujo píxel a píxel: todo se pinta con fillRect, sin suavizado.
import { PALETTE } from './palette';

const col = (c: string) => (c.startsWith('#') || c.startsWith('rgb') ? c : (PALETTE[c] ?? c));

export class Pix {
  constructor(public ctx: CanvasRenderingContext2D) {}

  px(x: number, y: number, c: string): this {
    this.ctx.fillStyle = col(c);
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    this.ctx.fillStyle = col(c);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }

  /** Círculo relleno; cx/cy pueden ser medios píxeles para tamaños pares. */
  disc(cx: number, cy: number, r: number, c: string): this {
    return this.ellipse(cx, cy, r, r, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    this.ctx.fillStyle = col(c);
    const x0 = Math.floor(cx - rx),
      x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry),
      y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx - 0.5) / (rx + 0.35);
        const dy = (y + 0.5 - cy - 0.5) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.ctx.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }

  /** Anillo (circunferencia de grosor 1). */
  ring(cx: number, cy: number, r: number, c: string): this {
    this.ctx.fillStyle = col(c);
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r + 0.5 && d > r - 0.6) this.ctx.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    this.ctx.fillStyle = col(c);
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Dibuja una matriz ASCII de la paleta. */
  ascii(rows: string[], ox = 0, oy = 0): this {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        if (!PALETTE[ch]) continue;
        this.ctx.fillStyle = PALETTE[ch];
        this.ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
    return this;
  }

  /** Rayas horizontales alternas dentro de un rectángulo. */
  stripesH(x: number, y: number, w: number, h: number, a: string, b: string, size = 1): this {
    for (let i = 0; i < h; i++) this.rect(x, y + i, w, 1, Math.floor(i / size) % 2 === 0 ? a : b);
    return this;
  }

  stripesV(x: number, y: number, w: number, h: number, a: string, b: string, size = 1): this {
    for (let i = 0; i < w; i++) this.rect(x + i, y, 1, h, Math.floor(i / size) % 2 === 0 ? a : b);
    return this;
  }

  clear(x: number, y: number, w = 1, h = 1): this {
    this.ctx.clearRect(x, y, w, h);
    return this;
  }
}

/** Añade un contorno de 1 px alrededor de los píxeles opacos de una región. */
export function outlineRegion(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color = PALETTE.k,
): void {
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
  const marks: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        marks.push(x, y);
      }
    }
  }
  ctx.fillStyle = color;
  for (let i = 0; i < marks.length; i += 2) ctx.fillRect(x0 + marks[i], y0 + marks[i + 1], 1, 1);
}
