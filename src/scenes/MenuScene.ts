import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { txt, setTxt } from '../ui/text';
import { createRun } from '../core/run';
import { formatSeed, normalizeSeed, randomSeedString } from '../core/rng';
import { unlockAudio, sfx } from '../audio/sfx';
import { playMusic } from '../audio/music';
import { loadSave } from '../core/save';
import { ITEMS, item } from '../data/items';

export function startRun(scene: Phaser.Scene, seed?: string): void {
  const s = normalizeSeed(seed ?? '') || randomSeedString();
  const run = createRun(s, Date.now());
  scene.registry.set('run', run);
  scene.scene.start('Juego');
}

export class MenuScene extends Phaser.Scene {
  private seedInput: string | null = null;
  private seedLabel!: Phaser.GameObjects.BitmapText;
  private album: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.seedInput = null;
    this.album = null;
    const g = this.add.graphics();
    // Lona del circo.
    for (let i = 0; i < 16; i++) {
      g.fillStyle(i % 2 ? 0x2a1430 : 0x5e1420, 1);
      g.fillTriangle(GAME_W / 2, -40, i * 16 - 8, GAME_H, i * 16 + 8, GAME_H);
    }
    g.fillStyle(0x0b0710, 0.55).fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0x3e2418, 1).fillEllipse(GAME_W / 2, GAME_H - 8, 260, 46);
    g.fillStyle(0x8f1d2c, 1).fillEllipse(GAME_W / 2, GAME_H - 8, 200, 30);
    g.fillStyle(0x3e2418, 1).fillEllipse(GAME_W / 2, GAME_H - 8, 194, 26);

    // Público en sombras: ojos que parpadean.
    for (let i = 0; i < 14; i++) {
      const x = 12 + i * 17 + (i % 2) * 4;
      const y = 100 + (i % 3) * 6;
      const eyes = this.add.graphics();
      eyes.fillStyle(0xf2c14e, 1).fillRect(x, y, 1, 1).fillRect(x + 3, y, 1, 1);
      this.tweens.add({ targets: eyes, alpha: 0, duration: 120, yoyo: true, repeat: -1, repeatDelay: 1500 + i * 370 });
    }

    const title = txt(this, GAME_W / 2, 18, 'Carpa Negra', 0xd4323f, 'center').setScale(3);
    txt(this, GAME_W / 2 + 1, 19, 'Carpa Negra', 0x0b0710, 'center').setScale(3).setDepth(-1);
    this.tweens.add({ targets: title, y: 17, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, GAME_W / 2, 46, 'El circo de los horrores', 0xefe6d8, 'center');

    const head = this.add.sprite(GAME_W / 2, 92, 'pompon_cabeza', 0).setScale(3);
    this.add.sprite(GAME_W / 2, 120, 'pompon_cuerpo', 0).setScale(3);
    head.setDepth(1);
    this.time.addEvent({ delay: 2200, loop: true, callback: () => {
      head.setFrame(1);
      this.time.delayedCall(140, () => head.setFrame(0));
    } });

    txt(this, GAME_W / 2, 140, 'Enter: entrar en la carpa', 0xf2c14e, 'center');
    this.seedLabel = txt(this, GAME_W / 2, 152, 'S: semilla · A: álbum', 0x8a8394, 'center');
    const save = loadSave();
    txt(this, GAME_W / 2, 164, `Funciones: ${save.runs} · Salidas: ${save.wins}`, 0x55505e, 'center');

    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed');

    const kb = this.input.keyboard!;
    kb.on('keydown', (ev: KeyboardEvent) => {
      unlockAudio();
      playMusic('menu');
      if (this.album) {
        if (ev.key === 'Escape' || ev.key.toLowerCase() === 'a' || ev.key === 'Enter') this.closeAlbum();
        return;
      }
      if (this.seedInput !== null) {
        if (ev.key === 'Enter') {
          sfx('objeto');
          startRun(this, this.seedInput);
        } else if (ev.key === 'Escape') {
          this.seedInput = null;
          setTxt(this.seedLabel, 'S: semilla · A: álbum');
        } else if (ev.key === 'Backspace') {
          this.seedInput = this.seedInput.slice(0, -1);
        } else if (/^[a-z0-9]$/i.test(ev.key) && this.seedInput.length < 8) {
          this.seedInput += ev.key.toUpperCase();
        }
        if (this.seedInput !== null) setTxt(this.seedLabel, `Semilla: ${formatSeed(this.seedInput)}_`);
        return;
      }
      if (ev.key === 'Enter' || ev.key === ' ') {
        sfx('objeto');
        startRun(this, urlSeed ?? undefined);
      } else if (ev.key.toLowerCase() === 's') {
        this.seedInput = '';
        setTxt(this.seedLabel, 'Semilla: _');
      } else if (ev.key.toLowerCase() === 'a') {
        this.openAlbum();
      }
    });
    this.input.on('pointerdown', () => {
      unlockAudio();
      playMusic('menu');
    });
  }

  private openAlbum(): void {
    const seen = new Set(loadSave().album);
    const parts: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0710, 0.94).setOrigin(0);
    parts.push(bg);
    parts.push(txt(this, GAME_W / 2, 6, `Álbum ${[...seen].filter((id) => ITEMS.some((i) => i.id === id)).length}/${ITEMS.length}`, 0xf2c14e, 'center'));
    ITEMS.forEach((it, i) => {
      const x = 20 + (i % 11) * 20;
      const y = 30 + Math.floor(i / 11) * 22;
      const img = this.add.image(x, y, `obj_${it.id}`);
      if (!seen.has(it.id)) img.setTintFill(0x2e1f38);
      parts.push(img);
    });
    const known = ITEMS.filter((i) => seen.has(i.id)).slice(-3).map((i) => item(i.id).name);
    parts.push(txt(this, GAME_W / 2, 104, known.length ? `Último: ${known[known.length - 1]}` : 'Aún no has visto nada', 0x8a8394, 'center'));
    parts.push(txt(this, GAME_W / 2, 164, 'Esc: volver', 0x8a8394, 'center'));
    this.album = this.add.container(0, 0, parts).setDepth(100);
  }

  private closeAlbum(): void {
    this.album?.destroy();
    this.album = null;
  }
}
