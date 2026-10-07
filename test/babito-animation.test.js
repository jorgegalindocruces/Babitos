import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BABITO_ANIMATION_CLIPS,
  BABITO_ANIMATION_FRAME_COUNT,
  BABITO_SPRING_HAND_RADIUS,
  BABITO_TEXTURE_SIZE,
  getBabitoSpringHandCenterX,
  sampleBabitoAnimationFrame,
} from '../src/game/createTextures.js';

test('Babito exposes every required motion as a distinct four-frame clip', () => {
  assert.deepEqual(Object.keys(BABITO_ANIMATION_CLIPS), [
    'idle',
    'walk',
    'jump',
    'fall',
    'attack',
    'hurt',
    'dead',
  ]);

  const coveredFrames = [];
  for (const clip of Object.values(BABITO_ANIMATION_CLIPS)) {
    assert.equal(clip.frameCount, 4);
    assert.ok(clip.fps >= 4);
    for (let offset = 0; offset < clip.frameCount; offset += 1) {
      coveredFrames.push(clip.start + offset);
    }
  }

  assert.deepEqual(
    coveredFrames,
    Array.from({ length: BABITO_ANIMATION_FRAME_COUNT }, (_, index) => index),
  );
});

test('Babito clips loop movement but hold the final action frame', () => {
  assert.equal(sampleBabitoAnimationFrame('idle', 0), 0);
  assert.equal(sampleBabitoAnimationFrame('idle', 250), 1);
  assert.equal(sampleBabitoAnimationFrame('idle', 1000), 0);

  assert.equal(sampleBabitoAnimationFrame('walk', 100), 5);
  assert.equal(sampleBabitoAnimationFrame('walk', 100, 2), 6);

  assert.equal(sampleBabitoAnimationFrame('attack', 9999), 19);
  assert.equal(sampleBabitoAnimationFrame('hurt', 9999), 23);
  assert.equal(sampleBabitoAnimationFrame('dead', 9999), 27);
});

test('unknown or invalid motion samples safely fall back to idle', () => {
  assert.equal(sampleBabitoAnimationFrame('unknown', -20), 0);
  assert.equal(sampleBabitoAnimationFrame(null, Number.NaN), 0);
  assert.equal(sampleBabitoAnimationFrame('__proto__', 0, Number.POSITIVE_INFINITY), 0);
});

test('spring-arm attack frames stay inside the shared 48px layer grid', () => {
  const idleX = getBabitoSpringHandCenterX('idle', 0);
  const attackXs = [0, 1, 2, 3].map((phase) => getBabitoSpringHandCenterX('attack', phase));

  assert.ok(attackXs[1] > idleX, 'attack must still visibly extend the spring arm');
  for (const centerX of [idleX, ...attackXs]) {
    assert.ok(centerX - BABITO_SPRING_HAND_RADIUS >= 0);
    assert.ok(centerX + BABITO_SPRING_HAND_RADIUS < BABITO_TEXTURE_SIZE);
  }
});
