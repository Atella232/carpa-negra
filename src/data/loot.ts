// Tablas de botín (solo datos). El orden de las entradas importa: cambiarlo
// cambia lo que da cada semilla.
import type { PickupKind } from '../core/run';

export type Weighted<T> = { value: T; weight: number }[];

/** Premio al azar: al limpiar sala, al romper palomitas o braseros, al matar. */
export const DROP_RANDOM: Weighted<PickupKind> = [
  { value: 'boleto', weight: 30 },
  { value: 'taco_boletos', weight: 4 },
  // Más curas que en la versión de dos actos: la partida ahora dura cuatro, y
  // cada acto tiene una sala normal más desde la versión con más variedad.
  { value: 'medio_globo', weight: 19 },
  { value: 'globo', weight: 12 },
  { value: 'petardo', weight: 13 },
  { value: 'llave', weight: 12 },
  { value: 'cofre', weight: 8 },
  { value: 'cofre_candado', weight: 3 },
  { value: 'golosina', weight: 7 },
  { value: 'globo_plata', weight: 4 },
];

/** Probabilidad base de que limpiar una sala no dé nada (la suerte la baja). */
export const CLEAR_NOTHING = 0.32;

/** Premio extra del jefe (además del objeto y del globo seguro). */
export const BOSS_EXTRA: Weighted<PickupKind> = [
  { value: 'golosina', weight: 4 },
  { value: 'globo_plata', weight: 3 },
  { value: 'globo', weight: 2 },
  { value: 'taco_boletos', weight: 2 },
];

export const CHEST_LOCKED: PickupKind[] = ['taco_boletos', 'globo', 'globo_plata', 'llave', 'doble_petardo', 'golosina'];
export const CHEST_OPEN: PickupKind[] = ['boleto', 'boleto', 'medio_globo', 'petardo', 'llave', 'golosina'];
export const CRATE_MARKED: PickupKind[] = ['globo_plata', 'taco_boletos', 'doble_petardo', 'llave', 'globo_plata'];
export const APPLAUSE_GIFTS: PickupKind[] = ['boleto', 'medio_globo', 'petardo', 'llave', 'golosina', 'taco_boletos'];

export const RULETA: Weighted<string> = [
  { value: 'nada', weight: 30 },
  { value: 'boletos', weight: 15 },
  { value: 'globo', weight: 14 },
  { value: 'petardo', weight: 12 },
  { value: 'llave', weight: 12 },
  { value: 'golosina', weight: 10 },
  { value: 'cofre', weight: 5 },
  { value: 'gordo', weight: 3 },
];
