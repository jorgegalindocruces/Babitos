import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  getUiTextResolution,
  refreshTextAfterFontLoad,
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
  };

  // It initially fits with fallback metrics, but the constraint must still be remembered.
  fitTextToWidth(textObject, 125);
  refreshTextAfterFontLoad(textObject);

  assert.equal(metricsUpdates, 1);
  assert.equal(textObject.style.fontSize, '10px');
  assert.equal(textObject.width, 120);
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
  const [styles, main, page, button, effects] = await Promise.all([
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/Button.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/effects.js', import.meta.url), 'utf8'),
  ]);

  assert.match(styles, /width:\s*min\(100%,\s*966px,/u);
  assert.doesNotMatch(styles, /#game canvas[\s\S]*?width:\s*100%\s*!important/u);
  assert.match(main, /await waitForUiFonts\(uiFontPromise\)/u);
  assert.match(page, /fonts\.googleapis\.com\/css2/u);
  assert.match(page, /id="babitos-ui-fonts"[\s\S]*?media="print"/u);
  assert.ok(page.indexOf('fonts.googleapis.com/css2') < page.indexOf('/src/main.js'));
  assert.match(button, /configureTextQuality\(this\.labelText/u);
  assert.match(effects, /configureTextQuality\(text/u);
});
