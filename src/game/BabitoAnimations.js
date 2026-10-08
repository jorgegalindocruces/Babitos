/**
 * Pure animation contract shared by every composable Babito layer.
 *
 * The module deliberately has no Phaser dependency: texture generation,
 * controllers and tests can all consume the same clip timings and poses.
 */

export const BABITO_ANIMATION_COLUMNS = 8;

const CLIP_DEFINITIONS = Object.freeze([
  ['idle', 6, 6, true],
  ['walk', 8, 10, true],
  ['run', 8, 14, true],
  ['jump', 6, 12, false],
  ['fall', 6, 10, true],
  ['attack', 6, 16, false],
  ['hurt', 5, 14, false],
  ['dead', 6, 8, false],
]);

let nextFrame = 0;
export const BABITO_ANIMATION_CLIPS = Object.freeze(Object.fromEntries(
  CLIP_DEFINITIONS.map(([state, frameCount, fps, loop]) => {
    const clip = Object.freeze({ start: nextFrame, frameCount, fps, loop });
    nextFrame += frameCount;
    return [state, clip];
  }),
));

export const BABITO_ANIMATION_FRAME_COUNT = nextFrame;

function freezePose({
  scaleX = 1,
  scaleY = 1,
  offset = [0, 0],
  lean = 0,
  feet = [0, 0, 0, 0, 'planted'],
  arms = ['rest', 'rest'],
  expression = 'neutral',
}) {
  return Object.freeze({
    scaleX,
    scaleY,
    offset: Object.freeze({ x: offset[0], y: offset[1] }),
    lean,
    feet: Object.freeze({
      left: Object.freeze({ x: feet[0], y: feet[1] }),
      right: Object.freeze({ x: feet[2], y: feet[3] }),
      stance: feet[4],
    }),
    arms: Object.freeze({ left: arms[0], right: arms[1] }),
    expression,
  });
}

const POSE_SEQUENCES = Object.freeze({
  idle: Object.freeze([
    freezePose({ expression: 'smile' }),
    freezePose({ scaleX: 1.01, scaleY: 0.99, offset: [0, -1], arms: ['soft-out', 'rest'], expression: 'smile' }),
    freezePose({ scaleX: 0.99, scaleY: 1.02, offset: [0, -2], arms: ['soft-out', 'soft-out'], expression: 'smile' }),
    freezePose({ scaleX: 0.99, scaleY: 1.02, offset: [0, -2], arms: ['rest', 'soft-out'], expression: 'blink' }),
    freezePose({ scaleX: 1.01, scaleY: 0.99, offset: [0, -1], arms: ['rest', 'soft-out'], expression: 'smile' }),
    freezePose({ expression: 'smile' }),
  ]),
  walk: Object.freeze([
    freezePose({ offset: [-1, 0], lean: -2, feet: [-3, 0, 2, 0, 'left-contact'], arms: ['forward', 'back'], expression: 'smile' }),
    freezePose({ scaleX: 1.02, scaleY: 0.98, offset: [-1, 1], lean: -1, feet: [-2, 0, 1, 1, 'left-down'], arms: ['forward', 'back'], expression: 'smile' }),
    freezePose({ offset: [0, -1], feet: [-1, 0, 0, -1, 'right-pass'], arms: ['rest', 'rest'], expression: 'smile' }),
    freezePose({ scaleX: 0.99, scaleY: 1.01, offset: [1, -1], lean: 1, feet: [1, 0, -2, -1, 'right-lift'], arms: ['back', 'forward'], expression: 'focus' }),
    freezePose({ offset: [1, 0], lean: 2, feet: [2, 0, -3, 0, 'right-contact'], arms: ['back', 'forward'], expression: 'smile' }),
    freezePose({ scaleX: 1.02, scaleY: 0.98, offset: [1, 1], lean: 1, feet: [1, 1, -2, 0, 'right-down'], arms: ['back', 'forward'], expression: 'smile' }),
    freezePose({ offset: [0, -1], feet: [0, -1, -1, 0, 'left-pass'], arms: ['rest', 'rest'], expression: 'smile' }),
    freezePose({ scaleX: 0.99, scaleY: 1.01, offset: [-1, -1], lean: -1, feet: [-2, -1, 1, 0, 'left-lift'], arms: ['forward', 'back'], expression: 'focus' }),
  ]),
  run: Object.freeze([
    freezePose({ scaleX: 1.05, scaleY: 0.95, offset: [-2, 1], lean: -5, feet: [-4, 0, 3, -1, 'left-strike'], arms: ['drive-forward', 'drive-back'], expression: 'focus' }),
    freezePose({ scaleX: 1.02, scaleY: 0.98, offset: [-1, -1], lean: -4, feet: [-3, 0, 1, -2, 'left-drive'], arms: ['drive-forward', 'drive-back'], expression: 'focus' }),
    freezePose({ scaleX: 0.96, scaleY: 1.05, offset: [0, -3], lean: -2, feet: [-1, -2, 0, -2, 'airborne-forward'], arms: ['down', 'down'], expression: 'focus' }),
    freezePose({ scaleX: 0.98, scaleY: 1.02, offset: [2, -1], lean: 3, feet: [2, -1, -3, 0, 'right-reach'], arms: ['drive-back', 'drive-forward'], expression: 'determined' }),
    freezePose({ scaleX: 1.05, scaleY: 0.95, offset: [2, 1], lean: 5, feet: [3, -1, -4, 0, 'right-strike'], arms: ['drive-back', 'drive-forward'], expression: 'focus' }),
    freezePose({ scaleX: 1.02, scaleY: 0.98, offset: [1, -1], lean: 4, feet: [1, -2, -3, 0, 'right-drive'], arms: ['drive-back', 'drive-forward'], expression: 'focus' }),
    freezePose({ scaleX: 0.96, scaleY: 1.05, offset: [0, -3], lean: 2, feet: [0, -2, -1, -2, 'airborne-back'], arms: ['down', 'down'], expression: 'focus' }),
    freezePose({ scaleX: 0.98, scaleY: 1.02, offset: [-2, -1], lean: -3, feet: [-3, 0, 2, -1, 'left-reach'], arms: ['drive-forward', 'drive-back'], expression: 'determined' }),
  ]),
  jump: Object.freeze([
    freezePose({ scaleX: 1.09, scaleY: 0.88, offset: [0, 2], feet: [-1, 1, 1, 1, 'crouch'], arms: ['back', 'back'], expression: 'focus' }),
    freezePose({ scaleX: 0.94, scaleY: 1.09, offset: [0, -1], lean: -2, feet: [-1, 0, 1, 0, 'launch'], arms: ['drive-up', 'drive-up'], expression: 'determined' }),
    freezePose({ scaleX: 0.96, scaleY: 1.06, offset: [0, -3], lean: -3, feet: [-1, -2, 1, -2, 'tucked-low'], arms: ['up', 'up'], expression: 'determined' }),
    freezePose({ offset: [0, -5], lean: -2, feet: [-2, -3, 2, -3, 'tucked'], arms: ['up', 'up'], expression: 'smile' }),
    freezePose({ scaleX: 1.03, scaleY: 0.97, offset: [0, -6], feet: [-2, -2, 2, -2, 'apex-open'], arms: ['wide', 'wide'], expression: 'smile' }),
    freezePose({ scaleX: 1.05, scaleY: 0.95, offset: [0, -5], lean: 1, feet: [-1, -1, 1, -1, 'apex-release'], arms: ['wide', 'wide'], expression: 'surprised' }),
  ]),
  fall: Object.freeze([
    freezePose({ scaleX: 1.04, scaleY: 0.96, offset: [0, -3], lean: 2, feet: [-1, -2, 1, -2, 'release'], arms: ['wide', 'wide'], expression: 'surprised' }),
    freezePose({ offset: [0, -2], lean: 3, feet: [-2, -1, 2, -1, 'floating'], arms: ['high', 'wide'], expression: 'focus' }),
    freezePose({ scaleX: 0.98, scaleY: 1.03, offset: [0, -1], lean: 1, feet: [-2, 0, 2, 0, 'extend'], arms: ['wide', 'high'], expression: 'focus' }),
    freezePose({ scaleX: 0.97, scaleY: 1.05, offset: [0, 0], lean: -1, feet: [-1, 1, 1, 1, 'landing-ready'], arms: ['high', 'high'], expression: 'determined' }),
    freezePose({ scaleX: 1.01, scaleY: 0.99, offset: [0, 1], lean: -2, feet: [-2, 1, 2, 1, 'braced'], arms: ['wide', 'high'], expression: 'determined' }),
    freezePose({ scaleX: 1.03, scaleY: 0.97, offset: [0, -1], lean: 1, feet: [-1, -1, 1, -1, 'flutter'], arms: ['high', 'wide'], expression: 'surprised' }),
  ]),
  attack: Object.freeze([
    freezePose({ scaleX: 1.06, scaleY: 0.95, offset: [-2, 1], lean: -5, feet: [-2, 0, 2, 0, 'brace'], arms: ['windup', 'windup'], expression: 'focus' }),
    freezePose({ scaleX: 0.98, scaleY: 1.03, offset: [-1, -1], lean: -3, feet: [-2, 0, 1, 0, 'brace-forward'], arms: ['guard', 'charge'], expression: 'attack' }),
    freezePose({ scaleX: 1.09, scaleY: 0.92, offset: [3, 0], lean: 7, feet: [-1, 0, 3, 0, 'lunge'], arms: ['counter', 'strike'], expression: 'attack' }),
    freezePose({ scaleX: 1.12, scaleY: 0.9, offset: [5, 0], lean: 9, feet: [0, 0, 4, 0, 'full-lunge'], arms: ['counter-high', 'strike-extended'], expression: 'attack' }),
    freezePose({ scaleX: 1.03, scaleY: 0.98, offset: [2, -1], lean: 3, feet: [-1, 0, 2, 0, 'recoil'], arms: ['recover', 'recover'], expression: 'determined' }),
    freezePose({ offset: [0, 0], feet: [0, 0, 0, 0, 'planted'], arms: ['rest', 'rest'], expression: 'smile' }),
  ]),
  hurt: Object.freeze([
    freezePose({ scaleX: 1.08, scaleY: 0.91, offset: [3, -1], lean: 8, feet: [-1, 0, 2, 0, 'knockback'], arms: ['flail', 'flail'], expression: 'hurt' }),
    freezePose({ scaleX: 0.94, scaleY: 1.07, offset: [-3, -2], lean: -7, feet: [-2, -1, 1, 0, 'stagger-left'], arms: ['high', 'guard'], expression: 'hurt' }),
    freezePose({ scaleX: 1.05, scaleY: 0.95, offset: [2, 1], lean: 5, feet: [1, 0, -2, 0, 'stagger-right'], arms: ['guard', 'high'], expression: 'hurt' }),
    freezePose({ scaleX: 0.98, scaleY: 1.02, offset: [-1, 0], lean: -2, feet: [-1, 0, 1, 0, 'recovering'], arms: ['guard', 'guard'], expression: 'hurt' }),
    freezePose({ scaleX: 1.01, scaleY: 0.99, offset: [0, 1], feet: [0, 0, 0, 0, 'braced'], arms: ['guard', 'guard'], expression: 'determined' }),
  ]),
  dead: Object.freeze([
    freezePose({ scaleX: 1.05, scaleY: 0.95, offset: [1, 0], lean: 5, feet: [-1, 0, 1, 0, 'unsteady'], arms: ['droop', 'droop'], expression: 'hurt' }),
    freezePose({ scaleX: 0.98, scaleY: 1.03, offset: [-1, 1], lean: -7, feet: [-2, 0, 1, 1, 'stumble'], arms: ['droop', 'flail'], expression: 'dazed' }),
    freezePose({ scaleX: 1.08, scaleY: 0.9, offset: [2, 3], lean: 14, feet: [-1, 1, 2, 1, 'collapse'], arms: ['down', 'down'], expression: 'dazed' }),
    freezePose({ scaleX: 1.16, scaleY: 0.78, offset: [3, 6], lean: 24, feet: [-2, 2, 3, 2, 'fallen'], arms: ['flat', 'flat'], expression: 'knocked-out' }),
    freezePose({ scaleX: 1.22, scaleY: 0.7, offset: [3, 8], lean: 34, feet: [-3, 3, 3, 3, 'flattened'], arms: ['flat', 'flat'], expression: 'knocked-out' }),
    freezePose({ scaleX: 1.24, scaleY: 0.68, offset: [3, 9], lean: 38, feet: [-3, 3, 3, 3, 'still'], arms: ['flat', 'flat'], expression: 'knocked-out' }),
  ]),
});

const framePoses = [];
for (const [state, clip] of Object.entries(BABITO_ANIMATION_CLIPS)) {
  const poses = POSE_SEQUENCES[state];
  if (poses.length !== clip.frameCount) {
    throw new Error(`Babito clip "${state}" has ${clip.frameCount} frames but ${poses.length} poses.`);
  }
  poses.forEach((pose, localFrame) => {
    framePoses.push(Object.freeze({
      ...pose,
      state,
      frame: clip.start + localFrame,
      localFrame,
    }));
  });
}

export const BABITO_FRAME_POSES = Object.freeze(framePoses);

function resolveState(state) {
  const normalized = typeof state === 'string' ? state.trim().toLowerCase() : '';
  return Object.hasOwn(BABITO_ANIMATION_CLIPS, normalized) ? normalized : 'idle';
}

function positiveSpeed(value) {
  const speed = Number(value);
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

/** Returns the global atlas frame for a state at the supplied elapsed time. */
export function sampleBabitoAnimationFrame(state, elapsedMs = 0, speedMultiplier = 1) {
  const clip = BABITO_ANIMATION_CLIPS[resolveState(state)];
  const elapsed = Number(elapsedMs);
  const safeElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const elapsedFrame = Math.floor(
    safeElapsed / (1000 / (clip.fps * positiveSpeed(speedMultiplier))),
  );
  const localFrame = clip.loop
    ? elapsedFrame % clip.frameCount
    : Math.min(elapsedFrame, clip.frameCount - 1);
  return clip.start + localFrame;
}

/** Looks up a pose by global atlas frame, falling back to the first idle pose. */
export function getBabitoAnimationPose(frame) {
  const index = Number(frame);
  return Number.isInteger(index) && index >= 0 && index < BABITO_FRAME_POSES.length
    ? BABITO_FRAME_POSES[index]
    : BABITO_FRAME_POSES[0];
}

/** Samples timing and pose with a single call. */
export function sampleBabitoAnimationPose(state, elapsedMs = 0, speedMultiplier = 1) {
  return getBabitoAnimationPose(
    sampleBabitoAnimationFrame(state, elapsedMs, speedMultiplier),
  );
}

/** Full one-cycle/one-shot duration, rounded up to a stable integer millisecond. */
export function getBabitoAnimationDurationMs(state, speedMultiplier = 1) {
  const clip = BABITO_ANIMATION_CLIPS[resolveState(state)];
  return Math.ceil((clip.frameCount / (clip.fps * positiveSpeed(speedMultiplier))) * 1000);
}

export const BABITO_LOCOMOTION_THRESHOLDS = Object.freeze({ idleMax: 20, runMin: 190 });

/** Selects idle, walk or run from horizontal world velocity. */
export function selectBabitoLocomotionState(velocityX = 0, options = {}) {
  const settings = options && typeof options === 'object' ? options : {};
  const idleCandidate = Number(settings.idleMax);
  const idleMax = Number.isFinite(idleCandidate) && idleCandidate >= 0
    ? idleCandidate
    : BABITO_LOCOMOTION_THRESHOLDS.idleMax;
  const runCandidate = Number(settings.runMin);
  const runMin = Number.isFinite(runCandidate) && runCandidate > idleMax
    ? runCandidate
    : Math.max(BABITO_LOCOMOTION_THRESHOLDS.runMin, idleMax + 1);
  const velocity = Number(velocityX);
  const speed = Number.isFinite(velocity) ? Math.abs(velocity) : 0;
  if (speed <= idleMax) return 'idle';
  return speed >= runMin ? 'run' : 'walk';
}
