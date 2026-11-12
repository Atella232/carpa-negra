// Escena principal: bucle de juego, colisiones y API para entidades y sistemas.
import Phaser from 'phaser';
import { COLS, DEPTH, HUD_H, ROOM_H, ROOM_W, tileX, tileY, toCol, toRow } from '../config';
import type { Dir } from '../core/floorgen';
import { RunState, currentRoom, PickupKind, RoomState } from '../core/run';
import { actDef, romano } from '../data/acts';
import { computeStats, FinalStats, StatSource } from '../core/stats';
import { setBonuses } from '../data/sets';
import { characterDef } from '../data/characters';
import { Rng } from '../core/rng';
import { item, itemPrice } from '../data/items';
import { Controls } from '../systems/Controls';
import { Nav } from '../systems/Nav';
import { ItemEffects, Applause } from '../systems/ItemEffects';
import { DoorInfo } from '../systems/RoomBuilder';
import { Telegraph } from '../systems/Telegraph';
import { Oscuridad } from '../systems/Oscuridad';
import { lob } from '../entities/Lob';
import * as combat from '../systems/combat';
import * as pickups from '../systems/pickups';
import * as roomFlow from '../systems/roomFlow';
import { Fx } from '../systems/Fx';
import { Player } from '../entities/Player';
import { Shot, ShotOpts } from '../entities/Shot';
import { Enemy } from '../entities/Enemy';
import { spawnCreature } from '../entities/spawn';
import { CHAMPIONS, GIB_COLOR, BOSS_NAMES } from '../data/enemies';
import type { Champion, EnemyKind } from '../data/enemies';
import { Pickup, Pedestal, Bomb, Obstacle, Fire } from '../entities/props';
import { Familiar, createFamiliar, Paloma } from '../entities/familiars';
import { sfx, SfxName } from '../audio/sfx';
import { setMusicIntensity, setMusicLowHp, setCrowd } from '../audio/music';
import { installDebug } from '../debug/debugApi';
import { DEBUG } from '../config';
import { txt } from '../ui/text';
import { addToAlbum, writeSave } from '../core/save';
import { recordEvent, MetaEvent } from '../core/meta';
import { statDiff } from '../ui/statInfo';

export interface Groups {
  walls: Phaser.Physics.Arcade.StaticGroup;
  doors: Phaser.Physics.Arcade.StaticGroup;
  /** Huecos de puertas abiertas: el payaso pasa, lo demás no. */
  gaps: Phaser.Physics.Arcade.StaticGroup;
  solids: Phaser.Physics.Arcade.StaticGroup;
  /** Obstáculos altos (espejos, podio, cañones...): ni los zancos ni los voladores los cruzan. */
  altos: Phaser.Physics.Arcade.StaticGroup;
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
  /** Bolos: pelotas quietas en el suelo (como mucho 12). */
  bolos: Shot[] = [];
  /** Mazo de Feria: a quién se le está dando seguido y cuántas veces. */
  ramp: { target: Enemy | null; n: number } = { target: null, n: 0 };
  /** Tachuelas (las temporales del faquir llevan `armed`: solo pinchan cuando dice). */
  spikes: { x: number; y: number; armed?: () => boolean }[] = [];
  /** Objetos propios de la sala (decorado, carteles...) que se borran al salir. */
  roomObjs: Phaser.GameObjects.GameObject[] = [];
  /** Dibujos de puertas (se rehacen al abrirse). */
  doorObjs: Phaser.GameObjects.GameObject[] = [];
  roomUpdate: ((dt: number) => void)[] = [];
  familiars: Familiar[] = [];
  tempFamiliars: Paloma[] = [];
  trapdoor: Phaser.GameObjects.Sprite | null = null;
  /** @internal */ trapdoorArmed = false;
  bossIds: Enemy[] = [];

  god = false;
  transitioning = false;
  /** Segundos que quedan de controles invertidos (golosina de mareo). */
  mareoT = 0;
  banners: BannerMsg[] = [];
  /** @internal */ bg: Phaser.GameObjects.Image | null = null;
  /** @internal */ pickupMsgCd = 0;
  /** @internal */ roomTime = 0;
  /** Segundos desde que se entró en la sala. */
  get roomTimeSec(): number {
    return this.roomTime;
  }
  /** Avisos de ataque en el suelo. */
  telegraph!: Telegraph;
  /** Oscuridad de la sala (apagones, La Luna de Madame Fortuna). */
  dark: Oscuridad | null = null;
  /** Charcos y zonas del suelo que frenan (crema, tomate...). */
  zones: { x: number; y: number; r: number; life: number; img: Phaser.GameObjects.Image }[] = [];
  fx!: Fx;
  /** Milisegundos que le quedan a la parada de impacto en curso (la descuenta el marcador). */
  frozenFor = 0;
  /** Segundos que quedan de viñeta roja tras recibir daño. */
  hurtT = 0;
  /** Puerta por la que se entra en la sala que se está construyendo. */
  entryDir: Dir | null = null;
  /** Se ha recibido daño en esta sala (para la Pluma de Sangre). */
  roomHurt = false;
  /** Las paredes devuelven una vez las balas enemigas (Tu Reflejo, fase 2). */
  wallReflect = false;
  /** Nombre de quien dispara ahora mismo (lo pone la criatura en su turno). */
  shotCause = '';
  /** Quién te dio el último golpe (para el resumen de la función). */
  lastHurtCause = '';
  /** @internal */ roomHurtHalves = 0;
  /** Cartel de presentación del jefe en curso (lo dibuja y lo avanza el marcador). */
  bossIntro: { name: string; tagline: string; texture: string; t: number; dur: number; started: boolean } | null = null;
  /** Velocidad que imprime el suelo (cintas) por baldosa: índice c + r·13. */
  floorField = new Map<number, { x: number; y: number }>();
  /** Condiciones que impiden dar la sala por limpia (oleadas, fases...). */
  clearBlockers: (() => boolean)[] = [];
  /** Temporizadores de partida: no se cancelan al cambiar de sala. */
  private runTimers: { t: number; fn: () => void }[] = [];
  /** Regalos del público aún en el aire (si sales, se quedan en la sala). */
  /** @internal */ pendingGifts: { kind: PickupKind; x: number; y: number; done: boolean }[] = [];

  // --- Delegados: el código vive en systems/combat.ts, pickups.ts y roomFlow.ts ---
  setupColliders = combat.setupColliders;
  shotHitWall = combat.shotHitWall;
  wallMirror = combat.wallMirror;
  shotHitTall = combat.shotHitTall;
  shotHitSolid = combat.shotHitSolid;
  shotHitEnemy = combat.shotHitEnemy;
  hitObstacle = combat.hitObstacle;
  destroyObstacle = combat.destroyObstacle;
  touchSolid = combat.touchSolid;
  touchDoor = combat.touchDoor;
  hurtPlayer = combat.hurtPlayer;
  killPlayer = combat.killPlayer;
  explode = combat.explode;
  zap = combat.zap;
  breakTall = combat.breakTall;
  revealSecretsNear = combat.revealSecretsNear;
  giveItem = pickups.giveItem;
  touchPedestal = pickups.touchPedestal;
  needMsg = pickups.needMsg;
  touchPickup = pickups.touchPickup;
  openChest = pickups.openChest;
  spawnPickup = pickups.spawnPickup;
  applauseReward = pickups.applauseReward;
  preItem = pickups.preItem;
  drawItem = pickups.drawItem;
  addPedestal = pickups.addPedestal;
  enterRoom = roomFlow.enterRoom;
  slamDoors = roomFlow.slamDoors;
  clearRoom = roomFlow.clearRoom;
  saveRoom = roomFlow.saveRoom;
  snapshotRun = roomFlow.snapshotRun;
  goThrough = roomFlow.goThrough;
  slideTo = roomFlow.slideTo;
  updateSlide = roomFlow.updateSlide;
  checkDoors = roomFlow.checkDoors;
  onRoomCleared = roomFlow.onRoomCleared;
  rollClearReward = roomFlow.rollClearReward;
  dropRandom = roomFlow.dropRandom;
  onBossDefeated = roomFlow.onBossDefeated;
  addTrapdoor = roomFlow.addTrapdoor;
  checkTrapdoor = roomFlow.checkTrapdoor;
  addFinale = roomFlow.addFinale;
  finish = roomFlow.finish;
  startChallenge = roomFlow.startChallenge;
  challengeReward = roomFlow.challengeReward;

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
    this.finale = null;
    this.curtain = null;
    this.bossIds = [];
    this.god = false;
    this.transitioning = false;
    this.mareoT = 0;
    this.statChanges = new Map();
    this.floorField = new Map();
    this.clearBlockers = [];
    this.fireListeners = [];
    this.floatCount = 0;
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
      gaps: this.physics.add.staticGroup(),
      solids: this.physics.add.staticGroup(),
      altos: this.physics.add.staticGroup(),
      pits: this.physics.add.staticGroup(),
      pedestals: this.physics.add.staticGroup(),
      pShots: this.physics.add.group(),
      eShots: this.physics.add.group(),
      enemies: this.physics.add.group(),
      pickups: this.physics.add.group(),
      bombs: this.physics.add.group(),
    };
    this.controls = Controls.get();
    this.controls.inverted = false;
    this.effects = new ItemEffects(this);
    this.applause = new Applause(this);
    this.runTimers = [];
    this.pendingGifts = [];
    this.telegraph = new Telegraph(this);
    this.fx = new Fx(this);
    this.frozenFor = 0;
    this.hurtT = 0;
    this.bossIntro = null;
    this.slide = null;
    this.recomputeStats();
    this.player = new Player(this, ROOM_W / 2, ROOM_H / 2 + 10);
    this.rebuildFamiliars();
    this.setupColliders();

    this.scene.launch('Hud');
    this.events.once('shutdown', () => {
      this.scene.stop('Hud');
      this.controls.releaseAll();
    });

    this.enterRoom(currentRoom(this.run), this.run.entry ?? null);
    // Al empezar un acto nuevo, el telón se abre con su cartela; si no, aviso normal.
    if (this.run.curtainOpen) {
      this.run.curtainOpen = false;
      this.curtain = { t: 0, closing: false };
      this.snd('telon');
    } else this.banner(`Acto ${romano(this.run.act)}`, this.run.actName);
    // Al cambiar de acto se recupera vida: se avisa sobre el payaso.
    if (this.run.actHeal > 0) {
      const n = this.run.actHeal;
      this.run.actHeal = 0;
      this.time.delayedCall(500, () => {
        this.floatText(n >= 2 ? '+1 globo' : '+ medio globo', 0xd4323f);
        this.snd('globo');
      });
    }
    // Bola de Cristal: al empezar el acto, sabes qué jefe te espera.
    if (this.effects.hasFlag('revealMap')) {
      this.later(3, () => this.banner(`Te espera ${BOSS_NAMES[this.run.boss]}`, 'La Bola de Cristal lo ha visto'));
    }
    if (DEBUG) installDebug(this);
  }

  // ------------------------------------------------------------------
  // Colisiones
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Salas
  // ------------------------------------------------------------------

  /** Llama a `fn` dentro de `sec` segundos de juego, aunque se cambie de sala. */
  later(sec: number, fn: () => void): void {
    this.runTimers.push({ t: sec, fn });
  }

  /** Transición deslizante en curso. */
  /** @internal */ slide: { t: number; dur: number; x: number; y: number; img: Phaser.GameObjects.Image } | null = null;

  // ------------------------------------------------------------------
  // Bucle
  // ------------------------------------------------------------------
  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.controls.update();
    this.updateSlide(dt);
    this.pickupMsgCd = Math.max(0, this.pickupMsgCd - dt);
    this.roomTime += dt;
    if (!this.player.dead) this.run.playTime += dt;
    this.mareoT = Math.max(0, this.mareoT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.volteretaCd = Math.max(0, this.volteretaCd - dt);
    for (const [k, v] of this.statChanges) {
      v.t -= dt;
      if (v.t <= 0) this.statChanges.delete(k);
    }
    this.controls.inverted = this.mareoT > 0;
    for (const b of this.banners) b.t -= dt;
    this.banners = this.banners.filter((b) => b.t > 0);
    if (this.runTimers.length) {
      const due = this.runTimers.filter((t) => (t.t -= dt) <= 0);
      this.runTimers = this.runTimers.filter((t) => t.t > 0);
      for (const t of due) t.fn();
    }

    // Cartel del jefe: congela la sala mientras se presenta.
    if (this.bossIntro && !this.bossIntro.started && !this.transitioning) {
      this.bossIntro.started = true;
      this.scene.pause();
      return;
    }
    if (this.controls.pressed('pausa') && !this.player.dead) {
      this.openPause();
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
    this.telegraph.update(dt);
    this.updateZones(dt);
    this.dark?.update();
    for (const o of this.g.solids.getChildren() as Obstacle[]) o.tick?.(dt);
    this.hazards = this.hazards.filter((h) => h.active);

    const p = this.run.player;
    if (!this.player.locked) {
      if (this.controls.pressed('petardo') && p.bombs > 0) {
        p.bombs--;
        this.run.stats.bombsUsedAct++;
        new Bomb(this, this.player.x, this.player.y + 2);
        this.snd('petardo');
      }
      if (this.controls.pressed('activo')) {
        const rules = characterDef(p.character).rules;
        // Colombina: sin objeto activo, el botón hace una voltereta que se recarga sola.
        if (!p.active && rules?.voltereta) this.voltereta();
        else if (this.effects.useActive()) this.recomputeStats();
      }
      if (this.controls.pressed('golosina')) this.effects.useGolosina();
    }

    if (this.statsKey !== this.dynKey()) this.recomputeStats();
    // La música sigue a la partida: combate, calma y poca vida.
    // Con El Maestro, la música gana capas en cada fase.
    const boss = this.bossIds[0] as Enemy & { phase?: number };
    const phaseLayer = boss?.active && boss.phase !== undefined ? [0.5, 0.8, 1][boss.phase] ?? 1 : 1;
    setMusicIntensity(this.room.cleared ? 0.35 : phaseLayer);
    // En la Pista Central el público murmura más cuanto más lleno está el aplausómetro.
    setCrowd(actDef(this.run.act).mods?.publico ? (this.applause.value < 0 ? this.applause.value / 6 : 0.25 + this.applause.value / 14) : 0);
    setMusicLowHp(p.hp + p.shield <= 2);

    this.checkHazards();
    this.checkDoors();
    this.checkTrapdoor();

    const alive = this.clearPending().length;
    if (!this.room.cleared && alive === 0 && this.roomTime > 0.3 && !this.clearBlockers.some((b) => b())) this.onRoomCleared();
    this.applyFreeze();
  }

  /** Aplica la parada de impacto pedida este fotograma: pausa la escena y el marcador la reanuda. */
  private applyFreeze(): void {
    const ms = this.fx.pendingFreeze;
    this.fx.pendingFreeze = 0;
    if (ms <= 0 || this.player.dead || this.transitioning) return;
    this.frozenFor = Math.max(this.frozenFor, ms);
    this.scene.pause();
  }

  /** Un fuego (charco o brasero) apagado: cuenta para la partida y para el cartel de Bombero. */
  fuegoApagado(): void {
    this.run.stats.fuegos = (this.run.stats.fuegos ?? 0) + 1;
    this.meta('fuego');
  }

  /** Tus disparos apagan el fuego del suelo (los de fuego lo atraviesan sin apagarlo). */
  private checkFireShots(): void {
    if (!this.hazards.length) return;
    for (const s of this.g.pShots.getChildren() as Shot[]) {
      if (s.dead || !s.active || s.opts.burn) continue;
      // La sombra de la pelota (8 px por debajo) es lo que pasa por el suelo:
      // el mismo margen con el que el fuego quema al payaso.
      const fire = this.hazards.find((h) => h.active && h.life > 0.3 && Math.abs(s.x - h.x) < 8 && Math.abs(s.y + 8 - h.y) < 9);
      if (!fire) continue;
      // El agua (Flor de Solapa) lo apaga de un golpe.
      fire.douse(s.opts.water ? 99 : s.opts.damage >= 7 ? 2 : 1);
      if (!s.opts.pierce && !s.opts.spectral) s.pop('obstaculo');
    }
  }

  private checkHazards(): void {
    this.checkFireShots();
    const pl = this.player;
    const flying = this.effects.hasFlag('flight');
    if (!flying) {
      for (const s of this.spikes) {
        if (s.armed && !s.armed()) continue;
        if (Math.abs(pl.x - s.x) < 8 && Math.abs(pl.y - s.y) < 8) {
          this.hurtPlayer(1, s.x, s.y, { cause: 'unas tachuelas' });
          break;
        }
      }
    }
    for (const h of this.hazards) {
      if (h.life > 0.3 && Math.abs(pl.x - h.x) < 7 && Math.abs(pl.y + 2 - h.y) < 6) {
        this.hurtPlayer(1, h.x, h.y, { cause: 'el fuego' });
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // Jugador
  // ------------------------------------------------------------------

  /** @internal */ finale: { hatT: number } | null = null;
  /** Telón entre actos: lo dibuja el marcador. */
  curtain: { t: number; closing: boolean } | null = null;

  /**
   * Suceso para los carteles (logros). Las partidas con semilla escrita no
   * dan carteles; la función del día sí.
   */
  meta(k: string, arg?: string | number | boolean): void {
    const r = this.run;
    if (r.mode === 'semilla') return;
    let ev: MetaEvent | null = null;
    switch (k) {
      case 'traje':
        ev = { k: 'traje', id: String(arg) };
        break;
      case 'gordo':
        ev = { k: 'gordo' };
        break;
      case 'golosina':
        ev = { k: 'golosina', effect: String(arg) };
        break;
      case 'espejo':
        ev = { k: 'espejo' };
        break;
      case 'fuego':
        ev = { k: 'fuego' };
        break;
      case 'trastienda':
        ev = { k: 'trastienda' };
        break;
      case 'ladron':
        ev = { k: 'ladron' };
        break;
      case 'ovacion':
        ev = { k: 'ovacion', count: Number(arg) };
        break;
      case 'contrato':
        ev = { k: 'contrato', signed: Number(arg) };
        break;
      case 'jefe':
        ev = { k: 'jefe', boss: r.boss, clean: !r.player.redDamageTaken };
        break;
      case 'final_libertad':
        ev = { k: 'final', ending: 'libertad' };
        break;
      case 'final_maestro':
        ev = { k: 'final', ending: 'maestro' };
        break;
      case 'acto':
        ev = { k: 'acto', act: r.act, clean: !r.player.redDamageTaken, bombsUsed: r.stats.bombsUsedAct, daily: r.mode === 'diaria' };
        break;
    }
    if (!ev) return;
    let fresh: ReturnType<typeof recordEvent> = [];
    writeSave((s) => (fresh = recordEvent(s, ev!)));
    fresh.forEach((c, i) =>
      this.later(1.2 + i * 2.8, () => {
        this.banner('¡Nuevo cartel!', c.reward ? `${c.name} · ${c.reward}` : c.name);
        this.snd('cartel');
      }),
    );
  }

  private volteretaCd = 0;
  /** Voltereta de Colombina: un salto rápido e invulnerable. */
  private voltereta(): void {
    if (this.volteretaCd > 0) return;
    this.volteretaCd = 2.5;
    const m = this.controls.move();
    const d = m.x || m.y ? m : this.player.lastShotDir;
    this.player.dash = { vx: d.x * 260, vy: d.y * 260, t: 0.22, harmless: true };
    this.player.invuln = Math.max(this.player.invuln, 0.3);
    this.snd('salto');
    this.fx.dust(this.player.x, this.player.y + 4, 4);
  }

  /** Abre la pausa (también al perder el foco de la ventana). */
  openPause(): void {
    if (!this.scene.isActive() || this.player?.dead || this.transitioning) return;
    this.scene.launch('Pausa');
    this.scene.pause();
  }

  /** Salir a mitad de partida (pausa → reiniciar o menú) también cuenta como función. */
  abandonRun(): void {
    const r = this.run;
    addToAlbum(r.seenItems);
    writeSave((s) => {
      s.runs++;
      s.records.streak = 0;
      s.records.kills += r.kills;
      s.records.furthestAct = Math.max(s.records.furthestAct, r.act);
    });
  }

  recomputeStats(): void {
    const p = this.run.player;
    this.effects.refreshFlags();
    const sources: StatSource[] = p.passives.map((id) => item(id));
    sources.push({ stats: p.bonus });
    sources.push({ stats: this.effects.dynamicStats() });
    for (const b of setBonuses(p.passives)) sources.push(b.source);
    const ch = characterDef(p.character);
    sources.push({ stats: ch.stats, shot: ch.shot });
    this.stats = computeStats(sources);
    this.statsKey = this.dynKey();
  }

  private statsKey = '';
  /** Lo que hace cambiar las estadísticas dinámicas (vida, salas limpias). */
  private dynKey(): string {
    const p = this.run.player;
    return `${p.hp}/${p.maxHp}/${p.cleanRooms ?? 0}`;
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

  /** Quien quiera saber que el payaso ha disparado (reflejos, espejos...). Se vacía al cambiar de sala. */
  fireListeners: ((dir: { x: number; y: number }) => void)[] = [];

  onPlayerFire(dir: { x: number; y: number }): void {
    for (const fn of this.fireListeners) fn(dir);
  }

  // ------------------------------------------------------------------
  // API para entidades
  // ------------------------------------------------------------------
  snd(name: SfxName): void {
    sfx(name);
  }

  difficultyHpMult(): number {
    return actDef(this.run.act).hpMult;
  }

  /**
   * El público lanza `n` tomates hacia (x, y) desde las gradas: caen sobre
   * una sombra marcada y dejan un charco que frena.
   */
  publicThrow(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const tx = Phaser.Math.Clamp(x + (i === 0 ? 0 : this.rngCombat.int(-28, 28)), 24, ROOM_W - 24);
      const ty = Phaser.Math.Clamp(y + (i === 0 ? 0 : this.rngCombat.int(-20, 20)), 24, ROOM_H - 22);
      const fromX = this.rngCombat.chance(0.5) ? this.rngCombat.int(20, ROOM_W - 20) : this.rngCombat.chance(0.5) ? 4 : ROOM_W - 4;
      const fromY = fromX === 4 || fromX === ROOM_W - 4 ? this.rngCombat.int(30, ROOM_H - 30) : this.rngCombat.chance(0.5) ? 2 : ROOM_H - 2;
      this.time.delayedCall(i * 160, () =>
        lob(this, fromX, fromY, tx, ty, {
          texture: 'tomate', dur: 0.85, height: 30, radius: 9, halves: 0, spin: true, color: 0xe8743b,
          onLand: (lx, ly) => {
            this.snd('tomate');
            this.addZone(lx, ly, 12, 3.5, 'charco_tomate');
            this.fx.debris(lx, ly, 0xd4323f, 5);
            if (Math.hypot(this.player.x - lx, this.player.y - ly) < 11) this.hurtPlayer(1, lx, ly, { fromPublic: true, cause: 'el público' });
          },
        }),
      );
    }
  }

  /** Apaga (o enciende) las luces de la sala. */
  setDark(on: boolean): void {
    if (on && !this.dark) this.dark = new Oscuridad(this);
    else if (!on && this.dark) {
      this.dark.destroy();
      this.dark = null;
    }
  }

  /** Charco que frena al payaso y a las criaturas de suelo. */
  addZone(x: number, y: number, r: number, life: number, texture = 'charco_crema'): void {
    const img = this.add.image(x, y, texture).setDepth(DEPTH.decal + 0.5).setScale(r / 10);
    this.roomObjs.push(img);
    this.zones.push({ x, y, r, life, img });
  }

  private updateZones(dt: number): void {
    if (!this.zones.length) return;
    this.zones = this.zones.filter((z) => {
      z.life -= dt;
      if (z.life < 1) z.img.setAlpha(Math.max(0, z.life));
      if (z.life <= 0) {
        z.img.destroy();
        return false;
      }
      for (const e of this.targets()) if (!e.flying && Math.hypot(e.x - z.x, e.y - z.y) < z.r) e.slowT = Math.max(e.slowT, 0.2);
      return true;
    });
  }

  /** ¿Pisa el payaso un charco? (frena). */
  playerSlowed(): boolean {
    if (this.effects.hasFlag('flight')) return false;
    return this.zones.some((z) => Math.hypot(this.player.x - z.x, this.player.y + 3 - z.y) < z.r);
  }

  /** Empuje del suelo (cintas) en el punto (x, y), en px/s. */
  floorPush(x: number, y: number): { x: number; y: number } | null {
    if (!this.floorField.size) return null;
    return this.floorField.get(toCol(x) + toRow(y) * COLS) ?? null;
  }

  /** Crea una criatura (las criaturas que invocan a otras usan esto). */
  spawn(kind: EnemyKind, x: number, y: number, champion: Champion | null = null): Enemy {
    return spawnCreature(this, kind, x, y, champion);
  }

  spawnShot(x: number, y: number, vx: number, vy: number, friendly: boolean, opts: ShotOpts): Shot {
    // Reloj Parado: las balas enemigas van más lentas. La Gira 3+: más rápidas.
    if (!friendly) {
      const k = (this.effects.hasFlag('relojParado') ? 0.75 : 1) * (this.run.gira >= 2 ? 1.12 : 1);
      vx *= k;
      vy *= k;
    }
    const s = new Shot(this, x, y, vx, vy, friendly, opts);
    if (!friendly && this.shotCause) s.cause = this.shotCause;
    return s;
  }

  spawnFire(x: number, y: number, life: number): void {
    const fx = Phaser.Math.Clamp(x, 22, ROOM_W - 22);
    const fy = Phaser.Math.Clamp(y, 22, ROOM_H - 22);
    if (this.nav.isBlocked(toCol(fx), toRow(fy))) return;
    new Fire(this, fx, fy, life);
  }

  shockwave(x: number, y: number): void {
    const s = this.add.sprite(x, y, 'onda', 0).setDepth(DEPTH.fx);
    s.play('onda').once('animationcomplete', () => s.destroy());
  }

  splash(x: number, y: number, tex: string, scale = 1): void {
    this.fx.splash(x, y, tex, scale);
  }

  confetti(x: number, y: number, n: number): void {
    this.fx.confetti(x, y, n);
  }

  debris(x: number, y: number, color: string | number): void {
    this.fx.debris(x, y, typeof color === 'number' ? color : color === 'W' ? 0xffffff : 0xa8673b);
  }

  shake(ms: number, intensity: number): void {
    this.fx.shake(ms, intensity);
  }

  /** Parada de impacto: congela el juego unos milisegundos. */
  freeze(ms: number): void {
    this.fx.freeze(ms);
  }

  banner(title: string, sub: string): void {
    this.banners.push({ title, sub, t: 2.6 });
    if (this.banners.length > 2) this.banners.shift();
  }

  /** Criaturas que faltan por matar para limpiar la sala. */
  clearPending(): Enemy[] {
    return (this.g.enemies.getChildren() as Enemy[]).filter((e) => e.active && !e.dead && e.countsForClear);
  }

  /** Criaturas a las que se puede apuntar (explosiones, familiares, teledirigidos...). */
  targets(): Enemy[] {
    return (this.g.enemies.getChildren() as Enemy[]).filter((e) => e.active && !e.dead && (e.targetable ?? e.countsForClear));
  }

  /** @deprecated usa clearPending() o targets(). */
  enemiesAlive(): Enemy[] {
    return (this.g.enemies.getChildren() as Enemy[]).filter((e) => e.active && !e.dead && e.countsForClear);
  }

  nearestEnemy(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of this.targets()) {
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
    this.fx.pop(e);
    this.confetti(e.x, e.y, e.isBoss ? 40 : 6);
    this.fx.debris(e.x, e.y, (e.champion ? CHAMPIONS[e.champion].tint : GIB_COLOR[e.texture.key]) ?? 0xd4323f, e.isBoss ? 16 : 7);
    const f = this.rngCombat.int(0, 2);
    this.addDecal(e.x, e.body.bottom - 2, f, e.isBoss ? 2.2 : 1);
    this.applause.onKill();
    this.effects.onKill();
    if (e.champion === 'dorado') {
      for (let i = 0; i < 3; i++) this.spawnPickup('boleto', e.x, e.y, { burst: true });
    } else if (!e.isBoss && this.rngLoot.chance(0.04 + this.stats.luck * 0.01)) {
      this.dropRandom(e.x, e.y);
    }
    if (e.isBoss) {
      this.shake(300, 0.01);
      if (!this.clearPending().some((o) => o.isBoss && o !== e)) {
        this.freeze(320);
        this.fx.flash(260, 0xffffff, 0.6);
      }
    } else this.freeze(35);
  }

  /** Mancha en el suelo que se queda en la sala (máximo 40 por sala). */
  addDecal(x: number, y: number, f: number, scale = 1, tint?: number): void {
    const m = this.add.image(x, y, 'mancha', f).setDepth(DEPTH.decal).setScale(scale);
    if (tint !== undefined) m.setTint(tint);
    this.roomObjs.push(m);
    const d = this.room.decals;
    d.push({ x: Math.round(x), y: Math.round(y), f, s: scale, t: tint });
    if (d.length > 40) d.shift();
  }

  /** Estadísticas que acaban de cambiar (para resaltarlas en el panel). */
  statChanges = new Map<string, { up: boolean; t: number }>();

  /**
   * Compara con las estadísticas anteriores, muestra flechas sobre Pompón y
   * devuelve un resumen corto ("Daño ↑ · Velocidad ↓").
   */
  announceStats(before: FinalStats): string {
    const diff = statDiff(before, this.stats);
    diff.forEach((d) => {
      this.statChanges.set(d.label, { up: d.up, t: 4 });
      this.floatText(`${d.label} ${d.up ? '↑' : '↓'}`, d.up ? 0x79b84a : 0xd4323f);
    });
    return diff.map((d) => `${d.label} ${d.up ? '↑' : '↓'}`).slice(0, 3).join(' · ');
  }

  /** @internal */ floatCount = 0;

  /** Texto que sube y se desvanece sobre el payaso. */
  floatText(s: string, color: number): void {
    const i = this.floatCount++;
    this.time.delayedCall(i * 180, () => {
      const x = Phaser.Math.Clamp(this.player.x, 50, ROOM_W - 50);
      const t = txt(this, x, Math.max(20, this.player.y - 30), s, color, 'center').setDepth(DEPTH.overlay);
      this.roomObjs.push(t);
      this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 600, duration: 900, onComplete: () => t.destroy() });
      this.time.delayedCall(200, () => (this.floatCount = Math.max(0, this.floatCount - 1)));
    });
  }

  /** Precio con descuento de la Entrada Dorada. */
  price(base: number): number {
    const b = this.run.gira >= 3 ? Math.ceil(base * 1.5) : base;
    return this.effects.hasFlag('shopDiscount') ? Math.ceil(b / 2) : b;
  }

  itemPrice(id: string): number {
    const p = itemPrice(item(id), false);
    return this.price(p);
  }

  /** Texto en el suelo de la sala (instrucciones, carteles). */
  floorText(x: number, y: number, s: string, color = 0xefe6d8, alpha = 0.5): void {
    const t = txt(this, x, y, s, color, 'center').setAlpha(alpha).setDepth(DEPTH.decal);
    this.roomObjs.push(t);
  }
}
