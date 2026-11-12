// Menú principal: continuar, nueva función, función del día, personaje, La Gira,
// semilla, carteles, álbum, opciones y créditos. Navegable con teclado, mando,
// ratón o dedo.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { txt, setTxt, wrap } from '../ui/text';
import { newRun, RunState } from '../core/run';
import { formatSeed, normalizeSeed, randomSeedString } from '../core/rng';
import { unlockAudio, sfx } from '../audio/sfx';
import { playMusic, setCrowd } from '../audio/music';
import { loadSave, writeSave } from '../core/save';
import { ITEMS, item } from '../data/items';
import { CHARACTERS, characterDef } from '../data/characters';
import { CARTELES, lockedItems, ITEM_UNLOCKS } from '../core/meta';
import { loadRunSave, clearRunSave } from '../core/runSave';
import { dailyKey, dailySeed } from '../core/daily';
import { Menu } from '../ui/Menu';
import { openOptions } from '../ui/options';
import { Controls } from '../systems/Controls';
import { t } from '../ui/i18n';

export type RunMode = RunState['mode'];

/** Empieza una partida nueva (o continúa una guardada si se pasa `resume`). */
export function startRun(scene: Phaser.Scene, seed?: string, mode?: RunMode, resume?: RunState): void {
  // Fuera los fondos de salas de partidas anteriores.
  for (const k of scene.textures.getTextureKeys()) if (k.startsWith('fondo_')) scene.textures.remove(k);
  if (resume) {
    scene.registry.set('run', resume);
    scene.scene.start('Juego');
    return;
  }
  clearRunSave();
  const save = loadSave();
  const m: RunMode = mode ?? (seed ? 'semilla' : 'normal');
  const s = normalizeSeed(seed ?? '') || randomSeedString();
  // Un personaje bloqueado nunca sale: si el elegido no está desbloqueado, Pompón.
  const chosen = CHARACTERS[save.counters.character ?? 0];
  const usable = chosen && (!chosen.unlock || save.carteles.includes(chosen.unlock));
  const character = m === 'diaria' || !usable ? 'pompon' : chosen.id;
  const run = newRun(s, {
    now: Date.now(),
    character,
    mode: m,
    gira: m === 'normal' ? save.counters.giraElegida ?? 0 : 0,
    // Las semillas escritas y la del día usan el catálogo completo (la semilla significa lo mismo para todos).
    locked: m === 'normal' ? [...lockedItems(save.carteles)] : [],
  });
  scene.registry.set('run', run);
  scene.scene.start('Juego');
}

export class MenuScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private sub: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    this.menu = null;
    this.sub = [];
    playMusic('menu');
    setCrowd(0);
    this.drawBackdrop();
    const save = loadSave();
    // Primera vez: la introducción.
    if (!save.counters.intro && !new URLSearchParams(window.location.search).has('jugar')) {
      writeSave((s) => (s.counters.intro = 1));
      this.showIntro(() => this.buildMenu());
    } else this.buildMenu();
    this.input.on('pointerdown', () => unlockAudio());
    this.input.keyboard!.on('keydown', () => unlockAudio());
  }

  private drawBackdrop(): void {
    const g = this.add.graphics();
    // Lona del circo.
    for (let i = 0; i < 16; i++) {
      g.fillStyle(i % 2 ? 0x2a1430 : 0x5e1420, 1);
      g.fillTriangle(GAME_W / 2, -40, i * 16 - 8, GAME_H, i * 16 + 8, GAME_H);
    }
    g.fillStyle(0x0b0710, 0.62).fillRect(0, 0, GAME_W, GAME_H);
    // Público en sombras: ojos que parpadean.
    for (let i = 0; i < 14; i++) {
      const x = 12 + i * 17 + (i % 2) * 4;
      const y = 150 + (i % 3) * 6;
      const eyes = this.add.graphics();
      eyes.fillStyle(0xf2c14e, 1).fillRect(x, y, 1, 1).fillRect(x + 3, y, 1, 1);
      this.tweens.add({ targets: eyes, alpha: 0, duration: 120, yoyo: true, repeat: -1, repeatDelay: 1500 + i * 370 });
    }
    const title = txt(this, GAME_W / 2, 8, 'Carpa Negra', 0xd4323f, 'center').setScale(3);
    txt(this, GAME_W / 2 + 1, 9, 'Carpa Negra', 0x0b0710, 'center').setScale(3).setDepth(-1);
    this.tweens.add({ targets: title, y: 7, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, GAME_W / 2, 34, 'El circo de los horrores', 0xefe6d8, 'center');
    // Pompón (con chistera si ya conseguiste el final del Maestro).
    const save = loadSave();
    const ch = characterDef(CHARACTERS[save.counters.character ?? 0]?.id);
    const head = this.add.sprite(32, 118, 'pompon_cabeza', 0).setScale(2);
    const body = this.add.sprite(32, 136, 'pompon_cuerpo', 0).setScale(2);
    if (ch.tint) body.setTint(ch.tint);
    if (save.endings.includes('maestro')) this.add.image(32, 100, 'disfraz_mago').setScale(2);
    this.time.addEvent({
      delay: 2200, loop: true, callback: () => {
        head.setFrame(1);
        this.time.delayedCall(140, () => head.setFrame(0));
      },
    });
    txt(this, GAME_W - 4, GAME_H - 9, `${save.runs} · ${save.wins}`, 0x55505e, 'right');
  }

  private buildMenu(): void {
    const save = loadSave();
    const charIdx = () => loadSave().counters.character ?? 0;
    const unlocked = (i: number) => !CHARACTERS[i].unlock || loadSave().carteles.includes(CHARACTERS[i].unlock!);
    const today = dailyKey(new Date());
    const resume = loadRunSave();
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed') ?? undefined;
    this.menu = new Menu(
      this,
      [
        {
          label: () => t('Continuar'),
          enabled: () => !!resume,
          onSelect: () => resume && startRun(this, undefined, undefined, resume),
          hint: () => (resume ? `${t('Acto')} ${resume.act} · ${formatSeed(resume.seed)}` : ''),
        },
        { label: () => t('Nueva función'), onSelect: () => startRun(this, urlSeed, urlSeed ? 'semilla' : 'normal') },
        {
          label: () => t('Función del día'),
          onSelect: () => startRun(this, dailySeed(today), 'diaria'),
          hint: () => {
            const r = loadSave().daily[today];
            return r ? `${t('Hoy')}: ${r.best} ${t('puntos')} · ${r.attempts} ${t('intentos')}` : `${today} · ${t('la misma para todos')}`;
          },
        },
        {
          label: () => {
            const i = charIdx();
            return `${t('Personaje')}: ${unlocked(i) ? CHARACTERS[i].name : '???'}`;
          },
          onAdjust: (d) => {
            const n = CHARACTERS.length;
            writeSave((s) => (s.counters.character = ((s.counters.character ?? 0) + d + n) % n));
          },
          onSelect: () => writeSave((s) => (s.counters.character = ((s.counters.character ?? 0) + 1) % CHARACTERS.length)),
          enabled: () => true,
          hint: () => {
            const c = CHARACTERS[charIdx()];
            if (!unlocked(charIdx())) return `${t('Bloqueado')}: ${CARTELES.find((k) => k.id === c.unlock)?.desc ?? ''}`;
            return c.desc;
          },
        },
        {
          label: () => `${t('La Gira')}: ${loadSave().counters.giraElegida ?? 0}`,
          enabled: () => loadSave().gira > 0,
          onAdjust: (d) =>
            writeSave((s) => (s.counters.giraElegida = Phaser.Math.Clamp((s.counters.giraElegida ?? 0) + d, 0, s.gira))),
          hint: () => GIRA_DESC[loadSave().counters.giraElegida ?? 0],
        },
        { label: () => t('Semilla'), onSelect: () => this.openSeed() },
        { label: () => `${t('Carteles')} ${loadSave().carteles.length}/${CARTELES.length}`, onSelect: () => this.openCarteles() },
        { label: () => t('Álbum'), onSelect: () => this.openAlbum() },
        { label: () => t('Opciones'), onSelect: () => this.openSub((done) => openOptions(this, done)) },
        { label: () => t('Créditos'), onSelect: () => this.openCredits() },
      ],
      { x: GAME_W / 2 + 18, y: 50, step: 10 },
    );
    // Si el personaje elegido está bloqueado, no se puede empezar con él.
    const guard = () => {
      if (!unlocked(charIdx())) writeSave((s) => (s.counters.character = 0));
    };
    this.events.once('shutdown', guard);
    void save;
  }

  /** Abre una pantalla secundaria escondiendo el menú; al cerrar, lo reconstruye. */
  private openSub(open: (done: () => void) => void): void {
    this.menu?.destroy();
    this.menu = null;
    open(() => this.buildMenu());
  }

  private closeSub(): void {
    for (const o of this.sub) o.destroy();
    this.sub = [];
    this.buildMenu();
  }

  private overlay(title: string): void {
    this.menu?.destroy();
    this.menu = null;
    this.sub.push(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0710, 0.95).setOrigin(0).setDepth(100).setInteractive());
    this.sub.push(txt(this, GAME_W / 2, 6, title, 0xf2c14e, 'center').setDepth(101));
  }

  /** Espera a "volver" (Esc, botón B o clic) y cierra. */
  private waitBack(extra?: (c: Controls) => void): void {
    const c = Controls.get();
    let ready = false;
    this.time.delayedCall(150, () => (ready = true));
    const tick = () => {
      if (!this.sub.length) return this.events.off('update', tick);
      c.update();
      extra?.(c);
      if (ready && (c.pressed('cancelar') || c.pressed('pausa') || c.pressed('aceptar'))) {
        this.events.off('update', tick);
        this.closeSub();
      }
    };
    this.events.on('update', tick);
  }

  private openSeed(): void {
    this.overlay(t('Semilla'));
    let seed = '';
    const label = txt(this, GAME_W / 2, 70, '_', 0xefe6d8, 'center').setScale(2).setDepth(101);
    this.sub.push(label, txt(this, GAME_W / 2, 100, 'Escribe 8 letras o números · Enter: jugar · Esc: volver', 0x8a8394, 'center').setDepth(101));
    const ALPHA = 'ABCDEFGHJKLMNPQRSTWXYZ23456789';
    let pick = 0;
    const show = () => setTxt(label, `${formatSeed(seed)}${seed.length < 8 ? ALPHA[pick].toLowerCase() : ''}`);
    show();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && seed.length) return startRun(this, seed, 'semilla');
      if (ev.key === 'Escape') {
        this.input.keyboard!.off('keydown', onKey);
        return this.closeSub();
      }
      if (ev.key === 'Backspace') seed = seed.slice(0, -1);
      else if (/^[a-z0-9]$/i.test(ev.key) && seed.length < 8) seed = normalizeSeed(seed + ev.key);
      show();
    };
    this.input.keyboard!.on('keydown', onKey);
    // Con mando: arriba/abajo cambian la letra, A la añade, B borra, Start juega.
    const c = Controls.get();
    const tick = () => {
      if (!this.sub.length) return this.events.off('update', tick);
      c.update();
      if (c.lastDevice !== 'mando') return;
      const mv = c.move();
      if (c.pressed('arriba') || (mv.y < -0.7 && Math.random() < 0.15)) pick = (pick + 1) % ALPHA.length;
      if (c.pressed('abajo') || (mv.y > 0.7 && Math.random() < 0.15)) pick = (pick - 1 + ALPHA.length) % ALPHA.length;
      if (c.pressed('aceptar') && seed.length < 8) seed += ALPHA[pick];
      if (c.pressed('cancelar')) {
        if (seed.length) seed = seed.slice(0, -1);
        else {
          this.input.keyboard!.off('keydown', onKey);
          this.events.off('update', tick);
          return this.closeSub();
        }
      }
      if (c.pressed('pausa') && seed.length) return startRun(this, seed, 'semilla');
      show();
    };
    this.events.on('update', tick);
  }

  private openCarteles(): void {
    const s = loadSave();
    this.overlay(`${t('Carteles')} ${s.carteles.length}/${CARTELES.length}`);
    const info = txt(this, GAME_W / 2, 150, '', 0xefe6d8, 'center').setDepth(101);
    this.sub.push(info);
    let sel = 0;
    const cells: Phaser.GameObjects.Rectangle[] = [];
    CARTELES.forEach((c, i) => {
      const x = 22 + (i % 8) * 28,
        y = 26 + Math.floor(i / 8) * 34;
      const got = s.carteles.includes(c.id);
      const r = this.add.rectangle(x, y, 22, 28, got ? 0x8f1d2c : 0x1d1424).setStrokeStyle(1, got ? 0xf2c14e : 0x2e1f38).setDepth(101);
      cells.push(r);
      this.sub.push(r, txt(this, x, y - 4, got ? '*' : '?', got ? 0xf2c14e : 0x55505e, 'center').setDepth(102));
      r.setInteractive().on('pointerover', () => ((sel = i), show()));
    });
    const show = () => {
      const c = CARTELES[sel];
      const got = s.carteles.includes(c.id);
      cells.forEach((r, i) => r.setStrokeStyle(1, i === sel ? 0xffffff : s.carteles.includes(CARTELES[i].id) ? 0xf2c14e : 0x2e1f38));
      setTxt(info, `${got ? c.name : '???'}\n${c.desc}${c.reward ? `\n${t('Premio')}: ${got ? c.reward : '???'}` : ''}`);
    };
    show();
    this.waitBack((c) => {
      const mv = c.move();
      let d = 0;
      if (c.pressed('derecha') || c.pressed('dispararDerecha')) d = 1;
      if (c.pressed('izquierda') || c.pressed('dispararIzquierda')) d = -1;
      if (c.pressed('abajo') || c.pressed('dispararAbajo')) d = 8;
      if (c.pressed('arriba') || c.pressed('dispararArriba')) d = -8;
      void mv;
      if (d) {
        sel = Phaser.Math.Clamp(sel + d, 0, CARTELES.length - 1);
        show();
      }
    });
  }

  private openAlbum(): void {
    const seen = new Set(loadSave().album);
    const total = ITEMS.length;
    this.overlay(`${t('Álbum')} ${ITEMS.filter((i) => seen.has(i.id)).length}/${total}`);
    let sel = 0;
    const cols = 11;
    const imgs: Phaser.GameObjects.Image[] = [];
    ITEMS.forEach((it, i) => {
      const x = 20 + (i % cols) * 20;
      const y = 24 + Math.floor(i / cols) * 18;
      const img = this.add.image(x, y, `obj_${it.id}`).setDepth(101);
      if (!seen.has(it.id)) img.setTintFill(0x2e1f38);
      img.setInteractive().on('pointerover', () => ((sel = i), show()));
      imgs.push(img);
      this.sub.push(img);
    });
    const frame = this.add.rectangle(0, 0, 18, 18).setStrokeStyle(1, 0xf2c14e).setDepth(102);
    const name = txt(this, GAME_W / 2, 136, '', 0xf2c14e, 'center').setDepth(101);
    const desc = txt(this, GAME_W / 2, 146, '', 0xefe6d8, 'center').setDepth(101);
    const lore = txt(this, GAME_W / 2, 156, '', 0x8a8394, 'center').setDepth(101);
    this.sub.push(frame, name, desc, lore);
    const show = () => {
      const it = ITEMS[sel];
      frame.setPosition(imgs[sel].x, imgs[sel].y);
      const known = seen.has(it.id);
      const lockedBy = ITEM_UNLOCKS[it.id];
      setTxt(name, known ? it.name : '???');
      setTxt(desc, known ? item(it.id).desc : lockedBy && !loadSave().carteles.includes(lockedBy) ? t('Bloqueado por un cartel') : '');
      setTxt(lore, known && it.lore ? wrap(it.lore, 228) : '');
    };
    show();
    this.waitBack((c) => {
      let d = 0;
      if (c.pressed('derecha') || c.pressed('dispararDerecha')) d = 1;
      if (c.pressed('izquierda') || c.pressed('dispararIzquierda')) d = -1;
      if (c.pressed('abajo') || c.pressed('dispararAbajo')) d = cols;
      if (c.pressed('arriba') || c.pressed('dispararArriba')) d = -cols;
      if (d) {
        sel = Phaser.Math.Clamp(sel + d, 0, ITEMS.length - 1);
        sfx('aviso');
        show();
      }
    });
  }

  private openCredits(): void {
    this.overlay(t('Créditos'));
    const lines = [
      'Carpa Negra',
      '',
      'Un roguelike de mazmorras en un circo de los horrores.',
      'Todo el arte está dibujado por código',
      'y toda la música se sintetiza al jugar.',
      '',
      'Hecho con Phaser, TypeScript y Vite.',
      '',
      'Gracias por ver la función.',
      'El Maestro te espera mañana.',
    ];
    lines.forEach((l, i) => this.sub.push(txt(this, GAME_W / 2, 26 + i * 11, l, i === 0 ? 0xd4323f : 0xefe6d8, 'center').setDepth(101)));
    this.waitBack();
  }

  /** Introducción en tres viñetas (la primera vez). */
  private showIntro(done: () => void): void {
    const panels: [string, string][] = [
      ['Una noche llega una carpa negra al pueblo.', 'Nadie recuerda haberla visto montar.'],
      ['Pompón, un payaso curioso, entra a mirar.', 'La entrada se cierra a su espalda.'],
      ['"Pasen y vean", dice una voz.', '"La función no termina hasta que yo lo diga."'],
    ];
    const objs: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0710, 1).setOrigin(0).setDepth(300);
    objs.push(bg);
    const g = this.add.graphics().setDepth(301);
    objs.push(g);
    const l1 = txt(this, GAME_W / 2, 120, '', 0xefe6d8, 'center').setDepth(302);
    const l2 = txt(this, GAME_W / 2, 132, '', 0x8a8394, 'center').setDepth(302);
    const skip = txt(this, GAME_W / 2, 160, 'Enter: seguir', 0x55505e, 'center').setDepth(302);
    objs.push(l1, l2, skip);
    let i = 0;
    const draw = () => {
      g.clear();
      g.lineStyle(1, 0xf2c14e, 1).strokeRect(40, 14, 160, 96);
      if (i === 0) {
        // La carpa negra bajo la luna.
        g.fillStyle(0x1d1424, 1).fillRect(41, 15, 158, 94);
        g.fillStyle(0xefe6d8, 1).fillCircle(170, 34, 9);
        g.fillStyle(0x0b0710, 1).fillTriangle(120, 34, 70, 100, 170, 100);
        g.fillStyle(0xd4323f, 1).fillRect(118, 26, 4, 8);
      } else if (i === 1) {
        g.fillStyle(0x2a1430, 1).fillRect(41, 15, 158, 94);
        g.fillStyle(0xefe6d8, 1).fillCircle(120, 60, 10);
        g.fillStyle(0xd4323f, 1).fillCircle(120, 63, 3).fillRect(110, 72, 20, 22);
        g.fillStyle(0x0b0710, 1).fillRect(41, 15, 28, 94).fillRect(171, 15, 28, 94);
      } else {
        g.fillStyle(0x0b0710, 1).fillRect(41, 15, 158, 94);
        g.fillStyle(0xd4323f, 1).fillCircle(112, 62, 1.5).fillCircle(128, 62, 1.5);
        g.lineStyle(1, 0xefe6d8, 1).beginPath().arc(120, 66, 12, 0.2, Math.PI - 0.2).strokePath();
        g.fillStyle(0x1d1424, 1).fillRect(106, 30, 28, 18).fillRect(100, 46, 40, 4);
      }
      setTxt(l1, panels[i][0]);
      setTxt(l2, panels[i][1]);
      sfx('aviso');
    };
    draw();
    const c = Controls.get();
    const next = () => {
      i++;
      if (i >= panels.length) {
        this.events.off('update', tick);
        this.input.off('pointerdown', next);
        for (const o of objs) o.destroy();
        done();
      } else draw();
    };
    const tick = () => {
      c.update();
      if (c.pressed('aceptar') || c.pressed('activo') || c.pressed('pausa')) next();
    };
    this.events.on('update', tick);
    this.input.on('pointerdown', next);
  }
}

const GIRA_DESC = [
  'Función normal',
  'Gira 1: más campeones',
  'Gira 2: + balas más rápidas',
  'Gira 3: + el puesto cuesta más',
  'Gira 4: + menos curación entre actos',
  'Gira 5: + jefes más duros y salas malditas',
];
