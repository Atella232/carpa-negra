// Base de los jefes nuevos: fases con umbral de vida y ataques escritos como
// guiones. Un guion es un generador que devuelve segundos de espera:
//
//   *lluvia(b) { b.warn(...); yield 0.7; b.ring(12, 90); yield 0.4; }
//
// Avanza con dt, así que se congela con la parada de impacto, funciona con el
// avance por fotogramas y muere con el jefe.
import type { GameScene } from '../scenes/GameScene';
import { Enemy, EnemyOpts } from './Enemy';

export type Script = Generator<number, void, unknown>;

// Las funciones van con sintaxis de método para que Phase<TuReflejo> valga como Phase<Boss>.
export interface Attack<B> {
  id: string;
  weight?: number;
  /** Condición para poder elegirlo. */
  can?(b: B): boolean;
  run(b: B): Script;
}

export interface Phase<B> {
  /** Fracción de vida por debajo de la cual empieza esta fase (la primera es 1). */
  at: number;
  attacks: Attack<B>[];
  /** Pausa entre ataques (segundos). */
  rest?: [number, number];
  /** Guion de transición al entrar (el jefe es invulnerable mientras dura). */
  enter?(b: B): Script;
}

export abstract class Boss extends Enemy {
  abstract phases: Phase<Boss>[];
  phase = 0;
  private script: Script | null = null;
  private wait = 0;
  private restT = 1.2;
  private last = '';
  /** En una transición: no se le puede bajar de la siguiente fase. */
  inTransition = false;
  /** Contador libre para animaciones. */
  t = 0;

  constructor(scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) {
    super(scene, x, y, texture, { ...o, fixedHp: true });
    this.isBoss = true;
    this.wake = 1.4;
  }

  /** Movimiento entre ataques (y mientras atacan, si el guion no lo para). */
  protected abstract idle(dt: number): void;

  /** Fracción de vida restante. */
  get frac(): number {
    return this.hp / this.maxHp;
  }

  /** Umbrales de fase para la barra del jefe. */
  get marks(): number[] {
    return this.phases.slice(1).map((p) => p.at);
  }

  protected think(dt: number): void {
    this.t += dt;
    // ¿Toca cambiar de fase?
    const next = this.phases[this.phase + 1];
    if (!this.inTransition && next && this.frac <= next.at) {
      this.phase++;
      this.onPhase(this.phase);
      const enter = next.enter;
      if (enter) {
        this.inTransition = true;
        this.script = enter(this);
        this.wait = 0;
      } else this.script = null;
    }
    if (this.script) {
      this.wait -= dt;
      while (this.script && this.wait <= 0) {
        const r = this.script.next();
        if (r.done) {
          this.script = null;
          this.inTransition = false;
          const rest = this.phases[this.phase].rest ?? [0.6, 1.2];
          this.restT = rest[0] + Math.random() * (rest[1] - rest[0]);
        } else this.wait += r.value;
      }
    } else {
      this.restT -= dt;
      if (this.restT <= 0) this.pickAttack();
    }
    if (!this.dead) this.idle(dt);
  }

  /** Gancho al entrar en una fase (antes del guion de transición). */
  protected onPhase(_n: number): void {}

  private pickAttack(): void {
    const all = this.phases[this.phase].attacks.filter((a) => !a.can || a.can(this));
    if (!all.length) return;
    const options = all.length > 1 ? all.filter((a) => a.id !== this.last) : all;
    const total = options.reduce((s, a) => s + (a.weight ?? 1), 0);
    let r = Math.random() * total;
    let pick = options[0];
    for (const a of options) {
      r -= a.weight ?? 1;
      if (r < 0) {
        pick = a;
        break;
      }
    }
    this.last = pick.id;
    this.script = pick.run(this);
    this.wait = 0;
  }

  /** ¿Está ejecutando un ataque ahora? */
  get busy(): boolean {
    return !!this.script;
  }

  /** Corta el ataque en curso. */
  protected cancel(): void {
    this.script = null;
  }

  /** Durante la transición la vida no baja del umbral de la fase siguiente. */
  damage(amount: number, from: { x: number; y: number } | null, knockback = 60, silent = false): boolean {
    if (this.inTransition) {
      if (!silent) this.sc.snd('rebote');
      return false;
    }
    const next = this.phases[this.phase + 1];
    if (next) {
      const floor = next.at * this.maxHp;
      // Un golpe enorme deja al jefe justo en el umbral: la fase no se salta.
      if (this.hp - amount < floor) amount = Math.max(0, this.hp - floor);
    }
    return super.damage(amount, from, knockback, silent);
  }

  // Atajos para los guiones.
  ringOf(n: number, speed: number, offset = 0, at = { x: this.x, y: this.y }): void {
    this.ring(n, speed, {}, offset, at);
  }
  fanOf(n: number, spread: number, speed: number, base?: number): void {
    this.fan(n, spread, speed, {}, base);
  }
  flash(): void {
    this.windupFlash();
  }
}
