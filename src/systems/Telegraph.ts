// Avisos de ataque dibujados en el suelo: líneas, círculos, marcas y franjas.
// Van con el reloj del juego (dt), así que se congelan con la parada de impacto
// y funcionan con el avance por fotogramas de las pruebas.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';

type Shape =
  | { k: 'line'; x0: number; y0: number; x1: number; y1: number; w: number }
  | { k: 'circle'; x: number; y: number; r: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number };

interface Warn {
  shape: Shape;
  t: number;
  dur: number;
  color: number;
  owner?: { active: boolean; dead?: boolean };
  onDone?: () => void;
}

export interface WarnOpts {
  color?: number;
  /** Si el dueño muere, el aviso desaparece sin disparar `onDone`. */
  owner?: { active: boolean; dead?: boolean };
  onDone?: () => void;
}

export class Telegraph {
  private list: Warn[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(sc: GameScene) {
    this.gfx = sc.add.graphics().setDepth(DEPTH.hazard + 0.5);
  }

  line(x0: number, y0: number, x1: number, y1: number, dur: number, o: WarnOpts & { w?: number } = {}): void {
    this.add({ k: 'line', x0, y0, x1, y1, w: o.w ?? 8 }, dur, o);
  }

  circle(x: number, y: number, r: number, dur: number, o: WarnOpts = {}): void {
    this.add({ k: 'circle', x, y, r }, dur, o);
  }

  /** Marca de una baldosa (o de un punto con radio pequeño). */
  marker(x: number, y: number, dur: number, o: WarnOpts = {}): void {
    this.add({ k: 'circle', x, y, r: 7 }, dur, o);
  }

  rect(x: number, y: number, w: number, h: number, dur: number, o: WarnOpts = {}): void {
    this.add({ k: 'rect', x, y, w, h }, dur, o);
  }

  private add(shape: Shape, dur: number, o: WarnOpts): void {
    this.list.push({ shape, t: 0, dur, color: o.color ?? 0xd4323f, owner: o.owner, onDone: o.onDone });
  }

  /** Puntos de luz para las salas a oscuras: los avisos siempre se ven. */
  lights(): { x: number; y: number; r: number }[] {
    return this.list.map((w) => {
      const s = w.shape;
      if (s.k === 'circle') return { x: s.x, y: s.y, r: s.r + 8 };
      if (s.k === 'rect') return { x: s.x + s.w / 2, y: s.y + s.h / 2, r: Math.max(s.w, s.h) / 2 };
      return { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2, r: 14 };
    });
  }

  get count(): number {
    return this.list.length;
  }

  update(dt: number): void {
    const g = this.gfx;
    g.clear();
    const done: Warn[] = [];
    this.list = this.list.filter((w) => {
      if (w.owner && (!w.owner.active || w.owner.dead)) return false;
      w.t += dt;
      if (w.t >= w.dur) {
        done.push(w);
        return false;
      }
      return true;
    });
    for (const w of this.list) {
      const k = w.t / w.dur;
      // Parpadeo que acelera al acercarse el golpe.
      const blink = Math.sin(w.t * (10 + k * 30)) > 0 ? 1 : 0.55;
      const a = (0.18 + 0.32 * k) * blink;
      const s = w.shape;
      g.fillStyle(w.color, a);
      g.lineStyle(1, w.color, Math.min(1, a + 0.35));
      if (s.k === 'circle') {
        g.fillCircle(s.x, s.y, s.r * (0.4 + 0.6 * Math.min(1, k * 1.5)));
        g.strokeCircle(s.x, s.y, s.r);
      } else if (s.k === 'rect') {
        g.fillRect(s.x, s.y, s.w, s.h);
        g.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
      } else {
        const ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
        const nx = -Math.sin(ang) * (s.w / 2),
          ny = Math.cos(ang) * (s.w / 2);
        g.fillPoints(
          [
            new Phaser.Math.Vector2(s.x0 + nx, s.y0 + ny),
            new Phaser.Math.Vector2(s.x1 + nx, s.y1 + ny),
            new Phaser.Math.Vector2(s.x1 - nx, s.y1 - ny),
            new Phaser.Math.Vector2(s.x0 - nx, s.y0 - ny),
          ],
          true,
        );
      }
    }
    for (const w of done) w.onDone?.();
  }

  clear(): void {
    this.list = [];
    this.gfx.clear();
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
