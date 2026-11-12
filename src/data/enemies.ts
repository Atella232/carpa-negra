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
  | 'payasito'
  // Acto III
  | 'reflejo'
  | 'bailarina'
  | 'ilusionista'
  | 'senuelo'
  | 'munieco'
  | 'ventrilocuo'
  | 'tragasables'
  | 'cabezudo'
  | 'cabecita'
  | 'orbe'
  | 'copia'
  // Acto IV
  | 'trapecista'
  | 'hombreBala'
  | 'zancudo'
  | 'augusto'
  | 'acomodador'
  | 'barbuda'
  | 'guante'
  // Nuevas del Acto I
  | 'globero'
  | 'globoSuelto'
  | 'malabarista'
  | 'perrito';

export type BossKind = 'forzudo' | 'siameses' | 'bestia' | 'serpiente' | 'reflejo' | 'fortuna' | 'maestro';

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
  // --- Acto III: La Casa de los Espejos ---
  reflejo: { kind: 'reflejo', name: 'Reflejo roto', hp: 14, speed: 60, texture: 'reflejo', body: { w: 9, h: 10, dy: 4 } },
  bailarina: { kind: 'bailarina', name: 'Bailarina de caja de música', hp: 14, speed: 95, texture: 'bailarina', body: { w: 9, h: 10, dy: 4 } },
  ilusionista: { kind: 'ilusionista', name: 'Ilusionista', hp: 18, speed: 0, texture: 'ilusionista', body: { w: 10, h: 12, dy: 4 } },
  senuelo: { kind: 'senuelo', name: 'Señuelo', hp: 1, speed: 0, texture: 'ilusionista', body: { w: 10, h: 12, dy: 4 } },
  munieco: { kind: 'munieco', name: 'Muñeco', hp: 12, speed: 40, texture: 'munieco', body: { w: 9, h: 9, dy: 3 } },
  ventrilocuo: { kind: 'ventrilocuo', name: 'Ventrílocuo', hp: 20, speed: 32, texture: 'ventrilocuo', body: { w: 10, h: 12, dy: 4 } },
  tragasables: { kind: 'tragasables', name: 'Tragasables', hp: 24, speed: 30, texture: 'tragasables', body: { w: 10, h: 12, dy: 4 } },
  cabezudo: { kind: 'cabezudo', name: 'Cabezudo', hp: 30, speed: 22, texture: 'cabezudo', body: { w: 14, h: 12, dy: 4 } },
  cabecita: { kind: 'cabecita', name: 'Cabecita', hp: 7, speed: 70, texture: 'cabecita', body: { w: 8, h: 8, dy: 1 } },
  orbe: { kind: 'orbe', name: 'Orbe de la Luna', hp: 6, speed: 34, flying: true, texture: 'orbe', body: { w: 8, h: 8, dy: 0 } },
  copia: { kind: 'copia', name: 'Tu Reflejo', hp: 1, speed: 60, texture: 'tu_reflejo', body: { w: 10, h: 12, dy: 4 } },
  // --- Acto IV: La Pista Central ---
  trapecista: { kind: 'trapecista', name: 'Trapecista', hp: 16, speed: 0, flying: true, texture: 'trapecista', body: { w: 10, h: 10, dy: 0 } },
  hombreBala: { kind: 'hombreBala', name: 'Hombre bala', hp: 22, speed: 26, texture: 'hombre_bala', body: { w: 10, h: 12, dy: 4 } },
  zancudo: { kind: 'zancudo', name: 'Zancudo', hp: 26, speed: 0, texture: 'zancudo', body: { w: 10, h: 10, dy: 8 } },
  augusto: { kind: 'augusto', name: 'Augusto', hp: 20, speed: 28, texture: 'augusto', body: { w: 10, h: 12, dy: 4 } },
  acomodador: { kind: 'acomodador', name: 'Acomodador', hp: 14, speed: 40, texture: 'acomodador', body: { w: 9, h: 12, dy: 4 } },
  barbuda: { kind: 'barbuda', name: 'Mujer Barbuda', hp: 60, speed: 26, texture: 'barbuda', body: { w: 14, h: 14, dy: 5 } },
  guante: { kind: 'guante', name: 'Guante', hp: 9999, speed: 0, flying: true, texture: 'guante', body: { w: 14, h: 12, dy: 0 } },
  // --- Nuevas del Acto I ---
  globero: { kind: 'globero', name: 'Vendedor de globos', hp: 18, speed: 24, texture: 'globero', body: { w: 10, h: 12, dy: 6 } },
  globoSuelto: { kind: 'globoSuelto', name: 'Globo suelto', hp: 1, speed: 30, flying: true, texture: 'globoSuelto', body: { w: 9, h: 10, dy: 0 } },
  malabarista: { kind: 'malabarista', name: 'Malabarista', hp: 16, speed: 30, texture: 'malabarista', body: { w: 10, h: 12, dy: 4 } },
  perrito: { kind: 'perrito', name: 'Perrito amaestrado', hp: 6, speed: 78, texture: 'perrito', body: { w: 10, h: 7, dy: 2 } },
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
  // Acto III
  e: 'reflejo',
  a: 'bailarina',
  i: 'ilusionista',
  n: 'munieco',
  q: 'ventrilocuo',
  s: 'tragasables',
  w: 'cabezudo',
  // Acto IV
  t: 'trapecista',
  h: 'hombreBala',
  z: 'zancudo',
  x: 'augusto',
  y: 'acomodador',
  B: 'barbuda',
  // Nuevas del Acto I
  G: 'globero',
  L: 'malabarista',
  D: 'perrito',
};

/**
 * Amenaza de cada criatura (para repartir la dificultad de las salas). Una sala
 * suma la de sus criaturas y debe caber en el presupuesto de su dificultad
 * (ver tests/balance.test.ts). 0 = no sale en plantillas.
 */
export const THREAT: Record<EnemyKind, number> = {
  polilla: 1, payasito: 1,
  pulga: 1.5,
  mimo: 2, monociclista: 2, loro: 2, munieco: 2, cabecita: 2,
  mono: 3, lanzacuchillos: 3, caja: 3, tragafuegos: 3, leon: 3, cobra: 3, reflejo: 3, bailarina: 3,
  trapecista: 3, augusto: 3, acomodador: 3,
  oso: 4, domador: 4, ilusionista: 4, ventrilocuo: 4, tragasables: 4, cabezudo: 4, hombreBala: 4, zancudo: 4,
  barbuda: 7,
  senuelo: 0, orbe: 0, copia: 0, guante: 0,
  // Nuevas del Acto I
  globero: 4, globoSuelto: 1, malabarista: 3, perrito: 1.5,
};

/** Color de los restos al morir. */
export const GIB_COLOR: Partial<Record<string, number>> = {
  mimo: 0xefe6d8, polilla: 0xf2c14e, mono: 0xa8673b, lanzacuchillos: 0xd4323f, caja: 0xa8673b,
  monociclista: 0x4f8fd1, tragafuegos: 0xe8743b, pulga: 0x6b3e26, leon: 0xa8673b, cobra: 0x79b84a,
  oso: 0x6b3e26, loro: 0xd4323f, domador: 0x8a8394, payasito: 0xf2a3b5,
  reflejo: 0xe4e2ec, bailarina: 0xf2a3b5, ilusionista: 0x4a2f5c, munieco: 0xd6a66b, ventrilocuo: 0x2b4f7a,
  tragasables: 0xa3a0ad, cabezudo: 0xf2a3b5, cabecita: 0xf2a3b5, orbe: 0xc9b3ef, tu_reflejo: 0x7fd1b9,
  trapecista: 0xd9627f, hombre_bala: 0xd4323f, zancudo: 0x2b4f7a, augusto: 0xe8743b, acomodador: 0xf2c14e, barbuda: 0x6b3e26,
  globero: 0x2b4f7a, globoSuelto: 0x7a4a8c, malabarista: 0xe8743b, perrito: 0xc2bccb,
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
  reflejo: 'Tu Reflejo',
  fortuna: 'Madame Fortuna',
  maestro: 'El Maestro de Ceremonias',
};

export const BOSS_TAGLINES: Record<BossKind, string> = {
  forzudo: 'Levanta pianos. Y payasos.',
  siameses: 'Dos cabezas, ningún corazón',
  bestia: 'Nadie le da de comer desde 1923',
  serpiente: 'Se dobla. Te dobla.',
  reflejo: 'Es igual que tú. Pero con talento.',
  fortuna: 'Ya ha visto cómo acaba esto.',
  maestro: 'Damas y caballeros...',
};
