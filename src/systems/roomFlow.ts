// Código de GameScene (flujo de salas, jefe y final).
// Son funciones con `this: GameScene`: la escena las usa como métodos propios.
import type { GameScene } from '../scenes/GameScene';
import Phaser from 'phaser';
import { DEPTH, DOOR_POS, ROOM_H, ROOM_W, tileX, tileY } from '../config';
import { neighborRoom, PickupKind, RoomState, contractDoorDir, bossRoom, advanceAct } from '../core/run';
import { actDef, findTemplate } from '../data/acts';
import { Dir, OPPOSITE } from '../core/floorgen';
import { Nav } from '../systems/Nav';
import { buildRoom, rebuildDoors } from '../systems/RoomBuilder';
import { BOSS_EXTRA, CLEAR_NOTHING, DROP_RANDOM } from '../data/loot';
import { BOSS_NAMES, BOSS_TAGLINES } from '../data/enemies';
import type { EnemyKind } from '../data/enemies';
import { playMusic } from '../audio/music';
import { settings } from '../core/save';
import { saveRun } from '../core/runSave';
import { logRoom } from '../core/telemetry';

export function enterRoom(this: GameScene, room: RoomState, from: Dir | null): void {
  this.clearRoom();
  this.room = room;
  this.run.cur = { x: room.x, y: room.y };
  this.run.entry = from;
  // Punto de guardado: al entrar, antes de construir la sala.
  if (!this.player.dead) saveRun(this.run);
  const firstVisit = !room.visited;
  room.visited = true;
  this.entryDir = from;
  this.bg = buildRoom(this, room);
  this.roomTime = 0;
  this.roomHurt = false;
  this.roomHurtHalves = 0;

  // Posición de entrada.
  if (from) {
    const pos = DOOR_POS[from];
    const inward = { N: [0, 22], S: [0, -20], W: [22, 0], E: [-22, 0] }[from];
    this.player.setPosition(pos.x + inward[0], pos.y + inward[1]);
  } else {
    this.player.setPosition(ROOM_W / 2, ROOM_H / 2 + 22);
  }
  for (const f of this.familiars) f.reset();
  this.player.invuln = Math.max(this.player.invuln, 0.3);
  // Entrada segura: nada te muerde nada más cruzar la puerta.
  for (const e of this.clearPending()) {
    if (e.isBoss) continue;
    const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
    // La plantilla ya las apartó (core/safeEntry); además, las cercanas tardan más en reaccionar.
    if (d < 56) e.wake += 0.6;
  }
  if (!room.cleared && from) this.slamDoors();
  // Traje de Fiera: un rugido al entrar asusta a las fieras.
  if (!room.cleared && this.effects.hasFlag('rugido')) {
    this.time.delayedCall(250, () => {
      this.shockwave(this.player.x, this.player.y);
      this.snd('pisoton');
      for (const e of this.targets()) if (!e.isBoss) e.fearT = Math.max(e.fearT, 1.4);
    });
  }

  const isBossFight = room.type === 'jefe' && !room.cleared;
  playMusic(isBossFight ? actDef(this.run.act).bossMusic : actDef(this.run.act).music);
  if (isBossFight && firstVisit) {
    this.snd('jefe');
    this.shake(400, 0.006);
    const b = this.bossIds[0];
    if (b) {
      this.bossIntro = {
        name: BOSS_NAMES[this.run.boss], tagline: BOSS_TAGLINES[this.run.boss], texture: b.texture.key,
        t: 0, dur: 1.6, started: false,
      };
      // El cartel sustituye al aviso normal.
      this.banners = this.banners.filter((x) => x.title !== BOSS_NAMES[this.run.boss]);
    }
  }
  if (room.type === 'contrato' && firstVisit) this.snd('contrato');
}

/** Portazo al entrar en una sala hostil: las puertas se ven abiertas y se cierran. */
export function slamDoors(this: GameScene): void {
  const sprites = this.doorObjs.filter((o): o is Phaser.GameObjects.Sprite => o instanceof Phaser.GameObjects.Sprite && o.texture.key.startsWith('puerta_') && o.frame.name === '1');
  for (const s of sprites) s.setFrame(0);
  this.time.delayedCall(220, () => {
    for (const s of sprites) {
      if (!s.active) continue;
      s.setFrame(1);
      this.fx.dust(s.x, s.y, 4);
    }
    if (sprites.length) {
      this.snd('portazo');
      this.shake(80, 0.004);
    }
  });
}

export function clearRoom(this: GameScene): void {
  if (this.room) this.saveRoom();
  const g = this.g;
  for (const grp of [g.walls, g.doors, g.gaps, g.solids, g.altos, g.pits, g.pedestals]) grp.clear(true, true);
  for (const grp of [g.pShots, g.eShots, g.enemies, g.pickups, g.bombs]) grp.clear(true, true);
  for (const p of this.pedestals) p.destroy();
  this.pedestals = [];
  for (const h of this.hazards) h.destroy();
  this.hazards = [];
  this.spikes = [];
  for (const o of this.roomObjs) o.destroy();
  this.roomObjs = [];
  for (const o of this.doorObjs) o.destroy();
  this.doorObjs = [];
  this.roomUpdate = [];
  this.telegraph.clear();
  this.fx.clear();
  this.dark = null;
  this.zones = [];
  this.floorField.clear();
  this.wallReflect = false;
  this.clearBlockers = [];
  this.fireListeners = [];
  for (const f of this.tempFamiliars) f.destroy();
  this.tempFamiliars = [];
  this.doors = [];
  this.trapdoor = null;
  this.finale = null;
  this.bossIds = [];
  this.effects.clearRoomStuff();
  this.bg?.destroy();
  this.bg = null;
  this.time.removeAllEvents();
  this.floatCount = 0;
  this.nav = new Nav();
}

/** Guarda lo que queda en el suelo para cuando se vuelva. */
export function saveRoom(this: GameScene): void {
  const r = this.room;
  r.pickups = this.pickupsList()
    .filter((p) => !p.opened)
    .map((p) => ({ kind: p.kind, x: Math.round(p.x), y: Math.round(p.y), price: p.price || undefined, color: p.color }));
  r.pedestals = this.pedestals.map((p) => ({
    item: p.item, x: p.x, y: p.y, price: p.price || undefined, contractCost: p.contractCost || undefined,
  }));
  for (const g of this.pendingGifts) if (!g.done) r.pickups.push({ kind: g.kind, x: g.x, y: g.y });
  this.pendingGifts = [];
}

/** Guarda la partida tal y como está (al salir al menú desde la pausa). */
export function snapshotRun(this: GameScene): void {
  this.saveRoom();
  saveRun(this.run);
}

export function goThrough(this: GameScene, dir: Dir): void {
  if (this.transitioning) return;
  const room = this.room;
  let target: RoomState | undefined;
  let entry: Dir = OPPOSITE[dir];
  if (room.type === 'jefe' && this.run.contractOpen && dir === contractDoorDir(this.run)) {
    target = this.run.contract;
    entry = 'S';
  } else if (room.type === 'contrato') {
    target = bossRoom(this.run);
    entry = contractDoorDir(this.run);
  } else {
    target = neighborRoom(this.run, room, dir);
  }
  if (!target) return;
  this.transitioning = true;
  this.player.locked = 0.4;
  this.snd('puerta');
  if (settings().transition === 'deslizar') return this.slideTo(target, entry, dir);
  this.cameras.main.fadeOut(90, 11, 7, 16);
  this.cameras.main.once('camerafadeoutcomplete', () => {
    this.enterRoom(target!, entry);
    this.cameras.main.fadeIn(110, 11, 7, 16);
    this.transitioning = false;
  });
}

/**
 * Transición deslizante: se fotografía la sala que se deja, se construye la
 * nueva en su sitio y la cámara se desplaza desde la foto hasta ella.
 */
export function slideTo(this: GameScene, target: RoomState, entry: Dir, dir: Dir): void {
  const KEY = 'foto_sala';
  const tex = (this.textures.exists(KEY) ? this.textures.get(KEY) : this.textures.addDynamicTexture(KEY, ROOM_W, ROOM_H)) as Phaser.Textures.DynamicTexture;
  this.player.setVisible(false);
  for (const f of this.familiars) f.sprite.setVisible(false);
  this.children.depthSort();
  tex.clear();
  tex.draw(this.children.list.filter((o) => (o as unknown as { visible?: boolean }).visible !== false));
  this.player.setVisible(true);
  for (const f of this.familiars) f.sprite.setVisible(true);
  this.enterRoom(target, entry);
  const off = { N: [0, ROOM_H], S: [0, -ROOM_H], E: [-ROOM_W, 0], W: [ROOM_W, 0] }[dir];
  const img = this.add.image(ROOM_W / 2 + off[0], ROOM_H / 2 + off[1], KEY).setDepth(DEPTH.overlay - 1);
  this.roomObjs.push(img);
  const cam = this.cameras.main;
  cam.setScroll(off[0], off[1]);
  this.slide = { t: 0, dur: 0.22, x: off[0], y: off[1], img };
}

export function updateSlide(this: GameScene, dt: number): void {
  const sl = this.slide;
  if (!sl) return;
  sl.t += dt;
  const k = Math.min(1, sl.t / sl.dur);
  const e = 1 - Math.pow(1 - k, 3);
  this.cameras.main.setScroll(Math.round(sl.x * (1 - e)), Math.round(sl.y * (1 - e)));
  if (k >= 1) {
    sl.img.destroy();
    this.slide = null;
    this.cameras.main.setScroll(0, 0);
    this.transitioning = false;
  }
}

export function checkDoors(this: GameScene): void {
  if (this.transitioning) return;
  const p = this.player;
  for (const d of this.doors) {
    if (!d.open) continue;
    const pos = DOOR_POS[d.dir];
    const near = d.dir === 'N' || d.dir === 'S' ? Math.abs(p.x - pos.x) < 10 : Math.abs(p.y - pos.y) < 10;
    if (!near) continue;
    if ((d.dir === 'N' && p.y < 15) || (d.dir === 'S' && p.y > ROOM_H - 15) || (d.dir === 'W' && p.x < 14) || (d.dir === 'E' && p.x > ROOM_W - 14)) {
      this.goThrough(d.dir);
      return;
    }
  }
}

export function onRoomCleared(this: GameScene): void {
  const room = this.room;
  room.cleared = true;
  this.run.roomsCleared++;
  logRoom({ act: this.run.act, tpl: room.templateId ?? '', type: room.type, secs: +this.roomTime.toFixed(1), hurt: this.roomHurtHalves });
  this.effects.onRoomClear();
  this.snd('limpia');
  this.fx.flash(140, 0xfff2a8, 0.18);
  for (const d of this.doors) {
    const pos = DOOR_POS[d.dir];
    this.fx.dust(pos.x, pos.y, 6);
  }
  if (this.dark && room.type !== 'jefe') {
    this.setDark(false);
    this.banner('Vuelven las luces', '');
  }
  if (room.type === 'jefe') {
    this.onBossDefeated();
  } else {
    this.rollClearReward();
    // Premio extra por cada número superado.
    const tpl = room.templateId ? findTemplate(room.templateId, this.run.act) : undefined;
    for (let i = 0; i < (tpl?.waves?.length ?? 0); i++) {
      const c = this.nearestFreeTo(ROOM_W / 2 + (i + 1) * 16, ROOM_H / 2);
      this.dropRandom(c.x, c.y);
    }
    if (room.type === 'reto') this.challengeReward();
  }
  rebuildDoors(this);
  // Segundo punto de guardado: poco después de limpiar (con lo que haya en el suelo).
  this.time.delayedCall(800, () => {
    if (this.player.dead || this.transitioning) return;
    this.saveRoom();
    saveRun(this.run);
  });
}

export function rollClearReward(this: GameScene): void {
  // En las salas difíciles, siempre cae al menos un boleto.
  const tpl = this.room.templateId ? findTemplate(this.room.templateId, this.run.act) : undefined;
  if (tpl && tpl.diff >= 2) {
    const b = this.nearestFreeTo(ROOM_W / 2 - 16, ROOM_H / 2);
    this.spawnPickup('boleto', b.x, b.y, { burst: true });
  }
  const luck = this.stats.luck;
  // La suerte sube la probabilidad de premio (antes la bajaba por error).
  const r = this.rngLoot.next() + luck * 0.04;
  if (r < CLEAR_NOTHING) return;
  const c = this.nearestFreeTo(ROOM_W / 2, ROOM_H / 2);
  this.dropRandom(c.x, c.y);
  // Chistera de Doble Fondo: a veces sale doble.
  if (this.effects.hasFlag('dobleFondo') && this.rngLoot.chance(0.25)) {
    this.dropRandom(c.x, c.y);
    this.splash(c.x, c.y - 6, 'humo');
  }
}

export function dropRandom(this: GameScene, x: number, y: number): void {
  const kind = this.rngLoot.weighted<PickupKind>(DROP_RANDOM);
  this.spawnPickup(kind, x, y, { burst: true });
}

export function onBossDefeated(this: GameScene): void {
  this.run.bossDefeated = true;
  playMusic(actDef(this.run.act).music);
  this.banner('¡Ovación!', 'El público enloquece');
  this.snd('aplauso');
  for (const pl of this.enemyShotsNear(120, 72, 400)) pl.pop();
  const id = this.preItem(this.room, 0, 'jefe')!;
  this.addPedestal(ROOM_W / 2, tileY(2), id);
  // Además del objeto: un globo seguro y otro premio al azar.
  const p = this.run.player;
  const sure: PickupKind = p.hp < p.maxHp ? 'globo' : 'globo_plata';
  const extra = this.rngLoot.weighted<PickupKind>(BOSS_EXTRA);
  this.spawnPickup(sure, tileX(4), tileY(3));
  this.spawnPickup(extra, tileX(8), tileY(3));
  this.run.beaten.push(this.run.boss);
  this.meta('jefe');
  const def = actDef(this.run.act);
  if (def.exit === 'final') {
    this.room.data.finalOpen = true;
    this.later(1.2, () => {
      this.banner('Se hace el silencio', 'La salida... o la chistera');
      this.addFinale();
    });
    this.confetti(ROOM_W / 2, ROOM_H / 2, 60);
    return;
  }
  this.addTrapdoor();
  if (def.contract && !this.run.player.redDamageTaken) {
    this.run.contractOpen = true;
    this.later(0.6, () => {
      this.banner('Se abre una puerta...', 'El Maestro quiere verte');
      this.snd('contrato');
    });
  }
  this.confetti(ROOM_W / 2, ROOM_H / 2, 40);
}

export function addTrapdoor(this: GameScene): void {
  // Fuera de la línea de cualquier puerta, para no caer sin querer.
  const t = this.add.sprite(tileX(10), tileY(5), 'trampilla', 1).setDepth(DEPTH.hazard);
  this.roomObjs.push(t);
  this.trapdoor = t;
  this.trapdoorArmed = false;
}

export function checkTrapdoor(this: GameScene): void {
  if (!this.trapdoor || this.transitioning) return;
  const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.trapdoor.x, this.trapdoor.y);
  // Solo se activa si el jugador se ha alejado antes (no al aparecer encima).
  if (d > 24) this.trapdoorArmed = true;
  if (this.trapdoorArmed && d < 9) {
    this.transitioning = true;
    this.player.locked = 5;
    this.tweens.add({ targets: this.trapdoor, scale: 1.2, duration: 200, yoyo: true });
    this.player.setVisible(false);
    this.snd('secreto');
    this.meta('acto');
    this.snd('telon');
    this.curtain = { t: 0, closing: true };
    this.time.delayedCall(900, () => {
      if (actDef(this.run.act).exit === 'final') this.finish('libertad');
      else {
        // Siguiente acto: mismo payaso, mismos objetos, carpa nueva.
        advanceAct(this.run);
        this.run.curtainOpen = true;
        this.scene.restart();
      }
    });
  }
}

/**
 * Final del juego tras vencer a El Maestro: una salida (libertad) y una
 * chistera en el suelo (quedarse como nuevo Maestro).
 */
export function addFinale(this: GameScene): void {
  if (this.finale) return;
  const door = this.add.image(ROOM_W / 2, 10, 'salida').setDepth(DEPTH.decal + 3);
  const hat = this.add.image(tileX(3), tileY(4), 'chistera_suelo').setDepth(DEPTH.world + tileY(4));
  const ring = this.add.graphics().setDepth(DEPTH.overlay);
  this.roomObjs.push(door, hat, ring);
  this.floorText(ROOM_W / 2, 26, 'La salida', 0xefe6d8, 0.7);
  this.floorText(tileX(3), tileY(5) + 4, '¿Te la pones?', 0xd4323f, 0.7);
  this.tweens.add({ targets: hat, y: hat.y - 2, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
  this.finale = { hatT: 0 };
  this.roomUpdate.push((dt) => {
    if (!this.finale || this.transitioning) return;
    const p = this.player;
    ring.clear();
    // La salida: cruzar el umbral de arriba.
    if (Math.abs(p.x - door.x) < 12 && p.y < 26) {
      this.transitioning = true;
      this.player.locked = 5;
      this.snd('puerta');
      this.meta('final_libertad');
      this.fx.flash(600, 0xfff2a8, 0.9);
      this.time.delayedCall(900, () => this.finish('libertad'));
      return;
    }
    // La chistera: quedarse encima 1,2 s.
    const on = Phaser.Math.Distance.Between(p.x, p.y, hat.x, hat.y) < 10;
    this.finale.hatT = on ? this.finale.hatT + dt : Math.max(0, this.finale.hatT - dt * 2);
    if (this.finale.hatT > 0) {
      ring.lineStyle(2, 0xd4323f, 1);
      ring.beginPath();
      ring.arc(hat.x, hat.y - 4, 12, -Math.PI / 2, -Math.PI / 2 + (this.finale.hatT / 1.2) * Math.PI * 2);
      ring.strokePath();
    }
    if (this.finale.hatT >= 1.2) {
      this.transitioning = true;
      this.player.locked = 5;
      hat.setVisible(false);
      this.snd('chistera');
      this.meta('final_maestro');
      this.fx.flash(800, 0xd4323f, 0.7);
      this.cameras.main.zoomTo(1.5, 1200);
      this.time.delayedCall(1500, () => this.finish('maestro'));
    }
  });
}

export function finish(this: GameScene, outcome: 'muerte' | 'libertad' | 'maestro'): void {
  const r = this.run;
  const victory = outcome !== 'muerte';
  this.scene.start('Fin', {
    victory,
    outcome,
    cause: this.lastHurtCause,
    mode: r.mode,
    character: r.player.character,
    contracts: r.stats.contratos,
    gira: r.gira,
    seed: r.seed,
    items: [...r.player.passives, ...(r.player.active ? [r.player.active] : [])],
    kills: r.kills,
    rooms: r.roomsCleared,
    time: Math.round(r.playTime),
    boss: r.bossDefeated,
    act: r.act,
    contract: r.contractOpen,
    seen: r.seenItems,
  });
}

/** Número de riesgo: al coger el objeto, se cierran las puertas y entran dos oleadas. */
export function startChallenge(this: GameScene): void {
  const room = this.room;
  room.data.started = true;
  room.cleared = false;
  rebuildDoors(this);
  this.snd('portazo');
  this.shake(120, 0.006);
  this.banner('¡Número de riesgo!', 'Sobrevive a dos oleadas');
  const sets: Record<number, EnemyKind[]> = {
    1: ['mimo', 'mono', 'lanzacuchillos', 'polilla'],
    2: ['leon', 'domador', 'payasito', 'loro'],
    3: ['reflejo', 'bailarina', 'tragasables', 'cabezudo'],
    4: ['augusto', 'hombreBala', 'zancudo', 'acomodador'],
  };
  const kinds = sets[Math.min(4, this.run.act)];
  const spots = [
    [tileX(2), tileY(1)], [tileX(10), tileY(1)], [tileX(2), tileY(5)], [tileX(10), tileY(5)], [tileX(6), tileY(5)],
  ];
  let wave = 0;
  const spawnWave = () => {
    wave++;
    const n = 2 + wave;
    for (let i = 0; i < n; i++) {
      const [x, y] = spots[(i + wave) % spots.length];
      this.telegraph.marker(x, y, 0.7, { color: 0xe8743b });
      this.time.delayedCall(700, () => this.spawn(kinds[(i + wave) % kinds.length], x, y));
    }
  };
  spawnWave();
  let waiting = true;
  this.time.delayedCall(800, () => (waiting = false));
  this.clearBlockers.push(() => waiting || wave < 2);
  this.roomUpdate.push(() => {
    if (waiting || wave >= 2 || this.clearPending().length > 0) return;
    waiting = true;
    this.banner('¡Segunda oleada!', '');
    this.snd('redoble');
    spawnWave();
    this.time.delayedCall(800, () => (waiting = false));
  });
}

/** Premio del número de riesgo: un cofre con candado y boletos. */
export function challengeReward(this: GameScene): void {
  this.spawnPickup('cofre_candado', tileX(4), tileY(3));
  this.spawnPickup('taco_boletos', tileX(8), tileY(3), { burst: true });
  this.spawnPickup('llave', tileX(8), tileY(3), { burst: true });
}
