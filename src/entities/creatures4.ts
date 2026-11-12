// Criaturas del Acto IV: La Pista Central. Todo es un número y todo avisa.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy, EnemyOpts, anim } from './Enemy';
import { addTether } from './tether';
import { lob } from './Lob';
import { DEPTH } from '../config';
import { Obstacle, Fire } from './props';
import { TimeTrail } from '../core/trail';

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

// ---------------------------------------------------------------------------
// Nuevas del Acto IV
// ---------------------------------------------------------------------------

/**
 * Coche de payasos: rueda en línea recta rebotando en las paredes. Cada poco
 * frena, abre la puerta (aviso) y baja un payasito; lleva cuatro. Si lo
 * rompes, salen de golpe los que queden: cuanto antes, mejor.
 */
export class CochePayasos extends Enemy {
  dir = new Phaser.Math.Vector2(Math.random() < 0.5 ? 1 : -1, Math.random() < 0.5 ? 0.6 : -0.6).normalize();
  inside = 4;
  dropT = Phaser.Math.FloatBetween(2, 3);
  stopT = 0;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    if (this.stopT > 0) {
      this.stopT -= dt;
      this.setFrame(1);
      if (this.stopT <= 0) this.dropClown();
      return;
    }
    this.setFrame(0);
    const b = this.body.blocked;
    const tc = this.body.touching;
    if ((b.left || tc.left) && this.dir.x < 0) this.dir.x *= -1;
    if ((b.right || tc.right) && this.dir.x > 0) this.dir.x *= -1;
    if ((b.up || tc.up) && this.dir.y < 0) this.dir.y *= -1;
    if ((b.down || tc.down) && this.dir.y > 0) this.dir.y *= -1;
    this.desired.set(this.dir.x * this.speed, this.dir.y * this.speed);
    this.setFlipX(this.dir.x < 0);
    this.dropT -= dt;
    if (this.dropT <= 0 && this.inside > 0) {
      this.dropT = 3.5;
      this.stopT = 0.8;
      this.windupFlash();
      this.sc.snd('bocinazo');
      this.sc.telegraph.marker(this.x, this.y + 12, 0.8, { owner: this, color: 0xf2a3b5 });
    }
  }
  private dropClown(): void {
    if (this.inside <= 0) return;
    this.inside--;
    const e = this.sc.spawn('payasito', this.x, Math.min(124, this.y + 12));
    e.wake = 0.5;
  }
  die(): void {
    if (this.dead) return;
    const sc = this.sc;
    for (let i = 0; i < this.inside; i++) {
      const a = (i / Math.max(1, this.inside)) * Math.PI * 2;
      const e = sc.spawn('payasito', Phaser.Math.Clamp(this.x + Math.cos(a) * 12, 28, 212), Phaser.Math.Clamp(this.y + Math.sin(a) * 10, 28, 116));
      e.wake = 0.6;
    }
    this.inside = 0;
    super.die();
  }
}

/** Colores de aviso de cada instrumento. */
const INSTRUMENTO = [
  { name: 'bombo', color: 0xd4323f },
  { name: 'platillos', color: 0xf2c14e },
  { name: 'trompeta', color: 0x4f8fd1 },
] as const;

/**
 * Hombre orquesta: anda despacio hacia ti y toca, siempre en el mismo orden y
 * con 0,6 s de aviso de su color: bombo (rojo, anillo de 10), platillos
 * (amarillo, dos abanicos a los lados) y trompeta (azul, tres balas rápidas).
 */
export class Orquesta extends Enemy {
  timer = Phaser.Math.FloatBetween(1.6, 2.4);
  windup = 0;
  next = 0;
  offset = false;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.setFlipX(this.player.x < this.x);
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(Math.floor(this.t * 8) % 2);
      if (this.windup <= 0) this.tocar();
      return;
    }
    this.setFrame(0);
    if (this.distToPlayer() > 40) this.chase();
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 2.6;
      this.windup = 0.6;
      const ins = INSTRUMENTO[this.next];
      this.setTint(ins.color);
      this.sc.snd('aviso');
      const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
      if (ins.name === 'bombo') this.sc.telegraph.circle(this.x, this.y, 20, 0.6, { owner: this, color: ins.color });
      else if (ins.name === 'platillos') {
        for (const s of [-1, 1]) {
          const b = a + (s * Math.PI) / 2;
          this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(b) * 70, this.y + Math.sin(b) * 70, 0.6, { owner: this, color: ins.color, w: 10 });
        }
      } else this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(a) * 90, this.y + Math.sin(a) * 90, 0.6, { owner: this, color: ins.color, w: 6 });
    }
  }
  private tocar(): void {
    this.restoreTint();
    const ins = INSTRUMENTO[this.next];
    this.next = (this.next + 1) % INSTRUMENTO.length;
    const a = Math.atan2(this.player.y - 6 - this.y, this.player.x - this.x);
    if (ins.name === 'bombo') {
      this.ring(10, 75, {}, this.offset ? Math.PI / 10 : 0);
      this.offset = !this.offset;
      this.sc.snd('bombo');
    } else if (ins.name === 'platillos') {
      this.fan(4, 0.25, 95, {}, a + Math.PI / 2);
      this.fan(4, 0.25, 95, {}, a - Math.PI / 2);
      this.sc.snd('platillos');
    } else {
      this.sc.snd('trompeta');
      for (let i = 0; i < 3; i++) this.after(i * 0.15, () => this.fan(1, 0, 130, {}, a));
    }
  }
}

/** Segmento del dragón: lo mueve la cabeza; los golpes le llegan a ella (60 %). */
export class DragonSegmento extends Enemy {
  constructor(scene: GameScene, x: number, y: number, public head: Dragon, public index: number) {
    super(scene, x, y, 'dragon_cuerpo', { hp: 9999, speed: 0, flying: true, body: { w: 10, h: 10, dy: 0 }, name: 'Dragón de papel', fixedHp: true, noSmoke: true });
    this.countsForClear = false;
    this.targetable = false;
    this.wake = 0.7;
    this.setFrame(index % 2);
  }
  protected think(): void {
    /* lo mueve la cabeza */
  }
  follow(trail: TimeTrail): void {
    const p = trail.at(((this.index + 1) * 9) / 60);
    if (!p) return;
    this.setPosition(p.x, p.y + 2);
    this.body.reset(p.x, p.y + 2);
    this.setDepth(DEPTH.world + p.y - 1);
  }
  damage(amount: number, from: { x: number; y: number } | null, knockback = 0, silent = false): boolean {
    if (this.head.dead) return false;
    this.setTintFill(0xffffff);
    this.flashT = 0.06;
    return this.head.damage(amount * 0.6, from, knockback, silent);
  }
}

/**
 * Dragón de papel: cabeza y cuatro farolillos que la siguen. Serpentea hacia
 * ti y la cola va dejando fuego (como mucho ocho a la vez). No dispara: su
 * peligro es el suelo, y el fuego se puede apagar a disparos.
 */
export class Dragon extends Enemy {
  segments: DragonSegmento[] = [];
  trail = new TimeTrail(1.2);
  heading = Math.random() * Math.PI * 2;
  fireT = 1.1;
  t = Math.random() * 5;
  private fires: Fire[] = [];
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o);
    for (let i = 0; i < 4; i++) this.segments.push(new DragonSegmento(scene, x, y, this, i));
  }
  protected think(dt: number): void {
    this.t += dt;
    const target = Math.atan2(this.player.y - this.y, this.player.x - this.x) + Math.sin(this.t * 2) * 0.8;
    const diff = Phaser.Math.Angle.Wrap(target - this.heading);
    this.heading += Phaser.Math.Clamp(diff, -2.4 * dt, 2.4 * dt);
    const b = this.body.blocked;
    if (b.left || b.right) this.heading = Math.PI - this.heading;
    if (b.up || b.down) this.heading = -this.heading;
    this.desired.set(Math.cos(this.heading) * this.speed, Math.sin(this.heading) * this.speed);
    this.setFrame(Math.cos(this.heading) < 0 ? 1 : 0);
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = 1.1;
      this.fires = this.fires.filter((f) => f.active);
      const tail = this.segments[this.segments.length - 1];
      if (tail && this.fires.length < 8) {
        const before = this.sc.hazards.length;
        this.sc.spawnFire(tail.x, tail.y + 4, 6);
        if (this.sc.hazards.length > before) this.fires.push(this.sc.hazards[this.sc.hazards.length - 1]);
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
  destroy(fromScene?: boolean): void {
    for (const s of this.segments) if (s.active) s.destroy();
    this.segments = [];
    super.destroy(fromScene);
  }
}
