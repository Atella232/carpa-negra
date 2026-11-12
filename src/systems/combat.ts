// Código de GameScene (combate y daño).
// Son funciones con `this: GameScene`: la escena las usa como métodos propios.
import type { GameScene } from '../scenes/GameScene';
import Phaser from 'phaser';
import { COLS, DEPTH, DOOR_POS, ROOM_H, ROOM_W } from '../config';
import { neighborRoom, PickupKind } from '../core/run';
import { characterDef } from '../data/characters';
import { OPPOSITE } from '../core/floorgen';
import { Controls } from '../systems/Controls';
import { rebuildDoors, DoorInfo } from '../systems/RoomBuilder';
import { CRATE_MARKED } from '../data/loot';
import { Shot } from '../entities/Shot';
import { Enemy } from '../entities/Enemy';
import { Pickup, Obstacle, BRASERO_HITS, braseroLook } from '../entities/props';
import { playMusic } from '../audio/music';
import { clearRunSave } from '../core/runSave';
import { logRoom } from '../core/telemetry';

export function setupColliders(this: GameScene): void {
  const P = this.player.sprite;
  const g = this.g;
  const flying = () => this.effects.hasFlag('flight');
  const add = this.physics.add;

  add.collider(P, g.walls);
  add.collider(P, g.doors, (_p, d) => this.touchDoor(d as Phaser.GameObjects.Zone));
  add.collider(P, g.solids, (_p, o) => this.touchSolid(o as Obstacle), () => !flying());
  add.collider(P, g.pits, undefined, () => !flying());
  add.collider(P, g.altos);
  add.collider(P, g.pedestals, (_p, b) => this.touchPedestal((b as Phaser.GameObjects.Image).getData('pedestal')));

  const ground = (e: unknown) => !(e as Enemy).flying;
  add.collider(g.enemies, g.walls);
  add.collider(g.enemies, g.doors);
  add.collider(g.enemies, g.gaps);
  add.collider(g.enemies, g.solids, undefined, ground);
  add.collider(g.enemies, g.pits, undefined, ground);
  add.collider(g.enemies, g.altos);
  add.collider(g.enemies, g.pedestals, undefined, ground);
  add.collider(g.enemies, g.enemies, undefined, (a, b) => ground(a) && ground(b));

  // Las pelotas del Aro de Hula giran alrededor del payaso y las del bumerán, a la
  // vuelta, regresan a la mano: no chocan con nada del escenario.
  const free = (s: unknown) => !(s as Shot).opts.orbit && !((s as Shot).friendly && (s as Shot).returning);
  add.collider(g.pShots, g.walls, (s) => this.shotHitWall(s as Shot), free);
  add.collider(g.pShots, g.doors, (s) => this.shotHitWall(s as Shot), free);
  add.collider(g.pShots, g.solids, (s, o) => this.shotHitSolid(s as Shot, o as Obstacle), (s) => !(s as Shot).opts.spectral && free(s));
  // Platos Chinos: tus pelotas rompen las balas enemigas.
  add.overlap(g.pShots, g.eShots, (s, e) => {
    const mine = s as Shot,
      theirs = e as Shot;
    if (mine.dead || theirs.dead) return;
    theirs.pop('aire');
    this.fx.sparks(theirs.x, theirs.y, 0xe4e2ec, 3);
    if (--mine.antiLeft <= 0) mine.pop('aire');
  }, (s) => (s as Shot).opts.antiBala);
  add.overlap(g.pShots, g.enemies, (s, e) => this.shotHitEnemy(s as Shot, e as Enemy));

  // Con las paredes-espejo (Tu Reflejo, fase 2), la bala rebota una vez antes de chocar.
  add.collider(g.eShots, g.walls, (s) => this.shotHitWall(s as Shot), (s) => this.wallMirror(s as Shot));
  add.collider(g.eShots, g.doors, (s) => this.shotHitWall(s as Shot));
  // Espejos: devuelven cualquier disparo; otros obstáculos altos lo paran.
  add.overlap(g.pShots, g.altos, (s, a) => this.shotHitTall(s as Shot, a as Phaser.Physics.Arcade.Image));
  add.overlap(g.eShots, g.altos, (s, a) => this.shotHitTall(s as Shot, a as Phaser.Physics.Arcade.Image));
  add.collider(g.eShots, g.solids, (s) => (s as Shot).pop('obstaculo'));
  add.overlap(P, g.eShots, (_p, s) => {
    const shot = s as Shot;
    if (shot.dead) return;
    // El orbe del hipnotizador no hace daño: invierte el movimiento un rato.
    if (shot.opts.daze > 0) {
      if (!this.god && this.player.invuln <= 0 && this.mareoT <= 0) {
        this.mareoT = shot.opts.daze;
        this.floatText('¡Mareado!', 0xc9b3ef);
      }
      shot.pop('carne');
      return;
    }
    this.hurtPlayer(shot.opts.halves, shot.x, shot.y, { cause: shot.cause || 'una bala' });
    shot.pop('carne');
  });
  add.overlap(P, g.enemies, (_p, e) => {
    const en = e as Enemy;
    if (en.dead || en.contact <= 0 || en.lift > 8 || en.wake > 0) return;
    // Collar de Pinchos: quien te toca se pincha.
    if (en.thornCd <= 0 && this.effects.hasFlag('thorns')) {
      en.thornCd = 0.5;
      en.damage(8, this.player.sprite, 90);
      if (en.dead) return;
    }
    this.hurtPlayer(en.contact, en.x, en.y, { cause: en.name });
  });
  add.overlap(P, g.pickups, (_p, pk) => this.touchPickup(pk as Pickup));
  add.collider(g.pickups, g.walls);
  add.collider(g.pickups, g.doors);
  add.collider(g.pickups, g.gaps);
  add.collider(g.pickups, g.solids);
  add.collider(g.pickups, g.pits);
  add.collider(g.pickups, g.altos);
  add.collider(g.pickups, g.pedestals);
  add.collider(g.pickups, g.pickups);
  add.collider(g.bombs, g.walls);
  add.collider(g.bombs, g.gaps);
  add.collider(g.bombs, g.solids);
  add.collider(g.bombs, g.altos);
}

export function shotHitWall(this: GameScene, s: Shot): void {
  if (s.dead) return;
  // Bola de Espejos: al chocar (sin rebotes que gastar) se parte en tres.
  if (s.friendly && s.opts.prism && !s.opts.isFragment && s.bouncesLeft <= 0) {
    const v = { ...s.lastVel };
    if (s.x < 26 || s.x > ROOM_W - 26) v.x = -v.x;
    if (s.y < 26 || s.y > ROOM_H - 26) v.y = -v.y;
    const a = Math.atan2(v.y, v.x),
      sp = Math.hypot(v.x, v.y);
    for (const off of [0, -0.44, 0.44]) {
      this.spawnShot(s.x, s.y, Math.cos(a + off) * sp, Math.sin(a + off) * sp, true, {
        ...s.opts, damage: s.opts.damage * 0.5, range: s.opts.range * 0.6, scale: s.opts.scale * 0.7,
        isFragment: true, prism: false, bounce: 0, linger: false,
      });
    }
    this.snd('espejo');
    s.pop('pared');
    return;
  }

  if (s.bouncesLeft > 0) {
    s.bouncesLeft--;
    this.snd('rebote');
    this.fx.dust(s.x, s.y, 1);
    return;
  }
  s.pop('pared');
}

/** Devuelve false (sin choque) si la bala rebota en una pared-espejo. */
export function wallMirror(this: GameScene, s: Shot): boolean {
  if (!this.wallReflect || s.getData('rebotada')) return true;
  s.setData('rebotada', true);
  const v = s.body.velocity;
  if (s.x < 24 || s.x > ROOM_W - 24) v.x = -v.x;
  if (s.y < 24 || s.y > ROOM_H - 24) v.y = -v.y;
  this.snd('espejo');
  return false;
}

export function shotHitTall(this: GameScene, s: Shot, al: Phaser.Physics.Arcade.Image): void {
  if (s.dead) return;
  if (al.getData('kind') !== 'espejo') return s.pop('obstaculo');
  const c = s.body.center;
  const dx = (c.x - al.x) / 8,
    dy = (c.y - al.y) / 8;
  const v = s.body.velocity;
  // Solo rebota si va hacia dentro del espejo (así no se queda atrapado).
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx * v.x < 0) s.reflect('x');
    else return;
  } else if (dy * v.y < 0) s.reflect('y');
  else return;
  this.snd('espejo');
  this.fx.sparks(c.x, c.y, 0xe4e2ec, 2);
}

export function shotHitSolid(this: GameScene, s: Shot, o: Obstacle): void {
  if (s.dead) return;
  // El agua apaga un brasero de un golpe.
  if (s.opts.water && o.kind === 'brasero' && !o.extinguished) o.hits = Math.max(o.hits, BRASERO_HITS - 1);
  if (o.breakableByShots) this.hitObstacle(o);
  // La paja arde con los malabares en llamas.
  else if (o.kind === 'paja' && s.opts.burn) this.destroyObstacle(o, true);
  s.pop('obstaculo');
}

export function shotHitEnemy(this: GameScene, s: Shot, e: Enemy): void {
  if (s.dead || e.dead || s.hit.has(e) || e.lift > 14) return;
  s.hit.add(e);
  // Algunas criaturas desvían los disparos (el tragasables, de frente).
  if (e.onShot?.(s) === 'deflect') {
    s.dead = true;
    s.destroy();
    const a = Math.atan2(this.player.y - 6 - e.y, this.player.x - e.x);
    this.spawnShot(e.x, e.y - 4, Math.cos(a) * 140, Math.sin(a) * 140, false, { damage: 1, range: 180, texture: 'bala' });
    this.snd('sable');
    this.fx.sparks(s.x, s.y, 0xffffff, 5);
    return;
  }
  const lit = e.litT > 0 ? 1.25 : 1;
  // Mazo de Feria: cada golpe seguido a la misma fiera, un 15 % más (hasta +90 %).
  let ramp = 1;
  if (s.opts.ramp) {
    const r = this.ramp;
    r.n = r.target === e ? Math.min(6, r.n + 1) : 0;
    r.target = e;
    ramp = 1 + 0.15 * r.n;
  }
  e.damage(s.opts.damage * lit * ramp, { x: s.x - s.body.velocity.x, y: s.y - s.body.velocity.y }, s.opts.knockback);
  // Chicle y agua: quien recibe el golpe va más lento un rato.
  if ((s.opts.sticky || s.opts.water) && !e.dead) e.slowT = Math.max(e.slowT, e.isBoss ? 0.5 : 1.5);
  if (s.opts.crit) this.fx.sparks(s.x, s.y, 0xfff2a8, 6);
  // Esquirla de Espejo: el golpe salta a otra criatura cercana.
  if (s.opts.chain && !s.opts.isChain) {
    const next = this.targets().filter((o) => o !== e && !s.hit.has(o)).sort((a, b) =>
      Phaser.Math.Distance.Between(e.x, e.y, a.x, a.y) - Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y))[0];
    if (next && Phaser.Math.Distance.Between(e.x, e.y, next.x, next.y) < 70) {
      this.zap(e.x, e.y - 4, next.x, next.y - 4);
      next.damage(s.opts.damage * 0.6, e, 30);
    }
  }
  if (s.opts.burn && !e.dead) e.burn(s.opts.damage);
  if (s.opts.poison && !e.dead) e.poison(s.opts.damage);
  if (!s.opts.pierce || e.invulnerable) s.pop('carne');
  else this.fx.sparks(s.x, s.y, 0xffffff, 2);
}

export function hitObstacle(this: GameScene, o: Obstacle): void {
  o.hits++;
  if (o.kind === 'palomitas') {
    this.room.damaged[o.tile] = o.hits;
    if (o.hits >= 3) this.destroyObstacle(o, true);
    else o.setFrame(o.hits);
  } else if (o.kind === 'brasero') {
    this.room.damaged[o.tile] = o.hits;
    // Cada golpe se nota: vapor, chisporroteo y la llama se oscurece.
    this.fx.sparks(o.x, o.y - 6, 0xcfd3dc, 3);
    this.snd('fuego');
    braseroLook(o);
    if (o.extinguished) {
      this.fx.dust(o.x, o.y - 6, 4);
      this.fuegoApagado();
      if (this.rngLoot.chance(0.25)) this.dropRandom(o.x, o.y + 10);
    }
  }
}

export function destroyObstacle(this: GameScene, o: Obstacle, drop: boolean): void {
  if (!o.active) return;
  this.room.destroyed.push(o.tile);
  this.nav.setBlocked(o.tile % 13, Math.floor(o.tile / 13), false);
  this.snd('romper');
  this.debris(o.x, o.y, o.kind === 'palomitas' ? 'W' : 'N');
  if (o.kind === 'cajon_marcado') {
    const k = this.rngLoot.pick<PickupKind>(CRATE_MARKED);
    this.spawnPickup(k, o.x, o.y, { burst: true });
  } else if (drop && o.kind === 'palomitas' && this.rngLoot.chance(0.22)) {
    this.dropRandom(o.x, o.y);
  }
  o.destroy();
}

export function touchSolid(this: GameScene, o: Obstacle): void {
  if (o.kind === 'brasero' && !o.extinguished) this.hurtPlayer(1, o.x, o.y, { cause: 'un brasero' });
  // Bruno rompe los cajones al andar contra ellos.
  if ((o.kind === 'cajon' || o.kind === 'cajon_marcado') && characterDef(this.run.player.character).rules?.rompeCajones) {
    this.shake(80, 0.005);
    this.destroyObstacle(o, true);
  }
}

export function touchDoor(this: GameScene, zone: Phaser.GameObjects.Zone): void {
  const info = zone.getData('door') as DoorInfo | undefined;
  if (!info || !info.locked) return;
  const p = this.run.player;
  if (p.keys > 0) {
    p.keys--;
    const target = info.target;
    if (target) target.unlocked = true;
    this.snd('llave');
    rebuildDoors(this);
  } else if (this.pickupMsgCd <= 0) {
    this.pickupMsgCd = 1.5;
    this.banner('Cerrado', 'Necesitas una llave');
  }
}

export function hurtPlayer(this: GameScene, halves: number, srcX: number, srcY: number, o: { fromPublic?: boolean; cause?: string } = {}): void {
  const pl = this.player;
  if (this.god || pl.invuln > 0 || pl.dead || pl.dash || this.transitioning) return;
  const p = this.run.player;
  let take = halves;
  const fromShield = Math.min(p.shield, take);
  p.shield -= fromShield;
  take -= fromShield;
  this.roomHurtHalves += halves;
  if (take > 0) {
    p.hp = Math.max(0, p.hp - take);
    p.redDamageTaken = true;
    // Red de Seguridad: una vez por acto, el golpe mortal te deja con medio globo.
    if (p.hp <= 0 && p.shield <= 0 && this.effects.hasFlag('redSeguridad') && !p.netUsed) {
      p.netUsed = true;
      p.hp = 1;
      this.banner('¡La red!', 'Te salva una vez por acto');
      this.fx.flash(200, 0xfff2a8, 0.4);
    }
  }
  this.roomHurt = true;
  this.lastHurtCause = o.cause ?? '';
  pl.invuln = 1.0;
  const a = Math.atan2(pl.y - srcY, pl.x - srcX);
  pl.vel.set(Math.cos(a) * 190, Math.sin(a) * 190);
  // El retroceso se nota: unos instantes sin control fino.
  pl.knockT = 0.16;
  pl.flash(0xd4323f);
  this.snd(fromShield > 0 && take === 0 ? 'plata' : 'herido');
  this.shake(140, 0.008);
  this.freeze(90);
  this.hurtT = 0.4;
  Controls.get().rumble(120, 0.6);
  this.applause.onHurt(o.fromPublic);
  this.effects.onHurt();
  if (p.hp <= 0 && p.shield <= 0) this.killPlayer();
}

export function killPlayer(this: GameScene): void {
  const pl = this.player;
  pl.dead = true;
  // La partida guardada se borra en el instante de morir.
  clearRunSave();
  logRoom({
    act: this.run.act, tpl: this.room.templateId ?? '', type: this.room.type, secs: +this.roomTime.toFixed(1),
    hurt: this.roomHurtHalves, died: this.lastHurtCause || 'desconocido',
  });
  pl.body.setVelocity(0, 0);
  this.snd('muerteJugador');
  playMusic(null);
  this.physics.pause();
  this.tweens.add({ targets: this.cameras.main, zoom: 1.6, duration: 900, ease: 'Sine.easeInOut' });
  this.cameras.main.pan(pl.x, pl.y, 900);
  this.time.delayedCall(2200, () => this.finish('muerte'));
}

/**
 * Explosión: daña criaturas, rompe obstáculos y espejos, empuja recogibles y
 * descubre secretos. Las pequeñas (disparos explosivos) solo dañan.
 */
export function explode(this: GameScene, x: number, y: number, o: { damage: number; hurtsPlayer: boolean; radius?: number; small?: boolean }): void {
  const radius = o.radius ?? 34;
  const ex = this.add.sprite(x, y - 4, 'explosion', 0).setDepth(DEPTH.fx).setScale(o.small ? 0.45 : 1);
  ex.play('explosion').once('animationcomplete', () => ex.destroy());
  for (const e of this.targets()) {
    if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < radius + 6) e.damage(o.damage, { x, y }, o.small ? 40 : 160, o.small);
  }
  if (o.small) {
    this.fx.dust(x, y, 3);
    this.snd('petardo');
    return;
  }
  this.addDecal(x, y + 2, 2, 1.6, 0x221a22);
  this.snd('explosion');
  this.shake(220, 0.014);
  this.freeze(60);
  this.fx.dust(x, y + 4, 8);
  if (o.hurtsPlayer && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < radius) {
    this.hurtPlayer(2, x, y, { cause: 'tu propio petardo' });
  }
  for (const ob of [...(this.g.solids.getChildren() as Obstacle[])]) {
    if (Phaser.Math.Distance.Between(x, y, ob.x, ob.y) > radius + 4) continue;
    if (ob.kind === 'bloque') continue;
    if (ob.kind === 'brasero') {
      if (!ob.extinguished) {
        ob.hits = BRASERO_HITS;
        this.room.damaged[ob.tile] = ob.hits;
        braseroLook(ob);
        this.fuegoApagado();
      }
      continue;
    }
    this.destroyObstacle(ob, true);
  }
  // Espejos y demás obstáculos altos que se pueden romper.
  for (const al of [...(this.g.altos.getChildren() as Phaser.Physics.Arcade.Image[])]) {
    if (!al.getData('breakable') || Phaser.Math.Distance.Between(x, y, al.x, al.y) > radius + 4) continue;
    this.breakTall(al);
  }
  for (const pk of this.pickupsList()) {
    const d = Phaser.Math.Distance.Between(x, y, pk.x, pk.y);
    if (d < radius + 10 && pk.price === 0 && !pk.body.immovable) {
      const a = Math.atan2(pk.y - y, pk.x - x);
      pk.body.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);
    }
  }
  for (const s of this.enemyShotsNear(x, y, radius)) s.pop();
  // La onda apaga el fuego del suelo.
  for (const h of [...this.hazards]) if (Phaser.Math.Distance.Between(x, y, h.x, h.y) < radius + 6) h.douse(99);
  this.revealSecretsNear(x, y);
}

/** Rayo breve entre dos puntos (cadena de la Esquirla de Espejo). */
export function zap(this: GameScene, x0: number, y0: number, x1: number, y1: number): void {
  const g = this.add.graphics().setDepth(DEPTH.fx);
  g.lineStyle(1, 0xe4e2ec, 1).lineBetween(x0, y0, x1, y1);
  g.lineStyle(1, 0xc9b3ef, 0.6).lineBetween(x0 + 1, y0, x1 + 1, y1);
  this.roomObjs.push(g);
  this.time.delayedCall(70, () => g.destroy());
  this.snd('espejo');
}

/** Rompe un obstáculo alto (espejo): se recuerda, deja esquirlas y quizá premio. */
export function breakTall(this: GameScene, al: Phaser.Physics.Arcade.Image): void {
  if (!al.active) return;
  const tile = al.getData('tile') as number;
  this.room.destroyed.push(tile);
  this.nav.setBlocked(tile % COLS, Math.floor(tile / COLS), false);
  this.snd('cristal');
  this.run.stats.espejos++;
  this.meta('espejo');
  this.fx.debris(al.x, al.y, 0xe4e2ec, 10);
  this.fx.sparks(al.x, al.y, 0xc9b3ef, 6);
  this.addDecal(al.x, al.y + 4, 1, 0.8, 0x7a7090);
  if (this.rngLoot.chance(0.35)) this.dropRandom(al.x, al.y);
  al.destroy();
}

export function revealSecretsNear(this: GameScene, x: number, y: number): void {
  const room = this.room;
  let found = false;
  for (const dir of room.doors) {
    if (room.secretFound.includes(dir)) continue;
    const other = neighborRoom(this.run, room, dir);
    if (!other) continue;
    if (other.type !== 'secreta' && room.type !== 'secreta') continue;
    const pos = DOOR_POS[dir];
    if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < 46) {
      room.secretFound.push(dir);
      other.secretFound.push(OPPOSITE[dir]);
      found = true;
    }
  }
  if (found) {
    this.time.delayedCall(250, () => this.snd('secreto'));
    rebuildDoors(this);
  }
}
