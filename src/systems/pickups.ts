// Código de GameScene (objetos y recogibles).
// Son funciones con `this: GameScene`: la escena las usa como métodos propios.
import type { GameScene } from '../scenes/GameScene';
import { DEPTH, toCol, toRow } from '../config';
import { PickupKind, RoomState } from '../core/run';
import { actDef } from '../data/acts';
import { setBonuses } from '../data/sets';
import { item } from '../data/items';
import { GOLOSINA_COLORS, GOLOSINA_EFFECTS, GolosinaColor } from '../data/golosinas';
import { APPLAUSE_GIFTS, CHEST_LOCKED, CHEST_OPEN } from '../data/loot';
import { Pickup, Pedestal } from '../entities/props';
import { SfxName } from '../audio/sfx';

/** Da un objeto al jugador (y devuelve el activo anterior si lo había). */
export function giveItem(this: GameScene, id: string): string | null {
  const def = item(id);
  const p = this.run.player;
  let previous: string | null = null;
  if (def.kind === 'activo') {
    previous = p.active;
    p.active = id;
    p.charge = def.active!.charges;
  } else {
    p.passives.push(id);
  }
  const o = def.onPickup;
  if (o) {
    if (o.maxHp) p.maxHp = Math.min(24, p.maxHp + o.maxHp);
    if (o.heal) p.hp = Math.min(p.maxHp, p.hp + o.heal);
    if (o.shield) p.shield += o.shield;
    if (o.tickets) p.tickets = Math.min(99, p.tickets + o.tickets);
    if (o.bombs) p.bombs = Math.min(99, p.bombs + o.bombs);
    if (o.keys) p.keys = Math.min(99, p.keys + o.keys);
  }
  if (!this.run.seenItems.includes(id)) this.run.seenItems.push(id);
  const before = this.stats;
  this.recomputeStats();
  this.announceStats(before);
  // ¿Se completa un traje?
  const done = (p.setsDone ??= []);
  for (const set of setBonuses(p.passives)) {
    if (done.includes(set.id)) continue;
    done.push(set.id);
    if (set.maxHp) {
      p.maxHp = Math.min(24, p.maxHp + set.maxHp);
      p.hp = Math.min(p.maxHp, p.hp + set.maxHp);
    }
    this.time.delayedCall(900, () => {
      this.banner(set.name, set.desc);
      this.snd('cartel');
      this.confetti(this.player.x, this.player.y - 10, 24);
    });
    this.meta('traje', set.id);
  }
  if (o?.maxHp) this.floatText(`+${o.maxHp / 2} globo${o.maxHp > 2 ? 's' : ''}`, 0xd4323f);
  if (o?.tickets) this.floatText(`+${o.tickets} boletos`, 0xf2c14e);
  this.player.refreshCostumes();
  if (def.familiar) this.rebuildFamiliars();
  this.banner(def.name, def.desc);
  this.snd('objeto');
  // Pompón levanta el objeto sobre la cabeza.
  const icon = this.add.image(this.player.x, this.player.y - 28, `obj_${id}`).setDepth(DEPTH.overlay);
  this.roomObjs.push(icon);
  this.tweens.add({ targets: icon, y: icon.y - 6, alpha: 0, delay: 700, duration: 400, onComplete: () => icon.destroy() });
  return previous;
}

export function touchPedestal(this: GameScene, ped: Pedestal | undefined): void {
  if (!ped) return;
  // Un toque continuo cuenta una sola vez: hay que separarse para volver a cambiar.
  const now = this.time.now;
  const continuing = now - ped.lastTouch < 200;
  ped.lastTouch = now;
  if (continuing || !ped.item || ped.cooldown > 0 || this.player.dead) return;
  const p = this.run.player;
  if (ped.price > 0) {
    if (p.tickets < ped.price) return this.needMsg('Faltan boletos');
    p.tickets -= ped.price;
    this.snd('compra');
  }
  if (ped.contractCost > 0) {
    const cost = ped.contractCost * 2;
    if (p.maxHp < cost || p.maxHp - cost + p.shield <= 0) return this.needMsg('No te queda nada que vender');
    p.maxHp -= cost;
    p.hp = Math.min(p.hp, p.maxHp);
    this.run.stats.contratos++;
    this.meta('contrato', this.run.stats.contratos);
    this.snd('contrato');
    this.shake(200, 0.006);
  }
  const id = ped.item;
  ped.price = 0;
  ped.contractCost = 0;
  const prev = this.giveItem(id);
  ped.setItem(prev);
  ped.cooldown = 1;
  if (this.room.type === 'reto' && !this.room.data.started) this.startChallenge();
}

export function needMsg(this: GameScene, s: string): void {
  if (this.pickupMsgCd > 0) return;
  this.pickupMsgCd = 1.2;
  this.banner(s, '');
  this.snd('error');
}

export function touchPickup(this: GameScene, pk: Pickup): void {
  if (pk.delay > 0 || !pk.active || pk.opened) return;
  const p = this.run.player;
  const priced = pk.price > 0;
  const canAfford = !priced || p.tickets >= pk.price;
  const collect = (sound: SfxName) => {
    if (priced) {
      if (!canAfford) {
        this.needMsg('Faltan boletos');
        return false;
      }
      p.tickets -= pk.price;
      this.snd('compra');
    }
    this.snd(sound);
    return true;
  };
  switch (pk.kind) {
    case 'globo':
    case 'medio_globo': {
      if (p.hp >= p.maxHp) return;
      if (!collect('globo')) return;
      p.hp = Math.min(p.maxHp, p.hp + (pk.kind === 'globo' ? 2 : 1));
      break;
    }
    case 'globo_plata':
      if (p.maxHp + p.shield >= 24) return;
      if (!collect('globo')) return;
      p.shield = Math.min(24 - p.maxHp, p.shield + 2);
      break;
    case 'boleto':
    case 'taco_boletos':
      if (!collect('boleto')) return;
      p.tickets = Math.min(99, p.tickets + (pk.kind === 'boleto' ? 1 : 5));
      break;
    case 'petardo':
    case 'doble_petardo':
      if (!collect('petardo')) return;
      p.bombs = Math.min(99, p.bombs + (pk.kind === 'petardo' ? 1 : 2));
      break;
    case 'llave':
      if (!collect('llave')) return;
      p.keys = Math.min(99, p.keys + 1);
      break;
    case 'golosina': {
      if (!collect('golosina')) return;
      const old = p.golosina;
      p.golosina = pk.color ?? 'rosa';
      const effect = this.run.golosinaMap[p.golosina];
      const known = this.run.golosinaKnown.includes(effect);
      this.banner(known ? GOLOSINA_EFFECTS[effect].name : 'Golosina misteriosa', 'Pulsa Q para comerla');
      if (old) this.spawnPickup('golosina', pk.x, pk.y + 12, { color: old });
      break;
    }
    case 'cofre':
      this.openChest(pk, false);
      return;
    case 'cofre_candado':
      if (p.keys <= 0) return this.needMsg('Necesitas una llave');
      p.keys--;
      this.openChest(pk, true);
      return;
  }
  this.tweens.add({ targets: pk, scale: 1.4, alpha: 0, duration: 120, onComplete: () => pk.destroy() });
  pk.opened = true;
  pk.body.enable = false;
}

export function openChest(this: GameScene, pk: Pickup, locked: boolean): void {
  pk.open();
  pk.body.enable = false;
  this.snd('cofre');
  if (locked && this.rngLoot.chance(0.15)) {
    const id = this.drawItem('camerino');
    const ped = this.addPedestal(pk.x, pk.y, id);
    ped.cooldown = 0.8;
    pk.destroy();
    return;
  }
  const n = locked ? this.rngLoot.int(2, 4) : this.rngLoot.int(1, 3);
  for (let i = 0; i < n; i++) {
    const kinds = locked ? CHEST_LOCKED : CHEST_OPEN;
    this.spawnPickup(this.rngLoot.pick(kinds), pk.x, pk.y, { burst: true });
  }
  this.time.delayedCall(1200, () => {
    if (pk.active) this.tweens.add({ targets: pk, alpha: 0, duration: 300, onComplete: () => pk.destroy() });
  });
}

export function spawnPickup(this: GameScene, kind: PickupKind, x: number, y: number, opts: { price?: number; color?: GolosinaColor; burst?: boolean } = {}): Pickup {
  let color = opts.color;
  if (kind === 'golosina' && !color) color = this.rngLoot.pick(GOLOSINA_COLORS);
  let vx = 0,
    vy = 0;
  if (opts.burst) {
    const a = this.rngLoot.float(0, Math.PI * 2);
    const s = this.rngLoot.float(60, 120);
    vx = Math.cos(a) * s;
    vy = Math.sin(a) * s;
  }
  return new Pickup(this, x, y, kind, { price: opts.price, color, vx, vy });
}

export function applauseReward(this: GameScene): void {
  this.snd(actDef(this.run.act).mods?.publico ? 'ovacion' : 'aplauso');
  this.banner('¡Bravo!', 'El público te lanza regalos');
  this.run.stats.ovaciones++;
  this.meta('ovacion', this.run.stats.ovaciones);
  // En la Pista Central, además, un ramo que cura medio globo.
  const p = this.run.player;
  if (actDef(this.run.act).mods?.publico && p.hp < p.maxHp) {
    p.hp++;
    this.floatText('+ medio globo', 0xd4323f);
  }
  const gifts = this.effects.hasFlag('claque') ? 3 : 2;
  for (let i = 0; i < gifts; i++) {
    const t = this.nearestFreeTo(this.rngLoot.int(40, 200), this.rngLoot.int(30, 110));
    const gift = {
      kind: this.rngLoot.pick<PickupKind>(APPLAUSE_GIFTS),
      x: t.x, y: t.y, done: false,
    };
    this.pendingGifts.push(gift);
    this.time.delayedCall(300 + i * 250, () => {
      gift.done = true;
      this.spawnPickup(gift.kind, t.x, t.y, { burst: true });
      this.confetti(t.x, t.y - 10, 12);
    });
  }
}

/** Objeto sorteado al generar el acto para esta sala (o uno nuevo si no lo hay). */
export function preItem(this: GameScene, room: RoomState, i: number, pool: 'camerino' | 'puesto' | 'jefe' | 'secreta' | 'contrato'): string | null {
  const id = room.data[`pre${i}`];
  if (typeof id === 'string') {
    delete room.data[`pre${i}`];
    if (!this.run.seenItems.includes(id)) this.run.seenItems.push(id);
    return id;
  }
  // Partidas sin sorteo previo (las de antes de este cambio): como siempre.
  if (pool === 'contrato' && this.run.pools.remaining('contrato') === 0) return null;
  return this.drawItem(pool);
}

export function drawItem(this: GameScene, pool: 'camerino' | 'puesto' | 'jefe' | 'secreta' | 'contrato' | 'barraca'): string {
  const id = this.run.pools.draw(pool, this.rngItems) ?? 'calcetin';
  if (!this.run.seenItems.includes(id)) this.run.seenItems.push(id);
  return id;
}

export function addPedestal(this: GameScene, x: number, y: number, id: string | null, opts: { price?: number; contractCost?: number } = {}): Pedestal {
  const p = new Pedestal(this, x, y, id, opts);
  this.pedestals.push(p);
  this.nav.setBlocked(toCol(x), toRow(y), true);
  return p;
}
