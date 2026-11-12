// Generador de números aleatorios con semilla (mulberry32) y utilidades.
// No depende de Phaser: se prueba con Vitest.

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Número en [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [a, b] (ambos incluidos). */
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  float(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick de lista vacía');
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  weighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
    if (total <= 0) throw new Error('weighted sin pesos');
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, it.weight);
      if (r < 0) return it.value;
    }
    return items[items.length - 1].value;
  }

  /** Estado interno, por si hay que guardar/restaurar. */
  get state(): number {
    return this.s;
  }
}

/** Hash de cadena a entero de 32 bits (FNV-1a con mezcla final). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTWXYZ23456789';

/** Semilla legible de 8 caracteres, p. ej. "K7QM 2ZPA". */
export function randomSeedString(source: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += SEED_ALPHABET[Math.floor(source() * SEED_ALPHABET.length)];
  return s;
}

export function normalizeSeed(seed: string): string {
  return seed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function formatSeed(seed: string): string {
  const s = normalizeSeed(seed);
  return s.length > 4 ? `${s.slice(0, 4)} ${s.slice(4)}` : s;
}

export type StreamName = 'mapa' | 'botin' | 'objetos' | 'combate' | 'golosinas';

/** Flujos independientes: generar el mapa no altera el botín, etc. */
export class RngStreams {
  private streams = new Map<StreamName, Rng>();

  constructor(public readonly seed: string) {}

  get(name: StreamName, salt = ''): Rng {
    const key = (name + salt) as StreamName;
    let r = this.streams.get(key);
    if (!r) {
      r = new Rng(hashString(`${normalizeSeed(this.seed)}:${name}:${salt}`));
      this.streams.set(key, r);
    }
    return r;
  }
}

/** Estado de todos los flujos (para guardar la partida). */
export function snapshotStreams(s: RngStreams): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, r] of (s as unknown as { streams: Map<string, Rng> }).streams) out[k] = r.state;
  return out;
}

/** Recrea los flujos con el estado guardado. */
export function restoreStreams(seed: string, saved: Record<string, number>): RngStreams {
  const s = new RngStreams(seed);
  const map = (s as unknown as { streams: Map<string, Rng> }).streams;
  for (const [k, v] of Object.entries(saved)) map.set(k as StreamName, new Rng(v));
  return s;
}
