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
  /** Salas especiales: obligatorias y opcionales (en callejones). */
  specials: { required: RoomType[]; optional: RoomType[] };
  /** Qué hay tras el jefe: trampilla al siguiente acto o el final. */
  exit: 'trampilla' | 'final';
  /** Se puede abrir El Contrato tras el jefe. */
  contract: boolean;
  mods?: {
    /** El público tira tomates cuando te golpean. */
    publico?: 'dos_caras';
  };
}

// Las listas por defecto del generador: cambiarlas cambia los mapas de las semillas.
const SPECIALS_CLASICAS = { required: ['jefe', 'camerino', 'puesto'] as RoomType[], optional: ['diana', 'barraca'] as RoomType[] };

export const ACTS: ActDef[] = [
  {
    n: 1, name: 'La Carpa de Bienvenida', intro: 'Pasen y vean. Y no salgan.',
    templates: ACTO1_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['forzudo', 'siameses'],
    minNormal: 8, maxNormal: 10, hpMult: 1, champion: 0.07, music: 'carpa', bossMusic: 'jefe',
    floor: {}, specials: SPECIALS_CLASICAS, exit: 'trampilla', contract: true,
  },
  {
    n: 2, name: 'Las Jaulas', intro: 'Aquí se guarda lo que muerde.',
    templates: ACTO2_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['bestia', 'serpiente'],
    minNormal: 9, maxNormal: 11, hpMult: 1.15, champion: 0.1, music: 'jaulas', bossMusic: 'jefe',
    floor: { normal: 'jaulas', inicio: 'jaulas', jefe: 'guarida' }, specials: SPECIALS_CLASICAS,
    exit: 'trampilla', contract: true,
  },
  {
    n: 3, name: 'La Casa de los Espejos', intro: 'Aquí todos se parecen a ti. Algunos, demasiado.',
    templates: ACTO3_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['reflejo', 'fortuna'],
    minNormal: 10, maxNormal: 12, hpMult: 1.5, champion: 0.12, music: 'espejos', bossMusic: 'jefeEspejos',
    floor: { normal: 'espejos', inicio: 'espejos', jefe: 'mil_espejos' },
    specials: { required: ['jefe', 'camerino', 'puesto'], optional: ['pitonisa', 'reto', 'barraca'] },
    exit: 'trampilla', contract: true,
  },
  {
    n: 4, name: 'La Pista Central', intro: 'Damas y caballeros... el número final.',
    templates: ACTO4_ROOMS, legend: TEMPLATE_ENEMY, bosses: ['maestro'],
    minNormal: 9, maxNormal: 11, hpMult: 1.75, champion: 0.14, music: 'pista', bossMusic: 'maestro',
    floor: { normal: 'pista', inicio: 'pista', jefe: 'pista_central' },
    specials: { required: ['jefe', 'camerino', 'puesto'], optional: ['pitonisa', 'reto', 'diana'] },
    exit: 'final', contract: false, mods: { publico: 'dos_caras' },
  },
];

export function actDef(n: number): ActDef {
  return ACTS[Math.min(ACTS.length, Math.max(1, n)) - 1];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function romano(n: number): string {
  return ROMAN[n - 1] ?? String(n);
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
