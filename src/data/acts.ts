// Definición de cada acto: nombre, plantillas, jefes y aspecto.
import type { BossKind } from './enemies';
import { ACTO1_ROOMS, RoomTemplate } from './rooms/acto1';
import { ACTO2_ROOMS } from './rooms/acto2';

export interface ActDef {
  n: number;
  name: string;
  templates: RoomTemplate[];
  bosses: BossKind[];
  minNormal: number;
  maxNormal: number;
  /** Multiplicador de vida de las criaturas. */
  hpMult: number;
  /** Probabilidad base de campeones. */
  champion: number;
  music: 'carpa' | 'jaulas';
  /** Último acto disponible: su trampilla termina la partida. */
  final: boolean;
}

export const ACTS: ActDef[] = [
  {
    n: 1, name: 'La Carpa de Bienvenida', templates: ACTO1_ROOMS, bosses: ['forzudo', 'siameses'],
    minNormal: 8, maxNormal: 10, hpMult: 1, champion: 0.07, music: 'carpa', final: false,
  },
  {
    n: 2, name: 'Las Jaulas', templates: ACTO2_ROOMS, bosses: ['bestia', 'serpiente'],
    minNormal: 9, maxNormal: 11, hpMult: 1.3, champion: 0.1, music: 'jaulas', final: true,
  },
];

export function actDef(n: number): ActDef {
  return ACTS[Math.min(ACTS.length, Math.max(1, n)) - 1];
}
