// Construye cada sala: paredes, puertas, plantilla, salas especiales y jefes.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH, DOOR_POS, ROOM_H, ROOM_W, TILE, tileX, tileY, COLS } from '../config';
import { RoomState, neighborRoom, doorVisible, contractDoorDir, PickupKind, roomKey } from '../core/run';
import { Dir, DIRS } from '../core/floorgen';
import { hashString } from '../core/rng';
import { flipRows } from '../data/rooms/template';
import { TILES } from '../data/tiles';
import { safeSpawns } from '../core/safeEntry';
import { buildTile } from './tiles';
import { spawnBoss } from '../entities/bossRegistry';
import { actDef, findTemplate, creatureAt, isCreatureChar } from '../data/acts';
import { BOSS_NAMES, BOSS_TAGLINES } from '../data/enemies';
import { Champion, EnemyKind } from '../data/enemies';
import { bakeRoomBackground, FloorStyle, DoorStyle } from '../art/sprites/room';
import { txt, setTxt } from '../ui/text';
import { item } from '../data/items';
import { RULETA } from '../data/loot';
import { Controls } from './Controls';

export interface DoorInfo {
  dir: Dir;
  open: boolean;
  locked: boolean;
  target?: RoomState;
}

const BASE_PRICE: Partial<Record<PickupKind, number>> = {
  globo: 3,
  medio_globo: 2,
  globo_plata: 5,
  petardo: 5,
  llave: 5,
  golosina: 4,
};

export function buildRoom(sc: GameScene, room: RoomState): Phaser.GameObjects.Image {
  const act = sc.run.act;
  const style = (actDef(act).floor[room.type] ?? room.type) as FloorStyle;
  // La textura lleva la semilla en la clave (las texturas son de todo el juego y
  // sobreviven entre partidas); el dibujo usa el mismo hash de siempre.
  const legacy = `fondo_${act}_${roomKey(room.x, room.y)}`;
  const key = `fondo_${sc.run.seed}_${act}_${roomKey(room.x, room.y)}`;
  if (!sc.textures.exists(key)) bakeRoomBackground(sc, key, style, hashString(`${sc.run.seed}:${legacy}`));
  const bg = sc.add.image(ROOM_W / 2, ROOM_H / 2, key).setDepth(DEPTH.floor);
  // Las manchas de lo que pasó aquí siguen en el suelo.
  for (const d of room.decals) {
    const m = sc.add.image(d.x, d.y, 'mancha', d.f).setDepth(DEPTH.decal).setScale(d.s);
    if (d.t !== undefined) m.setTint(d.t);
    sc.roomObjs.push(m);
  }

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
  sc.g.gaps.clear(true, true);
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
    // El puesto, el número de riesgo y el almacén se abren con llave.
    const withKey = (t: RoomState['type']) => t === 'puesto' || t === 'reto' || t === 'almacen';
    const locked = !!target && withKey(target.type) && !target.unlocked && room.type !== target.type;
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
    const horiz = dir === 'N' || dir === 'S';
    if (open) {
      // Las criaturas y los recogibles no se escapan por la puerta abierta.
      const gz = sc.add.zone(pos.x, pos.y, horiz ? gap : TILE, horiz ? TILE : gap);
      sc.physics.add.existing(gz, true);
      sc.g.gaps.add(gz);
    } else {
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
  const special: RoomState['type'][] = ['camerino', 'puesto', 'diana', 'barraca', 'pitonisa', 'reto', 'almacen', 'clavos', 'curandero'];
  if (special.includes(target.type)) return target.type as DoorStyle;
  if (special.includes(room.type)) return room.type as DoorStyle;
  return 'normal';
}

function rollChampion(sc: GameScene): Champion | null {
  // La Gira 1+: más campeones; Gira 5: salas malditas (aún más).
  const gira = sc.run.gira;
  const chance = actDef(sc.run.act).champion + sc.stats.luck * 0.005 + (gira >= 1 ? 0.06 : 0) + (gira >= 5 ? 0.08 : 0);
  if (!sc.rngCombat.chance(chance)) return null;
  return sc.rngCombat.pick<Champion>(['rojo', 'amarillo', 'azul', 'dorado']);
}

function buildTemplate(sc: GameScene, room: RoomState): void {
  const def = actDef(sc.run.act);
  const tpl = findTemplate(room.templateId!, sc.run.act)!;
  const rows = flipRows(tpl.rows, room.flipX, room.flipY);
  // Al volver a una sala de "números" a medias, sale la oleada en curso.
  const wave = room.wave ?? 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      const tile = TILES[ch];
      if (tile) buildTile(tile.kind, { sc, room, c, r, idx: c + r * COLS, x: tileX(c), y: tileY(r), ch });
    }
  }
  // Criaturas, apartadas de la puerta por la que entras (entrada segura).
  if (!room.cleared && wave === 0) {
    for (const sp of safeSpawns(rows, (ch) => isCreatureChar(def, ch), sc.entryDir)) {
      sc.spawn(creatureAt(def, room.data, sp.ch)!, tileX(sp.c), tileY(sp.r), rollChampion(sc));
    }
  }
  if (room.cleared) return;
  if (tpl.dark) sc.setDark(true);
  if (tpl.waves?.length) startWaves(sc, room, tpl.waves, wave);
}

/** Salas de "números": oleadas con puntos de aparición avisados y puertas cerradas. */
function startWaves(sc: GameScene, room: RoomState, waves: string[][], resume: number): void {
  const def = actDef(sc.run.act);
  if (resume > 0) spawnWave(sc, room, waves[resume - 1], 0);
  let pending = false;
  sc.clearBlockers.push(() => (room.wave ?? 0) < waves.length || pending);
  sc.roomUpdate.push(() => {
    const done = room.wave ?? 0;
    if (pending || done >= waves.length || sc.clearPending().length > 0 || sc.roomTimeSec < 0.6) return;
    pending = true;
    room.wave = done + 1;
    sc.banner(`Número ${done + 2} de ${waves.length + 1}`, '¡Siguiente número!');
    sc.snd('redoble');
    spawnWave(sc, room, waves[done], 0.7, () => (pending = false));
  });
  void def;
}

function spawnWave(sc: GameScene, room: RoomState, layer: string[], delay: number, onSpawn?: () => void): void {
  const def = actDef(sc.run.act);
  const rows = flipRows(layer, room.flipX, room.flipY);
  const spots: { x: number; y: number; kind: EnemyKind }[] = [];
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const kind = creatureAt(def, room.data, ch);
      if (kind) spots.push({ x: tileX(c), y: tileY(r), kind });
    }),
  );
  for (const sp of spots) if (delay > 0) sc.telegraph.marker(sp.x, sp.y, delay, { color: 0xf2c14e });
  const go = () => {
    for (const sp of spots) {
      const e = sc.spawn(sp.kind, sp.x, sp.y, rollChampion(sc));
      e.wake = 0.25;
    }
    onSpawn?.();
  };
  if (delay > 0) sc.time.delayedCall(delay * 1000, go);
  else go();
}

function buildSpecial(sc: GameScene, room: RoomState): void {
  const first = !room.stocked;
  room.stocked = true;
  const cx = ROOM_W / 2;
  switch (room.type) {
    case 'inicio': {
      // Instrucciones con las teclas (o botones) que use el jugador.
      if (sc.run.act > 1) break;
      const c = Controls.get();
      const g = (a: Parameters<typeof c.glyph>[0]) => c.glyph(a);
      if (c.lastDevice === 'tactil') {
        sc.floorText(cx, 44, 'Palanca izquierda: andar · derecha: lanzar');
        sc.floorText(cx, 104, 'PET petardo · OBJ objeto · GOL golosina');
      } else if (c.lastDevice === 'mando') {
        sc.floorText(cx, 44, 'Stick izquierdo: andar · Y A X B: lanzar');
        sc.floorText(cx, 104, `${g('petardo')} petardo · ${g('activo')} objeto · ${g('golosina')} golosina`);
        sc.floorText(cx, 114, `${g('estadisticas')} mapa · ${g('pausa')} pausa`);
      } else {
        sc.floorText(cx, 44, `${g('arriba')}${g('izquierda')}${g('abajo')}${g('derecha')} andar · Flechas lanzar`);
        sc.floorText(cx, 98, `${g('petardo')} petardo · ${g('activo')} objeto`);
        sc.floorText(cx, 108, `${g('golosina')} golosina · ${g('estadisticas')} mapa`);
        sc.floorText(cx, 118, `${g('pausa')} pausa`);
      }
      break;
    }
    case 'camerino':
      if (first) sc.addPedestal(cx, tileY(3), sc.preItem(room, 0, 'camerino'));
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
        [tileX(4), tileX(8)].forEach((x, i) => {
          const id = sc.preItem(room, i, 'puesto')!;
          sc.addPedestal(x, tileY(2) + 4, id, { price: sc.itemPrice(id) });
        });
        const kinds: PickupKind[] = sc.rngLoot.shuffle<PickupKind>(['globo', 'petardo', 'llave', 'golosina', 'globo_plata']).slice(0, 3);
        kinds.forEach((k, i) => sc.spawnPickup(k, tileX(3 + i * 3), tileY(4) + 4, { price: sc.price(BASE_PRICE[k]!) }));
      }
      buildRestock(sc, room);
      break;
    }
    case 'secreta':
      // La trastienda (segunda secreta): premio seguro.
      if (room.data.super) {
        sc.floorText(cx, 22, 'Trastienda', 0xc9b3ef, 0.6);
        if (first) {
          sc.meta('trastienda');
          sc.addPedestal(cx, tileY(3), sc.preItem(room, 0, 'secreta'));
          sc.spawnPickup('globo_plata', tileX(3), tileY(4));
          sc.spawnPickup('taco_boletos', tileX(9), tileY(4));
        }
        break;
      }
      sc.floorText(cx, 22, 'Entre bastidores', 0xc9b3ef, 0.5);
      if (first) {
        const hasItem = room.data.secretItem !== undefined ? !!room.data.secretItem : sc.rngItems.chance(0.6);
        if (hasItem) sc.addPedestal(cx, tileY(3), sc.preItem(room, 0, 'secreta'));
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
    case 'pitonisa':
      buildPitonisa(sc, room);
      break;
    case 'reto':
      sc.floorText(cx, 22, 'Número de riesgo', 0xe8743b, 0.7);
      if (first) sc.addPedestal(cx, tileY(3), sc.preItem(room, 0, 'camerino'));
      if (!room.data.started) sc.floorText(cx, tileY(5) + 4, 'Si lo coges, empieza el número', 0xefe6d8, 0.5);
      break;
    case 'barraca':
      buildBarraca(sc, room);
      break;
    case 'almacen':
      sc.floorText(cx, 22, 'Almacén de atrezo', 0xa8673b, 0.7);
      if (first) {
        sc.spawnPickup('cofre', tileX(4), tileY(3));
        sc.spawnPickup('cofre_candado', tileX(6), tileY(3));
        sc.spawnPickup('cofre', tileX(8), tileY(3));
        if (sc.rngLoot.chance(0.3)) sc.spawnPickup('taco_boletos', cx, tileY(5));
      }
      break;
    case 'clavos':
      buildClavos(sc, room);
      break;
    case 'curandero':
      sc.floorText(cx, 22, 'Carromato del Curandero', 0x7fd1b9, 0.7);
      if (first) {
        sc.spawnPickup('globo', tileX(3), tileY(3) + 4);
        sc.spawnPickup('globo', tileX(6), tileY(3) + 4, { price: sc.price(4) });
        sc.spawnPickup('globo_plata', tileX(9), tileY(3) + 4, { price: sc.price(6) });
        sc.floorText(tileX(3), tileY(4) + 4, 'Gratis', 0x7fd1b9, 0.6);
      }
      break;
    case 'jefe':
      if (!room.cleared) {
        const boss = sc.run.boss;
        sc.bossIds = spawnBoss(sc, boss, cx);
        sc.banner(BOSS_NAMES[boss], BOSS_TAGLINES[boss]);
      } else if (room.data.finalOpen) {
        sc.addFinale();
      } else {
        sc.addTrapdoor();
      }
      break;
    case 'contrato': {
      const m = sc.add.image(cx, tileY(1), 'cartel_maestro').setDepth(DEPTH.world + tileY(1));
      sc.roomObjs.push(m);
      sc.tweens.add({ targets: m, y: m.y - 2, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      sc.floorText(cx, tileY(5) + 2, 'Firma aquí. Letra pequeña.', 0xd4323f, 0.8);
      if (first) {
        for (const [i, x] of [tileX(4), tileX(8)].entries()) {
          // Si la reserva se ha agotado no hay pedestal (antes salía un calcetín gratis).
          const id = sc.preItem(room, i, 'contrato');
          if (!id) break;
          sc.addPedestal(x, tileY(3), id, { contractCost: item(id).contractCost ?? 0 });
        }
      }
      break;
    }
  }
}

/** Campanilla del puesto: por 5 boletos, el tendero repone lo que falte (una vez). */
function buildRestock(sc: GameScene, room: RoomState): void {
  const x = tileX(11),
    y = tileY(5);
  const bell = sc.add.image(x, y, 'estrella').setDepth(DEPTH.decal).setScale(1.5).setAlpha(room.data.restocked ? 0.2 : 0.8);
  sc.roomObjs.push(bell);
  sc.floorText(x, y + 8, room.data.restocked ? '-' : 'Reponer 5', 0x79b84a, 0.7);
  let cd = 0.6;
  sc.roomUpdate.push((dt) => {
    cd -= dt;
    if (cd > 0 || room.data.restocked) return;
    if (Phaser.Math.Distance.Between(sc.player.x, sc.player.y, x, y) > 9) return;
    cd = 1;
    const st = sc.run.player;
    const price = sc.price(5);
    if (st.tickets < price) {
      sc.banner('Faltan boletos', `Reponer cuesta ${price}`);
      sc.snd('error');
      return;
    }
    st.tickets -= price;
    room.data.restocked = true;
    bell.setAlpha(0.2);
    sc.snd('compra');
    const kinds = sc.rngLoot.shuffle<PickupKind>(['globo', 'petardo', 'llave', 'golosina', 'globo_plata']).slice(0, 3);
    kinds.forEach((k, i) => sc.spawnPickup(k, tileX(3 + i * 3), tileY(4) + 4, { price: sc.price(BASE_PRICE[k]!) }));
    sc.banner('¡Género nuevo!', 'El tendero repone el puesto');
  });
}

/** Gabinete de la Pitonisa: por 5 boletos, una lectura (mapa, golosinas o jefe). */
function buildPitonisa(sc: GameScene, room: RoomState): void {
  const cx = ROOM_W / 2;
  sc.floorText(cx, 22, 'Gabinete de la Pitonisa', 0xc9b3ef, 0.7);
  // Si venciste a Madame Fortuna, el gabinete está cerrado por defunción.
  if (sc.run.beaten.includes('fortuna')) {
    sc.floorText(cx, tileY(2), 'Cerrado por defunción', 0x8a8394, 0.8);
    if (!room.data.gift) {
      room.data.gift = true;
      sc.spawnPickup('golosina', cx, tileY(3));
    }
    return;
  }
  const npc = sc.add.sprite(cx, tileY(1), 'fortuna', 0).setDepth(DEPTH.world + tileY(1));
  sc.roomObjs.push(npc);
  sc.tweens.add({ targets: npc, y: npc.y - 2, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
  const readings: { key: string; label: string; x: number; run: () => void }[] = [
    {
      key: 'mapa', label: 'Mapa', x: tileX(3),
      run: () => {
        sc.run.mapRevealed = true;
        sc.banner('La carpa entera', 'Tu mapa ya no tiene secretos');
      },
    },
    {
      key: 'golosinas', label: 'Golosinas', x: tileX(6),
      run: () => {
        for (const e of Object.values(sc.run.golosinaMap)) if (!sc.run.golosinaKnown.includes(e)) sc.run.golosinaKnown.push(e);
        sc.banner('Las golosinas', 'Ya sabes qué hace cada color');
      },
    },
    {
      key: 'jefe', label: 'Jefe', x: tileX(9),
      run: () => sc.banner(`Te espera ${BOSS_NAMES[sc.run.boss]}`, BOSS_TAGLINES[sc.run.boss]),
    },
  ];
  for (const r of readings) {
    const used = !!room.data[`lectura_${r.key}`];
    const star = sc.add.image(r.x, tileY(4), 'estrella').setDepth(DEPTH.decal).setScale(2).setAlpha(used ? 0.2 : 0.7);
    sc.roomObjs.push(star);
    sc.floorText(r.x, tileY(5) + 2, used ? '-' : `${r.label} 5`, 0xc9b3ef, 0.7);
  }
  let cd = 0.6;
  sc.roomUpdate.push((dt) => {
    cd -= dt;
    if (cd > 0) return;
    const p = sc.player;
    const r = readings.find((q) => Phaser.Math.Distance.Between(p.x, p.y, q.x, tileY(4)) < 9);
    if (!r || room.data[`lectura_${r.key}`]) return;
    cd = 1;
    const st = sc.run.player;
    if (st.tickets < 5) {
      sc.banner('Faltan boletos', 'La pitonisa cobra 5');
      sc.snd('error');
      return;
    }
    st.tickets -= 5;
    room.data[`lectura_${r.key}`] = true;
    npc.setFrame(2);
    sc.snd('carta');
    sc.time.delayedCall(400, () => npc.setFrame(0));
    r.run();
  });
}

/**
 * La Cama de Clavos: quedarse 1 s tumbado encima cuesta medio globo y da un
 * premio cada vez mejor (boletos, cofre y, la tercera, un objeto). Luego, nada.
 */
function buildClavos(sc: GameScene, room: RoomState): void {
  const cx = ROOM_W / 2,
    cy = tileY(3);
  const bed = sc.add.image(cx, cy, 'cama_clavos').setDepth(DEPTH.decal + 1);
  sc.roomObjs.push(bed);
  sc.floorText(cx, 22, 'La Cama de Clavos', 0xa3a0ad, 0.7);
  const uses = () => (room.data.uses as number) ?? 0;
  const done = () => uses() >= 3;
  const hint = txt(sc, cx, tileY(5) + 4, done() ? 'El faquir ya no quiere verte' : 'Túmbate un segundo', 0xa3a0ad, 'center').setDepth(DEPTH.decal);
  sc.roomObjs.push(hint);
  if (done()) bed.setTint(0x777777);
  let on = 0;
  sc.roomUpdate.push((dt) => {
    if (done()) return;
    const p = sc.player;
    const lying = Math.abs(p.x - cx) < 22 && Math.abs(p.y - cy) < 8;
    on = lying ? on + dt : 0;
    bed.setTint(lying ? 0xffd0d0 : 0xffffff);
    if (on < 1) return;
    on = -1.2; // un respiro antes de la siguiente vez
    const st = sc.run.player;
    if (st.hp + st.shield <= 1) {
      sc.banner('Estás muy débil', 'El faquir no te deja tumbarte');
      sc.snd('error');
      return;
    }
    sc.player.invuln = 0;
    sc.hurtPlayer(1, p.x, p.y, { cause: 'la cama de clavos' });
    const n = uses() + 1;
    room.data.uses = n;
    const at = { x: cx, y: tileY(5) };
    if (n === 1) sc.spawnPickup('taco_boletos', at.x, at.y, { burst: true });
    else if (n === 2) sc.spawnPickup('cofre', at.x, at.y);
    else {
      const id = sc.preItem(room, 0, 'camerino');
      if (id) sc.addPedestal(tileX(10), tileY(1), id);
      else for (const dx of [-12, 12]) sc.spawnPickup('globo_plata', at.x + dx, at.y);
      setTxt(hint, 'El faquir ya no quiere verte');
      bed.setTint(0x777777);
    }
    sc.snd('premio');
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
  // Aviso: perder globos rojos aquí cierra El Contrato (los de plata no).
  if (actDef(sc.run.act).contract) sc.floorText(cx, 116, 'Los globos rojos cuentan para El Maestro', 0x8a8394, 0.5);
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
      const out = sc.rngLoot.weighted<string>(RULETA);
      const at = { x: cx, y: tileY(3) };
      switch (out) {
        case 'nada':
          sc.banner('¡Casi!', 'Vuelve a intentarlo');
          return;
        case 'boletos':
          sc.spawnPickup('taco_boletos', at.x, at.y, { burst: true });
          break;
        case 'gordo':
          sc.meta('gordo');
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
