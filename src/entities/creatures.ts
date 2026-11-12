// Las ocho criaturas del Acto I.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy } from './Enemy';
import type { EnemyOpts } from './Enemy';

import { anim } from './Enemy';

/** Mimo roto: persigue sin descanso, rodeando obstáculos. */
export class Mimo extends Enemy {
  t = Math.random();
  protected think(dt: number): void {
    this.t += dt;
    this.chase();
    this.setFrame(anim(this.t, 5, 2));
  }
}

/** Polilla del foco: revolotea hacia el jugador de forma errática. */
export class Polilla extends Enemy {
  t = Math.random() * 10;
  jitter = new Phaser.Math.Vector2();
  protected think(dt: number): void {
    this.t += dt;
    const p = this.player;
    const a = Math.atan2(p.y - 8 - this.y, p.x - this.x) + Math.sin(this.t * 3) * 0.9;
    if (Math.random() < dt * 3) this.jitter.set(Phaser.Math.Between(-40, 40), Phaser.Math.Between(-40, 40));
    this.desired.set(Math.cos(a) * this.speed + this.jitter.x, Math.sin(a) * this.speed + this.jitter.y);
    this.setFrame(anim(this.t, 12, 2));
    this.lift = 4 + Math.sin(this.t * 6) * 2;
  }
}

/** Mono platillero: cuando te alinea, embiste en línea recta hasta chocar. */
export class Mono extends Enemy {
  state: 'idle' | 'windup' | 'charge' | 'dazed' = 'idle';
  timer = 0;
  dir = new Phaser.Math.Vector2();
  wander = new Phaser.Math.Vector2();
  protected think(dt: number): void {
    this.timer -= dt;
    const p = this.player;
    switch (this.state) {
      case 'idle': {
        this.setFrame(0);
        if (this.timer <= 0) {
          this.timer = Phaser.Math.FloatBetween(0.8, 1.6);
          const a = Math.random() * Math.PI * 2;
          this.wander.set(Math.cos(a) * 18, Math.sin(a) * 18);
        }
        this.desired.copy(this.wander);
        const dx = p.x - this.x,
          dy = p.y - this.y;
        const aligned = Math.abs(dx) < 9 ? 'v' : Math.abs(dy) < 9 ? 'h' : null;
        if (aligned && this.sc.nav.lineFree(this.x, this.y, p.x, p.y)) {
          this.dir.set(aligned === 'h' ? Math.sign(dx) : 0, aligned === 'v' ? Math.sign(dy) : 0);
          this.state = 'windup';
          this.timer = 0.4;
          // Aviso: la línea por la que va a cargar.
          this.sc.telegraph.line(this.x, this.y, this.x + this.dir.x * 230, this.y + this.dir.y * 230, 0.4, { owner: this, w: 10 });
          this.windupFlash();
          this.sc.snd('aviso');
        }
        break;
      }
      case 'windup':
        this.setFrame(1);
        this.x += Math.sin(this.timer * 80) * 0.5;
        if (this.timer <= 0) {
          this.state = 'charge';
          this.timer = 2;
        }
        break;
      case 'charge': {
        this.setFrame(2);
        this.desired.set(this.dir.x * this.speed, this.dir.y * this.speed);
        const b = this.body.blocked;
        const hit = (this.dir.x > 0 && b.right) || (this.dir.x < 0 && b.left) || (this.dir.y > 0 && b.down) || (this.dir.y < 0 && b.up);
        if (hit || this.timer <= 0) {
          this.state = 'dazed';
          this.timer = 0.9;
          if (hit) {
            this.sc.snd('golpe');
            this.sc.shake(60, 0.004);
          }
        }
        break;
      }
      case 'dazed':
        this.setFrame(1);
        if (this.timer <= 0) {
          this.state = 'idle';
          this.timer = 0;
        }
        break;
    }
  }
}

/** Lanzacuchillos: pasea y lanza cuchillos apuntando al jugador. */
export class Lanzacuchillos extends Enemy {
  timer = Phaser.Math.FloatBetween(1, 2.2);
  wanderT = 0;
  wander = new Phaser.Math.Vector2();
  windup = 0;
  protected think(dt: number): void {
    this.timer -= dt;
    this.wanderT -= dt;
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(1);
      if (this.windup <= 0) this.throwKnife();
      return;
    }
    this.setFrame(0);
    if (this.wanderT <= 0) {
      this.wanderT = Phaser.Math.FloatBetween(0.8, 1.8);
      const target = this.sc.nav.randomFreeTile(this.x, this.y, 48);
      this.wander.set(target.x, target.y);
    }
    this.toward(this.wander.x, this.wander.y, this.speed);
    if (Phaser.Math.Distance.Between(this.x, this.y, this.wander.x, this.wander.y) < 4) this.desired.set(0, 0);
    if (this.timer <= 0) {
      this.timer = Phaser.Math.FloatBetween(1.9, 2.6);
      if (this.distToPlayer() < 190) this.windup = 0.4;
    }
  }
  private throwKnife(): void {
    const n = this.champion ? 3 : 1;
    const base = Math.atan2(this.player.y - 6 - this.y, this.player.x - this.x);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.25;
      this.sc.spawnShot(this.x, this.y - 4, Math.cos(a) * 125, Math.sin(a) * 125, false, {
        damage: 1, range: 220, texture: 'cuchillo_enemigo', rotate: true,
      });
    }
    this.sc.snd('cuchillo');
  }
}

/** Caja sorpresa: invulnerable cerrada; al abrirse dispara en anillo. */
export class Caja extends Enemy {
  state: 'closed' | 'opening' | 'open' = 'closed';
  timer = Phaser.Math.FloatBetween(1.2, 2.4);
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, { ...o, speed: 0 });
    this.invulnerable = true;
    this.body.setImmovable(true);
  }
  protected think(dt: number): void {
    this.timer -= dt;
    if (this.state === 'closed') {
      this.setFrame(0);
      this.invulnerable = true;
      if (this.timer <= 0 && this.distToPlayer() < 130) {
        this.state = 'opening';
        this.timer = 0.45;
      } else if (this.timer <= 0) this.timer = 0.3;
    } else if (this.state === 'opening') {
      this.setFrame(1);
      this.x += Math.sin(this.timer * 90) * 0.4;
      if (this.timer <= 0) {
        this.state = 'open';
        this.timer = 1.7;
        this.invulnerable = false;
        this.sc.snd('abrirCaja');
        const n = this.champion ? 12 : 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.sc.spawnShot(this.x, this.y - 6, Math.cos(a) * 80, Math.sin(a) * 80, false, { damage: 1, range: 150 });
        }
      }
    } else {
      this.setFrame(2);
      if (this.timer <= 0) {
        this.state = 'closed';
        this.timer = Phaser.Math.FloatBetween(1.8, 2.8);
      }
    }
  }
}

/** Monociclista: rueda en diagonal y rebota en todo. */
export class Monociclista extends Enemy {
  dir = new Phaser.Math.Vector2(Math.random() < 0.5 ? 1 : -1, Math.random() < 0.5 ? 1 : -1).normalize();
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    const b = this.body.blocked;
    const t = this.body.touching;
    if ((b.left || t.left) && this.dir.x < 0) this.dir.x *= -1;
    if ((b.right || t.right) && this.dir.x > 0) this.dir.x *= -1;
    if ((b.up || t.up) && this.dir.y < 0) this.dir.y *= -1;
    if ((b.down || t.down) && this.dir.y > 0) this.dir.y *= -1;
    this.desired.set(this.dir.x * this.speed, this.dir.y * this.speed);
    this.setFrame(anim(this.t, 10, 2));
    this.setFlipX(this.dir.x < 0);
  }
}

/** Tragafuegos: se acerca despacio y escupe un reguero de fuego. */
export class Tragafuegos extends Enemy {
  timer = Phaser.Math.FloatBetween(1.5, 3);
  windup = 0;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(1);
      if (this.windup <= 0) this.breathe();
      return;
    }
    this.setFrame(0);
    if (this.distToPlayer() > 40) this.chase();
    if (this.timer <= 0) {
      this.timer = Phaser.Math.FloatBetween(3, 4.2);
      this.windup = 0.55;
    }
  }
  private breathe(): void {
    const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    this.sc.snd('fuego');
    for (let i = 1; i <= 3; i++) {
      const d = 10 + i * 15;
      this.sc.time.delayedCall(i * 90, () => {
        if (this.dead || !this.active) return;
        this.sc.spawnFire(this.x + Math.cos(a) * d, this.y + 4 + Math.sin(a) * d, 4);
      });
    }
    this.sc.spawnShot(this.x, this.y - 4, Math.cos(a) * 95, Math.sin(a) * 95, false, {
      damage: 1, range: 130, texture: 'bala', scale: 1.2,
    });
  }
}

/** Pulga amaestrada: salta sobre el jugador. Mientras vuela no toca el suelo. */
export class Pulga extends Enemy {
  state: 'ground' | 'air' = 'ground';
  timer = Phaser.Math.FloatBetween(0.5, 1.2);
  from = new Phaser.Math.Vector2();
  to = new Phaser.Math.Vector2();
  airT = 0;
  readonly airDur = 0.5;
  protected think(dt: number): void {
    this.timer -= dt;
    if (this.state === 'ground') {
      this.setFrame(0);
      this.lift = 0;
      this.flying = false;
      this.contact = 1;
      if (this.timer <= 0) {
        const p = this.player;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        const d = Math.min(64, Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y));
        this.from.set(this.x, this.y);
        const tx = Phaser.Math.Clamp(this.x + Math.cos(a) * d, 24, 216);
        const ty = Phaser.Math.Clamp(this.y + Math.sin(a) * d, 24, 120);
        this.to.set(tx, ty);
        this.state = 'air';
        this.airT = 0;
        this.flying = true;
        this.sc.snd('salto');
      }
    } else {
      this.setFrame(1);
      this.airT += dt;
      const k = Math.min(1, this.airT / this.airDur);
      this.lift = Math.sin(k * Math.PI) * 18;
      this.contact = k > 0.75 ? 1 : 0;
      const vx = (this.to.x - this.from.x) / this.airDur;
      const vy = (this.to.y - this.from.y) / this.airDur;
      this.desired.set(vx, vy);
      if (k >= 1) {
        this.state = 'ground';
        this.timer = Phaser.Math.FloatBetween(0.7, 1.2) / (this.champion === 'amarillo' ? 1.5 : 1);
        this.sc.splash(this.x, this.y + 4, 'salpicadura', 0.7);
      }
    }
  }
}
