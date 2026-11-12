// Salas a oscuras: una capa negra con agujeros de luz alrededor del payaso, de
// los focos y de los avisos. Va por debajo de los disparos, que siempre se ven,
// y encima dibuja los ojos de las criaturas.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { ROOM_H, ROOM_W } from '../config';

export interface Light {
  x: number;
  y: number;
  r: number;
}

/** Hornea discos de luz con borde tramado (estética de píxel). */
export function bakeLights(scene: Phaser.Scene): void {
  for (const r of [16, 24, 32, 44, 56]) {
    const key = `luz${r}`;
    if (scene.textures.exists(key)) continue;
    const size = r * 2;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
        // Centro lleno, borde tramado.
        const v = d < 0.6 ? 1 : d > 1 ? 0 : 1 - (d - 0.6) / 0.4;
        const on = v * 16 > bayer[(y % 4) * 4 + (x % 4)];
        img.data[(y * size + x) * 4 + 3] = on ? 255 : 0;
      }
    ctx.putImageData(img, 0, 0);
    scene.textures.addCanvas(key, c);
  }
}

function lightRadius(r: number): number {
  for (const k of [16, 24, 32, 44, 56]) if (r <= k) return k;
  return 56;
}

export class Oscuridad {
  private rt: Phaser.GameObjects.RenderTexture;
  /** Luces extra que se añaden por fotograma (focos, fuegos...). */
  extra: Light[] = [];
  /** 0 = sin oscuridad, 1 = negro. */
  level = 0.93;

  constructor(private sc: GameScene) {
    this.rt = sc.add.renderTexture(0, 0, ROOM_W, ROOM_H).setOrigin(0).setDepth(300);
    sc.roomObjs.push(this.rt);
  }

  update(): void {
    const sc = this.sc;
    const rt = this.rt;
    rt.clear();
    rt.fill(0x05030a, this.level);
    const lights: Light[] = [{ x: sc.player.x, y: sc.player.y - 4, r: 44 }, ...sc.telegraph.lights(), ...this.extra];
    for (const h of sc.hazards) lights.push({ x: h.x, y: h.y, r: 16 });
    for (const l of lights) {
      const k = lightRadius(l.r);
      rt.erase(`luz${k}`, l.x - k, l.y - k);
    }
    // Los ojos de las criaturas brillan en la oscuridad.
    for (const e of sc.targets()) rt.draw('ojos', e.x - 3, e.y - e.height / 2 + 2);
    this.extra = [];
  }

  destroy(): void {
    this.rt.destroy();
  }
}
