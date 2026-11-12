// Objetos del Acto I. Solo datos: el efecto sale de combinar estadísticas,
// modificadores de disparo, banderas y ganchos (ver systems/ItemEffects.ts).
import type { PoolName } from '../core/itempool';
import type { StatSource } from '../core/stats';

export type ActiveEffect = 'tarta' | 'sombrero' | 'latigo' | 'canon' | 'bocina' | 'jaula' | 'loco' | 'confeti';
export type FamiliarKind = 'globoPerro' | 'monoJuguete' | 'pulgaFiel' | 'leoncito' | 'doble' | 'sombra' | 'foco';

export interface ItemFlags {
  magnet?: boolean; // atrae boletos y recogibles
  shopDiscount?: boolean; // precios a mitad
  revealMap?: boolean; // muestra todo el mapa (menos la secreta)
  flight?: boolean; // pasa por encima de obstáculos, fosos y tachuelas
  trail?: boolean; // rastro de serrín que frena
  burstOnHurt?: boolean; // ráfaga radial al recibir daño
  thorns?: boolean; // quien te toca se pincha
  humo?: boolean; // al recibir daño, 2 s invisible
  dobleFondo?: boolean; // 25 % de duplicar el premio al limpiar
  relojParado?: boolean; // balas enemigas un 25 % más lentas
  redSeguridad?: boolean; // una vez por acto sobrevives a un golpe mortal
  claque?: boolean; // el aplausómetro sube el doble y da 3 regalos
  ramo?: boolean; // cada 12 muertes, medio globo
  comedia?: boolean; // ×1,3 de daño con todos los globos
  tragedia?: boolean; // +0,6 de daño por globo vacío
  plumaSangre?: boolean; // +0,1 de daño por sala limpia sin daño
  aplausoEterno?: boolean; // el aplausómetro solo pierde la mitad
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
  /** Grupos para los trajes (conjuntos). */
  tags?: string[];
  /** Cartel (logro) que lo desbloquea; sin él, siempre disponible. */
  unlock?: string;
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
    pools: [...ALL, 'puesto'], active: { charges: 2, effect: 'bocina' },
  },
  // --- Llegan con el Acto II (aparecen en cualquier acto) ---
  {
    id: 'melenaLeon', name: 'Melena de León', desc: 'Mucho daño, algo más lento', kind: 'pasivo',
    pools: [...ALL, 'jefe'], stats: { damage: 1.5, speed: -0.3 },
    lore: 'Arrancada en vida. El león aún la echa de menos.',
  },
  {
    id: 'colmilloCobra', name: 'Colmillo de Cobra', desc: 'Disparos venenosos', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { poison: true },
  },
  {
    id: 'plumaLoro', name: 'Pluma de Loro', desc: 'Disparos rápidos y lejanos', kind: 'pasivo',
    pools: [...ALL], stats: { shotSpeed: 2, range: 1.5, tears: 0.3 },
    lore: 'El loro repetía tu nombre. Ya no.',
  },
  {
    id: 'corazonOso', name: 'Corazón de Oso', desc: '+2 globos', kind: 'pasivo',
    pools: [...ALL, 'jefe'], onPickup: { maxHp: 4, heal: 4 }, stats: { speed: -0.3 },
  },
  {
    id: 'collarPinchos', name: 'Collar de Pinchos', desc: 'Quien te toca, se pincha', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { thorns: true },
  },
  {
    id: 'bolaEquilibrista', name: 'Bola de Equilibrista', desc: 'Las pelotas crecen al volar', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { grow: true }, stats: { range: 1 },
  },
  {
    id: 'leoncito', name: 'Leoncito', desc: 'Muerde a tus enemigos', kind: 'pasivo',
    pools: [...ALL, 'puesto'], familiar: 'leoncito',
  },
  {
    id: 'jaulaPortatil', name: 'Jaula Portátil', desc: 'Enjaula a la fiera más cercana', kind: 'activo',
    pools: [...ALL, 'puesto'], active: { charges: 2, effect: 'jaula' },
  },
  // --- Llegan con el Acto III (aparecen en cualquier acto) ---
  {
    id: 'esquirlaEspejo', name: 'Esquirla de Espejo', desc: 'El golpe salta a otra fiera', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { chain: true },
    lore: 'Siete años de mala suerte. Para ellos.',
  },
  {
    id: 'barajaMarcada', name: 'Baraja Marcada', desc: 'Golpes críticos (más con suerte)', kind: 'pasivo',
    pools: [...ALL, 'puesto', 'jefe'], shot: { crit: 0.08 }, stats: { luck: 1 }, tags: ['mago'],
    lore: 'Todos los ases están marcados. Y algún dos.',
  },
  {
    id: 'sierraMago', name: 'Sierra del Mago', desc: 'Las pelotas se parten en dos', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { split: true }, tags: ['mago'],
    lore: 'La ayudante nunca volvió a ser la misma. Ni a estar entera.',
  },
  {
    id: 'varitaTrucada', name: 'Varita Trucada', desc: 'Mantén para cargar el disparo', kind: 'pasivo',
    pools: [...ALL, 'jefe'], shot: { charge: true }, stats: { damage: 0.5 }, tags: ['mago'],
  },
  {
    id: 'bombaHumo', name: 'Bomba de Humo', desc: 'Si te hieren, desapareces', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { humo: true },
  },
  {
    id: 'dobleRiesgo', name: 'Doble de Riesgo', desc: 'Un reflejo dispara contigo', kind: 'pasivo',
    pools: [...ALL, 'secreta'], familiar: 'doble',
    lore: 'Cobra la mitad. Recibe el doble.',
  },
  {
    id: 'cartaLoco', name: 'Carta de El Loco', desc: 'Vuelve a barajar los objetos de la sala', kind: 'activo',
    pools: [...ALL, 'puesto'], active: { charges: 4, effect: 'loco' }, tags: ['mago'],
  },
  {
    id: 'chisteraDobleFondo', name: 'Chistera de Doble Fondo', desc: 'A veces el premio sale doble', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { dobleFondo: true }, tags: ['mago'],
  },
  // --- Llegan con el Acto IV ---
  {
    id: 'tomatePodrido', name: 'Tomate Podrido', desc: 'Disparos que revientan', kind: 'pasivo',
    pools: [...ALL, 'jefe'], shot: { explosive: true },
    lore: 'Lo tiró alguien del público. Ahora es tuyo.',
  },
  {
    id: 'megafono', name: 'Megáfono', desc: 'Ondas que atraviesan, poco alcance', kind: 'pasivo',
    pools: [...ALL, 'secreta'], shot: { wave: true },
  },
  {
    id: 'redSeguridad', name: 'Red de Seguridad', desc: 'Sobrevives a un golpe mortal por acto', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { redSeguridad: true },
  },
  {
    id: 'laClaque', name: 'La Claque', desc: 'El público te adora', kind: 'pasivo',
    pools: [...ALL, 'puesto'], flags: { claque: true },
    lore: 'Aplauden a sueldo. Su sueldo eres tú.',
  },
  {
    id: 'ramoRosas', name: 'Ramo de Rosas', desc: 'Cada 12 fieras, medio globo', kind: 'pasivo',
    pools: [...ALL, 'jefe'], flags: { ramo: true },
  },
  {
    id: 'mascaraComedia', name: 'Máscara de la Comedia', desc: 'Más daño con todos los globos', kind: 'pasivo',
    pools: [...ALL, 'secreta'], flags: { comedia: true },
  },
  {
    id: 'mascaraTragedia', name: 'Máscara de la Tragedia', desc: 'Más daño por cada globo perdido', kind: 'pasivo',
    pools: [...ALL, 'secreta'], flags: { tragedia: true },
  },
  {
    id: 'focoTeatro', name: 'Foco de Teatro', desc: 'Lo que iluminas sufre más', kind: 'pasivo',
    pools: [...ALL, 'puesto'], familiar: 'foco',
  },
  {
    id: 'canonConfeti', name: 'Cañón de Confeti', desc: 'Empuja, aturde y borra balas', kind: 'activo',
    pools: [...ALL, 'puesto'], active: { charges: 3, effect: 'confeti' },
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
  {
    id: 'almaPrenda', name: 'Alma en Prenda', desc: 'Atraviesan todo', kind: 'pasivo',
    pools: ['contrato'], shot: { spectral: true, pierce: true }, contractCost: 1,
    lore: 'Te la devuelven al final. Del contrato. Que no tiene final.',
  },
  {
    id: 'sombraAlquilada', name: 'Sombra Alquilada', desc: 'Tu sombra repite cada disparo', kind: 'pasivo',
    pools: ['contrato'], familiar: 'sombra', contractCost: 1,
  },
  {
    id: 'relojParado', name: 'Reloj Parado', desc: 'Las balas enemigas van más lentas', kind: 'pasivo',
    pools: ['contrato'], flags: { relojParado: true }, contractCost: 1,
    lore: 'Marca la hora a la que firmaste.',
  },
  {
    id: 'clausulaAdicional', name: 'Cláusula Adicional', desc: 'Una pelota más en cada ráfaga', kind: 'pasivo',
    pools: ['contrato'], shot: { extraShots: 1, spread: 10 }, contractCost: 2,
  },
  {
    id: 'plumaSangre', name: 'Pluma de Sangre', desc: 'Más daño por cada sala limpia sin rasguños', kind: 'pasivo',
    pools: ['contrato'], flags: { plumaSangre: true }, contractCost: 1,
  },
  {
    id: 'aplausoEterno', name: 'Aplauso Eterno', desc: 'El público te perdona la mitad', kind: 'pasivo',
    pools: ['contrato'], flags: { aplausoEterno: true }, contractCost: 2,
  },
];

/** Precio en el puesto según lo bueno que es (lo demás, 15). */
const PRICES: Record<string, number> = {
  // Imprescindibles
  tripleMalabar: 20, bolaCanon: 20, cuchillosLanzador: 20, colmilloCobra: 18, esquirlaEspejo: 20, sierraMago: 20,
  tomatePodrido: 20, zancos: 18, redSeguridad: 20, varitaTrucada: 18, malabaresLlamas: 18, palomitas: 18,
  // Flojos o de nicho
  espejoDeformante: 8, serrin: 8, bolaCristal: 10, imanFeria: 10, entradaDorada: 10, bombaHumo: 12,
  chisteraDobleFondo: 12, laClaque: 12, ramoRosas: 12, pajaritaGiratoria: 12, cuerdaFloja: 12,
};
for (const it of ITEMS) if (PRICES[it.id] && it.price === undefined) it.price = PRICES[it.id];

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
