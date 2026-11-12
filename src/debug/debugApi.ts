// API de depuración (solo en desarrollo o con ?debug=1): window.__juego
import type { GameScene } from '../scenes/GameScene';
import type { Action } from '../systems/Controls';
import { ITEMS } from '../data/items';
import { GOLOSINA_EFFECTS } from '../data/golosinas';
import { currentRoom, roomKey, doorVisible, advanceAct, bossRoom } from '../core/run';
import { actDef, findTemplate } from '../data/acts';
import { summary } from '../core/telemetry';
import { fight as botFight, loot as botLoot, plan as botPlan, walkTo as botWalk, shop as botShop } from './bot';
import type { Enemy } from '../entities/Enemy';
import type { EnemyKind, BossKind } from '../data/enemies';
import type { PickupKind } from '../core/run';
import type { RoomType } from '../core/floorgen';
import { audio } from '../audio/sfx';

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
        audio: audio()?.state ?? 'sin audio',
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
            inicio: 'I', normal: '#', jefe: 'J', camerino: 'C', puesto: 'P', diana: 'D', barraca: 'B', secreta: 'S', almacen: 'A', clavos: 'K', curandero: 'U',
            pitonisa: 'F', reto: 'R',
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
      // Entra por una puerta (como al jugar), no en medio de la sala.
      const from = (['S', 'W', 'E', 'N'] as const).find((d) => doorVisible(sc.run, room, d)) ?? null;
      sc.enterRoom(room, from);
      return api.estado().sala;
    },
    /** Salta al acto indicado (conserva al jugador). */
    acto(n: number) {
      while (sc.run.act < n) advanceAct(sc.run);
      sc.scene.restart();
      return `Acto ${sc.run.act}`;
    },
    /** Prueba una plantilla: entra en una sala normal con esa plantilla y esos volteos. */
    sala(id: string, flips: { flipX?: boolean; flipY?: boolean } = {}) {
      const tpl = findTemplate(id, sc.run.act);
      if (!tpl) return `No existe la plantilla ${id}`;
      const room = [...sc.run.rooms.values()].find((r) => r.type === 'normal');
      if (!room) return 'No hay salas normales';
      Object.assign(room, {
        templateId: id, flipX: !!flips.flipX, flipY: !!flips.flipY, cleared: tpl.diff === 0,
        destroyed: [], damaged: {}, pickups: [], pedestals: [], data: {}, visited: true, wave: 0,
      });
      const from = (['S', 'W', 'E', 'N'] as const).find((d) => doorVisible(sc.run, room, d)) ?? null;
      sc.enterRoom(room, from);
      return api.estado().sala;
    },
    /** Lucha contra un jefe concreto (aunque no sea de este acto). */
    jefe(kind: BossKind) {
      sc.run.boss = kind;
      const room = bossRoom(sc.run);
      room.cleared = false;
      room.data = {};
      return api.ir('jefe');
    },
    /** Lleva al jefe actual al principio de la fase n (1, 2, 3...). */
    fase(n: number) {
      const b = sc.bossIds[0] as Enemy & { phases?: { at: number }[] };
      if (!b?.phases) return 'Este jefe no tiene fases';
      const at = b.phases[n - 1]?.at;
      if (at === undefined) return `No hay fase ${n}`;
      b.hp = Math.max(1, at * b.maxHp - 0.01);
      return `${b.name}: ${Math.round(b.hp)} / ${b.maxHp}`;
    },
    /** Prueba de carga: n disparos enemigos a la vez. */
    estres(n = 300) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        sc.spawnShot(120, 72, Math.cos(a) * 40, Math.sin(a) * 40, false, { damage: 0, range: 120 });
      }
      return sc.g.eShots.countActive();
    },
    /**
     * El bot juega el acto actual sin modo dios: todas las salas normales y el
     * camerino, luego el jefe; recoge objetos y globos y pisa la trampilla.
     */
    botActo(maxSecsSala = 120) {
      sc.god = false;
      const av = (n: number) => api.avanzar(n);
      const rooms: { sala: string; seg: number; perdidos: number; limpia: boolean }[] = [];
      const hp = () => sc.run.player.hp + sc.run.player.shield;
      const order = botPlan([...sc.run.rooms.values()]);
      for (const room of order) {
        if (sc.player.dead) break;
        api.ir({ x: room.x, y: room.y });
        av(30);
        const before = hp();
        const r = botFight(sc, av, maxSecsSala);
        if (!sc.player.dead) botLoot(sc, av);
        rooms.push({ sala: room.templateId ?? room.type, seg: Math.round(r.secs), perdidos: Math.max(0, before - hp()), limpia: r.cleared });
      }
      // La sala secreta: un petardo junto a la pared agrietada.
      const secret = [...sc.run.rooms.values()].find((r) => r.type === 'secreta');
      if (!sc.player.dead && secret && sc.run.player.bombs > 0) {
        for (const dir of ['N', 'S', 'E', 'W'] as const) {
          // Vecina de la secreta en el lado contrario a `dir`.
          const v = { N: [0, 1], S: [0, -1], E: [-1, 0], W: [1, 0] }[dir];
          const nb = sc.run.rooms.get(`${secret.x + v[0]},${secret.y + v[1]}`);
          if (!nb || nb.type === 'jefe' || !nb.cleared) continue;
          // `nb` está al lado opuesto de `dir`: su puerta hacia la secreta es `dir`.
          const toSecret = dir;
          api.ir({ x: nb.x, y: nb.y });
          av(20);
          const pos = { N: [120, 30], S: [120, 114], W: [30, 72], E: [210, 72] }[toSecret];
          botWalk(sc, av, pos[0], pos[1], 180);
          api.hacer({ petardo: true }, 2);
          botWalk(sc, av, 120, 72, 120);
          av(120);
          if (secret.secretFound.length || nb.secretFound.includes(toSecret)) {
            api.ir({ x: secret.x, y: secret.y });
            av(30);
            botLoot(sc, av);
          }
          break;
        }
      }
      // Golosinas: comer las que ya se sabe que son buenas (o probar si sobra vida).
      const gol = sc.run.player.golosina;
      if (gol) {
        const eff = sc.run.golosinaMap[gol];
        const known = sc.run.golosinaKnown.includes(eff);
        if ((known && GOLOSINA_EFFECTS[eff].good) || (!known && sc.run.player.hp >= 4)) api.hacer({ golosina: true }, 2);
      }
      // El puesto, si tiene llave (la gasta en la puerta) y boletos para algo.
      const puesto = [...sc.run.rooms.values()].find((r) => r.type === 'puesto');
      if (!sc.player.dead && puesto && (puesto.unlocked || sc.run.player.keys > 0) && sc.run.player.tickets >= 3) {
        if (!puesto.unlocked) {
          sc.run.player.keys--;
          puesto.unlocked = true;
        }
        api.ir('puesto');
        av(30);
        botShop(sc, av);
      }
      let jefe = null as null | { jefe: string; seg: number; perdidos: number; vencido: boolean };
      if (!sc.player.dead) {
        api.ir('jefe');
        av(10);
        const before = hp();
        const r = botFight(sc, av, 300);
        jefe = { jefe: sc.run.boss, seg: Math.round(r.secs), perdidos: Math.max(0, before - hp()), vencido: r.cleared };
        if (!sc.player.dead && r.cleared) {
          av(90);
          botLoot(sc, av);
          if (sc.trapdoor) {
            botWalk(sc, av, sc.trapdoor.x + 30, sc.trapdoor.y, 120);
            botWalk(sc, av, sc.trapdoor.x, sc.trapdoor.y, 120);
          } else {
            // Acto IV: esperar al final y salir por la puerta de arriba.
            av(120);
            if (sc.finale) {
              // Rodeando el pedestal del centro, hasta la puerta de arriba.
              botWalk(sc, av, 88, 100, 160);
              botWalk(sc, av, 88, 30, 200);
              botWalk(sc, av, 120, 24, 120);
              botWalk(sc, av, 120, 8, 120);
            }
          }
        }
      }
      const p = sc.run.player;
      return {
        acto: sc.run.act, muerto: sc.player.dead, causa: sc.lastHurtCause, salas: rooms, jefe,
        globos: `${p.hp}/${p.maxHp}+${p.shield}`, objetos: [...p.passives, ...(p.active ? [p.active] : [])], segundos: Math.round(sc.run.playTime),
      };
    },
    /**
     * El bot juega cada plantilla del acto actual (sin modo dios), con y sin
     * volteos, `veces` veces cada una, y devuelve la media de medios globos
     * perdidos y segundos, de la peor sala a la mejor. Para cambiar de acto,
     * antes `acto(n)`. Sirve para comparar salas nuevas con las que ya había.
     */
    probarSalas(veces = 3, maxSecs = 90) {
      sc.god = false;
      const av = (n: number) => api.avanzar(n);
      const p = sc.run.player;
      const out: { sala: string; dif: number; seg: number; perdidos: number; limpias: string }[] = [];
      for (const tpl of actDef(sc.run.act).templates) {
        if (tpl.diff === 0) continue;
        let lost = 0,
          secs = 0,
          ok = 0,
          n = 0;
        for (let i = 0; i < veces; i++) {
          for (const flips of [{}, { flipX: true, flipY: true }]) {
            if (sc.player.dead) break;
            // Muchísima vida para que una mala sala no acabe la prueba.
            p.maxHp = 200;
            p.hp = 200;
            p.shield = 0;
            api.sala(tpl.id, flips);
            av(30);
            const r = botFight(sc, av, maxSecs);
            lost += Math.max(0, 200 - p.hp);
            secs += r.secs;
            ok += r.cleared ? 1 : 0;
            n++;
          }
        }
        if (!n) break;
        out.push({ sala: tpl.id, dif: tpl.diff, seg: Math.round(secs / n), perdidos: Math.round((lost / n) * 10) / 10, limpias: `${ok}/${n}` });
      }
      return out.sort((a, b) => b.dif - a.dif || b.perdidos - a.perdidos);
    },
    /** Resumen de la telemetría local (salas dañinas, lentas y causas de muerte). */
    telemetria: () => summary(),
    matarTodo() {
      for (const e of sc.enemiesAlive()) e.damage(9999, null, 0);
    },
    crear(kind: EnemyKind, x = 120, y = 50) {
      return sc.spawn(kind, x, y).name;
    },
    escena: sc,
  };
  (window as unknown as { __juego: typeof api }).__juego = api;
}
