import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const BACKGROUND_URLS = Object.freeze({
  bossArena: new URL('../public/assets/backgrounds/boss-arena-v1.webp', import.meta.url),
  city: new URL('../public/assets/backgrounds/ciudad-bicharraca-v1.webp', import.meta.url),
});

function readLossyWebpDimensions(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const frameHeader = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  assert.ok(frameHeader >= 0, 'missing VP8 frame header');
  return {
    width: buffer.readUInt16LE(frameHeader + 3) & 0x3fff,
    height: buffer.readUInt16LE(frameHeader + 5) & 0x3fff,
  };
}

test('the final-stage scenes ship with real 16:9 production backgrounds', async () => {
  for (const [name, url] of Object.entries(BACKGROUND_URLS)) {
    const buffer = await readFile(url);
    const dimensions = readLossyWebpDimensions(buffer);

    assert.ok(buffer.byteLength > 250_000, `${name} asset is unexpectedly small`);
    assert.deepEqual(dimensions, { width: 1672, height: 941 });
    assert.ok(Math.abs(dimensions.width / dimensions.height - 16 / 9) < 0.002);
  }
});
