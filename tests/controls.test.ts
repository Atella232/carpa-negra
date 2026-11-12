import { describe, expect, it } from 'vitest';
import { snapAim, codeLabel } from '../src/systems/Controls';

describe('snapAim', () => {
  it('ignora la zona muerta', () => {
    expect(snapAim(0.1, 0.2, null)).toBeNull();
  });
  it('elige el eje dominante', () => {
    expect(snapAim(0.9, 0.2, null)).toBe('dispararDerecha');
    expect(snapAim(-0.1, -0.8, null)).toBe('dispararArriba');
  });
  it('en diagonal mantiene la dirección anterior (histéresis)', () => {
    expect(snapAim(0.7, 0.72, 'dispararDerecha')).toBe('dispararDerecha');
    expect(snapAim(0.72, 0.7, 'dispararAbajo')).toBe('dispararAbajo');
  });
});

describe('codeLabel', () => {
  it('traduce códigos de tecla', () => {
    expect(codeLabel('KeyW')).toBe('W');
    expect(codeLabel('ArrowUp')).toBe('↑');
    expect(codeLabel('Space')).toBe('Espacio');
  });
});

describe('pulsaciones rápidas', () => {
  it('un toque o una tecla que se sueltan antes del fotograma cuentan una vez', async () => {
    const target = new EventTarget();
    (globalThis as unknown as { window: unknown }).window = target;
    const { Controls } = await import('../src/systems/Controls');
    const c = Controls.get();
    // Botón táctil: se pulsa y se suelta entre dos fotogramas.
    c.press('petardo');
    c.external.down.delete('petardo');
    c.update();
    expect(c.pressed('petardo')).toBe(true);
    c.update();
    expect(c.isDown('petardo')).toBe(false);
    // Teclado: lo mismo con la tecla E.
    const key = (type: string) => Object.assign(new Event(type), { code: 'KeyE', repeat: false });
    target.dispatchEvent(key('keydown'));
    target.dispatchEvent(key('keyup'));
    c.update();
    expect(c.pressed('petardo')).toBe(true);
    c.update();
    expect(c.isDown('petardo')).toBe(false);
  });
});
