// Clase base de criaturas: vida, estados alterados, retroceso y muerte.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH } from '../config';
import { Champion, CHAMPIONS } from '../data/enemies';

export interface EnemyOpts {
  hp: number;
  speed: number;
  flying?: boolean;
  body: { w: number; h: number; dy: number };
  champion?: Champion | null;
  frame?: number;
  name?: string;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  hp: number;
  maxHp: number;
  speed: number;
  flying: boolean;
  champion: Champion | null;
  name: string;
  /** Daño por contacto en medios globos (0 = no hace daño al tocar). */
  contact = 1;
  invulnerable = false;
  isBoss = false;
  countsForClear = true;
  dead = false;
  /** Cuánto tarda en reaccionar al entrar en la sala. */
  wake = 0.7;
  /** Altura visual (saltos). */
  lift = 0;

  desired = new Phaser.Math.Vector2();
  knock = new Phaser.Math.Vector2();
  burnT = 0;
  burnTick = 0;
  burnDmg = 0;
  slowT = 0;
  fearT = 0;
  stunT = 0;
  flashT = 0;
  protected shadow: Phaser.GameObjects.Image;
  protected bodyDy: number;
  protected baseOff = { x: 0, y: 0 };

  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o.frame ?? 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.g.enemies.add(this);
    this.champion = o.champion ?? null;
    const ch = this.champion ? CHAMPIONS[this.champion] : null;
    this.maxHp = this.hp = o.hp * (ch?.hpMult ?? 1) * scene.difficultyHpMult();
    this.speed = o.speed * (ch?.speedMult ?? 1);
    this.flying = !!o.flying;
    this.name = o.name ?? texture;
    this.bodyDy = o.body.dy;
    this.body.setSize(o.body.w, o.body.h, false);
    this.baseOff = { x: (this.width - o.body.w) / 2, y: (this.height - o.body.h) / 2 + o.body.dy };
    this.body.setOffset(this.baseOff.x, this.baseOff.y);
    if (ch) this.setTint(ch.tint);
    this.shadow = scene.add
      .image(x, y, this.width > 30 ? 'sombra_grande' : 'sombra')
      .setDepth(DEPTH.shadow);
    // Aparición: un instante translúcido.
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 250 });
  }

  get sc(): GameScene {
    return this.scene as GameScene;
  }

  get player() {
    return this.sc.player;
  }

  /** Comportamiento propio de cada criatura: fija `desired` y ataca. */
  protected abstract think(dt: number): void;

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead || !this.body) return;
    const dt = Math.min(0.05, delta / 1000);
    this.wake -= dt;
    this.slowT = Math.max(0, this.slowT - dt);
    this.fearT = Math.max(0, this.fearT - dt);
    this.stunT = Math.max(0, this.stunT - dt);

    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.damage(this.burnDmg, null, 0, true);
        if (this.dead) return;
        this.sc.splash(this.x, this.y - 4, 'salpicadura', 0.6);
      }
    }

    this.desired.set(0, 0);
    if (this.stunT <= 0 && this.wake <= 0 && !this.player.dead) {
      if (this.fearT > 0) this.flee();
      else this.think(dt);
    }
    const slow = this.slowT > 0 ? 0.45 : 1;
    this.body.setVelocity(this.desired.x * slow + this.knock.x, this.desired.y * slow + this.knock.y);
    this.knock.scale(Math.pow(0.0005, dt));
    if (this.knock.lengthSq() < 1) this.knock.set(0, 0);

    this.setDepth(DEPTH.world + this.y + this.bodyDy);
    this.shadow.setPosition(this.x, this.body.bottom - 1);
    this.shadow.setVisible(this.visible);
    // La altura (saltos, vuelo) solo mueve el dibujo, no el cuerpo físico.
    this.setDisplayOrigin(this.width / 2, this.height / 2 + this.lift);
    this.body.setOffset(this.baseOff.x, this.baseOff.y + this.lift);

    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.restoreTint();
    }
  }

  restoreTint(): void {
    if (this.champion) this.setTint(CHAMPIONS[this.champion].tint);
    else this.clearTint();
  }

  /** Devuelve true si el golpe la ha matado. */
  damage(amount: number, from: { x: number; y: number } | null, knockback = 60, silent = false): boolean {
    if (this.dead) return false;
    if (this.invulnerable) {
      if (!silent) this.sc.snd('rebote');
      return false;
    }
    this.hp -= amount;
    if (!silent) this.sc.snd('golpe');
    this.setTintFill(0xffffff);
    this.flashT = 0.06;
    if (from && knockback > 0 && !this.isBoss) {
      const a = Math.atan2(this.y - from.y, this.x - from.x);
      this.knock.set(Math.cos(a) * knockback, Math.sin(a) * knockback);
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  burn(dmg: number): void {
    this.burnT = 2.1;
    this.burnDmg = Math.max(1, dmg * 0.35);
    if (this.burnTick <= 0) this.burnTick = 0.5;
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    const sc = this.sc;
    if (this.champion === 'azul') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        sc.spawnShot(this.x, this.y, Math.cos(a) * 85, Math.sin(a) * 85, false, { damage: 1, range: 120 });
      }
    }
    sc.onEnemyKilled(this);
    this.shadow.destroy();
    this.destroy();
  }

  destroy(fromScene?: boolean): void {
    if (this.shadow?.active) this.shadow.destroy();
    super.destroy(fromScene);
  }

  // --- Utilidades de movimiento ---
  protected toward(x: number, y: number, speed = this.speed): void {
    const a = Math.atan2(y - this.y, x - this.x);
    this.desired.set(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  /** Persigue al jugador rodeando obstáculos (o en línea recta si vuela). */
  protected chase(speed = this.speed): void {
    const p = this.player;
    if (this.flying) return this.toward(p.x, p.y, speed);
    const next = this.sc.nav.nextStep(this.x, this.y + this.bodyDy, p.x, p.y);
    this.toward(next.x, next.y - this.bodyDy, speed);
  }

  protected flee(): void {
    const p = this.player;
    const a = Math.atan2(this.y - p.y, this.x - p.x);
    this.desired.set(Math.cos(a) * this.speed * 0.8, Math.sin(a) * this.speed * 0.8);
  }

  protected distToPlayer(): number {
    return Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
  }

  protected aimAtPlayer(speed: number): { vx: number; vy: number } {
    const a = Math.atan2(this.player.y - 6 - this.y, this.player.x - this.x);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  }
}
