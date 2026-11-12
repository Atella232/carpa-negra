// Entrada: un único mapa de acciones para todo el juego, alimentado por varias
// fuentes (teclado, mando, controles táctiles y acciones virtuales de pruebas).
// El teclado se lee con eventos del navegador (event.code) y no con las teclas
// de Phaser: así pausar una escena (parada de impacto) no suelta lo pulsado.
import { settings } from '../core/save';

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
  | 'cancelar'
  | 'estadisticas';

export const ACTIONS: Action[] = [
  'arriba', 'abajo', 'izquierda', 'derecha',
  'dispararArriba', 'dispararAbajo', 'dispararIzquierda', 'dispararDerecha',
  'petardo', 'activo', 'golosina', 'pausa', 'aceptar', 'cancelar', 'estadisticas',
];

export const DEFAULT_KEYS: Record<Action, string[]> = {
  arriba: ['KeyW'],
  abajo: ['KeyS'],
  izquierda: ['KeyA'],
  derecha: ['KeyD'],
  dispararArriba: ['ArrowUp'],
  dispararAbajo: ['ArrowDown'],
  dispararIzquierda: ['ArrowLeft'],
  dispararDerecha: ['ArrowRight'],
  petardo: ['KeyE', 'ShiftLeft', 'ShiftRight'],
  activo: ['Space'],
  golosina: ['KeyQ'],
  pausa: ['Escape', 'KeyP'],
  aceptar: ['Enter'],
  cancelar: ['Backspace'],
  estadisticas: ['Tab'],
};

/** Mando estándar: botones → acciones. */
export const DEFAULT_PAD: Record<Action, number[]> = {
  arriba: [12],
  abajo: [13],
  izquierda: [14],
  derecha: [15],
  dispararArriba: [3], // Y
  dispararAbajo: [0], // A
  dispararIzquierda: [2], // X
  dispararDerecha: [1], // B
  petardo: [6, 4], // LT, LB
  activo: [7], // RT
  golosina: [5], // RB
  pausa: [9], // Start
  aceptar: [0],
  cancelar: [1],
  estadisticas: [8], // Select
};

const SHOOT: Action[] = ['dispararArriba', 'dispararAbajo', 'dispararIzquierda', 'dispararDerecha'];
const SHOOT_VEC: Record<string, { x: number; y: number }> = {
  dispararArriba: { x: 0, y: -1 },
  dispararAbajo: { x: 0, y: 1 },
  dispararIzquierda: { x: -1, y: 0 },
  dispararDerecha: { x: 1, y: 0 },
};

/** Estado que aporta una fuente externa (táctil) en cada fotograma. */
export interface ExternalInput {
  down: Set<Action>;
  move: { x: number; y: number };
  aim: { x: number; y: number } | null;
}

export type Device = 'teclado' | 'mando' | 'tactil';

/** Ajusta un stick a la dirección dominante con histéresis (evita parpadeos en diagonal). */
export function snapAim(x: number, y: number, prev: Action | null, dead = 0.35): Action | null {
  const ax = Math.abs(x),
    ay = Math.abs(y);
  if (Math.max(ax, ay) < dead) return null;
  const horiz = (a: Action | null) => a === 'dispararIzquierda' || a === 'dispararDerecha';
  let useX = ax > ay;
  if (prev && Math.abs(ax - ay) < 0.25) useX = horiz(prev);
  if (useX) return x > 0 ? 'dispararDerecha' : 'dispararIzquierda';
  return y > 0 ? 'dispararAbajo' : 'dispararArriba';
}

export class Controls {
  private static instance: Controls | null = null;

  static get(): Controls {
    if (!Controls.instance) Controls.instance = new Controls();
    return Controls.instance;
  }

  private keysDown = new Set<string>();
  /** Teclas y botones pulsados desde el último fotograma: aunque se suelten
   *  antes de que llegue, cuentan una vez (un toque rápido no se pierde). */
  private keysTapped = new Set<string>();
  private tapped = new Set<Action>();
  private codeToActions = new Map<string, Action[]>();
  private held = new Set<Action>();
  private prev = new Set<Action>();
  private shootOrder: Action[] = [];
  private padMove = { x: 0, y: 0 };
  private padAim: Action | null = null;
  /** Acciones mantenidas por código (API de depuración). */
  readonly virtual = new Set<Action>();
  /** Fuentes externas (controles táctiles). */
  readonly external: ExternalInput = { down: new Set(), move: { x: 0, y: 0 }, aim: null };
  inverted = false;
  lastDevice: Device = 'teclado';
  /** Al reasignar teclas: la siguiente tecla pulsada se entrega aquí. */
  capture: ((code: string) => void) | null = null;

  private constructor() {
    this.rebind();
    window.addEventListener('keydown', (ev) => {
      if (this.capture) {
        ev.preventDefault();
        const cb = this.capture;
        this.capture = null;
        cb(ev.code);
        return;
      }
      this.keysDown.add(ev.code);
      if (!ev.repeat) this.keysTapped.add(ev.code);
      this.lastDevice = 'teclado';
      // Que las flechas, el espacio y el tabulador no muevan la página.
      if (this.codeToActions.has(ev.code) || ev.code.startsWith('Arrow')) ev.preventDefault();
    });
    window.addEventListener('keyup', (ev) => this.keysDown.delete(ev.code));
    window.addEventListener('blur', () => this.keysDown.clear());
  }

  /** Vuelve a leer la asignación de teclas de los ajustes. */
  rebind(): void {
    const custom = safeSettings()?.keys ?? {};
    this.codeToActions.clear();
    for (const a of ACTIONS) {
      for (const code of custom[a] ?? DEFAULT_KEYS[a]) {
        const list = this.codeToActions.get(code) ?? [];
        list.push(a);
        this.codeToActions.set(code, list);
      }
    }
  }

  keysFor(a: Action): string[] {
    return safeSettings()?.keys?.[a] ?? DEFAULT_KEYS[a];
  }

  /** Llamar una vez por fotograma antes de leer nada. */
  update(): void {
    this.prev = new Set(this.held);
    this.held.clear();
    for (const code of this.keysDown) for (const a of this.codeToActions.get(code) ?? []) this.held.add(a);
    for (const code of this.keysTapped) for (const a of this.codeToActions.get(code) ?? []) this.held.add(a);
    this.keysTapped.clear();
    for (const a of this.virtual) this.held.add(a);
    for (const a of this.external.down) this.held.add(a);
    for (const a of this.tapped) this.held.add(a);
    this.tapped.clear();
    this.pollPad();
    if (this.external.aim) {
      const a = snapAim(this.external.aim.x, this.external.aim.y, null, 0.3);
      if (a) this.held.add(a);
    }
    for (const a of SHOOT) {
      const i = this.shootOrder.indexOf(a);
      if (this.held.has(a) && i === -1) this.shootOrder.push(a);
      if (!this.held.has(a) && i !== -1) this.shootOrder.splice(i, 1);
    }
  }

  private pollPad(): void {
    this.padMove = { x: 0, y: 0 };
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    if (!pad) return;
    const map = safeSettings()?.pad ?? {};
    const btn = (i: number) => !!pad.buttons[i]?.pressed;
    let any = false;
    for (const a of ACTIONS) {
      for (const i of map[a] ?? DEFAULT_PAD[a]) {
        if (btn(i)) {
          this.held.add(a);
          any = true;
        }
      }
    }
    const lx = pad.axes[0] ?? 0,
      ly = pad.axes[1] ?? 0;
    if (Math.hypot(lx, ly) > 0.25) {
      this.padMove = { x: lx, y: ly };
      any = true;
    }
    this.padAim = snapAim(pad.axes[2] ?? 0, pad.axes[3] ?? 0, this.padAim);
    if (this.padAim) {
      this.held.add(this.padAim);
      any = true;
    }
    if (any) this.lastDevice = 'mando';
  }

  /** Vibración del mando (si lo admite y está activada). */
  rumble(ms: number, strength = 0.5): void {
    if (!safeSettings()?.rumble) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected) as (Gamepad & { vibrationActuator?: { playEffect: (t: string, o: object) => void } }) | undefined;
    pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength });
  }

  /** Pulsación de un botón externo (táctil): se mantiene y, aunque se suelte
   *  antes del siguiente fotograma, cuenta una vez. */
  press(a: Action): void {
    this.external.down.add(a);
    this.tapped.add(a);
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
    let analog = false;
    // Los sticks (mando o táctil) mandan si no se pulsa ninguna dirección digital.
    const stick = this.external.move.x || this.external.move.y ? this.external.move : this.padMove;
    if (!x && !y && (stick.x || stick.y)) {
      x = stick.x;
      y = stick.y;
      analog = true;
    }
    if (this.inverted) {
      x = -x;
      y = -y;
    }
    const len = Math.hypot(x, y);
    if (len === 0) return { x: 0, y: 0 };
    // Digital: siempre a tope. Analógico: la inclinación da la velocidad (hasta 1).
    const k = analog ? Math.min(1, len) / len : 1 / len;
    return { x: x * k, y: y * k };
  }

  /** Dirección de disparo: manda la última dirección pulsada. */
  shoot(): { x: number; y: number } | null {
    const last = this.shootOrder[this.shootOrder.length - 1];
    return last ? SHOOT_VEC[last] : null;
  }

  releaseAll(): void {
    this.virtual.clear();
    this.shootOrder = [];
  }

  /** Texto corto de la tecla o botón de una acción, para los carteles. */
  glyph(a: Action): string {
    if (this.lastDevice === 'mando') {
      const names: Record<number, string> = {
        0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Select', 9: 'Start',
        12: '↑', 13: '↓', 14: '←', 15: '→',
      };
      const b = (safeSettings()?.pad?.[a] ?? DEFAULT_PAD[a])[0];
      return names[b] ?? `B${b}`;
    }
    if (this.lastDevice === 'tactil') return '';
    return codeLabel(this.keysFor(a)[0] ?? '');
  }
}

function safeSettings() {
  try {
    return settings();
  } catch {
    return null;
  }
}

/** Nombre legible de un event.code ("KeyW" → "W"). */
export function codeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const named: Record<string, string> = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espacio', Escape: 'Esc',
    ShiftLeft: 'Mayús', ShiftRight: 'Mayús', Enter: 'Enter', Tab: 'Tab', Backspace: 'Borrar',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt',
  };
  return named[code] ?? code;
}
