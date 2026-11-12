// Ráfaga de disparo a partir de las estadísticas (sin Phaser). La usan el payaso
// y Tu Reflejo, que dispara con una copia de tus modificadores.
import type { FinalStats } from './stats';

export interface VolleyShot {
  angle: number;
  opts: {
    damage: number;
    range: number;
    scale: number;
    pierce: boolean;
    bounce: number;
    burn: boolean;
    fragment: boolean;
    spectral: boolean;
    homing: boolean;
    poison: boolean;
    grow: boolean;
    chain: boolean;
    split: boolean;
    explosive: boolean;
    crit: boolean;
    texture: string;
    rotate: boolean;
  };
}

/**
 * Ángulos y opciones de cada disparo de una ráfaga hacia `dir`.
 * `roll` es un número en [0, 1) para decidir el crítico; `charge` (0..1) el disparo cargado.
 */
export function buildVolley(st: FinalStats, dir: { x: number; y: number }, roll = 1, charge = 0): VolleyShot[] {
  const sh = st.shot;
  const count = 1 + sh.extraShots;
  const base = Math.atan2(dir.y, dir.x);
  const spread = (sh.spread * Math.PI) / 180;
  const angles: number[] = [];
  for (let i = 0; i < count; i++) angles.push(base + (i - (count - 1) / 2) * spread);
  if (sh.backShot) {
    // Con el abanico, el disparo trasero también se abre.
    if (count > 1) for (let i = 0; i < count; i++) angles.push(base + Math.PI + (i - (count - 1) / 2) * spread);
    else angles.push(base + Math.PI);
  }
  const critChance = sh.crit > 0 ? Math.min(0.6, sh.crit + 0.04 * Math.max(0, st.luck)) : 0;
  const crit = roll < critChance;
  const chargeMult = sh.charge ? 1 + 3 * charge : 1;
  const damage = st.damage * (crit ? 2.5 : 1) * chargeMult * (sh.wave ? 0.8 : 1);
  const scale = sh.sizeMult * (st.damage > 6 ? 1.15 : 1) * (sh.charge ? 1 + charge * 0.8 : 1) * (sh.wave ? 1.6 : 1);
  return angles.map((angle) => ({
    angle,
    opts: {
      damage,
      range: sh.wave ? st.range * 0.65 : st.range,
      scale,
      pierce: sh.pierce || sh.wave,
      bounce: sh.bounce,
      burn: sh.burn,
      fragment: sh.fragment,
      spectral: sh.spectral,
      homing: sh.homing,
      poison: sh.poison,
      grow: sh.grow,
      chain: sh.chain,
      split: sh.split,
      explosive: sh.explosive,
      crit,
      texture: sh.wave ? 'onda_tiro' : sh.knife ? 'cuchillo' : 'pelota',
      rotate: sh.knife || sh.wave,
    },
  }));
}
