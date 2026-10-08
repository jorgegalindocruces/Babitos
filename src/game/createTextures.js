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

/** Native source size shared by every composable Babito layer. */
export const BABITO_TEXTURE_SIZE = 80;
export const BABITO_RENDER_SIZE = 80;
const BABITO_DESIGN_SIZE = 48;
const BABITO_ART_SIZE = 64;
export const BABITO_DETAIL_SCALE = BABITO_ART_SIZE / BABITO_DESIGN_SIZE;
const BABITO_ART_SCALE = 1.1;
export const BABITO_SPRING_HAND_RADIUS = 3;

const BABITO_DESIGN_GEOMETRY = Object.freeze({
  body: Object.freeze({ centerX: 24, centerY: 23, radiusX: 17, radiusY: 17 }),
  normalEyes: Object.freeze({ width: 3, height: 7, gap: 8 }),
  feet: Object.freeze({ maxWidth: 10, authoredHeight: 7, exposedHeight: 4 }),
  restingFin: Object.freeze({ minX: 1, maxX: 14, minY: 21, maxY: 36 }),
});

function scaleBabitoMetric(value) {
  return Math.round(value * BABITO_DETAIL_SCALE);
}
/**
 * Measurable anchors for the approved Babito translated to the detailed 64 px
 * composable grid. Keeping these public makes art regressions testable without
 * coupling tests to every individual canvas primitive.
 */
export const BABITO_CANONICAL_GEOMETRY = Object.freeze({
  body: Object.freeze({
    centerX: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.body.centerX),
    centerY: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.body.centerY),
    radiusX: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.body.radiusX),
    radiusY: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.body.radiusY),
    trimmedTips: scaleBabitoMetric(1),
  }),
  normalEyes: Object.freeze({
    width: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.normalEyes.width),
    height: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.normalEyes.height),
    gap: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.normalEyes.gap),
  }),
  feet: Object.freeze({
    maxWidth: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.feet.maxWidth),
    authoredHeight: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.feet.authoredHeight),
    exposedHeight: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.feet.exposedHeight),
  }),
  restingFin: Object.freeze({
    minX: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.restingFin.minX),
    maxX: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.restingFin.maxX),
    minY: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.restingFin.minY),
    maxY: scaleBabitoMetric(BABITO_DESIGN_GEOMETRY.restingFin.maxY),
  }),
});

/** Physical scanline widths for the idle body's outer silhouette. */
export function getBabitoBodyScanlineWidths() {
  const { radiusX, radiusY, trimmedTips } = BABITO_CANONICAL_GEOMETRY.body;
  const widths = [];
  for (let y = -radiusY + trimmedTips; y <= radiusY - trimmedTips; y += 1) {
    const ratio = 1 - (y * y) / (radiusY * radiusY);
    widths.push(Math.floor(radiusX * Math.sqrt(Math.max(0, ratio))) * 2 + 1);
  }
  return Object.freeze(widths);
}

export const BABITO_AUTHORED_ART_BOUNDS = Object.freeze({
  minX: scaleBabitoMetric(1),
  maxX: scaleBabitoMetric(47),
  minY: scaleBabitoMetric(2),
  maxY: scaleBabitoMetric(47),
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
    offsetX: Number(pose.offset?.x ?? 0) * profile.offsetX * BABITO_DETAIL_SCALE,
    offsetY: Number(pose.offset?.y ?? 0) * profile.offsetY * BABITO_DETAIL_SCALE,
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
  cyan: Object.freeze({ main: '#7cdbf9', light: '#a8edff', shade: '#2bbfe5', tint: 0x7cdbf9 }),
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
  tileJungleGround: 'tile_jungle_ground',
  tileBranch: 'tile_branch',
  tileBridge: 'tile_bridge',
  tileRuin: 'tile_ruin',
  springMushroom: 'spring_mushroom',
  bossDarkness: 'boss_darkness',
  lanternOff: 'lantern_off',
  lanternOn: 'lantern_on',
  powerApple: 'power_apple',
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

const PIXEL_GRID_SCALES = new WeakMap();

function getPixelGridScale(ctx) {
  return PIXEL_GRID_SCALES.get(ctx) ?? 1;
}

function withPixelGridScale(ctx, scale, draw) {
  const previous = PIXEL_GRID_SCALES.get(ctx);
  PIXEL_GRID_SCALES.set(ctx, scale);
  try {
    return draw();
  } finally {
    if (previous === undefined) PIXEL_GRID_SCALES.delete(ctx);
    else PIXEL_GRID_SCALES.set(ctx, previous);
  }
}

function fillPhysicalRect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function rect(ctx, x, y, width, height, color) {
  const scale = getPixelGridScale(ctx);
  const left = Math.round(x * scale);
  const top = Math.round(y * scale);
  const right = Math.round((x + width) * scale);
  const bottom = Math.round((y + height) * scale);
  fillPhysicalRect(
    ctx,
    left,
    top,
    Math.max(1, right - left),
    Math.max(1, bottom - top),
    color,
  );
}

function scanlineEllipse(ctx, cx, cy, radiusX, radiusY, color, trimTips = 0) {
  ctx.fillStyle = color;
  const safeRadiusY = Math.max(1, radiusY);
  const firstY = -radiusY + trimTips;
  const lastY = radiusY - trimTips;
  for (let y = firstY; y <= lastY; y += 1) {
    const ratio = 1 - (y * y) / (safeRadiusY * safeRadiusY);
    const halfWidth = Math.floor(radiusX * Math.sqrt(Math.max(0, ratio)));
    ctx.fillRect(Math.round(cx - halfWidth), Math.round(cy + y), halfWidth * 2 + 1, 1);
  }
}

/** Draws a scanline ellipse with no antialiased vector edge. */
function ellipse(ctx, cx, cy, radiusX, radiusY, color) {
  const scale = getPixelGridScale(ctx);
  scanlineEllipse(
    ctx,
    Math.round(cx * scale),
    Math.round(cy * scale),
    Math.max(1, Math.round(radiusX * scale)),
    Math.max(1, Math.round(radiusY * scale)),
    color,
  );
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

/**
 * The reference Babito has a short, flat crown and a continuous round cheek.
 * Trimming the mathematical ellipse tips removes the old one-pixel spike while
 * retaining a deterministic, symmetric scanline profile.
 */
function outlinedRoundedBody(ctx, cx, cy, radiusX, radiusY, outline, fill, inset = 2) {
  const scale = getPixelGridScale(ctx);
  const physicalCenterX = Math.round(cx * scale);
  const physicalCenterY = Math.round(cy * scale);
  const physicalRadiusX = Math.max(1, Math.round(radiusX * scale));
  const physicalRadiusY = Math.max(1, Math.round(radiusY * scale));
  const physicalInset = Math.max(1, Math.round(inset * scale));
  const trimmedTips = Math.max(1, Math.round(scale));

  scanlineEllipse(
    ctx,
    physicalCenterX,
    physicalCenterY,
    physicalRadiusX,
    physicalRadiusY,
    outline,
    trimmedTips,
  );
  scanlineEllipse(
    ctx,
    physicalCenterX,
    physicalCenterY - Math.floor(physicalInset / 2),
    Math.max(1, physicalRadiusX - physicalInset),
    Math.max(1, physicalRadiusY - physicalInset),
    fill,
    trimmedTips,
  );
}

function polygon(ctx, points, color) {
  const scale = getPixelGridScale(ctx);
  const mappedPoints = points.map(([x, y]) => [Math.round(x * scale), Math.round(y * scale)]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(mappedPoints[0][0], mappedPoints[0][1]);
  for (let index = 1; index < mappedPoints.length; index += 1) {
    ctx.lineTo(mappedPoints[index][0], mappedPoints[index][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function pixelLine(ctx, x0, y0, x1, y1, color, thickness = 1) {
  const scale = getPixelGridScale(ctx);
  let x = Math.round(x0 * scale);
  let y = Math.round(y0 * scale);
  const endX = Math.round(x1 * scale);
  const endY = Math.round(y1 * scale);
  const deltaX = Math.abs(endX - x);
  const stepX = x < endX ? 1 : -1;
  const deltaY = -Math.abs(endY - y);
  const stepY = y < endY ? 1 : -1;
  let error = deltaX + deltaY;
  const physicalThickness = Math.max(1, Math.round(thickness * scale));
  const offset = Math.floor(physicalThickness / 2);

  while (true) {
    fillPhysicalRect(
      ctx,
      x - offset,
      y - offset,
      physicalThickness,
      physicalThickness,
      color,
    );
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
  const scale = getPixelGridScale(ctx);
  const physicalCenterX = Math.round(centerX * scale);
  const physicalBaseY = Math.round(baseY * scale);
  const physicalHalfWidth = Math.max(1, Math.round(halfWidth * scale));
  const physicalHeight = Math.max(1, Math.round(height * scale));
  ctx.fillStyle = color;
  for (let row = 0; row < physicalHeight; row += 1) {
    // `baseY` is always the wide edge; rows converge on the distant tip.
    const progress = 1 - row / Math.max(1, physicalHeight - 1);
    const width = Math.max(1, Math.round(physicalHalfWidth * 2 * progress));
    const y = direction === 'up' ? physicalBaseY - row : physicalBaseY + row;
    ctx.fillRect(Math.round(physicalCenterX - width / 2), Math.round(y), width, 1);
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
  const { centerX, centerY, radiusX, radiusY } = BABITO_DESIGN_GEOMETRY.body;

  // Short feet sit behind the lower curve like the approved 32 px sprite.
  // They still move independently, preserving every contact and airborne pose.
  rect(ctx, 14 + leftFootX, 37 + leftFootY, 10, 7, COLORS.ink);
  rect(ctx, 27 + rightFootX, 37 + rightFootY, 9, 7, COLORS.ink);
  rect(ctx, 15 + leftFootX, 38 + leftFootY, 8, 5, palette.main);
  rect(ctx, 28 + rightFootX, 38 + rightFootY, 7, 5, palette.main);

  // A broad, tip-trimmed scanline body follows the approved base: flat crown,
  // stepped shoulders and one continuous cheek-to-belly curve.
  outlinedRoundedBody(ctx, centerX, centerY, radiusX, radiusY, COLORS.ink, palette.main, 2);
  rect(ctx, 13, 11, 8, 2, palette.light);
  rect(ctx, 11, 14, 3, 8, palette.light);
  rect(ctx, 15, 12, 4, 1, '#ffffff');
  // Keep depth on the far side only. A darker horizontal lower band reads as
  // trousers at gameplay scale, so belly and feet share the body colour.
  rect(ctx, 38, 22, 2, 4, palette.shade);
  rect(ctx, 37, 26, 2, 5, palette.shade);
  rect(ctx, 12, 26, 3, 2, COLORS.blush);
  rect(ctx, 35, 26, 3, 2, COLORS.blush);
}

function drawBabitoEyes(ctx, style, pose = {}) {
  if (pose.expression === 'blink') {
    rect(ctx, 17, 23, 5, 2, COLORS.ink);
    rect(ctx, 29, 23, 5, 2, COLORS.ink);
    return;
  }

  if (pose.expression === 'hurt' || pose.expression === 'knocked-out') {
    pixelLine(ctx, 17, 20, 22, 25, COLORS.ink, 2);
    pixelLine(ctx, 22, 20, 17, 25, COLORS.ink, 2);
    pixelLine(ctx, 29, 20, 34, 25, COLORS.ink, 2);
    pixelLine(ctx, 34, 20, 29, 25, COLORS.ink, 2);
    return;
  }

  if (pose.expression === 'dazed') {
    rect(ctx, 17, 23, 5, 2, COLORS.ink);
    rect(ctx, 29, 23, 5, 2, COLORS.ink);
    rect(ctx, 18, 21, 3, 1, COLORS.ink);
    rect(ctx, 30, 21, 3, 1, COLORS.ink);
    return;
  }

  if (pose.expression === 'surprised') {
    outlinedEllipse(ctx, 19, 22, 4, 5, COLORS.ink, COLORS.white, 1);
    outlinedEllipse(ctx, 31, 22, 4, 5, COLORS.ink, COLORS.white, 1);
    rect(ctx, 20, 21, 2, 4, COLORS.ink);
    rect(ctx, 32, 21, 2, 4, COLORS.ink);
    rect(ctx, 20, 20, 1, 1, COLORS.white);
    rect(ctx, 32, 20, 1, 1, COLORS.white);
    return;
  }

  if (['focus', 'determined', 'attack'].includes(pose.expression)) {
    const pupilOffset = pose.expression === 'attack' ? 1 : 0;
    rect(ctx, 18, 20, 4, 7, COLORS.ink);
    rect(ctx, 29, 20, 4, 7, COLORS.ink);
    rect(ctx, 19 + pupilOffset, 21, 1, 2, COLORS.white);
    rect(ctx, 30 + pupilOffset, 21, 1, 2, COLORS.white);
    pixelLine(ctx, 17, 19, 22, pose.expression === 'attack' ? 21 : 20, COLORS.ink, 2);
    pixelLine(ctx, 29, pose.expression === 'attack' ? 21 : 20, 34, 19, COLORS.ink, 2);
    return;
  }

  if (style === 'big') {
    rect(ctx, 16, 19, 6, 8, COLORS.ink);
    rect(ctx, 29, 19, 6, 8, COLORS.ink);
    rect(ctx, 18, 20, 2, 2, COLORS.white);
    rect(ctx, 31, 20, 2, 2, COLORS.white);
    return;
  }

  if (style === 'cute') {
    rect(ctx, 18, 20, 4, 6, COLORS.ink);
    rect(ctx, 29, 20, 4, 6, COLORS.ink);
    rect(ctx, 19, 20, 1, 2, COLORS.white);
    rect(ctx, 30, 20, 1, 2, COLORS.white);
    rect(ctx, 16, 19, 2, 1, COLORS.ink);
    rect(ctx, 33, 19, 2, 1, COLORS.ink);
    return;
  }

  if (style === 'crazy') {
    // Canonical star eyes: unmistakable at the creator's smallest preview.
    polygon(ctx, [[19, 18], [21, 21], [24, 21], [22, 24], [23, 27], [19, 25], [16, 27], [17, 24], [14, 21], [18, 21]], COLORS.ink);
    polygon(ctx, [[32, 18], [34, 21], [37, 21], [35, 24], [36, 27], [32, 25], [29, 27], [30, 24], [27, 21], [31, 21]], COLORS.ink);
    rect(ctx, 18, 20, 1, 2, COLORS.white);
    rect(ctx, 31, 20, 1, 2, COLORS.white);
    return;
  }

  const { width, height, gap } = BABITO_DESIGN_GEOMETRY.normalEyes;
  rect(ctx, 18, 19, width, height, COLORS.ink);
  rect(ctx, 18 + width + gap, 19, width, height, COLORS.ink);
}

function drawBabitoMouth(ctx, style, pose = {}) {
  if (pose.expression === 'attack') {
    outlinedEllipse(ctx, 25, 29, 4, 3, COLORS.ink, '#691b3b', 1);
    rect(ctx, 23, 27, 5, 1, COLORS.white);
    return;
  }

  if (pose.expression === 'hurt') {
    pixelLine(ctx, 21, 31, 25, 28, COLORS.ink, 2);
    pixelLine(ctx, 25, 28, 30, 31, COLORS.ink, 2);
    return;
  }

  if (pose.expression === 'dazed' || pose.expression === 'knocked-out') {
    rect(ctx, 22, 29, 7, 2, COLORS.ink);
    return;
  }

  if (pose.expression === 'surprised') {
    outlinedEllipse(ctx, 25, 29, 3, 4, COLORS.ink, '#691b3b', 1);
    rect(ctx, 24, 31, 3, 1, COLORS.blush);
    return;
  }

  if (pose.expression === 'determined' || pose.expression === 'focus') {
    pixelLine(ctx, 21, 30, 25, 28, COLORS.ink, 2);
    pixelLine(ctx, 25, 28, 30, 30, COLORS.ink, 2);
    return;
  }

  if (style === 'open') {
    outlinedEllipse(ctx, 25, 29, 5, 4, COLORS.ink, '#691b3b', 1);
    rect(ctx, 23, 31, 5, 1, COLORS.blush);
    rect(ctx, 22, 27, 7, 1, COLORS.white);
    return;
  }

  if (style === 'cute') {
    // A small open smile with a clearly visible tongue, matching its label.
    rect(ctx, 21, 27, 9, 5, COLORS.ink);
    rect(ctx, 23, 30, 5, 2, COLORS.blush);
    rect(ctx, 24, 29, 3, 1, COLORS.white);
    return;
  }

  if (style === 'epic') {
    rect(ctx, 19, 27, 13, 5, COLORS.ink);
    rect(ctx, 21, 27, 9, 1, COLORS.white);
    rect(ctx, 22, 30, 7, 1, COLORS.blush);
    rect(ctx, 20, 27, 1, 2, COLORS.ink);
    rect(ctx, 30, 27, 1, 2, COLORS.ink);
    return;
  }

  // Canonical small U-shaped smile.
  rect(ctx, 23, 27, 1, 3, COLORS.ink);
  rect(ctx, 27, 27, 1, 3, COLORS.ink);
  rect(ctx, 24, 29, 3, 1, COLORS.ink);
}

function drawArm(ctx, x0, y0, x1, y1) {
  pixelLine(ctx, x0, y0, x1, y1, COLORS.ink, 6);
  pixelLine(ctx, x0, y0, x1, y1, '#ffffff', 3);
  ellipse(ctx, x1, y1, 3, 3, COLORS.ink);
  ellipse(ctx, x1, y1, 2, 2, '#ffffff');
}

function drawBabitoFin(ctx, side, pose = 'rest', fillColor = '#ffffff') {
  const mirror = (x) => (side < 0 ? x : BABITO_DESIGN_SIZE - x);
  const mirroredRect = (x, y, width, height, color) => {
    rect(ctx, side < 0 ? x : BABITO_DESIGN_SIZE - x - width, y, width, height, color);
  };

  if (pose === 'rest') {
    // Hand-authored scanlines reproduce the short downward fin of the approved
    // 32 px base without polygon antialiasing turning it into a round earmuff.
    mirroredRect(9, 21, 4, 2, COLORS.ink);
    mirroredRect(5, 23, 8, 2, COLORS.ink);
    mirroredRect(1, 25, 12, 5, COLORS.ink);
    mirroredRect(3, 30, 10, 4, COLORS.ink);
    mirroredRect(6, 34, 6, 2, COLORS.ink);
    mirroredRect(8, 23, 4, 1, fillColor);
    mirroredRect(5, 24, 7, 2, fillColor);
    mirroredRect(3, 26, 9, 4, fillColor);
    mirroredRect(5, 30, 7, 3, fillColor);
    mirroredRect(7, 33, 4, 1, fillColor);
    return;
  }

  const pointsByPose = {
    rest: [[13, 21], [8, 22], [4, 27], [5, 33], [9, 34], [14, 29]],
    raised: [[14, 27], [9, 22], [7, 14], [10, 11], [14, 20]],
    attack: [[14, 21], [8, 20], [4, 23], [8, 27], [14, 28]],
    down: [[14, 24], [10, 27], [8, 37], [11, 39], [15, 30]],
    wide: [[14, 23], [9, 19], [4, 17], [6, 25], [14, 30]],
    flat: [[15, 28], [10, 31], [5, 35], [9, 37], [15, 32]],
  };
  const insetByPose = {
    rest: [[12, 23], [9, 24], [6, 27], [7, 31], [9, 32], [12, 28]],
    raised: [[13, 25], [10, 21], [9, 16], [10, 14], [12, 21]],
    attack: [[13, 23], [9, 22], [7, 23], [9, 25], [13, 26]],
    down: [[13, 26], [11, 28], [10, 35], [11, 37], [13, 29]],
    wide: [[13, 24], [10, 21], [7, 20], [8, 24], [13, 28]],
    flat: [[14, 29], [11, 32], [8, 34], [10, 35], [14, 31]],
  };
  polygon(ctx, pointsByPose[pose].map(([x, y]) => [mirror(x), y]), COLORS.ink);
  polygon(ctx, insetByPose[pose].map(([x, y]) => [mirror(x), y]), fillColor);
}

function drawBabitoArms(ctx, style, framePose = {}, fillColor = '#ffffff') {
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
    if (descriptor.includes('soft-out')) return 'rest';
    return 'rest';
  };

  if (style === 'spring') {
    // Keep the unmistakable zig-zag silhouette while the shared frame offsets
    // still give it the same timing as every other cosmetic arm choice.
    const handX = getBabitoSpringHandCenterX(motion, phase);
    pixelLine(ctx, 13, 27, 9, 24, COLORS.ink, 5);
    pixelLine(ctx, 9, 24, 12, 21, COLORS.ink, 5);
    pixelLine(ctx, 12, 21, 6, 17, COLORS.ink, 5);
    pixelLine(ctx, 35, 27, 39, 24, COLORS.ink, 5);
    pixelLine(ctx, 39, 24, 36, 21, COLORS.ink, 5);
    pixelLine(ctx, 36, 21, handX, 17, COLORS.ink, 5);
    pixelLine(ctx, 13, 27, 9, 24, fillColor, 2);
    pixelLine(ctx, 9, 24, 12, 21, fillColor, 2);
    pixelLine(ctx, 12, 21, 6, 17, fillColor, 2);
    pixelLine(ctx, 35, 27, 39, 24, fillColor, 2);
    pixelLine(ctx, 39, 24, 36, 21, fillColor, 2);
    pixelLine(ctx, 36, 21, handX, 17, fillColor, 2);
    ellipse(ctx, 6, 17, BABITO_SPRING_HAND_RADIUS, BABITO_SPRING_HAND_RADIUS, COLORS.ink);
    ellipse(ctx, handX, 17, BABITO_SPRING_HAND_RADIUS, BABITO_SPRING_HAND_RADIUS, COLORS.ink);
    ellipse(ctx, 6, 17, 2, 2, fillColor);
    ellipse(ctx, handX, 17, 2, 2, fillColor);
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
  drawBabitoFin(ctx, -1, leftPose, fillColor);
  drawBabitoFin(ctx, 1, rightPose, fillColor);
}

function drawStrawHat(ctx) {
  rect(ctx, 10, 11, 29, 5, COLORS.ink);
  rect(ctx, 12, 10, 25, 5, COLORS.yellow);
  rect(ctx, 16, 3, 17, 10, COLORS.ink);
  rect(ctx, 18, 4, 13, 8, COLORS.yellow);
  rect(ctx, 16, 9, 17, 4, COLORS.red);
  rect(ctx, 18, 5, 5, 2, COLORS.yellowLight);
}

function drawCowboyHat(ctx) {
  rect(ctx, 9, 12, 32, 5, COLORS.ink);
  rect(ctx, 12, 11, 26, 4, '#9c5730');
  polygon(ctx, [[15, 12], [17, 3], [22, 6], [30, 4], [35, 12]], COLORS.ink);
  polygon(ctx, [[18, 11], [19, 5], [23, 8], [29, 6], [32, 11]], '#b96b36');
  rect(ctx, 16, 10, 19, 3, '#5b2d23');
}

function drawCrown(ctx) {
  polygon(ctx, [[13, 15], [11, 4], [18, 9], [24, 2], [30, 9], [38, 4], [36, 15]], COLORS.ink);
  polygon(ctx, [[15, 13], [14, 7], [19, 11], [24, 5], [29, 11], [35, 7], [34, 13]], COLORS.yellow);
  rect(ctx, 15, 13, 20, 4, COLORS.ink);
  rect(ctx, 17, 13, 16, 2, COLORS.orange);
  rect(ctx, 23, 9, 3, 3, COLORS.red);
}

function drawSunglasses(ctx) {
  rect(ctx, 15, 19, 10, 7, COLORS.ink);
  rect(ctx, 27, 19, 10, 7, COLORS.ink);
  rect(ctx, 24, 21, 4, 2, COLORS.ink);
  rect(ctx, 16, 18, 8, 2, COLORS.ink);
  rect(ctx, 28, 18, 8, 2, COLORS.ink);
  rect(ctx, 17, 20, 6, 3, '#163f5c');
  rect(ctx, 29, 20, 6, 3, '#163f5c');
  rect(ctx, 18, 20, 2, 1, COLORS.cyanLight);
  rect(ctx, 30, 20, 2, 1, COLORS.cyanLight);
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

/**
 * Draws one fully composited Babito frame onto an 80 × 80 canvas context.
 * Phaser normally keeps every cosmetic in a separate atlas; this deterministic
 * export path lets the landing reuse the exact same authored renderer.
 */
export function drawBabitoCompositeFrame(ctx, {
  body = 'cyan',
  eyes = 'normal',
  mouth = 'smile',
  arms = 'round',
  headAccessory = 'none',
  frame = 0,
} = {}) {
  if (!ctx || typeof ctx.save !== 'function') {
    throw new TypeError('drawBabitoCompositeFrame requires a 2D canvas context.');
  }

  const bodyId = String(body).replace(/^body_/, '');
  const palette = BABITO_PALETTES[bodyId] ?? BABITO_PALETTES.cyan;
  const safeFrame = Number.isInteger(Number(frame))
    ? Math.max(0, Math.min(BABITO_ANIMATION_FRAME_COUNT - 1, Number(frame)))
    : 0;
  const pose = BABITO_FRAME_POSES[safeFrame] ?? BABITO_FRAME_POSES[0];
  const transform = getBabitoPoseTransform(pose);
  const eyeStyle = String(eyes).replace(/^eyes_/, '');
  const mouthStyle = String(mouth).replace(/^mouth_/, '');
  const armStyle = String(arms).replace(/^arms_/, '');
  const headStyle = String(headAccessory).replace(/^head_/, '');
  const drawLayers = (targetContext) => withPixelGridScale(
    targetContext,
    BABITO_DETAIL_SCALE,
    () => {
      drawBabitoArms(targetContext, armStyle, pose, palette.main);
      drawBabitoBody(targetContext, palette, pose);
      drawBabitoEyes(targetContext, eyeStyle, pose);
      drawBabitoMouth(targetContext, mouthStyle, pose);
      if (headStyle === 'straw_hat' || headStyle === 'strawhat') drawStrawHat(targetContext);
      else if (headStyle === 'cowboy_hat' || headStyle === 'cowboyhat') drawCowboyHat(targetContext);
      else if (headStyle === 'crown') drawCrown(targetContext);
    },
  );

  ctx.clearRect(0, 0, BABITO_TEXTURE_SIZE, BABITO_TEXTURE_SIZE);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(
    BABITO_TEXTURE_SIZE / 2 + transform.offsetX,
    BABITO_TEXTURE_SIZE / 2 + transform.offsetY,
  );
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scaleX, transform.scaleY);
  ctx.translate(-BABITO_ART_SIZE / 2, -BABITO_ART_SIZE / 2);
  const scratchSize = BABITO_ART_SIZE + BABITO_ART_MARGIN * 2;
  const scratch = createScratchCanvas(scratchSize, ctx);
  const scratchContext = scratch?.getContext('2d');
  if (scratchContext) {
    scratchContext.imageSmoothingEnabled = false;
    scratchContext.save();
    scratchContext.translate(BABITO_ART_MARGIN, BABITO_ART_MARGIN);
    drawLayers(scratchContext);
    scratchContext.restore();
    ctx.drawImage(scratch, -BABITO_ART_MARGIN, -BABITO_ART_MARGIN);
  } else {
    drawLayers(ctx);
  }
  ctx.restore();
  snapCanvasAlpha(ctx, BABITO_TEXTURE_SIZE, BABITO_TEXTURE_SIZE);
  return ctx;
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

function drawJungleGround(ctx) {
  rect(ctx, 0, 0, 32, 32, '#2c1a17');
  rect(ctx, 1, 8, 30, 24, '#4a2d22');
  rect(ctx, 0, 0, 32, 9, COLORS.ink);
  rect(ctx, 0, 1, 32, 6, '#2f8f3c');
  rect(ctx, 0, 1, 32, 2, '#7fd94c');
  // Moss drips and leaf tips break the straight edge.
  rect(ctx, 2, 7, 3, 4, '#2f8f3c');
  rect(ctx, 13, 7, 2, 5, '#2f8f3c');
  rect(ctx, 22, 7, 4, 3, '#2f8f3c');
  rect(ctx, 7, 0, 3, 2, '#b6f06a');
  rect(ctx, 26, 0, 2, 2, '#b6f06a');
  // Roots crossing the earth.
  pixelLine(ctx, 4, 15, 12, 21, '#6b4330', 2);
  pixelLine(ctx, 20, 13, 27, 20, '#6b4330', 2);
  rect(ctx, 16, 25, 5, 3, '#6b4330');
  rect(ctx, 6, 27, 3, 3, '#1f1210');
  rect(ctx, 25, 24, 3, 3, '#1f1210');
}

function drawBranch(ctx) {
  rect(ctx, 0, 0, 32, 16, COLORS.ink);
  rect(ctx, 0, 5, 32, 10, '#6b4330');
  rect(ctx, 0, 6, 32, 2, '#94603f');
  rect(ctx, 0, 1, 32, 5, '#2f8f3c');
  rect(ctx, 0, 1, 32, 2, '#7fd94c');
  rect(ctx, 6, 6, 4, 3, '#2f8f3c');
  rect(ctx, 21, 6, 5, 2, '#2f8f3c');
  rect(ctx, 12, 11, 7, 2, '#4a2d22');
  rect(ctx, 26, 10, 3, 3, '#4a2d22');
}

function drawBridge(ctx) {
  // Planks hang a little below the rope; the gaps stay transparent.
  rect(ctx, 0, 1, 32, 2, '#c99a5b');
  rect(ctx, 0, 3, 32, 1, '#5e3827');
  for (const x of [0, 11, 22]) {
    rect(ctx, x, 4, 9, 9, COLORS.ink);
    rect(ctx, x + 1, 4, 7, 7, '#b0703f');
    rect(ctx, x + 1, 4, 7, 2, '#d99a5c');
    rect(ctx, x + 3, 8, 3, 1, '#7a4528');
  }
  rect(ctx, 4, 0, 2, 5, '#e3c38a');
  rect(ctx, 26, 0, 2, 5, '#e3c38a');
}

function drawRuin(ctx) {
  rect(ctx, 0, 0, 32, 32, COLORS.ink);
  rect(ctx, 1, 1, 30, 30, '#5f6f62');
  rect(ctx, 2, 2, 13, 13, '#7d8f7c');
  rect(ctx, 17, 2, 13, 13, '#6e8070');
  rect(ctx, 2, 17, 9, 13, '#6e8070');
  rect(ctx, 13, 17, 17, 13, '#7d8f7c');
  rect(ctx, 15, 1, 2, 15, '#2c3a33');
  rect(ctx, 1, 15, 30, 2, '#2c3a33');
  rect(ctx, 11, 17, 2, 14, '#2c3a33');
  // An old carved spiral and creeping moss.
  rect(ctx, 19, 20, 7, 2, '#3f4c44');
  rect(ctx, 24, 20, 2, 6, '#3f4c44');
  rect(ctx, 19, 24, 5, 2, '#3f4c44');
  rect(ctx, 0, 0, 32, 4, '#2f8f3c');
  rect(ctx, 0, 0, 32, 2, '#7fd94c');
  rect(ctx, 3, 4, 3, 5, '#2f8f3c');
  rect(ctx, 23, 4, 2, 3, '#2f8f3c');
  rect(ctx, 4, 6, 6, 2, '#a7b8a4');
}

function drawSpringMushroom(ctx) {
  // Stem.
  rect(ctx, 16, 17, 16, 15, COLORS.ink);
  rect(ctx, 18, 17, 12, 13, '#f3e3c2');
  rect(ctx, 18, 17, 3, 13, '#d4bf98');
  // Cap.
  outlinedEllipse(ctx, 24, 14, 22, 11, COLORS.ink, '#ff4f6d', 2);
  rect(ctx, 6, 16, 36, 4, '#c42d52');
  rect(ctx, 10, 6, 8, 3, '#ff9aa9');
  // Spots.
  rect(ctx, 12, 9, 5, 4, COLORS.white);
  rect(ctx, 27, 6, 6, 4, COLORS.white);
  rect(ctx, 34, 12, 4, 3, COLORS.white);
  rect(ctx, 20, 13, 3, 3, COLORS.white);
}

function drawBossDarkness(ctx) {
  const rim = '#b45cff';
  const glow = '#7a2fd0';
  const body = '#0b0614';
  // Curling tentacles behind the body (canonical: no fixed shape).
  for (const [x0, y0, x1, y1, x2, y2] of [
    [26, 40, 12, 26, 18, 10], [70, 40, 84, 26, 78, 10], [22, 58, 6, 54, 4, 40], [74, 58, 90, 54, 92, 40],
  ]) {
    pixelLine(ctx, x0, y0, x1, y1, glow, 7);
    pixelLine(ctx, x1, y1, x2, y2, glow, 5);
    pixelLine(ctx, x0, y0, x1, y1, body, 5);
    pixelLine(ctx, x1, y1, x2, y2, body, 3);
  }
  // Purple rim, then the black mass with wisps dripping below.
  ellipse(ctx, 48, 50, 33, 30, glow);
  ellipse(ctx, 48, 30, 21, 19, glow);
  ellipse(ctx, 48, 50, 31, 28, body);
  ellipse(ctx, 48, 30, 19, 17, body);
  for (const [x, length] of [[22, 22], [34, 30], [46, 26], [58, 32], [70, 20]]) {
    rect(ctx, x - 1, 70, 10, length, glow);
    rect(ctx, x, 70, 8, length - 2, body);
  }
  rect(ctx, 30, 16, 6, 3, rim);
  rect(ctx, 60, 14, 5, 3, rim);
  rect(ctx, 18, 46, 3, 8, rim);
  rect(ctx, 76, 44, 3, 9, rim);
  // Angry slanted glowing eyes; no mouth.
  polygon(ctx, [[30, 36], [44, 41], [42, 47], [31, 43]], rim);
  polygon(ctx, [[66, 36], [52, 41], [54, 47], [65, 43]], rim);
  polygon(ctx, [[33, 38], [42, 42], [41, 45], [33, 42]], '#f1e3ff');
  polygon(ctx, [[63, 38], [54, 42], [55, 45], [63, 42]], '#f1e3ff');
}

function drawLantern(ctx, lit) {
  rect(ctx, 12, 0, 4, 6, COLORS.ink);
  rect(ctx, 6, 5, 16, 5, COLORS.ink);
  rect(ctx, 8, 6, 12, 3, '#9a6a3a');
  rect(ctx, 4, 10, 20, 24, COLORS.ink);
  rect(ctx, 6, 12, 16, 20, lit ? '#ffe9a0' : '#2b3a4a');
  if (lit) {
    rect(ctx, 10, 15, 8, 13, '#ffb43c');
    rect(ctx, 12, 18, 4, 8, '#fff7d6');
  } else {
    rect(ctx, 11, 22, 6, 6, '#4a5c6e');
  }
  rect(ctx, 6, 21, 16, 2, COLORS.ink);
  rect(ctx, 13, 12, 2, 20, COLORS.ink);
  rect(ctx, 6, 34, 16, 5, COLORS.ink);
  rect(ctx, 8, 35, 12, 3, '#9a6a3a');
}

function drawPowerApple(ctx) {
  outlinedEllipse(ctx, 16, 19, 12, 11, COLORS.ink, '#ffcf3c', 2);
  ellipse(ctx, 12, 15, 4, 3, '#fff3b0');
  rect(ctx, 20, 21, 4, 4, '#e8a21a');
  rect(ctx, 15, 3, 3, 7, '#6b4330');
  rect(ctx, 18, 4, 8, 4, '#4fb748');
  rect(ctx, 20, 3, 5, 2, '#7fd94c');
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

// Canvas resamples the detailed 64 px art through fractional pose transforms, leaving a
// soft halo of half-transparent pixels. Menus enlarge the Babito 3-4x with
// nearest filtering, which turns that halo into a blurry, dirty outline.
// Snapping alpha restores a crisp pixel-art silhouette at every scale.
const BABITO_ALPHA_THRESHOLD = 128;

export function snapPixelAlpha(data, threshold = BABITO_ALPHA_THRESHOLD) {
  for (let index = 3; index < data.length; index += 4) {
    data[index] = data[index] >= threshold ? 255 : 0;
  }
  return data;
}

function snapCanvasAlpha(ctx, width, height) {
  if (typeof ctx.getImageData !== 'function') return;
  const image = ctx.getImageData(0, 0, width, height);
  snapPixelAlpha(image.data);
  ctx.putImageData(image, 0, 0);
}

// Babito coordinates remain on the stable 48-unit design grid, but every layer
// is rasterized onto a true 64 px detail grid before pose transforms. This adds
// scanlines to the curve instead of merely enlarging the old staircase.
const BABITO_ART_MARGIN = 8;

function createScratchCanvas(size, templateContext = null) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(size, size);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }
  const CanvasConstructor = templateContext?.canvas?.constructor;
  if (typeof CanvasConstructor === 'function') {
    try {
      return new CanvasConstructor(size, size);
    } catch {
      // A browser's HTMLCanvasElement constructor is not directly callable.
    }
  }
  return null;
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
      const scratchSize = BABITO_ART_SIZE + BABITO_ART_MARGIN * 2;
      const scratch = createScratchCanvas(scratchSize, ctx);
      const scratchCtx = scratch?.getContext('2d');
      if (scratchCtx) scratchCtx.imageSmoothingEnabled = false;
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
        if (scratchCtx) {
          scratchCtx.clearRect(0, 0, scratchSize, scratchSize);
          scratchCtx.save();
          scratchCtx.translate(BABITO_ART_MARGIN, BABITO_ART_MARGIN);
          withPixelGridScale(
            scratchCtx,
            BABITO_DETAIL_SCALE,
            () => drawFrame(scratchCtx, pose, frameIndex),
          );
          scratchCtx.restore();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(scratch, -BABITO_ART_MARGIN, -BABITO_ART_MARGIN);
        } else {
          withPixelGridScale(
            ctx,
            BABITO_DETAIL_SCALE,
            () => drawFrame(ctx, pose, frameIndex),
          );
        }
        ctx.restore();
      });
      snapCanvasAlpha(ctx, width, height);
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
    [TEXTURE_KEYS.tileJungleGround, 32, 32, drawJungleGround],
    [TEXTURE_KEYS.tileBranch, 32, 16, drawBranch],
    [TEXTURE_KEYS.tileBridge, 32, 16, drawBridge],
    [TEXTURE_KEYS.tileRuin, 32, 32, drawRuin],
    [TEXTURE_KEYS.springMushroom, 48, 32, drawSpringMushroom],
    [TEXTURE_KEYS.bossDarkness, 96, 96, drawBossDarkness],
    [TEXTURE_KEYS.lanternOff, 28, 40, (ctx) => drawLantern(ctx, false)],
    [TEXTURE_KEYS.lanternOn, 28, 40, (ctx) => drawLantern(ctx, true)],
    [TEXTURE_KEYS.powerApple, 32, 32, drawPowerApple],
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
