// Familiares: acompañantes que ayudan a Pompón.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';
import { FamiliarKind } from '../data/items';
import type { Enemy } from './Enemy';

export abstract class Familiar {
  sprite: Phaser.GameObjects.Sprite;
  t = Math.random() * 10;
  constructor(protected scene: GameScene, texture: string) {
    const p = scene.player;
    this.sprite = scene.add.sprite(p.x, p.y, texture, 0);
  }
  abstract update(dt: number): void;
  fire(_dir: { x: number; y: number }): void {}
  /** Se recoloca al entrar en una sala nueva. */
  reset(): void {
    this.sprite.setPosition(this.scene.player.x, this.scene.player.y);
  }
  destroy(): void {
    this.sprite.destroy();
  }
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
}

/** Globo-Perro: da vueltas alrededor del payaso y bloquea disparos. */
export class GloboPerro extends Familiar {
  angle = 0;
  touchCd = 0;
  constructor(scene: GameScene) {
    super(scene, 'globo_perro');
  }
  update(dt: number): void {
    this.t += dt;
    this.angle += dt * 2.6;
    this.touchCd = Math.max(0, this.touchCd - dt);
    const p = this.scene.player;
    this.sprite.setPosition(p.x + Math.cos(this.angle) * 22, p.y - 6 + Math.sin(this.angle) * 18);
    this.sprite.setFrame(Math.floor(this.t * 4) % 2);
    this.sprite.setDepth(DEPTH.world + this.sprite.y + 6);
    // Bloquea disparos enemigos.
    for (const s of this.scene.enemyShotsNear(this.x, this.y, 8)) s.pop();
    // Muerde lo que toca.
    if (this.touchCd <= 0) {
      const e = this.scene.nearestEnemy(this.x, this.y, 10);
      if (e) {
        e.damage(3, this.sprite, 30);
        this.touchCd = 0.3;
      }
    }
  }
}

/** Mono de Juguete: te sigue y dispara cuando tú disparas. */
export class MonoJuguete extends Familiar {
  trail: { x: number; y: number }[] = [];
  cd = 0;
  constructor(scene: GameScene) {
    super(scene, 'mono_juguete');
  }
  update(dt: number): void {
    this.t += dt;
    this.cd = Math.max(0, this.cd - dt);
    const p = this.scene.player;
    this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 14) this.trail.shift();
    const target = this.trail[0];
    this.sprite.x += (target.x - this.sprite.x) * Math.min(1, dt * 8);
    this.sprite.y += (target.y - this.sprite.y) * Math.min(1, dt * 8);
    this.sprite.setFrame(Math.floor(this.t * 6) % 2);
    this.sprite.setDepth(DEPTH.world + this.sprite.y);
  }
  fire(dir: { x: number; y: number }): void {
    if (this.cd > 0) return;
    this.cd = 0.5;
    this.scene.spawnShot(this.x, this.y - 4, dir.x * 170, dir.y * 170, true, {
      damage: 3, range: 110, scale: 0.75,
    });
  }
  reset(): void {
    super.reset();
    this.trail = [];
  }
}

/** Pulga Fiel: salta sobre el enemigo más cercano. */
export class PulgaFiel extends Familiar {
  state: 'rest' | 'hop' = 'rest';
  timer = 0.6;
  from = new Phaser.Math.Vector2();
  to = new Phaser.Math.Vector2();
  hopT = 0;
  target: Enemy | null = null;
  constructor(scene: GameScene) {
    super(scene, 'pulga_fiel');
  }
  update(dt: number): void {
    this.timer -= dt;
    if (this.state === 'rest') {
      this.sprite.setFrame(0);
      if (this.timer <= 0) {
        this.target = this.scene.nearestEnemy(this.x, this.y, 160);
        const p = this.scene.player;
        const tx = this.target ? this.target.x : p.x + Phaser.Math.Between(-16, 16);
        const ty = this.target ? this.target.y : p.y + Phaser.Math.Between(-8, 12);
        this.from.set(this.x, this.y);
        this.to.set(tx, ty);
        this.state = 'hop';
        this.hopT = 0;
      }
    } else {
      this.sprite.setFrame(1);
      this.hopT += dt / 0.4;
      const k = Math.min(1, this.hopT);
      this.sprite.setPosition(
        Phaser.Math.Linear(this.from.x, this.to.x, k),
        Phaser.Math.Linear(this.from.y, this.to.y, k) - Math.sin(k * Math.PI) * 14,
      );
      if (k >= 1) {
        this.state = 'rest';
        this.timer = this.target ? 0.5 : 0.9;
        if (this.target && !this.target.dead && Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) < 14) {
          this.target.damage(6, null, 0);
          this.scene.splash(this.x, this.y, 'salpicadura_roja', 0.8);
        }
      }
    }
    this.sprite.setDepth(DEPTH.world + this.sprite.y + 4);
  }
}

/** Paloma del sombrero: ataca y se va. Solo dura una sala. */
export class Paloma extends Familiar {
  hits = 3;
  cd = 0;
  temporary = true;
  constructor(scene: GameScene) {
    super(scene, 'paloma');
    this.sprite.setPosition(scene.player.x + Phaser.Math.Between(-10, 10), scene.player.y - 16);
  }
  update(dt: number): void {
    this.t += dt;
    this.cd = Math.max(0, this.cd - dt);
    this.sprite.setFrame(Math.floor(this.t * 10) % 2);
    const e = this.scene.nearestEnemy(this.x, this.y, 400);
    const tx = e ? e.x : this.scene.player.x + Math.cos(this.t * 2) * 30;
    const ty = e ? e.y - 4 : this.scene.player.y - 20 + Math.sin(this.t * 3) * 8;
    const a = Math.atan2(ty - this.y, tx - this.x);
    this.sprite.x += Math.cos(a) * 110 * dt;
    this.sprite.y += Math.sin(a) * 110 * dt;
    this.sprite.setFlipX(Math.cos(a) < 0);
    this.sprite.setDepth(DEPTH.shot);
    if (e && this.cd <= 0 && Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) < 10) {
      e.damage(6, this.sprite, 40);
      this.cd = 0.5;
      this.hits--;
    }
  }
  get gone(): boolean {
    return this.hits <= 0;
  }
}

/** Leoncito: corretea hacia el enemigo más cercano y le muerde. */
export class Leoncito extends Familiar {
  biteCd = 0;
  constructor(scene: GameScene) {
    super(scene, 'leoncito');
  }
  update(dt: number): void {
    this.t += dt;
    this.biteCd = Math.max(0, this.biteCd - dt);
    const e = this.scene.nearestEnemy(this.x, this.y, 140);
    const p = this.scene.player;
    const tx = e ? e.x : p.x - 14;
    const ty = e ? e.y + 2 : p.y + 4;
    const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (d > 3) {
      const speed = e ? 95 : Math.min(120, d * 4);
      const a = Math.atan2(ty - this.y, tx - this.x);
      this.sprite.x += Math.cos(a) * speed * dt;
      this.sprite.y += Math.sin(a) * speed * dt;
      this.sprite.setFlipX(Math.cos(a) < 0);
    }
    this.sprite.setFrame(d > 3 ? Math.floor(this.t * 8) % 2 : 0);
    this.sprite.setDepth(DEPTH.world + this.sprite.y);
    if (e && this.biteCd <= 0 && d < 12) {
      e.damage(4, this.sprite, 30);
      this.biteCd = 0.4;
    }
  }
}

export function createFamiliar(scene: GameScene, kind: FamiliarKind): Familiar {
  switch (kind) {
    case 'globoPerro':
      return new GloboPerro(scene);
    case 'monoJuguete':
      return new MonoJuguete(scene);
    case 'pulgaFiel':
      return new PulgaFiel(scene);
    case 'leoncito':
      return new Leoncito(scene);
  }
}
