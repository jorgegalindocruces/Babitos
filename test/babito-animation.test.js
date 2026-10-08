import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BABITO_ANIMATION_CLIPS,
  BABITO_ANIMATION_COLUMNS,
  BABITO_ANIMATION_FRAME_COUNT,
  BABITO_FRAME_POSES,
  getBabitoAnimationDurationMs,
  getBabitoAnimationPose,
  sampleBabitoAnimationFrame,
  sampleBabitoAnimationPose,
  selectBabitoLocomotionState,
} from '../src/game/BabitoAnimations.js';
import {
  BABITO_AUTHORED_ART_BOUNDS,
  BABITO_RENDER_SIZE,
  BABITO_SPRING_HAND_RADIUS,
  BABITO_TEXTURE_SIZE,
  getBabitoSpringHandCenterX,
  getBabitoTransformedBounds,
} from '../src/game/createTextures.js';

const EXPECTED_CLIPS = Object.freeze({
  idle: { start: 0, frameCount: 6, fps: 6, loop: true },
  walk: { start: 6, frameCount: 8, fps: 10, loop: true },
  run: { start: 14, frameCount: 8, fps: 14, loop: true },
  jump: { start: 22, frameCount: 6, fps: 12, loop: false },
  fall: { start: 28, frameCount: 6, fps: 10, loop: true },
  attack: { start: 34, frameCount: 6, fps: 16, loop: false },
  hurt: { start: 40, frameCount: 5, fps: 14, loop: false },
  dead: { start: 45, frameCount: 6, fps: 8, loop: false },
});

test('Babito exposes eight distinct sequential clips on an eight-column atlas', () => {
  assert.equal(BABITO_ANIMATION_COLUMNS, 8);
  assert.deepEqual(BABITO_ANIMATION_CLIPS, EXPECTED_CLIPS);
  assert.equal(BABITO_ANIMATION_FRAME_COUNT, 51);

  const coveredFrames = Object.values(BABITO_ANIMATION_CLIPS).flatMap((clip) => (
    Array.from({ length: clip.frameCount }, (_, offset) => clip.start + offset)
  ));
  assert.deepEqual(
    coveredFrames,
    Array.from({ length: BABITO_ANIMATION_FRAME_COUNT }, (_, index) => index),
  );
  assert.notEqual(BABITO_ANIMATION_CLIPS.walk.start, BABITO_ANIMATION_CLIPS.run.start);
});

test('movement loops while action clips hold their authored final frame', () => {
  assert.equal(sampleBabitoAnimationFrame('idle', 0), 0);
  assert.equal(sampleBabitoAnimationFrame('idle', 1000), 0);
  assert.equal(sampleBabitoAnimationFrame('walk', 100), 7);
  assert.equal(sampleBabitoAnimationFrame('walk', 100, 2), 8);
  assert.equal(sampleBabitoAnimationFrame('run', 1000), 20);
  assert.equal(sampleBabitoAnimationFrame('fall', 600), 28);

  assert.equal(sampleBabitoAnimationFrame('jump', 9999), 27);
  assert.equal(sampleBabitoAnimationFrame('attack', 9999), 39);
  assert.equal(sampleBabitoAnimationFrame('hurt', 9999), 44);
  assert.equal(sampleBabitoAnimationFrame('dead', 9999), 50);
});

test('duration helper follows clip timing and safe speed multipliers', () => {
  assert.equal(getBabitoAnimationDurationMs('idle'), 1000);
  assert.equal(getBabitoAnimationDurationMs('walk'), 800);
  assert.equal(getBabitoAnimationDurationMs('run'), 572);
  assert.equal(getBabitoAnimationDurationMs('jump'), 500);
  assert.equal(getBabitoAnimationDurationMs('fall'), 600);
  assert.equal(getBabitoAnimationDurationMs('attack'), 375);
  assert.equal(getBabitoAnimationDurationMs('hurt'), 358);
  assert.equal(getBabitoAnimationDurationMs('dead'), 750);
  assert.equal(getBabitoAnimationDurationMs('walk', 2), 400);
  assert.equal(getBabitoAnimationDurationMs('walk', 0), 800);
});

test('each atlas frame has a complete immutable descriptive pose', () => {
  assert.equal(BABITO_FRAME_POSES.length, BABITO_ANIMATION_FRAME_COUNT);

  for (const [state, clip] of Object.entries(BABITO_ANIMATION_CLIPS)) {
    const poses = BABITO_FRAME_POSES.slice(clip.start, clip.start + clip.frameCount);
    assert.equal(poses.length, clip.frameCount);

    const visualSignatures = new Set();
    for (const [localFrame, pose] of poses.entries()) {
      assert.equal(pose.state, state);
      assert.equal(pose.frame, clip.start + localFrame);
      assert.equal(pose.localFrame, localFrame);
      assert.ok(Number.isFinite(pose.scaleX) && pose.scaleX > 0);
      assert.ok(Number.isFinite(pose.scaleY) && pose.scaleY > 0);
      assert.ok(Number.isFinite(pose.offset.x));
      assert.ok(Number.isFinite(pose.offset.y));
      assert.ok(Number.isFinite(pose.lean));
      assert.equal(typeof pose.feet.stance, 'string');
      assert.equal(typeof pose.arms.left, 'string');
      assert.equal(typeof pose.arms.right, 'string');
      assert.equal(typeof pose.expression, 'string');
      assert.ok(Object.isFrozen(pose));
      assert.ok(Object.isFrozen(pose.offset));
      assert.ok(Object.isFrozen(pose.feet));
      assert.ok(Object.isFrozen(pose.arms));

      visualSignatures.add(JSON.stringify({
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
        offset: pose.offset,
        lean: pose.lean,
        feet: pose.feet,
        arms: pose.arms,
        expression: pose.expression,
      }));
    }
    assert.ok(visualSignatures.size >= 3, `${state} must contain visibly different poses`);
  }

  const walk = BABITO_FRAME_POSES.slice(6, 14).map((pose) => pose.feet.stance);
  const run = BABITO_FRAME_POSES.slice(14, 22).map((pose) => pose.feet.stance);
  assert.notDeepEqual(run, walk, 'run must not reuse the walk poses');
});

test('pose lookup and sampling resolve the same global frame', () => {
  const sampled = sampleBabitoAnimationPose('attack', 190);
  assert.strictEqual(sampled, getBabitoAnimationPose(sampled.frame));
  assert.equal(sampled.state, 'attack');
  assert.equal(sampled.frame, sampleBabitoAnimationFrame('attack', 190));
});

test('invalid state, time, speed and pose indices safely fall back to idle', () => {
  assert.equal(sampleBabitoAnimationFrame('unknown', -20), 0);
  assert.equal(sampleBabitoAnimationFrame(null, Number.NaN), 0);
  assert.equal(sampleBabitoAnimationFrame('__proto__', 0, Number.POSITIVE_INFINITY), 0);
  assert.equal(getBabitoAnimationDurationMs('unknown'), 1000);
  assert.strictEqual(getBabitoAnimationPose(-1), BABITO_FRAME_POSES[0]);
  assert.strictEqual(getBabitoAnimationPose(1.5), BABITO_FRAME_POSES[0]);
  assert.strictEqual(getBabitoAnimationPose(Number.NaN), BABITO_FRAME_POSES[0]);
});

test('horizontal speed selects idle, walk and a genuinely distinct run state', () => {
  assert.equal(selectBabitoLocomotionState(0), 'idle');
  assert.equal(selectBabitoLocomotionState(-20), 'idle');
  assert.equal(selectBabitoLocomotionState(21), 'walk');
  assert.equal(selectBabitoLocomotionState(-189), 'walk');
  assert.equal(selectBabitoLocomotionState(190), 'run');
  assert.equal(selectBabitoLocomotionState(-360), 'run');
  assert.equal(selectBabitoLocomotionState(Number.NaN), 'idle');
  assert.equal(selectBabitoLocomotionState(80, { idleMax: 10, runMin: 70 }), 'run');
  assert.equal(selectBabitoLocomotionState(80, null), 'walk');
});

test('the richer layered renderer stays crisp and keeps spring hands inside the authored art', () => {
  assert.equal(BABITO_TEXTURE_SIZE, 64);
  assert.equal(BABITO_RENDER_SIZE, 64);

  const attackCenters = Array.from(
    { length: BABITO_ANIMATION_CLIPS.attack.frameCount },
    (_, phase) => getBabitoSpringHandCenterX('attack', phase),
  );
  assert.deepEqual(attackCenters, [39, 41, 43, 44, 42, 40]);
  assert.ok(Math.max(...attackCenters) + BABITO_SPRING_HAND_RADIUS <= 47);
  assert.equal(getBabitoSpringHandCenterX('walk', 7), 42);
  assert.equal(getBabitoSpringHandCenterX('attack', 2.8), 43);
  assert.equal(getBabitoSpringHandCenterX('attack', Number.NaN), 39);

  for (const pose of BABITO_FRAME_POSES) {
    const bounds = getBabitoTransformedBounds(pose, BABITO_AUTHORED_ART_BOUNDS);
    assert.ok(bounds.minX >= 0, `${pose.state}:${pose.localFrame} clips on the left`);
    assert.ok(bounds.maxX <= BABITO_TEXTURE_SIZE, `${pose.state}:${pose.localFrame} clips on the right`);
    assert.ok(bounds.minY >= 0, `${pose.state}:${pose.localFrame} clips on the top`);
    assert.ok(bounds.maxY <= BABITO_TEXTURE_SIZE, `${pose.state}:${pose.localFrame} clips on the bottom`);
  }
});
