// Disparos del jugador (pelotas de malabares) y de los enemigos.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';
import { DEPTH } from '../config';
import { settings } from '../core/save';

export interface ShotOpts {
  damage: number;
  range: number; // píxeles
  scale?: number;
  pierce?: boolean;
  bounce?: number;
  burn?: boolean;
  fragment?: boolean;
  spectral?: boolean;
  homing?: boolean;
  isFragment?: boolean;
  knockback?: number;
  texture?: string;
  rotate?: boolean;
  /** Al caer, estalla en este número de balas (pesas del Forzudo). */
  burst?: number;
  poison?: boolean;
  grow?: boolean;
  /** Medios globos que quita al payaso (por defecto, `damage`). */
  halves?: number;
  /** Vuelve hacia donde salió al llegar a la mitad del alcance (cartas del ilusionista). */
  boomerang?: boolean;
  /** Al dar, salta a otra criatura cercana con el 60 % del daño (Esquirla de Espejo). */
  chain?: boolean;
  /** Se parte en dos a mitad del alcance (Sierra del Mago). */
  split?: boolean;
  /** Estalla al caer o al dar (Tomate Podrido). */
  explosive?: boolean;
  /** Es un golpe crítico (solo visual: el daño ya va multiplicado). */
  crit?: boolean;
  /** Ya ha saltado de criatura (para no encadenar sin fin). */
  isChain?: boolean;
  /** Segundos de controles invertidos al payaso en vez de daño (orbe del hipnotizador). */
  daze?: number;
  // --- Objetos de la variedad (solo pelotas del payaso) ---
  wiggle?: boolean;
  water?: boolean;
  sticky?: boolean;
  antiBala?: boolean;
  linger?: boolean;
  prism?: boolean;
  orbit?: boolean;
  ramp?: boolean;
}

export class Shot extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  opts: Required<ShotOpts>;
  life = 0;
  maxLife: number;
  bouncesLeft: number;
  hit = new Set<Enemy>();
  readonly friendly: boolean;
  dead = false;
  /** Quién la disparó (para el resumen si te tumba). */
  cause = '';
  private shadow: Phaser.GameObjects.Image;
  private speed: number;
  private baseDamage = 0;
  private trailT = 0;
  private homeX = 0;
  private homeY = 0;
  /** Bumerán: ya vuelve hacia la mano (en la vuelta no choca con las paredes). */
  returning = false;
  private didSplit = false;
  /** Velocidad antes del último choque (para la Bola de Espejos). */
  lastVel = { x: 0, y: 0 };
  /** Zigzag de las serpentinas que se sumó el fotograma anterior. */
  private wig = { x: 0, y: 0 };
  /** Bolos: la pelota ya está quieta en el suelo. */
  lingering = false;
  private lingerT = 0;
  /** Aro de Hula: ángulo y reloj de la órbita. */
  private orbitA = 0;
  private hitClearT = 0;
  /** Platos Chinos: balas que puede romper aún. */
  antiLeft = 1;

  constructor(scene: GameScene, x: number, y: number, vx: number, vy: number, friendly: boolean, opts: ShotOpts) {
    super(scene, x, y, opts.texture ?? (friendly ? 'pelota' : 'bala'));
    this.friendly = friendly;
    this.opts = {
      scale: 1, pierce: false, bounce: 0, burn: false, fragment: false, spectral: false,
      homing: false, isFragment: false, knockback: 70, texture: this.texture.key, rotate: false, burst: 0, poison: false, grow: false,
      halves: opts.damage, boomerang: false, chain: false, split: false, explosive: false, crit: false, isChain: false, daze: 0,
      wiggle: false, water: false, sticky: false, antiBala: false, linger: false, prism: false, orbit: false, ramp: false,
      ...opts,
    };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (friendly ? scene.g.pShots : scene.g.eShots).add(this);
    const s = this.opts.scale;
    this.setScale(s);
    const r = Math.max(2, (friendly ? 3 : 2.5) * s);
    // La pelota vuela a la altura de la cabeza, pero choca a la altura del cuerpo
    // (más cerca de su sombra): así un disparo bien alineado nunca pasa por encima.
    this.body.setCircle(r / s, this.width / 2 - r / s, this.height / 2 - r / s + 5 / s);
    this.body.setVelocity(vx, vy);
    this.body.setBounce(this.opts.bounce > 0 ? 1 : 0);
    this.speed = Math.hypot(vx, vy);
    this.maxLife = this.speed > 0 ? this.opts.range / this.speed : 1;
    this.bouncesLeft = this.opts.bounce;
    if (this.opts.rotate) this.setRotation(Math.atan2(vy, vx));
    if (this.opts.burn && friendly) this.setTexture('pelota_fuego');
    else if (this.opts.poison && friendly && !this.opts.rotate) this.setTexture('pelota_veneno');
    this.baseDamage = this.opts.damage;
    this.homeX = x;
    this.homeY = y;
    this.lastVel = { x: vx, y: vy };
    this.orbitA = Math.atan2(vy, vx);
    this.antiLeft = this.opts.pierce ? 3 : 1;
    if (this.opts.orbit) this.maxLife *= 2.2;
    if (this.opts.water && friendly) this.setTint(0x9fd8ff);
    if (this.opts.crit) this.setTint(0xfff2a8);
    // Alto contraste: balas enemigas más grandes y de un color que no hay en el suelo.
    if (!friendly && settings().contrast) this.setScale(this.opts.scale * 1.35).setTint(0xff4dff);
    this.setDepth(DEPTH.shot);
    this.shadow = scene.add.image(x, y + 8, 'sombra').setScale(0.5 * s).setDepth(DEPTH.shadow).setAlpha(0.7);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead) return;
    const dt = Math.min(0.05, delta / 1000);
    this.life += dt;
    const t = this.life / this.maxLife;
    const scene = this.scene as GameScene;

    // Aro de Hula: gira alrededor del payaso, abriéndose poco a poco.
    if (this.opts.orbit && this.friendly) {
      const p = scene.player;
      this.orbitA += dt * 5;
      const r = 18 + 16 * Math.min(1, t);
      const x = p.x + Math.cos(this.orbitA) * r,
        y = p.y - 8 + Math.sin(this.orbitA) * r;
      this.body.reset(x, y);
      this.shadow.setPosition(x, y + 8);
      this.hitClearT -= dt;
      if (this.hitClearT <= 0) {
        this.hitClearT = 0.4;
        this.hit.clear();
      }
      if (this.life >= this.maxLife) this.pop();
      return;
    }
    // Bolos: quieta en el suelo hasta que alguien la pise (o pasen 3 s).
    if (this.lingering) {
      this.lingerT -= dt;
      this.body.setVelocity(0, 0);
      if (this.lingerT < 0.5) this.setAlpha(Math.max(0.2, this.lingerT / 0.5));
      if (this.lingerT <= 0) this.pop();
      return;
    }
    this.lastVel = { x: this.body.velocity.x, y: this.body.velocity.y };

    if (this.opts.homing) {
      // Los del payaso buscan criaturas; los enemigos, al payaso (y giran más despacio).
      const target = this.friendly ? scene.nearestEnemy(this.x, this.y, 90) : scene.player;
      if (target) this.steer(target.x, target.y, this.friendly ? 4 : 1.3, dt);
    }
    // Bumerán: a mitad de camino vuelve a casa.
    if (this.opts.boomerang) {
      if (!this.returning && t >= 0.5) {
        this.returning = true;
        // A la vuelta puede volver a dar a las mismas fieras.
        if (this.friendly) this.hit.clear();
      }
      if (this.returning) {
        // Las cartas enemigas vuelven a donde salieron; tus pelotas, a tu mano.
        const hx = this.friendly ? scene.player.x : this.homeX,
          hy = this.friendly ? scene.player.y - 8 : this.homeY;
        this.steer(hx, hy, this.friendly ? 14 : 7, dt);
        this.setRotation(this.rotation + dt * 18);
        if (Phaser.Math.Distance.Between(this.x, this.y, hx, hy) < (this.friendly ? 10 : 8)) return this.pop();
      } else this.setRotation(this.rotation + dt * 18);
    }
    // Sierra del Mago: se parte en dos a mitad del alcance.
    if (this.opts.split && !this.didSplit && t >= 0.5 && this.friendly) {
      this.didSplit = true;
      const a = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      for (const off of [-0.35, 0.35]) {
        scene.spawnShot(this.x, this.y, Math.cos(a + off) * this.speed, Math.sin(a + off) * this.speed, true, {
          ...this.opts, split: false, damage: this.opts.damage * 0.65, scale: this.opts.scale * 0.8, range: this.opts.range * 0.5,
        });
      }
      return this.pop();
    }
    // Bola de Equilibrista: crece y pega más cuanto más lejos llega.
    if (this.opts.grow && this.friendly) {
      const k = Math.min(1, t);
      this.setScale(this.opts.scale * (1 + k * 1.1));
      this.opts.damage = this.baseDamage * (1 + k * 1.2);
    }
    // Serpentinas: un vaivén ancho perpendicular a la marcha (sobrevive a los rebotes).
    if (this.opts.wiggle && this.friendly && !this.opts.homing && t < 0.78) {
      const v = this.body.velocity;
      const bx = v.x - this.wig.x,
        by = v.y - this.wig.y;
      const len = Math.hypot(bx, by) || 1;
      const k = Math.cos(this.life * 14) * 90;
      this.wig = { x: (-by / len) * k, y: (bx / len) * k };
      this.body.setVelocity(bx + this.wig.x, by + this.wig.y);
    }
    // Al final del recorrido, la pelota cae.
    if (t > 0.78 && !this.opts.rotate && !this.opts.boomerang && !this.opts.linger) this.body.velocity.y += 260 * dt;
    if (this.opts.rotate) this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
    const fall = t > 0.78 ? (t - 0.78) * 30 : 0;
    this.shadow.setPosition(this.x, this.y + 8 - fall);
    // Estela corta y latido de las balas enemigas.
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 1 / 30;
      scene.fx.trail(this.x, this.y, this.friendly ? (this.opts.burn ? 0xe8743b : this.opts.poison ? 0x79b84a : 0x7fd1b9) : 0xd4323f);
    }
    if (!this.friendly && this.texture.frameTotal > 2) this.setFrame(Math.floor(this.life * 8) % 2);
    const maxLife = this.opts.boomerang ? this.maxLife * 1.6 : this.maxLife;
    if (this.life >= maxLife) {
      if (this.opts.linger && this.friendly && !this.opts.isFragment) this.startLinger(scene);
      else this.pop();
    }
  }

  /** Bolos: se queda en el suelo 3 s; pega un poco menos y desaparece al primer golpe. */
  private startLinger(scene: GameScene): void {
    this.lingering = true;
    this.lingerT = 3;
    this.opts.damage *= 0.75;
    this.opts.pierce = false;
    this.body.setVelocity(0, 0);
    this.setY(this.y + 6);
    this.shadow.setPosition(this.x, this.y + 3);
    // Como mucho 12 en la sala: se va la más antigua.
    scene.bolos = scene.bolos.filter((b) => b.active && !b.dead);
    scene.bolos.push(this);
    if (scene.bolos.length > 12) scene.bolos.shift()?.pop();
  }

  /** Gira poco a poco hacia (x, y) a `turn` radianes por segundo. */
  private steer(x: number, y: number, turn: number, dt: number): void {
    const ang = Math.atan2(y - this.y, x - this.x);
    const cur = Math.atan2(this.body.velocity.y, this.body.velocity.x);
    const diff = Phaser.Math.Angle.Wrap(ang - cur);
    const na = cur + Phaser.Math.Clamp(diff, -turn * dt, turn * dt);
    this.body.setVelocity(Math.cos(na) * this.speed, Math.sin(na) * this.speed);
  }

  /** Rebota en una superficie: invierte la componente x o y de la velocidad. */
  reflect(axis: 'x' | 'y'): void {
    const v = this.body.velocity;
    if (axis === 'x') v.x = -v.x;
    else v.y = -v.y;
    // Rebotar alarga un poco la vida, para que los pasillos de espejos luzcan.
    this.life = Math.min(this.life, this.maxLife * 0.6);
  }

  /**
   * Destruye el disparo con salpicadura (y fragmentos si tiene palomitas).
   * `surface` cambia el impacto: pared (polvo), obstáculo (astillas) o carne (chispas).
   */
  pop(surface: 'aire' | 'pared' | 'obstaculo' | 'carne' = 'aire'): void {
    if (this.dead) return;
    this.dead = true;
    const scene = this.scene as GameScene;
    scene.splash(this.x, this.y, this.friendly ? (this.opts.burn ? 'salpicadura' : 'salpicadura_azul') : 'salpicadura_roja', this.opts.scale);
    if (surface === 'pared') scene.fx.dust(this.x, this.y, 2);
    else if (surface === 'obstaculo') scene.fx.debris(this.x, this.y, 0xa8673b, 3);
    else if (surface === 'carne') scene.fx.sparks(this.x, this.y, this.friendly ? 0xffffff : 0xf2a3b5, 3);
    if (this.friendly && this.opts.fragment && !this.opts.isFragment) {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        scene.spawnShot(this.x, this.y, Math.cos(a) * 140, Math.sin(a) * 140, true, {
          ...this.opts,
          damage: this.opts.damage * 0.5,
          scale: this.opts.scale * 0.6,
          range: 40,
          isFragment: true,
          bounce: 0,
        });
      }
    }
    if (this.opts.explosive && this.friendly) {
      scene.explode(this.x, this.y, { damage: this.opts.damage * 0.6, hurtsPlayer: false, radius: 18, small: true });
    }
    if (!this.friendly && this.opts.burst > 0) {
      const n = this.opts.burst;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        scene.spawnShot(this.x, this.y, Math.cos(a) * 85, Math.sin(a) * 85, false, { damage: 1, range: 110 });
      }
      scene.snd('golpe');
    }
    this.destroy();
  }

  destroy(fromScene?: boolean): void {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
