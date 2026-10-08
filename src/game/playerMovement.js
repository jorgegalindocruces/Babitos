/**
 * Pure movement model for the Babito. PlayerController feeds it the frame
 * delta and input; nothing here touches Phaser, so the feel is unit-testable
 * and independent from the display refresh rate.
 */

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** Moves `current` toward `target` by at most `maxDelta`. */
export function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

/**
 * Converts the authored jump (height in px, seconds to apex) into the launch
 * velocity and rising gravity it implies: h = v²/2g and t = v/g.
 */
export function deriveJumpPhysics(tuning) {
  const height = Math.max(1, finite(tuning?.jumpHeight, 138));
  const timeToApex = Math.max(0.05, finite(tuning?.jumpTimeToApex, 0.4));
  const riseGravity = (2 * height) / (timeToApex * timeToApex);
  const launchVelocity = (2 * height) / timeToApex;
  return { riseGravity, launchVelocity };
}

/**
 * Horizontal velocity for one frame. Reversing direction uses the stronger
 * turn rate so the Babito never skids on ice; releasing input on the ground
 * stops quickly, while the air keeps most of its momentum.
 */
export function stepHorizontalVelocity({ velocityX = 0, axis = 0, grounded = true, dtSeconds = 0, tuning = {} }) {
  const dt = Math.max(0, Math.min(0.05, finite(dtSeconds, 0)));
  const maxSpeed = finite(tuning.maxRunSpeed, 320);
  const vx = finite(velocityX, 0);
  const direction = Math.sign(axis);

  if (direction === 0) {
    const deceleration = grounded
      ? finite(tuning.groundDeceleration, 3200)
      : finite(tuning.airDeceleration, 900);
    return approach(vx, 0, deceleration * dt);
  }

  const reversing = vx !== 0 && Math.sign(vx) !== direction;
  let rate;
  if (grounded) {
    rate = reversing ? finite(tuning.turnAcceleration, 4400) : finite(tuning.groundAcceleration, 2600);
  } else {
    rate = reversing ? finite(tuning.airTurnAcceleration, 2800) : finite(tuning.airAcceleration, 1900);
  }

  const target = direction * maxSpeed;
  // Knockback or other impulses above max speed bleed off with deceleration
  // instead of being clamped in a single frame.
  if (Math.abs(vx) > maxSpeed && Math.sign(vx) === direction) {
    const deceleration = grounded
      ? finite(tuning.groundDeceleration, 3200)
      : finite(tuning.airDeceleration, 900);
    return approach(vx, target, deceleration * dt);
  }
  return approach(vx, target, rate * dt);
}

/**
 * Total gravity the Babito should feel this frame. Rising with the button
 * held uses the authored jump arc, a released button cuts the jump smoothly,
 * the apex hangs briefly and falling is heavier than rising.
 */
export function getPlayerGravity({ velocityY = 0, jumpHeld = false, tuning = {} }) {
  const { riseGravity } = deriveJumpPhysics(tuning);
  const vy = finite(velocityY, 0);
  const apexWindow = finite(tuning.apexHangVelocity, 0);

  if (jumpHeld && apexWindow > 0 && Math.abs(vy) < apexWindow) {
    return riseGravity * finite(tuning.apexGravityMultiplier, 1);
  }
  if (vy < 0) {
    return jumpHeld ? riseGravity : riseGravity * finite(tuning.jumpCutGravityMultiplier, 2.6);
  }
  return riseGravity * finite(tuning.fallGravityMultiplier, 1.55);
}
