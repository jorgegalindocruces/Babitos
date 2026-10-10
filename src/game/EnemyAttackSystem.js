const ENEMY_PROJECTILE_FLAG = 'isEnemyProjectile';

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Positive identity check for physics callbacks where participant order varies. */
export function isEnemyProjectile(candidate) {
  return Boolean(candidate?.getData?.(ENEMY_PROJECTILE_FLAG));
}

/** Keep the toxic glob visually tied to the mouth before it enters a horizontal lane. */
export function resolveToxicProjectileLane(mouthY, targetY, options = {}) {
  const startY = finiteNumber(mouthY, 0);
  const requestedY = finiteNumber(targetY, startY);
  const maxVerticalAdjust = Math.max(0, finiteNumber(options.maxVerticalAdjust, 48));
  const deltaY = Math.max(-maxVerticalAdjust, Math.min(maxVerticalAdjust, requestedY - startY));
  const laneY = startY + deltaY;
  const riseMs = Math.abs(deltaY) < 1
    ? 0
    : Math.max(40, finiteNumber(options.riseMs, 120));
  return {
    startY,
    laneY,
    riseMs,
    velocityY: riseMs > 0 ? deltaY / (riseMs / 1000) : 0,
  };
}

/**
 * Launches one toxic glob. Volley cadence belongs to GameScene so every shot
 * uses scene time and therefore pauses with the rest of gameplay.
 */
export function launchToxicProjectile(scene, group, {
  x,
  y,
  direction = 1,
  speed = 275,
  damage = 1,
  lifetimeMs = 2100,
  sourceId = null,
  targetY = y,
  maxVerticalAdjust = 48,
  riseMs = 120,
} = {}) {
  const facing = direction < 0 ? -1 : 1;
  const lane = resolveToxicProjectileLane(y, targetY, { maxVerticalAdjust, riseMs });
  const projectile = scene.physics.add.image(x, lane.startY, 'enemy_toxic_glob');
  group.add(projectile);
  projectile
    .setDepth(12)
    .setDataEnabled()
    .setData({
      [ENEMY_PROJECTILE_FLAG]: true,
      owner: 'enemy',
      damage: Math.max(1, finiteNumber(damage, 1)),
      sourceId,
    })
    .setFlipX(facing < 0)
    .setCollideWorldBounds(false)
    .setVelocity(
      Math.max(1, finiteNumber(speed, 275)) * facing,
      lane.velocityY,
    );
  projectile.body.allowGravity = false;
  projectile.body.setSize(18, 10, true);

  const riseTimer = lane.riseMs > 0
    ? scene.time.delayedCall(lane.riseMs, () => {
      if (!projectile.active) return;
      projectile.setY(lane.laneY).setVelocityY(0);
      projectile.body.updateFromGameObject();
    })
    : null;

  const trail = scene.add.particles(x, lane.startY, 'particle_dot', {
    follow: projectile,
    lifespan: 220,
    frequency: 62,
    quantity: 1,
    scale: { start: 0.9, end: 0 },
    alpha: { start: 0.76, end: 0 },
    tint: [0x9ae84c, 0xffe36e, 0x55c93d],
  }).setDepth(11);

  const timer = scene.time.delayedCall(Math.max(120, finiteNumber(lifetimeMs, 2100)), () => {
    if (projectile.active) projectile.destroy();
  });
  projectile.once('destroy', () => {
    if (timer && !timer.hasDispatched) timer.remove(false);
    if (riseTimer && !riseTimer.hasDispatched) riseTimer.remove(false);
    if (!trail?.active) return;
    trail.stopFollow();
    trail.explode(3, projectile.x, projectile.y);
    scene.time.delayedCall(220, () => trail?.destroy());
  });
  return projectile;
}

/** Creates a short-lived world-space melee window attached to its attacker. */
export function createEnemyMeleeAttack(enemy, spec = {}, now = 0) {
  const durationMs = Math.max(40, finiteNumber(spec.durationMs, 180));
  return {
    enemy,
    kind: spec.kind ?? 'melee',
    direction: spec.direction < 0 ? -1 : 1,
    reach: Math.max(8, finiteNumber(spec.reach, 88)),
    height: Math.max(8, finiteNumber(spec.height, 30)),
    offsetY: finiteNumber(spec.offsetY, -4),
    damage: Math.max(1, finiteNumber(spec.damage, enemy?.config?.damage ?? 1)),
    startedAt: finiteNumber(now, 0),
    expiresAt: finiteNumber(now, 0) + durationMs,
    connected: false,
  };
}

/** A reaction or state transition cancels the matching active strike. */
export function isEnemyMeleeAttackActive(attack) {
  const enemy = attack?.enemy;
  if (!enemy || enemy.dead || !enemy.sprite?.active) return false;
  if (attack.kind === 'spear') return enemy.state === 'SPEAR_ATTACK';
  if (attack.kind === 'branch') return ['PUNCH_LEFT', 'PUNCH_RIGHT'].includes(enemy.state);
  return true;
}

/** Returns the active strike rectangle from the attacker's current position. */
export function getEnemyMeleeBounds(attack) {
  const sprite = attack?.enemy?.sprite;
  const body = sprite?.body;
  if (!sprite?.active || !body?.enable) return null;
  const direction = attack.direction < 0 ? -1 : 1;
  const bodyCenterX = finiteNumber(body.center?.x, sprite.x);
  const bodyCenterY = finiteNumber(body.center?.y, sprite.y);
  const halfBody = Math.max(0, finiteNumber(body.width, 0) / 2);
  const centerX = bodyCenterX + direction * (halfBody + attack.reach / 2 - 4);
  const centerY = bodyCenterY + attack.offsetY;
  return {
    x: centerX - attack.reach / 2,
    y: centerY - attack.height / 2,
    width: attack.reach,
    height: attack.height,
  };
}

export function rectanglesOverlap(first, second) {
  if (!first || !second) return false;
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

export function getArcadeBodyBounds(body) {
  if (!body?.enable) return null;
  return {
    x: finiteNumber(body.x, 0),
    y: finiteNumber(body.y, 0),
    width: Math.max(0, finiteNumber(body.width, 0)),
    height: Math.max(0, finiteNumber(body.height, 0)),
  };
}
