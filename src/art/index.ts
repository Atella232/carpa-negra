import Phaser from 'phaser';
import { bakeAll, bakeSprite } from './bake';
import { bakeFont } from './font';
import { PLAYER_SPRITES } from './sprites/player';
import { FX_SPRITES } from './sprites/fx';
import { ROOM_SPRITES, doorSprite, DoorStyle } from './sprites/room';
import { ENEMY_SPRITES } from './sprites/enemies';
import { ITEM_ICONS, PICKUP_SPRITES } from './sprites/items';
import { ACT2_SPRITES } from './sprites/act2';

const DOOR_STYLES: DoorStyle[] = ['normal', 'jefe', 'camerino', 'puesto', 'diana', 'barraca', 'secreta', 'contrato'];

/** Genera todas las texturas del juego (las sustituciones PNG ya cargadas se respetan). */
export function bakeEverything(scene: Phaser.Scene): void {
  bakeFont(scene);
  bakeAll(scene, PLAYER_SPRITES);
  bakeAll(scene, FX_SPRITES);
  bakeAll(scene, ROOM_SPRITES);
  bakeAll(scene, ENEMY_SPRITES);
  bakeAll(scene, ITEM_ICONS);
  bakeAll(scene, PICKUP_SPRITES);
  bakeAll(scene, ACT2_SPRITES);
  for (const s of DOOR_STYLES) bakeSprite(scene, `puerta_${s}`, doorSprite(s));
  // Píxel blanco para rectángulos tintados.
  bakeSprite(scene, 'pixel', { w: 1, h: 1, outline: false, paint: (p) => p.px(0, 0, 'W') });
}
