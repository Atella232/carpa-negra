// Registro de jefes: cómo aparece cada uno. Añadir un jefe = añadir una entrada.
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';
import type { BossKind } from '../data/enemies';
import { Forzudo, spawnSiameses } from './bosses';
import { Bestia, SerpienteCabeza } from './bosses2';
import { addTether } from './tether';
import { TuReflejo, MadameFortuna } from './bosses3';
import { spawnMaestro } from './bosses4';

export interface BossDef {
  /** Crea al jefe (o a sus partes) centrado en `cx`. */
  spawn(sc: GameScene, cx: number): Enemy[];
}

export const BOSSES: Record<BossKind, BossDef> = {
  forzudo: { spawn: (sc, cx) => [new Forzudo(sc, cx, 54)] },
  siameses: {
    spawn: (sc, cx) => {
      const twins = spawnSiameses(sc, cx, 54);
      // La cuerda está llena de clavos.
      addTether(sc, twins[0], twins[1], { color: 0xa8673b, inner: 0x6b3e26, damage: 1, cause: 'la cuerda de clavos' });
      return twins;
    },
  },
  bestia: { spawn: (sc, cx) => [new Bestia(sc, cx, 54)] },
  serpiente: { spawn: (sc, cx) => [new SerpienteCabeza(sc, cx, 40)] },
  reflejo: { spawn: (sc, cx) => [new TuReflejo(sc, cx, 50)] },
  fortuna: { spawn: (sc, cx) => [new MadameFortuna(sc, cx, 40)] },
  maestro: { spawn: (sc, cx) => spawnMaestro(sc, cx) },
};

export function spawnBoss(sc: GameScene, kind: BossKind, cx: number): Enemy[] {
  const parts = BOSSES[kind].spawn(sc, cx);
  // La Gira 5: jefes más duros.
  if (sc.run.gira >= 5) for (const b of parts) if (b.countsForClear) b.maxHp = b.hp = b.maxHp * 1.25;
  return parts;
}
