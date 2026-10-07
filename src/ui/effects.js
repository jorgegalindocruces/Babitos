import Phaser from 'phaser';
import { announce, UI_COLORS, UI_FONTS } from './sceneHelpers.js';
import { configureTextQuality } from './textQuality.js';

const activeToasts = new WeakMap();
const transitioningScenes = new WeakSet();

const TOAST_STYLES = Object.freeze({
  info: Object.freeze({
    fill: 0x123a5b,
    border: 0x71e5ff,
    text: '#f7fbff',
  }),
  success: Object.freeze({
    fill: 0x12472f,
    border: 0x69e690,
    text: '#f4fff7',
  }),
  warning: Object.freeze({
    fill: 0x5b3c0f,
    border: 0xffcf3c,
    text: '#fff9df',
  }),
  error: Object.freeze({
    fill: 0x5a1f35,
    border: 0xff7299,
    text: '#fff5f8',
  }),
});

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function colorToRgb(value) {
  if (typeof value === 'string') {
    const normalized = value.startsWith('#') ? value : `#${value}`;
    const color = Phaser.Display.Color.HexStringToColor(normalized);
    return { red: color.red, green: color.green, blue: color.blue };
  }

  const color = Phaser.Display.Color.IntegerToColor(Number(value) || 0);
  return { red: color.red, green: color.green, blue: color.blue };
}

function safeDestroy(gameObject) {
  if (gameObject?.scene && !gameObject.ignoreDestroy) {
    gameObject.destroy();
  }
}

/**
 * Show a short, camera-fixed feedback message. Only one toast is visible per
 * scene; a newer message replaces the previous one and is announced through
 * the live region by default.
 */
export function showToast(scene, message, options = {}) {
  const previous = activeToasts.get(scene);
  previous?.dismiss?.(true);

  const type = TOAST_STYLES[options.type] ? options.type : 'info';
  const style = { ...TOAST_STYLES[type], ...options.style };
  const maxWidth = Math.max(220, Math.min(scene.scale.width - 48, Number(options.maxWidth) || 580));
  const minWidth = Math.min(maxWidth, Math.max(160, Number(options.minWidth) || 260));
  const paddingX = Math.max(12, Number(options.paddingX) || 24);
  const paddingY = Math.max(8, Number(options.paddingY) || 14);
  const targetY = Number.isFinite(options.y)
    ? options.y
    : (options.position === 'bottom' ? scene.scale.height - 66 : 64);

  const container = scene.add.container(scene.scale.width / 2, targetY)
    .setDepth(Number.isFinite(options.depth) ? options.depth : 5000)
    .setScrollFactor(0);
  const text = scene.add.text(0, 0, String(message ?? ''), {
    fontFamily: options.fontFamily ?? UI_FONTS.body,
    fontSize: typeof options.fontSize === 'string'
      ? options.fontSize
      : `${Number(options.fontSize) || 18}px`,
    fontStyle: options.fontStyle ?? 'bold',
    color: style.text,
    align: 'center',
    lineSpacing: 3,
    wordWrap: {
      width: maxWidth - paddingX * 2,
      useAdvancedWrap: true,
    },
  }).setOrigin(0.5);
  configureTextQuality(text, { resolution: options.textResolution });

  const panelWidth = Math.max(minWidth, Math.min(maxWidth, text.width + paddingX * 2));
  const panelHeight = Math.max(46, text.height + paddingY * 2);
  const panel = scene.add.graphics();
  panel.fillStyle(0x020814, 0.62);
  panel.fillRoundedRect(-panelWidth / 2 + 4, -panelHeight / 2 + 5, panelWidth, panelHeight, 11);
  panel.fillStyle(style.fill, options.fillAlpha ?? 0.97);
  panel.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 11);
  panel.lineStyle(3, style.border, 1);
  panel.strokeRoundedRect(-panelWidth / 2 + 1.5, -panelHeight / 2 + 1.5, panelWidth - 3, panelHeight - 3, 10);
  panel.lineStyle(2, 0xffffff, 0.14);
  panel.beginPath();
  panel.moveTo(-panelWidth / 2 + 13, -panelHeight / 2 + 7);
  panel.lineTo(panelWidth / 2 - 13, -panelHeight / 2 + 7);
  panel.strokePath();
  container.add([panel, text]);

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const direction = options.position === 'bottom' ? 1 : -1;
  const entranceOffset = Number(options.entranceOffset) || 18;
  const requestedDuration = Number(options.duration);
  const duration = Math.max(0, Number.isFinite(requestedDuration) ? requestedDuration : 2400);
  let dismissTimer = null;
  let dismissed = false;

  const cleanup = () => {
    dismissTimer?.remove(false);
    dismissTimer = null;
    scene.tweens?.killTweensOf(container);
    if (activeToasts.get(scene) === container) activeToasts.delete(scene);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    container.off(Phaser.GameObjects.Events.DESTROY, cleanup);
  };

  container.dismiss = (immediate = false) => {
    if (dismissed) return container;
    dismissed = true;
    dismissTimer?.remove(false);
    dismissTimer = null;

    if (immediate || reducedMotion || !container.scene) {
      cleanup();
      safeDestroy(container);
      return container;
    }

    scene.tweens.add({
      targets: container,
      y: targetY - direction * entranceOffset,
      alpha: 0,
      duration: Math.max(80, Number(options.exitDuration) || 150),
      ease: 'Quad.easeIn',
      onComplete: () => {
        cleanup();
        safeDestroy(container);
      },
    });
    return container;
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  container.once(Phaser.GameObjects.Events.DESTROY, cleanup);
  activeToasts.set(scene, container);

  if (options.announce !== false) {
    announce(message, {
      politeness: options.politeness ?? (type === 'error' ? 'assertive' : 'polite'),
    });
  }

  if (reducedMotion) {
    container.setAlpha(1).setY(targetY);
  } else {
    container.setAlpha(0).setY(targetY + direction * entranceOffset);
    scene.tweens.add({
      targets: container,
      y: targetY,
      alpha: 1,
      duration: Math.max(100, Number(options.enterDuration) || 180),
      ease: 'Back.easeOut',
    });
  }

  if (duration > 0) {
    dismissTimer = scene.time.delayedCall(duration, () => container.dismiss());
  }

  return container;
}

function cameraFade(scene, direction, options = {}) {
  const camera = options.camera ?? scene.cameras.main;
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const requestedDuration = Number(options.duration);
  const duration = Math.max(0, Number.isFinite(requestedDuration) ? requestedDuration : 220);

  if (!camera || reducedMotion || duration === 0) {
    return Promise.resolve(true);
  }

  const rgb = colorToRgb(options.color ?? UI_COLORS.ink);
  const eventName = direction === 'in'
    ? Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE
    : Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE;
  const cameraDestroyEvent = Phaser.Cameras.Scene2D.Events.DESTROY;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (completed) => {
      if (settled) return;
      settled = true;
      camera.off(eventName, onComplete);
      camera.off(cameraDestroyEvent, onCameraDestroy);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      resolve(completed);
    };
    const onComplete = () => finish(true);
    const onShutdown = () => finish(false);
    const onCameraDestroy = () => finish(false);

    camera.once(eventName, onComplete);
    camera.once(cameraDestroyEvent, onCameraDestroy);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    camera.resetFX();

    if (direction === 'in') {
      camera.fadeIn(duration, rgb.red, rgb.green, rgb.blue);
    } else {
      camera.fadeOut(duration, rgb.red, rgb.green, rgb.blue);
    }
  });
}

/** Fade the current camera in. Call this in a destination scene's create(). */
export function fadeIn(scene, options = {}) {
  return cameraFade(scene, 'in', options);
}

/** Fade the current camera out without changing scenes. */
export function fadeOut(scene, options = {}) {
  return cameraFade(scene, 'out', options);
}

/**
 * Fade out and start another scene. Repeated calls during the same transition
 * are ignored. Destination scenes can call `fadeIn(this)` in create().
 */
export async function transitionToScene(scene, targetScene, data = {}, options = {}) {
  if (!scene?.scene || typeof targetScene !== 'string' || targetScene.length === 0) {
    throw new TypeError('transitionToScene requires a scene and a target scene key.');
  }
  if (transitioningScenes.has(scene)) return false;

  transitioningScenes.add(scene);
  if (options.announcement) {
    announce(options.announcement, { politeness: options.politeness });
  }

  try {
    const completed = await fadeOut(scene, options);
    transitioningScenes.delete(scene);
    if (!completed) return false;
    scene.scene.start(targetScene, data);
    return true;
  } catch (error) {
    transitioningScenes.delete(scene);
    throw error;
  }
}

/** Brief camera flash suitable for pickups, damage or successful purchases. */
export function flashScreen(scene, options = {}) {
  const camera = options.camera ?? scene.cameras.main;
  if (!camera || prefersReducedMotion()) return false;
  const rgb = colorToRgb(options.color ?? 0xffffff);
  camera.flash(
    Math.max(40, Number(options.duration) || 110),
    rgb.red,
    rgb.green,
    rgb.blue,
    options.force === true,
    options.callback,
  );
  return true;
}

/**
 * Lightweight ambient pixels for menus. No particle texture or asset is
 * required, and its update listener is removed when the scene shuts down.
 */
export function createAmbientMotes(scene, options = {}) {
  const area = new Phaser.Geom.Rectangle(
    Number(options.x) || 0,
    Number(options.y) || 0,
    Number(options.width) || scene.scale.width,
    Number(options.height) || scene.scale.height,
  );
  const count = Phaser.Math.Clamp(Math.floor(Number(options.count) || 18), 1, 80);
  const random = new Phaser.Math.RandomDataGenerator([
    String(options.seed ?? scene.sys.settings.key ?? 'babitos'),
  ]);
  const container = scene.add.container(0, 0)
    .setDepth(Number.isFinite(options.depth) ? options.depth : -900)
    .setScrollFactor(0);
  const motes = [];
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();

  for (let index = 0; index < count; index += 1) {
    const size = random.pick([2, 2, 3, 4]);
    const mote = scene.add.rectangle(
      random.realInRange(area.left, area.right),
      random.realInRange(area.top, area.bottom),
      size,
      size,
      options.color ?? UI_COLORS.cyan,
      random.realInRange(options.minAlpha ?? 0.18, options.maxAlpha ?? 0.55),
    );
    mote.moteSpeed = random.realInRange(options.minSpeed ?? 3, options.maxSpeed ?? 11);
    mote.motePhase = random.realInRange(0, Math.PI * 2);
    mote.moteBaseX = mote.x;
    motes.push(mote);
    container.add(mote);
  }

  let elapsed = 0;
  let destroyed = false;
  const update = (_time, delta = 16.67) => {
    if (destroyed || reducedMotion) return;
    const seconds = Math.min(delta, 50) / 1000;
    elapsed += seconds;

    for (const mote of motes) {
      mote.y -= mote.moteSpeed * seconds;
      mote.x = mote.moteBaseX + Math.sin(elapsed * 0.8 + mote.motePhase) * 7;
      if (mote.y < area.top - 5) {
        mote.y = area.bottom + 5;
        mote.moteBaseX = random.realInRange(area.left, area.right);
      }
    }
  };

  const destroy = (destroyContainer = true) => {
    if (destroyed) return;
    destroyed = true;
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, destroy);
    container.off(Phaser.GameObjects.Events.DESTROY, onContainerDestroy);
    if (destroyContainer) safeDestroy(container);
  };
  const onContainerDestroy = () => destroy(false);

  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  container.once(Phaser.GameObjects.Events.DESTROY, onContainerDestroy);
  container.destroyMotes = destroy;
  return container;
}

export const toast = showToast;
export const screenTransition = transitionToScene;
