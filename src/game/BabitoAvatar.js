import Phaser from 'phaser';
import {
  BABITO_ANIMATION_CLIPS,
  BABITO_PALETTES,
  BABITO_RENDER_SIZE,
  TEXTURE_KEYS,
  createTextures,
  sampleBabitoAnimationFrame,
} from './createTextures.js';

export const BABITO_SIZE_SCALES = Object.freeze({
  small: 0.75,
  normal: 1,
  large: 1.25,
});

export const DEFAULT_BABITO_APPEARANCE = Object.freeze({
  body: 'body_cyan',
  eyes: 'eyes_normal',
  mouth: 'mouth_smile',
  arms: 'arms_round',
  headAccessory: 'straw_hat',
  glasses: 'none',
  neckAccessory: 'none',
});

const MOTION_ALIASES = Object.freeze({
  running: 'run',
  walking: 'walk',
  airborne: 'jump',
  falling: 'fall',
  shooting: 'attack',
  shoot: 'attack',
  hit: 'hurt',
  death: 'dead',
  defeated: 'dead',
  knocked_out: 'dead',
});

function asId(value) {
  const candidate = value && typeof value === 'object'
    ? (value.id ?? value.assetKey)
    : value;
  return typeof candidate === 'string' ? candidate.trim().toLowerCase() : candidate;
}

function isNone(value) {
  const id = asId(value);
  return value == null || value === false || id === '' || id === 'none' || id === 'off';
}

function findMappedKey(value, map, prefix = '') {
  if (isNone(value)) return null;
  const id = asId(value);
  if (Object.values(map).includes(id)) return id;
  const shortId = prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id;
  if (map[shortId]) return map[shortId];
  return Object.entries(map).find(([name]) => asId(name) === shortId)?.[1] ?? null;
}

function normalizeBodyId(value) {
  const requested = asId(value ?? 'cyan');
  const withoutPrefix = requested.startsWith('body_') ? requested.slice(5) : requested;
  const aliases = {
    blue: 'cyan',
    azul: 'cyan',
    black: 'charcoal',
    dark: 'charcoal',
    gray: 'charcoal',
    grey: 'charcoal',
    blanco: 'cream',
    white: 'cream',
    green: 'lime',
    verde: 'lime',
  };
  const id = aliases[withoutPrefix] ?? withoutPrefix;
  return BABITO_PALETTES[id] ? id : 'cyan';
}

function normalizeFacing(direction) {
  if (direction === 'left' || direction === 'izquierda') return -1;
  if (direction === 'right' || direction === 'derecha') return 1;
  const numeric = Number(direction);
  return Number.isFinite(numeric) && numeric < 0 ? -1 : 1;
}

function textureExists(scene, key) {
  return Boolean(key && scene?.textures?.exists(key));
}

/**
 * Composable, purely visual Babito made from generated texture layers.
 *
 * It can be positioned directly like any Phaser Container, or attached to an
 * Arcade Physics sprite through {@link BabitoAvatar#follow}. Physics remain on
 * the followed object; this class never mutates its body or collision shape.
 *
 * @example
 * const avatar = new BabitoAvatar(scene, player.x, player.y, appearance, 'normal');
 * avatar.follow(player, { hideTarget: true, depthOffset: 1 });
 */
export class BabitoAvatar extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {Partial<typeof DEFAULT_BABITO_APPEARANCE>} [appearance]
   * @param {'small'|'normal'|'large'|number} [size='normal']
   */
  constructor(
    scene,
    x = 0,
    y = 0,
    appearance = DEFAULT_BABITO_APPEARANCE,
    size = 'normal',
  ) {
    if (!scene) throw new TypeError('BabitoAvatar requires a Phaser.Scene.');

    createTextures(scene);
    super(scene, x, y);

    /** Inner visual root; controllers can tween it without losing body-size scale. */
    this.container = null;
    this.motionRoot = null;
    this.layers = {};
    this.appearance = { ...DEFAULT_BABITO_APPEARANCE };
    this.bodyColorId = 'cyan';
    this.sizeVariant = 'normal';
    this.facing = 1;
    this.motionState = 'idle';
    this.motionVelocity = { x: 0, y: 0 };
    this.motionElapsedMs = 0;
    this.motionFrame = BABITO_ANIMATION_CLIPS.idle.start;
    this._scaleTween = null;
    this._actionTween = null;
    this._followTarget = null;
    this._followOptions = null;
    this._followTargetWasVisible = null;
    this._destroying = false;

    this._buildLayers();
    super.setSize(BABITO_RENDER_SIZE, BABITO_RENDER_SIZE);
    scene.add.existing(this);

    this.setAppearance(appearance, size);

    this._onSceneUpdate = (time, delta) => {
      this.syncToTarget();
      this._applyMotion(time, delta);
    };
    // PlayerController resolves velocity/state during Scene.update. Sampling in
    // POST_UPDATE prevents the visual from trailing physics by one frame.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this._onSceneUpdate);
  }

  _buildLayers() {
    this.visualRoot = new Phaser.GameObjects.Container(this.scene, 0, 0);
    this.visualRoot.name = 'babito-visual-root';
    this.container = this.visualRoot;
    this.add(this.visualRoot);
    this.motionRoot = new Phaser.GameObjects.Container(this.scene, 0, 0);
    this.motionRoot.name = 'babito-motion-root';
    this.visualRoot.add(this.motionRoot);

    const makeLayer = (name, initialKey) => {
      const image = new Phaser.GameObjects.Image(this.scene, 0, 0, initialKey, 0);
      image
        .setOrigin(0.5, 0.5)
        .setDisplaySize(BABITO_RENDER_SIZE, BABITO_RENDER_SIZE);
      image.name = `babito-${name}`;
      this.layers[name] = image;
      this.motionRoot.add(image);
      return image;
    };

    // Order matters: capes and arms sit behind the body; bow ties stay in front.
    makeLayer('cape', TEXTURE_KEYS.neck.heroCape).setVisible(false);
    makeLayer('arms', TEXTURE_KEYS.arms.default);
    makeLayer('body', TEXTURE_KEYS.body.cyan);
    makeLayer('eyes', TEXTURE_KEYS.eyes.normal);
    makeLayer('mouth', TEXTURE_KEYS.mouth.smile);
    makeLayer('neck', TEXTURE_KEYS.neck.bowtie).setVisible(false);
    makeLayer('head', TEXTURE_KEYS.head.strawHat);
    makeLayer('glasses', TEXTURE_KEYS.glasses.sunglasses).setVisible(false);
  }

  _resolveTexture(value, map, prefix, fallback) {
    if (isNone(value)) return null;
    const direct = asId(value);
    if (textureExists(this.scene, direct)) return direct;
    const mapped = findMappedKey(value, map, prefix);
    if (textureExists(this.scene, mapped)) return mapped;
    return fallback;
  }

  _setLayerTexture(layerName, key) {
    const layer = this.layers[layerName];
    if (!layer) return;
    if (!key) {
      layer.setVisible(false);
      return;
    }
    const texture = this.scene.textures.get(key);
    const frame = texture?.has?.(this.motionFrame)
      ? this.motionFrame
      : (texture?.has?.(0) ? 0 : undefined);
    layer.setTexture(key, frame).setVisible(true);
  }

  _refreshArmLayer() {
    const appearanceKey = this._resolveTexture(
      this.appearance.arms,
      TEXTURE_KEYS.arms,
      'arms_',
      TEXTURE_KEYS.arms.round,
    );
    this.appearance.arms = appearanceKey ?? TEXTURE_KEYS.arms.round;
    // Every cosmetic arm texture follows the same frame grid, so an equipped
    // silhouette remains equipped while walking, jumping and attacking.
    this._setLayerTexture('arms', appearanceKey);
    this.layers.arms.clearTint();
    this.layers.arms.setTint(BABITO_PALETTES[this.bodyColorId].tint);
  }

  /**
   * Applies a partial appearance and, optionally, a body size. Unknown IDs
   * safely fall back to the canonical defaults instead of producing a missing
   * texture. Both long catalog IDs and short names are accepted.
   *
   * @param {object} [appearance]
   * @param {'small'|'normal'|'large'|number} [size]
   * @returns {this}
   */
  setAppearance(appearance = {}, size) {
    const patch = appearance ?? {};
    const bodyRequest = patch.body ?? patch.color;
    if (bodyRequest !== undefined) this.appearance.body = bodyRequest;
    if (patch.eyes !== undefined) this.appearance.eyes = patch.eyes;
    if (patch.mouth !== undefined) this.appearance.mouth = patch.mouth;
    if (patch.arms !== undefined) this.appearance.arms = patch.arms;

    const head = patch.headAccessory ?? patch.head;
    const glasses = patch.glasses;
    const neck = patch.neckAccessory ?? patch.neck;
    if (head !== undefined) this.appearance.headAccessory = head;
    if (glasses !== undefined) this.appearance.glasses = glasses;
    if (neck !== undefined) this.appearance.neckAccessory = neck;

    this.bodyColorId = normalizeBodyId(this.appearance.body);
    this.appearance.body = TEXTURE_KEYS.body[this.bodyColorId];

    this._setLayerTexture('body', TEXTURE_KEYS.body[this.bodyColorId]);
    const eyesKey = this._resolveTexture(
      this.appearance.eyes,
      TEXTURE_KEYS.eyes,
      'eyes_',
      TEXTURE_KEYS.eyes.normal,
    );
    const mouthKey = this._resolveTexture(
      this.appearance.mouth,
      TEXTURE_KEYS.mouth,
      'mouth_',
      TEXTURE_KEYS.mouth.smile,
    );
    const headKey = this._resolveTexture(this.appearance.headAccessory, TEXTURE_KEYS.head, '', null);
    const glassesKey = this._resolveTexture(this.appearance.glasses, TEXTURE_KEYS.glasses, '', null);
    const neckKey = this._resolveTexture(this.appearance.neckAccessory, TEXTURE_KEYS.neck, '', null);

    this.appearance.eyes = eyesKey ?? TEXTURE_KEYS.eyes.normal;
    this.appearance.mouth = mouthKey ?? TEXTURE_KEYS.mouth.smile;
    this.appearance.headAccessory = headKey ?? 'none';
    this.appearance.glasses = glassesKey ?? 'none';
    this.appearance.neckAccessory = neckKey ?? 'none';
    this._setLayerTexture('eyes', eyesKey);
    this._setLayerTexture('mouth', mouthKey);
    this._setLayerTexture('head', headKey);
    this._setLayerTexture('glasses', glassesKey);
    const capeKey = neckKey === TEXTURE_KEYS.neck.heroCape ? neckKey : null;
    this._setLayerTexture('cape', capeKey);
    this._setLayerTexture('neck', capeKey ? null : neckKey);
    this._refreshArmLayer();

    this.setSizeVariant(size ?? patch.size ?? this.sizeVariant);
    return this;
  }

  /** @returns {object} A defensive snapshot safe to persist. */
  getAppearance() {
    return {
      ...this.appearance,
      size: this.sizeVariant,
    };
  }

  /**
   * Sets a named game-data size or an explicit positive scale.
   * @param {'small'|'normal'|'large'|number} size
   * @returns {this}
   */
  setSizeVariant(size = 'normal') {
    const numeric = Number(size);
    if (typeof size === 'number' || (typeof size === 'string' && size !== '' && Number.isFinite(numeric))) {
      const safeScale = Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
      this.sizeVariant = safeScale;
      this.setScale(safeScale);
      this._alignVisualBaseline(safeScale);
      return this;
    }

    const id = asId(size);
    const variant = BABITO_SIZE_SCALES[id] ? id : 'normal';
    this.sizeVariant = variant;
    const scale = BABITO_SIZE_SCALES[variant];
    this.setScale(scale);
    this._alignVisualBaseline(scale);
    return this;
  }

  _alignVisualBaseline(scale = 1) {
    const safeScale = Math.max(0.01, Number(scale) || 1);
    const baseline = 20;
    this.visualRoot?.setY((baseline / safeScale) - baseline);
  }

  /**
   * Mirrors every visual layer without changing the Container scale.
   * @param {'left'|'right'|number} direction Negative means left.
   * @returns {this}
   */
  setFacing(direction) {
    const nextFacing = normalizeFacing(direction);
    if (this.facing === nextFacing) return this;
    this.facing = nextFacing;
    for (const layer of Object.values(this.layers)) {
      layer.setFlipX(this.facing < 0);
    }
    return this;
  }

  /**
   * Selects a lightweight procedural pose. This does not replace the stored
   * cosmetic arm choice; leaving the temporary state restores it.
   *
   * Supported states: idle, walk, run, jump, fall, attack, hurt, dead.
   * @param {string} state
   * @param {{x?: number, y?: number}|Phaser.Math.Vector2} [velocity]
   * @param {{restart?: boolean}} [options]
   * @returns {this}
   */
  setMotion(state = 'idle', velocity = {}, options = {}) {
    const requested = asId(state) || 'idle';
    const normalized = MOTION_ALIASES[requested] ?? requested;
    const nextState = Object.hasOwn(BABITO_ANIMATION_CLIPS, normalized) ? normalized : 'idle';
    if (this.motionState !== nextState || options.restart === true) {
      this.motionState = nextState;
      this.motionElapsedMs = 0;
      this.motionRoot?.setPosition(0, 0).setAngle(0);
      this._setMotionFrame(BABITO_ANIMATION_CLIPS[nextState].start);
    }
    this.motionVelocity.x = Number.isFinite(Number(velocity?.x)) ? Number(velocity.x) : 0;
    this.motionVelocity.y = Number.isFinite(Number(velocity?.y)) ? Number(velocity.y) : 0;

    if (
      this.motionState !== 'attack'
      && this.motionState !== 'hurt'
      && Math.abs(this.motionVelocity.x) > 0.01
    ) {
      this.setFacing(this.motionVelocity.x);
    }

    return this;
  }

  pulseJump() {
    // Squash/stretch is authored into the six jump frames. A transform tween
    // on top of the raster caused shimmer at small/large cosmetic scales.
    return this;
  }

  pulseLanding() {
    return this;
  }

  /** Brief attack accent used by PlayerController without disturbing size. */
  pulseAttack() {
    return this;
  }

  cancelScalePulse() {
    const tween = this._scaleTween;
    this._scaleTween = null;
    if (tween && !tween.isDestroyed?.()) {
      tween.remove?.();
      tween.destroy?.();
    }
    this.visualRoot?.setScale(1);
    return this;
  }

  cancelActionPulse() {
    const tween = this._actionTween;
    this._actionTween = null;
    if (tween && !tween.isDestroyed?.()) {
      tween.remove?.();
      tween.destroy?.();
    }
    this.visualRoot?.setAngle(0);
    return this;
  }

  cancelMotionPulses() {
    this.cancelScalePulse();
    this.cancelActionPulse();
    return this;
  }

  _setMotionFrame(frame) {
    const nextFrame = Number.isFinite(Number(frame)) ? Number(frame) : 0;
    if (this.motionFrame === nextFrame && this.layers.body?.frame?.name === nextFrame) return this;
    this.motionFrame = nextFrame;
    for (const layer of Object.values(this.layers)) {
      const texture = layer.texture;
      if (texture?.has?.(nextFrame)) layer.setFrame(nextFrame);
      else if (texture?.has?.(0)) layer.setFrame(0);
    }
    return this;
  }

  _applyMotion(_time = 0, delta = 16.67) {
    if (!this.scene?.time?.paused) {
      this.motionElapsedMs += Math.max(0, Number(delta) || 0);
    }

    const clip = BABITO_ANIMATION_CLIPS[this.motionState] ?? BABITO_ANIMATION_CLIPS.idle;
    let speedMultiplier = 1;
    if (this.motionState === 'walk') {
      speedMultiplier = Phaser.Math.Clamp(Math.abs(this.motionVelocity.x) / 135, 0.75, 1.3);
    } else if (this.motionState === 'run') {
      speedMultiplier = Phaser.Math.Clamp(Math.abs(this.motionVelocity.x) / 260, 0.85, 1.35);
    }
    const frame = sampleBabitoAnimationFrame(
      this.motionState,
      this.motionElapsedMs,
      speedMultiplier,
    );
    const localFrame = frame - clip.start;
    this._setMotionFrame(frame);

    // Major lean/squash silhouettes are authored in the synchronized atlas.
    // Only whole-pixel accents remain here, avoiding fractional raster shimmer.
    let offsetX = 0;
    let offsetY = 0;
    if (this.motionState === 'attack') {
      offsetX = this.facing * [0, 0, 1, 2, 1, 0][localFrame];
    } else if (this.motionState === 'hurt') {
      offsetX = this.facing * [1, -1, 1, 0, 0][localFrame];
      offsetY = [-1, 0, 1, 1, 0][localFrame];
    }
    this.motionRoot?.setPosition(Math.round(offsetX), Math.round(offsetY)).setAngle(0);
  }

  /**
   * Makes this avatar track another GameObject (usually an invisible physics
   * sprite). Call {@link BabitoAvatar#stopFollowing} to detach it.
   *
   * @param {Phaser.GameObjects.GameObject & {x:number,y:number}} target
   * @param {{
   *   offsetX?: number,
   *   offsetY?: number,
   *   hideTarget?: boolean,
   *   mirrorFromVelocity?: boolean,
   *   copyVisible?: boolean,
   *   copyAlpha?: boolean,
   *   copyRotation?: boolean,
   *   syncDepth?: boolean,
   *   depthOffset?: number
   * }} [options]
   * @returns {this}
   */
  follow(target, options = {}) {
    if (!target || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))) {
      throw new TypeError('BabitoAvatar.follow(target) requires a positioned GameObject.');
    }

    this.stopFollowing();
    this._followTarget = target;
    this._followOptions = {
      offsetX: 0,
      offsetY: 0,
      hideTarget: false,
      mirrorFromVelocity: true,
      copyVisible: false,
      copyAlpha: false,
      copyRotation: false,
      syncDepth: true,
      depthOffset: 0,
      ...options,
    };

    if (this._followOptions.hideTarget) {
      this._followTargetWasVisible = target.visible;
      target.setVisible?.(false);
    }

    this.syncToTarget();
    return this;
  }

  /** Alias that reads naturally from controller code. */
  attachTo(target, options = {}) {
    return this.follow(target, options);
  }

  /**
   * Copies transform/display state from the followed object. Public so a scene
   * can force a sync immediately after teleporting its physics sprite.
   * @returns {this}
   */
  syncToTarget() {
    const target = this._followTarget;
    const options = this._followOptions;
    if (!target || !options) return this;

    if (target.scene == null && target.active === false) {
      this.stopFollowing({ restoreTargetVisibility: false });
      return this;
    }

    this.setPosition(
      Number(target.x) + Number(options.offsetX || 0),
      Number(target.y) + Number(options.offsetY || 0),
    );

    if (options.mirrorFromVelocity) {
      const velocityX = target.body?.velocity?.x;
      if (Number.isFinite(velocityX) && Math.abs(velocityX) > 0.01) {
        this.setFacing(velocityX);
      } else if (typeof target.flipX === 'boolean') {
        this.setFacing(target.flipX ? -1 : 1);
      }
    }
    if (options.copyVisible && !options.hideTarget) this.setVisible(target.visible !== false);
    if (options.copyAlpha && Number.isFinite(target.alpha)) this.setAlpha(target.alpha);
    if (options.copyRotation && Number.isFinite(target.rotation)) this.setRotation(target.rotation);
    if (options.syncDepth && Number.isFinite(target.depth)) {
      this.setDepth(target.depth + Number(options.depthOffset || 0));
    }
    return this;
  }

  /**
   * @param {{restoreTargetVisibility?: boolean}} [options]
   * @returns {this}
   */
  stopFollowing({ restoreTargetVisibility = true } = {}) {
    if (
      restoreTargetVisibility
      && this._followTarget
      && this._followOptions?.hideTarget
      && this._followTargetWasVisible != null
    ) {
      this._followTarget.setVisible?.(this._followTargetWasVisible);
    }
    this._followTarget = null;
    this._followOptions = null;
    this._followTargetWasVisible = null;
    return this;
  }

  destroy(fromScene) {
    if (this._destroying) return;
    this._destroying = true;
    this.cancelMotionPulses();
    const sceneEvents = this.scene?.events;
    if (sceneEvents && this._onSceneUpdate) {
      sceneEvents.off(Phaser.Scenes.Events.POST_UPDATE, this._onSceneUpdate);
    }
    this.stopFollowing();
    super.destroy(fromScene);
  }
}

export default BabitoAvatar;
