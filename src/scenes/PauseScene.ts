import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { GAME_H, GAME_W } from '../config';
import { txt, setTxt } from '../ui/text';
import { item } from '../data/items';
import { formatSeed } from '../core/rng';
import { getVolumes, setVolumes } from '../audio/sfx';
import { writeSave } from '../core/save';
import { startRun } from './MenuScene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pausa');
  }

  create(): void {
    const gs = this.scene.get('Juego') as GameScene;
    const run = gs.run;
    const st = gs.stats;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0710, 0.95).setOrigin(0);
    txt(this, GAME_W / 2, 6, 'Pausa', 0xd4323f, 'center').setScale(2);
    txt(this, GAME_W / 2, 24, `Acto ${run.act}: ${run.actName}`, 0x8a8394, 'center');

    const lines = [
      ['Daño', st.damage.toFixed(2)],
      ['Cadencia', st.shotsPerSecond.toFixed(2)],
      ['Alcance', (st.range / 16).toFixed(1)],
      ['Vel. tiro', (st.shotSpeed / 100).toFixed(2)],
      ['Velocidad', (st.speed / 80).toFixed(2)],
      ['Suerte', st.luck.toFixed(1)],
    ];
    lines.forEach(([k, v], i) => {
      txt(this, 12, 40 + i * 10, k, 0xefe6d8);
      txt(this, 112, 40 + i * 10, v, 0xf2c14e, 'right');
    });

    const owned = [...run.player.passives, ...(run.player.active ? [run.player.active] : [])];
    txt(this, 124, 40, owned.length ? 'Objetos' : 'Sin objetos aún', 0x8a8394);
    owned.forEach((id, i) => {
      const img = this.add.image(132 + (i % 6) * 18, 58 + Math.floor(i / 6) * 18, `obj_${id}`);
      img.setInteractive();
      img.on('pointerover', () => setTxt(hint, item(id).name));
    });
    const hint = txt(this, 124, 112, '', 0xc9b3ef);
    if (owned.length) setTxt(hint, item(owned[owned.length - 1]).name);

    const vol = txt(this, GAME_W / 2, 126, '', 0x8a8394, 'center');
    const showVol = () => {
      const v = getVolumes();
      setTxt(vol, `Volumen ${Math.round(v.sfx * 10)}  Música ${Math.round(v.music * 10)}${v.muted ? '  (mudo)' : ''}`);
    };
    showVol();
    txt(this, GAME_W / 2, 140, 'Esc volver · R reiniciar · M menú', 0xefe6d8, 'center');
    txt(this, GAME_W / 2, 150, '+/- volumen · N música · X mudo', 0x55505e, 'center');
    txt(this, GAME_W / 2, 164, `Semilla ${formatSeed(run.seed)}`, 0x55505e, 'center');

    const resume = () => {
      gs.controls.releaseAll();
      this.scene.stop();
      this.scene.resume('Juego');
    };
    const persist = () => writeSave((s) => (s.settings = getVolumes()));
    this.input.keyboard!.on('keydown', (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      const v = getVolumes();
      if (k === 'escape' || k === 'p') resume();
      else if (k === 'r') {
        this.scene.stop();
        startRun(gs, undefined);
      } else if (k === 'm') {
        this.scene.stop();
        gs.scene.start('Menu');
      } else if (k === '+' || k === '=') setVolumes({ sfx: Math.min(1, v.sfx + 0.1) });
      else if (k === '-') setVolumes({ sfx: Math.max(0, v.sfx - 0.1) });
      else if (k === 'n') setVolumes({ music: v.music > 0 ? 0 : 0.35 });
      else if (k === 'x') setVolumes({ muted: !v.muted });
      showVol();
      persist();
    });
  }
}
