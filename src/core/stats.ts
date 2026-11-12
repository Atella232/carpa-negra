// Cálculo de estadísticas y del perfil de disparo a partir de los objetos.
// Los objetos solo aportan datos: aquí se combinan todos (sinergias).

export interface StatMods {
  damage?: number;
  damageMult?: number;
  tears?: number; // cadencia
  tearsMult?: number;
  range?: number; // en baldosas
  shotSpeed?: number;
  speed?: number;
  luck?: number;
}

export interface ShotMods {
  extraShots?: number;
  spread?: number; // grados entre disparos
  sizeMult?: number;
  pierce?: boolean;
  bounce?: number; // rebotes en paredes
  burn?: boolean;
  fragment?: boolean;
  spectral?: boolean;
  backShot?: boolean;
  homing?: boolean;
  knife?: boolean; // solo aspecto
  poison?: boolean; // veneno lento y largo
  grow?: boolean; // las pelotas crecen con la distancia
  chain?: boolean; // el golpe salta a otra criatura
  split?: boolean; // se parte en dos a mitad del alcance
  explosive?: boolean; // estalla al caer o al dar
  charge?: boolean; // mantener el disparo lo carga (hasta ×4)
  crit?: number; // probabilidad base de crítico (la suerte la sube)
  wave?: boolean; // ondas anchas que atraviesan (megáfono)
}

export interface StatSource {
  stats?: StatMods;
  shot?: ShotMods;
}

export interface FinalStats {
  damage: number;
  fireDelay: number; // segundos entre disparos
  shotsPerSecond: number;
  range: number; // píxeles que recorre un disparo
  shotSpeed: number; // px/s
  speed: number; // px/s
  luck: number;
  shot: Required<ShotMods>;
}

export const BASE = {
  damage: 3.5,
  shotsPerSecond: 2.6,
  range: 110,
  shotSpeed: 165,
  speed: 82,
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function computeStats(sources: readonly StatSource[]): FinalStats {
  let damage = 0,
    damageMult = 1,
    tears = 0,
    tearsMult = 1,
    range = 0,
    shotSpeed = 0,
    speed = 0,
    luck = 0;
  const shot: Required<ShotMods> = {
    extraShots: 0,
    spread: 0,
    sizeMult: 1,
    pierce: false,
    bounce: 0,
    burn: false,
    fragment: false,
    spectral: false,
    backShot: false,
    homing: false,
    knife: false,
    poison: false,
    grow: false,
    chain: false,
    split: false,
    explosive: false,
    charge: false,
    crit: 0,
    wave: false,
  };

  for (const src of sources) {
    const s = src.stats;
    if (s) {
      damage += s.damage ?? 0;
      damageMult *= s.damageMult ?? 1;
      tears += s.tears ?? 0;
      tearsMult *= s.tearsMult ?? 1;
      range += s.range ?? 0;
      shotSpeed += s.shotSpeed ?? 0;
      speed += s.speed ?? 0;
      luck += s.luck ?? 0;
    }
    const m = src.shot;
    if (m) {
      shot.extraShots += m.extraShots ?? 0;
      shot.spread = Math.max(shot.spread, m.spread ?? 0);
      shot.sizeMult *= m.sizeMult ?? 1;
      shot.pierce ||= !!m.pierce;
      shot.bounce += m.bounce ?? 0;
      shot.burn ||= !!m.burn;
      shot.fragment ||= !!m.fragment;
      shot.spectral ||= !!m.spectral;
      shot.backShot ||= !!m.backShot;
      shot.homing ||= !!m.homing;
      shot.knife ||= !!m.knife;
      shot.poison ||= !!m.poison;
      shot.grow ||= !!m.grow;
      shot.chain ||= !!m.chain;
      shot.split ||= !!m.split;
      shot.explosive ||= !!m.explosive;
      shot.charge ||= !!m.charge;
      shot.crit += m.crit ?? 0;
      shot.wave ||= !!m.wave;
    }
  }

  // Varios disparos sin dispersión definida: abanico por defecto.
  if (shot.extraShots > 0 && shot.spread === 0) shot.spread = 10;

  // Por encima de ×3, los multiplicadores rinden la mitad (sin combinaciones infinitas).
  const mult = damageMult > 3 ? 3 + (damageMult - 3) * 0.5 : damageMult;
  const finalDamage = Math.max(0.5, (BASE.damage + damage) * mult);
  // La cadencia crece con rendimientos decrecientes.
  const tearsFactor = tears >= 0 ? 1 + 0.22 * tears - 0.006 * tears * tears : 1 / (1 - 0.2 * tears);
  const sps = clamp(BASE.shotsPerSecond * Math.max(0.3, tearsFactor) * tearsMult, 0.7, 9);

  return {
    damage: Math.round(finalDamage * 100) / 100,
    shotsPerSecond: Math.round(sps * 100) / 100,
    fireDelay: 1 / sps,
    range: clamp(BASE.range + 16 * range, 40, 320),
    shotSpeed: clamp(BASE.shotSpeed * (1 + 0.15 * shotSpeed), 80, 320),
    speed: clamp(BASE.speed * (1 + 0.14 * speed), 45, 150),
    luck,
    shot,
  };
}
