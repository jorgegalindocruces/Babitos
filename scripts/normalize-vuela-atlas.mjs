import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CELL_SIZE = 256;
const COLUMNS = 6;
const SOURCE_ROW_BOUNDS = Object.freeze([0, 171, 341, 512, 683, 853, 1024]);
const ALPHA_THRESHOLD = 128;

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

export function decodeRgbaPng(path) {
  const png = fs.readFileSync(path);
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Invalid PNG signature');

  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error('Expected a non-interlaced 8-bit RGBA PNG');
      }
    } else if (type === 'IDAT') {
      compressed.push(data);
    }
    offset += length + 12;
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const filtered = zlib.inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const value = filtered[sourceOffset];
      sourceOffset += 1;
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const above = previous[x];
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      const predictor = filter === 1
        ? left
        : (filter === 2
          ? above
          : (filter === 3
            ? Math.floor((left + above) / 2)
            : (filter === 4 ? paeth(left, above, upperLeft) : 0)));
      row[x] = (value + predictor) & 0xff;
    }
    previous = row;
  }

  return { width, height, pixels };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return chunk;
}

function encodeRgbaPng(path, width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const outputOffset = y * (stride + 1);
    scanlines[outputOffset] = 0;
    pixels.copy(scanlines, outputOffset + 1, y * stride, (y + 1) * stride);
  }

  fs.writeFileSync(path, Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

export function normalizeVuelaAtlas(inputPath, outputPath) {
  const source = decodeRgbaPng(inputPath);
  if (source.width !== COLUMNS * CELL_SIZE || source.height !== SOURCE_ROW_BOUNDS.at(-1)) {
    throw new Error(`Unexpected source dimensions: ${source.width} x ${source.height}`);
  }

  const rows = SOURCE_ROW_BOUNDS.length - 1;
  const outputWidth = COLUMNS * CELL_SIZE;
  const outputHeight = rows * CELL_SIZE;
  const output = Buffer.alloc(outputWidth * outputHeight * 4);

  for (let row = 0; row < rows; row += 1) {
    const sourceTop = SOURCE_ROW_BOUNDS[row];
    const sourceHeight = SOURCE_ROW_BOUNDS[row + 1] - sourceTop;
    const destinationTop = row * CELL_SIZE + Math.floor((CELL_SIZE - sourceHeight) / 2);
    for (let column = 0; column < COLUMNS; column += 1) {
      for (let y = 0; y < sourceHeight; y += 1) {
        for (let x = 0; x < CELL_SIZE; x += 1) {
          const sourceIndex = ((sourceTop + y) * source.width + column * CELL_SIZE + x) * 4;
          const destinationIndex = ((destinationTop + y) * outputWidth + column * CELL_SIZE + x) * 4;
          if (source.pixels[sourceIndex + 3] < ALPHA_THRESHOLD) continue;
          output[destinationIndex] = source.pixels[sourceIndex];
          output[destinationIndex + 1] = source.pixels[sourceIndex + 1];
          output[destinationIndex + 2] = source.pixels[sourceIndex + 2];
          output[destinationIndex + 3] = 255;
        }
      }
    }
  }

  encodeRgbaPng(outputPath, outputWidth, outputHeight, output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error('Usage: node scripts/normalize-vuela-atlas.mjs <input.png> <output.png>');
  }
  normalizeVuelaAtlas(inputPath, outputPath);
}
