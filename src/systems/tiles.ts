// Cómo se construye cada baldosa en juego (los datos están en data/tiles.ts).
import type { GameScene } from '../scenes/GameScene';
import type { RoomState } from '../core/run';
import { COLS, DEPTH } from '../config';
import Phaser from 'phaser';
import { OBSTACLE_KINDS, TILES, TileKind } from '../data/tiles';
import { Obstacle, ObstacleKind, braseroLook } from '../entities/props';
import type { Shot } from '../entities/Shot';

export interface TileCtx {
  sc: GameScene;
  room: RoomState;
  c: number;
  r: number;
  /** Índice de la baldosa (c + r·13), para recordar lo destruido. */
  idx: number;
  x: number;
  y: number;
  ch: string;
}

const OBSTACLE_FOR: Partial<Record<TileKind, ObstacleKind>> = {
  cajon: 'cajon',
  cajon_marcado: 'cajon_marcado',
  bloque: 'bloque',
  palomitas: 'palomitas',
  brasero: 'brasero',
  paja: 'paja',
};

type Builder = (t: TileCtx) => void;

function obstacle(t: TileCtx, kind: ObstacleKind): void {
  const { sc, room, idx } = t;
  if (room.destroyed.includes(idx)) return;
  const hits = room.damaged[idx] ?? 0;
  const o = new Obstacle(sc, t.x, t.y, kind, idx, hits);
  if (kind === 'brasero') braseroLook(o);
  sc.nav.setBlocked(t.c, t.r, true);
}

/** Obstáculo alto (no lo cruzan ni los zancos ni los voladores). */
function tall(t: TileCtx, texture: string, kind: string, breakable: boolean): Phaser.Physics.Arcade.Image | null {
  const { sc, room, idx, x, y, c, r } = t;
  if (breakable && room.destroyed.includes(idx)) return null;
  const im = sc.physics.add.staticImage(x, y, texture).setDepth(DEPTH.world + y + 6);
  im.setSize(16, 16).refreshBody();
  im.setData('tile', idx).setData('kind', kind).setData('breakable', breakable);
  sc.g.altos.add(im);
  sc.nav.setBlocked(c, r, true);
  return im;
}

const BUILDERS: Partial<Record<TileKind, Builder>> = {
  espejo: (t) => {
    const im = tall(t, 'espejo', 'espejo', true);
    // Reflejo que tiembla un poco (el espejo está vivo).
    if (im) t.sc.roomUpdate.push(() => im.active && im.setFrame(Math.floor((t.sc.time.now / 300 + t.idx) % 3)));
  },
  aro: ({ sc, x, y }) => {
    // Aro de fuego: tus pelotas que lo cruzan salen ardiendo; quedarse dentro quema.
    const img = sc.add.sprite(x, y - 2, 'aro', 0).setDepth(DEPTH.world + y + 4);
    sc.roomObjs.push(img);
    let inside = 0;
    sc.roomUpdate.push((dt) => {
      if (!img.active) return;
      img.setFrame(Math.floor(sc.time.now / 120) % 2);
      for (const s of sc.g.pShots.getChildren() as Shot[]) {
        if (s.dead || s.opts.burn || Math.abs(s.x - x) > 7 || Math.abs(s.y + 5 - y) > 7) continue;
        s.opts.burn = true;
        s.setTexture('pelota_fuego');
        sc.fx.sparks(s.x, s.y, 0xe8743b, 2);
      }
      const p = sc.player;
      inside = Math.abs(p.x - x) < 6 && Math.abs(p.y - y) < 6 && !sc.effects.hasFlag('flight') ? inside + dt : 0;
      if (inside > 0.4) {
        inside = 0;
        sc.hurtPlayer(1, x, y, { cause: 'un aro de fuego' });
      }
    });
  },
  canon: (t) => {
    const { sc, x, y } = t;
    const im = tall(t, 'canon_pista', 'canon', false);
    if (!im) return;
    // Dispara hacia el centro de la sala por su fila o su columna.
    const horiz = Math.abs(x - 120) > Math.abs(y - 72) * 1.6;
    const dir = horiz ? { x: Math.sign(120 - x), y: 0 } : { x: 0, y: Math.sign(72 - y) };
    let timer = 2 + ((t.idx * 0.37) % 1.5);
    let fuse = -1;
    sc.roomUpdate.push((dt) => {
      if (!im.active || sc.room.cleared) return;
      if (fuse >= 0) {
        fuse -= dt;
        im.setFrame(Math.floor(fuse * 12) % 2);
        if (fuse < 0) {
          sc.shotCause = 'un cañón de pista';
          sc.spawnShot(x + dir.x * 10, y + dir.y * 10, dir.x * 240, dir.y * 240, false, {
            damage: 1, range: 260, texture: 'bala_grande', scale: 1.4,
          });
          sc.shotCause = '';
          sc.snd('canonPista');
          sc.shake(80, 0.004);
          im.setFrame(0);
        }
        return;
      }
      timer -= dt;
      if (timer <= 0) {
        timer = 3.5 + ((t.idx * 0.53) % 1);
        fuse = 1;
        sc.telegraph.line(x, y, x + dir.x * 240, y + dir.y * 240, 1, { w: 10, color: 0xe8743b });
        sc.snd('mecha');
      }
    });
  },
  cinta: ({ sc, x, y, c, r, ch }) => {
    const push = TILES[ch].push!;
    const img = sc.add.sprite(x, y, 'cinta', 0).setDepth(DEPTH.hazard - 0.5);
    img.setAngle(push.x > 0 ? 0 : push.x < 0 ? 180 : push.y > 0 ? 90 : -90);
    sc.roomObjs.push(img);
    sc.floorField.set(c + r * COLS, { x: push.x * 42, y: push.y * 42 });
    sc.roomUpdate.push(() => img.active && img.setFrame(Math.floor(sc.time.now / 90) % 4));
  },
  suelo: () => {},
  tachuelas: ({ sc, x, y }) => {
    sc.roomObjs.push(sc.add.image(x, y, 'tachuelas').setDepth(DEPTH.hazard));
    sc.spikes.push({ x, y });
  },
  jaula: ({ sc, x, y, c, r }) => {
    // Jaula: no se puede pasar, pero los disparos cruzan los barrotes.
    const cage = sc.physics.add.staticImage(x, y, 'jaula').setDepth(DEPTH.world + y - 6);
    cage.setSize(16, 16).refreshBody();
    sc.g.pits.add(cage);
    sc.nav.setBlocked(c, r, true);
  },
  foso: ({ sc, x, y, c, r }) => {
    const pit = sc.physics.add.staticImage(x, y, 'foso').setDepth(DEPTH.hazard);
    pit.setSize(14, 14).refreshBody();
    sc.g.pits.add(pit);
    sc.nav.setBlocked(c, r, true);
  },
};

export { tall };

/** Registra el constructor de una baldosa nueva (lo usan los actos III y IV). */
export function registerTile(kind: TileKind, build: Builder): void {
  BUILDERS[kind] = build;
}

export function buildTile(kind: TileKind, t: TileCtx): void {
  if (OBSTACLE_KINDS.has(kind)) return obstacle(t, OBSTACLE_FOR[kind]!);
  const b = BUILDERS[kind];
  if (!b) throw new Error(`Baldosa sin constructor: ${kind}`);
  b(t);
}
