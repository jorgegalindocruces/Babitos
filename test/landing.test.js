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
  const [page, main, gameBoot, styles] = await Promise.all([
    readRepositoryFile('index.html'),
    readRepositoryFile('src/main.js'),
    readRepositoryFile('src/gameBoot.js'),
    readRepositoryFile('src/styles.css'),
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
    'creditos',
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
  assert.match(page, /id="music-style-toggle"[^>]*aria-label="Estilo musical: Aventura/u);
  assert.match(gameBoot, /audio\.cycleMusicStyle\(\)/u);
  assert.match(gameBoot, /saveMusicStylePreference\(style\)/u);
  assert.match(gameBoot, /if \(!active\)[\s\S]*audio\.unbindUnlock\(\)[\s\S]*audio\.context\?\.suspend/u);
  assert.match(gameBoot, /game\.loop\.wake\(\)[\s\S]*audio\.bindUnlock\(\)[\s\S]*audio\.unlock\(\)/u);
  assert.match(styles, /\.game-shell:fullscreen \{[^}]*100vh - 38px/u);
  assert.doesNotMatch(styles, /\.game-shell:fullscreen \.game-topline \{\s*display:\s*none/u);
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

test('the landing closes with visible credits for Lola and Momo', async () => {
  const page = await readRepositoryFile('index.html');
  const finalCallIndex = page.indexOf('class="section final-cta"');
  const creditsIndex = page.indexOf('id="creditos"');
  const footerIndex = page.indexOf('class="site-footer"');

  assert.ok(finalCallIndex >= 0 && finalCallIndex < creditsIndex, 'credits must follow the final play call');
  assert.ok(creditsIndex < footerIndex, 'credits must remain the final editorial section before the technical footer');
  assert.match(page, /El universo de BABITOS nació de las ideas y los dibujos de Lola y Momo/u);
  assert.match(page, /Directores creativos y ejecutivos de BABITOS/u);
  assert.match(
    page,
    /class="art-frame creator-credits-art"[\s\S]*data-zoom="\.\/assets\/landing\/credits-lola-momo\.webp"/u,
  );
  const creditsButton = /<button\b[^>]*class="art-frame creator-credits-art"[\s\S]*?<\/button>/u.exec(page)?.[0];
  const creditsImage = /<img\b[^>]*>/u.exec(creditsButton ?? '')?.[0];
  assert.ok(creditsImage, 'credits must contain an image');
  assert.equal(readAttribute(creditsImage, 'src'), './assets/landing/credits-lola-momo.webp');
  assert.match(readAttribute(creditsImage, 'alt') ?? '', /^Lola y Momo /u);
  assert.equal(readAttribute(creditsImage, 'loading'), 'lazy');
  assert.equal(readAttribute(creditsImage, 'decoding'), 'async');
  assert.equal(readAttribute(creditsImage, 'width'), '1536');
  assert.equal(readAttribute(creditsImage, 'height'), '1024');
});

test('the landing presents the approved Jungle enemies as playable Phase 2 characters', async () => {
  const page = await readRepositoryFile('index.html');
  const jungleEnemies = [
    ['garbanzo-loco', 'Garbanzo Loco'],
    ['arbol-pocho', 'Árbol Pocho'],
    ['sapo-pota', 'Sapo Pota'],
  ];

  for (const [slug, name] of jungleEnemies) {
    assert.match(page, new RegExp(`>${name}<`, 'u'), `${name} must have a character card`);
    assert.match(page, new RegExp(`portrait-enemy-${slug}\\.webp`, 'u'));
    assert.match(page, new RegExp(`drawing-enemy-${slug}-original\\.webp`, 'u'));
    assert.match(
      page,
      new RegExp(`class="art-frame is-wide"[^>]+data-zoom="\\./assets/landing/concept-jungle-${slug}\\.webp"`, 'u'),
      `${name} must expose its complete design board in the lightbox`,
    );
  }

  assert.ok(
    [...page.matchAll(/Jugable · Fase 2/gu)].length >= 3,
    'each Jungle enemy card must disclose that the character is playable in Phase 2',
  );
  assert.equal(
    [...page.matchAll(/Jugable · Fase 2/gu)].length,
    3,
    'the three Jungle enemy cards must be marked as playable runtime characters',
  );
  assert.match(page, /Bicharracos de La Jungla[^.\n]*fases jugables/u);
  assert.doesNotMatch(page, /Diseño aprobado · En desarrollo/u);
  assert.doesNotMatch(page, /Bicharracos de La Jungla aún están en desarrollo/u);
});

test('the landing presents Momo’s City robots as playable Phase 3 characters', async () => {
  const page = await readRepositoryFile('index.html');
  const cityEnemies = [
    ['drone-bot', 'Drone Bot'],
    ['robot-elice', 'Robot Elice'],
    ['ive-robot', 'IVE Robot'],
  ];

  for (const [slug, name] of cityEnemies) {
    assert.match(page, new RegExp(`>${name}<`, 'u'), `${name} must have a character card`);
    assert.match(page, new RegExp(`portrait-enemy-${slug}\\.webp`, 'u'));
    assert.match(page, new RegExp(`drawing-enemy-${slug}-original\\.webp`, 'u'));
    assert.match(
      page,
      new RegExp(`data-zoom="\\./assets/landing/concept-city-${slug}\\.webp"`, 'u'),
      `${name} must expose its complete design board in the lightbox`,
    );
  }

  assert.equal([...page.matchAll(/Jugable · Fase 3/gu)].length, 3);
  assert.equal([...page.matchAll(/data-runtime-status="playable"/gu)].length, 6);
  assert.match(page, /Los robots de la Ciudad Bicharraca han sido imaginados y dibujados por Momo\./u);
  assert.match(page, /Fase 3 · Jugable/u);
  assert.doesNotMatch(page, /Fase 3 · Próximamente/u);
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

test('the landing Babito is a crisp export of the canonical v5 game palette', () => {
  const asset = decodeRgbaPng(resolve(
    REPOSITORY_ROOT,
    'public/assets/landing/babito.png',
  ));
  assert.deepEqual([asset.width, asset.height], [320, 320]);

  const colors = new Set();
  for (let y = 0; y < asset.height; y += 1) {
    for (let x = 0; x < asset.width; x += 1) {
      const offset = (y * asset.width + x) * 4;
      const pixel = [...asset.pixels.subarray(offset, offset + 4)];
      assert.ok(pixel[3] === 0 || pixel[3] === 255, `unexpected alpha at ${x},${y}`);
      if (pixel[3]) {
        const rgba = pixel.join(',');
        colors.add(rgba);
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

  // Babito v5 palette from the anatomy sheets, plus the straw hat.
  const expectedColors = [
    '72,217,245,255', // body #48D9F5
    '145,241,255,255', // light #91F1FF
    '34,156,203,255', // flank shadow #229CCB
    '24,35,52,255', // outline #182334
    '255,145,173,255', // cheeks #FF91AD
    '7,17,30,255', // eyes and mouth
    '255,255,255,255', // eye and crown glints
    '255,93,125,255', // tongue
    '255,198,46,255', // straw hat
    '239,51,79,255', // hat band
    '255,241,128,255', // hat glint
  ];
  for (const canonicalColor of expectedColors) {
    assert.ok(colors.has(canonicalColor), `missing canonical color ${canonicalColor}`);
  }
  assert.deepEqual(
    [...colors].sort(),
    [...expectedColors].sort(),
    'the editorial export must use only the documented pixel palette',
  );
});
