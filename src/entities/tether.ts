// Cuerdas e hilos entre dos criaturas (los Siameses, el ventrílocuo y su muñeco...).
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';

export interface TetherOpts {
  /** Colores de la cuerda: grosor 2 y hebra de 1. */
  color: number;
  inner?: number;
  width?: number;
  /** Medios globos que quita al tocarla (0 = inofensiva). */
  damage?: number;
  /** Cuánto cuelga cuando los extremos están cerca. */
  sag?: number;
  /** Nombre para el resumen si te tumba. */
  cause?: string;
  /** Si devuelve false, la cuerda no se dibuja este fotograma. */
  visible?: () => boolean;
}

type Point = { x: number; y: number; active: boolean };

/** Dibuja una cuerda con comba entre `a` y `b` cada fotograma de la sala. */
export function addTether(sc: GameScene, a: Point & { dead?: boolean }, b: Point & { dead?: boolean }, o: TetherOpts): void {
  const gfx = sc.add.graphics().setDepth(DEPTH.world - 1);
  sc.roomObjs.push(gfx);
  const sagMax = o.sag ?? 30;
  sc.roomUpdate.push(() => {
    gfx.clear();
    if (!a.active || !b.active || a.dead || b.dead) return;
    if (o.visible && !o.visible()) return;
    const x0 = a.x, y0 = a.y + 2, x1 = b.x, y1 = b.y + 2;
    const sag = Math.max(0, sagMax - Phaser.Math.Distance.Between(x0, y0, x1, y1) * 0.3);
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x0, y0),
      new Phaser.Math.Vector2((x0 + x1) / 2, (y0 + y1) / 2 + sag),
      new Phaser.Math.Vector2(x1, y1),
    );
    gfx.lineStyle(o.width ?? 2, o.color, 1);
    curve.draw(gfx, 16);
    if (o.inner !== undefined) {
      gfx.lineStyle(1, o.inner, 1);
      curve.draw(gfx, 16);
    }
    if (!o.damage) return;
    const p = sc.player;
    for (const pt of curve.getPoints(12)) {
      if (Math.abs(pt.x - p.x) < 5 && Math.abs(pt.y - p.y) < 5) {
        sc.hurtPlayer(o.damage, pt.x, pt.y, { cause: o.cause });
        break;
      }
    }
  });
}
