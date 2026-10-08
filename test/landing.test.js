import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeRgbaPng } from '../scripts/normalize-vuela-atlas.mjs';

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url));

async function readRepositoryFile(path) {
  return readFile(resolve(REPOSITORY_ROOT, path), 'utf8');
}

function readAttribute(tag, attribute) {
  return new RegExp(`\\b${attribute}="([^"]+)"`, 'u').exec(tag)?.[1] ?? null;
}

function publicPathFromUrl(url) {
  const path = url.split(/[?#]/u, 1)[0].replace(/^\.\//u, '').replace(/^\//u, '');
  const absolutePath = resolve(REPOSITORY_ROOT, 'public', path);
  const pathFromRoot = relative(REPOSITORY_ROOT, absolutePath);
  assert.ok(
    pathFromRoot && !pathFromRoot.startsWith('..'),
    `public asset URL must stay inside the repository: ${url}`,
  );
  return { absolutePath, pathFromRoot };
}

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readWebpDimensions(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === 'VP8X') {
      return {
        width: readUint24LE(buffer, dataOffset + 4) + 1,
        height: readUint24LE(buffer, dataOffset + 7) + 1,
      };
    }
    if (chunkType === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }
    if (chunkType === 'VP8L') {
      const dimensions = buffer.readUInt32LE(dataOffset + 1);
      return {
        width: (dimensions & 0x3fff) + 1,
        height: ((dimensions >>> 14) & 0x3fff) + 1,
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  assert.fail('WEBP file does not contain a supported image chunk');
}

test('the landing shell keeps Phaser behind the dynamic game bootstrap', async () => {
  const [page, main, gameBoot] = await Promise.all([
    readRepositoryFile('index.html'),
    readRepositoryFile('src/main.js'),
    readRepositoryFile('src/gameBoot.js'),
  ]);

  assert.match(page, /<script type="module" src="\/src\/main\.js"><\/script>/u);
  assert.match(main, /import\('\.\/gameBoot\.js'\)/u);
  assert.doesNotMatch(main, /from ['"]phaser['"]/u);
  assert.doesNotMatch(main, /new Phaser\.Game/u);
  assert.match(gameBoot, /import Phaser from ['"]phaser['"]/u);
  assert.match(gameBoot, /new Phaser\.Game\(config\)/u);
});

test('the landing exposes its sections, play controls and direct game route', async () => {
  const [page, main] = await Promise.all([
    readRepositoryFile('index.html'),
    readRepositoryFile('src/main.js'),
  ]);

  for (const id of [
    'contenido',
    'inicio',
    'historia',
    'tu-babito',
    'mundos',
    'personajes',
    'papel',
    'arte',
  ]) {
    assert.match(page, new RegExp(`\\bid="${id}"`, 'u'), `landing must expose #${id}`);
  }

  assert.ok(
    [...page.matchAll(/<button\b[^>]*\bdata-play\b/gu)].length >= 3,
    'landing must keep play calls to action in the header, hero and final section',
  );
  assert.match(page, /<dialog id="play-dialog"[^>]*aria-labelledby=/u);
  assert.match(page, /<dialog id="art-dialog"[^>]*aria-label=/u);
  assert.match(page, /id="game"[^>]*role="application"/u);
  assert.match(page, /id="audio-toggle"[^>]*aria-keyshortcuts="M"/u);
  assert.match(page, /data-fullscreen[^>]*aria-label="Pantalla completa"/u);
  assert.match(page, /data-close[^>]*aria-label="Cerrar el juego"/u);

  assert.match(main, /location\.hash === '#jugar'/u);
  assert.match(main, /import\.meta\.env\.DEV && params\.has\('qa'\)/u);
  assert.match(main, /playDialog\.showModal\(\)/u);
  assert.match(main, /gameController\?\.setActive\(false\)/u);
  assert.match(
    main,
    /const controller = await bootGame\(\);[\s\S]*if \(!playDialog\.open\) \{[\s\S]*controller\.setActive\(false\);[\s\S]*return;/u,
  );
  assert.match(main, /playDialog\.addEventListener\('cancel', \(event\) => event\.preventDefault\(\)\)/u);
  assert.match(main, /requestFullscreen/u);
  assert.match(main, /artDialog\.showModal\(\)/u);
});

test('every local image used by the landing resolves to a public asset', async () => {
  const [page, styles] = await Promise.all([
    readRepositoryFile('index.html'),
    readRepositoryFile('src/styles.css'),
  ]);
  const urls = new Set();

  for (const tag of page.matchAll(/<img\b[^>]*>/gu)) {
    const source = readAttribute(tag[0], 'src');
    if (source) urls.add(source);
  }
  for (const match of page.matchAll(/\bdata-zoom="([^"]+)"/gu)) urls.add(match[1]);
  for (const match of styles.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gu)) urls.add(match[1]);

  const localUrls = [...urls].filter((url) => !/^(?:data:|https?:|\/\/)/u.test(url));
  assert.ok(localUrls.length >= 30, 'the asset check must cover the complete landing, not a sample');

  for (const url of localUrls) {
    const { absolutePath, pathFromRoot } = publicPathFromUrl(url);
    const file = await stat(absolutePath);
    assert.ok(file.isFile(), `${pathFromRoot} (referenced as ${url}) must be a file`);
  }
});

test('declared WEBP dimensions match their intrinsic files', async () => {
  const page = await readRepositoryFile('index.html');
  let checkedImages = 0;

  for (const match of page.matchAll(/<img\b[^>]*>/gu)) {
    const tag = match[0];
    const source = readAttribute(tag, 'src');
    const declaredWidth = Number.parseInt(readAttribute(tag, 'width') ?? '', 10);
    const declaredHeight = Number.parseInt(readAttribute(tag, 'height') ?? '', 10);
    if (!source?.endsWith('.webp') || !declaredWidth || !declaredHeight) continue;

    const { absolutePath } = publicPathFromUrl(source);
    const dimensions = readWebpDimensions(await readFile(absolutePath));
    assert.deepEqual(
      { width: declaredWidth, height: declaredHeight },
      dimensions,
      `${source} must declare its intrinsic dimensions`,
    );
    checkedImages += 1;
  }

  assert.ok(checkedImages >= 10, 'dimension regression must cover the landing WEBP set');
});

test('the landing Babito is a crisp export of the canonical game palette', () => {
  const asset = decodeRgbaPng(resolve(
    REPOSITORY_ROOT,
    'public/assets/landing/babito.png',
  ));
  assert.deepEqual([asset.width, asset.height], [320, 320]);

  const colors = new Set();
  const shadePixels = [];
  for (let y = 0; y < asset.height; y += 1) {
    for (let x = 0; x < asset.width; x += 1) {
      const offset = (y * asset.width + x) * 4;
      const pixel = [...asset.pixels.subarray(offset, offset + 4)];
      assert.ok(pixel[3] === 0 || pixel[3] === 255, `unexpected alpha at ${x},${y}`);
      if (pixel[3]) {
        const rgba = pixel.join(',');
        colors.add(rgba);
        if (rgba === '43,191,229,255') shadePixels.push({ x, y });
      }

      // The 80 px canonical source is enlarged exactly 4× with nearest pixels.
      if (x % 4 === 0 && y % 4 === 0) {
        for (let blockY = y; blockY < y + 4; blockY += 1) {
          for (let blockX = x; blockX < x + 4; blockX += 1) {
            const blockOffset = (blockY * asset.width + blockX) * 4;
            assert.deepEqual(
              [...asset.pixels.subarray(blockOffset, blockOffset + 4)],
              pixel,
              `non-crisp 4× block at ${x},${y}`,
            );
          }
        }
      }
    }
  }

  for (const canonicalColor of [
    '124,219,249,255', // body
    '168,237,255,255', // highlight
    '43,191,229,255', // shade
    '255,113,150,255', // cheeks
    '7,17,30,255', // outline
  ]) {
    assert.ok(colors.has(canonicalColor), `missing canonical color ${canonicalColor}`);
  }

  assert.ok(shadePixels.length > 0, 'the far-side volume shade must remain present');
  assert.ok(
    shadePixels.every(({ y }) => y < 200),
    'the volume shade must stay lateral and never form trousers across the belly or feet',
  );
});
