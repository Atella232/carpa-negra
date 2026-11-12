// Criaturas del Acto III: La Casa de los Espejos. Castigan disparar sin pensar.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Enemy, EnemyOpts, anim } from './Enemy';
import { addTether } from './tether';
import { TimeTrail } from '../core/trail';

/** Reflejo roto: se mueve como tú pero al revés y contesta a cada disparo. */
export class Reflejo extends Enemy {
  t = Math.random();
  private listening = false;
  protected think(dt: number): void {
    this.t += dt;
    if (!this.listening) {
      this.listening = true;
      this.sc.fireListeners.push(() => this.answer());
    }
    const v = this.player.vel;
    // Movimiento en espejo (X invertida); si el payaso está quieto, se acerca despacio.
    if (Math.abs(v.x) + Math.abs(v.y) > 8) this.desired.set(-v.x * 0.85, v.y * 0.85);
    else this.chase(this.speed * 0.4);
    this.setFrame(anim(this.t, 6, 2));
    this.setFlipX(this.player.x < this.x);
  }
  private cd = 0;
  protected tick(dt: number): void {
    this.cd = Math.max(0, this.cd - dt);
  }
  private answer(): void {
    if (this.dead || !this.active || this.wake > 0 || this.cd > 0) return;
    // Contesta como mucho cada 1,2 s (antes casi a cada disparo).
    this.cd = 1.2;
    this.windupFlash();
    this.after(0.25, () => {
      const n = this.champion ? 3 : 1;
      this.fan(n, 0.25, 100, { texture: 'bala' });
      this.sc.snd('espejo');
    });
  }
}

/** Bailarina de caja de música: se desliza recta, gira al chocar y suelta un anillo. */
export class Bailarina extends Enemy {
  dir = new Phaser.Math.Vector2(1, 0);
  spinT = 0;
  t = 0;
  private started = false;
  protected think(dt: number): void {
    this.t += dt;
    if (!this.started) {
      this.started = true;
      this.pickDir();
    }
    if (this.spinT > 0) {
      this.spinT -= dt;
      this.setFrame(2 + (Math.floor(this.t * 14) % 2));
      if (this.spinT <= 0) {
        this.ring(this.champion ? 10 : 6, 80, { range: 130 }, this.t);
        this.sc.snd('cajaMusica');
        this.pickDir();
      }
      return;
    }
    this.setFrame(anim(this.t, 5, 2));
    this.desired.set(this.dir.x * this.speed, this.dir.y * this.speed);
    const b = this.body.blocked,
      tc = this.body.touching;
    const hit = (b.left || tc.left) && this.dir.x < 0 || (b.right || tc.right) && this.dir.x > 0 || (b.up || tc.up) && this.dir.y < 0 || (b.down || tc.down) && this.dir.y > 0;
    if (hit) {
      this.spinT = 0.5;
      this.windupFlash();
      this.sc.telegraph.circle(this.x, this.y, 20, 0.5, { owner: this, color: 0xf2a3b5 });
    }
  }
  /** Sale hacia el eje en el que esté más lejos del payaso. */
  private pickDir(): void {
    const dx = this.player.x - this.x,
      dy = this.player.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.dir.set(Math.sign(dx) || 1, 0);
    else this.dir.set(0, Math.sign(dy) || 1);
  }
}

/** Señuelo del ilusionista: un golpe y desaparece en humo. */
export class Senuelo extends Enemy {
  owner: Enemy | null = null;
  t = 0;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o);
    this.countsForClear = false;
    this.targetable = true;
    this.contact = 0;
  }
  protected think(dt: number): void {
    this.t += dt;
    this.setFrame(anim(this.t, 3, 2));
    if (this.owner && (!this.owner.active || this.owner.dead)) this.die();
  }
  die(): void {
    if (this.dead) return;
    this.sc.splash(this.x, this.y, 'humo');
    this.sc.snd('humo');
    this.dead = true;
    this.destroy();
  }
}

/** Ilusionista: se teletransporta, lanza cartas que vuelven y deja señuelos. */
export class Ilusionista extends Enemy {
  timer = Phaser.Math.FloatBetween(1.2, 2);
  state: 'idle' | 'aim' = 'idle';
  decoys = false;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    this.setFlipX(this.player.x < this.x);
    if (this.state === 'aim') {
      this.setFrame(2);
      if (this.timer <= 0) {
        this.fan(this.champion ? 5 : 3, 0.35, 95, { texture: 'carta', boomerang: true, range: 120 });
        this.sc.snd('carta');
        this.state = 'idle';
        this.timer = Phaser.Math.FloatBetween(2.2, 3);
      }
      return;
    }
    this.setFrame(anim(this.t, 3, 2));
    if (this.timer <= 0) this.trick();
  }
  private trick(): void {
    const sc = this.sc;
    sc.splash(this.x, this.y, 'humo');
    sc.snd('humo');
    // Aparece lejos del payaso, en una baldosa libre.
    for (let i = 0; i < 12; i++) {
      const spot = sc.nav.randomFreeTile(120, 72, 140);
      if (Phaser.Math.Distance.Between(spot.x, spot.y, this.player.x, this.player.y) >= 60) {
        this.setPosition(spot.x, spot.y);
        this.body.reset(spot.x, spot.y);
        break;
      }
    }
    sc.splash(this.x, this.y, 'humo');
    if (!this.decoys) {
      this.decoys = true;
      for (let i = 0; i < 2; i++) {
        const spot = sc.nav.randomFreeTile(this.x, this.y, 70);
        const d = sc.spawn('senuelo', spot.x, spot.y) as Senuelo;
        d.owner = this;
      }
    }
    this.state = 'aim';
    this.timer = 0.65;
    this.windupFlash();
    const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    sc.telegraph.line(this.x, this.y, this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, 0.65, { owner: this, color: 0xc9b3ef });
  }
}

/** Muñeco: muerde y, mientras viva su ventrílocuo, se levanta a los 3 segundos. */
export class Munieco extends Enemy {
  t = Math.random();
  downT = 0;
  private warned = false;
  master: Ventrilocuo | null = null;
  protected think(dt: number): void {
    this.t += dt;
    if (this.downT > 0) {
      this.downT -= dt;
      this.setFrame(2);
      // Aviso: tiembla y marca el suelo antes de levantarse.
      if (this.downT < 0.7 && !this.warned) {
        this.warned = true;
        this.sc.telegraph.circle(this.x, this.y, 20, 0.7, { owner: this, color: 0xd6a66b });
        this.windupFlash();
      }
      if (this.downT <= 0) {
        this.invulnerable = false;
        this.contact = 1;
        this.hp = this.maxHp * 0.4;
        // Recién levantado tarda un instante en morder.
        this.wake = 0.6;
        this.warned = false;
        this.sc.splash(this.x, this.y, 'humo');
        this.sc.snd('carcajada');
      }
      return;
    }
    this.chase();
    this.setFrame(anim(this.t, 7, 2));
    this.setFlipX(this.player.x < this.x);
  }
  die(): void {
    if (this.dead) return;
    // Si su ventrílocuo sigue vivo, solo se cae.
    if (this.master && this.master.active && !this.master.dead) {
      this.downT = 4.5;
      this.hp = 1;
      this.invulnerable = true;
      this.contact = 0;
      this.sc.fx.debris(this.x, this.y, 0xd6a66b, 5);
      this.sc.snd('golpe');
      return;
    }
    super.die();
  }
  /** Muerte de verdad (cuando cae el ventrílocuo). */
  collapse(): void {
    this.master = null;
    this.invulnerable = false;
    this.downT = 0;
    this.die();
  }
}

/** Ventrílocuo: guarda las distancias y suelta carcajadas; sus muñecos dependen de él. */
export class Ventrilocuo extends Enemy {
  timer = Phaser.Math.FloatBetween(1.5, 2.5);
  windup = 0;
  t = 0;
  dolls: Munieco[] = [];
  private linked = false;
  protected think(dt: number): void {
    this.t += dt;
    if (!this.linked) {
      this.linked = true;
      for (const e of this.sc.clearPending()) {
        if (e instanceof Munieco && !e.master) {
          e.master = this;
          this.dolls.push(e);
          addTether(this.sc, this, e, { color: 0xe4e2ec, width: 1, sag: 18, visible: () => !e.dead });
        }
      }
    }
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(2);
      if (this.windup <= 0) {
        this.fan(1, 0, 55, { texture: 'bala_grande', scale: 1.4, range: 220, homing: true });
        this.sc.snd('carcajada');
      }
      return;
    }
    const d = this.distToPlayer();
    if (d < 70) this.flee();
    else if (d > 100) this.chase();
    this.setFrame(anim(this.t, 4, 2));
    this.setFlipX(this.player.x < this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = Phaser.Math.FloatBetween(2.6, 3.4);
      this.windup = 0.5;
      this.windupFlash();
      this.sc.snd('aviso');
    }
  }
  die(): void {
    if (this.dead) return;
    super.die();
    for (const d of this.dolls) if (d.active && !d.dead) d.collapse();
  }
}

/** Tragasables: de frente devuelve los disparos; embiste y queda expuesto. */
export class Tragasables extends Enemy {
  state: 'guard' | 'windup' | 'lunge' | 'recover' = 'guard';
  timer = 0;
  facing = 0;
  dir = new Phaser.Math.Vector2();
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    switch (this.state) {
      case 'guard': {
        this.facing = Math.atan2(this.player.y - this.y, this.player.x - this.x);
        this.setFrame(anim(this.t, 3, 2));
        this.setFlipX(Math.cos(this.facing) < 0);
        this.chase();
        if (this.distToPlayer() < 90 && this.timer <= 0 && this.sc.nav.lineFree(this.x, this.y, this.player.x, this.player.y)) {
          this.state = 'windup';
          this.timer = 0.5;
          this.dir.set(Math.cos(this.facing), Math.sin(this.facing));
          this.windupFlash();
          this.sc.telegraph.line(this.x, this.y, this.x + this.dir.x * 75, this.y + this.dir.y * 75, 0.5, { owner: this, w: 10 });
          this.sc.snd('aviso');
        }
        break;
      }
      case 'windup':
        this.setFrame(2);
        if (this.timer <= 0) {
          this.state = 'lunge';
          this.timer = 0.35;
          this.sc.snd('sable');
        }
        break;
      case 'lunge':
        this.setFrame(3);
        this.desired.set(this.dir.x * 210, this.dir.y * 210);
        if (this.timer <= 0) {
          this.state = 'recover';
          this.timer = 0.8;
        }
        break;
      case 'recover':
        this.setFrame(4);
        if (this.timer <= 0) {
          this.state = 'guard';
          this.timer = 1;
        }
        break;
    }
  }
  /** De frente (±60°) y en guardia, devuelve el disparo. */
  onShot(s: { x: number; y: number; body: { velocity: { x: number; y: number } } }): 'hit' | 'deflect' {
    if (this.state === 'recover' || this.state === 'lunge') return 'hit';
    const from = Math.atan2(-s.body.velocity.y, -s.body.velocity.x);
    return Math.abs(Phaser.Math.Angle.Wrap(from - this.facing)) < Math.PI / 3 ? 'deflect' : 'hit';
  }
}

/** Cabecita: rápida y rebotona. Sale del cabezudo. */
export class Cabecita extends Enemy {
  dir = new Phaser.Math.Vector2(Math.random() < 0.5 ? 1 : -1, Math.random() < 0.5 ? 1 : -1).normalize();
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    const b = this.body.blocked,
      tc = this.body.touching;
    if ((b.left || tc.left) && this.dir.x < 0) this.dir.x *= -1;
    if ((b.right || tc.right) && this.dir.x > 0) this.dir.x *= -1;
    if ((b.up || tc.up) && this.dir.y < 0) this.dir.y *= -1;
    if ((b.down || tc.down) && this.dir.y > 0) this.dir.y *= -1;
    this.desired.set(this.dir.x * this.speed, this.dir.y * this.speed);
    this.setFrame(anim(this.t, 8, 2));
  }
}

/** Cabezudo: lento y duro; al morir se parte en cabecitas. */
export class Cabezudo extends Enemy {
  t = Math.random();
  protected think(dt: number): void {
    this.t += dt;
    this.chase();
    this.setFrame(anim(this.t, 3, 2));
    this.setFlipX(this.player.x < this.x);
  }
  die(): void {
    if (this.dead) return;
    const n = this.champion ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const c = this.sc.spawn('cabecita', this.x + (i - (n - 1) / 2) * 8, this.y);
      c.wake = 0.3;
    }
    super.die();
  }
}

/** Orbe de La Luna (Madame Fortuna): lento, teledirigido y destructible. */
export class Orbe extends Enemy {
  t = 0;
  life = 7;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, { ...o, fixedHp: true, noSmoke: true });
    this.countsForClear = false;
    this.targetable = true;
    this.wake = 0.4;
  }
  protected think(dt: number): void {
    this.t += dt;
    this.life -= dt;
    this.lift = 6 + Math.sin(this.t * 4) * 2;
    this.toward(this.player.x, this.player.y, this.speed);
    this.setFrame(anim(this.t, 6, 2));
    if (this.life <= 0) this.die();
  }
  die(): void {
    if (this.dead) return;
    this.sc.fx.sparks(this.x, this.y, 0xc9b3ef, 6);
    this.dead = true;
    this.destroy();
  }
}

// ---------------------------------------------------------------------------
// Nuevas del Acto III
// ---------------------------------------------------------------------------

/**
 * Autómata de feria: marcha a compás (un latido cada 0,7 s). Dos latidos da un
 * paso de una baldosa hacia ti; en el tercero se para y dispara cuatro balas,
 * alternando cruz y aspa. Se le encienden los ojos el latido antes.
 */
export class Automata extends Enemy {
  private beatT = Math.random() * 0.7;
  private beat = Math.floor(Math.random() * 3);
  private cross = Math.random() < 0.5;
  private step: { x: number; y: number } | null = null;
  protected think(dt: number): void {
    this.beatT -= dt;
    if (this.step) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.step.x, this.step.y);
      if (d < 1.5) this.step = null;
      else this.toward(this.step.x, this.step.y, 80);
    }
    if (this.beatT > 0) return;
    this.beatT = 0.7;
    this.beat = (this.beat + 1) % 3;
    if (this.beat === 2) {
      // Disparo.
      this.setFrame(0);
      const n = this.champion ? 8 : 4;
      this.ring(n, 80, {}, this.cross ? 0 : Math.PI / 4);
      this.cross = !this.cross;
      this.sc.snd('bombo');
      return;
    }
    // Paso de una baldosa por el eje más largo (el siguiente latido, ojos encendidos).
    this.setFrame(this.beat === 1 ? 2 : 1);
    if (this.beat === 1) this.windupFlash();
    const p = this.player;
    const dx = p.x - this.x,
      dy = p.y - this.y;
    const tries = Math.abs(dx) > Math.abs(dy) ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }] : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }];
    for (const t of tries) {
      if (!t.x && !t.y) continue;
      const nx = this.x + t.x * 16,
        ny = this.y + t.y * 16;
      const c = Math.floor((nx - 16) / 16),
        r = Math.floor((ny + this.bodyDy - 16) / 16);
      if (c < 0 || r < 0 || c > 12 || r > 6 || this.sc.nav.isBlocked(c, r)) continue;
      this.step = { x: nx, y: ny };
      this.sc.snd('pisoton');
      break;
    }
  }
}

/**
 * Sombra: repite tu camino con retraso (1,4 s; la segunda, 2,2 s). Al aparecer
 * espera un momento y va a su sitio del rastro. Te obliga a no pararte ni a
 * volver sobre tus pasos.
 */
export class SombraEnemiga extends Enemy {
  private trail = new TimeTrail(3.5);
  private lag: number;
  private ready = false;
  private waitT = 1;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o);
    const others = scene.clearPending().filter((e) => e instanceof SombraEnemiga && e !== this).length;
    this.lag = 1.4 + 0.8 * Math.min(2, others);
    this.setAlpha(0.75);
  }
  protected tick(dt: number): void {
    const p = this.sc.player;
    this.trail.push(p.x, p.y, dt);
  }
  protected think(dt: number): void {
    const at = this.trail.at(this.lag);
    if (!at) return;
    if (this.waitT > 0) {
      this.waitT -= dt;
      return;
    }
    const d = Phaser.Math.Distance.Between(this.x, this.y, at.x, at.y);
    if (!this.ready) {
      if (d < 4) this.ready = true;
      else this.toward(at.x, at.y, this.speed);
      return;
    }
    // Calca el rastro: va justo a donde estabas.
    const v = Math.min(220, d / Math.max(dt, 1 / 120));
    if (d > 0.5) this.toward(at.x, at.y, v);
    this.setFlipX(at.x < this.x);
  }
}

/**
 * Hipnotizador: guarda la distancia y lanza un orbe en espiral, lento, que no
 * quita vida: si te da, el movimiento se invierte un par de segundos.
 */
export class Hipnotizador extends Enemy {
  timer = Phaser.Math.FloatBetween(1.8, 2.8);
  windup = 0;
  t = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.setFlipX(this.player.x < this.x);
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(Math.floor(this.t * 6) % 2);
      if (this.windup <= 0) {
        this.fan(1, 0, 60, { texture: 'orbe_hipno', scale: 1.3, range: 240, daze: 2.2, rotate: true });
        this.sc.snd('carcajada');
      }
      return;
    }
    this.setFrame(0);
    const d = this.distToPlayer();
    if (d < 70) this.keepAway();
    else if (d > 100) this.chase();
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 3.6;
      this.windup = 0.6;
      this.windupFlash();
    }
  }
}
