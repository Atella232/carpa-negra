// Personajes jugables: estadísticas de partida, objetos iniciales y una regla propia.
import type { ShotMods, StatMods } from '../core/stats';

export interface CharacterDef {
  id: string;
  name: string;
  desc: string;
  base: { maxHp: number; shield: number; bombs: number; keys: number; tickets: number };
  stats?: StatMods;
  shot?: ShotMods;
  items?: string[];
  active?: string;
  rules?: {
    /** Voltereta: esquiva con el botón del objeto si no hay activo, se recarga sola. */
    voltereta?: boolean;
    /** Rompe cajones al andar contra ellos. */
    rompeCajones?: boolean;
  };
  /** Color del traje (tinte del cuerpo). */
  tint?: number;
  /** Cartel que lo desbloquea (sin él, disponible desde el principio). */
  unlock?: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'pompon', name: 'Pompón', desc: 'Un payaso curioso. Equilibrado.',
    base: { maxHp: 6, shield: 0, bombs: 1, keys: 1, tickets: 0 },
  },
  {
    id: 'colombina', name: 'Colombina', desc: 'La trapecista. Rápida, frágil, con cuchillos.',
    base: { maxHp: 4, shield: 0, bombs: 1, keys: 1, tickets: 0 },
    stats: { speed: 1.2, tears: 0.6, damage: -0.3 }, shot: { pierce: true, knife: true },
    rules: { voltereta: true }, tint: 0xf2a3b5, unlock: 'final_libertad',
  },
  {
    id: 'bruno', name: 'Bruno', desc: 'El forzudo arrepentido. Lento y enorme.',
    base: { maxHp: 10, shield: 0, bombs: 4, keys: 0, tickets: 0 },
    stats: { speed: -0.8, damage: 1.5, tearsMult: 0.7 }, shot: { sizeMult: 1.5 },
    rules: { rompeCajones: true }, tint: 0xa8673b, unlock: 'forzudo_limpio',
  },
  {
    id: 'silencio', name: 'Silencio', desc: 'El mimo. Corto alcance, doble daño.',
    base: { maxHp: 6, shield: 0, bombs: 0, keys: 1, tickets: 0 },
    stats: { damageMult: 2, range: -3 }, items: ['maquillajeCorrido'],
    tint: 0xc2bccb, unlock: 'acto2_sin_petardos',
  },
];

export function characterDef(id?: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
