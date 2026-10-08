import Phaser from 'phaser';
import gameData from '../data/game-data.json';

const POWER_PROJECTILE_FLAG = 'isPowerProjectile';

export function getPower(powerId) {
  return gameData.powers.find((power) => power.id === powerId) ?? gameData.powers[0];
}

/**
 * Collision callbacks can receive their participants in a different order when
 * groups are involved. Keep a positive identity check so terrain can never be
 * mistaken for (and destroyed as) a projectile.
 */
export function isPowerProjectile(candidate) {
  return Boolean(candidate?.getData?.(POWER_PROJECTILE_FLAG));
}

/** Creates a projectile with all tuning read from game-data.json. */
export function launchPower(scene, group, { x, y, facing = 1, powerId = 'fire', owner = 'player' }) {
  const power = getPower(powerId);
  const projectile = scene.physics.add.image(x, y, `projectile_${power.id}`);
  // Arcade Group applies its defaults when an object is added. Add first so
  // those defaults cannot overwrite the tuned velocity/gravity below.
  group.add(projectile);
  projectile.setDepth(12);
  projectile.setDataEnabled();
  projectile.setData({
    [POWER_PROJECTILE_FLAG]: true,
    owner,
    powerId: power.id,
    damage: power.damage,
    bornAt: scene.time.now,
  });
  projectile.body.allowGravity = power.kind === 'arc';
  // Body gravity is added to the world's; subtract it so `gravityY` in
  // game-data.json is the arc's real, total gravity.
  const worldGravityY = scene.physics.world?.gravity?.y ?? 0;
  projectile.body.setGravityY(power.kind === 'arc' ? (power.gravityY ?? 0) - worldGravityY : 0);
  projectile.setVelocityX(power.speed * facing);
  if (power.kind === 'arc') projectile.setVelocityY(-250);
  projectile.setFlipX(facing < 0);
  projectile.setCollideWorldBounds(false);

  const trailColor = Number.parseInt(power.color.slice(1), 16);
  const trail = scene.add.particles(x, y, 'particle_dot', {
    follow: projectile,
    lifespan: 180,
    frequency: power.id === 'lightning' ? 28 : 55,
    quantity: 1,
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.8, end: 0 },
    tint: trailColor,
  }).setDepth(11);

  const timer = scene.time.delayedCall(power.lifetimeMs, () => {
    trail.stopFollow();
    trail.explode(4, projectile.x, projectile.y);
    projectile.destroy();
    scene.time.delayedCall(220, () => trail.destroy());
  });
  projectile.once(Phaser.GameObjects.Events.DESTROY, () => {
    if (timer && !timer.hasDispatched) timer.remove(false);
    if (trail?.active) {
      trail.stopFollow();
      scene.time.delayedCall(220, () => trail?.destroy());
    }
  });
  return projectile;
}

export function makeImpact(scene, x, y, color = 0xffffff) {
  const ring = scene.add.circle(x, y, 5, color, 0.75).setDepth(30);
  scene.tweens.add({
    targets: ring,
    radius: 20,
    alpha: 0,
    duration: 180,
    ease: 'Quad.Out',
    onComplete: () => ring.destroy(),
  });
}
