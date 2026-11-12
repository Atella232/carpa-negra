import Phaser from 'phaser';
import { FONT_KEY, fontText, textWidth } from '../art/font';
import { t } from './i18n';

export type Align = 'left' | 'center' | 'right';

/** Texto con la fuente pixelada. x/y es la esquina según `align`. */
export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  color = 0xefe6d8,
  align: Align = 'left',
): Phaser.GameObjects.BitmapText {
  const b = scene.add.bitmapText(x, y, FONT_KEY, fontText(t(s)));
  b.setTint(color);
  b.setOrigin(align === 'left' ? 0 : align === 'center' ? 0.5 : 1, 0);
  if (align === 'center') b.setCenterAlign();
  else if (align === 'right') b.setRightAlign();
  return b;
}

export function setTxt(b: Phaser.GameObjects.BitmapText, s: string): void {
  const v = fontText(t(s));
  if (b.text !== v) b.setText(v);
}

/** Texto con sombra de 1 px (para leerse sobre cualquier fondo). */
export function shadowTxt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  color = 0xefe6d8,
  align: Align = 'left',
): Phaser.GameObjects.Container {
  const shadow = txt(scene, 1, 1, s, 0x0b0710, align);
  const main = txt(scene, 0, 0, s, color, align);
  return scene.add.container(x, y, [shadow, main]);
}

/** Parte un texto en líneas que quepan en `maxW` píxeles. */
export function wrap(s: string, maxW: number): string {
  const words = s.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (textWidth(test) > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}
