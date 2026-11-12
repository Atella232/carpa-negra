// Jefes del Acto II: La Bestia de la Jaula y La Mujer Serpiente.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy } from './Enemy';
import { DEPTH } from '../config';
import { TimeTrail } from '../core/trail';

/** La Bestia: ruge en anillos, salta encima y llama a sus payasitos. */
export class Bestia extends Enemy {
  state: 'walk' | 'roarWindup' | 'crouch' | 'pounce' | 'dazed' = 'walk';
  timer = 1.6;
  dir = new Phaser.Math.Vector2();
  pounceT = 0;
  pouncesLeft = 0;
  last = '';
  minions: Enemy[] = [];
  t = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'bestia', { hp: 330, speed: 34, body: { w: 26, h: 18, dy: 9 }, name: 'La Bestia', fixedHp: true });
    this.isBoss = true;
    this.wake = 1.4;
    this.contact = 2;
    this.body.setMass(20);
  }

  get enraged(): boolean {
    return this.hp < this.maxHp * 0.5;
  }

  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    const rage = this.enraged ? 1.3 : 1;
    switch (this.state) {
      case 'walk':
        this.setFrame(Math.floor(this.t * 4) % 2);
        this.setFlipX(this.player.x < this.x);
        this.chase(this.speed * rage);
        if (this.timer <= 0) this.pick();
        break;
      case 'roarWindup':
        this.setFrame(2);
        this.x += Math.sin(this.timer * 90) * 0.6;
        if (this.timer <= 0) {
          this.roar();
          this.state = 'walk';
          this.timer = Phaser.Math.FloatBetween(1.3, 2) / rage;
        }
        break;
      case 'crouch':
        this.setFrame(2);
        if (this.timer <= 0) {
          this.state = 'pounce';
          this.pounceT = 0;
          this.flying = true;
          this.contact = 0;
          this.sc.snd('salto');
        }
        break;
      case 'pounce': {
        this.setFrame(3);
        this.pounceT += dt;
        const k = Math.min(1, this.pounceT / 0.5);
        this.lift = Math.sin(k * Math.PI) * 26;
        this.desired.set(this.dir.x * 230, this.dir.y * 230);
        if (k >= 1) this.land();
        break;
      }
      case 'dazed':
        this.setFrame(2);
        if (this.timer <= 0) {
          if (this.pouncesLeft > 0) {
            this.pouncesLeft--;
            this.state = 'crouch';
            this.timer = 0.4;
            this.aimPounce(0.4);
          } else {
            this.state = 'walk';
            this.timer = Phaser.Math.FloatBetween(1, 1.6) / rage;
          }
        }
        break;
    }
  }

  private pick(): void {
    this.minions = this.minions.filter((m) => m.active && !m.dead);
    const options = ['roar', 'pounce', ...(this.minions.length < 2 ? ['summon'] : [])].filter((a) => a !== this.last);
    const a = Phaser.Utils.Array.GetRandom(options) as string;
    this.last = a;
    if (a === 'roar') {
      this.state = 'roarWindup';
      this.timer = 0.6;
    } else if (a === 'pounce') {
      this.state = 'crouch';
      this.timer = 0.55;
      this.pouncesLeft = this.enraged ? 1 : 0;
      this.aimPounce(0.55);
    } else {
      this.sc.snd('jefe');
      for (const dx of [-28, 28]) {
        const x = Phaser.Math.Clamp(this.x + dx, 30, 210);
        const m = this.sc.spawn('payasito', x, Phaser.Math.Clamp(this.y + 10, 30, 115));
        this.minions.push(m);
      }
      this.state = 'walk';
      this.timer = 1.4;
    }
  }

  /** Apunta el salto y lo avisa con una línea y la zona donde caerá. */
  private aimPounce(dur: number): void {
    const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    this.dir.set(Math.cos(a), Math.sin(a));
    const len = 230 * 0.5;
    const ex = Phaser.Math.Clamp(this.x + this.dir.x * len, 24, 216),
      ey = Phaser.Math.Clamp(this.y + this.dir.y * len, 24, 120);
    this.sc.telegraph.line(this.x, this.y, ex, ey, dur, { owner: this, w: 16 });
    this.sc.telegraph.circle(ex, ey, 22, dur + 0.5, { owner: this });
    this.windupFlash();
  }

  private roar(): void {
    this.sc.snd('pisoton');
    this.sc.shake(300, 0.012);
    this.sc.shockwave(this.x, this.y);
    const ring = (offset: number) => {
      const n = this.enraged ? 16 : 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + offset;
        this.sc.spawnShot(this.x, this.y - 4, Math.cos(a) * 85, Math.sin(a) * 85, false, { damage: 1, range: 170 });
      }
    };
    ring(0);
    if (this.enraged) this.sc.time.delayedCall(350, () => this.active && !this.dead && ring(Math.PI / 18));
    // El rugido empuja al payaso (sin lanzarlo contra sus propias balas).
    const p = this.player;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    p.vel.set(Math.cos(a) * 110, Math.sin(a) * 110);
  }

  private land(): void {
    this.lift = 0;
    this.flying = false;
    this.contact = 2;
    this.state = 'dazed';
    this.timer = 0.6;
    this.sc.snd('pisoton');
    this.sc.shake(160, 0.01);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.sc.spawnShot(this.x, this.y + 4, Math.cos(a) * 90, Math.sin(a) * 90, false, { damage: 1, range: 100 });
    }
  }

  die(): void {
    for (const m of this.minions) if (m.active && !m.dead) m.die();
    super.die();
  }
}

/** Cabeza de La Mujer Serpiente. Su cuerpo son segmentos que la siguen. */
export class SerpienteCabeza extends Enemy {
  segments: SerpienteSegmento[] = [];
  /** Cada segmento va (índice+1)·5/60 s por detrás de la cabeza, a cualquier tasa de refresco. */
  trail = new TimeTrail(1.2);
  heading = Math.PI / 2;
  spitT = 2;
  dropT = 3;
  t = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'serpiente_cabeza', { hp: 400, speed: 68, body: { w: 14, h: 12, dy: 2 }, name: 'La Mujer Serpiente', fixedHp: true });
    this.isBoss = true;
    this.wake = 1.4;
    this.contact = 1;
    for (let i = 0; i < 10; i++) this.segments.push(new SerpienteSegmento(scene, x, y - i * 6, this, i));
  }

  get enraged(): boolean {
    return this.hp < this.maxHp * 0.5;
  }

  protected think(dt: number): void {
    this.t += dt;
    const rage = this.enraged ? 1.45 : 1;
    // Gira poco a poco hacia el payaso, ondulando.
    const target = Math.atan2(this.player.y - this.y, this.player.x - this.x) + Math.sin(this.t * 2.2) * 0.9;
    const diff = Phaser.Math.Angle.Wrap(target - this.heading);
    this.heading += Phaser.Math.Clamp(diff, -2.2 * dt, 2.2 * dt);
    const b = this.body.blocked;
    if (b.left || b.right) this.heading = Math.PI - this.heading;
    if (b.up || b.down) this.heading = -this.heading;
    this.desired.set(Math.cos(this.heading) * this.speed * rage, Math.sin(this.heading) * this.speed * rage);
    this.setFrame(Math.cos(this.heading) < 0 ? 1 : 0);

    this.spitT -= dt;
    if (this.spitT <= 0) {
      this.spitT = (this.enraged ? 1.6 : 2.4) + Math.random() * 0.5;
      // Aviso: abre la boca y apunta 0,35 s antes de escupir.
      this.windupFlash();
      const base = Math.atan2(this.player.y - 4 - this.y, this.player.x - this.x);
      this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(base) * 80, this.y + Math.sin(base) * 80, 0.35, { owner: this, color: 0x79b84a });
      this.sc.snd('aviso');
      this.after(0.35, () => {
        // Escupe hacia donde avisó (justo y legible).
        this.fan(5, 0.2, 110, { texture: 'bala_veneno' }, base);
        this.sc.snd('golosina');
      });
    }
    if (this.enraged) {
      this.dropT -= dt;
      if (this.dropT <= 0) {
        this.dropT = 2.2;
        for (const s of this.segments) {
          if (s.index % 3 !== 0) continue;
          const a = Math.random() * Math.PI * 2;
          this.sc.spawnShot(s.x, s.y, Math.cos(a) * 70, Math.sin(a) * 70, false, { damage: 1, range: 90 });
        }
      }
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead || !this.active) return;
    this.trail.push(this.x, this.y, Math.min(0.05, delta / 1000));
    for (const s of this.segments) s.follow(this.trail);
  }

  die(): void {
    if (this.dead) return;
    for (const s of this.segments) {
      if (s.active) {
        this.sc.confetti(s.x, s.y, 4);
        s.dead = true;
        s.destroy();
      }
    }
    this.segments = [];
    super.die();
  }
}

export class SerpienteSegmento extends Enemy {
  constructor(scene: GameScene, x: number, y: number, public head: SerpienteCabeza, public index: number) {
    super(scene, x, y, 'serpiente_cuerpo', { hp: 9999, speed: 0, flying: true, body: { w: 10, h: 8, dy: 0 }, name: 'Cuerpo', fixedHp: true, noSmoke: true });
    this.countsForClear = false;
    this.isBoss = true;
    this.wake = 1.4;
    this.setFrame(index % 2);
  }
  protected think(): void {
    /* lo mueve la cabeza */
  }
  follow(trail: TimeTrail): void {
    const p = trail.at(((this.index + 1) * 5) / 60);
    if (!p) return;
    this.setPosition(p.x, p.y + 2);
    this.body.reset(p.x, p.y + 2);
    this.setDepth(DEPTH.world + p.y - 1);
  }
  /** Los golpes al cuerpo hieren a la cabeza (algo menos). */
  damage(amount: number, from: { x: number; y: number } | null, knockback = 0, silent = false): boolean {
    if (this.head.dead) return false;
    this.setTintFill(0xffffff);
    this.flashT = 0.06;
    return this.head.damage(amount * 0.6, from, knockback, silent);
  }
}
