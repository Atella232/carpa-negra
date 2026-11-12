// Jefes del Acto III: Tu Reflejo y Madame Fortuna.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { Boss, Phase, Script } from './Boss';
import { Enemy, EnemyOpts } from './Enemy';
import { buildVolley } from '../core/volley';
import { ROOM_H, ROOM_W, tileX, tileY } from '../config';

// ---------------------------------------------------------------------------
// Tu Reflejo: dispara con una copia de tus modificadores.
// ---------------------------------------------------------------------------

/** Ráfaga del reflejo con los modificadores del payaso (siempre medio globo). */
function mirrorVolley(sc: GameScene, x: number, y: number, dir: { x: number; y: number }, cap = 5): void {
  const st = sc.stats;
  const shots = buildVolley(st, dir, 1).slice(0, cap);
  const speed = Math.min(170, st.shotSpeed * 0.8);
  for (const v of shots) {
    const o = v.opts;
    sc.spawnShot(x, y, Math.cos(v.angle) * speed, Math.sin(v.angle) * speed, false, {
      damage: 1, halves: 1, range: Math.min(220, o.range), scale: Math.min(1.5, o.scale), bounce: Math.min(2, o.bounce),
      homing: o.homing, texture: 'bala_reflejo',
    });
  }
}

export class TuReflejo extends Boss {
  phases: Phase<TuReflejo>[] = [
    {
      at: 1,
      rest: [0.8, 1.3],
      attacks: [
        { id: 'rafaga', run: (b) => b.rafaga(3) },
        { id: 'cruz', run: (b) => b.cruz() },
      ],
    },
    {
      at: 0.6,
      rest: [0.5, 1],
      enter: (b) => b.romperEspejo(),
      attacks: [
        { id: 'carga', run: (b) => b.carga() },
        { id: 'rafaga', run: (b) => b.rafaga(4) },
        { id: 'abanico', run: (b) => b.abanico() },
      ],
    },
    {
      at: 0.25,
      rest: [0.6, 1.1],
      enter: (b) => b.dividirse(),
      attacks: [
        { id: 'rafaga', run: (b) => b.rafaga(3) },
        { id: 'barajar', run: (b) => b.barajar() },
      ],
    },
  ];
  /** Cuánto falta para poder contestar a una ráfaga del payaso. */
  private answerCd = 0;
  fakes: CopiaReflejo[] = [];
  private listening = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'tu_reflejo', { hp: 560, speed: 90, body: { w: 10, h: 12, dy: 4 }, name: 'Tu Reflejo' });
    this.contact = 1;
  }

  protected idle(dt: number): void {
    const p = this.player;
    if (!this.listening) {
      this.listening = true;
      this.sc.fireListeners.push((dir) => this.answer(dir));
    }
    this.answerCd = Math.max(0, this.answerCd - dt);
    this.setFrame(Math.abs(this.desired.x) + Math.abs(this.desired.y) > 10 ? 1 + (Math.floor(this.t * 8) % 2) : 0);
    this.setFlipX(p.x < this.x);
    if (this.busy && this.phase !== 0) return;
    if (this.phase === 0) {
      // Fase 1: se mueve como tu reflejo respecto al centro de la sala.
      const tx = Phaser.Math.Clamp(ROOM_W - p.x, 28, ROOM_W - 28),
        ty = Phaser.Math.Clamp(ROOM_H - p.y, 28, ROOM_H - 28);
      if (Phaser.Math.Distance.Between(this.x, this.y, tx, ty) > 4) this.toward(tx, ty, this.speed);
    } else if (this.distToPlayer() > 50) this.chase(this.speed * 0.8);
    else this.flee();
  }

  /** En la fase 1, contesta a cada ráfaga del payaso (con su propia cadencia). */
  private answer(dir: { x: number; y: number }): void {
    if (this.dead || this.wake > 0 || this.phase !== 0 || this.answerCd > 0 || this.inTransition) return;
    this.answerCd = Phaser.Math.Clamp(this.sc.stats.fireDelay / 0.45, 1 / 3.5, 1);
    this.flash();
    this.after(0.2, () => mirrorVolley(this.sc, this.x, this.y - 8, { x: -dir.x, y: -dir.y }));
  }

  *rafaga(n: number): Script {
    for (let i = 0; i < n; i++) {
      this.flash();
      this.sc.snd('aviso');
      yield 0.3;
      const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
      mirrorVolley(this.sc, this.x, this.y - 8, { x: Math.cos(a), y: Math.sin(a) });
      this.sc.snd('disparo');
      yield 0.2;
    }
  }

  *cruz(): Script {
    this.flash();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.sc.telegraph.line(this.x, this.y, this.x + dx * 60, this.y + dy * 60, 0.5, { owner: this, w: 6 });
    yield 0.5;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) mirrorVolley(this.sc, this.x, this.y - 8, { x: dx, y: dy }, 3);
    this.sc.snd('espejo');
    yield 0.4;
  }

  *romperEspejo(): Script {
    this.sc.snd('cristal');
    this.sc.fx.flash(200, 0xe4e2ec, 0.5);
    this.sc.shake(300, 0.012);
    this.sc.banner('¡Crac!', 'El reflejo rompe el espejo');
    this.sc.wallReflect = true;
    for (let i = 0; i < 3; i++) {
      this.ring(10, 80, { texture: 'bala_reflejo', range: 140 }, i * 0.3);
      yield 0.3;
    }
    yield 0.4;
  }

  *carga(): Script {
    const a = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    this.flash();
    this.sc.telegraph.line(this.x, this.y, this.x + Math.cos(a) * 120, this.y + Math.sin(a) * 120, 0.55, { owner: this, w: 12 });
    this.sc.snd('aviso');
    yield 0.55;
    for (let k = 0; k < 10; k++) {
      this.desired.set(Math.cos(a) * 230, Math.sin(a) * 230);
      this.body.setVelocity(this.desired.x, this.desired.y);
      yield 0.05;
    }
    this.ring(8, 80, { texture: 'bala_reflejo', range: 110 });
    yield 0.5;
  }

  *abanico(): Script {
    this.flash();
    yield 0.4;
    const base = Math.atan2(this.player.y - this.y, this.player.x - this.x);
    for (const off of [-0.5, -0.25, 0, 0.25, 0.5]) mirrorVolley(this.sc, this.x, this.y - 8, { x: Math.cos(base + off), y: Math.sin(base + off) }, 1);
    this.sc.snd('disparo');
    yield 0.5;
  }

  *dividirse(): Script {
    this.sc.snd('humo');
    this.sc.banner('¿Cuál es el de verdad?', 'Solo uno proyecta sombra');
    for (let i = 0; i < 2; i++) {
      const c = this.sc.spawn('copia', this.x, this.y) as CopiaReflejo;
      c.real = this;
      this.fakes.push(c);
    }
    yield* this.barajar();
  }

  *barajar(): Script {
    const spots = [
      { x: tileX(2), y: tileY(1) },
      { x: tileX(10), y: tileY(1) },
      { x: tileX(6), y: tileY(5) },
      { x: tileX(2), y: tileY(5) },
      { x: tileX(10), y: tileY(5) },
    ];
    Phaser.Utils.Array.Shuffle(spots);
    const all: Enemy[] = [this, ...this.fakes.filter((f) => f.active && !f.dead)];
    all.forEach((e, i) => {
      this.sc.splash(e.x, e.y, 'humo');
      e.setPosition(spots[i].x, spots[i].y);
      e.body.reset(spots[i].x, spots[i].y);
      this.sc.splash(e.x, e.y, 'humo');
    });
    this.sc.snd('humo');
    yield 0.8;
  }

  die(): void {
    if (this.dead) return;
    for (const f of this.fakes) if (f.active && !f.dead) f.pop();
    this.sc.wallReflect = false;
    super.die();
  }
}

/** Copia falsa de Tu Reflejo: sin sombra; si la golpeas, revienta en anillo. */
export class CopiaReflejo extends Enemy {
  real: TuReflejo | null = null;
  t = 0;
  cd = 1 + Math.random();
  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, { ...o, fixedHp: true, noSmoke: true });
    this.countsForClear = false;
    this.targetable = true;
    this.isBoss = false;
    this.shadow.setAlpha(0);
  }
  protected think(dt: number): void {
    this.t += dt;
    this.cd -= dt;
    this.shadow.setAlpha(0);
    if (this.distToPlayer() > 50) this.chase(this.speed * 0.8);
    else this.flee();
    this.setFrame(1 + (Math.floor(this.t * 8) % 2));
    this.setFlipX(this.player.x < this.x);
    if (this.cd <= 0) {
      this.cd = 1.6 + Math.random() * 0.6;
      this.windupFlash();
      this.after(0.3, () => this.fan(1, 0, 120, { texture: 'bala_reflejo' }));
    }
    if (this.real && (!this.real.active || this.real.dead)) this.pop();
  }
  /** Golpear una copia la hace estallar en un anillo. */
  damage(): boolean {
    this.pop(true);
    return true;
  }
  pop(burst = false): void {
    if (this.dead) return;
    this.dead = true;
    this.sc.snd('cristal');
    this.sc.fx.debris(this.x, this.y, 0x7fd1b9, 8);
    if (burst) this.ring(8, 80, { texture: 'bala_reflejo', range: 110 });
    this.destroy();
  }
}

// ---------------------------------------------------------------------------
// Madame Fortuna: cada ataque se anuncia con una carta del tarot.
// ---------------------------------------------------------------------------

export type Carta = 'torre' | 'rueda' | 'colgado' | 'luna' | 'muerte';

export const CARTA_NOMBRE: Record<Carta, string> = {
  torre: 'La Torre',
  rueda: 'La Rueda de la Fortuna',
  colgado: 'El Colgado',
  luna: 'La Luna',
  muerte: 'La Muerte',
};

export class MadameFortuna extends Boss {
  phases: Phase<MadameFortuna>[] = [
    {
      at: 1,
      rest: [0.7, 1.1],
      attacks: [
        { id: 'torre', run: (b) => b.carta('torre') },
        { id: 'rueda', run: (b) => b.carta('rueda') },
        { id: 'colgado', run: (b) => b.carta('colgado') },
        { id: 'luna', run: (b) => b.carta('luna') },
      ],
    },
    {
      at: 0.5,
      rest: [0.5, 0.9],
      enter: (b) => b.barajarMazo(),
      attacks: [
        { id: 'torre', weight: 1.4, run: (b) => b.carta('torre') },
        { id: 'rueda', run: (b) => b.carta('rueda') },
        { id: 'colgado', weight: 0.6, run: (b) => b.carta('colgado') },
        { id: 'luna', run: (b) => b.carta('luna') },
        { id: 'muerte', weight: 1.4, run: (b) => b.carta('muerte') },
      ],
    },
  ];
  /** Próxima carta (la Bola de Cristal la deja ver). */
  nextCard: Carta = 'torre';
  private spot = 1;
  private moveT = 2;
  private cardImg: Phaser.GameObjects.Image;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'fortuna', { hp: 520, speed: 70, flying: true, body: { w: 16, h: 14, dy: 4 }, name: 'Madame Fortuna' });
    this.contact = 1;
    this.cardImg = scene.add.image(x, y - 26, 'carta_tarot', 0).setDepth(900).setVisible(false);
    scene.roomObjs.push(this.cardImg);
  }

  protected idle(dt: number): void {
    this.lift = 4 + Math.sin(this.t * 2) * 2;
    this.setFrame(this.busy ? 2 : Math.floor(this.t * 3) % 2);
    // Flota entre tres posiciones.
    this.moveT -= dt;
    if (this.moveT <= 0 && !this.busy) {
      this.moveT = 2.5;
      this.spot = (this.spot + 1 + Math.floor(Math.random() * 2)) % 3;
    }
    const targets = [tileX(2), tileX(6), tileX(10)];
    const tx = targets[this.spot],
      ty = tileY(1) + 4;
    if (Phaser.Math.Distance.Between(this.x, this.y, tx, ty) > 3) this.toward(tx, ty, this.speed);
    this.cardImg.setPosition(this.x, this.y - 26);
  }

  /** Saca una carta (el aviso) y ejecuta su ataque. */
  *carta(c: Carta): Script {
    const frames: Record<Carta, number> = { torre: 0, rueda: 1, colgado: 2, luna: 3, muerte: 4 };
    this.cardImg.setFrame(frames[c]).setVisible(true).setScale(1);
    this.sc.snd('carta');
    this.sc.banner(CARTA_NOMBRE[c], '');
    this.flash();
    // Decide ya la siguiente (para la Bola de Cristal).
    const pool = this.phases[this.phase].attacks.map((a) => a.id as Carta).filter((x) => x !== c);
    this.nextCard = pool[Math.floor(Math.random() * pool.length)];
    yield 0.8;
    this.cardImg.setVisible(false);
    const second = this.phase === 1;
    switch (c) {
      case 'torre':
        yield* this.torre(second ? 2 : 1);
        break;
      case 'rueda':
        yield* this.rueda(second ? 4 : 3);
        break;
      case 'colgado':
        this.sc.mareoT = Math.max(this.sc.mareoT, 3);
        this.sc.banner('El Colgado', 'Todo está del revés');
        for (let i = 0; i < 3; i++) {
          this.fan(3, 0.4, 70, { texture: 'bala_grande', range: 200 });
          yield 0.7;
        }
        break;
      case 'luna':
        yield* this.luna();
        break;
      case 'muerte':
        yield* this.muerte();
        break;
    }
  }

  *torre(waves: number): Script {
    for (let w = 0; w < waves; w++) {
      const marks = [{ x: this.player.x, y: this.player.y }];
      for (let i = 0; i < (w === 0 ? 5 : 4); i++) {
        const t = this.sc.nav.randomFreeTile(120, 72, 120);
        marks.push({ x: t.x, y: t.y });
      }
      for (const m of marks) this.sc.telegraph.circle(m.x, m.y, 11, 0.7, { owner: this });
      this.sc.snd('aviso');
      yield 0.7;
      this.sc.snd('pisoton');
      this.sc.shake(160, 0.01);
      for (const m of marks) {
        this.sc.fx.debris(m.x, m.y, 0x8a8394, 6);
        this.sc.fx.dust(m.x, m.y, 4);
        if (Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y) < 12) this.sc.hurtPlayer(2, m.x, m.y, { cause: 'La Torre' });
      }
      yield 0.35;
    }
  }

  *rueda(n: number): Script {
    const base = Math.random() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const off = base + k * 0.28;
      const count = 14;
      for (let i = 0; i < count; i++) {
        // Dos huecos por donde escapar.
        if (i === 0 || i === 1 || i === 7 || i === 8) continue;
        const a = off + (i / count) * Math.PI * 2;
        this.sc.spawnShot(this.x, this.y, Math.cos(a) * 75, Math.sin(a) * 75, false, { damage: 1, range: 200, texture: 'orbe_bala' });
      }
      this.sc.snd('cajaMusica');
      yield 0.35;
    }
  }

  *luna(): Script {
    this.sc.setDark(true);
    this.sc.snd('humo');
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      this.sc.spawn('orbe', this.x + Math.cos(a) * 16, this.y + Math.sin(a) * 16);
    }
    yield 3.5;
    this.sc.setDark(false);
  }

  *muerte(): Script {
    const horiz = Math.random() < 0.5;
    const band = 28;
    // Franja sobre el payaso: fila o columna.
    const rx = horiz ? 16 : Phaser.Math.Clamp(this.player.x - band / 2, 16, ROOM_W - 16 - band);
    const ry = horiz ? Phaser.Math.Clamp(this.player.y - band / 2, 16, ROOM_H - 16 - band) : 16;
    const rw = horiz ? ROOM_W - 32 : band,
      rh = horiz ? band : ROOM_H - 32;
    this.sc.telegraph.rect(rx, ry, rw, rh, 0.8, { owner: this });
    this.sc.snd('aviso');
    yield 0.8;
    this.sc.snd('guadana');
    const scythe = this.sc.add.image(horiz ? 0 : rx + band / 2, horiz ? ry + band / 2 : 0, 'guadana').setDepth(500);
    this.sc.roomObjs.push(scythe);
    for (let k = 0; k <= 8; k++) {
      const f = k / 8;
      if (horiz) scythe.setPosition(16 + f * (ROOM_W - 32), ry + band / 2);
      else scythe.setPosition(rx + band / 2, 16 + f * (ROOM_H - 32));
      scythe.setRotation(f * Math.PI * 4);
      const p = this.player;
      if (p.x > rx && p.x < rx + rw && p.y > ry && p.y < ry + rh && Phaser.Math.Distance.Between(p.x, p.y, scythe.x, scythe.y) < 18) {
        this.sc.hurtPlayer(2, scythe.x, scythe.y, { cause: 'La Muerte' });
      }
      yield 0.04;
    }
    scythe.destroy();
    yield 0.3;
  }

  *barajarMazo(): Script {
    this.sc.banner('Madame Fortuna baraja', 'Las cartas se ponen serias');
    this.sc.snd('carta');
    for (let i = 0; i < 6; i++) {
      this.ring(6, 60, { texture: 'orbe_bala', range: 120 }, i * 0.5);
      this.sc.snd('carta');
      yield 0.25;
    }
  }

  die(): void {
    if (this.dead) return;
    this.sc.setDark(false);
    this.cardImg.destroy();
    super.die();
  }
}
