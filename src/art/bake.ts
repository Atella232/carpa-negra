// Convierte sprites ASCII o funciones de dibujo en texturas de Phaser.
// Si existe src/art/overrides/<clave>.png se usa esa imagen en su lugar:
// así se puede sustituir el arte sin tocar el código del juego.
import Phaser from 'phaser';
import { Pix, outlineRegion } from './pix';

export interface SpriteDef {
  w: number;
  h: number;
  frames?: number;
  /** Contorno automático (por defecto negro). false para desactivarlo. */
  outline?: boolean | string;
  paint: (p: Pix, frame: number) => void;
}

/** Sprite a partir de matrices ASCII (una por fotograma). */
export function ascii(frames: string[][], outline: boolean | string = true): SpriteDef {
  const h = Math.max(...frames.map((f) => f.length));
  const w = Math.max(...frames.flatMap((f) => f.map((r) => r.length)));
  return { w, h, frames: frames.length, outline, paint: (p, i) => p.ascii(frames[i]) };
}

// Imágenes de sustitución encontradas en tiempo de compilación (nunca dan 404).
const OVERRIDES = import.meta.glob('./overrides/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface OverrideInfo {
  key: string;
  url: string;
  frameW?: number;
  frameH?: number;
}

export function overrideList(): OverrideInfo[] {
  return Object.entries(OVERRIDES).map(([path, url]) => {
    const file = path.split('/').pop()!.replace(/\.png$/, '');
    const m = file.match(/^(.+)@(\d+)x(\d+)$/);
    if (m) return { key: m[1], url, frameW: +m[2], frameH: +m[3] };
    return { key: file, url };
  });
}

/** Crea la textura `key` con fotogramas '0', '1', ... */
export function bakeSprite(scene: Phaser.Scene, key: string, def: SpriteDef): void {
  if (scene.textures.exists(key)) return; // ya existe (p. ej. sustitución PNG)
  const pad = def.outline === false ? 0 : 1;
  const fw = def.w + pad * 2;
  const fh = def.h + pad * 2;
  const count = def.frames ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = fw * count;
  canvas.height = fh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  const p = new Pix(ctx);
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(i * fw + pad, pad);
    ctx.beginPath();
    ctx.rect(0, 0, def.w, def.h);
    ctx.clip();
    def.paint(p, i);
    ctx.restore();
    if (pad) {
      const color = typeof def.outline === 'string' ? def.outline : undefined;
      outlineRegion(ctx, i * fw, 0, fw, fh, color);
    }
  }
  const tex = scene.textures.addCanvas(key, canvas)!;
  for (let i = 0; i < count; i++) tex.add(String(i), 0, i * fw, 0, fw, fh);
}

/** Pinta una textura grande (fondos) con acceso libre al canvas. */
export function bakeCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (p: Pix, ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  paint(new Pix(ctx), ctx);
  scene.textures.addCanvas(key, canvas);
}

export function bakeAll(scene: Phaser.Scene, defs: Record<string, SpriteDef>): void {
  for (const [key, def] of Object.entries(defs)) bakeSprite(scene, key, def);
}
