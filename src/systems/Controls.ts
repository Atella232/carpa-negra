// Entrada: teclado + acciones virtuales (para pruebas automáticas).
import Phaser from 'phaser';

export type Action =
  | 'arriba'
  | 'abajo'
  | 'izquierda'
  | 'derecha'
  | 'dispararArriba'
  | 'dispararAbajo'
  | 'dispararIzquierda'
  | 'dispararDerecha'
  | 'petardo'
  | 'activo'
  | 'golosina'
  | 'pausa'
  | 'aceptar'
  | 'estadisticas';

const BINDINGS: Record<Action, string[]> = {
  arriba: ['W'],
  abajo: ['S'],
  izquierda: ['A'],
  derecha: ['D'],
  dispararArriba: ['UP'],
  dispararAbajo: ['DOWN'],
  dispararIzquierda: ['LEFT'],
  dispararDerecha: ['RIGHT'],
  petardo: ['E', 'SHIFT'],
  activo: ['SPACE'],
  golosina: ['Q'],
  pausa: ['ESC', 'P'],
  aceptar: ['ENTER'],
  estadisticas: ['TAB'],
};

const SHOOT: Action[] = ['dispararArriba', 'dispararAbajo', 'dispararIzquierda', 'dispararDerecha'];
const SHOOT_VEC: Record<string, { x: number; y: number }> = {
  dispararArriba: { x: 0, y: -1 },
  dispararAbajo: { x: 0, y: 1 },
  dispararIzquierda: { x: -1, y: 0 },
  dispararDerecha: { x: 1, y: 0 },
};

export class Controls {
  private keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private held = new Set<Action>();
  private prev = new Set<Action>();
  private shootOrder: Action[] = [];
  /** Acciones mantenidas por código (API de depuración). */
  readonly virtual = new Set<Action>();
  inverted = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    for (const [action, names] of Object.entries(BINDINGS) as [Action, string[]][]) {
      this.keys.set(
        action,
        names.map((n) => kb.addKey(Phaser.Input.Keyboard.KeyCodes[n as keyof typeof Phaser.Input.Keyboard.KeyCodes], true, false)),
      );
    }
    // Que las flechas y el espacio no muevan la página.
    kb.addCapture('UP,DOWN,LEFT,RIGHT,SPACE,TAB');
  }

  /** Llamar una vez por fotograma antes de leer nada. */
  update(): void {
    this.prev = new Set(this.held);
    this.held.clear();
    for (const [action, keys] of this.keys) {
      if (this.virtual.has(action) || keys.some((k) => k.isDown)) this.held.add(action);
    }
    for (const a of SHOOT) {
      const i = this.shootOrder.indexOf(a);
      if (this.held.has(a) && i === -1) this.shootOrder.push(a);
      if (!this.held.has(a) && i !== -1) this.shootOrder.splice(i, 1);
    }
  }

  isDown(a: Action): boolean {
    return this.held.has(a);
  }

  pressed(a: Action): boolean {
    return this.held.has(a) && !this.prev.has(a);
  }

  move(): { x: number; y: number } {
    let x = (this.held.has('derecha') ? 1 : 0) - (this.held.has('izquierda') ? 1 : 0);
    let y = (this.held.has('abajo') ? 1 : 0) - (this.held.has('arriba') ? 1 : 0);
    if (this.inverted) {
      x = -x;
      y = -y;
    }
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  /** Dirección de disparo: manda la última flecha pulsada. */
  shoot(): { x: number; y: number } | null {
    const last = this.shootOrder[this.shootOrder.length - 1];
    return last ? SHOOT_VEC[last] : null;
  }

  releaseAll(): void {
    this.virtual.clear();
    this.shootOrder = [];
  }
}
