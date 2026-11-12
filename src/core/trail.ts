// Rastro de posiciones con marca de tiempo: permite que algo siga a otro
// "con N segundos de retraso" igual a 60 Hz que a 144 Hz.

export interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export class TimeTrail {
  private pts: TrailPoint[] = []; // el más nuevo primero
  private now = 0;

  /** @param keep segundos de historia que se guardan. */
  constructor(private keep: number) {}

  push(x: number, y: number, dt: number): void {
    this.now += dt;
    this.pts.unshift({ x, y, t: this.now });
    while (this.pts.length > 2 && this.now - this.pts[this.pts.length - 2].t > this.keep) this.pts.pop();
  }

  /** Posición de hace `lag` segundos (o la más antigua que haya). */
  at(lag: number): TrailPoint | undefined {
    // El margen evita que el redondeo de sumar dt cambie de punto.
    for (const p of this.pts) if (this.now - p.t >= lag - 1e-6) return p;
    return this.pts[this.pts.length - 1];
  }

  clear(): void {
    this.pts = [];
  }

  get length(): number {
    return this.pts.length;
  }
}
