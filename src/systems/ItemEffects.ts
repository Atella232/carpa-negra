// Efectos de objetos activos, ganchos de eventos y golosinas.
import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Player } from '../entities/Player';
import { item, ActiveEffect } from '../data/items';
import { GOLOSINA_EFFECTS, GolosinaEffect } from '../data/golosinas';
import { Paloma } from '../entities/familiars';
import { DEPTH } from '../config';
import { PickupKind } from '../core/run';

export class ItemEffects {
  private dashHit = new Set<unknown>();
  private trailT = 0;
  trail: { x: number; y: number; life: number; img: Phaser.GameObjects.Image }[] = [];

  constructor(private sc: GameScene) {}

  hasFlag(flag: 'magnet' | 'shopDiscount' | 'revealMap' | 'flight' | 'trail' | 'burstOnHurt'): boolean {
    return this.sc.run.player.passives.some((id) => item(id).flags?.[flag]);
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
          t += delta / 1000;
          pie.x += d.x * 190 * (delta / 1000);
          pie.y += d.y * 190 * (delta / 1000);
          pie.rotation += delta / 100;
          const hit = sc.nearestEnemy(pie.x, pie.y, 12);
          const out = pie.x < 18 || pie.x > 222 || pie.y < 18 || pie.y > 126;
          if (hit || out || t > 0.6) {
            sc.events.off('update', step);
            this.splatPie(pie.x, pie.y);
            pie.destroy();
          }
        };
        sc.events.on('update', step);
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
        for (const e of sc.enemiesAlive()) {
          e.fearT = 3.5;
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
      case 'bocina': {
        sc.snd('bocina');
        const ring = sc.add.sprite(pl.x, pl.y, 'onda', 0).setDepth(DEPTH.fx).setScale(1.3);
        ring.play('onda').once('animationcomplete', () => ring.destroy());
        for (const s of sc.enemyShotsNear(pl.x, pl.y, 80)) s.pop();
        for (const e of sc.enemiesAlive()) {
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
    for (const e of sc.enemiesAlive()) {
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < 30) {
        e.damage(22, { x, y }, 90);
        e.stunT = 2.5;
        e.slowT = 4;
      }
    }
  }

  onDashTick(pl: Player): void {
    for (const e of this.sc.enemiesAlive()) {
      if (this.dashHit.has(e)) continue;
      if (Phaser.Math.Distance.Between(pl.x, pl.y, e.x, e.y) < 16) {
        this.dashHit.add(e);
        e.damage(25, pl.sprite, 160);
      }
    }
  }

  // --- Ganchos ---
  onHurt(): void {
    if (this.hasFlag('burstOnHurt')) {
      const pl = this.sc.player;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.sc.spawnShot(pl.x, pl.y - 6, Math.cos(a) * 160, Math.sin(a) * 160, true, {
          damage: this.sc.stats.damage, range: 100,
        });
      }
    }
  }

  onRoomClear(): void {
    const p = this.sc.run.player;
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
      for (const e of sc.enemiesAlive()) {
        if (!e.flying && Math.abs(e.x - t.x) < 8 && Math.abs(e.body.bottom - t.y) < 8) e.slowT = 0.5;
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
    sc.snd('golosina');
    sc.banner(GOLOSINA_EFFECTS[effect].name, GOLOSINA_EFFECTS[effect].good ? '' : 'Puaj');
    this.apply(effect);
  }

  apply(effect: GolosinaEffect): void {
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
          else p.hp--;
          sc.player.flash(0x79b84a);
          sc.snd('herido');
        }
        break;
      case 'menta':
        p.hp = p.maxHp;
        sc.snd('globo');
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
        break;
      case 'mareo':
        sc.mareoT = 7;
        break;
      case 'fresa':
        p.shield = Math.min(p.shield + 2, 24 - p.maxHp);
        sc.snd('globo');
        break;
    }
    sc.recomputeStats();
  }
}

/** Aplausómetro: matar sin recibir daño llena el medidor. */
export class Applause {
  value = 0;
  readonly max = 14;
  private combo = 0;

  constructor(private sc: GameScene) {}

  onKill(): void {
    this.value += this.combo > 0 ? 2 : 1;
    this.combo = 1.6;
    if (this.value >= this.max) {
      this.value = 0;
      this.sc.applauseReward();
    }
  }

  onHurt(): void {
    if (this.value > 2) this.sc.snd('abucheo');
    this.value = 0;
    this.combo = 0;
  }

  update(dt: number): void {
    this.combo = Math.max(0, this.combo - dt);
  }
}
