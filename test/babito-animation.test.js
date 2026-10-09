import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BABITO_ANIMATION_CLIPS,
  BABITO_ANIMATION_COLUMNS,
  BABITO_ANIMATION_FRAME_COUNT,
  BABITO_FRAME_POSES,
  getBabitoAnimationDurationMs,
  getBabitoAnimationPose,
  resolveBabitoMotionState,
  sampleBabitoAnimationFrame,
  sampleBabitoAnimationPose,
  selectBabitoLocomotionState,
  updateBabitoQaMotionOverride,
} from '../src/game/BabitoAnimations.js';
import {
  BABITO_AUTHORED_ART_BOUNDS,
  BABITO_CANONICAL_GEOMETRY,
  BABITO_DETAIL_SCALE,
  BABITO_PALETTES,
  BABITO_RENDER_SIZE,
  BABITO_SPRING_HAND_RADIUS,
  BABITO_TEXTURE_SIZE,
  drawBabitoBody,
  getBabitoBodyScanlineWidths,
  getBabitoFootShape,
  getBabitoPoseFootBaseline,
  getBabitoSpringHandCenterX,
  getBabitoTransformedBounds,
  resolveBabitoFinPose,
} from '../src/game/createTextures.js';
import {
  BABITO_ART_BASELINE,
  BABITO_BASELINE,
  BABITO_SIZE_SCALES,
  getBabitoBaselineOffset,
} from '../src/game/BabitoPresentation.js';

const EXPECTED_CLIPS = Object.freeze({
  idle: { start: 0, frameCount: 6, fps: 6, loop: true },
  walk: { start: 6, frameCount: 8, fps: 10, loop: true },
  run: { start: 14, frameCount: 8, fps: 14, loop: true },
  jump: { start: 22, frameCount: 6, fps: 15, loop: false },
  fall: { start: 28, frameCount: 6, fps: 10, loop: true },
  land: { start: 34, frameCount: 3, fps: 16, loop: false },
  attack: { start: 37, frameCount: 6, fps: 16, loop: false },
  hurt: { start: 43, frameCount: 5, fps: 14, loop: false },
  dead: { start: 48, frameCount: 6, fps: 8, loop: false },
});

function createRasterCanvasContext(size = 48) {
  const pixels = Array.from({ length: size }, () => Array(size).fill(null));
  let fillStyle = '';
  return {
    canvas: {},
    pixels,
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value) {
      fillStyle = value;
    },
    fillRect(x, y, width, height) {
      const startX = Math.round(x);
      const startY = Math.round(y);
      for (let pixelY = startY; pixelY < startY + height; pixelY += 1) {
        for (let pixelX = startX; pixelX < startX + width; pixelX += 1) {
          if (pixels[pixelY]?.[pixelX] !== undefined) pixels[pixelY][pixelX] = fillStyle;
        }
      }
    },
  };
}

test('Babito exposes nine distinct sequential clips on an eight-column atlas', () => {
  assert.equal(BABITO_ANIMATION_COLUMNS, 8);
  assert.deepEqual(BABITO_ANIMATION_CLIPS, EXPECTED_CLIPS);
  assert.equal(BABITO_ANIMATION_FRAME_COUNT, 54);

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
  assert.equal(sampleBabitoAnimationFrame('land', 9999), 36);
  assert.equal(sampleBabitoAnimationFrame('attack', 9999), 42);
  assert.equal(sampleBabitoAnimationFrame('hurt', 9999), 47);
  assert.equal(sampleBabitoAnimationFrame('dead', 9999), 53);
});

test('duration helper follows clip timing and safe speed multipliers', () => {
  assert.equal(getBabitoAnimationDurationMs('idle'), 1000);
  assert.equal(getBabitoAnimationDurationMs('walk'), 800);
  assert.equal(getBabitoAnimationDurationMs('run'), 572);
  assert.equal(getBabitoAnimationDurationMs('jump'), 400);
  assert.equal(getBabitoAnimationDurationMs('fall'), 600);
  assert.equal(getBabitoAnimationDurationMs('land'), 188);
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

test('gameplay motion resolver preserves action priority and every traversal state', () => {
  assert.equal(resolveBabitoMotionState(), 'idle');
  assert.equal(resolveBabitoMotionState({ velocityX: 80 }), 'walk');
  assert.equal(resolveBabitoMotionState({ velocityX: -260 }), 'run');
  assert.equal(resolveBabitoMotionState({ grounded: false, velocityY: -1 }), 'jump');
  assert.equal(resolveBabitoMotionState({ jumpedThisFrame: true, velocityY: -690 }), 'jump');
  assert.equal(resolveBabitoMotionState({ grounded: false, velocityY: 0 }), 'fall');
  assert.equal(resolveBabitoMotionState({ isLanding: true }), 'land');

  assert.equal(resolveBabitoMotionState({
    isLanding: true,
    grounded: false,
    velocityY: -40,
  }), 'jump', 'airborne traversal must cancel a stale landing window');
  assert.equal(resolveBabitoMotionState({
    isAttacking: true,
    isLanding: true,
    grounded: false,
    velocityY: -40,
  }), 'attack');
  assert.equal(resolveBabitoMotionState({
    isHurt: true,
    isAttacking: true,
    grounded: false,
    velocityY: -40,
  }), 'hurt');
  assert.equal(resolveBabitoMotionState({
    isDead: true,
    isHurt: true,
    isAttacking: true,
  }), 'dead');
});

test('QA motion animates freely, freezes an explicit frame and releases on gameplay input', () => {
  const first = updateBabitoQaMotionOverride({
    state: ' attack ',
    elapsedMs: 0,
    deltaMs: 62.5,
  });
  assert.deepEqual(first, { state: 'attack', localFrame: null, elapsedMs: 62.5 });
  assert.equal(Object.isFrozen(first), true);

  const second = updateBabitoQaMotionOverride({
    state: first.state,
    localFrame: first.localFrame,
    elapsedMs: first.elapsedMs,
    deltaMs: 62.5,
  });
  assert.deepEqual(second, { state: 'attack', localFrame: null, elapsedMs: 125 });
  assert.equal(sampleBabitoAnimationFrame(second.state, second.elapsedMs), 39);

  const frozen = updateBabitoQaMotionOverride({
    state: 'land',
    localFrame: 99,
    elapsedMs: 900,
    deltaMs: 500,
  });
  assert.deepEqual(frozen, { state: 'land', localFrame: 2, elapsedMs: 125 });
  assert.equal(sampleBabitoAnimationFrame(frozen.state, frozen.elapsedMs), 36);

  assert.deepEqual(updateBabitoQaMotionOverride({
    state: 'jump',
    localFrame: 3,
    elapsedMs: 100,
    deltaMs: 16,
    hasGameplayInput: true,
  }), { state: null, localFrame: null, elapsedMs: 0 });
  assert.deepEqual(
    updateBabitoQaMotionOverride({ state: 'unknown', elapsedMs: 100, deltaMs: 16 }),
    { state: null, localFrame: null, elapsedMs: 0 },
  );
  assert.deepEqual(
    updateBabitoQaMotionOverride({ state: '__proto__', elapsedMs: 100, deltaMs: 16 }),
    { state: null, localFrame: null, elapsedMs: 0 },
  );
});

test('foot stances and arm descriptors resolve to distinct pixel silhouettes', () => {
  const pose = (state, localFrame) => {
    const clip = BABITO_ANIMATION_CLIPS[state];
    return BABITO_FRAME_POSES[clip.start + localFrame];
  };

  assert.equal(getBabitoFootShape(pose('idle', 0), 'left'), 'plant');
  assert.equal(getBabitoFootShape(pose('walk', 3), 'right'), 'lifted');
  assert.equal(getBabitoFootShape(pose('run', 0), 'left'), 'toe');
  assert.equal(getBabitoFootShape(pose('jump', 0), 'left'), 'impact');
  assert.equal(getBabitoFootShape(pose('jump', 2), 'right'), 'tucked');
  assert.equal(getBabitoFootShape(pose('fall', 0), 'left'), 'falling');
  assert.equal(getBabitoFootShape(pose('land', 1), 'right'), 'impact');
  assert.equal(getBabitoFootShape(pose('attack', 3), 'right'), 'toe');
  assert.equal(getBabitoFootShape(pose('dead', 3), 'left'), 'fallen');

  assert.equal(resolveBabitoFinPose('soft-out', -1), 'soft');
  assert.equal(resolveBabitoFinPose('drive-up', 1), 'up');
  assert.equal(resolveBabitoFinPose('strike-extended', 1), 'strike-extended');
  assert.equal(resolveBabitoFinPose('strike', 1), 'strike');
  assert.equal(resolveBabitoFinPose('charge', 1), 'forward');
  assert.equal(resolveBabitoFinPose('guard', -1), 'guard');
  assert.equal(resolveBabitoFinPose('windup', -1), 'raised');
  assert.equal(resolveBabitoFinPose('counter', -1), 'raised');
  assert.equal(resolveBabitoFinPose('counter', 1), 'guard');
  assert.equal(resolveBabitoFinPose('flail', -1), 'high');
  assert.equal(resolveBabitoFinPose('flail', 1), 'wide');
  assert.equal(resolveBabitoFinPose(null, 1), 'rest');
});

test('the richer layered renderer stays crisp and keeps extended spring hands inside each cell', () => {
  assert.equal(BABITO_TEXTURE_SIZE, 80);
  assert.equal(BABITO_RENDER_SIZE, 80);
  assert.equal(BABITO_DETAIL_SCALE, 4 / 3);

  const attackCenters = Array.from(
    { length: BABITO_ANIMATION_CLIPS.attack.frameCount },
    (_, phase) => getBabitoSpringHandCenterX('attack', phase),
  );
  assert.deepEqual(attackCenters, [41, 44, 44, 44, 43, 43]);
  const attackClip = BABITO_ANIMATION_CLIPS.attack;
  for (const pose of BABITO_FRAME_POSES.slice(
    attackClip.start,
    attackClip.start + attackClip.frameCount,
  )) {
    const springBounds = {
      ...BABITO_AUTHORED_ART_BOUNDS,
      maxX: Math.round(getBabitoSpringHandCenterX('attack', pose.localFrame) * BABITO_DETAIL_SCALE)
        + Math.round(BABITO_SPRING_HAND_RADIUS * BABITO_DETAIL_SCALE),
    };
    assert.ok(
      getBabitoTransformedBounds(pose, springBounds).maxX <= BABITO_TEXTURE_SIZE,
      `spring attack ${pose.localFrame} clips on the right`,
    );
  }
  assert.equal(getBabitoSpringHandCenterX('walk', 7), 42);
  assert.equal(getBabitoSpringHandCenterX('attack', 2.8), 44);
  assert.equal(getBabitoSpringHandCenterX('attack', Number.NaN), 41);

  for (const pose of BABITO_FRAME_POSES) {
    const bounds = getBabitoTransformedBounds(pose, BABITO_AUTHORED_ART_BOUNDS);
    assert.ok(bounds.minX >= 0, `${pose.state}:${pose.localFrame} clips on the left`);
    assert.ok(bounds.maxX <= BABITO_TEXTURE_SIZE, `${pose.state}:${pose.localFrame} clips on the right`);
    assert.ok(bounds.minY >= 0, `${pose.state}:${pose.localFrame} clips on the top`);
    assert.ok(bounds.maxY <= BABITO_TEXTURE_SIZE, `${pose.state}:${pose.localFrame} clips on the bottom`);
  }
});

test('grounded animation poses keep one exact support line', () => {
  const idleBaseline = getBabitoPoseFootBaseline(BABITO_FRAME_POSES[0]);
  for (const pose of BABITO_FRAME_POSES) {
    if (!['idle', 'walk', 'run', 'land', 'attack'].includes(pose.state)) continue;
    if (pose.feet.stance.includes('airborne')) continue;
    assert.ok(
      Math.abs(getBabitoPoseFootBaseline(pose) - idleBaseline) < 1e-9,
      `${pose.state}:${pose.localFrame} moves its supporting foot off the baseline`,
    );
  }
});

test('the base silhouette keeps the approved round Babito proportions', () => {
  const { body, normalEyes, feet, restingFin } = BABITO_CANONICAL_GEOMETRY;
  const bodyWidth = body.radiusX * 2 + 1;
  const bodyHeight = body.radiusY * 2 + 1 - body.trimmedTips * 2;
  const totalRestingWidth = (64 - restingFin.minX) - restingFin.minX + 1;

  assert.equal(bodyWidth, 47);
  assert.equal(bodyHeight, 45);
  assert.ok(bodyWidth / bodyHeight >= 1 && bodyWidth / bodyHeight <= 1.05);
  assert.ok(body.trimmedTips >= 1, 'the crown must use a flat scanline instead of a one-pixel tip');
  assert.ok(totalRestingWidth / bodyWidth <= 1.4, 'resting fins must stay compact');
  assert.deepEqual(normalEyes, { width: 4, height: 9, gap: 11 });
  assert.deepEqual(feet, { maxWidth: 13, authoredHeight: 9, exposedHeight: 5 });
  const bodyProfile = getBabitoBodyScanlineWidths();
  assert.equal(bodyProfile.length, bodyHeight);
  assert.ok(bodyProfile[0] > 1, 'the crown cannot collapse to a one-pixel spike');
  assert.equal(bodyProfile[0], bodyProfile.at(-1));
  assert.equal(Math.max(...bodyProfile), bodyWidth);
  assert.deepEqual(bodyProfile, [...bodyProfile].reverse(), 'the base body must remain symmetric');
  for (let index = 1; index <= Math.floor(bodyProfile.length / 2); index += 1) {
    assert.ok(bodyProfile[index] >= bodyProfile[index - 1], 'the upper curve must expand monotonically');
  }
  assert.deepEqual(BABITO_PALETTES.cyan, {
    main: '#7cdbf9',
    light: '#a8edff',
    shade: '#2bbfe5',
    tint: 0x7cdbf9,
  });
});

test('every palette and animation frame keeps one uninterrupted body colour', () => {
  const masksByFrame = new Map();
  const ink = '#07111e';
  const blush = '#ff7196';
  const glint = '#ffffff';

  for (const [body, palette] of Object.entries(BABITO_PALETTES)) {
    for (const pose of BABITO_FRAME_POSES) {
      const context = createRasterCanvasContext();
      drawBabitoBody(context, palette, pose);
      const pixels = context.pixels.flat();

      assert.equal(
        pixels.includes(palette.shade),
        false,
        `${body}:${pose.frame} reintroduced a darker patch that can read as underwear`,
      );

      for (let y = 31; y < context.pixels.length; y += 1) {
        for (const color of context.pixels[y]) {
          assert.ok(
            color === null || color === ink || color === palette.main,
            `${body}:${pose.frame} has a secondary tone in the belly or legs`,
          );
        }
      }

      const leftRootY = 37 + (Number(pose.feet?.left?.y) || 0);
      const leftRootX = 18 + (Number(pose.feet?.left?.x) || 0);
      const rightRootY = 37 + (Number(pose.feet?.right?.y) || 0);
      const rightRootX = 29 + (Number(pose.feet?.right?.x) || 0);
      assert.equal(
        context.pixels[leftRootY]?.[leftRootX],
        palette.main,
        `${body}:${pose.frame} closes the left foot root with an underwear-like outline`,
      );
      assert.equal(
        context.pixels[rightRootY]?.[rightRootX],
        palette.main,
        `${body}:${pose.frame} closes the right foot root with an underwear-like outline`,
      );

      const roleMask = pixels.map((color) => {
        if (color === null) return 'transparent';
        if (color === ink) return 'ink';
        if (color === blush) return 'blush';
        if (color === glint) return 'glint';
        if (color === palette.main) return 'main';
        if (color === palette.light) return 'light';
        return `unexpected:${color}`;
      });
      assert.equal(
        roleMask.some((role) => role.startsWith('unexpected:')),
        false,
        `${body}:${pose.frame} contains an undocumented body tone`,
      );

      if (!masksByFrame.has(pose.frame)) masksByFrame.set(pose.frame, roleMask.join(','));
      else assert.equal(
        roleMask.join(','),
        masksByFrame.get(pose.frame),
        `${body}:${pose.frame} must preserve the canonical tonal geometry`,
      );
    }
  }
});

test('larger Babito sizes keep integer render dimensions and one shared baseline', () => {
  assert.deepEqual(BABITO_SIZE_SCALES, {
    small: 0.8,
    normal: 1,
    large: 1.2,
  });
  assert.equal(BABITO_ART_BASELINE, 30);

  for (const scale of Object.values(BABITO_SIZE_SCALES)) {
    assert.equal(Number.isInteger(BABITO_RENDER_SIZE * scale), true);
    const offset = getBabitoBaselineOffset(scale);
    assert.ok(Math.abs(scale * (offset + BABITO_ART_BASELINE) - BABITO_BASELINE) < 1e-9);
  }
});
