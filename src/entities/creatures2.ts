// Criaturas del Acto II: Las Jaulas.
import Phaser from 'phaser';
import { Enemy } from './Enemy';

const anim = (t: number, fps: number, frames: number) => Math.floor(t * fps) % frames;

/** León sarnoso: te acecha y, si te tiene a tiro, salta sobre ti. */
export class Leon extends Enemy {
  state: 'stalk' | 'crouch' | 'pounce' | 'rest' = 'stalk';
  timer = 0;
  dir = new Phaser.Math.Vector2();
  t = Math.random();
  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    switch (this.state) {
      case 'stalk':
        this.setFrame(anim(this.t, 6, 2));
        this.chase();
        this.setFlipX(this.player.x < this.x);
        if (this.distToPlayer() < 80 && this.sc.nav.lineFree(this.x, this.y, this.player.x, this.player.y)) {
          this.state = 'crouch';
          this.timer = 0.45;
        }
        break;
      case 'crouch':
        this.setFrame(2);
        if (this.timer <= 0) {
          const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
          this.dir.set(Math.cos(a), Math.sin(a));
          this.state = 'pounce';
          this.timer = 0.38;
          this.sc.snd('salto');
        }
        break;
      case 'pounce':
        this.setFrame(3);
        this.desired.set(this.dir.x * 210, this.dir.y * 210);
        this.lift = Math.sin((1 - this.timer / 0.38) * Math.PI) * 8;
        if (this.timer <= 0) {
          this.lift = 0;
          this.state = 'rest';
          this.timer = 0.7;
        }
        break;
      case 'rest':
        this.setFrame(0);
        if (this.timer <= 0) this.state = 'stalk';
        break;
    }
  }
}

/** Cobra del faquir: sale del cesto, escupe y cambia de cesto. */
export class Cobra extends Enemy {
  state: 'hidden' | 'rising' | 'up' | 'sinking' = 'hidden';
  timer = Phaser.Math.FloatBetween(0.6, 1.6);
  shots = 0;
  protected think(dt: number): void {
    this.timer -= dt;
    this.body.setImmovable(true);
    switch (this.state) {
      case 'hidden':
        this.setFrame(0);
        this.invulnerable = true;
        this.contact = 0;
        if (this.timer <= 0) {
          this.state = 'rising';
          this.timer = 0.3;
        }
        break;
      case 'rising':
        this.setFrame(1);
        if (this.timer <= 0) {
          this.state = 'up';
          this.timer = 1.8;
          this.shots = 0;
          this.invulnerable = false;
          this.contact = 1;
        }
        break;
      case 'up':
        this.setFrame(2);
        if (this.timer < 1.3 - this.shots * 0.6 && this.shots < 2) {
          this.shots++;
          const base = Math.atan2(this.player.y - 6 - (this.y - 6), this.player.x - this.x);
          const n = this.champion ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.28;
            this.sc.spawnShot(this.x, this.y - 8, Math.cos(a) * 100, Math.sin(a) * 100, false, {
              damage: 1, range: 170, texture: 'bala_veneno',
            });
          }
          this.sc.snd('golosina');
        }
        if (this.timer <= 0) {
          this.state = 'sinking';
          this.timer = 0.3;
        }
        break;
      case 'sinking':
        this.setFrame(1);
        this.invulnerable = true;
        if (this.timer <= 0) {
          // Se esconde y reaparece en otro sitio libre.
          const spot = this.sc.nav.randomFreeTile(this.x, this.y, 90);
          if (Phaser.Math.Distance.Between(spot.x, spot.y, this.player.x, this.player.y) > 30) {
            this.setPosition(spot.x, spot.y);
            this.body.reset(spot.x, spot.y);
          }
          this.state = 'hidden';
          this.timer = Phaser.Math.FloatBetween(1, 1.8);
        }
        break;
    }
  }
}

/** Oso bailarín: lento y duro; de vez en cuando gira y suelta una espiral. */
export class Oso extends Enemy {
  timer = Phaser.Math.FloatBetween(2, 3.2);
  spin = 0;
  shotT = 0;
  angle = 0;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    if (this.spin > 0) {
      this.spin -= dt;
      this.shotT -= dt;
      this.setFrame(2 + (Math.floor(this.t * 10) % 2));
      if (this.shotT <= 0) {
        this.shotT = 0.12;
        this.angle += 0.55;
        for (const off of [0, Math.PI]) {
          const a = this.angle + off;
          this.sc.spawnShot(this.x, this.y - 4, Math.cos(a) * 80, Math.sin(a) * 80, false, { damage: 1, range: 130 });
        }
      }
      if (this.spin <= 0) this.timer = Phaser.Math.FloatBetween(2.6, 3.6);
      return;
    }
    this.setFrame(anim(this.t, 3, 2));
    this.chase();
    this.timer -= dt;
    if (this.timer <= 0) {
      this.spin = 1.1;
      this.shotT = 0;
    }
  }
}

/** Loro carroñero: vuela en círculos y se lanza en picado. */
export class Loro extends Enemy {
  orbit = Math.random() * Math.PI * 2;
  timer = Phaser.Math.FloatBetween(1.5, 2.5);
  dive = 0;
  dir = new Phaser.Math.Vector2();
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.lift = 6;
    this.setFrame(anim(this.t, 10, 2));
    if (this.dive > 0) {
      this.dive -= dt;
      this.desired.set(this.dir.x * 175, this.dir.y * 175);
      this.setFlipX(this.dir.x < 0);
      return;
    }
    this.timer -= dt;
    this.orbit += dt * 1.6;
    const p = this.player;
    this.toward(p.x + Math.cos(this.orbit) * 52, p.y + Math.sin(this.orbit) * 40, this.speed);
    this.setFlipX(this.desired.x < 0);
    if (this.timer <= 0) {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      this.dir.set(Math.cos(a), Math.sin(a));
      this.dive = 0.6;
      this.timer = Phaser.Math.FloatBetween(2, 2.8);
      this.sc.snd('salto');
    }
  }
}

/** Domador zombi: guarda las distancias y da latigazos que viajan en línea. */
export class Domador extends Enemy {
  timer = Phaser.Math.FloatBetween(1.5, 2.5);
  windup = 0;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    const p = this.player;
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(2);
      if (this.windup <= 0) this.lash();
      return;
    }
    const d = this.distToPlayer();
    if (d < 60) this.flee();
    else if (d > 90) this.chase();
    this.setFrame(anim(this.t, 4, 2));
    this.setFlipX(p.x < this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = Phaser.Math.FloatBetween(2.2, 3);
      this.windup = 0.45;
    }
  }
  private lash(): void {
    const a = Math.atan2(this.player.y - 4 - this.y, this.player.x - this.x);
    this.sc.snd('latigo');
    const n = this.champion ? 7 : 5;
    for (let i = 0; i < n; i++) {
      this.sc.time.delayedCall(i * 45, () => {
        if (!this.active || this.dead) return;
        this.sc.spawnShot(this.x + Math.cos(a) * 8, this.y - 4 + Math.sin(a) * 8, Math.cos(a) * 150, Math.sin(a) * 150, false, {
          damage: 1, range: 70 + i * 12,
        });
      });
    }
  }
}

/** Payasito triste: rápido, frágil y llora al morir. */
export class Payasito extends Enemy {
  t = Math.random();
  protected think(dt: number): void {
    this.t += dt;
    this.chase();
    this.setFrame(anim(this.t, 8, 2));
    this.setFlipX(this.player.x < this.x);
  }
  die(): void {
    if (this.dead) return;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      this.sc.spawnShot(this.x, this.y, Math.cos(a) * 75, Math.sin(a) * 75, false, { damage: 1, range: 70 });
    }
    super.die();
  }
}
