// Recogibles, pedestales de objetos, petardos, obstáculos y fuego.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEPTH, ROOM_H, ROOM_W, TILE } from '../config';
import { PickupKind } from '../core/run';
import { GOLOSINA_COLORS, GOLOSINA_TINT, GolosinaColor } from '../data/golosinas';
import { txt } from '../ui/text';

const PICKUP_TEX: Record<PickupKind, string> = {
  globo: 'globo',
  medio_globo: 'medio_globo',
  globo_plata: 'globo_plata',
  boleto: 'boleto',
  taco_boletos: 'taco_boletos',
  petardo: 'petardo',
  doble_petardo: 'doble_petardo',
  llave: 'llave',
  cofre: 'cofre',
  cofre_candado: 'cofre_candado',
  golosina: 'golosina',
};

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private shape: Phaser.GameObjects.Image | null = null;
  kind: PickupKind;
  price: number;
  color?: GolosinaColor;
  /** No se puede recoger hasta que termine de "caer". */
  delay = 0.35;
  opened = false;
  t = Math.random() * 6;
  private label?: Phaser.GameObjects.BitmapText;
  private shadow: Phaser.GameObjects.Image;

  constructor(scene: GameScene, x: number, y: number, kind: PickupKind, opts: { price?: number; color?: GolosinaColor; vx?: number; vy?: number } = {}) {
    super(scene, x, y, PICKUP_TEX[kind], 0);
    this.kind = kind;
    this.price = opts.price ?? 0;
    this.color = opts.color;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.g.pickups.add(this);
    this.body.setDrag(260, 260);
    this.body.setBounce(0.5);
    const chest = kind === 'cofre' || kind === 'cofre_candado';
    this.body.setSize(Math.min(this.width, 12), Math.min(this.height, 10));
    if (chest) this.body.setImmovable(true);
    if (kind === 'golosina' && this.color) {
      this.setTint(GOLOSINA_TINT[this.color]);
      // Forma propia de cada color (para quien no distingue colores).
      this.shape = scene.add.image(x, y, 'formas_golosina', GOLOSINA_COLORS.indexOf(this.color)).setDepth(DEPTH.world + y + 1);
    }
    this.body.setVelocity(opts.vx ?? 0, opts.vy ?? 0);
    this.shadow = scene.add.image(x, y + 6, 'sombra').setScale(0.7).setDepth(DEPTH.shadow);
    if (this.price > 0) {
      this.label = txt(scene, x, y + 9, `${this.price}`, 0xf2c14e, 'center').setDepth(DEPTH.overlay - 1);
      this.body.setImmovable(true);
      this.body.setDrag(10000, 10000);
      this.delay = 0;
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = Math.min(0.05, delta / 1000);
    this.delay = Math.max(0, this.delay - dt);
    this.t += dt;
    // Un petardo puede lanzarlo lejos, pero nunca fuera de la sala.
    const cx = Phaser.Math.Clamp(this.x, TILE + 4, ROOM_W - TILE - 4);
    const cy = Phaser.Math.Clamp(this.y, TILE + 4, ROOM_H - TILE - 4);
    if (cx !== this.x || cy !== this.y) {
      this.setPosition(cx, cy);
      this.body.reset(cx, cy);
    }
    const bob = this.kind.startsWith('globo') || this.kind === 'medio_globo' ? Math.sin(this.t * 3) * 1.5 : 0;
    this.setDisplayOrigin(this.width / 2, this.height / 2 + bob);
    this.body.setOffset((this.width - this.body.width) / 2, (this.height - this.body.height) / 2 + bob);
    this.setDepth(DEPTH.world + this.y);
    this.shadow.setPosition(this.x, this.y + this.height / 2 - 2);
    this.label?.setPosition(this.x, this.y + 8);
    this.shape?.setPosition(this.x, this.y).setDepth(this.depth + 0.1).setAlpha(this.alpha);
  }

  open(): void {
    this.opened = true;
    this.setFrame(1);
  }

  destroy(fromScene?: boolean): void {
    this.shadow?.destroy();
    this.label?.destroy();
    this.shape?.destroy();
    super.destroy(fromScene);
  }
}

/** Taburete con un objeto encima. */
export class Pedestal {
  readonly base: Phaser.Physics.Arcade.Image;
  icon: Phaser.GameObjects.Image | null = null;
  label: Phaser.GameObjects.Container | null = null;
  item: string | null;
  price: number;
  contractCost: number;
  t = Math.random() * 6;
  cooldown = 0.6;
  lastTouch = -Infinity;

  constructor(public scene: GameScene, public x: number, public y: number, item: string | null, opts: { price?: number; contractCost?: number } = {}) {
    this.item = item;
    this.price = opts.price ?? 0;
    this.contractCost = opts.contractCost ?? 0;
    this.base = scene.physics.add.staticImage(x, y + 4, 'taburete');
    this.base.setSize(16, 8).setOffset(2, 4);
    this.base.refreshBody();
    this.base.setDepth(DEPTH.world + y);
    this.base.setData('pedestal', this);
    scene.g.pedestals.add(this.base);
    this.setItem(item);
  }

  setItem(id: string | null): void {
    this.item = id;
    this.icon?.destroy();
    this.label?.destroy();
    this.icon = null;
    this.label = null;
    if (!id) return;
    this.icon = this.scene.add.image(this.x, this.y - 8, `obj_${id}`).setDepth(DEPTH.world + this.y + 1);
    if (this.price > 0) {
      this.label = this.scene.add.container(this.x, this.y + 10, [
        txt(this.scene, 0, 0, `${this.price}`, 0xf2c14e, 'center'),
      ]);
      this.label.setDepth(DEPTH.overlay - 1);
    } else if (this.contractCost > 0) {
      const parts: Phaser.GameObjects.GameObject[] = [];
      for (let i = 0; i < this.contractCost; i++) {
        parts.push(this.scene.add.image((i - (this.contractCost - 1) / 2) * 8, 4, 'hud_globo'));
      }
      this.label = this.scene.add.container(this.x, this.y + 10, parts).setDepth(DEPTH.overlay - 1);
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.icon) this.icon.setY(this.y - 9 + Math.sin(this.t * 2.5) * 1.5);
  }

  destroy(): void {
    this.base.destroy();
    this.icon?.destroy();
    this.label?.destroy();
  }
}

export class Bomb extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  fuse = 1.5;
  constructor(scene: GameScene, x: number, y: number, public hurtsPlayer = true, public damage = 40) {
    super(scene, x, y, 'petardo');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.g.bombs.add(this);
    this.body.setDrag(300, 300);
    this.setScale(1.3);
    this.setDepth(DEPTH.world + y);
  }
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.fuse -= Math.min(0.05, delta / 1000);
    const blink = this.fuse < 0.5 ? 18 : 8;
    if (Math.floor(this.fuse * blink) % 2 === 0) this.setTintFill(0xffffff);
    else this.clearTint();
    this.setScale(1.3 + (this.fuse < 0.4 ? (0.4 - this.fuse) : 0));
    this.setDepth(DEPTH.world + this.y);
    if (this.fuse <= 0) {
      const sc = this.scene as GameScene;
      const { x, y } = this;
      this.destroy();
      sc.explode(x, y, { damage: this.damage, hurtsPlayer: this.hurtsPlayer });
    }
  }
}

export type ObstacleKind = 'cajon' | 'cajon_marcado' | 'bloque' | 'palomitas' | 'brasero' | 'paja';

export class Obstacle extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  hits: number;
  extinguished = false;
  t = Math.random() * 5;

  constructor(scene: GameScene, x: number, y: number, public kind: ObstacleKind, public tile: number, hits = 0) {
    super(scene, x, y, kind === 'brasero' ? 'brasero' : kind, 0);
    this.hits = hits;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    scene.g.solids.add(this);
    this.setDepth(DEPTH.world + y - 6);
    if (kind === 'palomitas') this.setFrame(Math.min(2, hits));
    // Cuerpo de 16×16 centrado en la baldosa (el dibujo puede sobresalir).
    this.body.setSize(16, 16, true);
  }

  get breakableByShots(): boolean {
    return this.kind === 'palomitas' || (this.kind === 'brasero' && !this.extinguished);
  }

  tick(dt: number): void {
    if (this.kind === 'brasero' && !this.extinguished) {
      this.t += dt;
      this.setFrame(Math.floor(this.t * 8) % 3);
    }
  }
}

/**
 * Tachuela temporal (las que va dejando el faquir): brilla 0,4 s sin pinchar
 * (aviso), pincha unos segundos y desaparece.
 */
export class TempSpike extends Phaser.GameObjects.Sprite {
  t = 0;
  readonly entry: { x: number; y: number; armed: () => boolean };
  constructor(scene: GameScene, x: number, y: number, public life = 5.4) {
    super(scene, x, y, 'tachuelas', 0);
    scene.add.existing(this);
    this.setDepth(DEPTH.hazard).setScale(0.8).setTint(0xfff2a8).setAlpha(0.6);
    this.entry = { x, y, armed: () => this.active && this.t >= 0.4 };
    scene.spikes.push(this.entry);
    scene.roomObjs.push(this);
  }
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    this.life -= dt;
    if (this.t >= 0.4 && this.tintTopLeft !== 0xffffff) this.clearTint().setAlpha(1);
    if (this.life < 0.4) this.setAlpha(Math.max(0, this.life / 0.4));
    if (this.life <= 0) this.remove();
  }
  remove(): void {
    const sc = this.scene as GameScene;
    if (sc) sc.spikes = sc.spikes.filter((s) => s !== this.entry);
    this.destroy();
  }
}

/** Disparos que hacen falta para apagar un brasero. */
export const BRASERO_HITS = 3;

/** Aspecto del brasero según los golpes: la llama se apaga poco a poco. */
export function braseroLook(o: Obstacle): void {
  if (o.hits >= BRASERO_HITS) {
    o.extinguished = true;
    o.clearTint();
    o.setTexture('brasero_apagado');
  } else if (o.hits > 0) o.setTint(o.hits === 1 ? 0xcccccc : 0x999999);
}

/** Charco de fuego en el suelo (del Tragafuegos o del brasero). Se apaga a disparos. */
export class Fire extends Phaser.GameObjects.Sprite {
  life: number;
  t = 0;
  /** Disparos que aguanta antes de apagarse. */
  hp = 2;
  constructor(scene: GameScene, x: number, y: number, life: number) {
    super(scene, x, y, 'fuego_suelo', 0);
    this.life = life;
    scene.add.existing(this);
    scene.hazards.push(this);
    this.setDepth(DEPTH.hazard + 1);
    this.setScale(0.2);
    scene.tweens.add({ targets: this, scale: 1, duration: 150 });
  }
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    this.life -= dt;
    this.setFrame(Math.floor(this.t * 10) % 3);
    if (this.life < 0.4) this.setAlpha(Math.max(0, this.life / 0.4));
    if (this.life <= 0) this.destroy();
  }

  /** Le da agua (un disparo, un petardo): se encoge y, sin vida, se apaga. Devuelve si se apagó. */
  douse(n = 1): boolean {
    if (!this.active || this.life <= 0.3) return false;
    const sc = this.scene as GameScene;
    this.hp -= n;
    sc.fx.sparks(this.x, this.y - 2, 0xcfd3dc, 4);
    sc.snd('fuego');
    if (this.hp > 0) {
      this.setScale(0.7);
      return false;
    }
    sc.fx.dust(this.x, this.y, 3);
    sc.run.stats.fuegos = (sc.run.stats.fuegos ?? 0) + 1;
    this.destroy();
    return true;
  }
}
