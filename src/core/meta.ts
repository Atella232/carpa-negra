// Carteles (logros): cada uno es un cartel de circo en el muro del menú y puede
// desbloquear objetos, personajes o modos. Lógica pura, sin Phaser.
import type { SaveData } from './save';

export interface Cartel {
  id: string;
  name: string;
  desc: string;
  /** Qué desbloquea (texto para el muro). */
  reward?: string;
}

export const CARTELES: Cartel[] = [
  { id: 'primera_funcion', name: 'Primera función', desc: 'Termina una partida' },
  { id: 'acto1', name: 'Bienvenido', desc: 'Supera el Acto I', reward: 'Red de Seguridad' },
  { id: 'acto2', name: 'Domador', desc: 'Supera el Acto II', reward: 'Máscara de la Comedia' },
  { id: 'acto3', name: 'Sin reflejo', desc: 'Supera el Acto III', reward: 'Foco de Teatro' },
  { id: 'final_libertad', name: 'La salida', desc: 'Sal de la carpa', reward: 'Colombina' },
  { id: 'final_maestro', name: 'El nuevo Maestro', desc: 'Ponte la chistera', reward: 'La Gira' },
  { id: 'dos_finales', name: 'Las dos caras', desc: 'Consigue los dos finales' },
  { id: 'forzudo_limpio', name: 'Más fuerte', desc: 'Vence a El Forzudo sin perder globos', reward: 'Bruno' },
  { id: 'acto2_sin_petardos', name: 'Silencio en la jaula', desc: 'Supera el Acto II sin usar petardos', reward: 'Silencio' },
  { id: 'jefe_siameses', name: 'Separados', desc: 'Vence a Los Siameses', reward: 'Tomate Podrido' },
  { id: 'jefe_bestia', name: 'Fiera domada', desc: 'Vence a La Bestia de la Jaula', reward: 'Megáfono' },
  { id: 'jefe_serpiente', name: 'Nudo', desc: 'Vence a La Mujer Serpiente', reward: 'Ramo de Rosas' },
  { id: 'jefe_reflejo', name: 'Mejor que tú', desc: 'Vence a Tu Reflejo', reward: 'Doble de Riesgo' },
  { id: 'jefe_fortuna', name: 'Mala suerte', desc: 'Vence a Madame Fortuna', reward: 'Carta de El Loco' },
  { id: 'jefe_maestro', name: 'Fin del espectáculo', desc: 'Vence a El Maestro de Ceremonias' },
  { id: 'acto_sin_danio', name: 'Intocable', desc: 'Supera un acto sin perder globos rojos', reward: 'Máscara de la Tragedia' },
  { id: 'tres_contratos', name: 'Letra pequeña', desc: 'Firma tres contratos en una partida', reward: 'Varita Trucada' },
  { id: 'premio_gordo', name: '¡Premio gordo!', desc: 'Revienta la ruleta', reward: 'Chistera de Doble Fondo' },
  { id: 'golosinas_todas', name: 'Goloso', desc: 'Prueba las diez golosinas', reward: 'Bomba de Humo' },
  { id: 'traje', name: 'Bien vestido', desc: 'Completa un traje' },
  { id: 'aplauso', name: '¡Bravo!', desc: 'Llena el aplausómetro cinco veces en una partida', reward: 'La Claque' },
  { id: 'espejos_rotos', name: 'Siete años', desc: 'Rompe diez espejos', reward: 'Esquirla de Espejo' },
  { id: 'coleccionista', name: 'Coleccionista', desc: 'Ten 50 objetos en el álbum', reward: 'Sierra del Mago' },
  { id: 'diaria', name: 'Función del día', desc: 'Supera un acto en la función del día' },
];

/** Objetos que hay que desbloquear (id → cartel). */
export const ITEM_UNLOCKS: Record<string, string> = {
  redSeguridad: 'acto1',
  mascaraComedia: 'acto2',
  focoTeatro: 'acto3',
  tomatePodrido: 'jefe_siameses',
  megafono: 'jefe_bestia',
  ramoRosas: 'jefe_serpiente',
  dobleRiesgo: 'jefe_reflejo',
  cartaLoco: 'jefe_fortuna',
  mascaraTragedia: 'acto_sin_danio',
  varitaTrucada: 'tres_contratos',
  chisteraDobleFondo: 'premio_gordo',
  bombaHumo: 'golosinas_todas',
  laClaque: 'aplauso',
  esquirlaEspejo: 'espejos_rotos',
  sierraMago: 'coleccionista',
};

/** Ids de objetos bloqueados con estos carteles. */
export function lockedItems(carteles: readonly string[]): Set<string> {
  return new Set(Object.entries(ITEM_UNLOCKS).filter(([, c]) => !carteles.includes(c)).map(([id]) => id));
}

export type MetaEvent =
  | { k: 'jefe'; boss: string; clean: boolean }
  | { k: 'acto'; act: number; clean: boolean; bombsUsed: number; daily: boolean }
  | { k: 'final'; ending: 'libertad' | 'maestro' }
  | { k: 'fin' }
  | { k: 'contrato'; signed: number }
  | { k: 'gordo' }
  | { k: 'golosina'; effect: string }
  | { k: 'traje'; id: string }
  | { k: 'ovacion'; count: number }
  | { k: 'espejo' };

/** Aplica un suceso al guardado y devuelve los carteles nuevos. */
export function recordEvent(s: SaveData, ev: MetaEvent): Cartel[] {
  const got: string[] = [];
  const give = (id: string) => {
    if (!s.carteles.includes(id) && !got.includes(id)) got.push(id);
  };
  const addTo = (key: string, v: string) => {
    const set = (s.sets[key] ??= []);
    if (!set.includes(v)) set.push(v);
    return set.length;
  };
  switch (ev.k) {
    case 'jefe':
      addTo('jefes', ev.boss);
      give(`jefe_${ev.boss}`);
      if (ev.boss === 'forzudo' && ev.clean) give('forzudo_limpio');
      break;
    case 'acto':
      if (ev.act <= 3) give(`acto${ev.act}`);
      if (ev.clean) give('acto_sin_danio');
      if (ev.act === 2 && ev.bombsUsed === 0) give('acto2_sin_petardos');
      if (ev.daily) give('diaria');
      break;
    case 'final':
      if (!s.endings.includes(ev.ending)) s.endings.push(ev.ending);
      give(`final_${ev.ending}`);
      if (s.endings.includes('libertad') && s.endings.includes('maestro')) give('dos_finales');
      break;
    case 'fin':
      give('primera_funcion');
      if (s.album.length >= 50) give('coleccionista');
      break;
    case 'contrato':
      if (ev.signed >= 3) give('tres_contratos');
      break;
    case 'gordo':
      give('premio_gordo');
      break;
    case 'golosina':
      if (addTo('golosinas', ev.effect) >= 10) give('golosinas_todas');
      break;
    case 'traje':
      give('traje');
      break;
    case 'ovacion':
      if (ev.count >= 5) give('aplauso');
      break;
    case 'espejo':
      s.counters.espejos = (s.counters.espejos ?? 0) + 1;
      if (s.counters.espejos >= 10) give('espejos_rotos');
      break;
  }
  // Los jefes que no tienen cartel propio no cuentan.
  const valid = got.filter((id) => CARTELES.some((c) => c.id === id));
  s.carteles.push(...valid);
  return valid.map((id) => CARTELES.find((c) => c.id === id)!);
}
