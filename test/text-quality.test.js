import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  activateUiFontStylesheet,
  refreshUiText,
  requestUiFonts,
  UI_FONT_REQUESTS,
  waitForUiFonts,
} from '../src/ui/fontLoading.js';
import {
  configureTextQuality,
  fitTextToWidth,
  getUiTextStrokeThickness,
  getUiTextResolution,
  refreshTextAfterFontLoad,
  TEXT_METRICS_REFRESH_EVENT,
  UI_TEXT_FILTER_MODE,
} from '../src/ui/textQuality.js';

test('UI text resolution is consistent and capped on high-density displays', () => {
  assert.equal(getUiTextResolution(0), 1);
  assert.equal(getUiTextResolution(1), 1);
  assert.equal(getUiTextResolution(1.25), 2);
  assert.equal(getUiTextResolution(3), 2);

  const calls = [];
  const textObject = {
    setResolution(value) {
      calls.push(value);
      return this;
    },
  };

  assert.equal(configureTextQuality(textObject, { pixelRatio: 2 }), textObject);
  assert.deepEqual(calls, [2]);
  configureTextQuality(textObject, { resolution: false });
  assert.deepEqual(calls, [2]);
});

test('small UI labels use proportional outlines instead of muddy two-pixel strokes', () => {
  assert.equal(getUiTextStrokeThickness('9px'), 0);
  assert.equal(getUiTextStrokeThickness(10), 0);
  assert.equal(getUiTextStrokeThickness('12px'), 1);
  assert.equal(getUiTextStrokeThickness(15), 1);
  assert.equal(getUiTextStrokeThickness('20px'), 2);
  assert.equal(getUiTextStrokeThickness('20px', 1), 1);
});

test('authored game text never drops below the readable 12px floor', async () => {
  const sourceDirectories = ['../src/scenes/', '../src/ui/', '../src/game/'];
  const violations = [];
  const undersizedFont = /fontSize:\s*(['"]?)(?:[7-9]|10|11)(?:px)?\1(?=[,\s}])/gu;

  for (const sourceDirectory of sourceDirectories) {
    const directoryUrl = new URL(sourceDirectory, import.meta.url);
    const entries = await readdir(directoryUrl, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      const source = await readFile(new URL(entry.name, directoryUrl), 'utf8');
      if (undersizedFont.test(source)) violations.push(`${sourceDirectory}${entry.name}`);
      undersizedFont.lastIndex = 0;
    }
  }

  assert.deepEqual(violations, []);
});

test('pixel-art mode keeps UI text linear after every canvas rerasterization', () => {
  const filters = [];
  const textObject = {
    style: { resolution: 1 },
    frame: { source: { resolution: 1 } },
    texture: {
      setFilter(value) {
        filters.push(value);
      },
    },
    updateText() {
      // Phaser's antialias=false upload path resets Canvas textures to NEAREST.
      filters.push(1);
      return this;
    },
    setResolution(value) {
      this.style.resolution = value;
      this.updateText();
      return this;
    },
  };

  configureTextQuality(textObject, { pixelRatio: 2 });
  assert.equal(textObject.style.resolution, 2);
  assert.equal(textObject.frame.source.resolution, 2);
  assert.equal(filters.at(-1), UI_TEXT_FILTER_MODE);

  textObject.updateText();
  assert.equal(filters.at(-1), UI_TEXT_FILTER_MODE);
  assert.deepEqual(filters.filter((value) => value === UI_TEXT_FILTER_MODE).length, 3);
});

test('wide text is re-rasterized at an integer font size instead of scaled', () => {
  const textObject = {
    width: 200,
    style: { fontSize: '20px' },
    sizes: [],
    setFontSize(value) {
      this.sizes.push(value);
      this.style.fontSize = `${value}px`;
      this.width = value * 10;
      return this;
    },
  };

  assert.equal(fitTextToWidth(textObject, 125), textObject);
  assert.equal(textObject.width, 120);
  assert.deepEqual(textObject.sizes, [12]);
});

test('late fonts recalculate metrics and repeat integer width fitting', () => {
  let metricsUpdates = 0;
  const events = [];
  const textObject = {
    width: 100,
    style: {
      fontSize: '20px',
      update(recalculateMetrics) {
        assert.equal(recalculateMetrics, true);
        metricsUpdates += 1;
        textObject.width = 240;
      },
    },
    setFontSize(value) {
      this.style.fontSize = `${value}px`;
      this.width = value * 12;
      return this;
    },
    emit(event, value) {
      events.push([event, value]);
    },
  };

  // It initially fits with fallback metrics, but the constraint must still be remembered.
  fitTextToWidth(textObject, 125);
  refreshTextAfterFontLoad(textObject);

  assert.equal(metricsUpdates, 1);
  assert.equal(textObject.style.fontSize, '10px');
  assert.equal(textObject.width, 120);
  assert.deepEqual(events, [[TEXT_METRICS_REFRESH_EVENT, textObject]]);
});

test('the remote font stylesheet is activated without blocking initial rendering', async () => {
  const loadedStylesheet = { media: 'print', sheet: {} };
  assert.equal(await activateUiFontStylesheet(loadedStylesheet), true);
  assert.equal(loadedStylesheet.media, 'all');

  const listeners = new Map();
  const pendingStylesheet = {
    media: 'print',
    sheet: null,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };
  const activation = activateUiFontStylesheet(pendingStylesheet);
  listeners.get('load')();
  assert.equal(await activation, true);
  assert.equal(pendingStylesheet.media, 'all');

  const failureListeners = new Map();
  const failedStylesheet = {
    media: 'print',
    sheet: null,
    addEventListener(type, listener) {
      failureListeners.set(type, listener);
    },
    removeEventListener(type) {
      failureListeners.delete(type);
    },
  };
  const failedActivation = activateUiFontStylesheet(failedStylesheet);
  failureListeners.get('error')();
  assert.equal(await failedActivation, false);
  assert.equal(failedStylesheet.media, 'print');
});

test('all declared UI font weights are requested before Phaser boots', async () => {
  const calls = [];
  const fontFaceSet = {
    async load(query, sample) {
      calls.push({ query, sample });
      return [{}];
    },
  };

  assert.equal(await requestUiFonts(fontFaceSet), true);
  assert.deepEqual(calls, UI_FONT_REQUESTS);
  assert.equal(await waitForUiFonts(Promise.resolve(true), 10), true);
  assert.equal(await waitForUiFonts(new Promise(() => {}), 5), false);
});

test('late font arrival refreshes top-level and nested Phaser text', () => {
  let refreshes = 0;
  const makeText = () => ({
    type: 'Text',
    updateText() {
      refreshes += 1;
    },
  });
  const nestedText = makeText();
  const game = {
    scene: {
      getScenes: () => [{
        children: {
          list: [makeText(), { type: 'Container', list: [nestedText] }],
        },
      }],
    },
  };

  refreshUiText(game);
  assert.equal(refreshes, 2);
});

test('the page preserves native desktop pixels and discovers fonts before the module', async () => {
  const [styles, main, page, button, effects, sceneHelpers] = await Promise.all([
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/gameBoot.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/Button.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/effects.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/sceneHelpers.js', import.meta.url), 'utf8'),
  ]);

  assert.match(styles, /width:\s*min\(100%,\s*966px,/u);
  assert.doesNotMatch(styles, /#game canvas[\s\S]*?width:\s*100%\s*!important/u);
  // gameBoot.js boots Phaser lazily from the landing page's play dialog.
  assert.match(main, /await waitForUiFonts\(uiFontPromise\)/u);
  assert.match(page, /fonts\.googleapis\.com\/css2/u);
  assert.match(page, /id="babitos-ui-fonts"[\s\S]*?media="print"/u);
  assert.ok(page.indexOf('fonts.googleapis.com/css2') < page.indexOf('/src/main.js'));
  assert.match(button, /configureTextQuality\(this\.labelText/u);
  assert.match(button, /getUiTextStrokeThickness\(labelFontSize\)/u);
  assert.match(effects, /configureTextQuality\(text/u);
  assert.match(sceneHelpers, /getUiTextStrokeThickness\(fontSize\)/u);
});
