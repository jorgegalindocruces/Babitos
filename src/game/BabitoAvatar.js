import Phaser from 'phaser';
import {
  BABITO_PALETTES,
  BABITO_TEXTURE_SIZE,
  TEXTURE_KEYS,
  createTextures,
} from './createTextures.js';

export const BABITO_SIZE_SCALES = Object.freeze({
  small: 0.82,
  normal: 1,
  large: 1.18,
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
  run: 'walk',
  running: 'walk',
  walking: 'walk',
  airborne: 'jump',
  falling: 'fall',
  shooting: 'attack',
  shoot: 'attack',
  hit: 'hurt',
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
    this.layers = {};
    this.appearance = { ...DEFAULT_BABITO_APPEARANCE };
    this.bodyColorId = 'cyan';
    this.sizeVariant = 'normal';
    this.facing = 1;
    this.motionState = 'idle';
    this.motionVelocity = { x: 0, y: 0 };
    this._motionArmsKey = null;
    this._followTarget = null;
    this._followOptions = null;
    this._followTargetWasVisible = null;
    this._destroying = false;

    this._buildLayers();
    super.setSize(BABITO_TEXTURE_SIZE, BABITO_TEXTURE_SIZE);
    scene.add.existing(this);

    this.setAppearance(appearance, size);

    this._onSceneUpdate = (time) => {
      this.syncToTarget();
      this._applyMotion(time);
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._onSceneUpdate);
  }

  _buildLayers() {
    this.visualRoot = new Phaser.GameObjects.Container(this.scene, 0, 0);
    this.visualRoot.name = 'babito-visual-root';
    this.container = this.visualRoot;
    this.add(this.visualRoot);

    const makeLayer = (name, initialKey) => {
      const image = new Phaser.GameObjects.Image(this.scene, 0, 0, initialKey);
      image.setOrigin(0.5, 0.5);
      image.name = `babito-${name}`;
      this.layers[name] = image;
      this.visualRoot.add(image);
      return image;
    };

    // Order matters: arms behind the body, cosmetics in front of the face.
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
    layer.setTexture(key).setVisible(true);
  }

  _refreshArmLayer() {
    const appearanceKey = this._resolveTexture(
      this.appearance.arms,
      TEXTURE_KEYS.arms,
      'arms_',
      TEXTURE_KEYS.arms.round,
    );
    this.appearance.arms = appearanceKey ?? TEXTURE_KEYS.arms.round;
    this._setLayerTexture('arms', this._motionArmsKey ?? appearanceKey);
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
    this._setLayerTexture('neck', neckKey);
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
      return this;
    }

    const id = asId(size);
    const variant = BABITO_SIZE_SCALES[id] ? id : 'normal';
    this.sizeVariant = variant;
    this.setScale(BABITO_SIZE_SCALES[variant]);
    return this;
  }

  /**
   * Mirrors every visual layer without changing the Container scale.
   * @param {'left'|'right'|number} direction Negative means left.
   * @returns {this}
   */
  setFacing(direction) {
    this.facing = normalizeFacing(direction);
    for (const layer of Object.values(this.layers)) {
      layer.setFlipX(this.facing < 0);
    }
    return this;
  }

  /**
   * Selects a lightweight procedural pose. This does not replace the stored
   * cosmetic arm choice; leaving the temporary state restores it.
   *
   * Supported states: idle, walk, jump, fall, attack, hurt.
   * @param {string} state
   * @param {{x?: number, y?: number}|Phaser.Math.Vector2} [velocity]
   * @returns {this}
   */
  setMotion(state = 'idle', velocity = {}) {
    const requested = asId(state) || 'idle';
    this.motionState = MOTION_ALIASES[requested] ?? requested;
    this.motionVelocity.x = Number.isFinite(Number(velocity?.x)) ? Number(velocity.x) : 0;
    this.motionVelocity.y = Number.isFinite(Number(velocity?.y)) ? Number(velocity.y) : 0;

    if (Math.abs(this.motionVelocity.x) > 0.01) {
      this.setFacing(this.motionVelocity.x);
    }

    if (this.motionState === 'attack') {
      this._motionArmsKey = TEXTURE_KEYS.arms.attack;
    } else if (this.motionState === 'jump' || this.motionState === 'hurt') {
      this._motionArmsKey = TEXTURE_KEYS.arms.raised;
    } else {
      this._motionArmsKey = null;
    }
    this._refreshArmLayer();
    return this;
  }

  /** Brief attack accent used by PlayerController without disturbing size. */
  pulseAttack(duration = 110) {
    if (!this.scene?.tweens || !this.visualRoot) return this;
    this.scene.tweens.add({
      targets: this.visualRoot,
      angle: this.facing * 7,
      duration: Math.max(40, Number(duration) || 110) / 2,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => this.visualRoot?.setAngle(0),
    });
    return this;
  }

  _applyMotion(time = 0) {
    let offsetX = 0;
    let offsetY = 0;

    if (this.motionState === 'idle') {
      offsetY = Math.round(Math.sin(time * 0.006));
    } else if (this.motionState === 'walk') {
      const speedFactor = Phaser.Math.Clamp(Math.abs(this.motionVelocity.x) / 180, 0.7, 2);
      offsetY = Math.round(Math.abs(Math.sin(time * 0.018 * speedFactor)) * -2);
    } else if (this.motionState === 'jump') {
      offsetY = -1;
    } else if (this.motionState === 'fall') {
      offsetY = 1;
    } else if (this.motionState === 'hurt') {
      offsetX = Math.round(Math.sin(time * 0.08) * 2);
    }

    this.visualRoot.setPosition(offsetX, offsetY);
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
    const sceneEvents = this.scene?.events;
    if (sceneEvents && this._onSceneUpdate) {
      sceneEvents.off(Phaser.Scenes.Events.UPDATE, this._onSceneUpdate);
    }
    this.stopFollowing();
    super.destroy(fromScene);
  }
}

export default BabitoAvatar;
