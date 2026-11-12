// Marcador: globos, boletos, petardos, llaves, objeto activo, golosina,
// aplausómetro, minimapa, avisos y barra del jefe.
import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { GAME_W, HUD_H, ROOM_H } from '../config';
import { txt, setTxt } from '../ui/text';
import { item } from '../data/items';
import { BOSS_NAMES } from '../data/enemies';
import { statRows } from '../ui/statInfo';
import { GOLOSINA_COLORS, GOLOSINA_TINT } from '../data/golosinas';
import { doorVisible, roomKey, RoomState, bossRoom } from '../core/run';
import { DIRS, DIR_VEC } from '../core/floorgen';
import { Controls } from '../systems/Controls';
import { settings } from '../core/save';
import { actDef, romano } from '../data/acts';

export class HudScene extends Phaser.Scene {
  private gs!: GameScene;
  private hearts: Phaser.GameObjects.Image[] = [];
  private counters: Phaser.GameObjects.BitmapText[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private activeIcon!: Phaser.GameObjects.Image;
  private golosina!: Phaser.GameObjects.Image;
  private golosinaShape!: Phaser.GameObjects.Image;
  private bannerTitle!: Phaser.GameObjects.BitmapText;
  private bannerSub!: Phaser.GameObjects.BitmapText;
  private bossName!: Phaser.GameObjects.BitmapText;
  private applauseLabel!: Phaser.GameObjects.BitmapText;
  private timerTxt!: Phaser.GameObjects.BitmapText;
  private statPanel!: Phaser.GameObjects.Container;
  private statBg!: Phaser.GameObjects.Graphics;
  private statLabels: Phaser.GameObjects.BitmapText[] = [];
  private statValues: Phaser.GameObjects.BitmapText[] = [];
  private statAlpha = 0;
  private bossChip = -1;
  private lastBossHp = 0;
  private chipWait = 0;
  private beatT = 0;
  private over!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Image;
  private introImg!: Phaser.GameObjects.Image;
  private introName!: Phaser.GameObjects.BitmapText;
  private introTag!: Phaser.GameObjects.BitmapText;
  private cardName!: Phaser.GameObjects.BitmapText;
  private cardDesc!: Phaser.GameObjects.BitmapText;
  private actCard: Phaser.GameObjects.BitmapText[] = [];
  private nextCardImg!: Phaser.GameObjects.Image;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.gs = this.scene.get('Juego') as GameScene;
    this.hearts = [];
    this.counters = [];
    this.gfx = this.add.graphics();
    for (let i = 0; i < 12; i++) {
      this.hearts.push(this.add.image(31 + (i % 6) * 8, 7 + Math.floor(i / 6) * 10, 'hud_globo').setVisible(false));
    }
    const icons = ['hud_boleto', 'hud_petardo', 'hud_llave'];
    icons.forEach((k, i) => {
      this.add.image(85, 6 + i * 10, k);
      this.counters.push(txt(this, 91, 2 + i * 10, '00', 0xefe6d8));
    });
    this.activeIcon = this.add.image(12, 15, 'obj_narizRoja').setVisible(false);
    this.golosina = this.add.image(121, 15, 'golosina').setVisible(false);
    this.golosinaShape = this.add.image(121, 15, 'formas_golosina', 0).setVisible(false);
    txt(this, 117, 22, 'Q', 0x55505e);
    this.applauseLabel = txt(this, 157, 3, 'Aplauso', 0x8a8394, 'center');
    this.timerTxt = txt(this, 157, 21, '', 0x55505e, 'center').setVisible(false);
    this.bannerTitle = txt(this, GAME_W / 2, HUD_H + 16, '', 0xf2c14e, 'center');
    this.bannerSub = txt(this, GAME_W / 2, HUD_H + 26, '', 0xefe6d8, 'center');
    this.bossName = txt(this, GAME_W / 2, HUD_H + ROOM_H - 20, '', 0xefe6d8, 'center');

    // Panel de estadísticas (Tab), arriba a la izquierda de la sala.
    this.statLabels = [];
    this.statValues = [];
    this.statBg = this.add.graphics();
    this.statBg.fillStyle(0x0b0710, 0.6).fillRect(0, 0, 100, 66);
    const parts: Phaser.GameObjects.GameObject[] = [this.statBg];
    for (let i = 0; i < 6; i++) {
      const l = txt(this, 4, 3 + i * 10, '', 0xc2bccb);
      const v = txt(this, 96, 3 + i * 10, '', 0xefe6d8, 'right');
      this.statLabels.push(l);
      this.statValues.push(v);
      parts.push(l, v);
    }
    // Debajo de la franja de avisos para no taparlos.
    this.statPanel = this.add.container(18, HUD_H + 40, parts).setAlpha(0).setDepth(50);

    this.bossChip = -1;
    this.beatT = 0;
    this.vignette = this.add.image(GAME_W / 2, HUD_H + ROOM_H / 2, 'vineta').setDisplaySize(GAME_W, ROOM_H).setAlpha(0).setDepth(40);
    this.over = this.add.graphics().setDepth(60);
    this.introImg = this.add.image(0, 0, 'pixel').setDepth(61).setVisible(false);
    this.introName = txt(this, 0, 0, '', 0xf2c14e, 'center').setScale(2).setDepth(61).setVisible(false);
    this.introTag = txt(this, 0, 0, '', 0xefe6d8, 'center').setDepth(61).setVisible(false);
    this.cardName = txt(this, GAME_W / 2, 0, '', 0xf2c14e, 'center').setDepth(61).setVisible(false);
    this.cardDesc = txt(this, GAME_W / 2, 0, '', 0xc2bccb, 'center').setDepth(61).setVisible(false);
    this.nextCardImg = this.add.image(0, 0, 'carta_tarot', 0).setScale(0.6).setDepth(55).setVisible(false);
    this.actCard = [
      txt(this, GAME_W / 2, HUD_H + 42, '', 0xf2c14e, 'center').setScale(2).setDepth(62),
      txt(this, GAME_W / 2, HUD_H + 66, '', 0xefe6d8, 'center').setDepth(62),
      txt(this, GAME_W / 2, HUD_H + 84, '', 0xc9b3ef, 'center').setDepth(62),
    ];
  }

  update(_time: number, delta: number): void {
    const gs = this.gs;
    if (!gs || !gs.run || !gs.scene.isActive() && !gs.scene.isPaused()) return;
    // Cartel del jefe: el marcador lo avanza y reanuda la sala al terminar (o al pulsar).
    const intro = gs.bossIntro;
    if (intro && intro.started) {
      intro.t += Math.min(0.05, delta / 1000);
      const c = Controls.get();
      c.update();
      const skip = intro.t > 0.5 && (c.pressed('aceptar') || c.pressed('pausa') || c.pressed('activo'));
      if (intro.t >= intro.dur || skip) {
        gs.bossIntro = null;
        if (gs.scene.isPaused() && !this.scene.isActive('Pausa')) gs.scene.resume();
      }
    }
    // Parada de impacto: el marcador lleva la cuenta y reanuda el juego.
    if (gs.frozenFor > 0) {
      gs.frozenFor -= Math.min(50, delta);
      if (gs.frozenFor <= 0) {
        gs.frozenFor = 0;
        if (gs.scene.isPaused() && !this.scene.isActive('Pausa')) gs.scene.resume();
      }
    }
    const p = gs.run.player;
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x0b0710, 1).fillRect(0, 0, GAME_W, HUD_H);
    g.fillStyle(0x2e1f38, 1).fillRect(0, HUD_H - 1, GAME_W, 1);

    // Globos: rojos, vacíos y plateados.
    const containers = Math.ceil(p.maxHp / 2);
    const shields = Math.ceil(p.shield / 2);
    for (let i = 0; i < 12; i++) {
      const h = this.hearts[i];
      if (i < containers) {
        const v = p.hp - i * 2;
        h.setTexture(v >= 2 ? 'hud_globo' : v === 1 ? 'hud_globo_medio' : 'hud_globo_vacio').setVisible(true);
      } else if (i < containers + shields) {
        const v = p.shield - (i - containers) * 2;
        h.setTexture(v >= 2 ? 'hud_plata' : 'hud_plata_medio').setVisible(true);
      } else h.setVisible(false);
    }
    // Parpadeo del último globo si queda poca vida.
    if (p.hp + p.shield <= 2 && Math.floor(this.time.now / 250) % 2 === 0) {
      const last = Math.max(0, containers + shields - 1);
      this.hearts[last]?.setAlpha(0.4);
    } else this.hearts.forEach((h) => h.setAlpha(1));

    setTxt(this.counters[0], String(p.tickets).padStart(2, '0'));
    setTxt(this.counters[1], String(p.bombs).padStart(2, '0'));
    setTxt(this.counters[2], String(p.keys).padStart(2, '0'));

    // Objeto activo con su barra de carga.
    g.lineStyle(1, 0x4a2f5c, 1).strokeRect(2.5, 4.5, 19, 21);
    if (p.active) {
      const def = item(p.active);
      const max = def.active!.charges;
      this.activeIcon.setTexture(`obj_${p.active}`).setVisible(true);
      const ready = p.charge >= max;
      this.activeIcon.setAlpha(ready ? 1 : 0.55);
      const h = 20;
      g.fillStyle(0x1d1424, 1).fillRect(23, 5, 4, h);
      const fill = Math.round((h * Math.min(p.charge, max)) / max);
      g.fillStyle(ready ? (Math.floor(this.time.now / 200) % 2 ? 0xfff2a8 : 0xf2c14e) : 0xc9b3ef, 1).fillRect(23, 5 + h - fill, 4, fill);
      for (let i = 1; i < max; i++) g.fillStyle(0x0b0710, 1).fillRect(23, 5 + Math.round((h * i) / max), 4, 1);
    } else this.activeIcon.setVisible(false);

    // Golosina.
    g.lineStyle(1, 0x2e1f38, 1).strokeRect(111.5, 7.5, 19, 15);
    if (p.golosina) {
      this.golosina.setVisible(true).setTint(GOLOSINA_TINT[p.golosina]);
      this.golosinaShape.setVisible(true).setFrame(GOLOSINA_COLORS.indexOf(p.golosina));
    } else {
      this.golosina.setVisible(false);
      this.golosinaShape.setVisible(false);
    }

    // Aplausómetro.
    const ap = gs.applause;
    const w = 50;
    g.fillStyle(0x1d1424, 1).fillRect(132, 13, w, 5);
    const f = Math.max(0, Math.round((w * ap.value) / ap.max));
    g.fillStyle(0xd4323f, 1).fillRect(132, 13, f, 5);
    if (f > 0) g.fillStyle(0xf2a3b5, 1).fillRect(132, 13, f, 1);
    this.applauseLabel.setTint(ap.value > ap.max * 0.7 ? 0xf2c14e : ap.value < 0 ? 0xd4323f : 0x8a8394);
    // Abucheo (Acto IV): la barra se vacía hacia la izquierda en rojo oscuro.
    if (ap.value < 0) {
      const fb = Math.round((w * -ap.value) / -ap.booAt);
      g.fillStyle(0x5e1420, 1).fillRect(132, 13, Math.min(w, fb), 5);
    }
    // Acto y reloj (opcional).
    if (settings().timer) {
      const tt = gs.run.playTime;
      setTxt(this.timerTxt, `${romano(gs.run.act)} · ${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}`);
      this.timerTxt.setVisible(true);
    } else this.timerTxt.setVisible(false);
    this.drawStatPanel();
    this.drawMinimap(g);
    this.drawBanner(g);
    this.drawBoss(g);
    this.drawOverlay(Math.min(0.05, delta / 1000));
  }

  /** Con Tab (o justo después de un cambio) se ven las estadísticas. */
  private drawStatPanel(): void {
    const gs = this.gs;
    const show = gs.controls.isDown('estadisticas') || gs.statChanges.size > 0;
    // Si Pompón está detrás del panel, casi transparente para no taparlo.
    const behind = gs.player.x < 18 + 100 + 8 && gs.player.y > 40 - 12 && gs.player.y < 40 + 66 + 16;
    const target = show ? (behind ? 0.3 : 0.9) : 0;
    // 0.25 por fotograma a 60 Hz, igual a cualquier tasa de refresco.
    const dt = Math.min(0.05, this.game.loop.delta / 1000);
    this.statAlpha += (target - this.statAlpha) * (1 - Math.pow(0.75, dt * 60));
    this.statPanel.setAlpha(this.statAlpha);
    if (this.statAlpha < 0.02) return;
    statRows(gs.stats).forEach((row, i) => {
      const ch = gs.statChanges.get(row.label);
      setTxt(this.statLabels[i], row.label);
      setTxt(this.statValues[i], ch ? `${ch.up ? '↑' : '↓'} ${row.text}` : row.text);
      this.statValues[i].setTint(ch ? (ch.up ? 0x79b84a : 0xd4323f) : 0xefe6d8);
    });
  }

  /** Salas que el jugador conoce (visitadas, vecinas visibles o reveladas). */
  private knownRooms(): Set<RoomState> {
    const gs = this.gs;
    const run = gs.run;
    const reveal = gs.effects.hasFlag('revealMap') || !!run.mapRevealed;
    const known = new Set<RoomState>();
    for (const r of run.rooms.values()) {
      if (r.visited) {
        known.add(r);
        for (const d of DIRS) {
          if (!doorVisible(run, r, d)) continue;
          const n = run.rooms.get(roomKey(r.x + DIR_VEC[d].x, r.y + DIR_VEC[d].y));
          if (n) known.add(n);
        }
      } else if (reveal && r.type !== 'secreta') known.add(r);
    }
    return known;
  }

  /** Dibuja una sala del mapa en (x, y) con tamaño (w, h). */
  private drawMapRoom(g: Phaser.GameObjects.Graphics, r: RoomState, x: number, y: number, w: number, h: number, isCur: boolean): void {
    const gs = this.gs;
    const color = isCur ? 0xefe6d8 : r.visited ? (r.cleared ? 0x7a4a8c : 0x5c3c70) : 0x2e1f38;
    g.fillStyle(color, 1).fillRect(x, y, w - 1, h - 1);
    const glyph = ROOM_GLYPH[r.type];
    if (glyph && (r.visited || r.type !== 'secreta' || gs.effects.hasFlag('revealMap'))) {
      const [rows, col] = glyph;
      const gx = x + Math.floor((w - 1 - 3) / 2),
        gy = y + Math.floor((h - 1 - 3) / 2);
      g.fillStyle(isCur ? 0x1d1424 : col, 1);
      rows.forEach((row, ry) => [...row].forEach((c, rx) => c === '#' && g.fillRect(gx + rx, gy + ry, 1, 1)));
    }
    // Objeto pendiente en la sala.
    const pending = r === gs.room ? gs.pedestals.some((p) => p.item) : r.pedestals.some((p) => p.item);
    if (pending && r.visited) g.fillStyle(0xf2c14e, 1).fillRect(x + w - 3, y, 2, 2);
  }

  private drawMinimap(g: Phaser.GameObjects.Graphics): void {
    const gs = this.gs;
    const run = gs.run;
    const cur = gs.room;
    if (!cur) return;
    const ox = 188,
      oy = 2,
      cw = 7,
      ch = 5,
      cols = 7,
      rows = 5;
    g.fillStyle(0x120c16, 1).fillRect(ox - 1, oy - 1, cols * cw + 1, rows * ch + 1);
    const center = cur.type === 'contrato' ? bossRoom(run) : cur;
    for (const r of this.knownRooms()) {
      const dx = r.x - center.x + Math.floor(cols / 2);
      const dy = r.y - center.y + Math.floor(rows / 2);
      if (dx < 0 || dy < 0 || dx >= cols || dy >= rows) continue;
      this.drawMapRoom(g, r, ox + dx * cw, oy + dy * ch, cw, ch, r === center);
    }
    // El Contrato, encima de la sala del jefe.
    if (run.contractOpen) {
      const b = bossRoom(run);
      const dx = b.x - center.x + Math.floor(cols / 2);
      const dy = b.y - center.y + Math.floor(rows / 2) - 1;
      if (dx >= 0 && dy >= 0 && dx < cols && dy < rows && !run.rooms.has(roomKey(b.x, b.y - 1))) {
        g.fillStyle(cur.type === 'contrato' ? 0xefe6d8 : 0x3a0c14, 1).fillRect(ox + dx * cw, oy + dy * ch, cw - 1, ch - 1);
        g.fillStyle(0xd4323f, 1).fillRect(ox + dx * cw + 2, oy + dy * ch + 1, 2, 2);
      }
    }
  }

  /** Mapa completo mientras se mantiene Tab. */
  private drawFullMap(g: Phaser.GameObjects.Graphics): void {
    const gs = this.gs;
    if (!gs.controls.isDown('estadisticas')) return;
    const known = [...this.knownRooms()];
    if (!known.length) return;
    const cw = 11,
      ch = 8;
    const xs = known.map((r) => r.x),
      ys = known.map((r) => r.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const w = (maxX - minX + 1) * cw,
      h = (maxY - minY + 1) * ch;
    const ox = Math.round(180 - w / 2),
      oy = Math.round(HUD_H + 72 - h / 2);
    g.fillStyle(0x0b0710, 0.8).fillRect(ox - 4, oy - 4, w + 8, h + 8);
    g.lineStyle(1, 0x4a2f5c, 1).strokeRect(ox - 3.5, oy - 3.5, w + 7, h + 7);
    for (const r of known) this.drawMapRoom(g, r, ox + (r.x - minX) * cw, oy + (r.y - minY) * ch, cw, ch, r === gs.room);
  }

  private drawBanner(g: Phaser.GameObjects.Graphics): void {
    const b = this.gs.banners[this.gs.banners.length - 1];
    if (!b || this.gs.bossIntro) {
      this.bannerTitle.setVisible(false);
      this.bannerSub.setVisible(false);
      return;
    }
    const alpha = Math.min(1, b.t / 0.4, (2.6 - b.t) / 0.15);
    setTxt(this.bannerTitle, b.title);
    setTxt(this.bannerSub, b.sub);
    const w = Math.max(this.bannerTitle.width, this.bannerSub.width) + 12;
    g.fillStyle(0x0b0710, 0.75 * alpha).fillRect(GAME_W / 2 - w / 2, HUD_H + 12, w, b.sub ? 24 : 14);
    this.bannerTitle.setVisible(true).setAlpha(alpha);
    this.bannerSub.setVisible(!!b.sub).setAlpha(alpha);
  }

  private drawBoss(g: Phaser.GameObjects.Graphics): void {
    const bosses = this.gs.bossIds.filter((b) => b.active);
    if (!bosses.length || this.gs.room.cleared) {
      this.bossName.setVisible(false);
      this.nextCardImg.setVisible(false);
      this.bossChip = -1;
      return;
    }
    const hp = bosses.reduce((s, b) => s + Math.max(0, b.hp), 0);
    const max = this.gs.bossIds.reduce((s, b) => s + b.maxHp, 0);
    // "Mordisco": la parte perdida tarda un poco en vaciarse.
    const dt = Math.min(0.05, this.game.loop.delta / 1000);
    if (this.bossChip < 0 || this.bossChip < hp) this.bossChip = hp;
    if (hp < this.lastBossHp) this.chipWait = 0.45;
    this.lastBossHp = hp;
    this.chipWait -= dt;
    if (this.chipWait <= 0) this.bossChip = Math.max(hp, this.bossChip - max * 0.6 * dt);
    const y = HUD_H + ROOM_H - 10;
    const w = 120;
    const x = GAME_W / 2 - w / 2;
    g.fillStyle(0x0b0710, 0.85).fillRect(x - 2, y - 2, w + 4, 8);
    g.fillStyle(0x3a1220, 1).fillRect(x, y, w, 4);
    g.fillStyle(0xfff2a8, 1).fillRect(x, y, Math.round((w * this.bossChip) / max), 4);
    g.fillStyle(0xd4323f, 1).fillRect(x, y, Math.round((w * hp) / max), 4);
    g.fillStyle(0xf2a3b5, 1).fillRect(x, y, Math.round((w * hp) / max), 1);
    // Marcas de fase.
    const marks = (this.gs.bossIds[0] as unknown as { marks?: number[] }).marks ?? [];
    for (const m of marks) g.fillStyle(0x0b0710, 1).fillRect(x + Math.round(w * m), y - 1, 1, 6);
    setTxt(this.bossName, BOSS_NAMES[this.gs.run.boss]);
    this.bossName.setVisible(true);
    // Bola de Cristal: deja ver la próxima carta de Madame Fortuna.
    const next = (this.gs.bossIds[0] as unknown as { nextCard?: string }).nextCard;
    if (next && this.gs.effects.hasFlag('revealMap')) {
      const frames: Record<string, number> = { torre: 0, rueda: 1, colgado: 2, luna: 3, muerte: 4 };
      this.nextCardImg.setFrame(frames[next]).setVisible(true).setPosition(x + w + 12, y + 1);
    } else this.nextCardImg.setVisible(false);
  }

  /** Viñeta de daño, latido con poca vida, cartel del jefe y cartela de objeto. */
  private drawOverlay(dt: number): void {
    const gs = this.gs;
    const g = this.over;
    g.clear();
    const p = gs.run.player;
    const low = p.hp + p.shield <= 2 && !gs.player.dead;
    const pulse = low ? 0.25 + 0.2 * Math.sin(this.time.now / 160) : 0;
    this.vignette.setAlpha(Math.max(pulse, (gs.hurtT / 0.4) * 0.9));
    if (low && !gs.scene.isPaused()) {
      this.beatT -= dt;
      if (this.beatT <= 0) {
        this.beatT = 0.9;
        gs.snd('latido');
      }
    } else this.beatT = 0;

    // Cartel de presentación del jefe.
    const intro = gs.bossIntro;
    if (intro) {
      const k = Math.min(1, intro.t / 0.25, (intro.dur - intro.t) / 0.25 + 0.0001);
      const bar = Math.round(22 * Math.min(1, k * 1.5));
      g.fillStyle(0x000000, 1).fillRect(0, HUD_H, GAME_W, bar).fillRect(0, HUD_H + ROOM_H - bar, GAME_W, bar);
      g.fillStyle(0x0b0710, 0.7 * k).fillRect(0, HUD_H + 46, GAME_W, 52);
      g.fillStyle(0xd4323f, k).fillRect(0, HUD_H + 46, GAME_W, 1).fillRect(0, HUD_H + 97, GAME_W, 1);
      const slide = (1 - Math.min(1, intro.t / 0.35)) * 80;
      this.introImg.setTexture(intro.texture, 0).setVisible(true).setAlpha(k).setPosition(44 - slide, HUD_H + 72);
      this.introImg.setScale(Math.min(2, 44 / Math.max(this.introImg.frame.height, 1)));
      setTxt(this.introName, intro.name);
      setTxt(this.introTag, intro.tagline);
      this.introName.setVisible(true).setAlpha(k).setPosition(150 + slide, HUD_H + 58);
      this.introTag.setVisible(true).setAlpha(k).setPosition(150 + slide, HUD_H + 80);
    } else {
      this.introImg.setVisible(false);
      this.introName.setVisible(false);
      this.introTag.setVisible(false);
    }

    // Cartela del objeto que tienes delante.
    const ped = intro ? null : gs.pedestals.find((q) => q.item && Phaser.Math.Distance.Between(q.x, q.y, gs.player.x, gs.player.y) < 26);
    if (ped && ped.item) {
      const def = item(ped.item);
      const cost = ped.price > 0 ? `${ped.price} boletos` : ped.contractCost > 0 ? `${ped.contractCost} globo${ped.contractCost > 1 ? 's' : ''} máx.` : '';
      setTxt(this.cardName, def.name);
      setTxt(this.cardDesc, cost ? `${def.desc} · ${cost}` : def.desc);
      const w = Math.max(this.cardName.width, this.cardDesc.width) + 12;
      const y = HUD_H + ROOM_H - 30;
      g.fillStyle(0x0b0710, 0.8).fillRect(GAME_W / 2 - w / 2, y - 3, w, 24);
      g.lineStyle(1, 0x4a2f5c, 1).strokeRect(GAME_W / 2 - w / 2 + 0.5, y - 2.5, w - 1, 23);
      this.cardName.setVisible(true).setY(y);
      this.cardDesc.setVisible(true).setY(y + 10);
    } else {
      this.cardName.setVisible(false);
      this.cardDesc.setVisible(false);
    }
    this.drawFullMap(g);
    this.drawCurtain(g, dt);
  }

  /** Telón rojo: se cierra al bajar por la trampilla y se abre con la cartela del acto. */
  private drawCurtain(g: Phaser.GameObjects.Graphics, dt: number): void {
    const gs = this.gs;
    const c = gs.curtain;
    if (!c) {
      this.actCard.forEach((t) => t.setVisible(false));
      return;
    }
    c.t += dt;
    let k: number;
    if (c.closing) k = Math.min(1, c.t / 0.7);
    else {
      k = 1 - Math.min(1, Math.max(0, c.t - 1.4) / 0.8);
      if (c.t > 2.3) gs.curtain = null;
    }
    const w = Math.round((GAME_W / 2) * (1 - Math.pow(1 - k, 2)));
    const top = HUD_H,
      h = ROOM_H;
    for (const [x0, dir] of [[0, 1], [GAME_W, -1]] as [number, number][]) {
      const x = dir > 0 ? x0 : x0 - w;
      g.fillStyle(0x8f1d2c, 1).fillRect(x, top, w, h);
      for (let sx = 0; sx < w; sx += 8) g.fillStyle(0x5e1420, 1).fillRect(x + sx + 5, top, 2, h);
      g.fillStyle(0xf2c14e, 1).fillRect(dir > 0 ? x + w - 2 : x, top, 2, h);
    }
    g.fillStyle(0x3a0c14, 1).fillRect(0, top, GAME_W, 6);
    const showCard = !c.closing && c.t < 1.6;
    const [a, b, d] = this.actCard;
    if (showCard) {
      const run = gs.run;
      setTxt(a, `Acto ${romano(run.act)}`);
      setTxt(b, run.actName);
      setTxt(d, actDef(run.act).intro);
      const alpha = Math.min(1, c.t / 0.3, (1.6 - c.t) / 0.3);
      for (const t of this.actCard) t.setVisible(true).setAlpha(alpha);
    } else this.actCard.forEach((t) => t.setVisible(false));
  }
}

/** Iconos de 3×3 del mapa: forma y color por tipo de sala. */
const ROOM_GLYPH: Partial<Record<RoomState['type'], [string[], number]>> = {
  jefe: [['#.#', '###', '.#.'], 0xd4323f],
  camerino: [['.#.', '###', '.#.'], 0xf2c14e],
  puesto: [['###', '.#.', '###'], 0x79b84a],
  diana: [['###', '#.#', '###'], 0xf2a3b5],
  barraca: [['#.#', '.#.', '#.#'], 0x4f8fd1],
  secreta: [['.#.', '#.#', '.#.'], 0x8a8394],
  pitonisa: [['...', '###', '.#.'], 0xc9b3ef],
  reto: [['.#.', '.#.', '.#.'], 0xe8743b],
};
