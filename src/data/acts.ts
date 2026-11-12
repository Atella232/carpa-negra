// Definición de cada acto: nombre, plantillas, jefes y aspecto. Añadir un acto
// es añadir una entrada aquí (más sus plantillas, criaturas y jefes).
import type { BossKind, EnemyKind } from './enemies';
import { TEMPLATE_ENEMY } from './enemies';
import type { RoomType } from '../core/floorgen';
import type { SongName } from '../audio/music';
import type { FloorStyle } from '../art/sprites/room';
import type { RoomTemplate } from './rooms/template';
import { ACTO1_ROOMS } from './rooms/acto1';
import { ACTO2_ROOMS } from './rooms/acto2';
import { ACTO3_ROOMS } from './rooms/acto3';
import { ACTO4_ROOMS } from './rooms/acto4';

export interface ActDef {
  n: number;
  name: string;
  /** Frase de la cortinilla al empezar el acto. */
  intro: string;
  templates: RoomTemplate[];
  /** Letras de las plantillas → criatura. */
  legend: Record<string, EnemyKind>;
  bosses: BossKind[];
  minNormal: number;
  maxNormal: number;
  /** Multiplicador de vida de las criaturas. */
  hpMult: number;
  /** Probabilidad base de campeones. */
  champion: number;
  music: SongName;
  bossMusic: SongName;
  /** Estilo de suelo por tipo de sala (si no, el del propio tipo). */
  floor: Partial<Record<RoomType, FloorStyle>>;
  /**
   * Salas especiales (en callejones): las obligatorias siempre; de la bolsa de
   * extras se sortean entre `extraCount[0]` y `extraCount[1]` sin repetir, según
   * su peso. `superSecret`: probabilidad de una segunda secreta (la trastienda).
   */
  specials: {
    required: RoomType[];
    extras: { value: RoomType; weight: number }[];
    extraCount: [number, number];
    superSecret: number;
  };
  /**
   * Comodines de las plantillas: en cada sala, todos los `5` son la misma
   * criatura de su lista (sorteada al generar el acto), igual con `6` y `7`.
   * 5 = débil, 6 = cuerpo a cuerpo, 7 = a distancia.
   */
  slots: Record<SlotChar, EnemyKind[]>;
  /** Qué hay tras el jefe: trampilla al siguiente acto o el final. */
  exit: 'trampilla' | 'final';
  /** Se puede abrir El Contrato tras el jefe. */
  contract: boolean;
  mods?: {
    /** El público tira tomates cuando te golpean. */
    publico?: 'dos_caras';
  };
}

export type SlotChar = '5' | '6' | '7';
export const SLOT_CHARS: readonly SlotChar[] = ['5', '6', '7'];

const OBLIGATORIAS: RoomType[] = ['jefe', 'camerino', 'puesto'];

/** Actos I y II: 2 o 3 salas extra. */
const EXTRAS_I_II: ActDef['specials'] = {
  required: OBLIGATORIAS,
  extras: [
    { value: 'diana', weight: 3 },
    { value: 'barraca', weight: 3 },
    { value: 'almacen', weight: 3 },
    { value: 'clavos', weight: 2 },
    { value: 'curandero', weight: 1 },
    { value: 'camerino', weight: 1 },
  ],
  extraCount: [2, 3],
  superSecret: 0.5,
};

/** Actos III y IV: 3 o 4 salas extra. */
const EXTRAS_III_IV: ActDef['specials'] = {
  required: OBLIGATORIAS,
  extras: [
    { value: 'pitonisa', weight: 3 },
    { value: 'reto', weight: 3 },
    { value: 'almacen', weight: 2 },
    { value: 'clavos', weight: 2 },
    { value: 'curandero', weight: 2 },
    { value: 'barraca', weight: 2 },
    { value: 'diana', weight: 2 },
    { value: 'camerino', weight: 1 },
  ],
  extraCount: [3, 4],
  superSecret: 0.5,
};

export const ACTS: ActDef[] = [
  {
    n: 1, name: 'La Carpa de Bienvenida', intro: 'Pasen y vean. Y no salgan.',
    templates: ACTO1_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['forzudo', 'siameses'],
    minNormal: 9, maxNormal: 11, hpMult: 1, champion: 0.07, music: 'carpa', bossMusic: 'jefe',
    floor: {}, specials: EXTRAS_I_II, exit: 'trampilla', contract: true,
    slots: {
      '5': ['mimo', 'pulga', 'polilla', 'perrito'],
      '6': ['mono', 'monociclista', 'malabarista'],
      '7': ['lanzacuchillos', 'caja', 'tragafuegos'],
    },
  },
  {
    n: 2, name: 'Las Jaulas', intro: 'Aquí se guarda lo que muerde.',
    templates: ACTO2_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['bestia', 'serpiente'],
    minNormal: 10, maxNormal: 12, hpMult: 1.15, champion: 0.1, music: 'jaulas', bossMusic: 'jefe',
    floor: { normal: 'jaulas', inicio: 'jaulas', jefe: 'guarida' }, specials: EXTRAS_I_II,
    exit: 'trampilla', contract: true,
    slots: {
      '5': ['loro', 'payasito', 'mimo', 'perrito'],
      '6': ['leon', 'mono', 'monociclista'],
      '7': ['cobra', 'lanzacuchillos'],
    },
  },
  {
    n: 3, name: 'La Casa de los Espejos', intro: 'Aquí todos se parecen a ti. Algunos, demasiado.',
    templates: ACTO3_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['reflejo', 'fortuna'],
    minNormal: 11, maxNormal: 13, hpMult: 1.5, champion: 0.12, music: 'espejos', bossMusic: 'jefeEspejos',
    floor: { normal: 'espejos', inicio: 'espejos', jefe: 'mil_espejos' },
    specials: EXTRAS_III_IV, exit: 'trampilla', contract: true,
    slots: {
      '5': ['munieco', 'mimo', 'loro', 'perrito'],
      '6': ['bailarina', 'reflejo', 'leon'],
      '7': ['lanzacuchillos', 'cobra'],
    },
  },
  {
    n: 4, name: 'La Pista Central', intro: 'Damas y caballeros... el número final.',
    templates: ACTO4_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['maestro'],
    minNormal: 10, maxNormal: 12, hpMult: 1.75, champion: 0.14, music: 'pista', bossMusic: 'maestro',
    floor: { normal: 'pista', inicio: 'pista', jefe: 'pista_central' },
    specials: EXTRAS_III_IV, exit: 'final', contract: false, mods: { publico: 'dos_caras' },
    slots: {
      '5': ['mimo', 'munieco', 'loro', 'perrito'],
      '6': ['bailarina', 'leon', 'reflejo', 'mono'],
      '7': ['augusto', 'lanzacuchillos'],
    },
  },
];

export function actDef(n: number): ActDef {
  return ACTS[Math.min(ACTS.length, Math.max(1, n)) - 1];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function romano(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

/**
 * Criatura de una letra de plantilla en una sala: la de la leyenda o, si es un
 * comodín, la sorteada para esa sala (`room.data.slot5`...).
 */
export function creatureAt(def: ActDef, data: Record<string, unknown> | undefined, ch: string): EnemyKind | undefined {
  if (def.legend[ch]) return def.legend[ch];
  const list = def.slots[ch as SlotChar];
  if (!list) return undefined;
  const chosen = data?.[`slot${ch}`];
  return typeof chosen === 'string' && list.includes(chosen as EnemyKind) ? (chosen as EnemyKind) : list[0];
}

/** ¿Es una criatura (de la leyenda o comodín) en las plantillas de este acto? */
export function isCreatureChar(def: ActDef, ch: string): boolean {
  return !!def.legend[ch] || !!def.slots[ch as SlotChar];
}

/** Busca una plantilla por id: primero en el acto dado y luego en todos. */
export function findTemplate(id: string, act?: number): RoomTemplate | undefined {
  if (act) {
    const t = actDef(act).templates.find((t) => t.id === id);
    if (t) return t;
  }
  for (const a of ACTS) {
    const t = a.templates.find((t) => t.id === id);
    if (t) return t;
  }
  return undefined;
}
