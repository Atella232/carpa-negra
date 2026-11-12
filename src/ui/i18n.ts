// Idiomas: el texto original está en español y sirve de clave. Si el jugador
// elige inglés, `t()` (y `txt`/`setTxt`) buscan la traducción exacta.
import { settings } from '../core/save';
import { EN_GAME, EN_PATTERNS } from './i18nGame';

const EN: Record<string, string> = {
  // Menú y opciones
  'Continuar': 'Continue',
  'Nueva función': 'New show',
  'Función del día': 'Daily show',
  'Personaje': 'Character',
  'La Gira': 'The Tour',
  'Semilla': 'Seed',
  'Carteles': 'Posters',
  'Álbum': 'Album',
  'Opciones': 'Options',
  'Créditos': 'Credits',
  'Volver': 'Back',
  'Efectos': 'Sound',
  'Música': 'Music',
  'Silencio total': 'Mute all',
  'Sacudidas': 'Screen shake',
  'Destellos': 'Flashes',
  'Paradas de impacto': 'Hit-stop',
  'Paso de sala': 'Room change',
  'deslizar': 'slide',
  'fundido': 'fade',
  'Números de daño': 'Damage numbers',
  'Controles táctiles': 'Touch controls',
  'auto': 'auto',
  'si': 'on',
  'no': 'off',
  'sí': 'on',
  'Pantalla completa': 'Fullscreen',
  'Salir de pantalla completa': 'Exit fullscreen',
  'Idioma': 'Language',
  'Teclas': 'Keys',
  'Balas de alto contraste': 'High-contrast bullets',
  'Vibración del mando': 'Gamepad rumble',
  'Acto y reloj': 'Act and timer',
  'Restablecer': 'Reset',
  'Se aplica al volver a abrir el menú': 'Applies when the menu reopens',
  'Andar arriba': 'Walk up',
  'Andar abajo': 'Walk down',
  'Andar izquierda': 'Walk left',
  'Andar derecha': 'Walk right',
  'Lanzar arriba': 'Throw up',
  'Lanzar abajo': 'Throw down',
  'Lanzar izquierda': 'Throw left',
  'Lanzar derecha': 'Throw right',
  'Petardo': 'Firecracker',
  'Objeto activo': 'Active item',
  'Golosina': 'Candy',
  'Pausa': 'Pause',
  'Aceptar': 'Accept',
  'Estadísticas y mapa': 'Stats and map',
  // Pausa
  'Seguir': 'Resume',
  'Reiniciar (misma semilla)': 'Restart (same seed)',
  'Reiniciar (semilla nueva)': 'Restart (new seed)',
  'Salir al menú': 'Quit to menu',
  '¿Seguro? Pulsa otra vez': 'Sure? Press again',
  'Objetos': 'Items',
  'Sin objetos aún': 'No items yet',
  // Marcador y avisos
  'Aplauso': 'Applause',
  '¡Ovación!': 'Ovation!',
  'El público enloquece': 'The crowd goes wild',
  '¡Bravo!': 'Bravo!',
  'El público te lanza regalos': 'The crowd throws you gifts',
  'Cerrado': 'Locked',
  'Necesitas una llave': 'You need a key',
  'Faltan boletos': 'Not enough tickets',
  'Se abre una puerta...': 'A door opens...',
  'El Maestro quiere verte': 'The Ringmaster wants to see you',
  '¡Nuevo cartel!': 'New poster!',
  'Vuelven las luces': 'Lights are back',
  '¡Siguiente número!': 'Next act!',
  // Actos
  'La Carpa de Bienvenida': 'The Welcome Tent',
  'Las Jaulas': 'The Cages',
  'La Casa de los Espejos': 'The House of Mirrors',
  'La Pista Central': 'The Center Ring',
  'Pasen y vean. Y no salgan.': 'Step right up. And never leave.',
  'Aquí se guarda lo que muerde.': 'This is where the biters are kept.',
  'Aquí todos se parecen a ti. Algunos, demasiado.': 'Everyone here looks like you. Some too much.',
  'Damas y caballeros... el número final.': 'Ladies and gentlemen... the final act.',
  // Final
  'Fin de la función': 'The show is over',
  'La salida': 'The way out',
  'El nuevo Maestro': 'The new Ringmaster',
  'Fuera amanece.': 'Outside, dawn breaks.',
  'Nadie te cree.': 'Nobody believes you.',
  'Damas y caballeros...': 'Ladies and gentlemen...',
  'Mañana habrá un payaso nuevo.': 'Tomorrow there will be a new clown.',
  'El circo de los horrores': 'The circus of horrors',
};

function lookup(es: string, depth = 0): string {
  const hit = EN[es] ?? EN_GAME[es];
  if (hit) return hit;
  if (depth > 2) return es;
  for (const [re, tpl] of EN_PATTERNS) {
    const m = es.match(re);
    if (m) return tpl.replace(/\$(\d)/g, (_x, i) => lookup(m[+i], depth + 1));
  }
  return es;
}

export function t(es: string): string {
  try {
    if (settings().lang !== 'en') return es;
  } catch {
    return es;
  }
  return lookup(es);
}

/** Traducción explícita (para tests y herramientas). */
export function toEnglish(es: string): string {
  return lookup(es);
}
