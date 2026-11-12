// La Función del Día: misma semilla para todo el mundo, sacada de la fecha UTC.
import { Rng, hashString, randomSeedString } from './rng';

/** "2026-11-12" (fecha UTC). */
export function dailyKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dailySeed(key: string): string {
  const rng = new Rng(hashString(`diaria:${key}`));
  return randomSeedString(() => rng.next());
}

/** Puntos de una función: llegar lejos pesa más que ir rápido. */
export function dailyScore(d: { act: number; kills: number; rooms: number; time: number; victory: boolean }): number {
  return Math.max(0, d.act * 1000 + d.kills * 5 + d.rooms * 20 + (d.victory ? 2000 : 0) - Math.floor(d.time / 2));
}
