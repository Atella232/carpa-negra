// Controles táctiles: dos palancas virtuales y botones como capa HTML encima de
// la página (fuera del lienzo). Alimentan a Controls como una fuente más.
import { Controls, Action } from './Controls';
import { settings } from '../core/save';

let root: HTMLDivElement | null = null;

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** Muestra u oculta los controles según el ajuste (auto: solo en pantallas táctiles). */
export function applyTouchSetting(): void {
  const mode = settings().touch;
  const on = mode === 'si' || (mode === 'auto' && isTouchDevice());
  if (on && !root) build();
  if (root) root.style.display = on ? 'block' : 'none';
  // El botón de pantalla completa se recoloca para no pisar los controles.
  document.documentElement.classList.toggle('con-tactil', on);
  if (on && mode === 'auto') Controls.get().lastDevice = 'tactil';
  if (!on) {
    const ext = Controls.get().external;
    ext.down.clear();
    ext.move = { x: 0, y: 0 };
    ext.aim = null;
  }
  // El escalado del lienzo depende del sitio que dejan los controles.
  window.dispatchEvent(new Event('resize'));
}

/**
 * Sitio (en píxeles CSS) que ocupan los controles táctiles y que el lienzo debe
 * dejar libre: a cada lado en horizontal y abajo en vertical. Se mide sobre los
 * elementos reales, así que incluye las zonas seguras (muesca) del teléfono.
 */
export function touchReserve(): { side: number; bottom: number } {
  if (!root || root.style.display === 'none') return { side: 0, bottom: 0 };
  const rects = [...root.querySelectorAll('.tc-stick, .tc-btns')].map((e) => e.getBoundingClientRect());
  if (!rects.length) return { side: 0, bottom: 0 };
  const W = window.innerWidth,
    H = window.innerHeight;
  if (W > H) {
    const side = Math.max(...rects.map((r) => (r.left + r.width / 2 < W / 2 ? r.right : W - r.left)));
    return { side: side + 2, bottom: 0 };
  }
  return { side: 0, bottom: H - Math.min(...rects.map((r) => r.top)) + 6 };
}

function stick(side: 'left' | 'right'): HTMLDivElement {
  const base = document.createElement('div');
  base.className = `tc-stick tc-${side}`;
  const knob = document.createElement('div');
  knob.className = 'tc-knob';
  base.appendChild(knob);
  const c = Controls.get();
  let id: number | null = null;
  let cx = 0,
    cy = 0;
  const R = 44;
  const set = (x: number, y: number) => {
    knob.style.transform = `translate(${x * R}px, ${y * R}px)`;
    if (side === 'left') c.external.move = { x, y };
    else c.external.aim = x || y ? { x, y } : null;
  };
  base.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    base.setPointerCapture(e.pointerId);
    c.lastDevice = 'tactil';
    e.preventDefault();
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    let x = (e.clientX - cx) / R,
      y = (e.clientY - cy) / R;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    set(len < 0.2 ? 0 : x, len < 0.2 ? 0 : y);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    set(0, 0);
  };
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  return base;
}

function button(label: string, action: Action): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'tc-btn';
  b.textContent = label;
  const c = Controls.get();
  b.addEventListener('pointerdown', (e) => {
    c.press(action);
    c.lastDevice = 'tactil';
    e.preventDefault();
  });
  const up = () => c.external.down.delete(action);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
  return b;
}

function build(): void {
  root = document.createElement('div');
  root.id = 'tactil';
  const style = document.createElement('style');
  style.textContent = `
    #tactil { position: fixed; inset: 0; pointer-events: none; z-index: 10; touch-action: none; user-select: none; }
    #tactil .tc-stick { position: absolute; bottom: max(24px, env(safe-area-inset-bottom)); width: 120px; height: 120px;
      border-radius: 50%; background: rgba(239,230,216,0.08); border: 2px solid rgba(239,230,216,0.25); pointer-events: auto; }
    #tactil .tc-left { left: max(20px, env(safe-area-inset-left)); }
    #tactil .tc-right { right: max(20px, env(safe-area-inset-right)); border-color: rgba(127,209,185,0.4); }
    #tactil .tc-knob { position: absolute; left: 38px; top: 38px; width: 44px; height: 44px; border-radius: 50%;
      background: rgba(239,230,216,0.35); }
    #tactil .tc-right .tc-knob { background: rgba(127,209,185,0.45); }
    #tactil .tc-btns { position: absolute; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right));
      display: flex; gap: 8px; pointer-events: auto; }
    #tactil .tc-btn { width: 52px; height: 52px; border-radius: 12px; border: 2px solid rgba(239,230,216,0.35);
      background: rgba(11,7,16,0.55); color: #efe6d8; font: bold 13px monospace; }
    @media (orientation: portrait) {
      #tactil .tc-btns { top: auto; bottom: calc(max(24px, env(safe-area-inset-bottom)) + 136px); right: 50%; transform: translateX(50%); }
    }
    /* En horizontal todo va en los márgenes laterales: palancas abajo y los
       botones en una cuadrícula 2×2 encima de la palanca derecha. */
    @media (orientation: landscape) {
      #tactil .tc-stick { width: 112px; height: 112px; bottom: max(16px, env(safe-area-inset-bottom)); }
      #tactil .tc-left { left: max(12px, env(safe-area-inset-left)); }
      #tactil .tc-right { right: max(12px, env(safe-area-inset-right)); }
      #tactil .tc-knob { left: 32px; top: 32px; }
      #tactil .tc-btns { display: grid; grid-template-columns: 52px 52px; gap: 8px; right: max(12px, env(safe-area-inset-right)); }
    }
  `;
  root.appendChild(style);
  root.appendChild(stick('left'));
  root.appendChild(stick('right'));
  const btns = document.createElement('div');
  btns.className = 'tc-btns';
  btns.appendChild(button('PET', 'petardo'));
  btns.appendChild(button('OBJ', 'activo'));
  btns.appendChild(button('GOL', 'golosina'));
  btns.appendChild(button('II', 'pausa'));
  root.appendChild(btns);
  document.body.appendChild(root);
}
