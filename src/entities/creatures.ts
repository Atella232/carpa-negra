// Las criaturas del Acto I.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy } from './Enemy';
import type { EnemyOpts } from './Enemy';

import { anim } from './Enemy';
import type { Shot } from './Shot';
import { lob } from './Lob';
import { DEPTH } from '../config';

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
        this.sc.spawnFire(this.x + Math.cos(a) * d, this.y + 4 + Math.sin(a) * d, 3);
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

// ---------------------------------------------------------------------------
// Nuevas del Acto I
// ---------------------------------------------------------------------------

/**
 * Vendedor de globos: guarda la distancia y suelta globos que flotan hacia ti
 * (como mucho tres a la vez). Si lo matas, sus globos se escapan sin estallar.
 */
export class Globero extends Enemy {
  timer = 1.5;
  windup = 0;
  t = Math.random();
  balloons: GloboSuelto[] = [];
  protected think(dt: number): void {
    this.t += dt;
    this.balloons = this.balloons.filter((b) => b.active && !b.dead);
    this.setFlipX(this.player.x < this.x);
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(1);
      if (this.windup <= 0) this.release();
      return;
    }
    this.setFrame(0);
    const d = this.distToPlayer();
    if (d < 60) this.keepAway();
    else if (d > 110) this.chase();
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 3.2;
      if (this.balloons.length < (this.champion ? 4 : 3)) {
        this.windup = 0.4;
        this.windupFlash();
      }
    }
  }
  private release(): void {
    const b = this.sc.spawn('globoSuelto', this.x + (this.flipX ? -5 : 5), this.y - 10) as GloboSuelto;
    b.wake = 0.3;
    this.balloons.push(b);
    this.sc.snd('globo');
  }
  die(): void {
    for (const b of this.balloons) if (b.active && !b.dead) b.escape();
    super.die();
  }
}

/**
 * Globo suelto: flota hacia ti con vaivén. Revienta al tocarte, al darle o a
 * los 12 s: aviso de 0,25 s y cuatro balas en cruz de poco alcance. No cuenta
 * para limpiar la sala ni da premios (si no, el vendedor sería una mina de oro).
 */
export class GloboSuelto extends Enemy {
  t = Math.random() * 10;
  life = 12;
  escaping = false;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, { ...o, noSmoke: true });
    this.countsForClear = false;
    this.contact = 0;
  }
  protected tick(dt: number): void {
    if (this.escaping) {
      this.y -= 40 * dt;
      this.setAlpha(Math.max(0, this.alpha - dt));
      if (this.alpha <= 0) this.vanish();
      return;
    }
    this.life -= dt;
    if (this.life <= 0 || (this.wake <= 0 && this.distToPlayer() < 12)) this.die();
  }
  protected think(dt: number): void {
    if (this.escaping) return;
    this.t += dt;
    const p = this.player;
    const a = Math.atan2(p.y - 6 - this.y, p.x - this.x) + Math.sin(this.t * 2.5) * 0.6;
    this.desired.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
    this.lift = 6 + Math.sin(this.t * 3) * 2;
    this.setFrame(this.life < 2 && Math.floor(this.t * 8) % 2 ? 1 : 0);
  }
  /** Se va volando sin estallar (al morir su vendedor). */
  escape(): void {
    this.escaping = true;
    this.invulnerable = true;
    this.body.enable = false;
  }
  private vanish(): void {
    this.dead = true;
    this.destroy();
  }
  die(): void {
    if (this.dead) return;
    this.dead = true;
    const sc = this.sc;
    const x = this.x,
      y = this.y - this.lift;
    sc.snd('pinchazo');
    sc.fx.debris(x, y, 0x7a4a8c, 5);
    sc.telegraph.circle(x, y + this.lift, 14, 0.25, { color: 0xc9b3ef });
    sc.time.delayedCall(250, () => {
      if (!sc.scene.isActive()) return;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        sc.spawnShot(x, y, Math.cos(a) * 70, Math.sin(a) * 70, false, { damage: 1, range: 60 });
      }
    });
    this.destroy();
  }
}

/**
 * Malabarista: tres mazas le giran alrededor y paran tus disparos. Cada poco
 * las lanza en parábola, una tras otra, hacia donde estás; sin mazas huye un
 * momento (es cuando se le puede dar bien) y luego las recupera.
 */
export class Malabarista extends Enemy {
  clubs: Phaser.GameObjects.Image[] = [];
  held = 3;
  ang = Math.random() * Math.PI * 2;
  timer = 2;
  state: 'girar' | 'lanzar' | 'huir' = 'girar';
  stateT = 0;
  t = Math.random();
  private ensureClubs(): void {
    while (this.clubs.length < 3) {
      const c = this.sc.add.image(this.x, this.y, 'maza');
      this.clubs.push(c);
    }
  }
  protected tick(dt: number): void {
    this.ensureClubs();
    this.ang += dt * 2.2;
    this.clubs.forEach((c, i) => {
      const on = i < this.held;
      c.setVisible(on && this.visible);
      if (!on) return;
      const a = this.ang + (i / 3) * Math.PI * 2;
      c.setPosition(this.x + Math.cos(a) * 14, this.y - 2 + Math.sin(a) * 14);
      c.setRotation(a * 2);
      c.setDepth(DEPTH.world + c.y + 8);
    });
    // Las mazas que gira paran tus pelotas (salvo las que atraviesan obstáculos).
    if (!this.held) return;
    for (const s of this.sc.g.pShots.getChildren() as Shot[]) {
      if (s.dead || !s.active || s.opts.spectral) continue;
      for (let i = 0; i < this.held; i++) {
        const c = this.clubs[i];
        if (Math.abs(s.x - c.x) < 6 && Math.abs(s.y - c.y) < 6) {
          s.pop('obstaculo');
          this.sc.fx.sparks(c.x, c.y, 0xffffff, 2);
          break;
        }
      }
    }
  }
  protected think(dt: number): void {
    this.t += dt;
    this.setFlipX(this.player.x < this.x);
    this.setFrame(anim(this.t, 4, 2));
    this.stateT -= dt;
    switch (this.state) {
      case 'girar': {
        const d = this.distToPlayer();
        if (d < 50) this.keepAway();
        else if (d > 90) this.chase();
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'lanzar';
          this.stateT = 0;
          this.windupFlash();
        }
        break;
      }
      case 'lanzar':
        if (this.stateT > 0) break;
        if (this.held > 0) {
          this.throwClub();
          this.stateT = 0.35;
        } else {
          this.state = 'huir';
          this.stateT = 2;
        }
        break;
      case 'huir':
        this.keepAway();
        if (this.stateT <= 0) {
          this.held = 3;
          this.timer = 2;
          this.state = 'girar';
          this.sc.snd('salto');
        }
        break;
    }
  }
  private throwClub(): void {
    this.held--;
    const sc = this.sc;
    const tx = Phaser.Math.Clamp(this.player.x, 24, 216);
    const ty = Phaser.Math.Clamp(this.player.y + 2, 24, 124);
    lob(sc, this.x, this.y - 6, tx, ty, { texture: 'maza', dur: 0.7, height: 36, radius: 9, spin: true });
    sc.snd('salto');
  }
  destroy(fromScene?: boolean): void {
    for (const c of this.clubs) c.destroy();
    this.clubs = [];
    super.destroy(fromScene);
  }
}

/**
 * Perrito amaestrado: va en jauría. Te rodea, ladra (aviso: se para y marca la
 * línea) y te muerde en línea recta hacia donde estabas; luego se aparta.
 */
export class Perrito extends Enemy {
  state: 'rodear' | 'aviso' | 'mordisco' | 'retirada' = 'rodear';
  timer = Phaser.Math.FloatBetween(1.6, 2.6);
  sense = Math.random() < 0.5 ? 1 : -1;
  dir = new Phaser.Math.Vector2();
  t = Math.random();
  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    const p = this.player;
    const b = this.body.blocked;
    const hit = b.left || b.right || b.up || b.down;
    switch (this.state) {
      case 'rodear': {
        const a = Math.atan2(this.y - p.y, this.x - p.x) + this.sense * 0.6;
        const tx = p.x + Math.cos(a) * 46,
          ty = p.y + Math.sin(a) * 46;
        if (this.sc.nav.lineFree(this.x, this.y, tx, ty)) this.toward(tx, ty);
        else this.chase();
        if (hit) this.sense *= -1;
        this.setFrame(anim(this.t, 10, 2));
        this.setFlipX(this.desired.x < 0);
        if (this.timer <= 0 && this.distToPlayer() < 90 && this.sc.nav.lineFree(this.x, this.y, p.x, p.y)) {
          this.state = 'aviso';
          this.timer = 0.35;
          const a2 = Math.atan2(p.y - this.y, p.x - this.x);
          this.dir.set(Math.cos(a2), Math.sin(a2));
          this.setFlipX(this.dir.x < 0);
          this.windupFlash();
          this.sc.snd('ladrido');
          this.sc.telegraph.line(this.x, this.y, this.x + this.dir.x * 76, this.y + this.dir.y * 76, 0.35, { owner: this, w: 8 });
        }
        break;
      }
      case 'aviso':
        this.setFrame(2);
        if (this.timer <= 0) {
          this.state = 'mordisco';
          this.timer = 0.45;
        }
        break;
      case 'mordisco':
        this.setFrame(1);
        this.desired.set(this.dir.x * 170, this.dir.y * 170);
        if (this.timer <= 0 || hit) {
          this.state = 'retirada';
          this.timer = 0.6;
        }
        break;
      case 'retirada':
        this.flee();
        this.setFrame(anim(this.t, 10, 2));
        if (this.timer <= 0) {
          this.state = 'rodear';
          this.timer = Phaser.Math.FloatBetween(1.6, 2.6);
        }
        break;
    }
  }
}
