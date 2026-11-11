// Navegación por la rejilla de la sala: campo de distancias hacia el jugador.
import { COLS, ROWS, tileX, tileY, toCol, toRow } from '../config';

export class Nav {
  /** true = baldosa bloqueada para criaturas de suelo. */
  blocked: boolean[] = new Array(COLS * ROWS).fill(false);
  private dist: Int16Array = new Int16Array(COLS * ROWS);
  private targetTile = -1;

  setBlocked(c: number, r: number, v: boolean): void {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    this.blocked[c + r * COLS] = v;
    this.targetTile = -1;
  }

  isBlocked(c: number, r: number): boolean {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    return this.blocked[c + r * COLS];
  }

  private rebuild(tc: number, tr: number): void {
    const idx = tc + tr * COLS;
    if (idx === this.targetTile) return;
    this.targetTile = idx;
    this.dist.fill(-1);
    const q: number[] = [idx];
    this.dist[idx] = 0;
    while (q.length) {
      const i = q.shift()!;
      const c = i % COLS,
        r = Math.floor(i / COLS);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc,
          nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const ni = nc + nr * COLS;
        if (this.dist[ni] !== -1 || this.blocked[ni]) continue;
        this.dist[ni] = this.dist[i] + 1;
        q.push(ni);
      }
    }
  }

  /** Siguiente punto hacia el que caminar para llegar a (tx, ty). */
  nextStep(x: number, y: number, tx: number, ty: number): { x: number; y: number } {
    if (this.lineFree(x, y, tx, ty)) return { x: tx, y: ty };
    const tc = clampC(toCol(tx)),
      tr = clampR(toRow(ty));
    this.rebuild(tc, tr);
    const c = clampC(toCol(x)),
      r = clampR(toRow(y));
    let best = { c, r, d: this.dist[c + r * COLS] };
    if (best.d === -1) best.d = 9999;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc,
        nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      // Las diagonales solo si no se cortan esquinas.
      if (dc && dr && (this.isBlocked(c + dc, r) || this.isBlocked(c, r + dr))) continue;
      const d = this.dist[nc + nr * COLS];
      if (d >= 0 && d < best.d) best = { c: nc, r: nr, d };
    }
    if (best.c === c && best.r === r) return { x: tx, y: ty };
    return { x: tileX(best.c), y: tileY(best.r) };
  }

  /** ¿Hay línea recta libre entre dos puntos (para criaturas de suelo)? */
  lineFree(x0: number, y0: number, x1: number, y1: number): boolean {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = x0 + (x1 - x0) * t,
        y = y0 + (y1 - y0) * t;
      // Comprueba un pequeño margen a cada lado.
      for (const [ox, oy] of [[0, 0], [5, 0], [-5, 0], [0, 4], [0, -4]]) {
        if (this.isBlocked(toCol(x + ox), toRow(y + oy)) && inside(x + ox, y + oy)) return false;
      }
    }
    return true;
  }

  randomFreeTile(x: number, y: number, radius: number): { x: number; y: number } {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * radius;
      const c = clampC(toCol(x + Math.cos(a) * d)),
        r = clampR(toRow(y + Math.sin(a) * d));
      if (!this.isBlocked(c, r)) return { x: tileX(c), y: tileY(r) };
    }
    return { x, y };
  }

  freeTiles(): { c: number; r: number }[] {
    const out: { c: number; r: number }[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!this.isBlocked(c, r)) out.push({ c, r });
    return out;
  }
}

const clampC = (c: number) => Math.max(0, Math.min(COLS - 1, c));
const clampR = (r: number) => Math.max(0, Math.min(ROWS - 1, r));
const inside = (x: number, y: number) => {
  const c = toCol(x),
    r = toRow(y);
  return c >= 0 && r >= 0 && c < COLS && r < ROWS;
};
