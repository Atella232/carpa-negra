// Fin de la función: epílogo según el final, resumen, récords y semilla.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { txt } from '../ui/text';
import { formatSeed } from '../core/rng';
import { addToAlbum, loadSave, writeSave } from '../core/save';
import { recordEvent } from '../core/meta';
import { clearRunSave } from '../core/runSave';
import { startRun } from './MenuScene';
import { playMusic, setCrowd } from '../audio/music';
import { romano } from '../data/acts';
import { Controls } from '../systems/Controls';
import { dailyKey, dailyScore } from '../core/daily';

interface EndData {
  victory: boolean;
  outcome: 'muerte' | 'libertad' | 'maestro';
  cause: string;
  mode: 'normal' | 'semilla' | 'diaria';
  character?: string;
  contracts: number;
  gira: number;
  seed: string;
  items: string[];
  kills: number;
  rooms: number;
  time: number;
  boss: boolean;
  contract: boolean;
  act: number;
  seen?: string[];
}

const EPITAFIOS = [
  'Nadie se rió.',
  'El público pidió que le devolvieran el dinero.',
  'Tu nariz rueda por la pista.',
  'El Maestro apunta tu nombre en su libro.',
  'Mañana habrá un payaso nuevo.',
  'Al menos el confeti era bonito.',
];

function epilogue(d: EndData): { title: string; lines: string[]; color: number } {
  if (d.outcome === 'libertad') {
    return d.contracts > 0
      ? { title: 'La salida', lines: ['Sales. Tu sombra se queda dentro,', 'aplaudiendo.'], color: 0xc9b3ef }
      : { title: 'La salida', lines: ['Fuera amanece.', 'Nadie te cree.'], color: 0xfff2a8 };
  }
  if (d.outcome === 'maestro') {
    return { title: 'El nuevo Maestro', lines: ['Damas y caballeros...', 'Mañana habrá un payaso nuevo.'], color: 0xd4323f };
  }
  return { title: 'Fin de la función', lines: [EPITAFIOS[Math.floor(Math.random() * EPITAFIOS.length)]], color: 0xd4323f };
}

export class EndScene extends Phaser.Scene {
  constructor() {
    super('Fin');
  }

  create(d: EndData): void {
    playMusic(d.victory ? 'menu' : null);
    setCrowd(0);
    clearRunSave();
    const prevBest = loadSave().records.bestTime;
    addToAlbum([...d.items, ...(d.seen ?? [])]);
    let newCarteles: string[] = [];
    const daily = d.mode === 'diaria' ? dailyKey(new Date()) : null;
    const score = dailyScore(d);
    writeSave((s) => {
      s.runs++;
      s.records.kills += d.kills;
      s.records.furthestAct = Math.max(s.records.furthestAct, d.act);
      if (d.cause && !d.victory) s.records.deathsBy[d.cause] = (s.records.deathsBy[d.cause] ?? 0) + 1;
      if (d.victory) {
        s.wins++;
        s.records.streak++;
        s.records.bestStreak = Math.max(s.records.bestStreak, s.records.streak);
        if (s.records.bestTime === null || d.time < s.records.bestTime) s.records.bestTime = d.time;
        if (d.outcome === 'maestro') s.gira = Math.max(s.gira, Math.min(5, d.gira + 1));
      } else s.records.streak = 0;
      if (daily) {
        const rec = (s.daily[daily] ??= { attempts: 0, best: 0, act: 0, time: 0 });
        rec.attempts++;
        if (score > rec.best) Object.assign(rec, { best: score, act: d.act, time: d.time });
      }
      if (d.mode !== 'semilla') newCarteles = recordEvent(s, { k: 'fin' }).map((c) => c.name);
    });

    const ep = epilogue(d);
    this.add.rectangle(0, 0, GAME_W, GAME_H, d.victory ? 0x1d1424 : 0x150a12).setOrigin(0);
    if (d.outcome === 'muerte') {
      txt(this, GAME_W / 2, 10, ep.title, ep.color, 'center').setScale(2);
      txt(this, GAME_W / 2, 30, ep.lines[0], 0x8a8394, 'center');
      if (d.cause) txt(this, GAME_W / 2, 40, `Te tumbó: ${d.cause}`, 0xc2bccb, 'center');
    } else {
      txt(this, GAME_W / 2, 8, ep.title, ep.color, 'center').setScale(2);
      ep.lines.forEach((l, i) => txt(this, GAME_W / 2, 28 + i * 10, l, 0xefe6d8, 'center'));
    }
    const mins = Math.floor(d.time / 60);
    const secs = String(d.time % 60).padStart(2, '0');
    const rows: [string, string][] = [
      ['Acto', romano(d.act)],
      ['Criaturas', String(d.kills)],
      ['Salas', String(d.rooms)],
      ['Tiempo', `${mins}:${secs}`],
    ];
    if (d.mode === 'diaria') rows.push(['Puntos', String(score)]);
    if (d.gira > 0) rows.push(['La Gira', String(d.gira)]);
    rows.forEach(([k, v], i) => {
      txt(this, 60, 54 + i * 9, k, 0xefe6d8);
      txt(this, 180, 54 + i * 9, v, 0xf2c14e, 'right');
    });
    let y = 54 + rows.length * 9 + 2;
    if (d.victory && (prevBest === null || d.time < prevBest)) {
      txt(this, GAME_W / 2, y, '¡Nuevo récord de tiempo!', 0x79b84a, 'center');
      y += 10;
    }
    if (newCarteles.length) {
      txt(this, GAME_W / 2, y, `Nuevo cartel: ${newCarteles[0]}`, 0xf2c14e, 'center');
      y += 10;
    }
    d.items.slice(0, 13).forEach((id, i) => this.add.image(GAME_W / 2 - 108 + i * 18, Math.max(y + 8, 116), `obj_${id}`));
    txt(this, GAME_W / 2, 136, 'Enter: otra función · M: menú', 0xefe6d8, 'center');
    txt(this, GAME_W / 2, 146, 'R: repetir semilla · C: copiar semilla', 0x8a8394, 'center');
    const seedTxt = txt(this, GAME_W / 2, 162, `Semilla ${formatSeed(d.seed)}`, 0x55505e, 'center');

    // Evita que una tecla mantenida del juego salte la pantalla.
    const c = Controls.get();
    let ready = false;
    this.time.delayedCall(700, () => (ready = true));
    const copy = () => {
      const share = `Carpa Negra · ${formatSeed(d.seed)} · Acto ${romano(d.act)} · ${mins}:${secs}${d.mode === 'diaria' ? ` · ${score} puntos` : ''}`;
      void navigator.clipboard?.writeText(share).then(() => seedTxt.setText('COPIADA').setTint(0x79b84a));
    };
    this.input.keyboard!.on('keydown', (ev: KeyboardEvent) => {
      if (!ready) return;
      const k = ev.key.toLowerCase();
      if (k === 'enter' || k === ' ') startRun(this);
      else if (k === 'r') startRun(this, d.seed, d.mode === 'diaria' ? 'diaria' : 'semilla');
      else if (k === 'm') this.scene.start('Menu');
      else if (k === 'c') copy();
    });
    this.events.on('update', () => {
      c.update();
      if (!ready) return;
      if (c.lastDevice === 'mando' && c.pressed('aceptar')) startRun(this);
      else if (c.lastDevice === 'mando' && (c.pressed('cancelar') || c.pressed('pausa'))) this.scene.start('Menu');
    });
    this.input.on('pointerdown', () => ready && startRun(this));
  }
}
