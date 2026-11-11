import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { txt } from '../ui/text';
import { formatSeed } from '../core/rng';
import { addToAlbum, writeSave } from '../core/save';
import { startRun } from './MenuScene';
import { playMusic } from '../audio/music';

interface EndData {
  victory: boolean;
  seed: string;
  items: string[];
  kills: number;
  rooms: number;
  time: number;
  boss: boolean;
  contract: boolean;
}

const EPITAFIOS = [
  'Nadie se rió.',
  'El público pidió que le devolvieran el dinero.',
  'Tu nariz rueda por la pista.',
  'El Maestro apunta tu nombre en su libro.',
  'Mañana habrá un payaso nuevo.',
  'Al menos el confeti era bonito.',
];

export class EndScene extends Phaser.Scene {
  constructor() {
    super('Fin');
  }

  create(d: EndData): void {
    playMusic(d.victory ? 'menu' : null);
    addToAlbum(d.items);
    writeSave((s) => {
      s.runs++;
      if (d.victory) s.wins++;
    });
    this.add.rectangle(0, 0, GAME_W, GAME_H, d.victory ? 0x1d1424 : 0x150a12).setOrigin(0);
    if (d.victory) {
      txt(this, GAME_W / 2, 14, '¡Acto I superado!', 0xf2c14e, 'center').setScale(2);
      txt(this, GAME_W / 2, 36, 'Bajas por la trampilla...', 0xefe6d8, 'center');
      txt(this, GAME_W / 2, 46, 'pero el circo sigue debajo.', 0x8a8394, 'center');
    } else {
      txt(this, GAME_W / 2, 14, 'Fin de la función', 0xd4323f, 'center').setScale(2);
      const ep = EPITAFIOS[Math.floor(Math.random() * EPITAFIOS.length)];
      txt(this, GAME_W / 2, 38, ep, 0x8a8394, 'center');
    }
    const mins = Math.floor(d.time / 60);
    const secs = String(d.time % 60).padStart(2, '0');
    const rows = [
      ['Criaturas', String(d.kills)],
      ['Salas', String(d.rooms)],
      ['Tiempo', `${mins}:${secs}`],
      ['Jefe', d.boss ? 'Derrotado' : 'Vivo'],
    ];
    rows.forEach(([k, v], i) => {
      txt(this, 60, 62 + i * 10, k, 0xefe6d8);
      txt(this, 180, 62 + i * 10, v, 0xf2c14e, 'right');
    });
    d.items.slice(0, 12).forEach((id, i) => this.add.image(GAME_W / 2 - 99 + i * 18, 112, `obj_${id}`));
    txt(this, GAME_W / 2, 136, 'Enter: otra función · M: menú', 0xefe6d8, 'center');
    txt(this, GAME_W / 2, 150, 'R: repetir semilla', 0x8a8394, 'center');
    txt(this, GAME_W / 2, 164, `Semilla ${formatSeed(d.seed)}`, 0x55505e, 'center');

    // Evita que una tecla mantenida del juego salte la pantalla.
    this.time.delayedCall(600, () => {
      this.input.keyboard!.on('keydown', (ev: KeyboardEvent) => {
        const k = ev.key.toLowerCase();
        if (k === 'enter' || k === ' ') startRun(this);
        else if (k === 'r') startRun(this, d.seed);
        else if (k === 'm') this.scene.start('Menu');
      });
    });
  }
}
