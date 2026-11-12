// Criaturas del Acto IV: La Pista Central. Todo es un número y todo avisa.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy, EnemyOpts, anim } from './Enemy';
import { addTether } from './tether';
import { lob } from './Lob';
import { Obstacle } from './props';

/** Trapecista: se balancea; solo se le puede dar en lo bajo del arco. */
export class Trapecista extends Enemy {
  anchor = { x: 0, y: 18, active: true };
  len = 40;
  amp = 1.05;
  phase = Math.random() * Math.PI * 2;
  swings = 0;
  fallT = 0;
  private lastSign = 0;
  private started = false;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o);
    this.anchor.x = x;
    this.len = Math.max(28, y - 18);
  }
  protected think(dt: number): void {
    if (!this.started) {
      this.started = true;
      addTether(this.sc, this.anchor, this, { color: 0xa8673b, width: 1, sag: 0, visible: () => this.fallT <= 0 });
    }
    if (this.fallT > 0) {
      // En el suelo: aturdida y expuesta.
      this.fallT -= dt;
      this.lift = 0;
      this.setFrame(2);
      if (this.fallT <= 0) {
        this.swings = 0;
        this.sc.snd('trapecio');
      }
      return;
    }
    this.phase += dt * 1.9;
    const th = this.amp * Math.sin(this.phase);
    const tx = Phaser.Math.Clamp(this.anchor.x + this.len * Math.sin(th), 24, 216);
    const ty = this.anchor.y + this.len * Math.cos(th);
    this.desired.set((tx - this.x) / Math.max(dt, 0.016), (ty - this.y) / Math.max(dt, 0.016));
    // Arriba (en los extremos) está fuera de alcance.
    this.lift = ((1 - Math.cos(th)) / (1 - Math.cos(this.amp))) * 22;
    this.setFrame(Math.abs(th) > this.amp * 0.7 ? 1 : 0);
    this.setFlipX(th < 0);
    const sign = Math.sign(Math.cos(this.phase));
    if (sign !== this.lastSign && this.lastSign !== 0) {
      // Extremo del vaivén: un vaivén sí y otro no, lanza cuchillos.
      this.swings++;
      if (this.swings % 2 === 0) {
        this.windupFlash();
        this.fan(this.champion ? 3 : 2, 0.3, 100, { texture: 'cuchillo_enemigo', rotate: true, range: 160 });
        this.sc.snd('cuchillo');
      }
      if (this.swings >= 6) {
        this.fallT = 1.5;
        this.sc.fx.dust(this.x, this.y, 5);
        this.sc.snd('pisoton');
      }
    }
    this.lastSign = sign;
  }
}

/** Hombre bala: avisa con una línea y cruza la sala de un cañonazo. */
export class HombreBala extends Enemy {
  state: 'walk' | 'aim' | 'fly' | 'stun' = 'walk';
  timer = Phaser.Math.FloatBetween(1.5, 2.6);
  dir = new Phaser.Math.Vector2();
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    switch (this.state) {
      case 'walk':
        this.setFrame(anim(this.t, 4, 2));
        this.chase(this.speed);
        if (this.timer <= 0) {
          const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
          this.dir.set(Math.cos(a), Math.sin(a));
          this.state = 'aim';
          this.timer = 0.7;
          this.windupFlash();
          this.sc.telegraph.line(this.x, this.y, this.x + this.dir.x * 260, this.y + this.dir.y * 260, 0.7, { owner: this, w: 12 });
          this.sc.snd('mecha');
        }
        break;
      case 'aim':
        this.setFrame(2);
        this.setRotation(Math.atan2(this.dir.y, this.dir.x) + Math.PI / 2);
        if (this.timer <= 0) {
          this.state = 'fly';
          this.timer = 2;
          this.sc.snd('canonPista');
          this.sc.shake(120, 0.006);
        }
        break;
      case 'fly': {
        this.setFrame(3);
        this.desired.set(this.dir.x * 260, this.dir.y * 260);
        // Rompe lo que se encuentre.
        for (const o of [...(this.sc.g.solids.getChildren() as Obstacle[])]) {
          if (o.kind !== 'bloque' && Phaser.Math.Distance.Between(o.x, o.y, this.x, this.y) < 14) this.sc.destroyObstacle(o, true);
        }
        const b = this.body.blocked;
        if (b.left || b.right || b.up || b.down || this.timer <= 0) {
          this.ring(8, 85, { range: 120 });
          this.sc.snd('pisoton');
          this.sc.shake(160, 0.01);
          this.state = 'stun';
          this.timer = 1.2;
          this.setRotation(0);
        }
        break;
      }
      case 'stun':
        this.setFrame(2);
        if (this.timer <= 0) {
          this.state = 'walk';
          this.timer = Phaser.Math.FloatBetween(2.2, 3.2);
        }
        break;
    }
  }
}

/** Zancudo: avanza a zancadas; cada pisada marca antes dónde caerá. */
export class Zancudo extends Enemy {
  timer = Phaser.Math.FloatBetween(0.8, 1.4);
  from = new Phaser.Math.Vector2();
  to = new Phaser.Math.Vector2();
  stepT = -1;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    if (this.stepT >= 0) {
      this.stepT += dt;
      const k = Math.min(1, this.stepT / 0.35);
      this.setFrame(1);
      this.flying = true;
      this.lift = Math.sin(k * Math.PI) * 10;
      this.desired.set((this.to.x - this.from.x) / 0.35, (this.to.y - this.from.y) / 0.35);
      if (k >= 1) {
        this.stepT = -1;
        this.flying = false;
        this.lift = 0;
        this.sc.fx.dust(this.x, this.y + 6, 6);
        this.sc.snd('pisoton');
        this.sc.shake(70, 0.004);
        if (Phaser.Math.Distance.Between(this.x, this.y + 6, this.player.x, this.player.y) < 15) this.sc.hurtPlayer(1, this.x, this.y);
        if (this.champion) this.ring(6, 70, { range: 80 });
        this.timer = Phaser.Math.FloatBetween(0.9, 1.3);
      }
      return;
    }
    this.setFrame(0);
    this.timer -= dt;
    if (this.timer <= 0) {
      const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
      const t = this.sc.nearestFreeTo(this.x + Math.cos(a) * 48, this.y + 6 + Math.sin(a) * 48);
      this.from.set(this.x, this.y);
      this.to.set(t.x, t.y - 6);
      this.sc.telegraph.circle(t.x, t.y, 14, 0.6, { owner: this });
      this.timer = 99;
      this.after(0.6, () => (this.stepT = 0));
    }
  }
}

/** Augusto, el payaso malo: tartas en parábola que dejan crema en el suelo. */
export class Augusto extends Enemy {
  timer = Phaser.Math.FloatBetween(1.4, 2.4);
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    const d = this.distToPlayer();
    if (d < 60) this.flee();
    else if (d > 110) this.chase();
    this.setFrame(anim(this.t, 4, 2));
    this.setFlipX(this.player.x < this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = Phaser.Math.FloatBetween(2.4, 3);
      this.windupFlash();
      const n = this.champion ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const tx = Phaser.Math.Clamp(this.player.x + (i - (n - 1) / 2) * 22, 24, 216);
        const ty = Phaser.Math.Clamp(this.player.y + 2, 24, 124);
        // La tarta sigue volando aunque el Augusto muera: se usa la escena, no la criatura.
        const sc = this.sc;
        lob(sc, this.x, this.y - 6, tx, ty, {
          texture: 'tarta_volando', dur: 0.9, height: 44, radius: 10, spin: true,
          onLand: (x, y) => {
            sc.addZone(x, y, 14, 4);
            sc.snd('tarta');
          },
        });
      }
      this.sc.snd('salto');
    }
  }
}

/** Acomodador: su farol acelera a los demás y señala tu sitio al público. */
export class Acomodador extends Enemy {
  timer = Phaser.Math.FloatBetween(3, 4);
  t = 0;
  private aura: Phaser.GameObjects.Image | null = null;
  protected think(dt: number): void {
    this.t += dt;
    if (!this.aura) {
      this.aura = this.sc.add.image(this.x, this.y, 'aura').setAlpha(0.35);
      this.sc.roomObjs.push(this.aura);
    }
    const allies = this.sc.clearPending().filter((e) => e !== this);
    // Se queda con los suyos, lejos del payaso.
    if (allies.length && this.distToPlayer() > 50) {
      const cx = allies.reduce((s, e) => s + e.x, 0) / allies.length;
      const cy = allies.reduce((s, e) => s + e.y, 0) / allies.length;
      this.toward(cx, cy, this.speed);
    } else this.flee();
    for (const e of allies) if (Phaser.Math.Distance.Between(e.x, e.y, this.x, this.y) < 52) e.hasteT = 0.3;
    this.setFrame(anim(this.t, 4, 2));
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = Phaser.Math.FloatBetween(4.5, 5.5);
      this.setFrame(2);
      this.sc.snd('batuta');
      this.sc.publicThrow(this.player.x, this.player.y, 1);
    }
  }
  protected tick(): void {
    this.aura?.setPosition(this.x, this.y + 4).setVisible(!this.dead);
  }
  die(): void {
    this.aura?.destroy();
    super.die();
  }
}

/** Mujer Barbuda (élite): latigazos de barba y tirones. Odia que lleves su barba. */
export class Barbuda extends Enemy {
  timer = 1.6;
  windup = 0;
  next: 'latigo' | 'tiron' = 'latigo';
  base = 0;
  furious = false;
  t = 0;
  private greeted = false;
  protected think(dt: number): void {
    this.t += dt;
    if (!this.greeted) {
      this.greeted = true;
      if (this.sc.run.player.passives.includes('barbaPostiza')) {
        this.furious = true;
        this.speed *= 1.3;
        this.sc.banner('¡Esa barba es MÍA!', 'La Mujer Barbuda quiere lo suyo');
      }
    }
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(2);
      if (this.windup <= 0) this.attack();
      return;
    }
    this.chase();
    this.setFrame(anim(this.t, 3, 2));
    this.setFlipX(this.player.x < this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = (this.furious ? 2 : 2.6) + Math.random() * 0.4;
      this.windup = 0.6;
      this.windupFlash();
      this.base = Math.atan2(this.player.y - this.y, this.player.x - this.x);
      if (this.next === 'latigo') {
        for (const off of [-0.45, 0, 0.45]) {
          const a = this.base + off;
          this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, 0.6, { owner: this, w: 6 });
        }
      } else this.sc.telegraph.circle(this.x, this.y, 60, 0.6, { owner: this, color: 0x8a6a2a });
      this.sc.snd('aviso');
    }
  }
  private attack(): void {
    if (this.next === 'latigo') {
      this.sc.snd('latigo');
      for (const off of [-0.45, 0, 0.45]) {
        const a = this.base + off;
        for (let i = 0; i < 5; i++) {
          this.after(i * 0.045, () =>
            this.sc.spawnShot(this.x + Math.cos(a) * 8, this.y - 4 + Math.sin(a) * 8, Math.cos(a) * 150, Math.sin(a) * 150, false, { damage: 1, range: 60 + i * 10 }),
          );
        }
      }
      this.next = 'tiron';
    } else {
      // Tirón: si estás cerca, te arrastra hacia ella.
      const p = this.player;
      if (Phaser.Math.Distance.Between(p.x, p.y, this.x, this.y) < 60) {
        const a = Math.atan2(this.y - p.y, this.x - p.x);
        p.vel.set(Math.cos(a) * 220, Math.sin(a) * 220);
        p.knockT = 0.25;
      }
      this.sc.snd('latigo');
      this.ring(10, 70, { range: 90 });
      this.next = 'latigo';
    }
  }
  die(): void {
    if (this.dead) return;
    if (this.furious) {
      this.sc.spawnPickup('globo_plata', this.x, this.y, { burst: true });
      this.sc.spawnPickup('taco_boletos', this.x, this.y, { burst: true });
    }
    super.die();
  }
}
