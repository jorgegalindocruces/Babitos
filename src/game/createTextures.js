import {
  BABITO_ANIMATION_CLIPS,
  BABITO_ANIMATION_COLUMNS,
  BABITO_ANIMATION_FRAME_COUNT,
  BABITO_FRAME_POSES,
  sampleBabitoAnimationFrame,
} from './BabitoAnimations.js';

// Phaser.Textures.FilterMode.NEAREST. Keeping this tiny module free of a
// runtime Phaser import also makes the frame contract unit-testable in Node.
const PHASER_NEAREST_FILTER = 1;

export {
  BABITO_ANIMATION_CLIPS,
  BABITO_ANIMATION_COLUMNS,
  BABITO_ANIMATION_FRAME_COUNT,
  sampleBabitoAnimationFrame,
} from './BabitoAnimations.js';

/** Native size shared by every composable Babito layer. */
export const BABITO_TEXTURE_SIZE = 64;
export const BABITO_RENDER_SIZE = 64;
const BABITO_ART_SIZE = 48;
const BABITO_ART_SCALE = 1.15;
export const BABITO_SPRING_HAND_RADIUS = 3;
export const BABITO_AUTHORED_ART_BOUNDS = Object.freeze({
  minX: 1,
  // Canvas primitives that draw through x=47 occupy the half-open edge at 48.
  maxX: 48,
  minY: 2,
  maxY: 45,
});

const BABITO_POSE_TRANSFORMS = Object.freeze({
  default: Object.freeze({ scaleX: 0.72, scaleY: 0.72, offsetX: 0.72, offsetY: 0.72, lean: 0.62 }),
  attack: Object.freeze({ scaleX: 0.55, scaleY: 0.6, offsetX: 0.25, offsetY: 0.4, lean: 0.32 }),
  hurt: Object.freeze({ scaleX: 0.55, scaleY: 0.68, offsetX: 0.35, offsetY: 0.65, lean: 0.45 }),
  // KO stays visibly flattened, but its width, rotation and fall are capped so
  // the final silhouette neither clips the atlas nor sinks into the platform.
  dead: Object.freeze({ scaleX: 0.2, scaleY: 0.72, offsetX: 0, offsetY: 0.2, lean: 0.22 }),
});

export function getBabitoSpringHandCenterX(state = 'idle', phase = 0) {
  if (state !== 'attack') return 42;
  const safePhase = Number.isFinite(Number(phase)) ? Math.trunc(Number(phase)) : 0;
  return [39, 41, 43, 44, 42, 40][Math.max(0, Math.min(5, safePhase))];
}

function getBabitoPoseTransform(pose = {}) {
  const profile = BABITO_POSE_TRANSFORMS[pose.state] ?? BABITO_POSE_TRANSFORMS.default;
  return {
    scaleX: BABITO_ART_SCALE * (1 + (Number(pose.scaleX ?? 1) - 1) * profile.scaleX),
    scaleY: BABITO_ART_SCALE * (1 + (Number(pose.scaleY ?? 1) - 1) * profile.scaleY),
    offsetX: Number(pose.offset?.x ?? 0) * profile.offsetX,
    offsetY: Number(pose.offset?.y ?? 0) * profile.offsetY,
    rotation: (Number(pose.lean ?? 0) * profile.lean * Math.PI) / 180,
  };
}

/** Conservative atlas-space bounds used by regression tests and art tooling. */
export function getBabitoTransformedBounds(
  pose = {},
  bounds = BABITO_AUTHORED_ART_BOUNDS,
) {
  const transform = getBabitoPoseTransform(pose);
  const cosine = Math.cos(transform.rotation);
  const sine = Math.sin(transform.rotation);
  const centerX = BABITO_TEXTURE_SIZE / 2 + transform.offsetX;
  const centerY = BABITO_TEXTURE_SIZE / 2 + transform.offsetY;
  const points = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.minX, bounds.maxY],
    [bounds.maxX, bounds.maxY],
  ].map(([x, y]) => {
    const localX = (x - BABITO_ART_SIZE / 2) * transform.scaleX;
    const localY = (y - BABITO_ART_SIZE / 2) * transform.scaleY;
    return {
      x: centerX + localX * cosine - localY * sine,
      y: centerY + localX * sine + localY * cosine,
    };
  });
  return Object.freeze({
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  });
}

/**
 * Color sets used by the generated bodies and by {@link BabitoAvatar} to tint
 * its neutral arm layer. The numeric `tint` value is Phaser-ready.
 */
export const BABITO_PALETTES = Object.freeze({
  cyan: Object.freeze({ main: '#35d6ee', light: '#87efff', shade: '#069fc4', tint: 0x35d6ee }),
  pink: Object.freeze({ main: '#ff7aa8', light: '#ffb7ce', shade: '#c64f7a', tint: 0xff7aa8 }),
  lime: Object.freeze({ main: '#7ee35a', light: '#b9ff8e', shade: '#43b940', tint: 0x7ee35a }),
  yellow: Object.freeze({ main: '#ffc52d', light: '#ffe978', shade: '#e18a1d', tint: 0xffc52d }),
  purple: Object.freeze({ main: '#a26be0', light: '#d9a8ff', shade: '#6c42ad', tint: 0xa26be0 }),
  cream: Object.freeze({ main: '#f4ecdc', light: '#fffdf6', shade: '#c7b9a5', tint: 0xf4ecdc }),
  orange: Object.freeze({ main: '#ff8434', light: '#ffbd67', shade: '#cf4c23', tint: 0xff8434 }),
  red: Object.freeze({ main: '#f13f55', light: '#ff8390', shade: '#ae263e', tint: 0xf13f55 }),
  teal: Object.freeze({ main: '#36d4c7', light: '#8ff7e9', shade: '#158f91', tint: 0x36d4c7 }),
  charcoal: Object.freeze({ main: '#3d4652', light: '#727e8c', shade: '#202730', tint: 0x3d4652 }),
  midnight: Object.freeze({ main: '#33445b', light: '#627793', shade: '#1c293b', tint: 0x33445b }),
});

const bodyKeys = Object.freeze(
  Object.fromEntries(Object.keys(BABITO_PALETTES).map((id) => [id, `body_${id}`])),
);

/**
 * Stable texture keys consumed by scenes and {@link BabitoAvatar}.
 * Catalog-backed cosmetics deliberately keep their catalog IDs as keys.
 */
export const TEXTURE_KEYS = Object.freeze({
  body: bodyKeys,
  eyes: Object.freeze({
    normal: 'eyes_normal',
    big: 'eyes_big',
    cute: 'eyes_cute',
    crazy: 'eyes_crazy',
  }),
  mouth: Object.freeze({
    smile: 'mouth_smile',
    open: 'mouth_open',
    cute: 'mouth_cute',
    epic: 'mouth_epic',
  }),
  arms: Object.freeze({
    default: 'arms_default',
    round: 'arms_round',
    hero: 'arms_hero',
    spring: 'arms_spring',
    raised: 'arms_raised',
    attack: 'arms_attack',
  }),
  head: Object.freeze({
    none: 'head_none',
    strawHat: 'straw_hat',
    cowboyHat: 'cowboy_hat',
    crown: 'crown',
  }),
  glasses: Object.freeze({
    none: 'glasses_none',
    sunglasses: 'sunglasses',
  }),
  neck: Object.freeze({
    none: 'neck_none',
    bowtie: 'bowtie',
    heroCape: 'hero_cape',
  }),
  enemyCome: 'enemy_come',
  enemyVuela: 'enemy_vuela',
  enemyDaVueltas: 'enemy_da_vueltas',
  bossCorrupt: 'boss_corrupt',
  bossCured: 'boss_cured',
  coin: 'coin',
  projectileFire: 'projectile_fire',
  projectileLightning: 'projectile_lightning',
  projectileRock: 'projectile_rock',
  merchantEmpanadilla: 'merchant_empanadilla',
  merchantPinguino: 'merchant_pinguino',
  powerTreeSad: 'power_tree_sad',
  tileGround: 'tile_ground',
  tilePlatform: 'tile_platform',
  tileStone: 'tile_stone',
  propFlower: 'prop_flower',
  propSign: 'prop_sign',
  propCrate: 'prop_crate',
  propSpikes: 'prop_spikes',
  checkpoint: 'checkpoint',
  portal: 'portal',
  playerHitbox: 'player_hitbox',
  particleDot: 'particle_dot',
});

const COLORS = Object.freeze({
  ink: '#07111e',
  inkSoft: '#17273a',
  white: '#fffaf0',
  blush: '#ff7196',
  navy: '#0a2946',
  cyan: '#35d9ef',
  cyanLight: '#9bf6ff',
  cyanDark: '#088eae',
  red: '#ef334f',
  redDark: '#8f1736',
  orange: '#ff7a24',
  yellow: '#ffc62e',
  yellowLight: '#fff180',
  green: '#62cf48',
  greenDark: '#258b3a',
  lime: '#9ae84c',
  purple: '#8c4bc3',
  purpleDark: '#3e215d',
  magenta: '#dc4caa',
  brown: '#8d4a2b',
  brownDark: '#4d2b24',
  tan: '#e9a850',
  cream: '#ffe3a0',
  gray: '#727b8b',
  grayLight: '#b8c0cc',
  grayDark: '#3a4350',
});

function rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

/** Draws a scanline ellipse with no antialiased vector edge. */
function ellipse(ctx, cx, cy, radiusX, radiusY, color) {
  ctx.fillStyle = color;
  const safeRadiusY = Math.max(1, radiusY);
  for (let y = -radiusY; y <= radiusY; y += 1) {
    const ratio = 1 - (y * y) / (safeRadiusY * safeRadiusY);
    const halfWidth = Math.floor(radiusX * Math.sqrt(Math.max(0, ratio)));
    ctx.fillRect(Math.round(cx - halfWidth), Math.round(cy + y), halfWidth * 2 + 1, 1);
  }
}

function outlinedEllipse(ctx, cx, cy, radiusX, radiusY, outline, fill, inset = 2) {
  ellipse(ctx, cx, cy, radiusX, radiusY, outline);
  ellipse(
    ctx,
    cx,
    cy - Math.floor(inset / 2),
    Math.max(1, radiusX - inset),
    Math.max(1, radiusY - inset),
    fill,
  );
}

function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function pixelLine(ctx, x0, y0, x1, y1, color, thickness = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const deltaX = Math.abs(endX - x);
  const stepX = x < endX ? 1 : -1;
  const deltaY = -Math.abs(endY - y);
  const stepY = y < endY ? 1 : -1;
  let error = deltaX + deltaY;
  const offset = Math.floor(thickness / 2);

  while (true) {
    rect(ctx, x - offset, y - offset, thickness, thickness, color);
    if (x === endX && y === endY) break;
    const doubled = error * 2;
    if (doubled >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubled <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

function triangle(ctx, centerX, baseY, halfWidth, height, color, direction = 'up') {
  ctx.fillStyle = color;
  for (let row = 0; row < height; row += 1) {
    // `baseY` is always the wide edge; rows converge on the distant tip.
    const progress = 1 - row / Math.max(1, height - 1);
    const width = Math.max(1, Math.round(halfWidth * 2 * progress));
    const y = direction === 'up' ? baseY - row : baseY + row;
    ctx.fillRect(Math.round(centerX - width / 2), Math.round(y), width, 1);
  }
}

function sparkle(ctx, x, y, color = COLORS.yellowLight) {
  rect(ctx, x, y - 3, 1, 7, color);
  rect(ctx, x - 3, y, 7, 1, color);
  rect(ctx, x - 1, y - 1, 3, 3, COLORS.white);
}

function drawBabitoBody(ctx, palette, pose = {}) {
  const leftFootX = Number(pose.feet?.left?.x) || 0;
  const rightFootX = Number(pose.feet?.right?.x) || 0;
  const leftFootY = Number(pose.feet?.left?.y) || 0;
  const rightFootY = Number(pose.feet?.right?.y) || 0;
  // Feet are authored independently so contact, passing and airborne poses
  // change the silhouette instead of sliding an unchanged body over the floor.
  rect(ctx, 12 + leftFootX, 35 + leftFootY, 12, 7, COLORS.ink);
  rect(ctx, 27 + rightFootX, 35 + rightFootY, 10, 7, COLORS.ink);
  rect(ctx, 14 + leftFootX, 35 + leftFootY, 9, 4, palette.shade);
  rect(ctx, 28 + rightFootX, 35 + rightFootY, 8, 4, palette.shade);
  rect(ctx, 13 + leftFootX, 39 + leftFootY, 11, 2, palette.main);
  rect(ctx, 27 + rightFootX, 39 + rightFootY, 10, 2, palette.main);

  outlinedEllipse(ctx, 24, 25, 17, 15, COLORS.ink, palette.main, 2);
  // A broader stepped highlight and a two-level lower shade match the richer
  // volume used by COME/VUELA/DA VUELTAS without flattening custom colours.
  rect(ctx, 13, 14, 9, 2, palette.light);
  rect(ctx, 11, 17, 4, 8, palette.light);
  rect(ctx, 14, 16, 4, 2, '#ffffff');
  rect(ctx, 12, 34, 24, 3, palette.shade);
  rect(ctx, 16, 37, 17, 2, palette.shade);
  rect(ctx, 34, 22, 3, 10, palette.shade);
  rect(ctx, 13, 27, 4, 3, COLORS.blush);
  rect(ctx, 32, 27, 4, 3, COLORS.blush);
}

function drawBabitoEyes(ctx, style, pose = {}) {
  if (pose.expression === 'blink') {
    rect(ctx, 16, 24, 7, 2, COLORS.ink);
    rect(ctx, 27, 24, 7, 2, COLORS.ink);
    return;
  }

  if (pose.expression === 'hurt' || pose.expression === 'knocked-out') {
    pixelLine(ctx, 16, 21, 22, 27, COLORS.ink, 2);
    pixelLine(ctx, 22, 21, 16, 27, COLORS.ink, 2);
    pixelLine(ctx, 28, 21, 34, 27, COLORS.ink, 2);
    pixelLine(ctx, 34, 21, 28, 27, COLORS.ink, 2);
    return;
  }

  if (pose.expression === 'dazed') {
    rect(ctx, 16, 24, 7, 2, COLORS.ink);
    rect(ctx, 27, 24, 7, 2, COLORS.ink);
    rect(ctx, 18, 22, 3, 1, COLORS.ink);
    rect(ctx, 29, 22, 3, 1, COLORS.ink);
    return;
  }

  if (pose.expression === 'surprised') {
    outlinedEllipse(ctx, 19, 23, 5, 6, COLORS.ink, COLORS.white, 1);
    outlinedEllipse(ctx, 31, 23, 5, 6, COLORS.ink, COLORS.white, 1);
    rect(ctx, 20, 22, 3, 4, COLORS.ink);
    rect(ctx, 32, 22, 3, 4, COLORS.ink);
    rect(ctx, 20, 21, 1, 1, COLORS.white);
    rect(ctx, 32, 21, 1, 1, COLORS.white);
    return;
  }

  if (['focus', 'determined', 'attack'].includes(pose.expression)) {
    const pupilOffset = pose.expression === 'attack' ? 1 : 0;
    rect(ctx, 17, 21, 6, 8, COLORS.ink);
    rect(ctx, 28, 21, 6, 8, COLORS.ink);
    rect(ctx, 19 + pupilOffset, 22, 2, 3, COLORS.white);
    rect(ctx, 30 + pupilOffset, 22, 2, 3, COLORS.white);
    pixelLine(ctx, 16, 20, 22, pose.expression === 'attack' ? 22 : 21, COLORS.ink, 2);
    pixelLine(ctx, 28, pose.expression === 'attack' ? 22 : 21, 35, 20, COLORS.ink, 2);
    return;
  }

  if (style === 'big') {
    rect(ctx, 16, 20, 7, 9, COLORS.ink);
    rect(ctx, 27, 20, 7, 9, COLORS.ink);
    rect(ctx, 18, 21, 2, 3, COLORS.white);
    rect(ctx, 29, 21, 2, 3, COLORS.white);
    return;
  }

  if (style === 'cute') {
    rect(ctx, 17, 21, 5, 6, COLORS.ink);
    rect(ctx, 28, 21, 5, 6, COLORS.ink);
    rect(ctx, 18, 21, 2, 2, COLORS.white);
    rect(ctx, 29, 21, 2, 2, COLORS.white);
    rect(ctx, 15, 20, 2, 1, COLORS.ink);
    rect(ctx, 33, 20, 2, 1, COLORS.ink);
    return;
  }

  if (style === 'crazy') {
    // Canonical star eyes: unmistakable at the creator's smallest preview.
    polygon(ctx, [[19, 18], [21, 22], [25, 22], [22, 25], [23, 29], [19, 27], [15, 29], [16, 25], [13, 22], [17, 22]], COLORS.ink);
    polygon(ctx, [[31, 18], [33, 22], [37, 22], [34, 25], [35, 29], [31, 27], [27, 29], [28, 25], [25, 22], [29, 22]], COLORS.ink);
    rect(ctx, 18, 21, 2, 2, COLORS.white);
    rect(ctx, 30, 21, 2, 2, COLORS.white);
    return;
  }

  rect(ctx, 18, 20, 4, 8, COLORS.ink);
  rect(ctx, 28, 20, 4, 8, COLORS.ink);
}

function drawBabitoMouth(ctx, style, pose = {}) {
  if (pose.expression === 'attack') {
    outlinedEllipse(ctx, 25, 31, 5, 4, COLORS.ink, '#691b3b', 1);
    rect(ctx, 22, 29, 6, 1, COLORS.white);
    return;
  }

  if (pose.expression === 'hurt') {
    pixelLine(ctx, 20, 34, 24, 31, COLORS.ink, 2);
    pixelLine(ctx, 24, 31, 30, 34, COLORS.ink, 2);
    return;
  }

  if (pose.expression === 'dazed' || pose.expression === 'knocked-out') {
    rect(ctx, 21, 32, 9, 2, COLORS.ink);
    return;
  }

  if (pose.expression === 'surprised') {
    outlinedEllipse(ctx, 25, 32, 4, 5, COLORS.ink, '#691b3b', 1);
    rect(ctx, 23, 34, 4, 1, COLORS.blush);
    return;
  }

  if (pose.expression === 'determined' || pose.expression === 'focus') {
    pixelLine(ctx, 20, 33, 25, 31, COLORS.ink, 2);
    pixelLine(ctx, 25, 31, 31, 33, COLORS.ink, 2);
    return;
  }

  if (style === 'open') {
    outlinedEllipse(ctx, 25, 31, 6, 5, COLORS.ink, '#691b3b', 1);
    rect(ctx, 22, 33, 6, 2, COLORS.blush);
    rect(ctx, 21, 28, 8, 2, COLORS.white);
    return;
  }

  if (style === 'cute') {
    // A small open smile with a clearly visible tongue, matching its label.
    rect(ctx, 20, 29, 10, 5, COLORS.ink);
    rect(ctx, 22, 32, 6, 3, COLORS.blush);
    rect(ctx, 24, 31, 4, 1, COLORS.white);
    return;
  }

  if (style === 'epic') {
    rect(ctx, 18, 29, 14, 6, COLORS.ink);
    rect(ctx, 20, 29, 10, 2, COLORS.white);
    rect(ctx, 21, 33, 8, 1, COLORS.blush);
    rect(ctx, 19, 29, 1, 2, COLORS.ink);
    rect(ctx, 30, 29, 1, 2, COLORS.ink);
    return;
  }

  // Canonical small U-shaped smile.
  rect(ctx, 21, 29, 2, 3, COLORS.ink);
  rect(ctx, 28, 29, 2, 3, COLORS.ink);
  rect(ctx, 23, 31, 5, 2, COLORS.ink);
}

function drawArm(ctx, x0, y0, x1, y1) {
  pixelLine(ctx, x0, y0, x1, y1, COLORS.ink, 6);
  pixelLine(ctx, x0, y0, x1, y1, '#ffffff', 3);
  ellipse(ctx, x1, y1, 3, 3, COLORS.ink);
  ellipse(ctx, x1, y1, 2, 2, '#ffffff');
}

function drawBabitoFin(ctx, side, pose = 'rest') {
  const mirror = (x) => (side < 0 ? x : 48 - x);
  const pointsByPose = {
    rest: [[15, 22], [8, 21], [3, 27], [7, 34], [15, 31]],
    raised: [[17, 27], [8, 22], [6, 13], [11, 10], [16, 20]],
    attack: [[15, 22], [7, 19], [1, 22], [7, 27], [15, 29]],
    down: [[15, 23], [9, 27], [7, 38], [12, 40], [17, 30]],
    wide: [[15, 23], [8, 18], [2, 16], [4, 25], [15, 31]],
    flat: [[15, 27], [9, 31], [3, 36], [9, 38], [17, 32]],
  };
  const insetByPose = {
    rest: [[14, 24], [9, 24], [6, 27], [9, 31], [14, 29]],
    raised: [[15, 25], [10, 21], [9, 15], [11, 14], [14, 21]],
    attack: [[14, 24], [8, 22], [5, 22], [8, 25], [14, 27]],
    down: [[14, 25], [11, 28], [10, 36], [12, 37], [15, 29]],
    wide: [[14, 24], [9, 21], [5, 19], [7, 24], [14, 29]],
    flat: [[14, 28], [10, 32], [7, 35], [10, 35], [15, 31]],
  };
  polygon(ctx, pointsByPose[pose].map(([x, y]) => [mirror(x), y]), COLORS.ink);
  polygon(ctx, insetByPose[pose].map(([x, y]) => [mirror(x), y]), '#ffffff');
}

function drawBabitoArms(ctx, style, framePose = {}) {
  const motion = framePose.state ?? 'idle';
  const phase = framePose.localFrame ?? 0;

  const resolveFinPose = (value, side) => {
    const descriptor = String(value ?? 'rest');
    if (descriptor.includes('flat')) return 'flat';
    if (descriptor.includes('down') || descriptor.includes('droop')) return 'down';
    if (descriptor.includes('wide') || descriptor.includes('high') || descriptor.includes('up')) return 'wide';
    if (
      descriptor.includes('strike')
      || descriptor.includes('charge')
      || descriptor.includes('forward')
    ) return 'attack';
    if (descriptor.includes('back') || descriptor.includes('guard') || descriptor.includes('windup')) {
      return 'raised';
    }
    if (descriptor.includes('flail')) return side < 0 ? 'raised' : 'wide';
    if (descriptor.includes('counter') || descriptor.includes('recover')) return 'raised';
    if (descriptor.includes('soft-out')) return 'wide';
    return 'rest';
  };

  if (style === 'spring') {
    // Keep the unmistakable zig-zag silhouette while the shared frame offsets
    // still give it the same timing as every other cosmetic arm choice.
    const handX = getBabitoSpringHandCenterX(motion, phase);
    pixelLine(ctx, 12, 27, 8, 24, COLORS.ink, 6);
    pixelLine(ctx, 8, 24, 12, 20, COLORS.ink, 6);
    pixelLine(ctx, 12, 20, 6, 16, COLORS.ink, 6);
    pixelLine(ctx, 37, 27, 41, 24, COLORS.ink, 6);
    pixelLine(ctx, 41, 24, 37, 20, COLORS.ink, 6);
    pixelLine(ctx, 37, 20, handX, 16, COLORS.ink, 6);
    pixelLine(ctx, 12, 27, 8, 24, '#ffffff', 2);
    pixelLine(ctx, 8, 24, 12, 20, '#ffffff', 2);
    pixelLine(ctx, 12, 20, 6, 16, '#ffffff', 2);
    pixelLine(ctx, 37, 27, 41, 24, '#ffffff', 2);
    pixelLine(ctx, 41, 24, 37, 20, '#ffffff', 2);
    pixelLine(ctx, 37, 20, handX, 16, '#ffffff', 2);
    ellipse(ctx, 6, 16, BABITO_SPRING_HAND_RADIUS, BABITO_SPRING_HAND_RADIUS, COLORS.ink);
    ellipse(ctx, handX, 16, BABITO_SPRING_HAND_RADIUS, BABITO_SPRING_HAND_RADIUS, COLORS.ink);
    ellipse(ctx, 6, 16, 2, 2, '#ffffff');
    ellipse(ctx, handX, 16, 2, 2, '#ffffff');
    return;
  }

  let leftPose = resolveFinPose(framePose.arms?.left, -1);
  let rightPose = resolveFinPose(framePose.arms?.right, 1);
  // Hero/raised are cosmetic silhouettes, not frozen animation poses. They
  // keep their characteristic lift while still following every action beat.
  if (style === 'raised' || style === 'hero') {
    if (leftPose === 'rest') leftPose = 'raised';
    if (rightPose === 'rest') rightPose = 'raised';
  }
  drawBabitoFin(ctx, -1, leftPose);
  drawBabitoFin(ctx, 1, rightPose);
}

function drawStrawHat(ctx) {
  rect(ctx, 10, 12, 30, 5, COLORS.ink);
  rect(ctx, 12, 11, 26, 5, COLORS.yellow);
  rect(ctx, 16, 4, 18, 10, COLORS.ink);
  rect(ctx, 18, 5, 14, 8, COLORS.yellow);
  rect(ctx, 16, 10, 18, 4, COLORS.red);
  rect(ctx, 18, 6, 6, 2, COLORS.yellowLight);
}

function drawCowboyHat(ctx) {
  rect(ctx, 8, 13, 34, 5, COLORS.ink);
  rect(ctx, 11, 12, 28, 4, '#9c5730');
  polygon(ctx, [[15, 13], [17, 4], [22, 7], [30, 5], [35, 13]], COLORS.ink);
  polygon(ctx, [[18, 12], [19, 6], [23, 9], [29, 7], [32, 12]], '#b96b36');
  rect(ctx, 16, 11, 19, 3, '#5b2d23');
}

function drawCrown(ctx) {
  polygon(ctx, [[13, 15], [11, 4], [18, 9], [24, 2], [30, 9], [38, 4], [36, 15]], COLORS.ink);
  polygon(ctx, [[15, 13], [14, 7], [19, 11], [24, 5], [29, 11], [35, 7], [34, 13]], COLORS.yellow);
  rect(ctx, 15, 13, 20, 4, COLORS.ink);
  rect(ctx, 17, 13, 16, 2, COLORS.orange);
  rect(ctx, 23, 9, 3, 3, COLORS.red);
}

function drawSunglasses(ctx) {
  rect(ctx, 14, 20, 11, 8, COLORS.ink);
  rect(ctx, 27, 20, 11, 8, COLORS.ink);
  rect(ctx, 24, 22, 4, 2, COLORS.ink);
  rect(ctx, 15, 19, 9, 2, COLORS.ink);
  rect(ctx, 28, 19, 9, 2, COLORS.ink);
  rect(ctx, 16, 21, 7, 4, '#163f5c');
  rect(ctx, 29, 21, 7, 4, '#163f5c');
  rect(ctx, 17, 21, 3, 1, COLORS.cyanLight);
  rect(ctx, 30, 21, 3, 1, COLORS.cyanLight);
}

function drawBowtie(ctx) {
  polygon(ctx, [[17, 32], [24, 35], [17, 40], [13, 38], [13, 34]], COLORS.ink);
  polygon(ctx, [[33, 32], [26, 35], [33, 40], [37, 38], [37, 34]], COLORS.ink);
  polygon(ctx, [[17, 34], [23, 36], [17, 38], [15, 37], [15, 35]], COLORS.red);
  polygon(ctx, [[33, 34], [27, 36], [33, 38], [35, 37], [35, 35]], COLORS.red);
  rect(ctx, 23, 33, 5, 6, COLORS.ink);
  rect(ctx, 24, 34, 3, 4, COLORS.yellow);
}

function drawHeroCape(ctx) {
  polygon(ctx, [[11, 24], [6, 29], [5, 43], [14, 38], [18, 28]], COLORS.ink);
  polygon(ctx, [[39, 24], [44, 29], [45, 43], [36, 38], [32, 28]], COLORS.ink);
  polygon(ctx, [[12, 27], [8, 30], [8, 39], [14, 36], [17, 29]], COLORS.red);
  polygon(ctx, [[38, 27], [42, 30], [42, 39], [36, 36], [33, 29]], COLORS.red);
  rect(ctx, 17, 31, 16, 5, COLORS.ink);
  rect(ctx, 19, 32, 12, 3, COLORS.yellow);
}

function drawCome(ctx) {
  rect(ctx, 15, 51, 14, 6, COLORS.ink);
  rect(ctx, 39, 51, 13, 6, COLORS.ink);
  rect(ctx, 17, 51, 11, 3, COLORS.redDark);
  rect(ctx, 40, 51, 10, 3, COLORS.redDark);
  outlinedEllipse(ctx, 33, 36, 25, 22, COLORS.ink, COLORS.red, 2);
  rect(ctx, 10, 22, 6, 19, '#ff5260');
  rect(ctx, 48, 27, 8, 12, COLORS.redDark);

  // Eye stalks and oversized googly eyes.
  rect(ctx, 18, 8, 6, 14, COLORS.ink);
  rect(ctx, 42, 7, 6, 15, COLORS.ink);
  rect(ctx, 20, 10, 3, 12, COLORS.red);
  rect(ctx, 43, 9, 3, 13, COLORS.red);
  outlinedEllipse(ctx, 20, 9, 7, 6, COLORS.ink, COLORS.white, 2);
  outlinedEllipse(ctx, 45, 8, 7, 6, COLORS.ink, COLORS.white, 2);
  rect(ctx, 21, 8, 3, 4, COLORS.ink);
  rect(ctx, 42, 7, 3, 4, COLORS.ink);

  // The mouth is deliberately most of the face.
  outlinedEllipse(ctx, 37, 39, 18, 16, COLORS.ink, '#53182c', 2);
  rect(ctx, 27, 27, 4, 6, COLORS.white);
  rect(ctx, 34, 25, 4, 7, COLORS.white);
  rect(ctx, 43, 26, 4, 6, COLORS.white);
  rect(ctx, 26, 47, 4, 6, COLORS.white);
  rect(ctx, 35, 49, 4, 5, COLORS.white);
  rect(ctx, 44, 47, 4, 5, COLORS.white);
  rect(ctx, 31, 42, 13, 4, '#a93352');
  rect(ctx, 35, 43, 9, 2, COLORS.blush);
}

function drawVuela(ctx) {
  polygon(ctx, [[20, 25], [12, 8], [1, 4], [0, 25], [12, 34]], COLORS.ink);
  polygon(ctx, [[28, 25], [36, 8], [47, 4], [47, 25], [36, 34]], COLORS.ink);
  polygon(ctx, [[19, 24], [12, 11], [5, 8], [5, 23], [14, 29]], COLORS.magenta);
  polygon(ctx, [[29, 24], [37, 11], [44, 8], [44, 23], [34, 29]], COLORS.magenta);
  rect(ctx, 7, 18, 6, 3, COLORS.purple);
  rect(ctx, 35, 18, 6, 3, COLORS.purple);
  outlinedEllipse(ctx, 24, 26, 12, 12, COLORS.ink, COLORS.purple, 2);
  triangle(ctx, 19, 17, 5, 8, COLORS.ink, 'up');
  triangle(ctx, 29, 17, 5, 8, COLORS.ink, 'up');
  triangle(ctx, 19, 16, 3, 5, COLORS.purple, 'up');
  triangle(ctx, 29, 16, 3, 5, COLORS.purple, 'up');
  rect(ctx, 16, 22, 7, 7, COLORS.white);
  rect(ctx, 26, 22, 7, 7, COLORS.white);
  rect(ctx, 20, 24, 3, 5, COLORS.ink);
  rect(ctx, 26, 24, 3, 5, COLORS.ink);
  rect(ctx, 20, 32, 8, 3, COLORS.ink);
  rect(ctx, 23, 33, 3, 3, COLORS.white);
}

function drawDaVueltas(ctx) {
  // Cardinal and diagonal spikes sit behind the rolling body.
  triangle(ctx, 24, 8, 5, 8, COLORS.yellow, 'up');
  triangle(ctx, 24, 40, 5, 8, COLORS.yellow, 'down');
  polygon(ctx, [[8, 19], [1, 24], [8, 29]], COLORS.yellow);
  polygon(ctx, [[40, 19], [47, 24], [40, 29]], COLORS.yellow);
  rect(ctx, 7, 7, 7, 7, COLORS.yellow);
  rect(ctx, 35, 7, 7, 7, COLORS.yellow);
  rect(ctx, 7, 35, 7, 7, COLORS.yellow);
  rect(ctx, 35, 35, 7, 7, COLORS.yellow);
  outlinedEllipse(ctx, 24, 24, 20, 20, COLORS.ink, COLORS.green, 2);
  rect(ctx, 10, 15, 4, 13, '#92ef63');
  rect(ctx, 14, 9, 13, 3, '#92ef63');
  rect(ctx, 12, 32, 25, 5, COLORS.greenDark);
  outlinedEllipse(ctx, 17, 20, 7, 8, COLORS.ink, COLORS.white, 2);
  outlinedEllipse(ctx, 29, 21, 7, 8, COLORS.ink, COLORS.white, 2);
  rect(ctx, 18, 20, 3, 5, COLORS.ink);
  rect(ctx, 30, 21, 3, 5, COLORS.ink);
  rect(ctx, 18, 30, 14, 5, COLORS.ink);
  rect(ctx, 21, 30, 3, 3, COLORS.white);
  rect(ctx, 28, 30, 3, 3, COLORS.white);
}

function drawFlameAura(ctx) {
  polygon(ctx, [
    [19, 75], [9, 60], [18, 50], [7, 37], [22, 34], [18, 16], [35, 27], [43, 5],
    [53, 25], [69, 9], [67, 31], [87, 28], [77, 46], [90, 59], [77, 74],
  ], COLORS.redDark);
  polygon(ctx, [
    [25, 70], [17, 58], [26, 48], [21, 35], [36, 39], [42, 18], [50, 37], [65, 22],
    [62, 42], [78, 39], [69, 54], [80, 62], [70, 72],
  ], COLORS.red);
  polygon(ctx, [[35, 64], [29, 53], [39, 48], [43, 32], [50, 46], [61, 36], [59, 52], [69, 58], [62, 68]], COLORS.orange);
}

function drawBossCorrupt(ctx) {
  drawFlameAura(ctx);
  // Extended arms and held corruption orbs.
  pixelLine(ctx, 28, 57, 10, 52, COLORS.ink, 9);
  pixelLine(ctx, 68, 57, 86, 52, COLORS.ink, 9);
  pixelLine(ctx, 28, 57, 10, 52, '#65213b', 5);
  pixelLine(ctx, 68, 57, 86, 52, '#65213b', 5);
  outlinedEllipse(ctx, 8, 48, 7, 7, COLORS.ink, COLORS.red, 2);
  outlinedEllipse(ctx, 88, 48, 7, 7, COLORS.ink, COLORS.red, 2);
  sparkle(ctx, 8, 48, COLORS.orange);
  sparkle(ctx, 88, 48, COLORS.orange);

  outlinedEllipse(ctx, 48, 58, 29, 25, COLORS.ink, '#59233f', 3);
  rect(ctx, 25, 66, 46, 9, '#35162d');
  // Angry brows and white eyes.
  pixelLine(ctx, 31, 47, 43, 53, COLORS.ink, 5);
  pixelLine(ctx, 65, 47, 53, 53, COLORS.ink, 5);
  polygon(ctx, [[30, 49], [43, 54], [32, 58]], COLORS.white);
  polygon(ctx, [[66, 49], [53, 54], [64, 58]], COLORS.white);
  rect(ctx, 47, 60, 3, 3, COLORS.ink);
  // Jagged grin.
  rect(ctx, 33, 64, 30, 10, COLORS.ink);
  for (let x = 35; x <= 59; x += 6) {
    triangle(ctx, x, 66, 3, 5, COLORS.white, 'down');
    triangle(ctx, x + 3, 72, 3, 4, COLORS.white, 'up');
  }
  // Corruption spiral on the right cheek.
  pixelLine(ctx, 64, 62, 69, 62, COLORS.orange, 2);
  pixelLine(ctx, 69, 62, 69, 68, COLORS.orange, 2);
  pixelLine(ctx, 69, 68, 63, 68, COLORS.orange, 2);
  pixelLine(ctx, 63, 68, 63, 65, COLORS.orange, 2);
  pixelLine(ctx, 63, 65, 67, 65, COLORS.orange, 2);
  rect(ctx, 28, 78, 16, 8, COLORS.ink);
  rect(ctx, 53, 78, 16, 8, COLORS.ink);
}

function drawBossCured(ctx) {
  sparkle(ctx, 10, 16);
  sparkle(ctx, 54, 12, COLORS.cyanLight);
  pixelLine(ctx, 19, 38, 8, 27, COLORS.ink, 7);
  pixelLine(ctx, 45, 38, 56, 27, COLORS.ink, 7);
  pixelLine(ctx, 19, 38, 8, 27, COLORS.cyan, 4);
  pixelLine(ctx, 45, 38, 56, 27, COLORS.cyan, 4);
  outlinedEllipse(ctx, 32, 38, 23, 20, COLORS.ink, COLORS.cyan, 3);
  rect(ctx, 15, 25, 8, 3, COLORS.cyanLight);
  rect(ctx, 18, 50, 28, 5, COLORS.cyanDark);
  rect(ctx, 21, 33, 4, 8, COLORS.ink);
  rect(ctx, 39, 33, 4, 8, COLORS.ink);
  rect(ctx, 26, 43, 2, 3, COLORS.ink);
  rect(ctx, 36, 43, 2, 3, COLORS.ink);
  rect(ctx, 28, 45, 8, 2, COLORS.ink);
  rect(ctx, 18, 42, 4, 3, COLORS.blush);
  rect(ctx, 43, 42, 4, 3, COLORS.blush);
  rect(ctx, 19, 54, 12, 7, COLORS.ink);
  rect(ctx, 35, 54, 12, 7, COLORS.ink);
  rect(ctx, 21, 54, 9, 4, COLORS.cyan);
  rect(ctx, 36, 54, 9, 4, COLORS.cyan);
}

function drawCoin(ctx) {
  outlinedEllipse(ctx, 10, 10, 9, 9, '#9c4c0f', COLORS.yellow, 2);
  ellipse(ctx, 10, 10, 6, 6, COLORS.orange);
  ellipse(ctx, 10, 9, 5, 5, COLORS.yellow);
  rect(ctx, 5, 4, 4, 2, COLORS.yellowLight);
  rect(ctx, 7, 6, 2, 9, '#9c4c0f');
  rect(ctx, 9, 6, 4, 2, '#9c4c0f');
  rect(ctx, 9, 10, 5, 2, '#9c4c0f');
  rect(ctx, 9, 14, 4, 2, '#9c4c0f');
  rect(ctx, 12, 8, 2, 3, '#9c4c0f');
  rect(ctx, 12, 12, 2, 3, '#9c4c0f');
}

function drawProjectileFire(ctx) {
  rect(ctx, 0, 6, 10, 4, COLORS.red);
  rect(ctx, 4, 3, 12, 10, COLORS.orange);
  rect(ctx, 9, 1, 10, 14, COLORS.yellow);
  ellipse(ctx, 17, 8, 6, 6, COLORS.white);
  ellipse(ctx, 17, 8, 4, 4, COLORS.yellowLight);
  rect(ctx, 0, 7, 8, 2, COLORS.magenta);
}

function drawProjectileLightning(ctx) {
  polygon(ctx, [[0, 6], [9, 6], [13, 1], [18, 1], [15, 5], [26, 5], [20, 9], [32, 9], [19, 12], [15, 8], [7, 11]], '#087bb5');
  polygon(ctx, [[1, 5], [10, 5], [13, 2], [16, 2], [13, 7], [25, 7], [20, 9], [29, 9], [19, 11], [15, 7], [8, 9]], COLORS.cyanLight);
  rect(ctx, 9, 6, 9, 2, COLORS.white);
}

function drawProjectileRock(ctx) {
  polygon(ctx, [[5, 1], [13, 0], [18, 6], [16, 15], [9, 18], [2, 14], [0, 7]], COLORS.ink);
  polygon(ctx, [[6, 3], [12, 2], [16, 7], [14, 13], [9, 16], [3, 12], [2, 7]], COLORS.gray);
  rect(ctx, 5, 4, 6, 3, COLORS.grayLight);
  rect(ctx, 11, 11, 4, 3, COLORS.grayDark);
}

function drawEmpanadilla(ctx) {
  // Flexible pink arms behind the pastry body.
  pixelLine(ctx, 15, 38, 4, 29, COLORS.ink, 8);
  pixelLine(ctx, 49, 37, 59, 27, COLORS.ink, 8);
  pixelLine(ctx, 15, 38, 4, 29, '#ea5e91', 5);
  pixelLine(ctx, 49, 37, 59, 27, '#ea5e91', 5);
  ellipse(ctx, 3, 27, 4, 4, COLORS.ink);
  ellipse(ctx, 60, 25, 4, 4, COLORS.ink);
  ellipse(ctx, 3, 27, 3, 3, '#ff86ad');
  ellipse(ctx, 60, 25, 3, 3, '#ff86ad');

  // Flat on the left, crimped semicircle on the right.
  polygon(ctx, [[14, 8], [35, 8], [48, 14], [55, 28], [54, 48], [44, 59], [14, 59]], COLORS.ink);
  polygon(ctx, [[17, 11], [34, 11], [45, 16], [51, 29], [50, 46], [42, 55], [17, 55]], COLORS.tan);
  rect(ctx, 43, 16, 5, 36, '#b96b35');
  rect(ctx, 47, 22, 5, 4, COLORS.cream);
  rect(ctx, 48, 33, 5, 4, COLORS.cream);
  rect(ctx, 46, 44, 5, 4, COLORS.cream);
  rect(ctx, 25, 22, 5, 10, COLORS.white);
  rect(ctx, 36, 22, 5, 10, COLORS.white);
  rect(ctx, 28, 24, 2, 6, COLORS.ink);
  rect(ctx, 36, 24, 2, 6, COLORS.ink);
  rect(ctx, 25, 37, 18, 10, COLORS.ink);
  rect(ctx, 28, 37, 13, 3, COLORS.white);
  rect(ctx, 29, 44, 11, 2, COLORS.blush);
  rect(ctx, 18, 59, 12, 6, COLORS.ink);
  rect(ctx, 38, 59, 12, 6, COLORS.ink);
  rect(ctx, 20, 59, 8, 3, COLORS.orange);
  rect(ctx, 40, 59, 8, 3, COLORS.orange);
}

function drawPinguino(ctx) {
  // Straw hat is the visual link to the hero.
  rect(ctx, 12, 13, 40, 6, COLORS.ink);
  rect(ctx, 15, 12, 34, 5, COLORS.yellow);
  rect(ctx, 21, 4, 22, 11, COLORS.ink);
  rect(ctx, 23, 6, 18, 8, COLORS.yellow);
  rect(ctx, 21, 11, 22, 4, COLORS.red);
  outlinedEllipse(ctx, 32, 39, 22, 24, COLORS.ink, '#258fd3', 3);
  ellipse(ctx, 32, 43, 14, 17, COLORS.white);
  rect(ctx, 18, 25, 7, 8, COLORS.cyan);
  rect(ctx, 40, 25, 7, 8, COLORS.cyan);
  rect(ctx, 23, 28, 4, 7, COLORS.ink);
  rect(ctx, 39, 28, 4, 7, COLORS.ink);
  polygon(ctx, [[29, 37], [38, 37], [34, 42]], COLORS.orange);
  pixelLine(ctx, 13, 38, 6, 58, COLORS.brownDark, 4);
  pixelLine(ctx, 4, 57, 15, 62, COLORS.brown, 3);
  pixelLine(ctx, 3, 60, 14, 65, COLORS.brown, 2);
  rect(ctx, 18, 62, 15, 5, COLORS.ink);
  rect(ctx, 37, 62, 12, 5, COLORS.ink);
  rect(ctx, 20, 62, 11, 3, COLORS.orange);
  rect(ctx, 38, 62, 9, 3, COLORS.orange);
}

function drawTreeSad(ctx) {
  // Layered, drooping canopy.
  outlinedEllipse(ctx, 48, 27, 37, 22, COLORS.ink, '#284f36', 3);
  ellipse(ctx, 26, 30, 18, 16, '#376744');
  ellipse(ctx, 68, 31, 20, 17, '#315d3e');
  ellipse(ctx, 47, 18, 23, 16, '#3f7448');
  rect(ctx, 19, 38, 12, 8, '#284f36');
  rect(ctx, 60, 40, 16, 8, '#284f36');

  // Empty three-point wooden crown embedded in the foliage.
  polygon(ctx, [[18, 42], [18, 23], [31, 36], [47, 17], [63, 36], [78, 23], [78, 45]], COLORS.brownDark);
  polygon(ctx, [[22, 40], [22, 31], [32, 40], [47, 23], [62, 40], [74, 31], [74, 41]], '#9a6335');
  outlinedEllipse(ctx, 31, 37, 8, 7, COLORS.brownDark, COLORS.inkSoft, 2);
  outlinedEllipse(ctx, 48, 35, 8, 7, COLORS.brownDark, COLORS.inkSoft, 2);
  outlinedEllipse(ctx, 65, 37, 8, 7, COLORS.brownDark, COLORS.inkSoft, 2);

  rect(ctx, 37, 43, 23, 58, COLORS.brownDark);
  rect(ctx, 41, 44, 15, 55, '#99552e');
  rect(ctx, 43, 46, 5, 50, '#b46d35');
  pixelLine(ctx, 39, 69, 25, 84, COLORS.brownDark, 8);
  pixelLine(ctx, 58, 69, 72, 84, COLORS.brownDark, 8);
  pixelLine(ctx, 39, 69, 25, 84, '#99552e', 4);
  pixelLine(ctx, 58, 69, 72, 84, '#99552e', 4);
  rect(ctx, 44, 62, 4, 11, COLORS.ink);
  rect(ctx, 52, 62, 4, 11, COLORS.ink);
  rect(ctx, 43, 79, 3, 7, COLORS.ink);
  rect(ctx, 55, 79, 3, 7, COLORS.ink);
  rect(ctx, 46, 84, 9, 3, COLORS.ink);
  rect(ctx, 32, 98, 32, 8, COLORS.brownDark);
  rect(ctx, 37, 96, 23, 8, '#7e4129');
}

function drawGround(ctx) {
  rect(ctx, 0, 0, 32, 32, COLORS.brownDark);
  rect(ctx, 1, 7, 30, 25, '#8b482b');
  rect(ctx, 0, 0, 32, 8, COLORS.ink);
  rect(ctx, 0, 1, 32, 5, COLORS.green);
  rect(ctx, 0, 1, 32, 2, COLORS.lime);
  rect(ctx, 3, 6, 4, 4, COLORS.greenDark);
  rect(ctx, 12, 5, 6, 5, COLORS.greenDark);
  rect(ctx, 25, 6, 5, 4, COLORS.greenDark);
  rect(ctx, 4, 14, 5, 4, '#b86635');
  rect(ctx, 17, 11, 6, 4, '#5e3827');
  rect(ctx, 10, 23, 5, 4, '#5e3827');
  rect(ctx, 23, 25, 6, 4, '#b86635');
}

function drawPlatform(ctx) {
  rect(ctx, 0, 0, 32, 16, COLORS.ink);
  rect(ctx, 1, 6, 30, 9, '#8b482b');
  rect(ctx, 0, 1, 32, 6, COLORS.green);
  rect(ctx, 0, 1, 32, 2, COLORS.lime);
  rect(ctx, 5, 6, 4, 4, COLORS.greenDark);
  rect(ctx, 17, 5, 6, 4, COLORS.greenDark);
  rect(ctx, 7, 11, 6, 3, '#b86635');
  rect(ctx, 22, 10, 6, 4, '#5e3827');
}

function drawStone(ctx) {
  rect(ctx, 0, 0, 32, 32, COLORS.ink);
  rect(ctx, 2, 2, 28, 28, '#657184');
  rect(ctx, 3, 3, 12, 11, '#8994a3');
  rect(ctx, 17, 3, 12, 11, '#737f91');
  rect(ctx, 3, 16, 9, 13, '#737f91');
  rect(ctx, 14, 16, 15, 13, '#8994a3');
  rect(ctx, 15, 2, 2, 14, COLORS.inkSoft);
  rect(ctx, 12, 14, 18, 2, COLORS.inkSoft);
  rect(ctx, 12, 16, 2, 14, COLORS.inkSoft);
  rect(ctx, 5, 5, 6, 2, COLORS.grayLight);
}

function drawFlower(ctx) {
  pixelLine(ctx, 8, 15, 8, 29, COLORS.greenDark, 2);
  rect(ctx, 3, 13, 5, 5, COLORS.white);
  rect(ctx, 9, 13, 5, 5, COLORS.white);
  rect(ctx, 6, 9, 5, 5, COLORS.white);
  rect(ctx, 6, 15, 5, 5, COLORS.white);
  rect(ctx, 7, 14, 3, 3, COLORS.yellow);
  rect(ctx, 2, 23, 6, 3, COLORS.green);
  rect(ctx, 9, 20, 6, 3, COLORS.green);
}

function drawSign(ctx) {
  rect(ctx, 13, 24, 6, 24, COLORS.ink);
  rect(ctx, 15, 24, 3, 24, COLORS.brown);
  rect(ctx, 2, 3, 28, 25, COLORS.ink);
  rect(ctx, 4, 5, 24, 21, '#c47a3b');
  rect(ctx, 6, 7, 20, 3, COLORS.tan);
  pixelLine(ctx, 8, 15, 24, 15, COLORS.brownDark, 2);
  pixelLine(ctx, 8, 20, 20, 20, COLORS.brownDark, 2);
  rect(ctx, 5, 4, 3, 3, COLORS.grayLight);
  rect(ctx, 24, 23, 3, 3, COLORS.grayLight);
}

function drawCrate(ctx) {
  rect(ctx, 0, 0, 32, 32, COLORS.ink);
  rect(ctx, 2, 2, 28, 28, '#9b582f');
  rect(ctx, 5, 5, 22, 22, '#c57638');
  pixelLine(ctx, 5, 5, 27, 27, COLORS.brownDark, 4);
  pixelLine(ctx, 27, 5, 5, 27, COLORS.brownDark, 4);
  rect(ctx, 0, 5, 32, 4, COLORS.brownDark);
  rect(ctx, 0, 24, 32, 4, COLORS.brownDark);
}

function drawSpikes(ctx) {
  rect(ctx, 0, 14, 32, 6, COLORS.ink);
  rect(ctx, 1, 16, 30, 3, COLORS.grayDark);
  for (let x = 5; x <= 27; x += 7) {
    triangle(ctx, x, 14, 5, 14, COLORS.ink, 'up');
    triangle(ctx, x, 13, 3, 11, COLORS.grayLight, 'up');
  }
}

function drawCheckpoint(ctx) {
  rect(ctx, 8, 4, 7, 60, COLORS.ink);
  rect(ctx, 10, 6, 3, 56, '#d6a23c');
  polygon(ctx, [[14, 8], [31, 11], [31, 34], [14, 30]], COLORS.ink);
  polygon(ctx, [[16, 11], [29, 13], [29, 31], [16, 28]], '#247bd0');
  // Pixel B.
  rect(ctx, 19, 15, 3, 12, COLORS.white);
  rect(ctx, 22, 15, 4, 3, COLORS.white);
  rect(ctx, 22, 20, 4, 3, COLORS.white);
  rect(ctx, 22, 24, 4, 3, COLORS.white);
  rect(ctx, 25, 17, 2, 4, COLORS.white);
  rect(ctx, 25, 22, 2, 4, COLORS.white);
  rect(ctx, 4, 59, 16, 5, COLORS.ink);
}

function drawPortal(ctx) {
  // Stone arch.
  outlinedEllipse(ctx, 32, 38, 29, 34, COLORS.ink, COLORS.grayDark, 3);
  outlinedEllipse(ctx, 32, 39, 20, 26, COLORS.inkSoft, '#21133f', 3);
  rect(ctx, 2, 38, 11, 38, COLORS.ink);
  rect(ctx, 51, 38, 11, 38, COLORS.ink);
  rect(ctx, 5, 38, 7, 35, COLORS.gray);
  rect(ctx, 52, 38, 7, 35, COLORS.gray);
  rect(ctx, 0, 72, 19, 7, COLORS.ink);
  rect(ctx, 45, 72, 19, 7, COLORS.ink);
  // Blocky magical swirl.
  pixelLine(ctx, 19, 35, 46, 35, COLORS.purple, 5);
  pixelLine(ctx, 46, 35, 46, 52, COLORS.cyan, 5);
  pixelLine(ctx, 46, 52, 23, 52, COLORS.cyanLight, 5);
  pixelLine(ctx, 23, 52, 23, 43, COLORS.purple, 5);
  pixelLine(ctx, 23, 43, 38, 43, COLORS.white, 4);
  sparkle(ctx, 19, 24, COLORS.cyanLight);
  sparkle(ctx, 47, 61, COLORS.magenta);
}

function makeBabitoLayerSpec(key, drawFrame) {
  const width = BABITO_TEXTURE_SIZE * BABITO_ANIMATION_COLUMNS;
  const rows = Math.ceil(BABITO_ANIMATION_FRAME_COUNT / BABITO_ANIMATION_COLUMNS);
  const height = BABITO_TEXTURE_SIZE * rows;
  return [
    key,
    width,
    height,
    (ctx) => {
      BABITO_FRAME_POSES.forEach((pose, frameIndex) => {
        const column = frameIndex % BABITO_ANIMATION_COLUMNS;
        const row = Math.floor(frameIndex / BABITO_ANIMATION_COLUMNS);
        const originX = column * BABITO_TEXTURE_SIZE;
        const originY = row * BABITO_TEXTURE_SIZE;
        ctx.save();
        ctx.beginPath();
        ctx.rect(originX, originY, BABITO_TEXTURE_SIZE, BABITO_TEXTURE_SIZE);
        ctx.clip();
        const transform = getBabitoPoseTransform(pose);
        ctx.translate(
          originX + BABITO_TEXTURE_SIZE / 2 + transform.offsetX,
          originY + BABITO_TEXTURE_SIZE / 2 + transform.offsetY,
        );
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scaleX, transform.scaleY);
        ctx.translate(-BABITO_ART_SIZE / 2, -BABITO_ART_SIZE / 2);
        drawFrame(ctx, pose, frameIndex);
        ctx.restore();
      });
    },
    Object.freeze({
      frameWidth: BABITO_TEXTURE_SIZE,
      frameHeight: BABITO_TEXTURE_SIZE,
      columns: BABITO_ANIMATION_COLUMNS,
      frameCount: BABITO_ANIMATION_FRAME_COUNT,
    }),
  ];
}

function getTextureSpecs() {
  const specs = [];
  for (const [id, palette] of Object.entries(BABITO_PALETTES)) {
    specs.push(makeBabitoLayerSpec(
      TEXTURE_KEYS.body[id],
      (ctx, pose) => drawBabitoBody(ctx, palette, pose),
    ));
  }

  specs.push(
    makeBabitoLayerSpec(TEXTURE_KEYS.eyes.normal, (ctx, pose) => drawBabitoEyes(ctx, 'normal', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.eyes.big, (ctx, pose) => drawBabitoEyes(ctx, 'big', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.eyes.cute, (ctx, pose) => drawBabitoEyes(ctx, 'cute', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.eyes.crazy, (ctx, pose) => drawBabitoEyes(ctx, 'crazy', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.mouth.smile, (ctx, pose) => drawBabitoMouth(ctx, 'smile', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.mouth.open, (ctx, pose) => drawBabitoMouth(ctx, 'open', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.mouth.cute, (ctx, pose) => drawBabitoMouth(ctx, 'cute', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.mouth.epic, (ctx, pose) => drawBabitoMouth(ctx, 'epic', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.arms.default, (ctx, pose) => drawBabitoArms(ctx, 'default', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.arms.round, (ctx, pose) => drawBabitoArms(ctx, 'default', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.arms.hero, (ctx, pose) => drawBabitoArms(ctx, 'hero', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.arms.spring, (ctx, pose) => drawBabitoArms(ctx, 'spring', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.arms.raised, (ctx, pose) => drawBabitoArms(ctx, 'raised', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.arms.attack, (ctx, pose) => drawBabitoArms(ctx, 'attack', pose)),
    makeBabitoLayerSpec(TEXTURE_KEYS.head.none, () => {}),
    makeBabitoLayerSpec(TEXTURE_KEYS.head.strawHat, drawStrawHat),
    makeBabitoLayerSpec(TEXTURE_KEYS.head.cowboyHat, drawCowboyHat),
    makeBabitoLayerSpec(TEXTURE_KEYS.head.crown, drawCrown),
    makeBabitoLayerSpec(TEXTURE_KEYS.glasses.none, () => {}),
    makeBabitoLayerSpec(TEXTURE_KEYS.glasses.sunglasses, drawSunglasses),
    makeBabitoLayerSpec(TEXTURE_KEYS.neck.none, () => {}),
    makeBabitoLayerSpec(TEXTURE_KEYS.neck.bowtie, drawBowtie),
    makeBabitoLayerSpec(TEXTURE_KEYS.neck.heroCape, drawHeroCape),
    [TEXTURE_KEYS.enemyCome, 80, 72, (ctx) => {
      ctx.save();
      ctx.translate(8, 4);
      drawCome(ctx);
      ctx.restore();
    }],
    [TEXTURE_KEYS.enemyVuela, 48, 40, drawVuela],
    [TEXTURE_KEYS.enemyDaVueltas, 58, 58, (ctx) => {
      ctx.save();
      ctx.translate(5, 5);
      drawDaVueltas(ctx);
      ctx.restore();
    }],
    [TEXTURE_KEYS.bossCorrupt, 96, 96, drawBossCorrupt],
    [TEXTURE_KEYS.bossCured, 64, 64, drawBossCured],
    [TEXTURE_KEYS.coin, 20, 20, drawCoin],
    [TEXTURE_KEYS.projectileFire, 24, 16, drawProjectileFire],
    [TEXTURE_KEYS.projectileLightning, 32, 14, drawProjectileLightning],
    [TEXTURE_KEYS.projectileRock, 18, 18, drawProjectileRock],
    [TEXTURE_KEYS.merchantEmpanadilla, 64, 72, drawEmpanadilla],
    [TEXTURE_KEYS.merchantPinguino, 64, 72, drawPinguino],
    [TEXTURE_KEYS.powerTreeSad, 96, 112, drawTreeSad],
    [TEXTURE_KEYS.tileGround, 32, 32, drawGround],
    [TEXTURE_KEYS.tilePlatform, 32, 16, drawPlatform],
    [TEXTURE_KEYS.tileStone, 32, 32, drawStone],
    [TEXTURE_KEYS.propFlower, 16, 32, drawFlower],
    [TEXTURE_KEYS.propSign, 32, 48, drawSign],
    [TEXTURE_KEYS.propCrate, 32, 32, drawCrate],
    [TEXTURE_KEYS.propSpikes, 32, 20, drawSpikes],
    [TEXTURE_KEYS.checkpoint, 32, 64, drawCheckpoint],
    [TEXTURE_KEYS.portal, 64, 80, drawPortal],
    [TEXTURE_KEYS.playerHitbox, 32, 42, () => {}],
    [TEXTURE_KEYS.particleDot, 4, 4, (ctx) => rect(ctx, 1, 1, 2, 2, COLORS.white)],
  );
  return specs;
}

function generateCanvasTexture(scene, key, width, height, draw, overwrite, frameConfig = null) {
  if (scene.textures.exists(key)) {
    if (!overwrite) return false;
    scene.textures.remove(key);
  }

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) {
    throw new Error(`Could not create Phaser canvas texture "${key}".`);
  }

  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.globalCompositeOperation = 'source-over';
  draw(context);
  if (frameConfig) {
    for (let frameIndex = 0; frameIndex < frameConfig.frameCount; frameIndex += 1) {
      const column = frameIndex % frameConfig.columns;
      const row = Math.floor(frameIndex / frameConfig.columns);
      texture.add(
        frameIndex,
        0,
        column * frameConfig.frameWidth,
        row * frameConfig.frameHeight,
        frameConfig.frameWidth,
        frameConfig.frameHeight,
      );
    }
  }
  texture.refresh();
  texture.setFilter?.(PHASER_NEAREST_FILTER);
  return true;
}

/**
 * Creates all runtime art used by the playable prototype.
 *
 * The function is idempotent: existing keys are left untouched by default.
 * Pass `{ overwrite: true }` only in an art-development scene that deliberately
 * wants to regenerate these textures.
 *
 * @param {Phaser.Scene} scene Active Phaser scene with a texture manager.
 * @param {{ overwrite?: boolean }} [options]
 * @returns {{ created: string[], skipped: string[], keys: typeof TEXTURE_KEYS }}
 */
export function createTextures(scene, { overwrite = false } = {}) {
  if (!scene?.textures?.createCanvas || !scene?.textures?.exists) {
    throw new TypeError('createTextures(scene) requires an active Phaser.Scene.');
  }

  const created = [];
  const skipped = [];
  for (const [key, width, height, draw, frameConfig] of getTextureSpecs()) {
    const wasCreated = generateCanvasTexture(
      scene,
      key,
      width,
      height,
      draw,
      overwrite,
      frameConfig,
    );
    (wasCreated ? created : skipped).push(key);
  }

  return { created, skipped, keys: TEXTURE_KEYS };
}

export default createTextures;
