export const GAME_W = 240;
export const HUD_H = 32;
export const ROOM_W = 240;
export const ROOM_H = 144;
export const GAME_H = HUD_H + ROOM_H;
export const TILE = 16;
export const COLS = 13;
export const ROWS = 7;

/** Centro de la baldosa interior (c, r) en coordenadas de sala. */
export const tileX = (c: number) => TILE + c * TILE + TILE / 2;
export const tileY = (r: number) => TILE + r * TILE + TILE / 2;
export const toCol = (x: number) => Math.floor((x - TILE) / TILE);
export const toRow = (y: number) => Math.floor((y - TILE) / TILE);

export const DOOR_POS = {
  N: { x: ROOM_W / 2, y: TILE / 2 },
  S: { x: ROOM_W / 2, y: ROOM_H - TILE / 2 },
  W: { x: TILE / 2, y: ROOM_H / 2 },
  E: { x: ROOM_W - TILE / 2, y: ROOM_H / 2 },
} as const;

export const DEPTH = {
  floor: 0,
  decal: 1,
  hazard: 2,
  shadow: 3,
  world: 10, // + y
  shot: 400,
  fx: 500,
  overlay: 900,
};

export const DEBUG =
  import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
