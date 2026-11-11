// Disparos del jugador (pelotas de malabares) y de los enemigos.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';
import { DEPTH } from '../config';

export interface ShotOpts {
  damage: number;
  range: number; // píxeles
  scale?: number;
  pierce?: boolean;
  bounce?: number;
  burn?: boolean;
  fragment?: boolean;
  spectral?: boolean;
  homing?: boolean;
  isFragment?: boolean;
  knockback?: number;
  texture?: string;
  rotate?: boolean;
  /** Al caer, estalla en este número de balas (pesas del Forzudo). */
  burst?: number;
  poison?: boolean;
  grow?: boolean;
}

export class Shot extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  opts: Required<ShotOpts>;
  life = 0;
  maxLife: number;
  bouncesLeft: number;
  hit = new Set<Enemy>();
  readonly friendly: boolean;
  dead = false;
  private shadow: Phaser.GameObjects.Image;
  private speed: number;
  private baseDamage = 0;

  constructor(scene: GameScene, x: number, y: number, vx: number, vy: number, friendly: boolean, opts: ShotOpts) {
    super(scene, x, y, opts.texture ?? (friendly ? 'pelota' : 'bala'));
    this.friendly = friendly;
    this.opts = {
      scale: 1, pierce: false, bounce: 0, burn: false, fragment: false, spectral: false,
      homing: false, isFragment: false, knockback: 70, texture: this.texture.key, rotate: false, burst: 0, poison: false, grow: false,
      ...opts,
    };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (friendly ? scene.g.pShots : scene.g.eShots).add(this);
    const s = this.opts.scale;
    this.setScale(s);
    const r = Math.max(2, (friendly ? 3 : 2.5) * s);
    // La pelota vuela a la altura de la cabeza, pero choca a la altura del cuerpo
    // (más cerca de su sombra): así un disparo bien alineado nunca pasa por encima.
    this.body.setCircle(r / s, this.width / 2 - r / s, this.height / 2 - r / s + 5 / s);
    this.body.setVelocity(vx, vy);
    this.body.setBounce(this.opts.bounce > 0 ? 1 : 0);
    this.speed = Math.hypot(vx, vy);
    this.maxLife = this.speed > 0 ? this.opts.range / this.speed : 1;
    this.bouncesLeft = this.opts.bounce;
    if (this.opts.rotate) this.setRotation(Math.atan2(vy, vx));
    if (this.opts.burn && friendly) this.setTexture('pelota_fuego');
    else if (this.opts.poison && friendly && !this.opts.rotate) this.setTexture('pelota_veneno');
    this.baseDamage = this.opts.damage;
    this.setDepth(DEPTH.shot);
    this.shadow = scene.add.image(x, y + 8, 'sombra').setScale(0.5 * s).setDepth(DEPTH.shadow).setAlpha(0.7);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead) return;
    const dt = delta / 1000;
    this.life += dt;
    const t = this.life / this.maxLife;
    const scene = this.scene as GameScene;

    if (this.opts.homing && this.friendly) {
      const target = scene.nearestEnemy(this.x, this.y, 90);
      if (target) {
        const ang = Math.atan2(target.y - this.y, target.x - this.x);
        const cur = Math.atan2(this.body.velocity.y, this.body.velocity.x);
        const diff = Phaser.Math.Angle.Wrap(ang - cur);
        const na = cur + Phaser.Math.Clamp(diff, -4 * dt, 4 * dt);
        this.body.setVelocity(Math.cos(na) * this.speed, Math.sin(na) * this.speed);
      }
    }
    // Bola de Equilibrista: crece y pega más cuanto más lejos llega.
    if (this.opts.grow && this.friendly) {
      const k = Math.min(1, t);
      this.setScale(this.opts.scale * (1 + k * 1.1));
      this.opts.damage = this.baseDamage * (1 + k * 1.2);
    }
    // Al final del recorrido, la pelota cae.
    if (t > 0.78 && !this.opts.rotate) this.body.velocity.y += 260 * dt;
    if (this.opts.rotate) this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
    const fall = t > 0.78 ? (t - 0.78) * 30 : 0;
    this.shadow.setPosition(this.x, this.y + 8 - fall);
    if (this.life >= this.maxLife) this.pop();
  }

  /** Destruye el disparo con salpicadura (y fragmentos si tiene palomitas). */
  pop(): void {
    if (this.dead) return;
    this.dead = true;
    const scene = this.scene as GameScene;
    scene.splash(this.x, this.y, this.friendly ? 'salpicadura' : 'salpicadura_roja', this.opts.scale);
    if (this.friendly && this.opts.fragment && !this.opts.isFragment) {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        scene.spawnShot(this.x, this.y, Math.cos(a) * 140, Math.sin(a) * 140, true, {
          ...this.opts,
          damage: this.opts.damage * 0.5,
          scale: this.opts.scale * 0.6,
          range: 40,
          isFragment: true,
          bounce: 0,
        });
      }
    }
    if (!this.friendly && this.opts.burst > 0) {
      const n = this.opts.burst;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        scene.spawnShot(this.x, this.y, Math.cos(a) * 85, Math.sin(a) * 85, false, { damage: 1, range: 110 });
      }
      scene.snd('golpe');
    }
    this.destroy();
  }

  destroy(fromScene?: boolean): void {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
