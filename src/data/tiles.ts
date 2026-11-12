// Baldosas de las plantillas: qué letra es qué y cómo se comporta (solo datos,
// sin Phaser; el comportamiento en juego está en systems/tiles.ts).

export type TileKind =
  | 'suelo'
  | 'cajon'
  | 'cajon_marcado'
  | 'bloque'
  | 'palomitas'
  | 'brasero'
  | 'paja'
  | 'tachuelas'
  | 'jaula'
  | 'foso'
  // Acto III
  | 'espejo'
  | 'cinta'
  // Acto IV
  | 'aro'
  | 'canon';

export interface TileInfo {
  kind: TileKind;
  /** Se puede andar por encima. */
  walkable: boolean;
  /** Qué hacen los disparos al llegar: pasan, se paran o rebotan. */
  shots: 'pass' | 'block' | 'reflect';
  /** Bloquea incluso a quien vuela o lleva zancos. */
  tall?: boolean;
  /** Carácter equivalente tras voltear en horizontal / vertical. */
  flipX?: string;
  flipY?: string;
  /** Para las cintas: hacia dónde empujan. */
  push?: { x: number; y: number };
}

export const TILES: Record<string, TileInfo> = {
  '.': { kind: 'suelo', walkable: true, shots: 'pass' },
  C: { kind: 'cajon', walkable: false, shots: 'block' },
  X: { kind: 'cajon_marcado', walkable: false, shots: 'block' },
  M: { kind: 'bloque', walkable: false, shots: 'block' },
  P: { kind: 'palomitas', walkable: false, shots: 'block' },
  F: { kind: 'brasero', walkable: false, shots: 'block' },
  H: { kind: 'paja', walkable: false, shots: 'block' },
  T: { kind: 'tachuelas', walkable: true, shots: 'pass' },
  J: { kind: 'jaula', walkable: false, shots: 'pass' },
  O: { kind: 'foso', walkable: false, shots: 'pass' },
  // --- Acto III: La Casa de los Espejos ---
  E: { kind: 'espejo', walkable: false, shots: 'reflect', tall: true },
  '1': { kind: 'cinta', walkable: true, shots: 'pass', push: { x: 0, y: -1 }, flipY: '3' },
  '2': { kind: 'cinta', walkable: true, shots: 'pass', push: { x: 1, y: 0 }, flipX: '4' },
  '3': { kind: 'cinta', walkable: true, shots: 'pass', push: { x: 0, y: 1 }, flipY: '1' },
  '4': { kind: 'cinta', walkable: true, shots: 'pass', push: { x: -1, y: 0 }, flipX: '2' },
  // --- Acto IV: La Pista Central ---
  A: { kind: 'aro', walkable: true, shots: 'pass' },
  Q: { kind: 'canon', walkable: false, shots: 'block', tall: true },
};

/** Obstáculos sólidos que se construyen con la clase Obstacle. */
export const OBSTACLE_KINDS = new Set<TileKind>(['cajon', 'cajon_marcado', 'bloque', 'palomitas', 'brasero', 'paja']);
