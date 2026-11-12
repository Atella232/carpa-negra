import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { EndScene } from './scenes/EndScene';
import { unlockAudio } from './audio/sfx';
import { applyTouchSetting, touchReserve } from './systems/Touch';
import { setupFullscreenButton } from './systems/Fullscreen';

/**
 * Escalado entero en píxeles reales del dispositivo: siempre nítido y lo más
 * grande posible (en un móvil, de 240 a 320 px de ancho o más).
 */
function bestZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  // Hueco del contenedor (ya sin las zonas seguras), menos lo que ocupan los
  // controles táctiles para que no tapen la sala.
  const box = document.getElementById('juego');
  const reserve = touchReserve();
  const w = (box?.clientWidth || window.innerWidth) - 2 * reserve.side;
  const h = (box?.clientHeight || window.innerHeight) - reserve.bottom - 8;
  const k = Math.max(1, Math.floor(Math.min((w * dpr) / GAME_W, (h * dpr) / GAME_H)));
  return k / dpr;
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0710',
  physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
  scale: { mode: Phaser.Scale.NONE, zoom: bestZoom() },
  scene: [BootScene, MenuScene, GameScene, HudScene, PauseScene, EndScene],
  disableContextMenu: true,
});

const rescale = () => game.isBooted && game.scale.setZoom(bestZoom());
window.addEventListener('resize', rescale);
game.events.once('ready', rescale);
window.addEventListener('keydown', unlockAudio, { once: false });
window.addEventListener('pointerdown', unlockAudio);
// iOS Safari solo deja arrancar el audio en ciertos gestos (touchend, click).
window.addEventListener('touchend', unlockAudio);
window.addEventListener('click', unlockAudio);

// Si la ventana pierde el foco, la partida se pausa sola.
// (Salvo en las pruebas automáticas con ?jugar, donde el panel puede estar oculto.)
const testing = new URLSearchParams(window.location.search).has('jugar');
const autoPause = () => {
  if (testing) return;
  const gs = game.scene.getScene('Juego') as GameScene | null;
  if (gs && game.scene.isActive('Juego')) gs.openPause();
};
window.addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => document.hidden && autoPause());

(window as unknown as { __phaser: Phaser.Game }).__phaser = game;
applyTouchSetting();
setupFullscreenButton();

// ?fps: contador de fotogramas en una esquina (para medir en móviles reales).
if (new URLSearchParams(window.location.search).has('fps')) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:4px;top:4px;z-index:20;font:bold 14px monospace;color:#7fd1b9;background:rgba(0,0,0,.6);padding:2px 6px;pointer-events:none';
  document.body.appendChild(box);
  let frames = 0,
    worst = 0,
    last = performance.now(),
    t0 = last;
  const tick = (now: number) => {
    frames++;
    worst = Math.max(worst, now - last);
    last = now;
    if (now - t0 >= 1000) {
      box.textContent = `${Math.round((frames * 1000) / (now - t0))} fps · peor ${worst.toFixed(1)} ms`;
      frames = 0;
      worst = 0;
      t0 = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
