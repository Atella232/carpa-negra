import Phaser from 'phaser';
import { bakeEverything } from '../art';
import { overrideList } from '../art/bake';
import { loadSave } from '../core/save';
import { setVolumes } from '../audio/sfx';
import { startRun } from './MenuScene';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Arranque');
  }

  preload(): void {
    // Arte de sustitución (si lo hay): se carga antes de dibujar el de código.
    for (const o of overrideList()) {
      if (o.frameW && o.frameH) this.load.spritesheet(o.key, o.url, { frameWidth: o.frameW, frameHeight: o.frameH });
      else this.load.image(o.key, o.url);
    }
  }

  create(): void {
    bakeEverything(this);
    const mk = (key: string, frames: number, rate: number) =>
      this.anims.create({
        key,
        frames: this.anims.generateFrameNames(key, { start: 0, end: frames - 1 }),
        frameRate: rate,
      });
    mk('salpicadura', 4, 20);
    mk('salpicadura_roja', 4, 20);
    mk('explosion', 6, 18);
    mk('onda', 4, 16);
    mk('crema', 3, 5);
    setVolumes(loadSave().settings);
    // ?jugar salta el menú (útil para probar con ?seed=XXXX).
    const params = new URLSearchParams(window.location.search);
    if (params.has('jugar')) startRun(this, params.get('seed') ?? undefined);
    else this.scene.start('Menu');
  }
}
