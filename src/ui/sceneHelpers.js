import Phaser from 'phaser';
import {
  configureTextQuality,
  fitTextToWidth,
  getUiTextStrokeThickness,
} from './textQuality.js';

export const UI_COLORS = Object.freeze({
  ink: 0x071326,
  panel: 0x0c2540,
  panelLight: 0x163b5d,
  cyan: 0x71e5ff,
  pink: 0xff4f86,
  yellow: 0xffcf3c,
  green: 0x42cf6d,
  white: 0xf7fbff,
});

export const UI_FONTS = Object.freeze({
  display: "'Silkscreen', monospace",
  body: "'Nunito', system-ui, sans-serif",
});

export const BACKGROUND_ASSETS = Object.freeze({
  babilandiaV2: Object.freeze({
    key: 'background_babilandia_v2',
    url: 'assets/backgrounds/babilandia-v2.webp',
  }),
  bossArenaV1: Object.freeze({
    key: 'background_boss_arena_v1',
    url: 'assets/backgrounds/boss-arena-v1.webp',
  }),
  cityV1: Object.freeze({
    key: 'background_city_v1',
    url: 'assets/backgrounds/ciudad-bicharraca-v1.webp',
  }),
});

/** Approved character art that is loaded once by BootScene and reused by scenes. */
export const CHARACTER_ASSETS = Object.freeze({
  logoV2: Object.freeze({
    key: 'babitos_logo_v2',
    url: 'assets/characters/babitos-logo-v2.png',
  }),
  enemyComeV2: Object.freeze({
    key: 'enemy_come',
    url: 'assets/characters/enemy-come-v2.png',
  }),
  enemyVuelaV2: Object.freeze({
    key: 'enemy_vuela',
    url: 'assets/characters/enemy-vuela-v2.png',
  }),
  enemyDaVueltasV2: Object.freeze({
    key: 'enemy_da_vueltas',
    url: 'assets/characters/enemy-da-vueltas-v2.png',
  }),
  bossCorruptV2: Object.freeze({
    key: 'boss_corrupt',
    url: 'assets/characters/boss-corrupt-v2.png',
  }),
  merchantEmpanadillaV2: Object.freeze({
    key: 'merchant_empanadilla',
    url: 'assets/characters/merchant-empanadilla-v2.png',
  }),
  merchantPinguinoV2: Object.freeze({
    key: 'merchant_pinguino',
    url: 'assets/characters/merchant-pinguino-v2.png',
  }),
  powerTreeSadV2: Object.freeze({
    key: 'power_tree_sad_v2',
    url: 'assets/characters/power-tree-sad-v2.png',
  }),
  powerTreeRestoredV2: Object.freeze({
    key: 'power_tree_restored_v2',
    url: 'assets/characters/power-tree-restored-v2.png',
  }),
});

export const BACKGROUND_THEMES = Object.freeze({
  title: Object.freeze({
    sky: Object.freeze([0x061129, 0x081a35, 0x0b2745, 0x103653, 0x174560, 0x1d536a]),
    far: 0x102b4a,
    mid: 0x164465,
    ground: 0x08253a,
    edge: 0x2484a4,
    accent: 0x71e5ff,
    celestial: 'moon',
  }),
  babilandia: Object.freeze({
    sky: Object.freeze([0x4e9ee8, 0x62b4ee, 0x79caf3, 0x96ddf5, 0xbcecf7, 0xd9f5f7]),
    far: 0x5d86a2,
    mid: 0x2f6f80,
    ground: 0x245d3a,
    edge: 0x64c94e,
    accent: 0xffcf3c,
    celestial: 'sun',
  }),
  jungle: Object.freeze({
    sky: Object.freeze([0x173d49, 0x1d5554, 0x26705a, 0x398763, 0x61a872, 0x8fc983]),
    far: 0x1a4f43,
    mid: 0x17603c,
    ground: 0x0b3928,
    edge: 0x73d34f,
    accent: 0xffdb4d,
    celestial: 'mist',
  }),
  city: Object.freeze({
    sky: Object.freeze([0x351947, 0x5a254a, 0x843448, 0xaf4846, 0xd76548, 0xee8a58]),
    far: 0x30213c,
    mid: 0x22283f,
    ground: 0x101a2d,
    edge: 0xff4f6f,
    accent: 0x42e8ec,
    celestial: 'smog',
  }),
  shop: Object.freeze({
    sky: Object.freeze([0x07152b, 0x0b2038, 0x102e47, 0x173c55, 0x204d64, 0x2a5e71]),
    far: 0x112d43,
    mid: 0x193b4b,
    ground: 0x281e24,
    edge: 0xe6a44b,
    accent: 0xffd45f,
    celestial: 'moon',
  }),
});

const BACKGROUND_TEXTURE_PREFIX = 'babitos-ui-bg-v1';
const BACKGROUND_MUSIC_THEMES = Object.freeze({
  title: 'title',
  babilandia: 'babilandia',
  jungle: 'jungle',
  city: 'ending',
  shop: 'shop',
});
let announcementToken = 0;
let clearAnnouncementTimer = null;

function asCssColor(color) {
  if (typeof color === 'string') return color;
  if (!Number.isFinite(color)) return '#ffffff';
  return `#${Math.max(0, Math.min(0xffffff, color)).toString(16).padStart(6, '0')}`;
}

function asFontSize(value, fallback) {
  if (typeof value === 'string') return value;
  return `${Number.isFinite(value) ? value : fallback}px`;
}

function normalizeTextArgs(scene, text, x, y, options) {
  if (x && typeof x === 'object') {
    return {
      text: String(text ?? ''),
      x: Number.isFinite(x.x) ? x.x : scene.scale.width / 2,
      y: Number.isFinite(x.y) ? x.y : 0,
      options: x,
    };
  }

  return {
    text: String(text ?? ''),
    x: Number.isFinite(x) ? x : scene.scale.width / 2,
    y: Number.isFinite(y) ? y : 0,
    options: options ?? {},
  };
}

function applyCommonTextOptions(textObject, options) {
  textObject
    .setOrigin(options.originX ?? options.origin ?? 0.5, options.originY ?? options.origin ?? 0.5)
    .setDepth(Number.isFinite(options.depth) ? options.depth : 100)
    .setScrollFactor(options.scrollFactor ?? 0);

  fitTextToWidth(textObject, options.maxWidth, { minFontSize: options.minFontSize });
  configureTextQuality(textObject, { resolution: options.resolution });

  return textObject;
}

/** Create the large, outlined heading shared by menu scenes. */
export function createTitle(scene, content, x, y, options = {}) {
  const args = normalizeTextArgs(scene, content, x, y, options);
  const settings = args.options;
  const title = scene.add.text(args.x, args.y, args.text, {
    fontFamily: settings.fontFamily ?? UI_FONTS.display,
    fontSize: asFontSize(settings.fontSize, 44),
    fontStyle: settings.fontStyle ?? 'bold',
    color: asCssColor(settings.color ?? UI_COLORS.white),
    align: settings.align ?? 'center',
    stroke: asCssColor(settings.stroke ?? UI_COLORS.ink),
    strokeThickness: Number.isFinite(settings.strokeThickness) ? settings.strokeThickness : 7,
    shadow: settings.shadow ?? {
      offsetX: 0,
      offsetY: 5,
      color: '#020814',
      blur: 0,
      fill: true,
    },
    wordWrap: settings.wordWrapWidth
      ? { width: settings.wordWrapWidth, useAdvancedWrap: true }
      : undefined,
  });

  return applyCommonTextOptions(title, settings);
}

/** Create readable body copy with the game's default font and wrapping. */
export function createBodyText(scene, content, x, y, options = {}) {
  const args = normalizeTextArgs(scene, content, x, y, options);
  const settings = args.options;
  const body = scene.add.text(args.x, args.y, args.text, {
    fontFamily: settings.fontFamily ?? UI_FONTS.body,
    fontSize: asFontSize(settings.fontSize, 20),
    fontStyle: settings.fontStyle ?? 'bold',
    color: asCssColor(settings.color ?? UI_COLORS.white),
    align: settings.align ?? 'center',
    lineSpacing: Number.isFinite(settings.lineSpacing) ? settings.lineSpacing : 5,
    stroke: settings.stroke ? asCssColor(settings.stroke) : undefined,
    strokeThickness: Number(settings.strokeThickness) || 0,
    wordWrap: {
      width: settings.wordWrapWidth ?? 620,
      useAdvancedWrap: true,
    },
  });

  return applyCommonTextOptions(body, settings);
}

/** Compact all-caps label used in cards, tabs and HUD elements. */
export function createLabel(scene, content, x, y, options = {}) {
  const args = normalizeTextArgs(scene, content, x, y, options);
  const settings = args.options;
  const fontSize = asFontSize(settings.fontSize, 14);
  const label = scene.add.text(args.x, args.y, args.text, {
    fontFamily: settings.fontFamily ?? UI_FONTS.display,
    fontSize,
    fontStyle: settings.fontStyle ?? 'bold',
    color: asCssColor(settings.color ?? UI_COLORS.cyan),
    align: settings.align ?? 'center',
    stroke: asCssColor(settings.stroke ?? UI_COLORS.ink),
    strokeThickness: Number.isFinite(settings.strokeThickness)
      ? settings.strokeThickness
      : getUiTextStrokeThickness(fontSize),
    wordWrap: settings.wordWrapWidth
      ? { width: settings.wordWrapWidth, useAdvancedWrap: true }
      : undefined,
  });

  return applyCommonTextOptions(label, settings);
}

function normalizePanelArgs(scene, x, y, width, height, options) {
  if (x && typeof x === 'object') {
    return {
      x: Number.isFinite(x.x) ? x.x : scene.scale.width / 2,
      y: Number.isFinite(x.y) ? x.y : scene.scale.height / 2,
      width: Math.max(16, Number(x.width) || 600),
      height: Math.max(16, Number(x.height) || 300),
      options: x,
    };
  }

  return {
    x: Number.isFinite(x) ? x : scene.scale.width / 2,
    y: Number.isFinite(y) ? y : scene.scale.height / 2,
    width: Math.max(16, Number(width) || 600),
    height: Math.max(16, Number(height) || 300),
    options: options ?? {},
  };
}

/**
 * Create a reusable framed panel. Coordinates refer to its centre. The
 * returned Graphics object exposes `resizePanel(width, height)`.
 */
export function createPanel(scene, x, y, width, height, options = {}) {
  const args = normalizePanelArgs(scene, x, y, width, height, options);
  const settings = args.options;
  const graphics = scene.add.graphics({ x: args.x, y: args.y });
  let panelWidth = args.width;
  let panelHeight = args.height;

  const draw = () => {
    const radius = Math.max(0, Number(settings.radius) || 14);
    const strokeWidth = Math.max(1, Number(settings.strokeWidth) || 3);
    const left = -panelWidth / 2;
    const top = -panelHeight / 2;

    graphics.clear();

    if (settings.shadow !== false) {
      graphics.fillStyle(settings.shadowColor ?? 0x020814, settings.shadowAlpha ?? 0.65);
      graphics.fillRoundedRect(left + 6, top + 8, panelWidth, panelHeight, radius);
    }

    graphics.fillStyle(settings.fillColor ?? UI_COLORS.panel, settings.fillAlpha ?? 0.96);
    graphics.fillRoundedRect(left, top, panelWidth, panelHeight, radius);
    graphics.lineStyle(strokeWidth, settings.strokeColor ?? 0x2b688e, settings.strokeAlpha ?? 1);
    graphics.strokeRoundedRect(
      left + strokeWidth / 2,
      top + strokeWidth / 2,
      panelWidth - strokeWidth,
      panelHeight - strokeWidth,
      Math.max(0, radius - 1),
    );

    if (settings.highlight !== false) {
      graphics.lineStyle(2, settings.highlightColor ?? 0x71e5ff, settings.highlightAlpha ?? 0.15);
      graphics.beginPath();
      graphics.moveTo(left + radius, top + 7);
      graphics.lineTo(left + panelWidth - radius, top + 7);
      graphics.strokePath();
    }
  };

  graphics.resizePanel = (nextWidth, nextHeight) => {
    panelWidth = Math.max(16, Number(nextWidth) || panelWidth);
    panelHeight = Math.max(16, Number(nextHeight) || panelHeight);
    draw();
    return graphics;
  };
  graphics.getPanelBounds = () => new Phaser.Geom.Rectangle(
    graphics.x - panelWidth / 2,
    graphics.y - panelHeight / 2,
    panelWidth,
    panelHeight,
  );

  graphics
    .setDepth(Number.isFinite(settings.depth) ? settings.depth : 90)
    .setScrollFactor(settings.scrollFactor ?? 0);
  draw();
  return graphics;
}

function seededRandom(seedText) {
  let seed = 2166136261;
  for (const character of seedText) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function drawTitleLayer(graphics, config, width, height, layer, random) {
  const floor = layer === 'far' ? height - 118 : height - 67;
  const color = layer === 'far' ? config.far : config.mid;
  graphics.fillStyle(color, 1);

  const points = [new Phaser.Geom.Point(0, height)];
  for (let x = -40; x <= width + 60; x += 55) {
    const peak = floor - 25 - Math.floor(random() * (layer === 'far' ? 70 : 42));
    points.push(new Phaser.Geom.Point(x, peak));
  }
  points.push(new Phaser.Geom.Point(width, height));
  graphics.fillPoints(points, true);

  if (layer === 'mid') {
    for (let x = 24; x < width; x += 105) {
      const towerHeight = 34 + Math.floor(random() * 45);
      graphics.fillRect(x, floor - towerHeight, 26, towerHeight);
      graphics.fillTriangle(x - 4, floor - towerHeight, x + 13, floor - towerHeight - 18, x + 30, floor - towerHeight);
    }
  }
}

function drawBabilandiaLayer(graphics, config, width, height, layer, random) {
  const floor = layer === 'far' ? height - 116 : height - 61;
  const color = layer === 'far' ? config.far : config.mid;
  graphics.fillStyle(color, 1);

  for (let x = -35; x < width + 60; x += layer === 'far' ? 86 : 112) {
    const houseWidth = layer === 'far' ? 50 : 66;
    const houseHeight = 38 + Math.floor(random() * 42);
    graphics.fillRect(x, floor - houseHeight, houseWidth, houseHeight);
    graphics.fillCircle(x + houseWidth / 2, floor - houseHeight, houseWidth * 0.55);
    graphics.fillStyle(config.accent, layer === 'far' ? 0.18 : 0.28);
    graphics.fillRect(x + 11, floor - houseHeight + 18, 7, 10);
    graphics.fillStyle(color, 1);
  }

  graphics.fillRect(0, floor, width, height - floor);
}

function drawJungleLayer(graphics, config, width, height, layer, random) {
  const floor = layer === 'far' ? height - 105 : height - 55;
  const color = layer === 'far' ? config.far : config.mid;
  graphics.fillStyle(color, 1);

  for (let x = -35; x < width + 65; x += layer === 'far' ? 72 : 94) {
    const trunkWidth = layer === 'far' ? 18 : 25;
    const trunkHeight = 75 + Math.floor(random() * 100);
    graphics.fillRect(x, floor - trunkHeight, trunkWidth, trunkHeight);
    graphics.fillCircle(x + trunkWidth / 2, floor - trunkHeight, 38 + random() * 22);
    graphics.fillCircle(x - 20, floor - trunkHeight + 13, 30 + random() * 15);
    graphics.fillCircle(x + 36, floor - trunkHeight + 11, 34 + random() * 17);
  }

  graphics.fillRect(0, floor, width, height - floor);
}

function drawCityLayer(graphics, config, width, height, layer, random) {
  const floor = layer === 'far' ? height - 103 : height - 52;
  const color = layer === 'far' ? config.far : config.mid;
  graphics.fillStyle(color, 1);

  let x = -25;
  while (x < width + 30) {
    const buildingWidth = (layer === 'far' ? 34 : 48) + Math.floor(random() * 38);
    const buildingHeight = 58 + Math.floor(random() * (layer === 'far' ? 125 : 92));
    graphics.fillRect(x, floor - buildingHeight, buildingWidth, buildingHeight);

    if (random() > 0.58) {
      graphics.fillRect(x + buildingWidth * 0.36, floor - buildingHeight - 35, 10, 35);
    }

    graphics.fillStyle(config.accent, layer === 'far' ? 0.16 : 0.3);
    for (let windowY = floor - buildingHeight + 13; windowY < floor - 12; windowY += 20) {
      graphics.fillRect(x + 9, windowY, 6, 8);
      if (buildingWidth > 52) graphics.fillRect(x + 28, windowY, 6, 8);
    }
    graphics.fillStyle(color, 1);
    x += buildingWidth + 9;
  }

  graphics.fillRect(0, floor, width, height - floor);
}

function drawShopLayer(graphics, config, width, height, layer, random) {
  const floor = layer === 'far' ? height - 105 : height - 53;
  const color = layer === 'far' ? config.far : config.mid;
  graphics.fillStyle(color, 1);

  for (let x = -40; x < width + 70; x += layer === 'far' ? 120 : 148) {
    const stallWidth = layer === 'far' ? 83 : 108;
    const stallHeight = 45 + Math.floor(random() * 35);
    graphics.fillRect(x, floor - stallHeight, stallWidth, stallHeight);
    graphics.fillTriangle(x - 10, floor - stallHeight, x + stallWidth / 2, floor - stallHeight - 24, x + stallWidth + 10, floor - stallHeight);
    graphics.fillStyle(config.accent, layer === 'far' ? 0.2 : 0.4);
    graphics.fillCircle(x + 17, floor - stallHeight + 13, 4);
    graphics.fillCircle(x + stallWidth - 17, floor - stallHeight + 13, 4);
    graphics.fillStyle(color, 1);
  }

  graphics.fillRect(0, floor, width, height - floor);
}

function drawBackgroundLayer(graphics, themeName, config, width, height, layer) {
  const random = seededRandom(`${themeName}:${layer}`);
  const drawers = {
    title: drawTitleLayer,
    babilandia: drawBabilandiaLayer,
    jungle: drawJungleLayer,
    city: drawCityLayer,
    shop: drawShopLayer,
  };
  (drawers[themeName] ?? drawTitleLayer)(graphics, config, width, height, layer, random);
}

function ensureBackgroundTexture(scene, themeName, config, layer) {
  const key = `${BACKGROUND_TEXTURE_PREFIX}:${themeName}:${layer}`;
  if (scene.textures.exists(key)) return key;

  const width = 512;
  const height = 540;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  drawBackgroundLayer(graphics, themeName, config, width, height, layer);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
  return key;
}

function drawSky(scene, x, y, width, height, config, depth, themeName) {
  const sky = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  const bandHeight = Math.ceil(height / config.sky.length);
  config.sky.forEach((color, index) => {
    sky.fillStyle(color, 1);
    sky.fillRect(x, y + index * bandHeight, width, bandHeight + 1);
  });

  const details = scene.add.graphics().setDepth(depth + 0.5).setScrollFactor(0);
  const random = seededRandom(`${themeName}:sky`);

  if (config.celestial === 'sun') {
    details.fillStyle(0xfff0a1, 0.75);
    details.fillCircle(x + width * 0.78, y + height * 0.19, 34);
    details.fillStyle(0xffd45f, 0.88);
    details.fillCircle(x + width * 0.78, y + height * 0.19, 23);
  } else if (config.celestial === 'moon') {
    details.fillStyle(0xdff7ff, 0.82);
    details.fillCircle(x + width * 0.8, y + height * 0.18, 25);
    details.fillStyle(config.sky[1], 1);
    details.fillCircle(x + width * 0.815, y + height * 0.165, 22);
  } else if (config.celestial === 'mist' || config.celestial === 'smog') {
    details.fillStyle(config.accent, config.celestial === 'mist' ? 0.08 : 0.06);
    for (let index = 0; index < 5; index += 1) {
      details.fillEllipse(
        x + random() * width,
        y + 60 + random() * height * 0.45,
        110 + random() * 170,
        14 + random() * 18,
      );
    }
  }

  const stars = themeName === 'title' || themeName === 'shop' || themeName === 'city' ? 34 : 10;
  details.fillStyle(config.accent, themeName === 'city' ? 0.36 : 0.65);
  for (let index = 0; index < stars; index += 1) {
    const size = random() > 0.86 ? 3 : 2;
    details.fillRect(
      Math.floor(x + random() * width),
      Math.floor(y + 18 + random() * height * 0.55),
      size,
      size,
    );
  }

  return { sky, details };
}

function createImageBackground(scene, themeName, assetKey, options = {}) {
  const camera = options.camera ?? scene.cameras.main;
  const depth = Number.isFinite(options.depth) ? options.depth : -1000;
  const overscan = Phaser.Math.Clamp(Number(options.assetOverscan) || 1.1, 1, 1.35);
  const image = scene.add.image(0, 0, assetKey)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(depth);
  const objects = [image];
  const cameraBounds = new Phaser.Geom.Rectangle();
  let viewport = null;
  let destroyed = false;
  let lastScrollX = Number.NaN;
  let lastScrollY = Number.NaN;

  const layout = () => {
    const width = Number(options.width) || camera.width || scene.scale.width;
    const height = Number(options.height) || camera.height || scene.scale.height;
    const x = Number(options.x) || 0;
    const y = Number(options.y) || 0;
    const sourceWidth = image.frame?.realWidth || image.width || width;
    const sourceHeight = image.frame?.realHeight || image.height || height;
    const coverScale = Math.max(width / sourceWidth, height / sourceHeight) * overscan;

    image.setScale(coverScale);
    viewport = {
      width,
      height,
      x,
      y,
      marginX: Math.max(0, (sourceWidth * coverScale - width) / 2),
      marginY: Math.max(0, (sourceHeight * coverScale - height) / 2),
    };
    camera.getBounds(cameraBounds);
  };

  const update = (force = false) => {
    if (destroyed || !viewport) return;
    const scrollX = camera.scrollX;
    const scrollY = camera.scrollY;
    if (!force && scrollX === lastScrollX && scrollY === lastScrollY) return;

    const spanX = Math.max(0, cameraBounds.width - camera.width);
    const spanY = Math.max(0, cameraBounds.height - camera.height);
    const progressX = spanX > 0
      ? Phaser.Math.Clamp((scrollX - cameraBounds.x) / spanX, 0, 1)
      : 0.5;
    const progressY = spanY > 0
      ? Phaser.Math.Clamp((scrollY - cameraBounds.y) / spanY, 0, 1)
      : 0.5;

    image.setPosition(
      viewport.x + viewport.width / 2
        + Phaser.Math.Linear(viewport.marginX, -viewport.marginX, progressX),
      viewport.y + viewport.height / 2
        + Phaser.Math.Linear(viewport.marginY, -viewport.marginY, progressY),
    );
    lastScrollX = scrollX;
    lastScrollY = scrollY;
  };

  const resize = () => {
    layout();
    update(true);
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.scale?.on(Phaser.Scale.Events.RESIZE, resize);

  const controller = {
    theme: themeName,
    assetKey,
    sky: image,
    details: null,
    far: image,
    mid: null,
    foreground: null,
    objects,
    setVisible(visible) {
      image.setVisible(visible);
      return this;
    },
    setDepth(nextDepth) {
      image.setDepth(nextDepth);
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, shutdown);
      scene.scale?.off(Phaser.Scale.Events.RESIZE, resize);
      if (image.scene) image.destroy();
    },
  };

  const shutdown = () => controller.destroy();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, shutdown);
  layout();
  update(true);
  return controller;
}

/**
 * Add a self-contained pixel-art background. External art is used when an
 * `assetKey` is available; otherwise the deterministic procedural layers are
 * retained as a resilient fallback.
 */
export function createPixelBackground(scene, theme = 'title', options = {}) {
  const themeName = BACKGROUND_THEMES[theme] ? theme : 'title';
  const musicTheme = options.musicTheme ?? BACKGROUND_MUSIC_THEMES[themeName];
  if (musicTheme) scene.registry?.get('audio')?.startMusic(musicTheme);

  if (options.assetKey && scene.textures.exists(options.assetKey)) {
    return createImageBackground(scene, themeName, options.assetKey, options);
  }

  const config = BACKGROUND_THEMES[themeName];
  const camera = options.camera ?? scene.cameras.main;
  const width = Number(options.width) || camera.width || scene.scale.width;
  const height = Number(options.height) || camera.height || scene.scale.height;
  const x = Number(options.x) || 0;
  const y = Number(options.y) || 0;
  const depth = Number.isFinite(options.depth) ? options.depth : -1000;

  const { sky, details } = drawSky(scene, x, y, width, height, config, depth, themeName);
  const farKey = ensureBackgroundTexture(scene, themeName, config, 'far');
  const midKey = ensureBackgroundTexture(scene, themeName, config, 'mid');
  const far = scene.add.tileSprite(x, y, width, height, farKey)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(depth + 1);
  const mid = scene.add.tileSprite(x, y, width, height, midKey)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(depth + 2);
  const foreground = scene.add.graphics()
    .setScrollFactor(0)
    .setDepth(depth + 3);

  if (options.showGround !== false) {
    const groundHeight = Math.max(18, Number(options.groundHeight) || 35);
    foreground.fillStyle(config.edge, 1);
    foreground.fillRect(x, y + height - groundHeight, width, 7);
    foreground.fillStyle(config.ground, 1);
    foreground.fillRect(x, y + height - groundHeight + 7, width, groundHeight - 7);

    const random = seededRandom(`${themeName}:foreground`);
    foreground.fillStyle(config.accent, 0.28);
    for (let markerX = x + 14; markerX < x + width; markerX += 25 + Math.floor(random() * 31)) {
      foreground.fillRect(markerX, y + height - groundHeight + 12, 3, 3);
    }
  }

  const objects = [sky, details, far, mid, foreground];
  let elapsed = 0;
  let destroyed = false;
  const animate = options.animate !== false;

  const update = (_time, delta = 16.67) => {
    if (destroyed) return;
    elapsed += delta;
    const drift = animate ? elapsed * 0.003 : 0;
    far.tilePositionX = camera.scrollX * (options.farFactor ?? 0.08) + drift;
    mid.tilePositionX = camera.scrollX * (options.midFactor ?? 0.22) + drift * 1.7;
    far.tilePositionY = camera.scrollY * (options.farVerticalFactor ?? 0.04);
    mid.tilePositionY = camera.scrollY * (options.midVerticalFactor ?? 0.1);

    if (animate) {
      details.setAlpha(0.9 + Math.sin(elapsed / 1100) * 0.08);
    }
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, update);

  const controller = {
    theme: themeName,
    sky,
    details,
    far,
    mid,
    foreground,
    objects,
    setVisible(visible) {
      objects.forEach((object) => object.setVisible(visible));
      return this;
    },
    setDepth(nextDepth) {
      objects.forEach((object, index) => object.setDepth(nextDepth + index));
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, shutdown);
      objects.forEach((object) => {
        if (object?.scene) object.destroy();
      });
    },
  };

  const shutdown = () => controller.destroy();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, shutdown);
  update(0, 0);
  return controller;
}

/**
 * Announce an important canvas change through the live region in index.html.
 * Repeated identical messages are cleared for one frame so screen readers
 * announce them again.
 */
export function announce(message, options = {}) {
  if (typeof document === 'undefined') return false;
  const status = document.getElementById(options.statusId ?? 'game-status');
  if (!status) return false;

  const text = String(message ?? '').trim();
  const token = ++announcementToken;
  const politeness = options.politeness === 'assertive' ? 'assertive' : 'polite';
  status.setAttribute('aria-live', politeness);
  status.setAttribute('aria-atomic', 'true');
  status.textContent = '';

  if (clearAnnouncementTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(clearAnnouncementTimer);
    clearAnnouncementTimer = null;
  }

  const publish = () => {
    if (token !== announcementToken) return;
    status.textContent = text;

    if (options.clearAfterMs > 0 && typeof window !== 'undefined') {
      clearAnnouncementTimer = window.setTimeout(() => {
        if (token === announcementToken) status.textContent = '';
      }, options.clearAfterMs);
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(publish);
  } else {
    publish();
  }

  return true;
}

export const addPixelBackground = createPixelBackground;
export const createText = createBodyText;
export const addPanel = createPanel;
