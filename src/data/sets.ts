// Trajes: llevar varios objetos de un mismo grupo da un extra (y un disfraz).
import type { StatSource } from '../core/stats';
import type { ItemFlags } from './items';

export interface SetDef {
  id: string;
  name: string;
  desc: string;
  items: string[];
  /** Cuántos hacen falta. */
  need: number;
  source: StatSource;
  flag?: keyof ItemFlags | 'rugido' | 'palomas' | 'payasoCompleto';
  /** Globos máximos que da al completarse (una vez). */
  maxHp?: number;
  costume?: string;
}

export const SETS: SetDef[] = [
  {
    id: 'fiera', name: 'Traje de Fiera', desc: 'Ruges al entrar: las fieras se asustan',
    items: ['melenaLeon', 'colmilloCobra', 'plumaLoro', 'corazonOso', 'collarPinchos', 'leoncito'],
    need: 3, source: { stats: { damage: 0.5 } }, flag: 'rugido', costume: 'disfraz_fiera',
  },
  {
    id: 'malabarista', name: 'Traje de Malabarista', desc: 'Una pelota más',
    items: ['tripleMalabar', 'pelotasGoma', 'bolaEquilibrista', 'malabaresLlamas', 'bolaCanon', 'aroHula', 'bolos', 'dobleCanon'],
    need: 3, source: { shot: { extraShots: 1, spread: 10 } }, costume: 'disfraz_malabarista',
  },
  {
    id: 'mago', name: 'Traje de Mago', desc: 'Una de cada cinco ráfagas busca sola',
    items: ['barajaMarcada', 'sierraMago', 'varitaTrucada', 'chisteraDobleFondo', 'cartaLoco'],
    need: 3, source: { stats: { luck: 1 } }, flag: 'palomas', costume: 'disfraz_mago',
  },
  {
    id: 'payaso', name: 'Payaso Completo', desc: '+1 globo y el público te adora',
    items: ['narizRoja', 'zapatones', 'guantesBlancos', 'pajaritaGiratoria', 'maquillajeCorrido', 'barbaPostiza', 'florSolapa'],
    need: 4, source: {}, flag: 'claque', maxHp: 2, costume: 'disfraz_payaso',
  },
];

/** Trajes completos con estos objetos. */
export function setBonuses(owned: readonly string[]): SetDef[] {
  return SETS.filter((s) => s.items.filter((i) => owned.includes(i)).length >= s.need);
}

/** Cuántas piezas de cada traje se llevan (para el panel de estadísticas). */
export function setProgress(owned: readonly string[]): { set: SetDef; have: number }[] {
  return SETS.map((set) => ({ set, have: set.items.filter((i) => owned.includes(i)).length })).filter((x) => x.have > 0);
}
