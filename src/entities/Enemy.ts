// Clase base de criaturas: vida, estados alterados, retroceso y muerte.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH, ROOM_H, ROOM_W, TILE, toCol, toRow } from '../config';
import { Champion, CHAMPIONS } from '../data/enemies';
import type { ShotOpts } from './Shot';
import { settings } from '../core/save';

/** Fotograma de una animación en bucle. */
export const anim = (t: number, fps: number, frames: number) => Math.floor(t * fps) % frames;

export interface EnemyOpts {
  hp: number;
  speed: number;
  flying?: boolean;
  body: { w: number; h: number; dy: number };
  champion?: Champion | null;
  frame?: number;
  name?: string;
  /** Los jefes tienen su vida ya ajustada a su acto. */
  fixedHp?: boolean;
  /** Sin humo al aparecer (partes de jefes, cuerpos). */
  noSmoke?: boolean;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  hp: number;
  maxHp: number;
  speed: number;
  flying: boolean;
  champion: Champion | null;
  name: string;
  /** Daño por contacto en medios globos (0 = no hace daño al tocar). */
  contact = 1;
  invulnerable = false;
  isBoss = false;
  countsForClear = true;
  /** Se le puede apuntar (por defecto, si cuenta para limpiar la sala). */
  targetable?: boolean;
  dead = false;
  /** Cuánto tarda en reaccionar al entrar en la sala. */
  wake = 0.7;
  /** Altura visual (saltos). */
  lift = 0;
  /** Para detectar el aterrizaje de un salto (volar → suelo). */
  private wasFlying = false;

  desired = new Phaser.Math.Vector2();
  knock = new Phaser.Math.Vector2();
  burnT = 0;
  burnTick = 0;
  burnDmg = 0;
  slowT = 0;
  poisonT = 0;
  poisonTick = 0;
  poisonDmg = 0;
  thornCd = 0;
  fearT = 0;
  stunT = 0;
  flashT = 0;
  /** Temporizadores propios (mueren con la criatura y se congelan con ella). */
  private timers: { t: number; fn: () => void }[] = [];
  /** Multiplicador de velocidad temporal (aura del acomodador). */
  hasteT = 0;
  protected shadow: Phaser.GameObjects.Image;
  private badge: Phaser.GameObjects.Image | null = null;
  protected bodyDy: number;
  protected baseOff = { x: 0, y: 0 };

  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, o.frame ?? 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.g.enemies.add(this);
    this.champion = o.champion ?? null;
    const ch = this.champion ? CHAMPIONS[this.champion] : null;
    this.maxHp = this.hp = o.hp * (ch?.hpMult ?? 1) * (o.fixedHp ? 1 : scene.difficultyHpMult());
    this.speed = o.speed * (ch?.speedMult ?? 1);
    this.flying = !!o.flying;
    this.name = o.name ?? texture;
    this.bodyDy = o.body.dy;
    this.body.setSize(o.body.w, o.body.h, false);
    this.baseOff = { x: (this.width - o.body.w) / 2, y: (this.height - o.body.h) / 2 + o.body.dy };
    this.body.setOffset(this.baseOff.x, this.baseOff.y);
    if (ch) {
      this.setTint(ch.tint);
      // Insignia con forma (no solo color) para distinguir campeones.
      this.badge = scene.add.image(x, y, 'insignias', ['rojo', 'amarillo', 'azul', 'dorado'].indexOf(this.champion!)).setDepth(DEPTH.overlay - 2);
    }
    this.shadow = scene.add
      .image(x, y, this.width > 30 ? 'sombra_grande' : 'sombra')
      .setDepth(DEPTH.shadow);
    // Aparición: un instante translúcido.
    // Aparición: humo y un instante translúcido (con el reloj del juego).
    this.setAlpha(0);
    this.appearT = 0.25;
    if (!o.noSmoke) scene.splash(x, y, 'humo');
  }

  private appearT = 0;

  get sc(): GameScene {
    return this.scene as GameScene;
  }

  get player() {
    return this.sc.player;
  }

  /** Comportamiento propio de cada criatura: fija `desired` y ataca. */
  protected abstract think(dt: number): void;
  /** Se ejecuta siempre, aunque esté aturdida o dormida. */
  protected tick?(dt: number): void;
  /** Al recibir un disparo del payaso: 'deflect' lo devuelve. */
  onShot?(s: { x: number; y: number; body: { velocity: { x: number; y: number } } }): 'hit' | 'deflect';
  /** Iluminada por el Foco de Teatro: recibe más daño. */
  litT = 0;

  /** Llama a `fn` dentro de `sec` segundos de juego (si sigue viva). */
  protected after(sec: number, fn: () => void): void {
    this.timers.push({ t: sec, fn });
  }

  /** Anillo de `n` balas. */
  protected ring(n: number, speed: number, o: Partial<ShotOpts> = {}, offset = 0, at: { x: number; y: number } = this): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + offset;
      this.sc.spawnShot(at.x, at.y, Math.cos(a) * speed, Math.sin(a) * speed, false, { damage: 1, range: 150, ...o });
    }
  }

  /** Abanico de `n` balas separadas `spread` radianes, hacia `base` (por defecto, el payaso). */
  protected fan(n: number, spread: number, speed: number, o: Partial<ShotOpts> = {}, base?: number, at: { x: number; y: number } = this): void {
    const b = base ?? Math.atan2(this.player.y - 6 - at.y, this.player.x - at.x);
    for (let i = 0; i < n; i++) {
      const a = b + (i - (n - 1) / 2) * spread;
      this.sc.spawnShot(at.x, at.y, Math.cos(a) * speed, Math.sin(a) * speed, false, { damage: 1, range: 200, ...o });
    }
  }

  /** Destello de preparación: todo ataque avisa antes. */
  protected windupFlash(): void {
    this.setTintFill(0xfff2a8);
    this.flashT = 0.08;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead || !this.body) return;
    const dt = Math.min(0.05, delta / 1000);
    if (this.appearT > 0) {
      this.appearT = Math.max(0, this.appearT - dt);
      this.setAlpha(1 - this.appearT / 0.25);
    }
    this.wake -= dt;
    this.slowT = Math.max(0, this.slowT - dt);
    this.fearT = Math.max(0, this.fearT - dt);
    this.stunT = Math.max(0, this.stunT - dt);
    this.thornCd = Math.max(0, this.thornCd - dt);
    if (this.poisonT > 0) {
      this.poisonT -= dt;
      this.poisonTick -= dt;
      if (this.flashT <= 0) this.setTint(0x9be26a);
      if (this.poisonTick <= 0) {
        this.poisonTick = 0.6;
        this.damage(this.poisonDmg, null, 0, true);
        if (this.dead) return;
      }
      if (this.poisonT <= 0) this.restoreTint();
    }

    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.damage(this.burnDmg, null, 0, true);
        if (this.dead) return;
        this.sc.splash(this.x, this.y - 4, 'salpicadura', 0.6);
      }
    }

    if (this.timers.length) {
      const due = this.timers.filter((t) => (t.t -= dt) <= 0);
      this.timers = this.timers.filter((t) => t.t > 0);
      for (const t of due) {
        if (this.dead || !this.active) return;
        const sc = this.sc;
        sc.shotCause = this.name;
        t.fn();
        sc.shotCause = '';
      }
    }
    this.hasteT = Math.max(0, this.hasteT - dt);
    this.litT = Math.max(0, this.litT - dt);
    this.tick?.(dt);
    if (this.dead || !this.body) return;

    this.desired.set(0, 0);
    if (this.stunT <= 0 && this.wake <= 0 && !this.player.dead) {
      if (this.fearT > 0) this.flee();
      else {
        // La criatura puede desaparecer en su turno (señuelos): la escena se guarda antes.
        const sc = this.sc;
        sc.shotCause = this.name;
        this.think(dt);
        sc.shotCause = '';
      }
    }
    // Puede haber muerto (o desaparecido) durante su propio turno.
    if (this.dead || !this.active || !this.body) return;
    // Al aterrizar de un salto, nunca dentro de un obstáculo o un foso.
    if (this.wasFlying && !this.flying) this.landSafe();
    this.wasFlying = this.flying;
    this.keepInside();
    const slow = (this.slowT > 0 ? 0.45 : 1) * (this.hasteT > 0 ? 1.35 : 1);
    const floor = this.flying ? null : this.sc.floorPush(this.x, this.y + this.bodyDy);
    this.body.setVelocity(
      this.desired.x * slow + this.knock.x + (floor?.x ?? 0),
      this.desired.y * slow + this.knock.y + (floor?.y ?? 0),
    );
    this.knock.scale(Math.pow(0.0005, dt));
    if (this.knock.lengthSq() < 1) this.knock.set(0, 0);

    this.setDepth(DEPTH.world + this.y + this.bodyDy);
    this.badge?.setPosition(this.x, this.y - this.height / 2 - 4 - this.lift).setVisible(this.visible && this.alpha > 0.5);
    this.shadow.setPosition(this.x, this.body.bottom - 1);
    this.shadow.setVisible(this.visible);
    // La altura (saltos, vuelo) solo mueve el dibujo, no el cuerpo físico.
    this.setDisplayOrigin(this.width / 2, this.height / 2 + this.lift);
    this.body.setOffset(this.baseOff.x, this.baseOff.y + this.lift);

    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.restoreTint();
    }
  }

  /** Si ha caído sobre una baldosa bloqueada, pasa a la libre más cercana. */
  protected landSafe(): void {
    const sc = this.sc;
    if (!sc.nav.isBlocked(toCol(this.x), toRow(this.y + this.bodyDy))) return;
    const p = sc.nearestFreeTo(this.x, this.y + this.bodyDy);
    this.setPosition(p.x, p.y - this.bodyDy);
    this.body.reset(p.x, p.y - this.bodyDy);
  }

  /** Red de seguridad: nada se sale del interior de la sala. */
  private keepInside(): void {
    const x = Phaser.Math.Clamp(this.x, TILE + 2, ROOM_W - TILE - 2);
    const y = Phaser.Math.Clamp(this.y + this.bodyDy, TILE + 2, ROOM_H - TILE - 2) - this.bodyDy;
    if (x !== this.x || y !== this.y) {
      this.setPosition(x, y);
      this.body.reset(x, y);
      this.knock.set(0, 0);
    }
  }

  restoreTint(): void {
    if (this.champion) this.setTint(CHAMPIONS[this.champion].tint);
    else this.clearTint();
  }

  /** Devuelve true si el golpe la ha matado. */
  damage(amount: number, from: { x: number; y: number } | null, knockback = 60, silent = false): boolean {
    if (this.dead) return false;
    if (this.invulnerable) {
      if (!silent) this.sc.snd('rebote');
      return false;
    }
    this.hp -= amount;
    if (!silent) this.sc.snd('golpe');
    if (settings().damageNumbers && amount >= 0.5) this.sc.fx.number(this.x, this.y - this.height / 2, amount);
    this.setTintFill(0xffffff);
    this.flashT = 0.06;
    if (from && knockback > 0 && !this.isBoss) {
      const a = Math.atan2(this.y - from.y, this.x - from.x);
      this.knock.set(Math.cos(a) * knockback, Math.sin(a) * knockback);
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  burn(dmg: number): void {
    this.burnT = 2.1;
    this.burnDmg = Math.max(1, dmg * 0.35);
    if (this.burnTick <= 0) this.burnTick = 0.5;
  }

  poison(dmg: number): void {
    this.poisonT = 4;
    this.poisonDmg = Math.max(0.6, dmg * 0.22);
    if (this.poisonTick <= 0) this.poisonTick = 0.6;
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    const sc = this.sc;
    if (this.champion === 'azul') {
      // Estalla al morir, con aviso.
      const x = this.x,
        y = this.y;
      sc.telegraph.circle(x, y, 18, 0.35, { color: 0x4f8fd1 });
      sc.time.delayedCall(350, () => {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          sc.spawnShot(x, y, Math.cos(a) * 85, Math.sin(a) * 85, false, { damage: 1, range: 120 });
        }
      });
    }
    sc.onEnemyKilled(this);
    this.shadow.destroy();
    this.destroy();
  }

  destroy(fromScene?: boolean): void {
    if (this.shadow?.active) this.shadow.destroy();
    this.badge?.destroy();
    super.destroy(fromScene);
  }

  // --- Utilidades de movimiento ---
  protected toward(x: number, y: number, speed = this.speed): void {
    const a = Math.atan2(y - this.y, x - this.x);
    this.desired.set(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  /** Persigue al jugador rodeando obstáculos (o en línea recta si vuela). */
  protected chase(speed = this.speed): void {
    const p = this.player;
    if (this.flying) return this.toward(p.x, p.y, speed);
    const next = this.sc.nav.nextStep(this.x, this.y + this.bodyDy, p.x, p.y);
    this.toward(next.x, next.y - this.bodyDy, speed);
  }

  protected flee(): void {
    const p = this.player;
    const a = Math.atan2(this.y - p.y, this.x - p.x);
    this.desired.set(Math.cos(a) * this.speed * 0.8, Math.sin(a) * this.speed * 0.8);
  }

  /**
   * Se aparta del payaso hacia el centro despejado de la sala, sin pegarse a
   * las paredes ni meterse en las esquinas (si ya está contra un borde, se
   * escurre de lado). Para las criaturas que guardan la distancia.
   */
  protected keepAway(): void {
    const p = this.player;
    const a = Math.atan2(this.y - p.y, this.x - p.x);
    const clampX = (x: number) => Phaser.Math.Clamp(x, 44, 196),
      clampY = (y: number) => Phaser.Math.Clamp(y, 40, 104);
    let tx = clampX(this.x + Math.cos(a) * 40),
      ty = clampY(this.y + Math.sin(a) * 40);
    if (Math.hypot(tx - this.x, ty - this.y) < 10) {
      // Contra el borde: hacia el lado que más lo aleje del payaso.
      const opts = [a + Math.PI / 2, a - Math.PI / 2].map((s) => ({ x: clampX(this.x + Math.cos(s) * 40), y: clampY(this.y + Math.sin(s) * 40) }));
      const best = opts.sort((u, v) => Math.hypot(v.x - p.x, v.y - p.y) - Math.hypot(u.x - p.x, u.y - p.y))[0];
      tx = best.x;
      ty = best.y;
    }
    this.toward(tx, ty, this.speed * 0.8);
  }

  protected distToPlayer(): number {
    return Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
  }

  protected aimAtPlayer(speed: number): { vx: number; vy: number } {
    const a = Math.atan2(this.player.y - 6 - this.y, this.player.x - this.x);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  }
}
