// Efectos de objetos activos, ganchos de eventos y golosinas.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Player } from '../entities/Player';
import { item, ActiveEffect, ItemFlags } from '../data/items';
import { GOLOSINA_EFFECTS, GolosinaEffect } from '../data/golosinas';
import { actDef } from '../data/acts';
import { Paloma } from '../entities/familiars';
import { DEPTH } from '../config';
import { Obstacle, BRASERO_HITS, braseroLook } from '../entities/props';
import { buildVolley } from '../core/volley';
import { setBonuses } from '../data/sets';
import { PickupKind } from '../core/run';

export class ItemEffects {
  private dashHit = new Set<unknown>();
  private trailT = 0;
  trail: { x: number; y: number; life: number; img: Phaser.GameObjects.Image }[] = [];

  constructor(private sc: GameScene) {}

  /** Banderas de los objetos que lleva (se recalculan al cambiar de objetos). */
  private flags = new Set<keyof ItemFlags>();

  refreshFlags(): void {
    this.flags.clear();
    for (const id of this.sc.run.player.passives) {
      const f = item(id).flags;
      if (f) for (const k of Object.keys(f) as (keyof ItemFlags)[]) if (f[k]) this.flags.add(k);
    }
    for (const b of setBonuses(this.sc.run.player.passives)) if (b.flag) this.flags.add(b.flag as keyof ItemFlags);
  }

  hasFlag(flag: keyof ItemFlags | 'rugido' | 'palomas' | 'payasoCompleto'): boolean {
    return this.flags.has(flag as keyof ItemFlags);
  }

  /** Bonificaciones que dependen del momento (máscaras, pluma de sangre). */
  dynamicStats(): { damage: number; damageMult: number } {
    const p = this.sc.run.player;
    let damage = 0,
      damageMult = 1;
    if (this.hasFlag('comedia') && p.hp >= p.maxHp) damageMult *= 1.3;
    if (this.hasFlag('tragedia')) damage += 0.6 * Math.floor((p.maxHp - p.hp) / 2);
    if (this.hasFlag('plumaSangre')) damage += 0.1 * (p.cleanRooms ?? 0);
    return { damage, damageMult };
  }

  // --- Objeto activo ---
  useActive(): boolean {
    const p = this.sc.run.player;
    if (!p.active) return false;
    const def = item(p.active);
    if (!def.active || p.charge < def.active.charges) {
      this.sc.snd('error');
      return false;
    }
    p.charge = 0;
    this.run(def.active.effect);
    return true;
  }

  private run(effect: ActiveEffect): void {
    const sc = this.sc;
    const pl = sc.player;
    switch (effect) {
      case 'tarta': {
        const d = pl.lastShotDir;
        const pie = sc.add.image(pl.x, pl.y - 8, 'tarta_volando').setDepth(DEPTH.shot);
        sc.snd('tarta');
        let t = 0;
        const step = (_: number, delta: number) => {
          // Si se cambió de sala o de escena, la tarta ya no existe.
          if (!pie.active) {
            sc.events.off('update', step);
            return;
          }
          const dt = Math.min(0.05, delta / 1000);
          t += dt;
          pie.x += d.x * 190 * dt;
          pie.y += d.y * 190 * dt;
          pie.rotation += dt * 10;
          const hit = sc.nearestEnemy(pie.x, pie.y, 12);
          const out = pie.x < 18 || pie.x > 222 || pie.y < 18 || pie.y > 126;
          if (hit || out || t > 0.6) {
            sc.events.off('update', step);
            this.splatPie(pie.x, pie.y);
            pie.destroy();
          }
        };
        sc.events.on('update', step);
        sc.roomObjs.push(pie);
        sc.events.once('shutdown', () => sc.events.off('update', step));
        break;
      }
      case 'sombrero': {
        const r = sc.rngLoot.next();
        sc.snd('palomas');
        if (r < 0.45) {
          for (let i = 0; i < 3; i++) sc.addTempFamiliar(new Paloma(sc));
          sc.banner('¡Palomas!', '');
        } else if (r < 0.8) {
          const kinds: PickupKind[] = ['globo', 'petardo', 'llave', 'taco_boletos', 'globo_plata'];
          sc.spawnPickup(sc.rngLoot.pick(kinds), pl.x, pl.y - 4, { burst: true });
        } else {
          sc.spawnPickup('golosina', pl.x, pl.y - 4, { burst: true });
        }
        sc.confetti(pl.x, pl.y - 16, 10);
        break;
      }
      case 'latigo': {
        sc.snd('latigo');
        sc.shake(120, 0.008);
        for (const e of sc.targets()) {
          // A los jefes, el miedo les dura la mitad.
          e.fearT = e.isBoss ? 1.75 : 3.5;
          e.damage(10, pl.sprite, 120);
        }
        break;
      }
      case 'canon': {
        const m = sc.controls.move();
        const d = m.x || m.y ? m : pl.lastShotDir;
        this.dashHit.clear();
        pl.dash = { vx: d.x * 330, vy: d.y * 330, t: 0.38 };
        pl.invuln = Math.max(pl.invuln, 0.55);
        sc.snd('canon');
        sc.shake(120, 0.01);
        break;
      }
      case 'jaula': {
        const e = sc.nearestEnemy(pl.x, pl.y, 220);
        if (!e) {
          sc.snd('error');
          break;
        }
        sc.snd('latigo');
        e.damage(15, null, 0);
        if (e.dead) break;
        const dur = e.isBoss ? 2 : 6;
        e.stunT = dur;
        const cage = sc.add.image(e.x, e.y, 'jaula').setDepth(DEPTH.world + e.y + 8).setAlpha(0.9);
        sc.roomObjs.push(cage);
        let left = dur;
        const follow = (dt: number) => {
          left -= dt;
          if (!e.active || e.dead || left <= 0) {
            cage.setVisible(false);
            return;
          }
          cage.setPosition(e.x, e.y);
        };
        sc.roomUpdate.push(follow);
        break;
      }
      case 'loco': {
        // Vuelve a barajar los objetos de los pedestales de la sala.
        let n = 0;
        for (const ped of sc.pedestals) {
          if (!ped.item || ped.contractCost > 0) continue;
          const pool = sc.room.type === 'puesto' ? 'puesto' : sc.room.type === 'jefe' ? 'jefe' : sc.room.type === 'secreta' ? 'secreta' : 'camerino';
          const id = sc.drawItem(pool);
          ped.setItem(id);
          if (ped.price > 0) ped.price = sc.itemPrice(id);
          sc.splash(ped.x, ped.y - 8, 'humo');
          n++;
        }
        sc.snd(n ? 'carta' : 'error');
        if (n) sc.banner('¡El Loco!', 'Los objetos cambian de sitio');
        break;
      }
      case 'cubo': {
        // Cubo de Agua: apaga todo el fuego de la sala y frena a las fieras.
        sc.snd('tarta');
        sc.fx.flash(120, 0x9fd8ff, 0.3);
        for (const h of [...sc.hazards]) h.douse(99);
        for (const o of sc.g.solids.getChildren() as Obstacle[]) {
          if (o.kind !== 'brasero' || o.extinguished) continue;
          o.hits = BRASERO_HITS;
          sc.room.damaged[o.tile] = o.hits;
          braseroLook(o);
          sc.fuegoApagado();
        }
        for (const e of sc.targets()) e.slowT = Math.max(e.slowT, e.isBoss ? 1 : 3);
        break;
      }
      case 'confeti': {
        // Cono de confeti hacia donde apuntas: empuja, aturde y borra balas.
        const d = pl.lastShotDir;
        sc.snd('canon');
        sc.shake(120, 0.006);
        for (let i = 0; i < 4; i++) sc.confetti(pl.x + d.x * (10 + i * 14), pl.y - 6 + d.y * (10 + i * 14), 10);
        const inCone = (x: number, y: number) => {
          const ex = x - pl.x,
            ey = y - pl.y;
          const along = ex * d.x + ey * d.y;
          return along > -4 && along < 80 && Math.abs(ex * d.y - ey * d.x) < 12 + along * 0.6;
        };
        for (const s of sc.enemyShotsNear(pl.x, pl.y, 90)) if (inCone(s.x, s.y)) s.pop();
        for (const e of sc.targets()) {
          if (!inCone(e.x, e.y)) continue;
          e.stunT = Math.max(e.stunT, 1);
          e.damage(6, pl.sprite, e.isBoss ? 0 : 280);
        }
        break;
      }
      case 'bocina': {
        sc.snd('bocina');
        const ring = sc.add.sprite(pl.x, pl.y, 'onda', 0).setDepth(DEPTH.fx).setScale(1.3);
        ring.play('onda').once('animationcomplete', () => ring.destroy());
        for (const s of sc.enemyShotsNear(pl.x, pl.y, 80)) s.pop();
        for (const e of sc.targets()) {
          const d = Phaser.Math.Distance.Between(pl.x, pl.y, e.x, e.y);
          if (d < 90) {
            e.stunT = 1.4;
            if (!e.isBoss) e.damage(4, pl.sprite, 260);
            else e.damage(4, null, 0);
          }
        }
        break;
      }
    }
  }

  private splatPie(x: number, y: number): void {
    const sc = this.sc;
    sc.snd('tarta');
    const s = sc.add.sprite(x, y, 'crema', 0).setDepth(DEPTH.fx);
    s.play('crema').once('animationcomplete', () => s.destroy());
    for (const e of sc.targets()) {
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < 30) {
        e.damage(22, { x, y }, 90);
        e.stunT = 2.5;
        e.slowT = 4;
      }
    }
  }

  onDashTick(pl: Player): void {
    for (const e of this.sc.targets()) {
      if (this.dashHit.has(e)) continue;
      if (Phaser.Math.Distance.Between(pl.x, pl.y, e.x, e.y) < 16) {
        this.dashHit.add(e);
        e.damage(25, pl.sprite, 160);
      }
    }
  }

  // --- Ganchos ---
  onHurt(): void {
    const sc = this.sc;
    const pl = sc.player;
    if (this.hasFlag('burstOnHurt')) {
      // Estalla con tus modificadores (fuego, veneno, rebotes...).
      const base = buildVolley(sc.stats, { x: 1, y: 0 }, 1)[0].opts;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        sc.spawnShot(pl.x, pl.y - 6, Math.cos(a) * 160, Math.sin(a) * 160, true, { ...base, range: 100, split: false });
      }
    }
    if (this.hasFlag('humo')) {
      // Bomba de Humo: 2 s invisible; las criaturas pierden el rastro.
      sc.splash(pl.x, pl.y, 'humo', 2);
      sc.snd('humo');
      pl.hiddenT = 2;
      for (const e of sc.targets()) if (!e.isBoss) e.fearT = Math.max(e.fearT, 0.6);
    }
  }

  /** Cada muerte cuenta para el Ramo de Rosas. */
  onKill(): void {
    if (!this.hasFlag('ramo')) return;
    const p = this.sc.run.player;
    p.ramo = (p.ramo ?? 0) + 1;
    if (p.ramo >= 12 && p.hp < p.maxHp) {
      p.ramo = 0;
      p.hp = Math.min(p.maxHp, p.hp + 1);
      this.sc.floatText('+ medio globo', 0xd4323f);
      this.sc.snd('globo');
    }
  }

  onRoomClear(): void {
    const p = this.sc.run.player;
    if (!this.sc.roomHurt) p.cleanRooms = (p.cleanRooms ?? 0) + 1;
    if (!p.active) return;
    const max = item(p.active).active!.charges;
    if (p.charge < max) p.charge++;
  }

  update(dt: number): void {
    const sc = this.sc;
    const pl = sc.player;
    // Imán: atrae recogibles (no los de la tienda).
    if (this.hasFlag('magnet')) {
      for (const pk of sc.pickupsList()) {
        if (pk.price > 0 || pk.kind.startsWith('cofre')) continue;
        const d = Phaser.Math.Distance.Between(pl.x, pl.y, pk.x, pk.y);
        if (d < 90 && d > 2) {
          const a = Math.atan2(pl.y - pk.y, pl.x - pk.x);
          pk.body.velocity.x += Math.cos(a) * 500 * dt;
          pk.body.velocity.y += Math.sin(a) * 500 * dt;
        }
      }
    }
    // Rastro de serrín.
    if (this.hasFlag('trail')) {
      this.trailT -= dt;
      if (this.trailT <= 0 && pl.vel.lengthSq() > 100) {
        this.trailT = 0.12;
        const img = sc.add.image(pl.x, pl.y + 5, 'rastro_serrin').setDepth(DEPTH.decal);
        this.trail.push({ x: pl.x, y: pl.y + 5, life: 2.5, img });
      }
    }
    for (const t of this.trail) {
      t.life -= dt;
      t.img.setAlpha(Math.min(1, t.life));
      for (const e of sc.targets()) {
        if (!e.flying && Math.abs(e.x - t.x) < 8 && Math.abs(e.body.bottom - t.y) < 8) e.slowT = 0.5;
      }
      // El serrín también frena las balas que lo cruzan.
      for (const s of sc.enemyShotsNear(t.x, t.y, 7)) {
        if (s.getData('serrin')) continue;
        s.setData('serrin', true);
        s.body.velocity.scale(0.6);
      }
    }
    this.trail = this.trail.filter((t) => {
      if (t.life <= 0) t.img.destroy();
      return t.life > 0;
    });
  }

  clearRoomStuff(): void {
    for (const t of this.trail) t.img.destroy();
    this.trail = [];
  }

  // --- Golosinas ---
  useGolosina(): void {
    const sc = this.sc;
    const p = sc.run.player;
    if (!p.golosina) return;
    const effect = sc.run.golosinaMap[p.golosina];
    p.golosina = null;
    if (!sc.run.golosinaKnown.includes(effect)) sc.run.golosinaKnown.push(effect);
    sc.meta('golosina', effect);
    sc.snd('golosina');
    const before = sc.stats;
    const note = this.apply(effect);
    // El aviso dice exactamente qué ha cambiado.
    const changes = sc.announceStats(before);
    sc.banner(GOLOSINA_EFFECTS[effect].name, changes || note);
    if (note && !changes) sc.floatText(note, GOLOSINA_EFFECTS[effect].good ? 0x79b84a : 0xd4323f);
  }

  /** Aplica el efecto. Devuelve una descripción si no es un cambio de estadísticas. */
  apply(effect: GolosinaEffect): string {
    let note = '';
    const sc = this.sc;
    const p = sc.run.player;
    const b = p.bonus;
    switch (effect) {
      case 'subidon':
        b.speed = (b.speed ?? 0) + 0.6;
        break;
      case 'bajon':
        b.speed = (b.speed ?? 0) - 0.5;
        break;
      case 'empacho':
        // Nunca mata: si solo queda medio globo, te libras.
        if (p.hp + p.shield > 1) {
          if (p.shield > 0) p.shield--;
          else {
            p.hp--;
            // Cuenta como daño rojo (El Contrato no se libra de esto).
            p.redDamageTaken = true;
          }
          sc.player.flash(0x79b84a);
          sc.snd('herido');
          note = '- medio globo';
        } else note = 'Te libras por poco';
        break;
      case 'menta':
        p.hp = p.maxHp;
        sc.snd('globo');
        note = 'Vida llena';
        break;
      case 'halcon':
        b.range = (b.range ?? 0) + 1;
        break;
      case 'miope':
        b.range = (b.range ?? 0) - 1;
        break;
      case 'picante':
        b.damage = (b.damage ?? 0) + 0.6;
        break;
      case 'petardo':
        p.bombs += 1;
        sc.snd('petardo');
        note = '+1 petardo';
        break;
      case 'mareo':
        sc.mareoT = 7;
        note = 'Controles al revés 7 s';
        break;
      case 'fresa':
        p.shield = Math.min(p.shield + 2, 24 - p.maxHp);
        sc.snd('globo');
        note = '+1 globo plateado';
        break;
    }
    sc.recomputeStats();
    return note;
  }
}

/**
 * Aplausómetro: matar sin recibir daño llena el medidor y el público lanza
 * regalos. En el Acto IV tiene dos caras: si te golpean, abuchea y lanza tomates.
 */
export class Applause {
  readonly max = 14;
  /** Umbral de abucheo (Acto IV). */
  readonly booAt = -6;

  constructor(private sc: GameScene) {}

  private get st() {
    return this.sc.run.publico;
  }

  get value(): number {
    return this.st.value;
  }

  private get twoFaced(): boolean {
    return actDef(this.sc.run.act).mods?.publico === 'dos_caras';
  }

  private get gain(): number {
    return this.sc.effects.hasFlag('claque') ? 2 : 1;
  }

  onKill(): void {
    const st = this.st;
    if (st.value < 0) st.value = Math.min(0, st.value + 2);
    else st.value += (st.combo > 0 ? 2 : 1) * this.gain;
    st.combo = 1.6;
    if (st.value >= this.max) {
      st.value = 0;
      this.sc.applauseReward();
    }
  }

  /** `fromPublic`: el daño de un tomate no vuelve a mover el medidor. */
  onHurt(fromPublic = false): void {
    const st = this.st;
    if (fromPublic) return;
    if (st.value > 2) this.sc.snd('abucheo');
    st.combo = 0;
    if (!this.twoFaced) {
      st.value = this.sc.effects.hasFlag('aplausoEterno') ? Math.floor(st.value / 2) : 0;
      return;
    }
    st.value = this.sc.effects.hasFlag('aplausoEterno') ? Math.floor(st.value / 2) : Math.min(0, st.value) - 3;
    if (st.value <= this.booAt) {
      st.value = 0;
      this.sc.snd('abucheo');
      this.sc.banner('¡Buuu!', 'El público te tira tomates');
      this.sc.publicThrow(this.sc.player.x, this.sc.player.y, 3);
    }
  }

  update(dt: number): void {
    this.st.combo = Math.max(0, this.st.combo - dt);
  }
}
