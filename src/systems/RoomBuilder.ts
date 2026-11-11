// Construye cada sala: paredes, puertas, plantilla, salas especiales y jefes.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH, DOOR_POS, ROOM_H, ROOM_W, TILE, tileX, tileY, COLS } from '../config';
import { RoomState, neighborRoom, doorVisible, contractDoorDir, PickupKind, roomKey } from '../core/run';
import { Dir, DIRS } from '../core/floorgen';
import { hashString } from '../core/rng';
import { ACTO1_ROOMS, flipRows } from '../data/rooms/acto1';
import { TEMPLATE_ENEMY, Champion } from '../data/enemies';
import { bakeRoomBackground, FloorStyle, DoorStyle } from '../art/sprites/room';
import { Obstacle, ObstacleKind } from '../entities/props';
import { spawnCreature } from '../entities/creatures';
import { Forzudo, spawnSiameses, Siames } from '../entities/bosses';
import { txt } from '../ui/text';
import { item } from '../data/items';

export interface DoorInfo {
  dir: Dir;
  open: boolean;
  locked: boolean;
  target?: RoomState;
}

const OBSTACLE_CHARS: Record<string, ObstacleKind> = {
  C: 'cajon',
  X: 'cajon_marcado',
  M: 'bloque',
  P: 'palomitas',
  F: 'brasero',
};

const BASE_PRICE: Partial<Record<PickupKind, number>> = {
  globo: 3,
  medio_globo: 2,
  globo_plata: 5,
  petardo: 5,
  llave: 5,
  golosina: 4,
};

export function buildRoom(sc: GameScene, room: RoomState): Phaser.GameObjects.Image {
  const style = (room.type === 'normal' ? 'normal' : room.type) as FloorStyle;
  const key = `fondo_${roomKey(room.x, room.y)}`;
  if (!sc.textures.exists(key)) bakeRoomBackground(sc, key, style, hashString(`${sc.run.seed}:${key}`));
  const bg = sc.add.image(ROOM_W / 2, ROOM_H / 2, key).setDepth(DEPTH.floor);

  if (room.type === 'normal' && room.templateId) buildTemplate(sc, room);
  buildSpecial(sc, room);

  // Lo que quedó en el suelo y en los taburetes.
  for (const p of room.pickups) {
    let price = p.price;
    if (price && room.type === 'puesto' && BASE_PRICE[p.kind]) price = sc.price(BASE_PRICE[p.kind]!);
    sc.spawnPickup(p.kind, p.x, p.y, { price, color: p.color });
  }
  for (const p of room.pedestals) {
    const price = p.price && p.item ? sc.itemPrice(p.item) : undefined;
    sc.addPedestal(p.x, p.y, p.item, { price, contractCost: p.contractCost });
  }
  room.pickups = [];
  room.pedestals = [];

  rebuildDoors(sc);
  return bg;
}

/** Paredes y puertas (se rehace al abrir puertas o descubrir secretos). */
export function rebuildDoors(sc: GameScene): void {
  const room = sc.room;
  sc.g.walls.clear(true, true);
  sc.g.doors.clear(true, true);
  for (const o of sc.doorObjs) o.destroy();
  sc.doorObjs = [];
  sc.doors = [];

  const wall = (x: number, y: number, w: number, h: number) => {
    const z = sc.add.zone(x + w / 2, y + h / 2, w, h);
    sc.physics.add.existing(z, true);
    sc.g.walls.add(z);
  };
  const gap = 16;
  const visible = (d: Dir) => doorVisible(sc.run, room, d);
  // Arriba / abajo
  for (const [d, y] of [['N', 0], ['S', ROOM_H - TILE]] as [Dir, number][]) {
    if (visible(d)) {
      wall(0, y, ROOM_W / 2 - gap / 2, TILE);
      wall(ROOM_W / 2 + gap / 2, y, ROOM_W / 2 - gap / 2, TILE);
    } else wall(0, y, ROOM_W, TILE);
  }
  for (const [d, x] of [['W', 0], ['E', ROOM_W - TILE]] as [Dir, number][]) {
    if (visible(d)) {
      wall(x, TILE, TILE, ROOM_H / 2 - TILE - gap / 2);
      wall(x, ROOM_H / 2 + gap / 2, TILE, ROOM_H / 2 - TILE - gap / 2);
    } else wall(x, TILE, TILE, ROOM_H - 2 * TILE);
  }

  for (const dir of DIRS) {
    if (!visible(dir)) {
      // Pista de pared secreta: una grieta.
      const other = neighborRoom(sc.run, room, dir);
      if (room.doors.includes(dir) && other && (other.type === 'secreta' || room.type === 'secreta')) {
        const pos = DOOR_POS[dir];
        const hint = sc.add.image(pos.x, pos.y, 'grieta').setDepth(DEPTH.decal + 1).setAlpha(0.8);
        sc.doorObjs.push(hint);
      }
      continue;
    }
    const isContract = room.type === 'jefe' && sc.run.contractOpen && dir === contractDoorDir(sc.run);
    const target = isContract ? sc.run.contract : neighborRoom(sc.run, room, dir);
    const style = doorStyle(room, target, isContract);
    const locked = !!target && target.type === 'puesto' && !target.unlocked && room.type !== 'puesto';
    const isSecret = style === 'secreta';
    const open = (room.cleared || isSecret) && !locked;
    const info: DoorInfo = { dir, open, locked, target };
    sc.doors.push(info);

    const pos = DOOR_POS[dir];
    const angle = { N: 0, S: 180, W: -90, E: 90 }[dir];
    const spr = sc.add.sprite(pos.x, pos.y, `puerta_${style}`, open ? 0 : 1).setAngle(angle).setDepth(DEPTH.decal + 2);
    sc.doorObjs.push(spr);
    if (locked) {
      const lock = sc.add.image(pos.x, pos.y + (dir === 'N' ? 2 : dir === 'S' ? -2 : 0), 'candado').setDepth(DEPTH.decal + 3);
      sc.doorObjs.push(lock);
    }
    if (!open) {
      const horiz = dir === 'N' || dir === 'S';
      const z = sc.add.zone(pos.x, pos.y, horiz ? gap : TILE, horiz ? TILE : gap);
      sc.physics.add.existing(z, true);
      z.setData('door', info);
      sc.g.doors.add(z);
    }
  }
}

function doorStyle(room: RoomState, target: RoomState | undefined, contract: boolean): DoorStyle {
  if (contract || room.type === 'contrato') return 'contrato';
  if (!target) return 'normal';
  if (target.type === 'secreta' || room.type === 'secreta') return 'secreta';
  if (room.type === 'jefe' || target.type === 'jefe') return 'jefe';
  const special: RoomState['type'][] = ['camerino', 'puesto', 'diana', 'barraca'];
  if (special.includes(target.type)) return target.type as DoorStyle;
  if (special.includes(room.type)) return room.type as DoorStyle;
  return 'normal';
}

function rollChampion(sc: GameScene): Champion | null {
  const chance = 0.07 + sc.stats.luck * 0.005;
  if (!sc.rngCombat.chance(chance)) return null;
  return sc.rngCombat.pick<Champion>(['rojo', 'amarillo', 'azul', 'dorado']);
}

function buildTemplate(sc: GameScene, room: RoomState): void {
  const tpl = ACTO1_ROOMS.find((t) => t.id === room.templateId)!;
  const rows = flipRows(tpl.rows, room.flipX, room.flipY);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      const idx = c + r * COLS;
      const x = tileX(c),
        y = tileY(r);
      const ob = OBSTACLE_CHARS[ch];
      if (ob) {
        if (room.destroyed.includes(idx)) continue;
        const hits = room.damaged[idx] ?? 0;
        const o = new Obstacle(sc, x, y, ob, idx, hits);
        if (ob === 'brasero' && hits >= 4) {
          o.extinguished = true;
          o.setTexture('brasero_apagado');
        }
        sc.nav.setBlocked(c, r, true);
      } else if (ch === 'T') {
        sc.roomObjs.push(sc.add.image(x, y, 'tachuelas').setDepth(DEPTH.hazard));
        sc.spikes.push({ x, y });
      } else if (ch === 'O') {
        const pit = sc.physics.add.staticImage(x, y, 'foso').setDepth(DEPTH.hazard);
        pit.setSize(14, 14).refreshBody();
        sc.g.pits.add(pit);
        sc.nav.setBlocked(c, r, true);
      } else if (TEMPLATE_ENEMY[ch] && !room.cleared) {
        spawnCreature(sc, TEMPLATE_ENEMY[ch], x, y, rollChampion(sc));
      }
    }
  }
}

function buildSpecial(sc: GameScene, room: RoomState): void {
  const first = !room.stocked;
  room.stocked = true;
  const cx = ROOM_W / 2;
  switch (room.type) {
    case 'inicio':
      sc.floorText(cx, 44, 'WASD andar · Flechas lanzar');
      sc.floorText(cx, 104, 'E petardo · Espacio objeto');
      sc.floorText(cx, 114, 'Q golosina · Esc pausa');
      break;
    case 'camerino':
      if (first) sc.addPedestal(cx, tileY(3), sc.drawItem('camerino'));
      sc.floorText(cx, 22, 'Camerino', 0xf2c14e, 0.6);
      break;
    case 'puesto': {
      sc.floorText(cx, 22, 'Puesto de feria', 0x79b84a, 0.8);
      const awning = sc.add.graphics().setDepth(DEPTH.decal);
      for (let i = 0; i < 12; i++) {
        awning.fillStyle(i % 2 ? 0xefe6d8 : 0x3f6b2a, 1);
        awning.fillRect(48 + i * 12, 30, 12, 6);
      }
      sc.roomObjs.push(awning);
      if (first) {
        for (const x of [tileX(4), tileX(8)]) {
          const id = sc.drawItem('puesto');
          sc.addPedestal(x, tileY(2) + 4, id, { price: sc.itemPrice(id) });
        }
        const kinds: PickupKind[] = sc.rngLoot.shuffle<PickupKind>(['globo', 'petardo', 'llave', 'golosina', 'globo_plata']).slice(0, 3);
        kinds.forEach((k, i) => sc.spawnPickup(k, tileX(3 + i * 3), tileY(4) + 4, { price: sc.price(BASE_PRICE[k]!) }));
      }
      break;
    }
    case 'secreta':
      sc.floorText(cx, 22, 'Entre bastidores', 0xc9b3ef, 0.5);
      if (first) {
        if (sc.rngItems.chance(0.6)) sc.addPedestal(cx, tileY(3), sc.drawItem('secreta'));
        else {
          for (let i = 0; i < 6; i++) sc.spawnPickup('boleto', cx + sc.rngLoot.int(-24, 24), tileY(3) + sc.rngLoot.int(-12, 12));
          sc.spawnPickup('taco_boletos', cx, tileY(3));
          sc.spawnPickup('petardo', cx + 20, tileY(4));
        }
      }
      break;
    case 'diana':
      buildDiana(sc, room);
      break;
    case 'barraca':
      buildBarraca(sc, room);
      break;
    case 'jefe':
      if (!room.cleared) {
        sc.bossIds = sc.run.boss === 'forzudo' ? [new Forzudo(sc, cx, 54)] : spawnSiameses(sc, cx, 54);
        if (sc.run.boss === 'siameses') addRope(sc, sc.bossIds as Siames[]);
        sc.banner(sc.run.boss === 'forzudo' ? 'El Forzudo' : 'Los Siameses', sc.run.boss === 'forzudo' ? 'Levanta pianos. Y payasos.' : 'Dos cabezas, ningún corazón');
      } else if (!room.data.trapdoorGone) {
        sc.addTrapdoor();
      }
      break;
    case 'contrato': {
      const m = sc.add.image(cx, tileY(1), 'cartel_maestro').setDepth(DEPTH.world + tileY(1));
      sc.roomObjs.push(m);
      sc.tweens.add({ targets: m, y: m.y - 2, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      sc.floorText(cx, tileY(5) + 2, 'Firma aquí. Letra pequeña.', 0xd4323f, 0.8);
      if (first) {
        for (const x of [tileX(4), tileX(8)]) {
          const id = sc.drawItem('contrato');
          sc.addPedestal(x, tileY(3), id, { contractCost: item(id).contractCost ?? 0 });
        }
      }
      break;
    }
  }
}

function addRope(sc: GameScene, twins: Siames[]): void {
  const gfx = sc.add.graphics().setDepth(DEPTH.world - 1);
  sc.roomObjs.push(gfx);
  sc.roomUpdate.push(() => {
    gfx.clear();
    const [a, b] = twins;
    if (!a.active || !b.active || a.dead || b.dead) return;
    const x0 = a.x, y0 = a.y + 2, x1 = b.x, y1 = b.y + 2;
    // Cuerda con algo de comba.
    const sag = Math.max(0, 30 - Phaser.Math.Distance.Between(x0, y0, x1, y1) * 0.3);
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x0, y0),
      new Phaser.Math.Vector2((x0 + x1) / 2, (y0 + y1) / 2 + sag),
      new Phaser.Math.Vector2(x1, y1),
    );
    gfx.lineStyle(2, 0xa8673b, 1);
    curve.draw(gfx, 16);
    gfx.lineStyle(1, 0x6b3e26, 1);
    curve.draw(gfx, 16);
    // La cuerda hace daño (está llena de clavos).
    const pts = curve.getPoints(12);
    const p = sc.player;
    for (const pt of pts) {
      if (Math.abs(pt.x - p.x) < 5 && Math.abs(pt.y - p.y) < 5) {
        sc.hurtPlayer(1, pt.x, pt.y);
        break;
      }
    }
  });
}

/** Diana del lanzacuchillos: haz de voluntario y gana premios (si sobrevives). */
function buildDiana(sc: GameScene, room: RoomState): void {
  const cx = ROOM_W / 2;
  const board = sc.add.sprite(cx, tileY(1) - 2, 'diana', 0).setDepth(DEPTH.world + tileY(0));
  const npc = sc.add.sprite(cx, tileY(5), 'lanzacuchillos', 0).setDepth(DEPTH.world + tileY(5)).setFlipY(false);
  const mark = sc.add.image(cx, tileY(2) + 6, 'estrella').setDepth(DEPTH.decal).setScale(2).setAlpha(0.7);
  sc.roomObjs.push(board, npc, mark);
  sc.floorText(cx, 106, 'Ponte en la estrella', 0xf2a3b5, 0.6);
  let cd = 0.8;
  let busy = false;
  sc.roomUpdate.push((dt) => {
    cd -= dt;
    if (busy || cd > 0) return;
    const p = sc.player;
    if (Phaser.Math.Distance.Between(p.x, p.y, mark.x, mark.y) > 9) return;
    busy = true;
    npc.setFrame(1);
    sc.time.delayedCall(380, () => {
      const knife = sc.add.image(npc.x, npc.y - 6, 'cuchillo_enemigo').setDepth(DEPTH.shot).setRotation(-Math.PI / 2);
      sc.snd('cuchillo');
      // El vuelo del cuchillo es solo visual; el resultado va por el reloj del juego.
      sc.tweens.add({ targets: knife, x: p.x, y: p.y - 6, duration: 150 });
      sc.time.delayedCall(160, () => {
        knife.destroy();
        npc.setFrame(0);
        busy = false;
        cd = 1.3;
        const st = sc.run.player;
        if (st.hp + st.shield <= 1) {
          sc.banner('¡Por los pelos!', 'Hoy no es tu día de suerte. O sí.');
          return;
        }
        sc.player.invuln = 0;
        sc.hurtPlayer(1, p.x, p.y - 10);
        const uses = ((room.data.uses as number) ?? 0) + 1;
        room.data.uses = uses;
        dianaPrize(sc, room, uses);
      });
    });
  });
}

function dianaPrize(sc: GameScene, room: RoomState, uses: number): void {
  const r = sc.rngLoot.next();
  const spot = { x: ROOM_W / 2 + sc.rngLoot.int(-30, 30), y: tileY(3) + 4 };
  const itemOnce = () => {
    if (room.data.itemGiven) return false;
    room.data.itemGiven = true;
    sc.addPedestal(tileX(3), tileY(3), sc.drawItem('camerino'));
    return true;
  };
  let got = true;
  if (uses === 1) r < 0.5 ? sc.spawnPickup('boleto', spot.x, spot.y, { burst: true }) : (got = false);
  else if (uses === 2) r < 0.5 ? sc.spawnPickup('globo_plata', spot.x, spot.y, { burst: true }) : (got = false);
  else if (uses === 3) r < 0.5 ? sc.spawnPickup('cofre', spot.x, spot.y) : (got = false);
  else if (uses === 4) {
    if (!(r < 0.4 && itemOnce())) sc.spawnPickup('taco_boletos', spot.x, spot.y, { burst: true });
  } else {
    if (r < 0.2 && itemOnce()) {
      /* objeto */
    } else if (r < 0.5) sc.spawnPickup('cofre_candado', spot.x, spot.y);
    else if (r < 0.8) sc.spawnPickup('taco_boletos', spot.x, spot.y, { burst: true });
    else got = false;
  }
  if (got) sc.snd('premio');
  else sc.banner('Nada', 'El público se ríe de ti');
}

/** Barraca de juegos: ruleta de la fortuna a 3 boletos la tirada. */
function buildBarraca(sc: GameScene, room: RoomState): void {
  const cx = ROOM_W / 2;
  const wheel = sc.add.sprite(cx, tileY(1) + 2, 'ruleta', 0).setDepth(DEPTH.world + tileY(1));
  const spot = sc.add.image(cx, tileY(4), 'estrella').setDepth(DEPTH.decal).setScale(2).setAlpha(0.7);
  sc.roomObjs.push(wheel, spot);
  const label = txt(sc, cx, tileY(4) + 10, room.data.broken ? 'Rota' : '3 boletos', 0xf2c14e, 'center').setDepth(DEPTH.decal);
  sc.roomObjs.push(label);
  if (room.data.broken) wheel.setTint(0x555055);
  let cd = 0.6;
  let spinning = false;
  sc.roomUpdate.push((dt) => {
    cd -= dt;
    if (spinning || cd > 0 || room.data.broken) return;
    const p = sc.player;
    if (Phaser.Math.Distance.Between(p.x, p.y, spot.x, spot.y) > 9) return;
    const st = sc.run.player;
    if (st.tickets < 3) {
      cd = 1;
      sc.banner('Faltan boletos', 'La ruleta cuesta 3');
      sc.snd('error');
      return;
    }
    st.tickets -= 3;
    spinning = true;
    sc.snd('ruleta');
    let f = 0;
    const tick = () => {
      f++;
      wheel.setFrame(f % 4);
      if (f < 22) sc.time.delayedCall(30 + f * 4, tick);
    };
    tick();
    sc.time.delayedCall(1500, () => {
      spinning = false;
      cd = 0.9;
      const out = sc.rngLoot.weighted<string>([
        { value: 'nada', weight: 30 },
        { value: 'boletos', weight: 15 },
        { value: 'globo', weight: 14 },
        { value: 'petardo', weight: 12 },
        { value: 'llave', weight: 12 },
        { value: 'golosina', weight: 10 },
        { value: 'cofre', weight: 5 },
        { value: 'gordo', weight: 3 },
      ]);
      const at = { x: cx, y: tileY(3) };
      switch (out) {
        case 'nada':
          sc.banner('¡Casi!', 'Vuelve a intentarlo');
          return;
        case 'boletos':
          sc.spawnPickup('taco_boletos', at.x, at.y, { burst: true });
          break;
        case 'gordo':
          room.data.broken = true;
          wheel.setTint(0x555055);
          label.setText('ROTA');
          sc.addPedestal(tileX(9), tileY(3), sc.drawItem('barraca'));
          sc.banner('¡Premio gordo!', 'La ruleta ha reventado');
          sc.confetti(at.x, at.y, 30);
          break;
        default:
          sc.spawnPickup(out as PickupKind, at.x, at.y, { burst: true });
      }
      sc.snd('premio');
    });
  });
}
