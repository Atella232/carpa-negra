// Marcador: globos, boletos, petardos, llaves, objeto activo, golosina,
// aplausómetro, minimapa, avisos y barra del jefe.
import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { GAME_W, HUD_H, ROOM_H } from '../config';
import { txt, setTxt } from '../ui/text';
import { item } from '../data/items';
import { GOLOSINA_TINT } from '../data/golosinas';
import { doorVisible, roomKey, RoomState } from '../core/run';
import { DIRS, DIR_VEC } from '../core/floorgen';

export class HudScene extends Phaser.Scene {
  private gs!: GameScene;
  private hearts: Phaser.GameObjects.Image[] = [];
  private counters: Phaser.GameObjects.BitmapText[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private activeIcon!: Phaser.GameObjects.Image;
  private golosina!: Phaser.GameObjects.Image;
  private bannerTitle!: Phaser.GameObjects.BitmapText;
  private bannerSub!: Phaser.GameObjects.BitmapText;
  private bossName!: Phaser.GameObjects.BitmapText;
  private applauseLabel!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.gs = this.scene.get('Juego') as GameScene;
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
    txt(this, 117, 22, 'Q', 0x55505e);
    this.applauseLabel = txt(this, 157, 3, 'Aplauso', 0x8a8394, 'center');
    this.bannerTitle = txt(this, GAME_W / 2, HUD_H + 16, '', 0xf2c14e, 'center');
    this.bannerSub = txt(this, GAME_W / 2, HUD_H + 26, '', 0xefe6d8, 'center');
    this.bossName = txt(this, GAME_W / 2, HUD_H + ROOM_H - 20, '', 0xefe6d8, 'center');
  }

  update(): void {
    const gs = this.gs;
    if (!gs || !gs.run || !gs.scene.isActive() && !gs.scene.isPaused()) return;
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
    if (p.golosina) this.golosina.setVisible(true).setTint(GOLOSINA_TINT[p.golosina]);
    else this.golosina.setVisible(false);

    // Aplausómetro.
    const ap = gs.applause;
    const w = 50;
    g.fillStyle(0x1d1424, 1).fillRect(132, 13, w, 5);
    const f = Math.round((w * ap.value) / ap.max);
    g.fillStyle(0xd4323f, 1).fillRect(132, 13, f, 5);
    if (f > 0) g.fillStyle(0xf2a3b5, 1).fillRect(132, 13, f, 1);
    this.applauseLabel.setTint(ap.value > ap.max * 0.7 ? 0xf2c14e : 0x8a8394);
    // Estadísticas mínimas.
    const st = gs.stats;
    g.fillStyle(0x0b0710, 1);
    void st;

    this.drawMinimap(g);
    this.drawBanner(g);
    this.drawBoss(g);
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
    const center = cur.type === 'contrato' ? run.rooms.get([...run.rooms.values()].find((r) => r.type === 'jefe')!.x + ',' + [...run.rooms.values()].find((r) => r.type === 'jefe')!.y)! : cur;
    const reveal = gs.effects.hasFlag('revealMap');
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
    for (const r of known) {
      const dx = r.x - center.x + Math.floor(cols / 2);
      const dy = r.y - center.y + Math.floor(rows / 2);
      if (dx < 0 || dy < 0 || dx >= cols || dy >= rows) continue;
      const x = ox + dx * cw,
        y = oy + dy * ch;
      const isCur = r === center;
      const color = isCur ? 0xefe6d8 : r.visited ? 0x7a4a8c : 0x2e1f38;
      g.fillStyle(color, 1).fillRect(x, y, cw - 1, ch - 1);
      const icon: Record<string, number> = {
        jefe: 0xd4323f, camerino: 0xf2c14e, puesto: 0x79b84a, diana: 0xf2a3b5, barraca: 0x4f8fd1, secreta: 0x8a8394,
      };
      if (icon[r.type] && (r.visited || reveal || r.type !== 'secreta')) {
        g.fillStyle(icon[r.type], 1).fillRect(x + 2, y + 1, 2, 2);
      }
    }
  }

  private drawBanner(g: Phaser.GameObjects.Graphics): void {
    const b = this.gs.banners[this.gs.banners.length - 1];
    if (!b) {
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
      return;
    }
    const hp = bosses.reduce((s, b) => s + Math.max(0, b.hp), 0);
    const max = this.gs.bossIds.reduce((s, b) => s + b.maxHp, 0);
    const y = HUD_H + ROOM_H - 10;
    const w = 120;
    const x = GAME_W / 2 - w / 2;
    g.fillStyle(0x0b0710, 0.85).fillRect(x - 2, y - 2, w + 4, 8);
    g.fillStyle(0x3a1220, 1).fillRect(x, y, w, 4);
    g.fillStyle(0xd4323f, 1).fillRect(x, y, Math.round((w * hp) / max), 4);
    g.fillStyle(0xf2a3b5, 1).fillRect(x, y, Math.round((w * hp) / max), 1);
    setTxt(this.bossName, this.gs.run.boss === 'forzudo' ? 'El Forzudo' : 'Los Siameses');
    this.bossName.setVisible(true);
  }
}
