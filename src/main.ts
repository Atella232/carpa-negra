import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { EndScene } from './scenes/EndScene';
import { unlockAudio } from './audio/sfx';

/** Escalado entero: los píxeles siempre cuadrados y nítidos. */
function bestZoom(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H)));
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

window.addEventListener('resize', () => game.scale.setZoom(bestZoom()));
window.addEventListener('keydown', unlockAudio, { once: false });
window.addEventListener('pointerdown', unlockAudio);

(window as unknown as { __phaser: Phaser.Game }).__phaser = game;
