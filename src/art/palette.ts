// Paleta del circo: cada carácter de los sprites ASCII es un color.
export const PALETTE: Record<string, string> = {
  k: '#0b0710', // casi negro
  K: '#1d1424', // negro púrpura
  d: '#2e1f38', // púrpura oscuro
  p: '#4a2f5c', // púrpura
  P: '#7a4a8c', // púrpura claro
  h: '#c9b3ef', // lila brillante
  e: '#3a1220', // sangre seca
  r: '#8f1d2c', // rojo oscuro
  R: '#d4323f', // rojo
  M: '#d9627f', // rosa oscuro
  m: '#f2a3b5', // rosa
  o: '#e8743b', // naranja
  y: '#f2c14e', // amarillo
  Y: '#fff2a8', // amarillo pálido
  w: '#efe6d8', // blanco hueso
  W: '#ffffff', // blanco
  G: '#c2bccb', // gris claro
  g: '#8a8394', // gris
  s: '#55505e', // gris oscuro
  S: '#36313d', // gris muy oscuro
  n: '#6b3e26', // marrón
  N: '#a8673b', // marrón claro
  t: '#d6a66b', // serrín
  b: '#2b4f7a', // azul
  B: '#4f8fd1', // azul claro
  c: '#2f7a6d', // verde azulado
  C: '#7fd1b9', // turquesa
  v: '#3f6b2a', // verde oscuro
  V: '#79b84a', // verde
  l: '#c8f2a0', // verde pálido (veneno)
  x: '#a3a0ad', // plata
  X: '#e4e2ec', // plata brillante
};

export const COLORS = {
  fondo: 0x0b0710,
  rojo: 0xd4323f,
  amarillo: 0xf2c14e,
  blanco: 0xefe6d8,
  gris: 0x8a8394,
  lila: 0xc9b3ef,
  verde: 0x79b84a,
  turquesa: 0x7fd1b9,
  naranja: 0xe8743b,
  rosa: 0xf2a3b5,
  plata: 0xe4e2ec,
};

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
