// Golosinas misteriosas: su efecto no se conoce hasta probarlas.
// En cada partida los colores se reparten al azar entre los efectos.
export type GolosinaEffect =
  | 'subidon'
  | 'bajon'
  | 'empacho'
  | 'menta'
  | 'halcon'
  | 'miope'
  | 'picante'
  | 'petardo'
  | 'mareo'
  | 'fresa';

export const GOLOSINA_EFFECTS: Record<GolosinaEffect, { name: string; good: boolean }> = {
  subidon: { name: 'Subidón de azúcar', good: true },
  bajon: { name: 'Bajón de azúcar', good: false },
  empacho: { name: 'Empacho', good: false },
  menta: { name: 'Caramelo de menta', good: true },
  halcon: { name: 'Regaliz de halcón', good: true },
  miope: { name: 'Regaliz miope', good: false },
  picante: { name: 'Caramelo picante', good: true },
  petardo: { name: 'Caramelo petardo', good: true },
  mareo: { name: 'Mareo de feria', good: false },
  fresa: { name: 'Chuche de fresa', good: true },
};

export const GOLOSINA_COLORS = ['rosa', 'verde', 'azul', 'amarilla', 'morada', 'naranja', 'blanca'] as const;
export type GolosinaColor = (typeof GOLOSINA_COLORS)[number];

export const GOLOSINA_TINT: Record<GolosinaColor, number> = {
  rosa: 0xf2a3b5,
  verde: 0x79b84a,
  azul: 0x4f8fd1,
  amarilla: 0xf2c14e,
  morada: 0xa070c8,
  naranja: 0xe8743b,
  blanca: 0xffffff,
};
