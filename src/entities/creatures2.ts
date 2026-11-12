// Criaturas del Acto II: Las Jaulas.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { EnemyOpts } from './Enemy';
import { Enemy } from './Enemy';

import { anim } from './Enemy';
import type { Shot } from './Shot';
import { TempSpike } from './props';

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
          // Apunta al agazaparse y lo avisa: salta por esa línea.
          const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
          this.dir.set(Math.cos(a), Math.sin(a));
          this.sc.telegraph.line(this.x, this.y, this.x + this.dir.x * 80, this.y + this.dir.y * 80, 0.45, { owner: this, w: 10 });
          this.windupFlash();
        }
        break;
      case 'crouch':
        this.setFrame(2);
        if (this.timer <= 0) {
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
  /** La flauta del faquir: si está escondida, asoma ya (con su aviso de siempre). */
  escupir(): void {
    if (this.state === 'hidden') this.timer = 0;
  }
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
          this.timer = 0.45;
          // El cesto tiembla y avisa antes de que asome.
          this.sc.telegraph.marker(this.x, this.y, 0.45, { owner: this, color: 0x79b84a });
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
        // Un abanico por salida (las campeonas, dos).
        if (this.timer < 1.3 - this.shots * 0.6 && this.shots < (this.champion ? 2 : 1)) {
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
          // Reaparece lejos del payaso (nunca escupe a bocajarro).
          for (let k = 0; k < 8; k++) {
            const spot = this.sc.nav.randomFreeTile(this.x, this.y, 110);
            if (Phaser.Math.Distance.Between(spot.x, spot.y, this.player.x, this.player.y) > 64) {
              this.setPosition(spot.x, spot.y);
              this.body.reset(spot.x, spot.y);
              break;
            }
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
  windup = 0;
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
    if (this.windup > 0) {
      // Aviso: se pone de puntillas y tiembla antes de girar.
      this.windup -= dt;
      this.setFrame(2);
      if (this.windup <= 0) {
        this.spin = 1.1;
        this.shotT = 0;
      }
      return;
    }
    this.setFrame(anim(this.t, 3, 2));
    this.chase();
    this.timer -= dt;
    if (this.timer <= 0) {
      this.windup = 0.45;
      this.windupFlash();
      this.sc.telegraph.circle(this.x, this.y, 34, 0.45, { owner: this });
      this.sc.snd('aviso');
    }
  }
}

/** Loro carroñero: vuela en círculos y se lanza en picado. */
export class Loro extends Enemy {
  orbit = Math.random() * Math.PI * 2;
  timer = Phaser.Math.FloatBetween(1.5, 2.5);
  dive = 0;
  aim = 0;
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
    const p = this.player;
    if (this.aim > 0) {
      // Aviso: se queda quieto apuntando con una línea en el suelo.
      this.aim -= dt;
      if (this.aim <= 0) {
        this.dive = 0.6;
        this.sc.snd('salto');
      }
      return;
    }
    this.timer -= dt;
    this.orbit += dt * 1.6;
    this.toward(p.x + Math.cos(this.orbit) * 52, p.y + Math.sin(this.orbit) * 40, this.speed);
    this.setFlipX(this.desired.x < 0);
    if (this.timer <= 0) {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      this.dir.set(Math.cos(a), Math.sin(a));
      this.aim = 0.35;
      this.windupFlash();
      this.sc.telegraph.line(this.x, this.y, this.x + this.dir.x * 105, this.y + this.dir.y * 105, 0.35, { owner: this, w: 6 });
      this.timer = Phaser.Math.FloatBetween(2, 2.8);
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
    // Llora al morir: aviso de 0,3 s y cuatro lágrimas en diagonal.
    const sc = this.sc,
      x = this.x,
      y = this.y;
    sc.telegraph.circle(x, y, 12, 0.3, { color: 0x4f8fd1 });
    sc.time.delayedCall(300, () => {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        sc.spawnShot(x, y, Math.cos(a) * 75, Math.sin(a) * 75, false, { damage: 1, range: 70 });
      }
    });
    super.die();
  }
}

// ---------------------------------------------------------------------------
// Nuevas del Acto II
// ---------------------------------------------------------------------------

/**
 * Foca equilibrista: se desliza de lado y lanza pelotas grandes y lentas que
 * rebotan tres veces en las paredes (como mucho dos suyas a la vez). Las jaulas
 * dejan pasar la pelota: la forma de la sala importa.
 */
export class Foca extends Enemy {
  timer = Phaser.Math.FloatBetween(1.4, 2.4);
  windup = 0;
  side = Math.random() < 0.5 ? 1 : -1;
  t = Math.random();
  balls: Shot[] = [];
  private aim = 0;
  protected think(dt: number): void {
    this.t += dt;
    this.balls = this.balls.filter((b) => b.active && !b.dead);
    const p = this.player;
    this.setFlipX(p.x < this.x);
    if (this.windup > 0) {
      this.windup -= dt;
      this.setFrame(1);
      if (this.windup <= 0) this.throwBall();
      return;
    }
    this.setFrame(0);
    // De lado respecto al payaso; si choca, cambia de sentido.
    const a = Math.atan2(p.y - this.y, p.x - this.x) + (Math.PI / 2) * this.side;
    this.desired.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
    const b = this.body.blocked;
    if (b.left || b.right || b.up || b.down) this.side *= -1;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 2.8;
      if (this.balls.length < 2) {
        this.windup = 0.45;
        this.aim = Math.atan2(p.y - 6 - this.y, p.x - this.x);
        this.windupFlash();
        this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(this.aim) * 60, this.y + Math.sin(this.aim) * 60, 0.45, { owner: this, w: 8 });
      }
    }
  }
  private throwBall(): void {
    const n = this.champion ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const a = this.aim + (i - (n - 1) / 2) * 0.35;
      const s = this.sc.spawnShot(this.x, this.y - 6, Math.cos(a) * 85, Math.sin(a) * 85, false, {
        damage: 1, range: 420, bounce: 3, scale: 1.4, texture: 'pelota_foca',
      });
      this.balls.push(s);
    }
    this.sc.snd('rebote');
  }
}

/**
 * Mono ladrón: corre hacia ti en zigzag. Si te toca y llevas boletos, te roba
 * hasta tres y huye con el saco, más despacio, y cada poco se sienta a
 * contarlos. Si lo matas con el botín, suelta el doble. Sin boletos, muerde.
 */
export class Titi extends Enemy {
  t = Math.random() * 5;
  loot = 0;
  fleeT = 0;
  /** Con el saco: huye 2,5 s y se sienta 1,5 s a contar (el momento de darle). */
  countT = 2.5;
  cd = 0;
  private hideout: { x: number; y: number } | null = null;
  private hideT = 0;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o);
    this.contact = 0;
  }
  protected tick(dt: number): void {
    this.cd -= dt;
    if (this.wake > 0 || this.cd > 0 || this.stunT > 0 || this.distToPlayer() > 11) return;
    const pl = this.sc.player;
    if (pl.invuln > 0 || pl.dead || this.sc.god) return;
    const st = this.sc.run.player;
    this.cd = 1.2;
    if (st.tickets > 0) {
      const n = Math.min(3, st.tickets);
      st.tickets -= n;
      this.loot += n;
      this.sc.floatText(n === 1 ? '-1 boleto' : `-${n} boletos`, 0xf2c14e);
      this.sc.snd('boleto');
      this.fleeT = 99;
    } else {
      this.sc.hurtPlayer(1, this.x, this.y, { cause: this.name });
      this.fleeT = 1.5;
    }
  }
  protected think(dt: number): void {
    this.t += dt;
    if (this.loot > 0) {
      // Con el saco (que pesa): huye más despacio y, cada poco, se sienta a contar.
      this.countT -= dt;
      this.setFrame(2);
      if (this.countT < 0) {
        if (this.countT < -1.5) this.countT = 2.5;
        return;
      }
      // Huye hacia un sitio despejado lejos del payaso (no a las esquinas).
      this.hideT -= dt;
      if (!this.hideout || this.hideT <= 0) {
        this.hideT = 1.2;
        const p = this.player;
        let best = 0;
        for (let i = 0; i < 6; i++) {
          const c = this.sc.nav.randomFreeTile(120, 72, 90);
          if (c.x < 40 || c.x > 200 || c.y < 36 || c.y > 108) continue;
          const d = Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y);
          if (d > best) {
            best = d;
            this.hideout = c;
          }
        }
      }
      if (this.hideout) this.toward(this.hideout.x, this.hideout.y, this.speed * 0.7);
      else this.flee();
    } else if (this.fleeT > 0) {
      this.fleeT -= dt;
      this.flee();
      this.setFrame(anim(this.t, 10, 2));
    } else {
      this.chase();
      // Zigzag: un vaivén perpendicular a la carrera.
      const a = Math.atan2(this.desired.y, this.desired.x) + Math.PI / 2;
      const z = Math.sin(this.t * 7) * 35;
      this.desired.x += Math.cos(a) * z;
      this.desired.y += Math.sin(a) * z;
      this.setFrame(anim(this.t, 10, 2));
    }
    this.setFlipX(this.desired.x < 0);
  }
  die(): void {
    if (this.dead) return;
    if (this.loot > 0) {
      for (let i = 0; i < this.loot * 2; i++) this.sc.spawnPickup('boleto', this.x, this.y, { burst: true });
      const st = this.sc.run.stats;
      st.ladrones = (st.ladrones ?? 0) + 1;
      this.sc.floatText('¡Tu botín, y más!', 0xf2c14e);
    }
    super.die();
  }
}

/**
 * Faquir: anda en tramos rectos dejando tachuelas que brillan antes de pinchar.
 * Cada poco se sienta a tocar la flauta: las cobras de la sala asoman y escupen;
 * si no hay cobras, sopla un abanico de tres.
 */
export class Faquir extends Enemy {
  target: { x: number; y: number } | null = null;
  legT = 0;
  fluteT = 4;
  sitT = 0;
  dropT = 0;
  spikes: TempSpike[] = [];
  private lastDrop = { x: 0, y: 0 };
  protected think(dt: number): void {
    this.spikes = this.spikes.filter((s) => s.active);
    if (this.sitT > 0) {
      this.sitT -= dt;
      this.setFrame(1);
      if (this.sitT <= 0) this.playFlute();
      return;
    }
    this.setFrame(0);
    this.fluteT -= dt;
    if (this.fluteT <= 0) {
      this.fluteT = 4;
      this.sitT = 1.2;
      this.windupFlash();
      this.sc.snd('aviso');
      return;
    }
    // Tramo recto de 3 a 5 baldosas hacia una baldosa libre en línea recta.
    this.legT -= dt;
    if (!this.target || this.legT <= 0 || Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) < 4) {
      this.target = null;
      for (let i = 0; i < 8 && !this.target; i++) {
        const c = this.sc.nav.randomFreeTile(this.x, this.y, 80);
        const d = Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y);
        if (d >= 40 && this.sc.nav.lineFree(this.x, this.y, c.x, c.y)) this.target = c;
      }
      this.legT = 3;
      if (!this.target) {
        this.chase();
        return;
      }
    }
    this.toward(this.target.x, this.target.y);
    this.setFlipX(this.desired.x < 0);
    // Una tachuela cada 14 px recorridos (como mucho 12 a la vez).
    if (Phaser.Math.Distance.Between(this.x, this.y, this.lastDrop.x, this.lastDrop.y) >= 14) {
      this.lastDrop = { x: this.x, y: this.y };
      if (this.spikes.length >= 12) this.spikes.shift()?.remove();
      this.spikes.push(new TempSpike(this.sc, this.x, this.y + this.bodyDy));
    }
  }
  private playFlute(): void {
    this.sc.snd('trompeta');
    const cobras = this.sc.clearPending().filter((e): e is Cobra => e instanceof Cobra);
    if (cobras.length) for (const c of cobras) c.escupir();
    else this.fan(3, 0.3, 90);
  }
}
