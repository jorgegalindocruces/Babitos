import Phaser from 'phaser';

/** Native size shared by every composable Babito layer. */
export const BABITO_TEXTURE_SIZE = 48;

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

function drawBabitoBody(ctx, palette) {
  // Feet are behind the body so the layer still reads as one compact silhouette.
  rect(ctx, 13, 35, 11, 7, COLORS.ink);
  rect(ctx, 27, 35, 9, 7, COLORS.ink);
  rect(ctx, 15, 35, 8, 4, palette.shade);
  rect(ctx, 28, 35, 7, 4, palette.shade);
  rect(ctx, 14, 39, 10, 2, palette.main);
  rect(ctx, 27, 39, 9, 2, palette.main);

  outlinedEllipse(ctx, 24, 25, 17, 15, COLORS.ink, palette.main, 2);
  rect(ctx, 13, 15, 7, 2, palette.light);
  rect(ctx, 11, 18, 3, 7, palette.light);
  rect(ctx, 12, 34, 24, 3, palette.shade);
  rect(ctx, 34, 22, 3, 10, palette.shade);
  rect(ctx, 13, 27, 4, 3, COLORS.blush);
  rect(ctx, 32, 27, 4, 3, COLORS.blush);
}

function drawBabitoEyes(ctx, style) {
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
    rect(ctx, 16, 20, 7, 8, COLORS.ink);
    rect(ctx, 18, 22, 2, 2, COLORS.white);
    rect(ctx, 28, 22, 4, 5, COLORS.ink);
    rect(ctx, 29, 22, 1, 1, COLORS.white);
    return;
  }

  rect(ctx, 18, 20, 4, 8, COLORS.ink);
  rect(ctx, 28, 20, 4, 8, COLORS.ink);
}

function drawBabitoMouth(ctx, style) {
  if (style === 'open') {
    outlinedEllipse(ctx, 25, 31, 6, 5, COLORS.ink, '#691b3b', 1);
    rect(ctx, 22, 33, 6, 2, COLORS.blush);
    rect(ctx, 21, 28, 8, 2, COLORS.white);
    return;
  }

  if (style === 'cute') {
    rect(ctx, 24, 29, 2, 2, COLORS.ink);
    pixelLine(ctx, 24, 31, 21, 33, COLORS.ink, 1);
    pixelLine(ctx, 25, 31, 28, 33, COLORS.ink, 1);
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

function drawBabitoArms(ctx, pose) {
  if (pose === 'raised' || pose === 'hero') {
    drawArm(ctx, 12, 27, 6, 16);
    drawArm(ctx, 37, 27, 43, 16);
    return;
  }
  if (pose === 'spring') {
    pixelLine(ctx, 12, 27, 8, 24, COLORS.ink, 6);
    pixelLine(ctx, 8, 24, 12, 20, COLORS.ink, 6);
    pixelLine(ctx, 12, 20, 6, 16, COLORS.ink, 6);
    pixelLine(ctx, 37, 27, 41, 24, COLORS.ink, 6);
    pixelLine(ctx, 41, 24, 37, 20, COLORS.ink, 6);
    pixelLine(ctx, 37, 20, 43, 16, COLORS.ink, 6);
    pixelLine(ctx, 12, 27, 8, 24, '#ffffff', 2);
    pixelLine(ctx, 8, 24, 12, 20, '#ffffff', 2);
    pixelLine(ctx, 12, 20, 6, 16, '#ffffff', 2);
    pixelLine(ctx, 37, 27, 41, 24, '#ffffff', 2);
    pixelLine(ctx, 41, 24, 37, 20, '#ffffff', 2);
    pixelLine(ctx, 37, 20, 43, 16, '#ffffff', 2);
    ellipse(ctx, 6, 16, 3, 3, COLORS.ink);
    ellipse(ctx, 43, 16, 3, 3, COLORS.ink);
    ellipse(ctx, 6, 16, 2, 2, '#ffffff');
    ellipse(ctx, 43, 16, 2, 2, '#ffffff');
    return;
  }
  if (pose === 'attack') {
    drawArm(ctx, 12, 27, 6, 29);
    drawArm(ctx, 37, 25, 46, 22);
    return;
  }
  drawArm(ctx, 12, 27, 6, 29);
  drawArm(ctx, 37, 27, 43, 29);
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

function getTextureSpecs() {
  const specs = [];
  for (const [id, palette] of Object.entries(BABITO_PALETTES)) {
    specs.push([TEXTURE_KEYS.body[id], BABITO_TEXTURE_SIZE, BABITO_TEXTURE_SIZE, (ctx) => drawBabitoBody(ctx, palette)]);
  }

  specs.push(
    [TEXTURE_KEYS.eyes.normal, 48, 48, (ctx) => drawBabitoEyes(ctx, 'normal')],
    [TEXTURE_KEYS.eyes.big, 48, 48, (ctx) => drawBabitoEyes(ctx, 'big')],
    [TEXTURE_KEYS.eyes.cute, 48, 48, (ctx) => drawBabitoEyes(ctx, 'cute')],
    [TEXTURE_KEYS.eyes.crazy, 48, 48, (ctx) => drawBabitoEyes(ctx, 'crazy')],
    [TEXTURE_KEYS.mouth.smile, 48, 48, (ctx) => drawBabitoMouth(ctx, 'smile')],
    [TEXTURE_KEYS.mouth.open, 48, 48, (ctx) => drawBabitoMouth(ctx, 'open')],
    [TEXTURE_KEYS.mouth.cute, 48, 48, (ctx) => drawBabitoMouth(ctx, 'cute')],
    [TEXTURE_KEYS.mouth.epic, 48, 48, (ctx) => drawBabitoMouth(ctx, 'epic')],
    [TEXTURE_KEYS.arms.default, 48, 48, (ctx) => drawBabitoArms(ctx, 'default')],
    [TEXTURE_KEYS.arms.round, 48, 48, (ctx) => drawBabitoArms(ctx, 'default')],
    [TEXTURE_KEYS.arms.hero, 48, 48, (ctx) => drawBabitoArms(ctx, 'hero')],
    [TEXTURE_KEYS.arms.spring, 48, 48, (ctx) => drawBabitoArms(ctx, 'spring')],
    [TEXTURE_KEYS.arms.raised, 48, 48, (ctx) => drawBabitoArms(ctx, 'raised')],
    [TEXTURE_KEYS.arms.attack, 48, 48, (ctx) => drawBabitoArms(ctx, 'attack')],
    [TEXTURE_KEYS.head.none, 48, 48, () => {}],
    [TEXTURE_KEYS.head.strawHat, 48, 48, drawStrawHat],
    [TEXTURE_KEYS.head.cowboyHat, 48, 48, drawCowboyHat],
    [TEXTURE_KEYS.head.crown, 48, 48, drawCrown],
    [TEXTURE_KEYS.glasses.none, 48, 48, () => {}],
    [TEXTURE_KEYS.glasses.sunglasses, 48, 48, drawSunglasses],
    [TEXTURE_KEYS.neck.none, 48, 48, () => {}],
    [TEXTURE_KEYS.neck.bowtie, 48, 48, drawBowtie],
    [TEXTURE_KEYS.neck.heroCape, 48, 48, drawHeroCape],
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

function generateCanvasTexture(scene, key, width, height, draw, overwrite) {
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
  texture.refresh();
  const nearestFilter = Phaser.Textures?.FilterMode?.NEAREST;
  if (nearestFilter !== undefined) texture.setFilter?.(nearestFilter);
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
  for (const [key, width, height, draw] of getTextureSpecs()) {
    const wasCreated = generateCanvasTexture(scene, key, width, height, draw, overwrite);
    (wasCreated ? created : skipped).push(key);
  }

  return { created, skipped, keys: TEXTURE_KEYS };
}

export default createTextures;
