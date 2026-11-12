// "Jugo": partículas, sacudidas, paradas de impacto y destellos. Todo pasa por
// aquí para que los ajustes (menos sacudidas, sin destellos) se apliquen en un
// solo sitio. Los emisores siguen el reloj de la escena, así que se congelan
// con la parada de impacto y funcionan con el avance por fotogramas.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';
import { settings } from '../core/save';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export class Fx {
  private confettiE: Emitter;
  private debrisE: Emitter;
  private sparkE: Emitter;
  private dustE: Emitter;
  private trailE: Emitter;
  private splashPool: Phaser.GameObjects.Sprite[] = [];
  /** Milisegundos de parada pedidos este fotograma (se aplica el mayor). */
  pendingFreeze = 0;

  constructor(private sc: GameScene) {
    const p = (tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) =>
      sc.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(DEPTH.fx);
    this.confettiE = p('confeti', {
      frame: [0, 1, 2, 3, 4, 5],
      speed: { min: 30, max: 120 },
      angle: { min: 0, max: 360 },
      gravityY: 160,
      lifespan: { min: 600, max: 1100 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0, ease: 'Quad.easeIn' },
    });
    this.debrisE = p('pixel', {
      speed: { min: 30, max: 90 },
      angle: { min: 0, max: 360 },
      gravityY: 220,
      lifespan: { min: 300, max: 500 },
      scale: 2,
      alpha: { start: 1, end: 0 },
    });
    this.sparkE = p('chispa', {
      speed: { min: 40, max: 110 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 120, max: 240 },
      alpha: { start: 1, end: 0 },
    });
    this.dustE = p('polvo', {
      speed: { min: 8, max: 26 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 600 },
      alpha: { start: 0.8, end: 0 },
      scale: { start: 1, end: 1.6 },
    });
    this.trailE = p('pixel', {
      lifespan: 140,
      alpha: { start: 0.55, end: 0 },
      scale: { start: 2, end: 1 },
    });
  }

  confetti(x: number, y: number, n: number): void {
    this.confettiE.explode(n, x, y);
  }

  debris(x: number, y: number, color: number, n = 6): void {
    this.debrisE.setParticleTint(color);
    this.debrisE.explode(n, x, y);
  }

  sparks(x: number, y: number, color = 0xffffff, n = 4): void {
    this.sparkE.setParticleTint(color);
    this.sparkE.explode(n, x, y);
  }

  dust(x: number, y: number, n = 4): void {
    this.dustE.explode(n, x, y);
  }

  /** Estela de un disparo (se limita si hay demasiados en pantalla). */
  trail(x: number, y: number, color: number): void {
    if (this.trailE.getAliveParticleCount() > 80) return;
    this.trailE.setParticleTint(color);
    this.trailE.explode(1, x, y);
  }

  splash(x: number, y: number, tex: string, scale = 1): void {
    let s = this.splashPool.pop();
    if (!s || !s.active) s = this.sc.add.sprite(x, y, tex, 0).setDepth(DEPTH.fx);
    s.setPosition(x, y).setTexture(tex, 0).setScale(scale).setVisible(true);
    s.play(tex);
    s.once('animationcomplete', () => {
      s!.setVisible(false);
      this.splashPool.push(s!);
    });
  }

  shake(ms: number, intensity: number): void {
    const k = settings().shake;
    if (k <= 0) return;
    this.sc.cameras.main.shake(ms, intensity * k);
  }

  /** Destello de pantalla (se suaviza si el jugador lo pide). */
  flash(ms: number, color = 0xffffff, alpha = 0.35): void {
    if (!settings().flashes) return;
    const c = Phaser.Display.Color.IntegerToColor(color);
    const cam = this.sc.cameras.main;
    // El destello toma su opacidad inicial de `alpha` al empezar.
    cam.flashEffect.alpha = alpha;
    cam.flash(ms, c.red, c.green, c.blue, true);
  }

  /** Pide una parada de impacto (se aplica al final del fotograma). */
  freeze(ms: number): void {
    if (!settings().hitstop) return;
    this.pendingFreeze = Math.max(this.pendingFreeze, ms);
  }

  /** Aplasta y estira una imagen de la criatura al morir (solo visual). */
  pop(e: { x: number; y: number; texture: Phaser.Textures.Texture; frame: Phaser.Textures.Frame; flipX: boolean; tintTopLeft: number; isTinted: boolean; displayOriginY: number; height: number }): void {
    const img = this.sc.add.image(e.x, e.y, e.texture.key, e.frame.name).setDepth(DEPTH.fx - 1).setFlipX(e.flipX);
    if (e.isTinted) img.setTint(e.tintTopLeft);
    this.sc.roomObjs.push(img);
    this.sc.tweens.add({
      targets: img,
      scaleX: { from: 1.35, to: 1.8 },
      scaleY: { from: 0.6, to: 0.1 },
      alpha: { from: 1, to: 0 },
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  /** Número de daño que sube y se desvanece (opcional en ajustes). */
  number(x: number, y: number, n: number): void {
    const t = this.sc.add.bitmapText(x, y, 'fuente', String(Math.round(n * 10) / 10)).setOrigin(0.5).setDepth(DEPTH.overlay).setTint(0xfff2a8);
    this.sc.roomObjs.push(t);
    this.sc.tweens.add({ targets: t, y: y - 10, alpha: 0, duration: 500, onComplete: () => t.destroy() });
  }

  clear(): void {
    for (const e of [this.confettiE, this.debrisE, this.sparkE, this.dustE, this.trailE]) e.killAll();
  }
}
