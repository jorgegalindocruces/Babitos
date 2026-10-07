import assert from 'node:assert/strict';
import test from 'node:test';

import { BossAnimator } from '../src/game/BossAnimator.js';

function makeVisual() {
  return {
    active: true,
    x: 0,
    y: 0,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    setDepth() { return this; },
    setDisplaySize() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
    setAngle(angle) { this.angle = angle; return this; },
    setFlipX() { return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTexture() { return this; },
    clearTint() { return this; },
    stop() { return this; },
    destroy() { this.active = false; },
  };
}

test('purified boss visual keeps following its settling physics body', () => {
  const visual = makeVisual();
  const body = { active: true, x: 790, y: 410, alpha: 1 };
  const scene = {
    time: { now: 0 },
    add: { sprite: () => visual },
  };
  const animator = new BossAnimator(scene, body, 'boss-corrupt');

  animator.setPurified('boss-cured', 72, 72);
  body.x = 792;
  body.y = 428;
  body.alpha = 0.75;
  animator.update(100);

  assert.equal(visual.x, 792);
  assert.equal(visual.y, 428);
  assert.equal(visual.alpha, 0.75);
});

test('boss pose clock ignores wall time while gameplay time is frozen', () => {
  let gameplayTime = 240;
  const visual = makeVisual();
  const body = { active: true, x: 500, y: 400, alpha: 1 };
  const scene = {
    time: { now: 50_000 },
    getGameplayTime: () => gameplayTime,
    add: { sprite: () => visual },
  };
  const animator = new BossAnimator(scene, body, 'boss-corrupt');
  animator.setState('FIREBALL');
  animator.update();
  const frozenPose = {
    x: visual.x,
    y: visual.y,
    scaleX: visual.scaleX,
    scaleY: visual.scaleY,
    angle: visual.angle,
  };

  scene.time.now += 10_000;
  animator.update();
  assert.deepEqual({
    x: visual.x,
    y: visual.y,
    scaleX: visual.scaleX,
    scaleY: visual.scaleY,
    angle: visual.angle,
  }, frozenPose);

  gameplayTime += 140;
  animator.update();
  assert.notDeepEqual({
    x: visual.x,
    y: visual.y,
    scaleX: visual.scaleX,
    scaleY: visual.scaleY,
    angle: visual.angle,
  }, frozenPose);
});
