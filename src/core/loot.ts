// Simulación de la economía (sin Phaser): cuántos boletos entran en un acto.
import { Rng } from './rng';
import { CLEAR_NOTHING, DROP_RANDOM, CHEST_OPEN, CHEST_LOCKED } from '../data/loot';
import type { PickupKind } from './run';

const TICKETS: Partial<Record<PickupKind, number>> = { boleto: 1, taco_boletos: 5 };

/** Boletos de un premio al azar (los cofres se abren). */
function ticketsFromDrop(rng: Rng, keys: { n: number }): number {
  const k = rng.weighted(DROP_RANDOM);
  if (k === 'cofre') {
    let t = 0;
    for (let i = rng.int(1, 3); i > 0; i--) t += TICKETS[rng.pick(CHEST_OPEN)] ?? 0;
    return t;
  }
  if (k === 'cofre_candado' && keys.n > 0) {
    keys.n--;
    let t = 0;
    for (let i = rng.int(2, 4); i > 0; i--) t += TICKETS[rng.pick(CHEST_LOCKED)] ?? 0;
    return t;
  }
  if (k === 'llave') keys.n++;
  return TICKETS[k] ?? 0;
}

/**
 * Boletos esperados en un acto: salas normales (con boleto seguro en las
 * difíciles), drops de criaturas y la sala secreta (la mitad de las veces).
 */
export function simulateActTickets(rng: Rng, rooms = 10, hardShare = 0.6, kills = 40, luck = 0): number {
  const keys = { n: 1 };
  let t = 0;
  for (let r = 0; r < rooms; r++) {
    if (rng.next() < hardShare) t += 1;
    if (rng.next() + luck * 0.04 >= CLEAR_NOTHING) t += ticketsFromDrop(rng, keys);
  }
  for (let k = 0; k < kills; k++) if (rng.chance(0.04 + luck * 0.01)) t += ticketsFromDrop(rng, keys);
  if (rng.chance(0.4)) t += 11; // secreta sin objeto: 6 boletos + taco
  return t;
}
