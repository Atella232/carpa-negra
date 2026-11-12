// Lista de opciones navegable con teclado, mando, ratón o dedo. La usan el
// menú principal, la pausa y las opciones.
import Phaser from 'phaser';
import { txt, setTxt } from './text';
import { Controls } from '../systems/Controls';
import { sfx } from '../audio/sfx';

export interface MenuItem {
  label: () => string;
  onSelect?: () => void;
  /** Cambiar el valor con izquierda / derecha. */
  onAdjust?: (dir: -1 | 1) => void;
  enabled?: () => boolean;
  /** Texto de ayuda que aparece abajo al estar encima. */
  hint?: () => string;
}

export interface MenuOpts {
  x: number;
  y: number;
  /** Separación entre filas. */
  step?: number;
  color?: number;
  dim?: number;
  /** Al pulsar cancelar / Esc. */
  onBack?: () => void;
  align?: 'left' | 'center';
  depth?: number;
}

export class Menu {
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private cursor: Phaser.GameObjects.BitmapText;
  private hintTxt: Phaser.GameObjects.BitmapText | null = null;
  index = 0;
  private alive = true;
  private hold = 0;
  private lastStick = { x: 0, y: 0 };

  constructor(private scene: Phaser.Scene, private items: MenuItem[], private o: MenuOpts) {
    const step = o.step ?? 10;
    const align = o.align ?? 'center';
    items.forEach((it, i) => {
      const t = txt(scene, o.x, o.y + i * step, it.label(), o.color ?? 0xefe6d8, align).setDepth(o.depth ?? 10);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.go(i));
      t.on('pointerdown', () => {
        this.go(i);
        this.select();
      });
      this.rows.push(t);
    });
    this.cursor = txt(scene, 0, 0, '>', 0xf2c14e).setDepth(o.depth ?? 10);
    this.hintTxt = txt(scene, scene.scale.width / 2, scene.scale.height - 12, '', 0x8a8394, 'center').setDepth(o.depth ?? 10);
    while (!this.enabled(this.index) && this.index < items.length - 1) this.index++;
    this.refresh();
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => this.destroy());
  }

  private enabled(i: number): boolean {
    return this.items[i]?.enabled?.() ?? true;
  }

  private go(i: number): void {
    if (!this.enabled(i) || i === this.index) return;
    this.index = i;
    sfx('aviso');
    this.refresh();
  }

  private move(d: number): void {
    let i = this.index;
    for (let k = 0; k < this.items.length; k++) {
      i = (i + d + this.items.length) % this.items.length;
      if (this.enabled(i)) break;
    }
    this.go(i);
  }

  private select(): void {
    const it = this.items[this.index];
    if (!it || !this.enabled(this.index)) return;
    if (it.onSelect) {
      sfx('compra');
      it.onSelect();
    } else if (it.onAdjust) it.onAdjust(1);
    if (this.alive) this.refresh();
  }

  refresh(): void {
    if (!this.alive) return;
    this.items.forEach((it, i) => {
      const t = this.rows[i];
      setTxt(t, it.label());
      const on = this.enabled(i);
      t.setTint(i === this.index ? 0xf2c14e : on ? (this.o.color ?? 0xefe6d8) : (this.o.dim ?? 0x55505e));
    });
    const r = this.rows[this.index];
    if (r) {
      const left = (this.o.align ?? 'center') === 'center' ? r.x - r.width / 2 : r.x;
      this.cursor.setPosition(left - 8, r.y);
    }
    setTxt(this.hintTxt!, this.items[this.index]?.hint?.() ?? '');
  }

  private update(_t: number, delta: number): void {
    if (!this.alive) return;
    const c = Controls.get();
    c.update();
    // Con mando, los botones de disparo son aceptar/cancelar: se navega con cruceta o stick.
    const pad = c.lastDevice === 'mando';
    const mv = c.move();
    const sy = mv.y < -0.6 ? -1 : mv.y > 0.6 ? 1 : 0;
    const sx = mv.x < -0.6 ? -1 : mv.x > 0.6 ? 1 : 0;
    const stickUp = sy === -1 && this.lastStick.y !== -1,
      stickDown = sy === 1 && this.lastStick.y !== 1;
    const stickLeft = sx === -1 && this.lastStick.x !== -1,
      stickRight = sx === 1 && this.lastStick.x !== 1;
    this.lastStick = { x: sx, y: sy };
    const up = stickUp || (!pad && c.pressed('dispararArriba'));
    const down = stickDown || (!pad && c.pressed('dispararAbajo'));
    const left = stickLeft || (!pad && c.pressed('dispararIzquierda'));
    const right = stickRight || (!pad && c.pressed('dispararDerecha'));
    // Mantener una dirección repite.
    const held = sy !== 0 || (!pad && (c.isDown('dispararAbajo') || c.isDown('dispararArriba')));
    this.hold = held ? this.hold + delta : 0;
    if (up) this.move(-1);
    else if (down) this.move(1);
    else if (this.hold > 380) {
      this.hold = 300;
      this.move(sy > 0 || c.isDown('dispararAbajo') ? 1 : -1);
    }
    const it = this.items[this.index];
    if ((left || right) && it?.onAdjust && this.enabled(this.index)) {
      it.onAdjust(left ? -1 : 1);
      sfx('aviso');
      this.refresh();
    }
    if (c.pressed('aceptar') || (!pad && c.pressed('activo'))) this.select();
    else if ((c.pressed('cancelar') || c.pressed('pausa')) && this.o.onBack) this.o.onBack();
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.scene.events.off('update', this.update, this);
    for (const r of this.rows) r.destroy();
    this.cursor.destroy();
    this.hintTxt?.destroy();
  }
}
