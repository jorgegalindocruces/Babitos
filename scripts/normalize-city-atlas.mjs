import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng, encodeRgbaPng } from './normalize-vuela-atlas.mjs';

const CELL_SIZE = 443;
const COLUMNS = 4;
const ROWS = 2;
const EDGE_PADDING = 4;
const ALPHA_THRESHOLD = 8;

function readCellBounds(atlas, row, column) {
  let left = CELL_SIZE;
  let top = CELL_SIZE;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < CELL_SIZE; y += 1) {
    for (let x = 0; x < CELL_SIZE; x += 1) {
      const sourceX = column * CELL_SIZE + x;
      const sourceY = row * CELL_SIZE + y;
      const alpha = atlas.pixels[(sourceY * atlas.width + sourceX) * 4 + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) throw new Error(`Empty city atlas cell ${row}:${column}`);
  return { left, top, right, bottom };
}

function axisOffset(minimum, maximum) {
  const farEdge = CELL_SIZE - 1 - EDGE_PADDING;
  if (maximum - minimum > farEdge - EDGE_PADDING) {
    throw new Error(`City atlas pose is too large for a padded cell: ${minimum}..${maximum}`);
  }
  if (minimum < EDGE_PADDING) return EDGE_PADDING - minimum;
  if (maximum > farEdge) return farEdge - maximum;
  return 0;
}

export function normalizeCityAtlas(inputPath, outputPath) {
  const atlas = decodeRgbaPng(inputPath);
  const expectedWidth = COLUMNS * CELL_SIZE;
  const expectedHeight = ROWS * CELL_SIZE;
  if (atlas.width !== expectedWidth || atlas.height !== expectedHeight) {
    throw new Error(`Unexpected city atlas dimensions: ${atlas.width} x ${atlas.height}`);
  }

  const output = Buffer.alloc(atlas.pixels.length);
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const bounds = readCellBounds(atlas, row, column);
      const offsetX = axisOffset(bounds.left, bounds.right);
      const offsetY = axisOffset(bounds.top, bounds.bottom);

      for (let y = 0; y < CELL_SIZE; y += 1) {
        for (let x = 0; x < CELL_SIZE; x += 1) {
          const targetX = x + offsetX;
          const targetY = y + offsetY;
          if (targetX < 0 || targetX >= CELL_SIZE || targetY < 0 || targetY >= CELL_SIZE) continue;
          const sourceIndex = (((row * CELL_SIZE + y) * atlas.width)
            + column * CELL_SIZE + x) * 4;
          const targetIndex = (((row * CELL_SIZE + targetY) * atlas.width)
            + column * CELL_SIZE + targetX) * 4;
          atlas.pixels.copy(output, targetIndex, sourceIndex, sourceIndex + 4);
        }
      }
    }
  }

  encodeRgbaPng(outputPath, atlas.width, atlas.height, output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [inputPath, outputPath = inputPath] = process.argv.slice(2);
  if (!inputPath) {
    throw new Error('Usage: node scripts/normalize-city-atlas.mjs <input.png> [output.png]');
  }
  normalizeCityAtlas(path.resolve(inputPath), path.resolve(outputPath));
}
