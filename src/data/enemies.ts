// Criaturas del Acto I (datos básicos; el comportamiento está en entities/enemies).
export type EnemyKind =
  | 'mimo'
  | 'polilla'
  | 'mono'
  | 'lanzacuchillos'
  | 'caja'
  | 'monociclista'
  | 'tragafuegos'
  | 'pulga'
  // Acto II
  | 'leon'
  | 'cobra'
  | 'oso'
  | 'loro'
  | 'domador'
  | 'payasito';

export type BossKind = 'forzudo' | 'siameses' | 'bestia' | 'serpiente';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  flying?: boolean;
  texture: string;
  /** Cuerpo físico (ancho, alto) y desplazamiento vertical desde el centro. */
  body: { w: number; h: number; dy: number };
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mimo: { kind: 'mimo', name: 'Mimo roto', hp: 11, speed: 34, texture: 'mimo', body: { w: 10, h: 10, dy: 3 } },
  polilla: {
    kind: 'polilla', name: 'Polilla del foco', hp: 4, speed: 52, flying: true, texture: 'polilla',
    body: { w: 9, h: 8, dy: 0 },
  },
  mono: { kind: 'mono', name: 'Mono platillero', hp: 15, speed: 150, texture: 'mono', body: { w: 12, h: 10, dy: 3 } },
  lanzacuchillos: {
    kind: 'lanzacuchillos', name: 'Lanzacuchillos', hp: 13, speed: 22, texture: 'lanzacuchillos',
    body: { w: 10, h: 12, dy: 3 },
  },
  caja: { kind: 'caja', name: 'Caja sorpresa', hp: 18, speed: 0, texture: 'caja', body: { w: 12, h: 11, dy: 5 } },
  monociclista: {
    kind: 'monociclista', name: 'Monociclista', hp: 12, speed: 62, texture: 'monociclista',
    body: { w: 10, h: 12, dy: 4 },
  },
  tragafuegos: {
    kind: 'tragafuegos', name: 'Tragafuegos', hp: 16, speed: 26, texture: 'tragafuegos',
    body: { w: 10, h: 12, dy: 3 },
  },
  pulga: { kind: 'pulga', name: 'Pulga amaestrada', hp: 7, speed: 0, texture: 'pulga', body: { w: 10, h: 8, dy: 2 } },
  // --- Acto II: Las Jaulas ---
  leon: { kind: 'leon', name: 'León sarnoso', hp: 22, speed: 38, texture: 'leon', body: { w: 14, h: 10, dy: 3 } },
  cobra: { kind: 'cobra', name: 'Cobra del faquir', hp: 14, speed: 0, texture: 'cobra', body: { w: 12, h: 10, dy: 5 } },
  oso: { kind: 'oso', name: 'Oso bailarín', hp: 30, speed: 22, texture: 'oso', body: { w: 14, h: 12, dy: 4 } },
  loro: { kind: 'loro', name: 'Loro carroñero', hp: 8, speed: 60, flying: true, texture: 'loro', body: { w: 10, h: 9, dy: 0 } },
  domador: { kind: 'domador', name: 'Domador zombi', hp: 20, speed: 30, texture: 'domador', body: { w: 10, h: 12, dy: 4 } },
  payasito: { kind: 'payasito', name: 'Payasito triste', hp: 5, speed: 55, texture: 'payasito', body: { w: 8, h: 8, dy: 2 } },
};

/** Letras de las plantillas de sala → criatura. */
export const TEMPLATE_ENEMY: Record<string, EnemyKind> = {
  m: 'mimo',
  v: 'polilla',
  o: 'mono',
  k: 'lanzacuchillos',
  j: 'caja',
  u: 'monociclista',
  f: 'tragafuegos',
  g: 'pulga',
  l: 'leon',
  c: 'cobra',
  b: 'oso',
  r: 'loro',
  d: 'domador',
  p: 'payasito',
};

export type Champion = 'rojo' | 'amarillo' | 'azul' | 'dorado';

export const CHAMPIONS: Record<Champion, { tint: number; hpMult: number; speedMult: number; label: string }> = {
  rojo: { tint: 0xff6a6a, hpMult: 2, speedMult: 1, label: 'resistente' },
  amarillo: { tint: 0xffe066, hpMult: 1.2, speedMult: 1.45, label: 'veloz' },
  azul: { tint: 0x7fb8ff, hpMult: 1.2, speedMult: 1, label: 'estalla al morir' },
  dorado: { tint: 0xffc23d, hpMult: 1.5, speedMult: 1, label: 'suelta boletos' },
};

export const BOSS_NAMES: Record<BossKind, string> = {
  forzudo: 'El Forzudo',
  siameses: 'Los Siameses',
  bestia: 'La Bestia de la Jaula',
  serpiente: 'La Mujer Serpiente',
};

export const BOSS_TAGLINES: Record<BossKind, string> = {
  forzudo: 'Levanta pianos. Y payasos.',
  siameses: 'Dos cabezas, ningún corazón',
  bestia: 'Nadie le da de comer desde 1923',
  serpiente: 'Se dobla. Te dobla.',
};
