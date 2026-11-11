// API de depuración (solo en desarrollo o con ?debug=1): window.__juego
import type { GameScene } from '../scenes/GameScene';
import type { Action } from '../systems/Controls';
import { ITEMS } from '../data/items';
import { currentRoom, roomKey } from '../core/run';
import { EnemyKind } from '../data/enemies';
import { spawnCreature } from '../entities/creatures';
import type { PickupKind } from '../core/run';
import type { RoomType } from '../core/floorgen';

let clock = 0;

export function installDebug(sc: GameScene): void {
  const api = {
    /** Estado resumido de la partida. */
    estado() {
      const r = currentRoom(sc.run);
      const p = sc.run.player;
      return {
        semilla: sc.run.seed,
        sala: { x: r.x, y: r.y, tipo: r.type, plantilla: r.templateId, limpia: r.cleared },
        jugador: {
          x: Math.round(sc.player.x), y: Math.round(sc.player.y), vida: p.hp, max: p.maxHp, plata: p.shield,
          boletos: p.tickets, petardos: p.bombs, llaves: p.keys, activo: p.active, carga: p.charge,
          golosina: p.golosina, objetos: [...p.passives], muerto: sc.player.dead,
        },
        stats: sc.stats,
        enemigos: sc.enemiesAlive().map((e) => ({ n: e.name, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp * 10) / 10 })),
        puertas: sc.doors.map((d) => ({ dir: d.dir, abierta: d.open, cerrada: d.locked })),
        recogibles: sc.pickupsList().map((k) => ({ k: k.kind, x: Math.round(k.x), y: Math.round(k.y), precio: k.price })),
        taburetes: sc.pedestals.map((t) => ({ objeto: t.item, x: t.x, y: t.y, precio: t.price, coste: t.contractCost })),
        aplauso: sc.applause.value,
        disparos: { jugador: sc.g.pShots.countActive(), enemigos: sc.g.eShots.countActive() },
        jefe: sc.run.boss,
        contrato: sc.run.contractOpen,
      };
    },
    mapa() {
      const L = sc.run.layout;
      const lines: string[] = [];
      for (let y = 0; y < L.h; y++) {
        let s = '';
        for (let x = 0; x < L.w; x++) {
          const r = sc.run.rooms.get(roomKey(x, y));
          const ch: Partial<Record<RoomType, string>> = {
            inicio: 'I', normal: '#', jefe: 'J', camerino: 'C', puesto: 'P', diana: 'D', barraca: 'B', secreta: 'S',
          };
          const cur = sc.run.cur.x === x && sc.run.cur.y === y;
          s += r ? (cur ? '@' : ch[r.type]) : '.';
        }
        lines.push(s);
      }
      return lines.join('\n');
    },
    /** Mantiene acciones durante `ms` milisegundos. */
    mantener(acciones: Partial<Record<Action, boolean>>, ms = 300) {
      for (const [a, v] of Object.entries(acciones)) if (v) sc.controls.virtual.add(a as Action);
      return new Promise<void>((res) =>
        setTimeout(() => {
          for (const a of Object.keys(acciones)) sc.controls.virtual.delete(a as Action);
          res();
        }, ms),
      );
    },
    soltar() {
      sc.controls.virtual.clear();
    },
    /** Avanza N fotogramas a 60 fps sin esperar al navegador (pruebas deterministas). */
    avanzar(frames = 60) {
      const loop = sc.game.loop;
      clock = Math.max(clock, loop.lastTime ?? 0, performance.now());
      for (let i = 0; i < frames; i++) {
        clock += 1000 / 60;
        loop.step(clock);
      }
      return api.estado().jugador;
    },
    /** Mantiene acciones durante N fotogramas simulados. */
    hacer(acciones: Partial<Record<Action, boolean>>, frames = 30) {
      for (const [a, v] of Object.entries(acciones)) if (v) sc.controls.virtual.add(a as Action);
      api.avanzar(frames);
      for (const a of Object.keys(acciones)) sc.controls.virtual.delete(a as Action);
      api.avanzar(1);
      return api.estado();
    },
    pulsar(a: Action) {
      sc.controls.virtual.add(a);
      setTimeout(() => sc.controls.virtual.delete(a), 60);
    },
    dar(id: string) {
      if (!ITEMS.some((i) => i.id === id)) return `No existe: ${id}`;
      sc.run.pools.remove(id);
      sc.giveItem(id);
      return sc.stats;
    },
    objetos: () => ITEMS.map((i) => i.id),
    recogible(kind: PickupKind) {
      sc.spawnPickup(kind, sc.player.x + 20, sc.player.y);
    },
    sumar(o: { boletos?: number; petardos?: number; llaves?: number; vida?: number }) {
      const p = sc.run.player;
      p.tickets += o.boletos ?? 0;
      p.bombs += o.petardos ?? 0;
      p.keys += o.llaves ?? 0;
      if (o.vida) {
        p.maxHp = Math.min(24, p.maxHp + o.vida);
        p.hp = p.maxHp;
      }
    },
    dios(v = true) {
      sc.god = v;
      return v;
    },
    tp(x: number, y: number) {
      sc.player.setPosition(x, y);
    },
    /** Viaja a la sala (x, y) o a la primera de un tipo. */
    ir(dest: { x: number; y: number } | RoomType) {
      const room =
        typeof dest === 'string'
          ? [...sc.run.rooms.values()].find((r) => r.type === dest) ?? (dest === 'contrato' ? sc.run.contract : undefined)
          : sc.run.rooms.get(roomKey(dest.x, dest.y));
      if (!room) return 'No existe esa sala';
      sc.enterRoom(room, null);
      return api.estado().sala;
    },
    matarTodo() {
      for (const e of sc.enemiesAlive()) e.damage(9999, null, 0);
    },
    crear(kind: EnemyKind, x = 120, y = 50) {
      spawnCreature(sc, kind, x, y);
    },
    escena: sc,
  };
  (window as unknown as { __juego: typeof api }).__juego = api;
}
