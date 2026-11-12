// Pompón: movimiento con inercia, disparo en cuatro direcciones y disfraces.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';
import { item } from '../data/items';
import { buildVolley } from '../core/volley';
import { setBonuses } from '../data/sets';
import { characterDef } from '../data/characters';
import { settings } from '../core/save';

type Facing = 'down' | 'up' | 'left' | 'right';

const HEAD_FRAME: Record<Facing, number> = { down: 0, up: 2, left: 4, right: 4 };
/** Desplazamiento vertical de cada disfraz respecto a la cabeza. */
const COSTUME_DY: Record<string, number> = {
  disfraz_llamas: -6, disfraz_malabarista: -12, disfraz_mago: -9, disfraz_payaso: -9, disfraz_fiera: 1,
};
/** Disfraces que se ven también de espaldas. */
const BACK_VISIBLE = new Set(['disfraz_llamas', 'disfraz_barba', 'disfraz_malabarista', 'disfraz_mago', 'disfraz_payaso', 'disfraz_fiera']);

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
  /** Tras un golpe, el retroceso manda durante un instante. */
  knockT = 0;
  /** Invisible (Bomba de Humo): las criaturas no lo ven. */
  hiddenT = 0;
  walkTime = 0;
  /** Control bloqueado (transiciones, cañón...). */
  locked = 0;
  dash: { vx: number; vy: number; t: number; harmless?: boolean } | null = null;
  dead = false;
  private flashT = 0;
  lastShotDir = { x: 0, y: 1 };
  /** Carga de la Varita Trucada (0..1). */
  chargeT = 0;
  private chargeDir = { x: 0, y: 1 };
  private chargeBall: Phaser.GameObjects.Image | null = null;
  private altShot = false;
  private volleys = 0;

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
    const passives = this.scene.run.player.passives;
    const owned = passives.map((id) => item(id).costume).filter(Boolean) as string[];
    for (const set of setBonuses(passives)) if (set.costume) owned.push(set.costume);
    // Color del traje según el personaje.
    const tint = characterDef(this.scene.run.player.character).tint;
    if (tint) this.bodyVis.setTint(tint);
    else this.bodyVis.clearTint();
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
    this.knockT = Math.max(0, this.knockT - dt);
    this.hiddenT = Math.max(0, this.hiddenT - dt);

    const stats = sc.stats;
    if (this.dash) {
      this.dash.t -= dt;
      this.body.setVelocity(this.dash.vx, this.dash.vy);
      this.vel.set(this.dash.vx, this.dash.vy);
      if (!this.dash.harmless) sc.effects.onDashTick(this);
      if (this.dash.t <= 0) {
        this.dash = null;
        this.vel.scale(0.3);
      }
      this.syncVisuals(dt);
      return;
    }

    const move = this.locked > 0 ? { x: 0, y: 0 } : sc.controls.move();
    // Aceleración y fricción: rápido al arrancar, algo de deslizamiento al parar.
    const slow = sc.playerSlowed() ? 0.55 : 1;
    const target = new Phaser.Math.Vector2(move.x * stats.speed * slow, move.y * stats.speed * slow);
    const accel = this.knockT > 0 ? 2 : move.x || move.y ? 14 : 10;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.y += (target.y - this.vel.y) * Math.min(1, accel * dt);
    if (Math.abs(this.vel.x) < 1) this.vel.x = 0;
    if (Math.abs(this.vel.y) < 1) this.vel.y = 0;
    // Las cintas del suelo arrastran (salvo con zancos).
    const push = sc.effects.hasFlag('flight') ? null : sc.floorPush(this.x, this.y + 3);
    this.body.setVelocity(this.vel.x + (push?.x ?? 0), this.vel.y + (push?.y ?? 0));
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
    } else this.headFacing = this.facing;
    if (stats.shot.charge) {
      // Varita Trucada: mantener carga el disparo; soltar lo lanza.
      if (shoot) {
        this.chargeT = Math.min(1, this.chargeT + dt / Math.max(0.5, stats.fireDelay * 2.5));
        this.chargeDir = shoot;
      } else if (this.chargeT > 0 && this.fireCooldown <= 0) {
        this.fire(this.chargeDir, this.chargeT);
        this.fireCooldown = stats.fireDelay * 0.5;
        this.chargeT = 0;
      }
    } else if (shoot && this.fireCooldown <= 0) {
      this.fire(shoot);
      this.fireCooldown = stats.fireDelay;
    }
    this.syncVisuals(dt);
  }

  private fire(dir: { x: number; y: number }, charge = 0): void {
    const sc = this.scene;
    const st = sc.stats;
    const sh = st.shot;
    // Las pelotas salen alternando de cada mano.
    this.altShot = !this.altShot;
    const side = this.altShot ? 3 : -3;
    const ox = dir.y !== 0 ? side : 0;
    const oy = dir.x !== 0 ? side * 0.5 : 0;
    const originX = this.x + ox + dir.x * 4;
    const originY = this.y - 8 + oy + dir.y * 3;
    // Traje de Mago: una de cada cinco ráfagas busca sola.
    this.volleys++;
    const magic = sc.effects.hasFlag('palomas') && this.volleys % 5 === 0;
    for (const v of buildVolley(st, dir, sc.rngCombat.next(), charge)) {
      if (magic) v.opts.homing = true;
      // El disparo hereda parte de la inercia del payaso.
      const vx = Math.cos(v.angle) * st.shotSpeed + this.vel.x * 0.35;
      const vy = Math.sin(v.angle) * st.shotSpeed + this.vel.y * 0.35;
      sc.spawnShot(originX, originY, vx, vy, true, v.opts);
    }
    this.shootAnim = 0.12;
    // Fogonazo en la mano.
    sc.fx.sparks(originX + dir.x * 3, originY + dir.y * 3, sh.burn ? 0xf2c14e : 0x7fd1b9, 2 + Math.round(charge * 6));
    sc.familiarsFire(dir);
    sc.onPlayerFire(dir);
    sc.snd(charge > 0.9 ? 'canon' : 'disparo');
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
      c.img.setPosition(hx, hy + (COSTUME_DY[c.key] ?? 0));
      if (c.key === 'disfraz_malabarista') c.img.setFrame(Math.floor(this.scene.time.now / 150) % 2);
      c.img.setFlipX(this.headFacing === 'left');
      c.img.setDepth(depth + 0.3);
      // La nariz y el monóculo no se ven de espaldas.
      c.img.setVisible(this.headFacing !== 'up' || BACK_VISIBLE.has(c.key));
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

    // Bola que crece en la mano mientras se carga.
    if (this.chargeT > 0) {
      if (!this.chargeBall) this.chargeBall = this.scene.add.image(0, 0, 'pelota').setDepth(DEPTH.shot);
      const full = this.chargeT >= 1 && Math.floor(this.scene.time.now / 80) % 2 === 0;
      this.chargeBall.setPosition(this.x + this.chargeDir.x * 6, this.y - 8 + this.chargeDir.y * 5).setScale(0.5 + this.chargeT).setVisible(true);
      if (full) this.chargeBall.setTintFill(0xfff2a8);
      else this.chargeBall.clearTint();
    } else this.chargeBall?.setVisible(false);
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        const tint = characterDef(this.scene.run.player.character).tint;
        if (tint) this.bodyVis.setTint(tint);
        else this.bodyVis.clearTint();
        this.head.clearTint();
      }
    }
    // Parpadeo durante la invulnerabilidad (más lento si se reducen los destellos).
    const blink = this.invuln > 0 && Math.floor(this.invuln * (settings().flashes ? 14 : 5)) % 2 === 0;
    const alpha = blink ? 0.25 : this.hiddenT > 0 ? 0.35 : 1;
    this.bodyVis.setAlpha(alpha);
    this.head.setAlpha(alpha);
    for (const c of this.costumes) c.img.setAlpha(alpha);
  }

  /** Tinte breve (por dt: un cambio de sala no lo deja pegado). */
  flash(color: number): void {
    this.bodyVis.setTintFill(color);
    this.head.setTintFill(color);
    this.flashT = 0.08;
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
    this.chargeBall?.destroy();
    this.sprite.destroy();
    this.bodyVis.destroy();
    this.head.destroy();
    this.shadow.destroy();
    for (const c of this.costumes) c.img.destroy();
    this.stilts?.destroy();
    this.bowtie?.destroy();
  }
}
