// Escena principal: bucle de juego, colisiones y API para entidades y sistemas.
import Phaser from 'phaser';
import { DEPTH, DOOR_POS, HUD_H, ROOM_H, ROOM_W, tileX, tileY, toCol, toRow } from '../config';
import { RunState, currentRoom, neighborRoom, PickupKind, RoomState, contractDoorDir, bossRoom } from '../core/run';
import { computeStats, FinalStats } from '../core/stats';
import { Rng } from '../core/rng';
import { Dir, OPPOSITE } from '../core/floorgen';
import { item, itemPrice } from '../data/items';
import { GOLOSINA_COLORS, GOLOSINA_EFFECTS, GolosinaColor } from '../data/golosinas';
import { Controls } from '../systems/Controls';
import { Nav } from '../systems/Nav';
import { ItemEffects, Applause } from '../systems/ItemEffects';
import { buildRoom, rebuildDoors, DoorInfo } from '../systems/RoomBuilder';
import { Player } from '../entities/Player';
import { Shot, ShotOpts } from '../entities/Shot';
import { Enemy } from '../entities/Enemy';
import { Pickup, Pedestal, Bomb, Obstacle, Fire } from '../entities/props';
import { Familiar, createFamiliar, Paloma } from '../entities/familiars';
import { sfx, SfxName } from '../audio/sfx';
import { playMusic } from '../audio/music';
import { installDebug } from '../debug/debugApi';
import { DEBUG } from '../config';
import { txt } from '../ui/text';

export interface Groups {
  walls: Phaser.Physics.Arcade.StaticGroup;
  doors: Phaser.Physics.Arcade.StaticGroup;
  solids: Phaser.Physics.Arcade.StaticGroup;
  pits: Phaser.Physics.Arcade.StaticGroup;
  pedestals: Phaser.Physics.Arcade.StaticGroup;
  pShots: Phaser.Physics.Arcade.Group;
  eShots: Phaser.Physics.Arcade.Group;
  enemies: Phaser.Physics.Arcade.Group;
  pickups: Phaser.Physics.Arcade.Group;
  bombs: Phaser.Physics.Arcade.Group;
}

export interface BannerMsg {
  title: string;
  sub: string;
  t: number;
}

export class GameScene extends Phaser.Scene {
  run!: RunState;
  stats!: FinalStats;
  controls!: Controls;
  player!: Player;
  nav = new Nav();
  g!: Groups;
  effects!: ItemEffects;
  applause!: Applause;
  rngLoot!: Rng;
  rngItems!: Rng;
  rngCombat!: Rng;

  room!: RoomState;
  doors: DoorInfo[] = [];
  pedestals: Pedestal[] = [];
  hazards: Fire[] = [];
  spikes: { x: number; y: number }[] = [];
  /** Objetos propios de la sala (decorado, carteles...) que se borran al salir. */
  roomObjs: Phaser.GameObjects.GameObject[] = [];
  /** Dibujos de puertas (se rehacen al abrirse). */
  doorObjs: Phaser.GameObjects.GameObject[] = [];
  roomUpdate: ((dt: number) => void)[] = [];
  familiars: Familiar[] = [];
  tempFamiliars: Paloma[] = [];
  trapdoor: Phaser.GameObjects.Sprite | null = null;
  private trapdoorArmed = false;
  bossIds: Enemy[] = [];

  god = false;
  transitioning = false;
  /** Segundos que quedan de controles invertidos (golosina de mareo). */
  mareoT = 0;
  banners: BannerMsg[] = [];
  private bg: Phaser.GameObjects.Image | null = null;
  private pickupMsgCd = 0;
  private roomTime = 0;

  constructor() {
    super('Juego');
  }

  /** Phaser reutiliza la instancia al reiniciar: se limpia todo el estado aquí. */
  init(): void {
    this.room = undefined as unknown as RoomState;
    this.nav = new Nav();
    this.doors = [];
    this.pedestals = [];
    this.hazards = [];
    this.spikes = [];
    this.roomObjs = [];
    this.doorObjs = [];
    this.roomUpdate = [];
    this.familiars = [];
    this.tempFamiliars = [];
    this.trapdoor = null;
    this.trapdoorArmed = false;
    this.bossIds = [];
    this.god = false;
    this.transitioning = false;
    this.mareoT = 0;
    this.banners = [];
    this.bg = null;
    this.pickupMsgCd = 0;
    this.roomTime = 0;
  }

  create(): void {
    this.run = this.registry.get('run') as RunState;
    this.cameras.main.setViewport(0, HUD_H, ROOM_W, ROOM_H);
    this.cameras.main.setBackgroundColor('#0b0710');
    this.physics.world.setBounds(0, 0, ROOM_W, ROOM_H);
    this.rngLoot = this.run.streams.get('botin');
    this.rngItems = this.run.streams.get('objetos');
    this.rngCombat = this.run.streams.get('combate');

    this.g = {
      walls: this.physics.add.staticGroup(),
      doors: this.physics.add.staticGroup(),
      solids: this.physics.add.staticGroup(),
      pits: this.physics.add.staticGroup(),
      pedestals: this.physics.add.staticGroup(),
      pShots: this.physics.add.group(),
      eShots: this.physics.add.group(),
      enemies: this.physics.add.group(),
      pickups: this.physics.add.group(),
      bombs: this.physics.add.group(),
    };
    this.controls = new Controls(this);
    this.effects = new ItemEffects(this);
    this.applause = new Applause(this);
    this.recomputeStats();
    this.player = new Player(this, ROOM_W / 2, ROOM_H / 2 + 10);
    this.rebuildFamiliars();
    this.setupColliders();

    this.scene.launch('Hud');
    this.events.once('shutdown', () => {
      this.scene.stop('Hud');
      this.controls.releaseAll();
    });

    this.enterRoom(currentRoom(this.run), null);
    this.banner(`Acto ${this.run.act}`, this.run.actName);
    if (DEBUG) installDebug(this);
  }

  // ------------------------------------------------------------------
  // Colisiones
  // ------------------------------------------------------------------
  private setupColliders(): void {
    const P = this.player.sprite;
    const g = this.g;
    const flying = () => this.effects.hasFlag('flight');
    const add = this.physics.add;

    add.collider(P, g.walls);
    add.collider(P, g.doors, (_p, d) => this.touchDoor(d as Phaser.GameObjects.Zone));
    add.collider(P, g.solids, (_p, o) => this.touchSolid(o as Obstacle), () => !flying());
    add.collider(P, g.pits, undefined, () => !flying());
    add.collider(P, g.pedestals, (_p, b) => this.touchPedestal((b as Phaser.GameObjects.Image).getData('pedestal')));

    const ground = (e: unknown) => !(e as Enemy).flying;
    add.collider(g.enemies, g.walls);
    add.collider(g.enemies, g.doors);
    add.collider(g.enemies, g.solids, undefined, ground);
    add.collider(g.enemies, g.pits, undefined, ground);
    add.collider(g.enemies, g.pedestals, undefined, ground);
    add.collider(g.enemies, g.enemies, undefined, (a, b) => ground(a) && ground(b));

    add.collider(g.pShots, g.walls, (s) => this.shotHitWall(s as Shot));
    add.collider(g.pShots, g.doors, (s) => this.shotHitWall(s as Shot));
    add.collider(g.pShots, g.solids, (s, o) => this.shotHitSolid(s as Shot, o as Obstacle), (s) => !(s as Shot).opts.spectral);
    add.overlap(g.pShots, g.enemies, (s, e) => this.shotHitEnemy(s as Shot, e as Enemy));

    add.collider(g.eShots, g.walls, (s) => (s as Shot).pop());
    add.collider(g.eShots, g.doors, (s) => (s as Shot).pop());
    add.collider(g.eShots, g.solids, (s) => (s as Shot).pop());
    add.overlap(P, g.eShots, (_p, s) => {
      const shot = s as Shot;
      if (shot.dead) return;
      this.hurtPlayer(shot.opts.damage, shot.x, shot.y);
      shot.pop();
    });
    add.overlap(P, g.enemies, (_p, e) => {
      const en = e as Enemy;
      if (en.dead || en.contact <= 0 || en.lift > 8 || en.wake > 0) return;
      this.hurtPlayer(en.contact, en.x, en.y);
    });
    add.overlap(P, g.pickups, (_p, pk) => this.touchPickup(pk as Pickup));
    add.collider(g.pickups, g.walls);
    add.collider(g.pickups, g.doors);
    add.collider(g.pickups, g.solids);
    add.collider(g.pickups, g.pits);
    add.collider(g.pickups, g.pedestals);
    add.collider(g.pickups, g.pickups);
    add.collider(g.bombs, g.walls);
    add.collider(g.bombs, g.solids);
  }

  private shotHitWall(s: Shot): void {
    if (s.dead) return;
    if (s.bouncesLeft > 0) {
      s.bouncesLeft--;
      this.snd('rebote');
      return;
    }
    s.pop();
  }

  private shotHitSolid(s: Shot, o: Obstacle): void {
    if (s.dead) return;
    if (o.breakableByShots) this.hitObstacle(o);
    s.pop();
  }

  private shotHitEnemy(s: Shot, e: Enemy): void {
    if (s.dead || e.dead || s.hit.has(e) || e.lift > 14) return;
    s.hit.add(e);
    e.damage(s.opts.damage, { x: s.x - s.body.velocity.x, y: s.y - s.body.velocity.y }, s.opts.knockback);
    if (s.opts.burn && !e.dead) e.burn(s.opts.damage);
    if (!s.opts.pierce || e.invulnerable) s.pop();
  }

  hitObstacle(o: Obstacle): void {
    o.hits++;
    if (o.kind === 'palomitas') {
      this.room.damaged[o.tile] = o.hits;
      if (o.hits >= 3) this.destroyObstacle(o, true);
      else o.setFrame(o.hits);
    } else if (o.kind === 'brasero') {
      this.room.damaged[o.tile] = o.hits;
      if (o.hits >= 4) {
        o.extinguished = true;
        o.setTexture('brasero_apagado');
        this.snd('fuego');
        if (this.rngLoot.chance(0.25)) this.dropRandom(o.x, o.y + 10);
      }
    }
  }

  destroyObstacle(o: Obstacle, drop: boolean): void {
    if (!o.active) return;
    this.room.destroyed.push(o.tile);
    this.nav.setBlocked(o.tile % 13, Math.floor(o.tile / 13), false);
    this.snd('romper');
    this.debris(o.x, o.y, o.kind === 'palomitas' ? 'W' : 'N');
    if (o.kind === 'cajon_marcado') {
      const k = this.rngLoot.pick<PickupKind>(['globo_plata', 'taco_boletos', 'doble_petardo', 'llave', 'globo_plata']);
      this.spawnPickup(k, o.x, o.y, { burst: true });
    } else if (drop && o.kind === 'palomitas' && this.rngLoot.chance(0.22)) {
      this.dropRandom(o.x, o.y);
    }
    o.destroy();
  }

  private touchSolid(o: Obstacle): void {
    if (o.kind === 'brasero' && !o.extinguished) this.hurtPlayer(1, o.x, o.y);
  }

  private touchDoor(zone: Phaser.GameObjects.Zone): void {
    const info = zone.getData('door') as DoorInfo | undefined;
    if (!info || !info.locked) return;
    const p = this.run.player;
    if (p.keys > 0) {
      p.keys--;
      const target = info.target;
      if (target) target.unlocked = true;
      this.snd('llave');
      rebuildDoors(this);
    } else if (this.pickupMsgCd <= 0) {
      this.pickupMsgCd = 1.5;
      this.banner('Cerrado', 'Necesitas una llave');
    }
  }

  // ------------------------------------------------------------------
  // Salas
  // ------------------------------------------------------------------
  enterRoom(room: RoomState, from: Dir | null): void {
    this.clearRoom();
    this.room = room;
    this.run.cur = { x: room.x, y: room.y };
    const firstVisit = !room.visited;
    room.visited = true;
    this.bg = buildRoom(this, room);
    this.roomTime = 0;

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

    const isBossFight = room.type === 'jefe' && !room.cleared;
    playMusic(isBossFight ? 'jefe' : 'carpa');
    if (isBossFight && firstVisit) {
      this.snd('jefe');
      this.shake(400, 0.006);
    }
    if (room.type === 'contrato' && firstVisit) this.snd('contrato');
  }

  private clearRoom(): void {
    if (this.room) this.saveRoom();
    const g = this.g;
    for (const grp of [g.walls, g.doors, g.solids, g.pits, g.pedestals]) grp.clear(true, true);
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
    for (const f of this.tempFamiliars) f.destroy();
    this.tempFamiliars = [];
    this.doors = [];
    this.trapdoor = null;
    this.bossIds = [];
    this.effects.clearRoomStuff();
    this.bg?.destroy();
    this.bg = null;
    this.time.removeAllEvents();
    this.nav = new Nav();
  }

  /** Guarda lo que queda en el suelo para cuando se vuelva. */
  private saveRoom(): void {
    const r = this.room;
    r.pickups = this.pickupsList()
      .filter((p) => !p.opened)
      .map((p) => ({ kind: p.kind, x: Math.round(p.x), y: Math.round(p.y), price: p.price || undefined, color: p.color }));
    r.pedestals = this.pedestals.map((p) => ({
      item: p.item, x: p.x, y: p.y, price: p.price || undefined, contractCost: p.contractCost || undefined,
    }));
  }

  private goThrough(dir: Dir): void {
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
    this.cameras.main.fadeOut(90, 11, 7, 16);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.enterRoom(target!, entry);
      this.cameras.main.fadeIn(110, 11, 7, 16);
      this.transitioning = false;
    });
  }

  private checkDoors(): void {
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

  private onRoomCleared(): void {
    const room = this.room;
    room.cleared = true;
    this.run.roomsCleared++;
    this.effects.onRoomClear();
    this.snd('puerta');
    if (room.type === 'jefe') {
      this.onBossDefeated();
    } else {
      this.rollClearReward();
    }
    rebuildDoors(this);
  }

  private rollClearReward(): void {
    const luck = this.stats.luck;
    const r = this.rngLoot.next() - luck * 0.04;
    if (r < 0.32) return;
    const c = this.nearestFreeTo(ROOM_W / 2, ROOM_H / 2);
    this.dropRandom(c.x, c.y);
  }

  dropRandom(x: number, y: number): void {
    const kind = this.rngLoot.weighted<PickupKind>([
      { value: 'boleto', weight: 26 },
      { value: 'taco_boletos', weight: 4 },
      { value: 'medio_globo', weight: 12 },
      { value: 'globo', weight: 8 },
      { value: 'petardo', weight: 13 },
      { value: 'llave', weight: 12 },
      { value: 'cofre', weight: 8 },
      { value: 'cofre_candado', weight: 3 },
      { value: 'golosina', weight: 7 },
      { value: 'globo_plata', weight: 4 },
    ]);
    this.spawnPickup(kind, x, y, { burst: true });
  }

  private onBossDefeated(): void {
    this.run.bossDefeated = true;
    playMusic('carpa');
    this.banner('¡Ovación!', 'El público enloquece');
    this.snd('aplauso');
    for (const pl of this.enemyShotsNear(120, 72, 400)) pl.pop();
    const id = this.drawItem('jefe');
    this.addPedestal(ROOM_W / 2, tileY(2), id);
    this.addTrapdoor();
    if (!this.run.player.redDamageTaken) {
      this.run.contractOpen = true;
      this.time.delayedCall(600, () => {
        this.banner('Se abre una puerta...', 'El Maestro quiere verte');
        this.snd('contrato');
      });
    }
    this.confetti(ROOM_W / 2, ROOM_H / 2, 40);
  }

  addTrapdoor(): void {
    // Fuera de la línea de cualquier puerta, para no caer sin querer.
    const t = this.add.sprite(tileX(10), tileY(5), 'trampilla', 1).setDepth(DEPTH.hazard);
    this.roomObjs.push(t);
    this.trapdoor = t;
    this.trapdoorArmed = false;
  }

  addPedestal(x: number, y: number, id: string | null, opts: { price?: number; contractCost?: number } = {}): Pedestal {
    const p = new Pedestal(this, x, y, id, opts);
    this.pedestals.push(p);
    this.nav.setBlocked(toCol(x), toRow(y), true);
    return p;
  }

  drawItem(pool: 'camerino' | 'puesto' | 'jefe' | 'secreta' | 'contrato' | 'barraca'): string {
    const id = this.run.pools.draw(pool, this.rngItems) ?? 'calcetin';
    if (!this.run.seenItems.includes(id)) this.run.seenItems.push(id);
    return id;
  }

  // ------------------------------------------------------------------
  // Bucle
  // ------------------------------------------------------------------
  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.controls.update();
    this.pickupMsgCd = Math.max(0, this.pickupMsgCd - dt);
    this.roomTime += dt;
    this.mareoT = Math.max(0, this.mareoT - dt);
    this.controls.inverted = this.mareoT > 0;
    for (const b of this.banners) b.t -= dt;
    this.banners = this.banners.filter((b) => b.t > 0);

    if (this.controls.pressed('pausa') && !this.player.dead) {
      this.scene.launch('Pausa');
      this.scene.pause();
      return;
    }
    if (this.player.dead) return;

    this.player.update(dt);
    this.effects.update(dt);
    this.applause.update(dt);
    for (const f of this.familiars) f.update(dt);
    for (const f of this.tempFamiliars) f.update(dt);
    this.tempFamiliars = this.tempFamiliars.filter((f) => {
      if (f.gone) f.destroy();
      return !f.gone;
    });
    for (const p of this.pedestals) p.update(dt);
    for (const fn of this.roomUpdate) fn(dt);
    for (const o of this.g.solids.getChildren() as Obstacle[]) o.tick?.(dt);
    this.hazards = this.hazards.filter((h) => h.active);

    const p = this.run.player;
    if (!this.player.locked) {
      if (this.controls.pressed('petardo') && p.bombs > 0) {
        p.bombs--;
        new Bomb(this, this.player.x, this.player.y + 2);
        this.snd('petardo');
      }
      if (this.controls.pressed('activo')) {
        if (this.effects.useActive()) this.recomputeStats();
      }
      if (this.controls.pressed('golosina')) this.effects.useGolosina();
    }

    this.checkHazards();
    this.checkDoors();
    this.checkTrapdoor();

    const alive = this.enemiesAlive().length;
    if (!this.room.cleared && alive === 0 && this.roomTime > 0.3) this.onRoomCleared();
  }

  private checkHazards(): void {
    const pl = this.player;
    const flying = this.effects.hasFlag('flight');
    if (!flying) {
      for (const s of this.spikes) {
        if (Math.abs(pl.x - s.x) < 8 && Math.abs(pl.y - s.y) < 8) {
          this.hurtPlayer(1, s.x, s.y);
          break;
        }
      }
    }
    for (const h of this.hazards) {
      if (h.life > 0.3 && Math.abs(pl.x - h.x) < 7 && Math.abs(pl.y + 2 - h.y) < 6) {
        this.hurtPlayer(1, h.x, h.y);
        break;
      }
    }
  }

  private checkTrapdoor(): void {
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
      this.time.delayedCall(700, () => this.finish(true));
    }
  }

  // ------------------------------------------------------------------
  // Jugador
  // ------------------------------------------------------------------
  hurtPlayer(halves: number, srcX: number, srcY: number): void {
    const pl = this.player;
    if (this.god || pl.invuln > 0 || pl.dead || pl.dash || this.transitioning) return;
    const p = this.run.player;
    let take = halves;
    const fromShield = Math.min(p.shield, take);
    p.shield -= fromShield;
    take -= fromShield;
    if (take > 0) {
      p.hp = Math.max(0, p.hp - take);
      p.redDamageTaken = true;
    }
    pl.invuln = 1.0;
    const a = Math.atan2(pl.y - srcY, pl.x - srcX);
    pl.vel.set(Math.cos(a) * 160, Math.sin(a) * 160);
    pl.flash(0xd4323f);
    this.snd('herido');
    this.shake(120, 0.006);
    this.applause.onHurt();
    this.effects.onHurt();
    if (p.hp <= 0 && p.shield <= 0) this.killPlayer();
  }

  private killPlayer(): void {
    const pl = this.player;
    pl.dead = true;
    pl.body.setVelocity(0, 0);
    this.snd('muerteJugador');
    playMusic(null);
    this.physics.pause();
    this.tweens.add({ targets: this.cameras.main, zoom: 1.6, duration: 900, ease: 'Sine.easeInOut' });
    this.cameras.main.pan(pl.x, pl.y, 900);
    this.time.delayedCall(2200, () => this.finish(false));
  }

  private finish(victory: boolean): void {
    const r = this.run;
    this.scene.start('Fin', {
      victory,
      seed: r.seed,
      items: [...r.player.passives, ...(r.player.active ? [r.player.active] : [])],
      kills: r.kills,
      rooms: r.roomsCleared,
      time: Math.round((Date.now() - r.startedAt) / 1000),
      boss: r.bossDefeated,
      contract: r.contractOpen,
    });
  }

  recomputeStats(): void {
    const p = this.run.player;
    const sources = p.passives.map((id) => item(id));
    sources.push({ id: 'bonus', name: '', desc: '', pools: [], kind: 'pasivo', stats: p.bonus });
    this.stats = computeStats(sources);
  }

  rebuildFamiliars(): void {
    for (const f of this.familiars) f.destroy();
    this.familiars = [];
    for (const id of this.run.player.passives) {
      const fam = item(id).familiar;
      if (fam) this.familiars.push(createFamiliar(this, fam));
    }
  }

  addTempFamiliar(f: Paloma): void {
    this.tempFamiliars.push(f);
  }

  familiarsFire(dir: { x: number; y: number }): void {
    for (const f of this.familiars) f.fire(dir);
  }

  /** Da un objeto al jugador (y devuelve el activo anterior si lo había). */
  giveItem(id: string): string | null {
    const def = item(id);
    const p = this.run.player;
    let previous: string | null = null;
    if (def.kind === 'activo') {
      previous = p.active;
      p.active = id;
      p.charge = def.active!.charges;
    } else {
      p.passives.push(id);
    }
    const o = def.onPickup;
    if (o) {
      if (o.maxHp) p.maxHp = Math.min(24, p.maxHp + o.maxHp);
      if (o.heal) p.hp = Math.min(p.maxHp, p.hp + o.heal);
      if (o.shield) p.shield += o.shield;
      if (o.tickets) p.tickets = Math.min(99, p.tickets + o.tickets);
      if (o.bombs) p.bombs = Math.min(99, p.bombs + o.bombs);
      if (o.keys) p.keys = Math.min(99, p.keys + o.keys);
    }
    if (!this.run.seenItems.includes(id)) this.run.seenItems.push(id);
    this.recomputeStats();
    this.player.refreshCostumes();
    if (def.familiar) this.rebuildFamiliars();
    this.banner(def.name, def.desc);
    this.snd('objeto');
    // Pompón levanta el objeto sobre la cabeza.
    const icon = this.add.image(this.player.x, this.player.y - 28, `obj_${id}`).setDepth(DEPTH.overlay);
    this.roomObjs.push(icon);
    this.tweens.add({ targets: icon, y: icon.y - 6, alpha: 0, delay: 700, duration: 400, onComplete: () => icon.destroy() });
    return previous;
  }

  private touchPedestal(ped: Pedestal | undefined): void {
    if (!ped) return;
    // Un toque continuo cuenta una sola vez: hay que separarse para volver a cambiar.
    const now = this.time.now;
    const continuing = now - ped.lastTouch < 200;
    ped.lastTouch = now;
    if (continuing || !ped.item || ped.cooldown > 0 || this.player.dead) return;
    const p = this.run.player;
    const def = item(ped.item);
    if (ped.price > 0) {
      if (p.tickets < ped.price) return this.needMsg('Faltan boletos');
      p.tickets -= ped.price;
      this.snd('compra');
    }
    if (ped.contractCost > 0) {
      const cost = ped.contractCost * 2;
      if (p.maxHp < cost || p.maxHp - cost + p.shield <= 0) return this.needMsg('No te queda nada que vender');
      p.maxHp -= cost;
      p.hp = Math.min(p.hp, p.maxHp);
      this.snd('contrato');
      this.shake(200, 0.006);
    }
    const id = ped.item;
    ped.price = 0;
    ped.contractCost = 0;
    const prev = this.giveItem(id);
    ped.setItem(prev);
    ped.cooldown = 1;
    void def;
  }

  private needMsg(s: string): void {
    if (this.pickupMsgCd > 0) return;
    this.pickupMsgCd = 1.2;
    this.banner(s, '');
    this.snd('error');
  }

  private touchPickup(pk: Pickup): void {
    if (pk.delay > 0 || !pk.active || pk.opened) return;
    const p = this.run.player;
    const priced = pk.price > 0;
    const canAfford = !priced || p.tickets >= pk.price;
    const collect = (sound: SfxName) => {
      if (priced) {
        if (!canAfford) {
          this.needMsg('Faltan boletos');
          return false;
        }
        p.tickets -= pk.price;
        this.snd('compra');
      }
      this.snd(sound);
      return true;
    };
    switch (pk.kind) {
      case 'globo':
      case 'medio_globo': {
        if (p.hp >= p.maxHp) return;
        if (!collect('globo')) return;
        p.hp = Math.min(p.maxHp, p.hp + (pk.kind === 'globo' ? 2 : 1));
        break;
      }
      case 'globo_plata':
        if (p.maxHp + p.shield >= 24) return;
        if (!collect('globo')) return;
        p.shield = Math.min(24 - p.maxHp, p.shield + 2);
        break;
      case 'boleto':
      case 'taco_boletos':
        if (!collect('boleto')) return;
        p.tickets = Math.min(99, p.tickets + (pk.kind === 'boleto' ? 1 : 5));
        break;
      case 'petardo':
      case 'doble_petardo':
        if (!collect('petardo')) return;
        p.bombs = Math.min(99, p.bombs + (pk.kind === 'petardo' ? 1 : 2));
        break;
      case 'llave':
        if (!collect('llave')) return;
        p.keys = Math.min(99, p.keys + 1);
        break;
      case 'golosina': {
        if (!collect('golosina')) return;
        const old = p.golosina;
        p.golosina = pk.color ?? 'rosa';
        const effect = this.run.golosinaMap[p.golosina];
        const known = this.run.golosinaKnown.includes(effect);
        this.banner(known ? GOLOSINA_EFFECTS[effect].name : 'Golosina misteriosa', 'Pulsa Q para comerla');
        if (old) this.spawnPickup('golosina', pk.x, pk.y + 12, { color: old });
        break;
      }
      case 'cofre':
        this.openChest(pk, false);
        return;
      case 'cofre_candado':
        if (p.keys <= 0) return this.needMsg('Necesitas una llave');
        p.keys--;
        this.openChest(pk, true);
        return;
    }
    this.tweens.add({ targets: pk, scale: 1.4, alpha: 0, duration: 120, onComplete: () => pk.destroy() });
    pk.opened = true;
    pk.body.enable = false;
  }

  private openChest(pk: Pickup, locked: boolean): void {
    pk.open();
    pk.body.enable = false;
    this.snd('cofre');
    if (locked && this.rngLoot.chance(0.15)) {
      const id = this.drawItem('camerino');
      const ped = this.addPedestal(pk.x, pk.y, id);
      ped.cooldown = 0.8;
      pk.destroy();
      return;
    }
    const n = locked ? this.rngLoot.int(2, 4) : this.rngLoot.int(1, 3);
    for (let i = 0; i < n; i++) {
      const kinds: PickupKind[] = locked
        ? ['taco_boletos', 'globo', 'globo_plata', 'llave', 'doble_petardo', 'golosina']
        : ['boleto', 'boleto', 'medio_globo', 'petardo', 'llave', 'golosina'];
      this.spawnPickup(this.rngLoot.pick(kinds), pk.x, pk.y, { burst: true });
    }
    this.time.delayedCall(1200, () => {
      if (pk.active) this.tweens.add({ targets: pk, alpha: 0, duration: 300, onComplete: () => pk.destroy() });
    });
  }

  // ------------------------------------------------------------------
  // API para entidades
  // ------------------------------------------------------------------
  snd(name: SfxName): void {
    sfx(name);
  }

  difficultyHpMult(): number {
    return 1;
  }

  spawnShot(x: number, y: number, vx: number, vy: number, friendly: boolean, opts: ShotOpts): Shot {
    return new Shot(this, x, y, vx, vy, friendly, opts);
  }

  spawnPickup(kind: PickupKind, x: number, y: number, opts: { price?: number; color?: GolosinaColor; burst?: boolean } = {}): Pickup {
    let color = opts.color;
    if (kind === 'golosina' && !color) color = this.rngLoot.pick(GOLOSINA_COLORS);
    let vx = 0,
      vy = 0;
    if (opts.burst) {
      const a = this.rngLoot.float(0, Math.PI * 2);
      const s = this.rngLoot.float(60, 120);
      vx = Math.cos(a) * s;
      vy = Math.sin(a) * s;
    }
    return new Pickup(this, x, y, kind, { price: opts.price, color, vx, vy });
  }

  spawnFire(x: number, y: number, life: number): void {
    const fx = Phaser.Math.Clamp(x, 22, ROOM_W - 22);
    const fy = Phaser.Math.Clamp(y, 22, ROOM_H - 22);
    if (this.nav.isBlocked(toCol(fx), toRow(fy))) return;
    new Fire(this, fx, fy, life);
  }

  explode(x: number, y: number, o: { damage: number; hurtsPlayer: boolean; radius?: number }): void {
    const radius = o.radius ?? 34;
    const ex = this.add.sprite(x, y - 4, 'explosion', 0).setDepth(DEPTH.fx);
    ex.play('explosion').once('animationcomplete', () => ex.destroy());
    const scorch = this.add.image(x, y + 2, 'mancha', 2).setDepth(DEPTH.decal).setScale(1.6).setTint(0x221a22);
    this.roomObjs.push(scorch);
    this.snd('explosion');
    this.shake(220, 0.014);
    for (const e of this.enemiesAlive()) {
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < radius + 6) e.damage(o.damage, { x, y }, 160);
    }
    if (o.hurtsPlayer && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < radius) {
      this.hurtPlayer(2, x, y);
    }
    for (const ob of [...(this.g.solids.getChildren() as Obstacle[])]) {
      if (Phaser.Math.Distance.Between(x, y, ob.x, ob.y) > radius + 4) continue;
      if (ob.kind === 'bloque') continue;
      if (ob.kind === 'brasero') {
        ob.extinguished = true;
        ob.setTexture('brasero_apagado');
        continue;
      }
      this.destroyObstacle(ob, true);
    }
    for (const pk of this.pickupsList()) {
      const d = Phaser.Math.Distance.Between(x, y, pk.x, pk.y);
      if (d < radius + 10 && pk.price === 0 && !pk.body.immovable) {
        const a = Math.atan2(pk.y - y, pk.x - x);
        pk.body.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);
      }
    }
    for (const s of this.enemyShotsNear(x, y, radius)) s.pop();
    this.revealSecretsNear(x, y);
  }

  private revealSecretsNear(x: number, y: number): void {
    const room = this.room;
    let found = false;
    for (const dir of room.doors) {
      if (room.secretFound.includes(dir)) continue;
      const other = neighborRoom(this.run, room, dir);
      if (!other) continue;
      if (other.type !== 'secreta' && room.type !== 'secreta') continue;
      const pos = DOOR_POS[dir];
      if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < 46) {
        room.secretFound.push(dir);
        other.secretFound.push(OPPOSITE[dir]);
        found = true;
      }
    }
    if (found) {
      this.time.delayedCall(250, () => this.snd('secreto'));
      rebuildDoors(this);
    }
  }

  shockwave(x: number, y: number): void {
    const s = this.add.sprite(x, y, 'onda', 0).setDepth(DEPTH.fx);
    s.play('onda').once('animationcomplete', () => s.destroy());
  }

  splash(x: number, y: number, tex: string, scale = 1): void {
    const s = this.add.sprite(x, y, tex, 0).setDepth(DEPTH.fx).setScale(scale);
    s.play(tex).once('animationcomplete', () => s.destroy());
  }

  confetti(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const c = this.add.image(x, y, 'confeti', i % 6).setDepth(DEPTH.fx);
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * 40;
      this.tweens.add({
        targets: c,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.6 + 14,
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: 600 + Math.random() * 500,
        ease: 'Quad.easeOut',
        onComplete: () => c.destroy(),
      });
    }
  }

  debris(x: number, y: number, color: string): void {
    for (let i = 0; i < 6; i++) {
      const c = this.add.image(x, y, 'pixel').setScale(2).setDepth(DEPTH.fx).setTint(color === 'W' ? 0xffffff : 0xa8673b);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: c, x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 10 + 6, alpha: 0, duration: 400,
        onComplete: () => c.destroy(),
      });
    }
  }

  shake(ms: number, intensity: number): void {
    this.cameras.main.shake(ms, intensity);
  }

  banner(title: string, sub: string): void {
    this.banners.push({ title, sub, t: 2.6 });
    if (this.banners.length > 2) this.banners.shift();
  }

  enemiesAlive(): Enemy[] {
    return (this.g.enemies.getChildren() as Enemy[]).filter((e) => e.active && !e.dead && e.countsForClear);
  }

  nearestEnemy(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of this.enemiesAlive()) {
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  enemyShotsNear(x: number, y: number, r: number): Shot[] {
    return (this.g.eShots.getChildren() as Shot[]).filter(
      (s) => s.active && !s.dead && Phaser.Math.Distance.Between(x, y, s.x, s.y) < r,
    );
  }

  pickupsList(): Pickup[] {
    return (this.g.pickups.getChildren() as Pickup[]).filter((p) => p.active);
  }

  nearestFreeTo(x: number, y: number): { x: number; y: number } {
    const tiles = this.nav.freeTiles();
    let best = { x, y };
    let bd = Infinity;
    for (const t of tiles) {
      const tx = tileX(t.c),
        ty = tileY(t.r);
      if (this.pedestals.some((p) => Math.abs(p.x - tx) < 8 && Math.abs(p.y - ty) < 8)) continue;
      const d = Phaser.Math.Distance.Between(x, y, tx, ty);
      if (d < bd) {
        bd = d;
        best = { x: tx, y: ty };
      }
    }
    return best;
  }

  onEnemyKilled(e: Enemy): void {
    this.run.kills++;
    this.snd('muerte');
    this.confetti(e.x, e.y, e.isBoss ? 30 : 8);
    const m = this.add.image(e.x, e.body.bottom - 2, 'mancha', this.rngCombat.int(0, 2)).setDepth(DEPTH.decal);
    if (e.isBoss) m.setScale(2.2);
    this.roomObjs.push(m);
    this.applause.onKill();
    if (e.champion === 'dorado') {
      for (let i = 0; i < 3; i++) this.spawnPickup('boleto', e.x, e.y, { burst: true });
    } else if (!e.isBoss && this.rngLoot.chance(0.04 + this.stats.luck * 0.01)) {
      this.dropRandom(e.x, e.y);
    }
    if (e.isBoss) this.shake(300, 0.01);
  }

  applauseReward(): void {
    this.snd('aplauso');
    this.banner('¡Bravo!', 'El público te lanza regalos');
    for (let i = 0; i < 2; i++) {
      const t = this.nearestFreeTo(this.rngLoot.int(40, 200), this.rngLoot.int(30, 110));
      this.time.delayedCall(300 + i * 250, () => {
        this.spawnPickup(
          this.rngLoot.pick<PickupKind>(['boleto', 'medio_globo', 'petardo', 'llave', 'golosina', 'taco_boletos']),
          t.x, t.y, { burst: true },
        );
        this.confetti(t.x, t.y - 10, 12);
      });
    }
  }

  /** Precio con descuento de la Entrada Dorada. */
  price(base: number): number {
    return this.effects.hasFlag('shopDiscount') ? Math.ceil(base / 2) : base;
  }

  itemPrice(id: string): number {
    return itemPrice(item(id), this.effects.hasFlag('shopDiscount'));
  }

  /** Texto en el suelo de la sala (instrucciones, carteles). */
  floorText(x: number, y: number, s: string, color = 0xefe6d8, alpha = 0.5): void {
    const t = txt(this, x, y, s, color, 'center').setAlpha(alpha).setDepth(DEPTH.decal);
    this.roomObjs.push(t);
  }
}
