// Reservas de objetos por tipo de sala. Un objeto que ya ha aparecido en la
// partida se retira de todas las reservas: nunca hay repetidos.
import { Rng } from './rng';

export type PoolName = 'camerino' | 'puesto' | 'jefe' | 'secreta' | 'contrato' | 'barraca';

export interface PoolEntry {
  id: string;
  pools: readonly PoolName[];
  weight?: number;
}

export class ItemPools {
  private available = new Set<string>();
  private entries = new Map<string, PoolEntry>();

  constructor(entries: readonly PoolEntry[]) {
    for (const e of entries) {
      this.entries.set(e.id, e);
      this.available.add(e.id);
    }
  }

  /** Saca un objeto de la reserva y lo retira. Devuelve null si está vacía. */
  draw(pool: PoolName, rng: Rng): string | null {
    const options = [...this.available]
      .map((id) => this.entries.get(id)!)
      .filter((e) => e.pools.includes(pool))
      .sort((a, b) => (a.id < b.id ? -1 : 1)); // orden estable → misma semilla, mismo resultado
    if (options.length === 0) return null;
    const id = rng.weighted(options.map((e) => ({ value: e.id, weight: e.weight ?? 1 })));
    this.available.delete(id);
    return id;
  }

  remove(id: string): void {
    this.available.delete(id);
  }

  has(id: string): boolean {
    return this.available.has(id);
  }

  remaining(pool: PoolName): number {
    return [...this.available].filter((id) => this.entries.get(id)!.pools.includes(pool)).length;
  }

  toJSON(): string[] {
    return [...this.available];
  }
}
