// Pantalla de opciones (menú principal y pausa) y reasignación de teclas.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { Menu } from './Menu';
import { txt } from './text';
import { settings, setSettings } from '../core/save';
import { getVolumes, setVolumes } from '../audio/sfx';
import { ACTIONS, Action, Controls, codeLabel, DEFAULT_KEYS } from '../systems/Controls';
import { t } from './i18n';
import { applyTouchSetting } from '../systems/Touch';
import { fullscreenAvailable, isFullscreen, toggleFullscreen } from '../systems/Fullscreen';

const ACTION_NAME: Record<Action, string> = {
  arriba: 'Andar arriba',
  abajo: 'Andar abajo',
  izquierda: 'Andar izquierda',
  derecha: 'Andar derecha',
  dispararArriba: 'Lanzar arriba',
  dispararAbajo: 'Lanzar abajo',
  dispararIzquierda: 'Lanzar izquierda',
  dispararDerecha: 'Lanzar derecha',
  petardo: 'Petardo',
  activo: 'Objeto activo',
  golosina: 'Golosina',
  pausa: 'Pausa',
  aceptar: 'Aceptar',
  cancelar: 'Volver',
  estadisticas: 'Estadísticas y mapa',
};

/** Capa de fondo con título; devuelve los objetos para destruirlos al cerrar. */
function panel(scene: Phaser.Scene, title: string, depth: number): Phaser.GameObjects.GameObject[] {
  const bg = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0710, 0.95).setOrigin(0).setDepth(depth).setInteractive();
  const tt = txt(scene, GAME_W / 2, 8, title, 0xf2c14e, 'center').setDepth(depth);
  return [bg, tt];
}

const onOff = (v: boolean) => (v ? t('sí') : t('no'));

export function openOptions(scene: Phaser.Scene, onClose: () => void, depth = 200): void {
  const objs = panel(scene, t('Opciones'), depth);
  const s = settings;
  const persistVolumes = () => setSettings({ ...getVolumes() });
  let menu: Menu;
  const close = () => {
    menu.destroy();
    for (const o of objs) o.destroy();
    onClose();
  };
  menu = new Menu(
    scene,
    [
      {
        label: () => `${t('Efectos')}  ${Math.round(getVolumes().sfx * 10)}`,
        onAdjust: (d) => {
          setVolumes({ sfx: Phaser.Math.Clamp(Math.round(getVolumes().sfx * 10 + d) / 10, 0, 1) });
          persistVolumes();
        },
      },
      {
        label: () => `${t('Música')}  ${Math.round(getVolumes().music * 10)}`,
        onAdjust: (d) => {
          setVolumes({ music: Phaser.Math.Clamp(Math.round(getVolumes().music * 10 + d) / 10, 0, 1) });
          persistVolumes();
        },
      },
      { label: () => `${t('Silencio total')}  ${onOff(getVolumes().muted)}`, onSelect: () => (setVolumes({ muted: !getVolumes().muted }), persistVolumes()) },
      {
        label: () => `${t('Sacudidas')}  ${Math.round(s().shake * 100)}%`,
        onAdjust: (d) => setSettings({ shake: Phaser.Math.Clamp(s().shake + d * 0.5, 0, 1) }),
      },
      { label: () => `${t('Destellos')}  ${onOff(s().flashes)}`, onSelect: () => setSettings({ flashes: !s().flashes }) },
      { label: () => `${t('Paradas de impacto')}  ${onOff(s().hitstop)}`, onSelect: () => setSettings({ hitstop: !s().hitstop }) },
      {
        label: () => `${t('Paso de sala')}  ${t(s().transition === 'deslizar' ? 'deslizar' : 'fundido')}`,
        onSelect: () => setSettings({ transition: s().transition === 'deslizar' ? 'fundido' : 'deslizar' }),
      },
      { label: () => `${t('Números de daño')}  ${onOff(s().damageNumbers)}`, onSelect: () => setSettings({ damageNumbers: !s().damageNumbers }) },
      { label: () => `${t('Balas de alto contraste')}  ${onOff(s().contrast)}`, onSelect: () => setSettings({ contrast: !s().contrast }) },
      { label: () => `${t('Vibración del mando')}  ${onOff(s().rumble)}`, onSelect: () => setSettings({ rumble: !s().rumble }) },
      { label: () => `${t('Acto y reloj')}  ${onOff(s().timer)}`, onSelect: () => setSettings({ timer: !s().timer }) },
      {
        label: () => `${t('Controles táctiles')}  ${t(s().touch)}`,
        onSelect: () => {
          const order = ['auto', 'si', 'no'] as const;
          setSettings({ touch: order[(order.indexOf(s().touch) + 1) % 3] });
          applyTouchSetting();
        },
      },
      // En iPhone Safari no existe la pantalla completa (allí se usa «Añadir a
      // pantalla de inicio», que abre el juego sin barras gracias al manifiesto).
      ...(fullscreenAvailable()
        ? [
            {
              label: () => `${t('Pantalla completa')}  ${onOff(isFullscreen())}`,
              onSelect: () => {
                toggleFullscreen();
                // El cambio llega un instante después: se refresca la etiqueta.
                window.setTimeout(() => menu.refresh(), 300);
              },
            },
          ]
        : []),
      {
        label: () => `${t('Idioma')}  ${s().lang === 'es' ? 'Español' : 'English'}`,
        onSelect: () => setSettings({ lang: s().lang === 'es' ? 'en' : 'es' }),
        hint: () => t('Se aplica al volver a abrir el menú'),
      },
      {
        label: () => t('Teclas'),
        onSelect: () => {
          menu.destroy();
          for (const o of objs) o.destroy();
          openKeys(scene, () => openOptions(scene, onClose, depth), depth);
        },
      },
      { label: () => t('Volver'), onSelect: close },
    ],
    { x: GAME_W / 2, y: 18, step: 8.5, onBack: close, depth: depth + 1 },
  );
}

/** Reasignar teclas: elige una acción y pulsa la tecla nueva. */
export function openKeys(scene: Phaser.Scene, onClose: () => void, depth = 200): void {
  const objs = panel(scene, t('Teclas'), depth);
  const c = Controls.get();
  let waiting: Action | null = null;
  let menu: Menu;
  const close = () => {
    menu.destroy();
    for (const o of objs) o.destroy();
    onClose();
  };
  const items = ACTIONS.map((a) => ({
    label: () => `${t(ACTION_NAME[a])}  ${waiting === a ? '...' : c.keysFor(a).map(codeLabel).join(' / ')}`,
    onSelect: () => {
      waiting = a;
      menu.refresh();
      c.capture = (code) => {
        waiting = null;
        if (code !== 'Escape' || a === 'pausa') {
          const keys = { ...(settings().keys ?? {}) };
          keys[a] = [code];
          setSettings({ keys });
          c.rebind();
        }
        menu.refresh();
      };
    },
  }));
  menu = new Menu(
    scene,
    [
      ...items,
      {
        label: () => t('Restablecer'),
        onSelect: () => {
          setSettings({ keys: undefined });
          c.rebind();
        },
      },
      { label: () => t('Volver'), onSelect: close },
    ],
    { x: GAME_W / 2, y: 20, step: 8, onBack: () => !waiting && close(), depth: depth + 1 },
  );
  void DEFAULT_KEYS;
}
