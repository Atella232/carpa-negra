// Jefe final: El Maestro de Ceremonias, en tres fases.
//   1. El Presentador: desde su podio anuncia "números" de los jefes anteriores.
//   2. El Duelo: baja a la pista con bastón, chistera bumerán y látigos.
//   3. La Carpa Negra: se apagan las luces; quedan la sonrisa, la chistera y dos guantes.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { BossKind } from '../data/enemies';
import { Boss, Phase, Script } from './Boss';
import { Enemy, EnemyOpts } from './Enemy';
import { lob } from './Lob';
import { buildVolley } from '../core/volley';
import { ROOM_H, ROOM_W, tileX, tileY } from '../config';
import { item } from '../data/items';

type Numero = 'forzudo' | 'siameses' | 'bestia' | 'serpiente' | 'fortuna' | 'reflejo';

const ANUNCIO: Record<Numero, string> = {
  forzudo: '¡El Forzudo!',
  siameses: '¡Los Siameses!',
  bestia: '¡La Bestia!',
  serpiente: '¡La Mujer Serpiente!',
  fortuna: '¡Madame Fortuna!',
  reflejo: '¡Tu Reflejo!',
};

export class Maestro extends Boss {
  phases: Phase<Maestro>[] = [
    {
      at: 1,
      rest: [0.6, 1],
      attacks: [{ id: 'numero', run: (b) => b.numero() }, { id: 'cartas', weight: 0.6, run: (b) => b.cartas() }],
    },
    {
      at: 2 / 3,
      rest: [0.45, 0.8],
      enter: (b) => b.bajar(),
      attacks: [
        { id: 'estocada', run: (b) => b.estocada() },
        { id: 'chistera', can: (b) => !b.hatAway, run: (b) => b.chistera() },
        { id: 'latigos', run: (b) => b.latigos() },
        { id: 'letra', can: (b) => b.contracts > 0, run: (b) => b.letraPequena() },
      ],
    },
    {
      at: 1 / 3,
      rest: [0.35, 0.7],
      enter: (b) => b.apagon(),
      attacks: [
        { id: 'manotazo', run: (b) => b.manotazo() },
        { id: 'barrido', run: (b) => b.barrido() },
        { id: 'espiral', run: (b) => b.espiral() },
      ],
    },
  ];
  /** Números pendientes: primero los jefes que venciste en esta partida. */
  private numeros: Numero[];
  private numIdx = 0;
  contracts: number;
  hatAway = false;
  gloves: Guante[] = [];
  private curtainsT = 0;
  private curtainImgs: Phaser.GameObjects.Image[] = [];
  private publicT = 4;

  constructor(scene: GameScene, x: number, y: number) {
    const contracts = scene.run.player.passives.filter((id) => item(id).pools.includes('contrato')).length;
    super(scene, x, y, 'maestro', {
      hp: Math.round(1140 * (1 + 0.08 * contracts)), speed: 70, body: { w: 14, h: 14, dy: 8 }, name: 'El Maestro de Ceremonias',
    });
    this.contracts = contracts;
    this.contact = 2;
    this.body.setMass(30);
    const beaten = (scene.run.beaten ?? []).filter((b): b is Numero => b in ANUNCIO);
    const rest = (Object.keys(ANUNCIO) as Numero[]).filter((n) => !beaten.includes(n));
    this.numeros = [...beaten, ...Phaser.Utils.Array.Shuffle(rest)];
    if (contracts > 0) scene.time.delayedCall(1700, () => scene.banner('Veo que ya trabajas para mí', 'El Maestro sonríe'));
  }

  /** Daño a la cabeza: sin chistera duele más. */
  damage(amount: number, from: { x: number; y: number } | null, knockback = 0, silent = false): boolean {
    return super.damage(amount * (this.hatAway ? 1.5 : 1), from, knockback, silent);
  }

  protected idle(dt: number): void {
    this.body.setImmovable(this.phase === 0);
    if (this.phase === 0) {
      // En el podio, quieto, batuta en alto.
      this.setFrame(this.busy ? 1 : Math.floor(this.t * 2) % 2 ? 0 : 1);
      this.toward(ROOM_W / 2, tileY(1), 30);
      if (Phaser.Math.Distance.Between(this.x, this.y, ROOM_W / 2, tileY(1)) < 3) this.desired.set(0, 0);
    } else if (this.phase === 1) {
      this.setFrame(2 + (Math.floor(this.t * 6) % 2) + (this.hatAway ? 2 : 0));
      this.setFlipX(this.player.x < this.x);
      if (!this.busy) {
        // Rodea al payaso a media distancia, como en un duelo.
        const a = Math.atan2(this.y - this.player.y, this.x - this.player.x) + dt * 0.9;
        this.toward(this.player.x + Math.cos(a) * 70, this.player.y + Math.sin(a) * 50, this.speed);
      }
    } else {
      // Traje vacío: flota despacio; el público es suyo.
      this.flying = true;
      this.lift = 10 + Math.sin(this.t * 2) * 3;
      this.setFrame(6 + (Math.floor(this.t * 4) % 2));
      if (!this.busy) this.toward(ROOM_W / 2 + Math.sin(this.t * 0.7) * 50, 50 + Math.cos(this.t * 0.5) * 12, 40);
      this.publicT -= dt;
      if (this.publicT <= 0) {
        this.publicT = 4;
        this.sc.publicThrow(this.player.x, this.player.y, 2);
      }
      this.updateCurtains(dt);
    }
  }

  // --- Fase 1: los números ---------------------------------------------------

  *numero(): Script {
    const n = this.numeros[this.numIdx++ % this.numeros.length];
    this.sc.banner(ANUNCIO[n], 'El Maestro presenta');
    this.sc.snd('redoble');
    this.flash();
    yield 0.9;
    const sc = this.sc;
    const p = this.player;
    switch (n) {
      case 'forzudo':
        for (let i = 0; i < 3; i++) {
          const tx = Phaser.Math.Clamp(p.x + (i - 1) * 34, 30, 210),
            ty = Phaser.Math.Clamp(p.y + (i % 2) * 12, 40, 120);
          lob(sc, this.x, this.y - 10, tx, ty, {
            texture: 'pesa', dur: 0.9, height: 50, radius: 12, halves: 2, spin: true,
            onLand: (x, y) => {
              sc.snd('pisoton');
              sc.shake(100, 0.008);
              // Con la escena (la pesa sigue cayendo aunque el Maestro cambie de fase).
              for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                sc.spawnShot(x, y, Math.cos(a) * 85, Math.sin(a) * 85, false, { damage: 1, range: 110 });
              }
            },
          });
          yield 0.25;
        }
        yield 1;
        break;
      case 'siameses': {
        // Una cuerda de clavos que barre la sala con un hueco.
        const gap = Phaser.Math.Between(2, 10);
        for (let c = 0; c < 13; c++) {
          if (c === gap || c === gap + 1) continue;
          sc.spawnShot(tileX(c), 22, 0, 55, false, { damage: 1, range: 130, texture: 'clavo' });
        }
        sc.snd('latigo');
        yield 1.4;
        break;
      }
      case 'bestia':
        for (const x of [24, ROOM_W - 24]) this.ring(12, 80, { range: 160 }, 0, { x, y: ROOM_H / 2 });
        sc.snd('pisoton');
        sc.shake(200, 0.012);
        for (const x of [tileX(3), tileX(9)]) sc.spawn('payasito', x, tileY(4));
        yield 1;
        break;
      case 'serpiente':
        for (let i = 0; i < 8; i++) {
          sc.spawnShot(24, 40 + Math.sin(i * 0.8) * 10, 85, 20, false, { damage: 1, range: 260, texture: 'bala_veneno', homing: true });
          yield 0.09;
        }
        yield 0.8;
        break;
      case 'fortuna':
        for (let i = 0; i < 5; i++) {
          const t = i === 0 ? { x: p.x, y: p.y } : sc.nav.randomFreeTile(120, 80, 110);
          sc.telegraph.circle(t.x, t.y, 11, 0.75, { owner: this });
          this.after(0.75, () => {
            sc.fx.debris(t.x, t.y, 0x8a8394, 5);
            if (Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y) < 12) sc.hurtPlayer(1, t.x, t.y, { cause: 'La Torre' });
          });
        }
        yield 1.2;
        break;
      case 'reflejo':
        for (let i = 0; i < 3; i++) {
          this.flash();
          yield 0.3;
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          for (const v of buildVolley(sc.stats, { x: Math.cos(a), y: Math.sin(a) }, 1).slice(0, 5)) {
            sc.spawnShot(this.x, this.y - 6, Math.cos(v.angle) * 150, Math.sin(v.angle) * 150, false, { damage: 1, range: 220, texture: 'bala_reflejo' });
          }
        }
        yield 0.6;
        break;
    }
  }

  *cartas(): Script {
    this.flash();
    yield 0.35;
    this.fan(5, 0.3, 110, { texture: 'carta', boomerang: true, range: 150 });
    this.sc.snd('carta');
    yield 0.8;
  }

  // --- Fase 2: el duelo --------------------------------------------------------

  *bajar(): Script {
    this.sc.banner('El Maestro baja a la pista', '¡Un duelo!');
    this.sc.snd('salto');
    const from = { x: this.x, y: this.y };
    for (let k = 0; k <= 12; k++) {
      const f = k / 12;
      this.lift = Math.sin(f * Math.PI) * 30;
      this.setPosition(from.x, from.y + (ROOM_H / 2 - from.y) * f);
      this.body.reset(this.x, this.y);
      yield 0.04;
    }
    this.lift = 0;
    this.sc.snd('pisoton');
    this.sc.shake(220, 0.012);
    this.ring(14, 85, { range: 150 });
    yield 0.5;
  }

  *estocada(): Script {
    const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    this.flash();
    this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(a) * 140, this.y + Math.sin(a) * 140, 0.5, { owner: this, w: 10 });
    this.sc.snd('aviso');
    yield 0.5;
    this.sc.snd('sable');
    for (let k = 0; k < 8; k++) {
      this.body.setVelocity(Math.cos(a) * 260, Math.sin(a) * 260);
      this.desired.set(Math.cos(a) * 260, Math.sin(a) * 260);
      yield 0.05;
    }
    this.fan(3, 0.4, 100, {}, a + Math.PI);
    yield 0.4;
  }

  *chistera(): Script {
    this.flash();
    yield 0.35;
    this.hatAway = true;
    this.sc.snd('chistera');
    const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    this.sc.spawnShot(this.x, this.y - 12, Math.cos(a) * 130, Math.sin(a) * 130, false, {
      damage: 2, halves: 1, range: 180, texture: 'chistera_volando', boomerang: true, scale: 1,
    });
    yield 2.6;
    this.hatAway = false;
  }

  *latigos(): Script {
    const base = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    this.flash();
    for (const off of [-0.6, 0, 0.6]) {
      const a = base + off;
      this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(a) * 110, this.y + Math.sin(a) * 110, 0.55, { owner: this, w: 6 });
    }
    yield 0.55;
    this.sc.snd('latigo');
    for (const off of [-0.6, 0, 0.6]) {
      const a = base + off;
      for (let i = 0; i < 6; i++) {
        this.after(i * 0.04, () =>
          this.sc.spawnShot(this.x + Math.cos(a) * 8, this.y + Math.sin(a) * 8, Math.cos(a) * 160, Math.sin(a) * 160, false, { damage: 1, range: 70 + i * 10 }),
        );
      }
    }
    yield 0.6;
  }

  *letraPequena(): Script {
    this.sc.banner('Letra pequeña', 'Tu contrato tiene cláusulas');
    this.sc.snd('contrato');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.sc.spawnShot(this.x, this.y, Math.cos(a) * 45, Math.sin(a) * 45, false, { damage: 1, range: 230, texture: 'pliego', homing: true });
      yield 0.12;
    }
    yield 0.9;
  }

  // --- Fase 3: la Carpa Negra ----------------------------------------------------

  *apagon(): Script {
    this.sc.banner('Se apagan las luces', 'El traje está vacío');
    this.sc.snd('telon');
    this.sc.fx.flash(500, 0x000000, 0.9);
    this.sc.setDark(true);
    if (this.sc.dark) this.sc.dark.level = 0.85;
    this.hatAway = false;
    this.contact = 1;
    yield 0.8;
    for (const side of [-1, 1]) {
      const g = this.sc.spawn('guante', this.x + side * 30, this.y + 10) as Guante;
      g.head = this;
      g.side = side;
      this.gloves.push(g);
    }
    this.sc.snd('carcajada');
    yield 0.8;
  }

  /** Un guante golpea donde está el payaso (marca en el suelo antes). */
  *manotazo(): Script {
    const g = this.freeGlove();
    if (!g) return;
    const tx = this.player.x,
      ty = this.player.y;
    this.sc.telegraph.circle(tx, ty, 16, 0.6, { owner: this });
    g.moveTo(tx, ty - 20, 0.4);
    yield 0.6;
    g.moveTo(tx, ty, 0.08);
    yield 0.1;
    this.sc.snd('pisoton');
    this.sc.shake(160, 0.012);
    this.ring(8, 80, { range: 110 }, 0, { x: tx, y: ty });
    if (Phaser.Math.Distance.Between(tx, ty, this.player.x, this.player.y) < 16) this.sc.hurtPlayer(2, tx, ty, { cause: 'El Maestro' });
    yield 0.4;
    g.home();
  }

  /** Un guante barre una fila entera. */
  *barrido(): Script {
    const g = this.freeGlove();
    if (!g) return;
    const y = Phaser.Math.Clamp(this.player.y, 28, ROOM_H - 28);
    const fromLeft = g.side < 0;
    this.sc.telegraph.rect(16, y - 10, ROOM_W - 32, 20, 0.7, { owner: this });
    g.moveTo(fromLeft ? 20 : ROOM_W - 20, y, 0.5);
    yield 0.7;
    this.sc.snd('latigo');
    g.moveTo(fromLeft ? ROOM_W - 20 : 20, y, 0.45);
    g.sweeping = true;
    yield 0.55;
    g.sweeping = false;
    g.home();
    yield 0.3;
  }

  *espiral(): Script {
    this.sc.snd('carcajada');
    for (let i = 0; i < 18; i++) {
      for (const off of [0, Math.PI]) {
        const a = i * 0.42 + off;
        this.sc.spawnShot(this.x, this.y, Math.cos(a) * 80, Math.sin(a) * 80, false, { damage: 1, range: 160 });
      }
      yield 0.08;
    }
    yield 0.4;
  }

  private freeGlove(): Guante | undefined {
    return this.gloves.find((g) => g.active && !g.dead && !g.busy);
  }

  /** Por debajo del 10 %, los telones se cierran y la pista se estrecha. */
  private updateCurtains(dt: number): void {
    if (this.frac > 0.1) return;
    this.curtainsT = Math.min(1, this.curtainsT + dt / 4);
    if (!this.curtainImgs.length) {
      this.sc.banner('Cae el telón', '¡Termina el espectáculo!');
      this.sc.snd('telon');
      for (const side of [-1, 1]) {
        const im = this.sc.add.image(0, ROOM_H / 2, 'telon_lateral').setDepth(899).setFlipX(side > 0);
        this.curtainImgs.push(im);
        this.sc.roomObjs.push(im);
      }
    }
    const inset = 16 + this.curtainsT * 44;
    this.curtainImgs[0].setPosition(inset - 32, ROOM_H / 2);
    this.curtainImgs[1].setPosition(ROOM_W - inset + 32, ROOM_H / 2);
    const p = this.player;
    if (p.x < inset + 6) p.setPosition(inset + 6, p.y);
    if (p.x > ROOM_W - inset - 6) p.setPosition(ROOM_W - inset - 6, p.y);
  }

  die(): void {
    if (this.dead) return;
    for (const g of this.gloves) if (g.active) g.vanish();
    this.sc.setDark(false);
    super.die();
  }
}

/** Guante del Maestro: el daño que recibe pasa a la cabeza (al 60 %). */
export class Guante extends Enemy {
  head: Maestro | null = null;
  side = 1;
  busy = false;
  sweeping = false;
  private move: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number } | null = null;
  t = 0;
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, { ...o, fixedHp: true });
    this.countsForClear = false;
    this.targetable = true;
    this.isBoss = true;
    this.contact = 1;
    this.wake = 0.5;
  }
  moveTo(x: number, y: number, dur: number): void {
    this.busy = true;
    this.move = { fx: this.x, fy: this.y, tx: x, ty: y, t: 0, dur };
  }
  home(): void {
    this.busy = false;
    this.move = null;
  }
  protected think(dt: number): void {
    this.t += dt;
    this.lift = 6;
    const h = this.head;
    if (!h || !h.active || h.dead) return this.vanish();
    this.setFlipX(this.side > 0);
    if (this.move) {
      const m = this.move;
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      const x = m.fx + (m.tx - m.fx) * k,
        y = m.fy + (m.ty - m.fy) * k;
      this.desired.set((x - this.x) / Math.max(dt, 0.016), (y - this.y) / Math.max(dt, 0.016));
      this.setFrame(1);
      if (this.sweeping && Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y) < 14) {
        this.sc.hurtPlayer(1, this.x, this.y, { cause: 'El Maestro' });
      }
    } else {
      // Flota junto a la cabeza.
      this.toward(h.x + this.side * 34, h.y + 14 + Math.sin(this.t * 3) * 4, 90);
      this.setFrame(0);
    }
  }
  damage(amount: number, from: { x: number; y: number } | null, knockback = 0, silent = false): boolean {
    if (!this.head || this.head.dead) return false;
    this.setTintFill(0xffffff);
    this.flashT = 0.06;
    return this.head.damage(amount * 0.6, from, knockback, silent);
  }
  vanish(): void {
    if (this.dead) return;
    this.dead = true;
    this.sc.splash(this.x, this.y, 'humo');
    this.destroy();
  }
}

/** Para el registro: crea al Maestro en su podio. */
export function spawnMaestro(sc: GameScene, cx: number): Enemy[] {
  // El podio: un obstáculo alto bajo sus pies (solo decorado y bloqueo).
  const podium = sc.add.image(cx, tileY(1) + 10, 'podio').setDepth(10 + tileY(1));
  sc.roomObjs.push(podium);
  return [new Maestro(sc, cx, tileY(1))];
}

export type { BossKind };
