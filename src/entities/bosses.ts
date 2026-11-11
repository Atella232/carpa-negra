// Jefes del Acto I: El Forzudo y Los Siameses.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy } from './Enemy';

/** El Forzudo: lanza pesas, da pisotones con onda expansiva y embiste. */
export class Forzudo extends Enemy {
  state: 'walk' | 'windupPesa' | 'windupCharge' | 'charge' | 'dazed' | 'jump' | 'fall' = 'walk';
  timer = 1.5;
  dir = new Phaser.Math.Vector2();
  jumpFrom = new Phaser.Math.Vector2();
  jumpTo = new Phaser.Math.Vector2();
  jumpT = 0;
  lastAttack = '';

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'forzudo', {
      hp: 300, speed: 30, body: { w: 26, h: 20, dy: 8 }, name: 'El Forzudo',
    });
    this.isBoss = true;
    this.wake = 1.4;
    this.body.setMass(20);
    this.contact = 2;
  }

  get enraged(): boolean {
    return this.hp < this.maxHp * 0.5;
  }

  protected think(dt: number): void {
    this.timer -= dt;
    const rage = this.enraged ? 1.35 : 1;
    switch (this.state) {
      case 'walk':
        this.setFrame(0);
        this.chase(this.speed * rage);
        if (this.timer <= 0) this.pickAttack();
        break;
      case 'windupPesa':
        this.setFrame(1);
        if (this.timer <= 0) {
          this.throwWeights();
          this.state = 'walk';
          this.timer = Phaser.Math.FloatBetween(1.2, 2) / rage;
        }
        break;
      case 'windupCharge':
        this.setFrame(2);
        this.x += Math.sin(this.timer * 70) * 0.6;
        if (this.timer <= 0) {
          const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
          this.dir.set(Math.cos(a), Math.sin(a));
          this.state = 'charge';
          this.timer = 1.6;
        }
        break;
      case 'charge': {
        this.setFrame(0);
        const v = 175 * rage;
        this.desired.set(this.dir.x * v, this.dir.y * v);
        const b = this.body.blocked;
        if (b.left || b.right || b.up || b.down || this.timer <= 0) {
          this.state = 'dazed';
          this.timer = 1.1;
          this.sc.snd('pisoton');
          this.sc.shake(200, 0.012);
          // Del techo de la carpa caen trastos.
          for (let i = 0; i < (this.enraged ? 6 : 3); i++) {
            const x = Phaser.Math.Between(30, 210);
            this.sc.time.delayedCall(200 + i * 120, () => {
              if (!this.active) return;
              this.sc.spawnShot(x, 20, 0, 110, false, { damage: 1, range: 120, texture: 'bala_grande' });
            });
          }
        }
        break;
      }
      case 'dazed':
        this.setFrame(2);
        if (this.timer <= 0) {
          this.state = 'walk';
          this.timer = Phaser.Math.FloatBetween(1, 1.8) / rage;
        }
        break;
      case 'jump': {
        this.setFrame(1);
        this.jumpT += dt;
        const k = Math.min(1, this.jumpT / 0.7);
        this.lift = Math.sin(k * Math.PI * 0.5) * 60;
        this.contact = 0;
        this.flying = true;
        // Sigue al jugador mientras está en el aire.
        this.jumpTo.lerp(new Phaser.Math.Vector2(this.player.x, this.player.y - 6), 0.04);
        this.desired.set((this.jumpTo.x - this.x) * 3, (this.jumpTo.y - this.y) * 3);
        if (k >= 1) {
          this.state = 'fall';
          this.jumpT = 0;
        }
        break;
      }
      case 'fall': {
        this.setFrame(2);
        this.jumpT += dt;
        const k = Math.min(1, this.jumpT / 0.22);
        this.lift = 60 * (1 - k);
        if (k >= 1) this.land();
        break;
      }
    }
  }

  private pickAttack(): void {
    const options = ['pesa', 'charge', 'jump'].filter((a) => a !== this.lastAttack);
    const a = Phaser.Utils.Array.GetRandom(options) as string;
    this.lastAttack = a;
    if (a === 'pesa') {
      this.state = 'windupPesa';
      this.timer = 0.55;
    } else if (a === 'charge') {
      this.state = 'windupCharge';
      this.timer = 0.65;
    } else {
      this.state = 'jump';
      this.jumpT = 0;
      this.jumpFrom.set(this.x, this.y);
      this.jumpTo.set(this.player.x, this.player.y);
      this.sc.snd('salto');
    }
  }

  private throwWeights(): void {
    const n = this.enraged ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.sc.time.delayedCall(i * 350, () => {
        if (!this.active || this.dead) return;
        const p = this.player;
        const d = Phaser.Math.Distance.Between(this.x, this.y - 14, p.x, p.y);
        const a = Math.atan2(p.y - (this.y - 14), p.x - this.x);
        this.sc.spawnShot(this.x, this.y - 14, Math.cos(a) * 120, Math.sin(a) * 120, false, {
          damage: 2, range: Math.max(30, d), texture: 'pesa', rotate: true, burst: this.enraged ? 8 : 6,
        });
        this.sc.snd('cuchillo');
      });
    }
  }

  private land(): void {
    this.lift = 0;
    this.flying = false;
    this.contact = 2;
    this.state = 'dazed';
    this.timer = 0.8;
    this.sc.snd('pisoton');
    this.sc.shake(250, 0.015);
    this.sc.shockwave(this.x, this.y + 8);
    const n = this.enraged ? 14 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.sc.spawnShot(this.x, this.y + 6, Math.cos(a) * 90, Math.sin(a) * 90, false, { damage: 1, range: 160 });
    }
    if (Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y) < 26) {
      this.sc.hurtPlayer(2, this.x, this.y);
    }
  }
}

/** Uno de Los Siameses. Van atados por una cuerda que también hace daño. */
export class Siames extends Enemy {
  twin: Siames | null = null;
  role: 'tiro' | 'tiron';
  timer = 1.2;
  state: 'move' | 'windup' | 'charge' = 'move';
  dir = new Phaser.Math.Vector2();
  orbit = Math.random() * Math.PI * 2;

  constructor(scene: GameScene, x: number, y: number, role: 'tiro' | 'tiron') {
    super(scene, x, y, role === 'tiro' ? 'siames_a' : 'siames_b', {
      hp: 140, speed: role === 'tiro' ? 48 : 40, body: { w: 14, h: 14, dy: 6 },
      name: role === 'tiro' ? 'Tiro' : 'Tirón',
    });
    this.role = role;
    this.isBoss = true;
    this.wake = 1.4;
  }

  get enraged(): boolean {
    return !this.twin || this.twin.dead;
  }

  protected think(dt: number): void {
    this.timer -= dt;
    const rage = this.enraged ? 1.5 : 1;
    if (this.role === 'tiro') {
      // Mantiene la distancia y dispara en abanico.
      this.orbit += dt * 0.8;
      const p = this.player;
      const tx = p.x + Math.cos(this.orbit) * 80;
      const ty = p.y + Math.sin(this.orbit) * 50;
      this.toward(Phaser.Math.Clamp(tx, 30, 210), Phaser.Math.Clamp(ty, 30, 115), this.speed * rage);
      this.setFrame(this.timer < 0.3 ? 1 : 0);
      if (this.timer <= 0) {
        const n = this.enraged ? 5 : 3;
        const base = Math.atan2(p.y - 6 - this.y, p.x - this.x);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.22;
          this.sc.spawnShot(this.x, this.y - 6, Math.cos(a) * 110, Math.sin(a) * 110, false, { damage: 1, range: 200 });
        }
        this.sc.snd('disparo');
        this.timer = (this.enraged ? 1.0 : 1.7) + Math.random() * 0.4;
      }
    } else {
      switch (this.state) {
        case 'move':
          this.setFrame(0);
          this.chase(this.speed * rage);
          if (this.timer <= 0) {
            this.state = 'windup';
            this.timer = 0.5;
          }
          break;
        case 'windup': {
          this.setFrame(1);
          this.x += Math.sin(this.timer * 80) * 0.5;
          if (this.timer <= 0) {
            const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
            this.dir.set(Math.cos(a), Math.sin(a));
            this.state = 'charge';
            this.timer = 0.7;
          }
          break;
        }
        case 'charge': {
          this.setFrame(1);
          const v = 160 * rage;
          this.desired.set(this.dir.x * v, this.dir.y * v);
          const b = this.body.blocked;
          if (b.left || b.right || b.up || b.down || this.timer <= 0) {
            this.state = 'move';
            this.timer = (this.enraged ? 1.4 : 2.6) + Math.random();
            if (b.left || b.right || b.up || b.down) this.sc.shake(80, 0.006);
          }
          break;
        }
      }
    }
    // La cuerda: si se alejan demasiado, tira de ambos.
    if (this.twin && !this.twin.dead) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.twin.x, this.twin.y);
      const max = 96;
      if (d > max) {
        const a = Math.atan2(this.twin.y - this.y, this.twin.x - this.x);
        const pull = (d - max) * 6;
        this.desired.x += Math.cos(a) * pull;
        this.desired.y += Math.sin(a) * pull;
      }
    }
  }
}

export function spawnSiameses(scene: GameScene, x: number, y: number): Siames[] {
  const a = new Siames(scene, x - 30, y, 'tiro');
  const b = new Siames(scene, x + 30, y, 'tiron');
  a.twin = b;
  b.twin = a;
  return [a, b];
}
