import { ENEMY_SHEET_ASSETS } from './EnemyAnimations.js';

const LOGICAL_SIZE = 32;
const PIXEL_SCALE = 2;
const NEAREST_FILTER = 1;

const COLORS = Object.freeze({
  ink: '#17102e',
  white: '#fffaf0',
  pupil: '#120d24',
  purpleDark: '#4a1688',
  purple: '#7b25be',
  purpleLight: '#ae3bd0',
  wingDark: '#7b1d73',
  wing: '#d83f91',
  greenDark: '#167b2e',
  green: '#36d43c',
  greenLight: '#72ed55',
  yellowDark: '#c58400',
  yellow: '#ffd52e',
  red: '#e34261',
});

export const PROCEDURAL_ENEMY_SHEETS = Object.freeze({
  vuela: Object.freeze({ rows: 6, columns: 6, cellWidth: 64, cellHeight: 64 }),
  da_vueltas: Object.freeze({ rows: 5, columns: 6, cellWidth: 64, cellHeight: 64 }),
});

function createSurface() {
  return Array(LOGICAL_SIZE * LOGICAL_SIZE).fill(null);
}

function setPixel(surface, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || px >= LOGICAL_SIZE || py < 0 || py >= LOGICAL_SIZE) return;
  surface[py * LOGICAL_SIZE + px] = color;
}

function fillRect(surface, x, y, width, height, color) {
  for (let py = Math.floor(y); py < Math.ceil(y + height); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(x + width); px += 1) {
      setPixel(surface, px, py, color);
    }
  }
}

function fillEllipse(surface, centerX, centerY, radiusX, radiusY, color) {
  const left = Math.floor(centerX - radiusX);
  const right = Math.ceil(centerX + radiusX);
  const top = Math.floor(centerY - radiusY);
  const bottom = Math.ceil(centerY + radiusY);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = (x - centerX) / Math.max(1, radiusX);
      const dy = (y - centerY) / Math.max(1, radiusY);
      if ((dx * dx) + (dy * dy) <= 1) setPixel(surface, x, y, color);
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previous];
    const crosses = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}

function fillPolygon(surface, points, color) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.floor(Math.min(...xs));
  const right = Math.ceil(Math.max(...xs));
  const top = Math.floor(Math.min(...ys));
  const bottom = Math.ceil(Math.max(...ys));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) setPixel(surface, x, y, color);
    }
  }
}

function mirrorPoints(points) {
  return points.map(([x, y]) => [LOGICAL_SIZE - x, y]);
}

function drawEye(surface, x, y, { closed = false, hurt = false, pupilX = 0 } = {}) {
  if (hurt) {
    setPixel(surface, x - 1, y - 1, COLORS.ink);
    setPixel(surface, x + 1, y - 1, COLORS.ink);
    setPixel(surface, x, y, COLORS.ink);
    setPixel(surface, x - 1, y + 1, COLORS.ink);
    setPixel(surface, x + 1, y + 1, COLORS.ink);
    return;
  }
  if (closed) {
    fillRect(surface, x - 2, y, 5, 1, COLORS.ink);
    setPixel(surface, x - 2, y - 1, COLORS.ink);
    setPixel(surface, x + 2, y - 1, COLORS.ink);
    return;
  }
  fillEllipse(surface, x, y, 3, 4, COLORS.ink);
  fillEllipse(surface, x, y, 2, 3, COLORS.white);
  fillRect(surface, x + pupilX, y - 1, 2, 3, COLORS.pupil);
  setPixel(surface, x + pupilX, y - 1, COLORS.white);
}

function drawBatWing(surface, side, centerY, mode, phase) {
  let outer;
  let inner;
  if (mode === 'collapsed') {
    outer = [[13, centerY - 3], [8, centerY - 2], [3, centerY], [7, centerY + 3], [13, centerY + 2]];
    inner = [[12, centerY - 1], [8, centerY - 1], [5, centerY], [8, centerY + 1], [12, centerY + 1]];
  } else if (mode === 'up') {
    outer = [[13, centerY + 3], [10, centerY - 7 - phase], [7, centerY - 10 - phase], [5, centerY - 5], [2, centerY - 8], [3, centerY + 3], [8, centerY + 7], [13, centerY + 6]];
    inner = [[12, centerY + 3], [10, centerY - 4 - phase], [7, centerY - 7 - phase], [6, centerY - 2], [4, centerY - 4], [5, centerY + 2], [9, centerY + 5], [12, centerY + 5]];
  } else if (mode === 'down') {
    outer = [[13, centerY - 3], [8, centerY - 1], [4, centerY + 3], [2, centerY + 8], [7, centerY + 6], [9, centerY + 10 + phase], [13, centerY + 5]];
    inner = [[12, centerY - 1], [8, centerY + 1], [5, centerY + 4], [4, centerY + 6], [8, centerY + 4], [9, centerY + 7 + phase], [12, centerY + 4]];
  } else if (mode === 'swept') {
    outer = [[13, centerY - 4], [10, centerY - 10], [7, centerY - 12 - phase], [7, centerY - 4], [4, centerY - 7], [8, centerY + 5], [13, centerY + 7]];
    inner = [[12, centerY - 3], [10, centerY - 7], [8, centerY - 9 - phase], [8, centerY - 2], [6, centerY - 4], [9, centerY + 4], [12, centerY + 5]];
  } else {
    outer = [[13, centerY - 4], [8, centerY - 7 - phase], [4, centerY - 5], [2, centerY], [5, centerY + 1], [3, centerY + 6], [9, centerY + 5], [13, centerY + 4]];
    inner = [[12, centerY - 2], [8, centerY - 5 - phase], [5, centerY - 3], [4, centerY], [7, centerY], [5, centerY + 4], [9, centerY + 3], [12, centerY + 3]];
  }
  if (side > 0) {
    outer = mirrorPoints(outer);
    inner = mirrorPoints(inner);
  }
  fillPolygon(surface, outer, COLORS.ink);
  fillPolygon(surface, inner, COLORS.wing);
  const ribX = side < 0 ? 9 : 23;
  fillRect(surface, ribX, centerY - 3, 1, 7, COLORS.wingDark);
}

function drawVuelaFrame(row, column) {
  const surface = createSurface();
  const bob = [0, -1, -1, 0, 1, 0][column];
  let centerY = 17 + bob;
  let wingMode = 'mid';
  let wingPhase = column % 3;
  let bodyRadiusX = 7;
  let bodyRadiusY = 7;
  let hurt = false;
  let closed = false;
  let attack = false;

  if (row === 0) {
    wingMode = column % 2 === 0 ? 'mid' : 'down';
    closed = column === 3;
  } else if (row === 1) {
    wingMode = ['up', 'mid', 'down', 'down', 'mid', 'up'][column];
    wingPhase = column === 0 || column === 5 ? 2 : 0;
  } else if (row === 2) {
    wingMode = 'swept';
    centerY = 17 + Math.min(3, column);
    bodyRadiusX = 6;
    bodyRadiusY = 8;
  } else if (row === 3) {
    wingMode = column < 2 ? 'up' : (column < 4 ? 'mid' : 'down');
    attack = true;
    bodyRadiusX = 8;
  } else if (row === 4) {
    wingMode = column % 2 === 0 ? 'down' : 'mid';
    centerY = 17 + (column % 2);
    hurt = true;
  } else {
    const fall = Math.min(8, column * 2);
    centerY = 18 + fall;
    wingMode = 'collapsed';
    hurt = true;
    bodyRadiusX = 7 + Math.floor(column / 3);
    bodyRadiusY = Math.max(2, 7 - column);
  }

  drawBatWing(surface, -1, centerY, wingMode, wingPhase);
  drawBatWing(surface, 1, centerY, wingMode, wingPhase);
  fillEllipse(surface, 16, centerY, bodyRadiusX + 1, bodyRadiusY + 1, COLORS.ink);
  fillEllipse(surface, 16, centerY, bodyRadiusX, bodyRadiusY, COLORS.purple);
  fillEllipse(surface, 14, centerY - 3, Math.max(2, bodyRadiusX - 3), 2, COLORS.purpleLight);
  fillRect(surface, 15, centerY - bodyRadiusY - 2, 2, 3, COLORS.purpleDark);
  setPixel(surface, 13, centerY - bodyRadiusY - 1, COLORS.purpleDark);
  setPixel(surface, 18, centerY - bodyRadiusY - 1, COLORS.purpleDark);

  if (bodyRadiusY >= 5) {
    drawEye(surface, 13, centerY - 1, { closed, hurt, pupilX: row === 2 ? 1 : 0 });
    drawEye(surface, 19, centerY - 1, { closed, hurt, pupilX: row === 2 ? 1 : 0 });
    if (attack && column >= 1 && column <= 4) {
      fillEllipse(surface, 16, centerY + 5, 5, 4, COLORS.ink);
      fillRect(surface, 13, centerY + 4, 6, 3, COLORS.red);
      setPixel(surface, 13, centerY + 2, COLORS.white);
      setPixel(surface, 18, centerY + 2, COLORS.white);
    } else {
      fillRect(surface, 15, centerY + 3, 3, 1, COLORS.ink);
      setPixel(surface, 14, centerY + 3, COLORS.white);
      setPixel(surface, 19, centerY + 3, COLORS.white);
      setPixel(surface, 14, centerY + 4, COLORS.white);
      setPixel(surface, 19, centerY + 4, COLORS.white);
    }
  }

  if (row === 4 && column % 2 === 0) {
    setPixel(surface, 25, 7, COLORS.yellow);
    setPixel(surface, 24, 8, COLORS.yellow);
    setPixel(surface, 26, 8, COLORS.yellow);
    setPixel(surface, 25, 9, COLORS.yellow);
  }
  return surface;
}

function drawSpike(surface, centerX, centerY, radiusX, radiusY, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const baseX = centerX + cos * (radiusX - 1);
  const baseY = centerY + sin * (radiusY - 1);
  const tangentX = -sin * 2.3;
  const tangentY = cos * 2.3;
  const tipX = centerX + cos * (radiusX + 3);
  const tipY = centerY + sin * (radiusY + 3);
  const outer = [
    [baseX + tangentX, baseY + tangentY],
    [tipX, tipY],
    [baseX - tangentX, baseY - tangentY],
  ];
  fillPolygon(surface, outer, COLORS.ink);
  const inner = [
    [baseX + tangentX * 0.55, baseY + tangentY * 0.55],
    [centerX + cos * (radiusX + 2), centerY + sin * (radiusY + 2)],
    [baseX - tangentX * 0.55, baseY - tangentY * 0.55],
  ];
  fillPolygon(surface, inner, COLORS.yellow);
}

function drawDaVueltasFrame(row, column) {
  const surface = createSurface();
  let centerX = 16;
  let centerY = 16;
  let radiusX = 9;
  let radiusY = 9;
  let hurt = false;
  let closed = false;

  if (row === 0) {
    centerY += [0, -1, 0, 1, 0, -1][column];
    closed = column === 3;
  } else if (row === 1) {
    centerX += [0, 1, 1, 0, -1, -1][column];
  } else if (row === 2) {
    radiusX = [9, 10, 11, 10, 9, 8][column];
    radiusY = [9, 8, 7, 8, 9, 10][column];
    centerY += 9 - radiusY;
    closed = column >= 1 && column <= 3;
  } else if (row === 3) {
    hurt = true;
    centerY += column % 2;
    radiusX = 10;
    radiusY = 8;
  } else {
    hurt = true;
    centerY = 17 + Math.min(7, column * 2);
    radiusX = 9 + Math.floor(column / 2);
    radiusY = Math.max(2, 8 - column);
  }

  const spikeCount = row === 4 && column >= 4 ? 6 : 10;
  for (let index = 0; index < spikeCount; index += 1) {
    const angle = ((Math.PI * 2 * index) / spikeCount) + (row === 1 ? column * 0.18 : 0);
    drawSpike(surface, centerX, centerY, radiusX, radiusY, angle);
  }
  fillEllipse(surface, centerX, centerY, radiusX + 1, radiusY + 1, COLORS.ink);
  fillEllipse(surface, centerX, centerY, radiusX, radiusY, COLORS.greenDark);
  fillEllipse(surface, centerX, centerY - 1, Math.max(2, radiusX - 1), Math.max(2, radiusY - 2), COLORS.green);
  fillEllipse(surface, centerX - 3, centerY - Math.max(2, radiusY / 2), 3, 2, COLORS.greenLight);

  if (radiusY >= 5) {
    const eyeY = centerY - 1;
    drawEye(surface, centerX - 3, eyeY, { closed, hurt, pupilX: 1 });
    drawEye(surface, centerX + 3, eyeY, { closed, hurt, pupilX: 1 });
    fillRect(surface, centerX - 1, centerY + 4, 4, 1, COLORS.ink);
    setPixel(surface, centerX - 2, centerY + 4, COLORS.white);
    setPixel(surface, centerX + 3, centerY + 4, COLORS.white);
    setPixel(surface, centerX - 2, centerY + 5, COLORS.white);
    setPixel(surface, centerX + 3, centerY + 5, COLORS.white);
  } else {
    fillRect(surface, centerX - 3, centerY, 7, 1, COLORS.ink);
    setPixel(surface, centerX - 2, centerY + 1, COLORS.white);
    setPixel(surface, centerX + 2, centerY + 1, COLORS.white);
  }
  return surface;
}

function paintSurface(context, surface, offsetX, offsetY) {
  for (let y = 0; y < LOGICAL_SIZE; y += 1) {
    for (let x = 0; x < LOGICAL_SIZE; x += 1) {
      const color = surface[y * LOGICAL_SIZE + x];
      if (!color) continue;
      context.fillStyle = color;
      context.fillRect(
        offsetX + x * PIXEL_SCALE,
        offsetY + y * PIXEL_SCALE,
        PIXEL_SCALE,
        PIXEL_SCALE,
      );
    }
  }
}

const PROCEDURAL_DRAWERS = Object.freeze({
  vuela: drawVuelaFrame,
  da_vueltas: drawDaVueltasFrame,
});

export function getProceduralFramePixelBounds(type, row, column) {
  const drawFrame = PROCEDURAL_DRAWERS[type];
  if (!drawFrame) return null;
  const surface = drawFrame(row, column);
  let left = LOGICAL_SIZE;
  let right = -1;
  let top = LOGICAL_SIZE;
  let bottom = -1;
  let pixels = 0;
  for (let y = 0; y < LOGICAL_SIZE; y += 1) {
    for (let x = 0; x < LOGICAL_SIZE; x += 1) {
      if (!surface[y * LOGICAL_SIZE + x]) continue;
      pixels += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return Object.freeze({ left, right, top, bottom, pixels });
}

function createSheet(scene, type, drawFrame) {
  const definition = PROCEDURAL_ENEMY_SHEETS[type];
  const asset = ENEMY_SHEET_ASSETS[type];
  if (scene.textures.exists(asset.key)) return;
  const texture = scene.textures.createCanvas(
    asset.key,
    definition.columns * definition.cellWidth,
    definition.rows * definition.cellHeight,
  );
  const context = texture.context;
  context.clearRect(0, 0, texture.width, texture.height);
  context.imageSmoothingEnabled = false;
  for (let row = 0; row < definition.rows; row += 1) {
    for (let column = 0; column < definition.columns; column += 1) {
      paintSurface(
        context,
        drawFrame(row, column),
        column * definition.cellWidth,
        row * definition.cellHeight,
      );
    }
  }
  texture.refresh();
  texture.setFilter?.(NEAREST_FILTER);
}

export function createProceduralEnemySheets(scene) {
  for (const [type, drawFrame] of Object.entries(PROCEDURAL_DRAWERS)) {
    createSheet(scene, type, drawFrame);
  }
}
