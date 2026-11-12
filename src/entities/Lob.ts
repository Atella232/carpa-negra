// Proyectil en parábola: vuela por encima de todo hasta una marca en el suelo
// (tartas del Augusto, tomates del público, cartas de Madame Fortuna...).
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';

export interface LobOpts {
  texture: string;
  /** Segundos de vuelo. */
  dur: number;
  /** Altura máxima del arco en píxeles. */
  height?: number;
  /** Medios globos si cae encima del payaso (0 = no hace daño directo). */
  halves?: number;
  /** Radio del golpe al caer. */
  radius?: number;
  onLand?: (x: number, y: number) => void;
  /** Color del aviso en el suelo. */
  color?: number;
  spin?: boolean;
}

export function lob(sc: GameScene, fx: number, fy: number, tx: number, ty: number, o: LobOpts): void {
  const img = sc.add.image(fx, fy, o.texture).setDepth(DEPTH.shot);
  const shadow = sc.add.image(fx, fy, 'sombra').setDepth(DEPTH.shadow).setAlpha(0.7).setScale(0.6);
  sc.roomObjs.push(img, shadow);
  sc.telegraph.circle(tx, ty, o.radius ?? 9, o.dur, { color: o.color ?? 0xd4323f });
  const h = o.height ?? 40;
  let t = 0;
  const step = (dt: number) => {
    if (!img.active) return;
    t += dt;
    const k = Math.min(1, t / o.dur);
    const x = fx + (tx - fx) * k,
      y = fy + (ty - fy) * k;
    img.setPosition(x, y - Math.sin(k * Math.PI) * h);
    if (o.spin) img.setRotation(img.rotation + dt * 10);
    shadow.setPosition(x, y + 2).setScale(0.4 + 0.4 * k);
    if (k >= 1) {
      img.destroy();
      shadow.destroy();
      const p = sc.player;
      if ((o.halves ?? 1) > 0 && Math.hypot(p.x - tx, p.y - ty) < (o.radius ?? 9) + 3) sc.hurtPlayer(o.halves ?? 1, tx, ty);
      o.onLand?.(tx, ty);
    }
  };
  sc.roomUpdate.push(step);
}
