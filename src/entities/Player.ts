// Pompón: movimiento con inercia, disparo en cuatro direcciones y disfraces.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';
import { item } from '../data/items';

type Facing = 'down' | 'up' | 'left' | 'right';

const HEAD_FRAME: Record<Facing, number> = { down: 0, up: 2, left: 4, right: 4 };

export class Player {
  /** Objeto invisible con físicas; todo lo visible se coloca a partir de él. */
  readonly sprite: Phaser.Physics.Arcade.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  private bodyVis: Phaser.GameObjects.Sprite;
  private head: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private costumes: { img: Phaser.GameObjects.Sprite; key: string }[] = [];
  private stilts: Phaser.GameObjects.Image | null = null;
  private bowtie: Phaser.GameObjects.Image | null = null;

  vel = new Phaser.Math.Vector2();
  facing: Facing = 'down';
  headFacing: Facing = 'down';
  fireCooldown = 0;
  shootAnim = 0;
  invuln = 0;
  walkTime = 0;
  /** Control bloqueado (transiciones, cañón...). */
  locked = 0;
  dash: { vx: number; vy: number; t: number } | null = null;
  dead = false;
  lastShotDir = { x: 0, y: 1 };
  private altShot = false;

  constructor(private scene: GameScene, x: number, y: number) {
    this.shadow = scene.add.image(x, y + 5, 'sombra').setDepth(DEPTH.shadow);
    this.sprite = scene.physics.add.image(x, y, 'pixel').setVisible(false);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    // Hitbox pequeño, centrado en el cuerpo.
    this.body.setSize(8, 7, true);
    this.bodyVis = scene.add.sprite(x, y, 'pompon_cuerpo', 0);
    this.head = scene.add.sprite(x, y - 9, 'pompon_cabeza', 0);
    this.refreshCostumes();
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
    this.vel.set(0, 0);
    this.dash = null;
    this.syncVisuals(0);
  }

  /** Vuelve a poner los disfraces según los objetos que lleva. */
  refreshCostumes(): void {
    for (const c of this.costumes) c.img.destroy();
    this.costumes = [];
    this.stilts?.destroy();
    this.bowtie?.destroy();
    this.stilts = this.bowtie = null;
    const owned = this.scene.run.player.passives.map((id) => item(id).costume).filter(Boolean) as string[];
    for (const key of owned) {
      if (key === 'disfraz_zancos') {
        this.stilts = this.scene.add.image(this.x, this.y, key);
      } else if (key === 'disfraz_pajarita') {
        this.bowtie = this.scene.add.image(this.x, this.y, key);
      } else {
        this.costumes.push({ img: this.scene.add.sprite(this.x, this.y, key, 0), key });
      }
    }
  }

  update(dt: number): void {
    const sc = this.scene;
    if (this.dead) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    this.locked = Math.max(0, this.locked - dt);

    const stats = sc.stats;
    if (this.dash) {
      this.dash.t -= dt;
      this.body.setVelocity(this.dash.vx, this.dash.vy);
      this.vel.set(this.dash.vx, this.dash.vy);
      sc.effects.onDashTick(this);
      if (this.dash.t <= 0) {
        this.dash = null;
        this.vel.scale(0.3);
      }
      this.syncVisuals(dt);
      return;
    }

    const move = this.locked > 0 ? { x: 0, y: 0 } : sc.controls.move();
    // Aceleración y fricción: rápido al arrancar, algo de deslizamiento al parar.
    const target = new Phaser.Math.Vector2(move.x * stats.speed, move.y * stats.speed);
    const accel = move.x || move.y ? 14 : 10;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.y += (target.y - this.vel.y) * Math.min(1, accel * dt);
    if (Math.abs(this.vel.x) < 1) this.vel.x = 0;
    if (Math.abs(this.vel.y) < 1) this.vel.y = 0;
    this.body.setVelocity(this.vel.x, this.vel.y);
    // Si choca con algo, la velocidad real manda (evita "pegarse" a las paredes).
    if (this.body.blocked.left || this.body.blocked.right) this.vel.x *= 0.5;
    if (this.body.blocked.up || this.body.blocked.down) this.vel.y *= 0.5;

    if (move.x || move.y) {
      if (Math.abs(move.x) > Math.abs(move.y)) this.facing = move.x > 0 ? 'right' : 'left';
      else this.facing = move.y > 0 ? 'down' : 'up';
    }

    const shoot = this.locked > 0 ? null : sc.controls.shoot();
    if (shoot) {
      this.headFacing = shoot.x > 0 ? 'right' : shoot.x < 0 ? 'left' : shoot.y < 0 ? 'up' : 'down';
      this.lastShotDir = shoot;
      if (this.fireCooldown <= 0) {
        this.fire(shoot);
        this.fireCooldown = stats.fireDelay;
      }
    } else {
      this.headFacing = this.facing;
    }
    this.syncVisuals(dt);
  }

  private fire(dir: { x: number; y: number }): void {
    const sc = this.scene;
    const st = sc.stats;
    const sh = st.shot;
    const count = 1 + sh.extraShots;
    const baseAng = Math.atan2(dir.y, dir.x);
    const spread = Phaser.Math.DegToRad(sh.spread);
    // Las pelotas salen alternando de cada mano.
    this.altShot = !this.altShot;
    const side = this.altShot ? 3 : -3;
    const ox = dir.y !== 0 ? side : 0;
    const oy = dir.x !== 0 ? side * 0.5 : 0;
    const originX = this.x + ox + dir.x * 4;
    const originY = this.y - 8 + oy + dir.y * 3;
    const angles: number[] = [];
    for (let i = 0; i < count; i++) angles.push(baseAng + (i - (count - 1) / 2) * spread);
    if (sh.backShot) angles.push(baseAng + Math.PI);
    for (const a of angles) {
      // El disparo hereda parte de la inercia del payaso.
      const vx = Math.cos(a) * st.shotSpeed + this.vel.x * 0.35;
      const vy = Math.sin(a) * st.shotSpeed + this.vel.y * 0.35;
      sc.spawnShot(originX, originY, vx, vy, true, {
        damage: st.damage,
        range: st.range,
        scale: sh.sizeMult * (st.damage > 6 ? 1.15 : 1),
        pierce: sh.pierce,
        bounce: sh.bounce,
        burn: sh.burn,
        fragment: sh.fragment,
        spectral: sh.spectral,
        homing: sh.homing,
        poison: sh.poison,
        grow: sh.grow,
        texture: sh.knife ? 'cuchillo' : 'pelota',
        rotate: sh.knife,
      });
    }
    this.shootAnim = 0.12;
    sc.familiarsFire(dir);
    sc.snd('disparo');
  }

  syncVisuals(dt: number): void {
    const moving = this.vel.lengthSq() > 64;
    this.walkTime = moving ? this.walkTime + dt * 10 : 0;
    const step = moving ? 1 + (Math.floor(this.walkTime) % 2) : 0;
    const side = this.facing === 'left' || this.facing === 'right';
    this.bodyVis.setFrame((side ? 3 : 0) + step);
    this.bodyVis.setFlipX(this.facing === 'left');

    const tall = this.stilts ? 6 : 0;
    const bob = moving && Math.floor(this.walkTime) % 2 === 0 ? -1 : 0;
    const hx = this.x;
    const hy = this.y - 10 + bob - tall;
    const shooting = this.shootAnim > 0 ? 1 : 0;
    this.head.setFrame(HEAD_FRAME[this.headFacing] + shooting);
    this.head.setFlipX(this.headFacing === 'left');
    this.head.setPosition(hx, hy);
    this.bodyVis.setPosition(this.x, this.y - tall);

    const depth = DEPTH.world + this.y;
    this.bodyVis.setDepth(depth);
    this.head.setDepth(depth + 0.2);
    this.shadow.setPosition(this.x, this.y + 6);
    this.shadow.setDepth(DEPTH.shadow);

    for (const c of this.costumes) {
      c.img.setPosition(hx, hy + (c.key === 'disfraz_llamas' ? -6 : 0));
      c.img.setFlipX(this.headFacing === 'left');
      c.img.setDepth(depth + 0.3);
      // La nariz y el monóculo no se ven de espaldas.
      c.img.setVisible(this.headFacing !== 'up' || c.key === 'disfraz_llamas' || c.key === 'disfraz_barba');
      if (c.key === 'disfraz_llamas') c.img.setFrame(Math.floor(this.scene.time.now / 120) % 2);
    }
    if (this.stilts) {
      this.stilts.setPosition(this.x, this.y + 3).setDepth(depth - 0.1);
      this.stilts.setVisible(true);
    }
    if (this.bowtie) {
      this.bowtie.setPosition(this.x, this.y - 3 - tall).setDepth(depth + 0.1);
      this.bowtie.setVisible(this.facing !== 'up');
    }

    // Parpadeo durante la invulnerabilidad.
    const blink = this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0;
    const alpha = blink ? 0.25 : 1;
    this.bodyVis.setAlpha(alpha);
    this.head.setAlpha(alpha);
    for (const c of this.costumes) c.img.setAlpha(alpha);
  }

  flash(color: number): void {
    this.bodyVis.setTintFill(color);
    this.head.setTintFill(color);
    this.scene.time.delayedCall(80, () => {
      this.bodyVis.clearTint();
      this.head.clearTint();
    });
  }

  setVisible(v: boolean): void {
    this.bodyVis.setVisible(v);
    this.head.setVisible(v);
    this.shadow.setVisible(v);
    for (const c of this.costumes) c.img.setVisible(v);
    this.stilts?.setVisible(v);
    this.bowtie?.setVisible(v);
  }

  destroy(): void {
    this.sprite.destroy();
    this.bodyVis.destroy();
    this.head.destroy();
    this.shadow.destroy();
    for (const c of this.costumes) c.img.destroy();
    this.stilts?.destroy();
    this.bowtie?.destroy();
  }
}
