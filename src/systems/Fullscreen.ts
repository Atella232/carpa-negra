// Pantalla completa: un botón fijo en una esquina de la página (fuera del lienzo)
// y la función que usa también el menú de opciones.
//
// Se pone a pantalla completa la página entera, no solo el lienzo, para que los
// controles táctiles (que son HTML encima de la página) sigan viéndose.
import { t } from '../ui/i18n';

type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

const doc = document as FsDoc;

/** En iPhone Safari no existe (allí se usa «Añadir a pantalla de inicio»). */
export function fullscreenAvailable(): boolean {
  return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function toggleFullscreen(): void {
  if (isFullscreen()) {
    if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
    else doc.webkitExitFullscreen?.();
    return;
  }
  const el = document.documentElement as FsEl;
  if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  else el.webkitRequestFullscreen?.();
}

// Cuatro esquinas hacia fuera (entrar) o hacia dentro (salir).
const ICON_ENTER =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
const ICON_EXIT =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"/></svg>';

/** Crea el botón (si el navegador lo permite). */
export function setupFullscreenButton(): void {
  if (!fullscreenAvailable()) return;
  const style = document.createElement('style');
  style.textContent = `
    #pantalla-completa { position: fixed; z-index: 11; top: max(4px, env(safe-area-inset-top)); right: max(4px, env(safe-area-inset-right));
      width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer;
      border-radius: 8px; border: 2px solid rgba(239,230,216,0.3); background: rgba(11,7,16,0.55); color: #efe6d8;
      opacity: 0.55; transition: opacity 0.15s; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
    #pantalla-completa:hover, #pantalla-completa:focus-visible { opacity: 1; }
    /* Con controles táctiles, el botón va donde no estorba a palancas ni botones. */
    @media (orientation: landscape) {
      .con-tactil #pantalla-completa { right: auto; left: max(12px, env(safe-area-inset-left)); top: max(12px, env(safe-area-inset-top)); width: 44px; height: 44px; }
    }
    @media (orientation: portrait) {
      .con-tactil #pantalla-completa { top: auto; right: 50%; transform: translateX(50%); width: 44px; height: 44px;
        bottom: calc(max(24px, env(safe-area-inset-bottom)) + 38px); }
    }
  `;
  document.head.appendChild(style);

  const b = document.createElement('button');
  b.id = 'pantalla-completa';
  // Sin foco: si no, Espacio (objeto activo) o Intro volverían a pulsarlo.
  b.tabIndex = -1;
  const refresh = () => {
    const on = isFullscreen();
    b.innerHTML = on ? ICON_EXIT : ICON_ENTER;
    b.title = t(on ? 'Salir de pantalla completa' : 'Pantalla completa');
    b.setAttribute('aria-label', b.title);
  };
  b.addEventListener('pointerdown', (e) => e.preventDefault());
  b.addEventListener('click', (e) => {
    e.preventDefault();
    b.blur();
    toggleFullscreen();
  });
  document.addEventListener('fullscreenchange', refresh);
  document.addEventListener('webkitfullscreenchange', refresh);
  refresh();
  document.body.appendChild(b);
}
