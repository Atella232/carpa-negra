// Registro de criaturas: cada especie con su clase. El tipo Record obliga a que
// toda criatura nueva tenga clase (si falta, no compila).
import type { GameScene } from '../scenes/GameScene';
import type { Enemy, EnemyOpts } from './Enemy';
import { Champion, ENEMIES, EnemyKind } from '../data/enemies';
import { Mimo, Polilla, Mono, Lanzacuchillos, Caja, Monociclista, Tragafuegos, Pulga, Globero, GloboSuelto, Malabarista, Perrito } from './creatures';
import { Leon, Cobra, Oso, Loro, Domador, Payasito, Foca, Titi, Faquir } from './creatures2';
import { Reflejo, Bailarina, Ilusionista, Senuelo, Munieco, Ventrilocuo, Tragasables, Cabezudo, Cabecita, Orbe } from './creatures3';
import { Trapecista, HombreBala, Zancudo, Augusto, Acomodador, Barbuda } from './creatures4';
import { CopiaReflejo } from './bosses3';
import { Guante } from './bosses4';

export type CreatureCtor = new (scene: GameScene, x: number, y: number, texture: string, o: EnemyOpts) => Enemy;

const CREATURE_CTORS: Record<EnemyKind, CreatureCtor> = {
  mimo: Mimo,
  polilla: Polilla,
  mono: Mono,
  lanzacuchillos: Lanzacuchillos,
  caja: Caja,
  monociclista: Monociclista,
  tragafuegos: Tragafuegos,
  pulga: Pulga,
  leon: Leon,
  cobra: Cobra,
  oso: Oso,
  loro: Loro,
  domador: Domador,
  payasito: Payasito,
  reflejo: Reflejo,
  bailarina: Bailarina,
  ilusionista: Ilusionista,
  senuelo: Senuelo,
  munieco: Munieco,
  ventrilocuo: Ventrilocuo,
  tragasables: Tragasables,
  cabezudo: Cabezudo,
  cabecita: Cabecita,
  orbe: Orbe,
  copia: CopiaReflejo,
  trapecista: Trapecista,
  hombreBala: HombreBala,
  zancudo: Zancudo,
  augusto: Augusto,
  acomodador: Acomodador,
  barbuda: Barbuda,
  guante: Guante,
  globero: Globero,
  globoSuelto: GloboSuelto,
  malabarista: Malabarista,
  perrito: Perrito,
  foca: Foca,
  titi: Titi,
  faquir: Faquir,
};

export function spawnCreature(scene: GameScene, kind: EnemyKind, x: number, y: number, champion: Champion | null = null): Enemy {
  const d = ENEMIES[kind];
  const o: EnemyOpts = { hp: d.hp, speed: d.speed, flying: d.flying, body: d.body, champion, name: d.name };
  return new CREATURE_CTORS[kind](scene, x, y, d.texture, o);
}
