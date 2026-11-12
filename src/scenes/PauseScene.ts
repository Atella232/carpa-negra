// Pausa: estadísticas, objetos (con descripción), trajes, semilla y opciones.
import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { GAME_H, GAME_W } from '../config';
import { txt, setTxt } from '../ui/text';
import { statRows } from '../ui/statInfo';
import { item } from '../data/items';
import { formatSeed } from '../core/rng';
import { setMusicDucked } from '../audio/music';
import { startRun } from './MenuScene';
import { Menu } from '../ui/Menu';
import { openOptions } from '../ui/options';
import { romano } from '../data/acts';
import { setProgress } from '../data/sets';
import { clearRunSave } from '../core/runSave';
import { t } from '../ui/i18n';

export class PauseScene extends Phaser.Scene {
  private menu: Menu | null = null;

  constructor() {
    super('Pausa');
  }

  create(): void {
    const gs = this.scene.get('Juego') as GameScene;
    const run = gs.run;
    const st = gs.stats;
    setMusicDucked(true);
    this.events.once('shutdown', () => setMusicDucked(false));
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0710, 0.95).setOrigin(0);
    txt(this, GAME_W / 2, 4, 'Pausa', 0xd4323f, 'center').setScale(2);
    const mins = Math.floor(run.playTime / 60),
      secs = String(Math.floor(run.playTime % 60)).padStart(2, '0');
    txt(this, GAME_W / 2, 21, `Acto ${romano(run.act)}: ${t(run.actName)} · ${mins}:${secs}`, 0x8a8394, 'center');

    statRows(st).forEach((r, i) => {
      txt(this, 8, 32 + i * 9, r.label, 0xefe6d8);
      txt(this, 92, 32 + i * 9, r.text, 0xf2c14e, 'right');
    });
    // Trajes en marcha.
    setProgress(run.player.passives).slice(0, 2).forEach((p, i) => {
      txt(this, 8, 90 + i * 9, `${p.set.name} ${Math.min(p.have, p.set.need)}/${p.set.need}`, p.have >= p.set.need ? 0x79b84a : 0x8a8394);
    });

    const owned = [...run.player.passives, ...(run.player.active ? [run.player.active] : [])];
    txt(this, 108, 32, owned.length ? 'Objetos' : 'Sin objetos aún', 0x8a8394);
    const name = txt(this, 108, 100, '', 0xc9b3ef);
    const desc = txt(this, 108, 109, '', 0x8a8394);
    const showItem = (id: string) => {
      setTxt(name, item(id).name);
      setTxt(desc, item(id).desc);
    };
    owned.slice(0, 21).forEach((id, i) => {
      const img = this.add.image(116 + (i % 7) * 17, 48 + Math.floor(i / 7) * 17, `obj_${id}`);
      img.setInteractive();
      img.on('pointerover', () => showItem(id));
    });
    if (owned.length) showItem(owned[owned.length - 1]);
    txt(this, GAME_W / 2, GAME_H - 10, `Semilla ${formatSeed(run.seed)}${run.mode === 'diaria' ? ' · Función del día' : ''}`, 0x55505e, 'center');
    this.buildMenu(gs);
  }

  private buildMenu(gs: GameScene): void {
    const run = gs.run;
    let confirm: string | null = null;
    const ask = (id: string, action: () => void) => () => {
      if (confirm === id) return action();
      confirm = id;
      this.menu?.refresh();
    };
    const label = (id: string, text: string) => () => (confirm === id ? t('¿Seguro? Pulsa otra vez') : t(text));
    const resume = () => {
      gs.controls.releaseAll();
      this.scene.stop();
      this.scene.resume('Juego');
    };
    this.menu = new Menu(
      this,
      [
        { label: () => t('Seguir'), onSelect: resume },
        {
          label: () => t('Opciones'),
          onSelect: () => {
            this.menu?.destroy();
            openOptions(this, () => this.buildMenu(gs), 50);
          },
        },
        {
          label: label('misma', 'Reiniciar (misma semilla)'),
          onSelect: ask('misma', () => {
            this.scene.stop();
            gs.abandonRun();
            startRun(gs, run.seed, run.mode === 'diaria' ? 'diaria' : 'semilla');
          }),
        },
        {
          label: label('nueva', 'Reiniciar (semilla nueva)'),
          onSelect: ask('nueva', () => {
            this.scene.stop();
            gs.abandonRun();
            clearRunSave();
            startRun(gs);
          }),
        },
        {
          label: label('menu', 'Salir al menú'),
          hint: () => t('La partida se guarda: podrás continuarla'),
          onSelect: ask('menu', () => {
            // Se guarda en la sala actual para poder continuar.
            gs.snapshotRun();
            this.scene.stop();
            gs.scene.start('Menu');
          }),
        },
      ],
      { x: GAME_W / 2, y: 128, step: 9, onBack: resume },
    );
  }
}
