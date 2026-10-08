import assert from 'node:assert/strict';
import test from 'node:test';

import gameData from '../src/data/game-data.json' with { type: 'json' };
import babilandia from '../src/data/levels/babilandia.json' with { type: 'json' };
import {
  approach,
  deriveJumpPhysics,
  getPlayerGravity,
  stepHorizontalVelocity,
} from '../src/game/playerMovement.js';

const tuning = gameData.player.movement;
const PLAYER_HEIGHT = gameData.player.hitbox.height;

function simulateHorizontal({ seconds, hz, axis, grounded = true, velocityX = 0 }) {
  let vx = velocityX;
  let x = 0;
  const dt = 1 / hz;
  for (let step = 0; step < Math.round(seconds * hz); step += 1) {
    vx = stepHorizontalVelocity({ velocityX: vx, axis, grounded, dtSeconds: dt, tuning });
    x += vx * dt;
  }
  return { vx, x };
}

function simulateJump({ hz, holdSeconds = Infinity }) {
  const { launchVelocity } = deriveJumpPhysics(tuning);
  const dt = 1 / hz;
  let vy = -launchVelocity;
  let height = 0;
  let maxHeight = 0;
  let time = 0;
  let held = true;
  while (time < 3) {
    if (time >= holdSeconds) held = false;
    if (vy >= 0) held = false;
    vy = Math.min(tuning.maxFallSpeed, vy + getPlayerGravity({ velocityY: vy, jumpHeld: held, tuning }) * dt);
    height -= vy * dt;
    time += dt;
    maxHeight = Math.max(maxHeight, height);
    if (height <= 0 && time > dt) break;
  }
  return { maxHeight, airtime: time };
}

test('approach never overshoots its target', () => {
  assert.equal(approach(0, 10, 4), 4);
  assert.equal(approach(9, 10, 4), 10);
  assert.equal(approach(-3, 0, 10), 0);
});

test('the authored jump converts into the documented launch velocity', () => {
  const { launchVelocity, riseGravity } = deriveJumpPhysics(tuning);
  assert.equal(Math.round((launchVelocity ** 2) / (2 * riseGravity)), tuning.jumpHeight);
  assert.ok(Math.abs(launchVelocity / riseGravity - tuning.jumpTimeToApex) < 1e-9);
});

test('ground movement reaches top speed quickly and stops without skidding', () => {
  const run = simulateHorizontal({ seconds: 0.2, hz: 60, axis: 1 });
  assert.equal(run.vx, tuning.maxRunSpeed);
  const stop = simulateHorizontal({ seconds: 0.15, hz: 60, axis: 0, velocityX: tuning.maxRunSpeed });
  assert.equal(stop.vx, 0);
  assert.ok(stop.x < 24, `stopping slid ${stop.x.toFixed(1)}px`);
});

test('reversing direction uses the stronger turn rate', () => {
  const turn = stepHorizontalVelocity({ velocityX: 300, axis: -1, grounded: true, dtSeconds: 0.01, tuning });
  const accelerate = stepHorizontalVelocity({ velocityX: 0, axis: 1, grounded: true, dtSeconds: 0.01, tuning });
  assert.ok(300 - turn > accelerate, 'turning must change velocity faster than starting from rest');
});

test('the air keeps more momentum than the ground when input is released', () => {
  const ground = stepHorizontalVelocity({ velocityX: 300, axis: 0, grounded: true, dtSeconds: 0.05, tuning });
  const air = stepHorizontalVelocity({ velocityX: 300, axis: 0, grounded: false, dtSeconds: 0.05, tuning });
  assert.ok(air > ground);
});

test('an impulse above max speed bleeds off instead of snapping', () => {
  const next = stepHorizontalVelocity({ velocityX: 600, axis: 1, grounded: false, dtSeconds: 1 / 60, tuning });
  assert.ok(next < 600 && next > tuning.maxRunSpeed);
});

test('movement and jumps are independent from the display refresh rate', () => {
  for (const axis of [1, 0]) {
    const at60 = simulateHorizontal({ seconds: 0.5, hz: 60, axis, velocityX: axis ? 0 : 320 });
    const at144 = simulateHorizontal({ seconds: 0.5, hz: 144, axis, velocityX: axis ? 0 : 320 });
    assert.ok(Math.abs(at60.x - at144.x) < 4, `distance differs: ${at60.x} vs ${at144.x}`);
  }
  const jump60 = simulateJump({ hz: 60 });
  const jump144 = simulateJump({ hz: 144 });
  assert.ok(Math.abs(jump60.maxHeight - jump144.maxHeight) < 4);
  const tap60 = simulateJump({ hz: 60, holdSeconds: 0.1 });
  const tap144 = simulateJump({ hz: 144, holdSeconds: 0.1 });
  assert.ok(Math.abs(tap60.maxHeight - tap144.maxHeight) < 4);
});

test('releasing jump early gives a clearly shorter hop and falling is heavier than rising', () => {
  const full = simulateJump({ hz: 120 });
  const tap = simulateJump({ hz: 120, holdSeconds: 0.05 });
  assert.ok(tap.maxHeight < full.maxHeight * 0.55, `tap ${tap.maxHeight} vs full ${full.maxHeight}`);
  assert.ok(full.maxHeight >= tuning.jumpHeight * 0.95);
  const rise = getPlayerGravity({ velocityY: -300, jumpHeld: true, tuning });
  const fall = getPlayerGravity({ velocityY: 300, jumpHeld: false, tuning });
  const cut = getPlayerGravity({ velocityY: -300, jumpHeld: false, tuning });
  assert.ok(fall > rise && cut > rise);
});

function surfaceTop(platform) {
  return platform.y - platform.height / 2;
}

test('every elevated Babilandia platform is reachable with the authored jump', () => {
  const { maxHeight, airtime } = simulateJump({ hz: 120 });
  const maxGap = tuning.maxRunSpeed * airtime * 0.75;
  const reachable = babilandia.platforms.filter((platform) => platform.kind === 'ground');
  const pending = babilandia.platforms.filter((platform) => platform.kind === 'platform');
  let progress = true;
  while (pending.length && progress) {
    progress = false;
    for (const platform of [...pending]) {
      const left = platform.x - platform.width / 2;
      const right = platform.x + platform.width / 2;
      const launch = reachable.find((from) => {
        const rise = surfaceTop(from) - surfaceTop(platform);
        const fromLeft = from.x - from.width / 2;
        const fromRight = from.x + from.width / 2;
        const gap = Math.max(0, left - fromRight, fromLeft - right);
        // Keep a 10% height margin: a platform at the very apex is not fair.
        return rise > 0 && rise <= maxHeight * 0.9 && gap <= maxGap;
      });
      if (launch) {
        reachable.push(platform);
        pending.splice(pending.indexOf(platform), 1);
        progress = true;
      }
    }
  }
  assert.deepEqual(pending.map((platform) => platform.x), [], 'unreachable platforms');
});

test('placed Babicoins have unique ids and float within reach above a surface', () => {
  const { maxHeight } = simulateJump({ hz: 120 });
  const ids = new Set();
  assert.ok(babilandia.coins.length > 0);
  for (const coin of babilandia.coins) {
    assert.equal(ids.has(coin.id), false, `duplicate coin id ${coin.id}`);
    ids.add(coin.id);
    const below = babilandia.platforms
      .filter((platform) => Math.abs(coin.x - platform.x) <= platform.width / 2 + 120)
      .map(surfaceTop)
      .filter((top) => top >= coin.y);
    assert.ok(below.length, `${coin.id} has no surface underneath`);
    const nearest = Math.min(...below);
    // The Babito's head reaches surface - jump height - body height.
    assert.ok(nearest - coin.y <= maxHeight + PLAYER_HEIGHT, `${coin.id} is out of reach`);
  }
});
