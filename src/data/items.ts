// Objetos del Acto I. Solo datos: el efecto sale de combinar estadísticas,
// modificadores de disparo, banderas y ganchos (ver systems/ItemEffects.ts).
import type { PoolName } from '../core/itempool';
import type { StatSource } from '../core/stats';

export type ActiveEffect = 'tarta' | 'sombrero' | 'latigo' | 'canon' | 'bocina';
export type FamiliarKind = 'globoPerro' | 'monoJuguete' | 'pulgaFiel';

export interface ItemFlags {
  magnet?: boolean; // atrae boletos y recogibles
  shopDiscount?: boolean; // precios a mitad
  revealMap?: boolean; // muestra todo el mapa (menos la secreta)
  flight?: boolean; // pasa por encima de obstáculos, fosos y tachuelas
  trail?: boolean; // rastro de serrín que frena
  burstOnHurt?: boolean; // ráfaga radial al recibir daño
}

export interface ItemDef extends StatSource {
  id: string;
  name: string;
  desc: string; // subtítulo al recogerlo
  pools: PoolName[];
  kind: 'pasivo' | 'activo';
  weight?: number;
  price?: number;
  onPickup?: { maxHp?: number; heal?: number; shield?: number; tickets?: number; bombs?: number; keys?: number };
  flags?: ItemFlags;
  familiar?: FamiliarKind;
  active?: { charges: number; effect: ActiveEffect };
  costume?: string;
  /** Precio en globos máximos (solo en El Contrato). */
  contractCost?: number;
  /** Texto largo para el álbum. */
  lore?: string;
}

const ALL: PoolName[] = ['camerino', 'barraca'];

export const ITEMS: ItemDef[] = [
  // --- Estadísticas ---
  {
    id: 'narizRoja', name: 'Nariz Roja', desc: 'Más daño', kind: 'pasivo',
    pools: [...ALL, 'jefe'], stats: { damage: 1 }, costume: 'disfraz_nariz',
    lore: 'Huele a goma y a algo peor. Pero pega fuerte.',
  },
  {
    id: 'guantesBlancos', name: 'Guantes Blancos', desc: 'Más cadencia', kind: 'pasivo',
    pools: [...ALL, 'jefe'], stats: { tears: 1.5 },
    lore: 'Nadie sabe de quién eran. Todavía están calientes.',
  },
  {
    id: 'zapatones', name: 'Zapatones', desc: 'Más velocidad', kind: 'pasivo',
    pools: [...ALL, 'puesto'], stats: { speed: 1.6 },
    lore: 'Talla 58. Corren más que tú.',
  },
  {
    id: 'pajaritaGiratoria', name: 'Pajarita Giratoria', desc: 'Disparos más rápidos y lejanos', kind: 'pasivo',
    pools: [...ALL], stats: { shotSpeed: 1.5, range: 1.5 }, costume: 'disfraz_pajarita',
  },
  {
    id: 'cuerdaFloja', name: 'Cuerda Floja', desc: 'Más alcance y suerte', kind: 'pasivo',
    pools: [...ALL], stats: { range: 2.5, luck: 1 },
    lore: 'El último equilibrista la dejó aquí. Con prisa.',
  },
  {
    id: 'algodonAzucar', name: 'Algodón de Azúcar', desc: '+1 globo', kind: 'pasivo',
    pools: [...ALL, 'jefe', 'puesto'], onPickup: { maxHp: 2, heal: 2 },
  },
  {
    id: 'manzanaCaramelo', name: 'Manzana de Caramelo', desc: '+1 globo y algo de daño', kind: 'pasivo',
    pools: [...ALL, 'jefe'], onPickup: { maxHp: 2, heal: 2 }, stats: { damage: 0.5 },
    lore: 'Tiene un gusano. El gusano también tiene hambre.',
  },
  {
    id: 'barbaPostiza', name: 'Barba Postiza', desc: 'Un poco de todo', kind: 'pasivo',
    pools: [...ALL, 'jefe'], stats: { damage: 0.5, tears: 0.5, speed: 0.5, range: 0.5, luck: 1 },
    costume: 'disfraz_barba', lore: 'De la Mujer Barbuda. Te la ha prestado. Eso dice.',
  },
  // --- Modificadores de disparo ---
  {
    id: 'tripleMalabar', name: 'Triple Malabar', desc: 'Tres pelotas a la vez', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { extraShots: 2, spread: 12 }, stats: { tearsMult: 0.62 },
  },
  {
    id: 'pelotasGoma', name: 'Pelotas de Goma', desc: 'Rebotan en las paredes', kind: 'pasivo',
    pools: [...ALL], shot: { bounce: 2 }, stats: { range: 1 },
  },
  {
    id: 'cuchillosLanzador', name: 'Cuchillos del Lanzador', desc: 'Atraviesan enemigos', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { pierce: true, knife: true }, stats: { damage: 0.5 },
    lore: 'Nunca falla. Casi nunca.',
  },
  {
    id: 'malabaresLlamas', name: 'Malabares en Llamas', desc: 'Queman a los enemigos', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { burn: true }, costume: 'disfraz_llamas',
  },
  {
    id: 'palomitas', name: 'Palomitas', desc: 'Revientan en granos', kind: 'pasivo',
    pools: [...ALL, 'puesto'], shot: { fragment: true },
  },
  {
    id: 'bolaCanon', name: 'Bola de Cañón', desc: 'Enorme y lenta', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { sizeMult: 2 },
    stats: { damage: 2, damageMult: 1.35, tearsMult: 0.55, shotSpeed: -1.5 },
  },
  {
    id: 'helio', name: 'Helio', desc: 'Atraviesan obstáculos', kind: 'pasivo',
    pools: [...ALL], shot: { spectral: true }, stats: { range: 1 },
    lore: 'Te hace la voz graciosa. A ti y a tus pelotas.',
  },
  {
    id: 'espejoDeformante', name: 'Espejo Deformante', desc: 'También disparas hacia atrás', kind: 'pasivo',
    pools: [...ALL], shot: { backShot: true },
  },
  // --- Utilidad ---
  {
    id: 'imanFeria', name: 'Imán de Feria', desc: 'Atrae los recogibles', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { magnet: true },
  },
  {
    id: 'entradaDorada', name: 'Entrada Dorada', desc: 'Rebajas en el puesto', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { shopDiscount: true }, onPickup: { tickets: 5 },
  },
  {
    id: 'bolaCristal', name: 'Bola de Cristal', desc: 'Revela el mapa', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { revealMap: true },
    lore: 'La pitonisa ve tu futuro. No quiere hablar de ello.',
  },
  {
    id: 'zancos', name: 'Zancos', desc: 'Pasas por encima de todo', kind: 'pasivo',
    pools: [...ALL, 'secreta'], flags: { flight: true }, stats: { speed: -0.3 }, costume: 'disfraz_zancos',
  },
  {
    id: 'serrin', name: 'Saco de Serrín', desc: 'Dejas un rastro que frena', kind: 'pasivo',
    pools: [...ALL], flags: { trail: true },
  },
  {
    id: 'maquillajeCorrido', name: 'Maquillaje Corrido', desc: 'Si te hieren, estallas', kind: 'pasivo',
    pools: [...ALL], flags: { burstOnHurt: true },
    lore: 'Los payasos no lloran. Disparan.',
  },
  // --- Familiares ---
  {
    id: 'globoPerro', name: 'Globo-Perro', desc: 'Te protege de los disparos', kind: 'pasivo',
    pools: [...ALL, 'puesto'], familiar: 'globoPerro',
  },
  {
    id: 'monoJuguete', name: 'Mono de Juguete', desc: 'Dispara contigo', kind: 'pasivo',
    pools: [...ALL, 'puesto'], familiar: 'monoJuguete',
  },
  {
    id: 'pulgaFiel', name: 'Pulga Fiel', desc: 'Salta sobre los enemigos', kind: 'pasivo',
    pools: [...ALL, 'secreta'], familiar: 'pulgaFiel',
  },
  // --- Activos ---
  {
    id: 'tartaCrema', name: 'Tarta de Crema', desc: 'Lánzala a la cara de alguien', kind: 'activo',
    pools: [...ALL, 'puesto'], active: { charges: 2, effect: 'tarta' },
  },
  {
    id: 'sombreroCopa', name: 'Sombrero de Copa', desc: '¿Qué saldrá del sombrero?', kind: 'activo',
    pools: [...ALL, 'puesto'], active: { charges: 3, effect: 'sombrero' },
  },
  {
    id: 'latigoDomador', name: 'Látigo del Domador', desc: 'Que tiemblen las fieras', kind: 'activo',
    pools: [...ALL, 'secreta'], active: { charges: 2, effect: 'latigo' },
  },
  {
    id: 'canonHumano', name: 'Cañón Humano', desc: 'Sal disparado', kind: 'activo',
    pools: [...ALL], active: { charges: 3, effect: 'canon' },
  },
  {
    id: 'bocina', name: 'Bocina', desc: '¡MOC MOC!', kind: 'activo',
    pools: [...ALL, 'puesto'], active: { charges: 1, effect: 'bocina' },
  },
  // --- El Contrato ---
  {
    id: 'contratoFirmado', name: 'Contrato Firmado', desc: 'Mucho más daño', kind: 'pasivo',
    pools: ['contrato'], stats: { damage: 1, damageMult: 1.5 }, contractCost: 2,
    lore: 'Letra pequeña: "para siempre".',
  },
  {
    id: 'monoculoMaestro', name: 'Monóculo del Maestro', desc: 'Disparos teledirigidos', kind: 'pasivo',
    pools: ['contrato'], shot: { homing: true }, stats: { damage: 0.5, range: 1 },
    contractCost: 1, costume: 'disfraz_monoculo',
  },
  {
    id: 'risaEnlatada', name: 'Risa Enlatada', desc: 'Cadencia brutal', kind: 'pasivo',
    pools: ['contrato'], stats: { tears: 3, damage: -0.3 }, contractCost: 1,
    lore: 'Ja. Ja. Ja. Ja. Ja. Ja. Ja. Ja.',
  },
];

/** Si una reserva se agota, aparece esto. */
export const FALLBACK_ITEM: ItemDef = {
  id: 'calcetin', name: 'Calcetín Apestoso', desc: 'No hace nada. Huele fatal', kind: 'pasivo',
  pools: [], onPickup: { tickets: 1 },
};

const BY_ID = new Map<string, ItemDef>([...ITEMS, FALLBACK_ITEM].map((i) => [i.id, i]));

export function item(id: string): ItemDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Objeto desconocido: ${id}`);
  return d;
}

export function itemPrice(def: ItemDef, discount: boolean): number {
  const base = def.price ?? 15;
  return discount ? Math.ceil(base / 2) : base;
}
