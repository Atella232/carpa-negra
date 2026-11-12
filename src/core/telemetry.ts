// Registro local para balancear: tiempo por sala, daño recibido y causa de
// muerte. Solo vive en este navegador; nunca sale de aquí.
const KEY = 'carpa-negra:telemetria';

export interface RoomLog {
  act: number;
  tpl: string;
  type: string;
  secs: number;
  hurt: number;
  died?: string;
}

let buf: RoomLog[] | null = null;

function load(): RoomLog[] {
  if (buf) return buf;
  try {
    buf = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as RoomLog[];
  } catch {
    buf = [];
  }
  return buf;
}

export function logRoom(r: RoomLog): void {
  const b = load();
  b.push(r);
  if (b.length > 300) b.splice(0, b.length - 300);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* sin almacenamiento */
  }
}

/** Resumen: salas más lentas y más dañinas, y causas de muerte. */
export function summary(): Record<string, unknown> {
  const b = load();
  const byTpl = new Map<string, { n: number; secs: number; hurt: number }>();
  const deaths: Record<string, number> = {};
  for (const r of b) {
    const k = `${r.act}:${r.tpl || r.type}`;
    const e = byTpl.get(k) ?? { n: 0, secs: 0, hurt: 0 };
    e.n++;
    e.secs += r.secs;
    e.hurt += r.hurt;
    byTpl.set(k, e);
    if (r.died) deaths[r.died] = (deaths[r.died] ?? 0) + 1;
  }
  const rows = [...byTpl.entries()].map(([k, e]) => ({ sala: k, veces: e.n, segundos: +(e.secs / e.n).toFixed(1), daño: +(e.hurt / e.n).toFixed(2) }));
  return {
    salas: b.length,
    masDanio: [...rows].sort((a, b2) => b2.daño - a.daño).slice(0, 8),
    masLentas: [...rows].sort((a, b2) => b2.segundos - a.segundos).slice(0, 8),
    muertes: deaths,
  };
}
