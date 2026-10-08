import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { BabitoAvatar } from './BabitoAvatar.js';
import {
  getBabitoAnimationDurationMs,
  selectBabitoLocomotionState,
} from './BabitoAnimations.js';
import { getPower, launchPower } from './PowerSystem.js';
import {
  findOneWayPlatformsUnder,
  hasClearedPlatform,
  shouldCollideWithTerrain,
} from './platformCollision.js';
import {
  deriveJumpPhysics,
  getPlayerGravity,
  stepHorizontalVelocity,
} from './playerMovement.js';
import { hitStop, spawnDust } from '../ui/effects.js';

const ATTACK_ANIMATION_MS = getBabitoAnimationDurationMs('attack');
const HURT_ANIMATION_MS = getBabitoAnimationDurationMs('hurt');
const DEAD_ANIMATION_MS = getBabitoAnimationDurationMs('dead');
const RESPAWN_INVULNERABILITY_MS = 1500;
// A small downward nudge makes ↓ read as an intentional drop, not a slip.
const DROP_THROUGH_VELOCITY = 140;
const SPRING_MIN_RISE_RATIO = 0.6;

function getGameplayTime(scene) {
  const value = scene?.getGameplayTime?.();
  return Number.isFinite(value) ? value : (scene?.time?.now ?? 0);
}

function eventTargetsControl(event) {
  const target = event?.target;
  const tagName = target?.tagName;
  return Boolean(
    target?.isContentEditable
    || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(tagName),
  );
}

function consumeGameplayJustDown(key, suppressed = false) {
  if (!key) return false;
  const pressed = Phaser.Input.Keyboard.JustDown(key);
  return pressed
    && !suppressed
    && !key.originalEvent?.repeat
    && !eventTargetsControl(key.originalEvent);
}

export class PlayerController {
  constructor(scene, { x, y, save, platforms, projectiles, onHealth, onGameOver }) {
    this.scene = scene;
    this.save = save;
    this.platforms = platforms;
    this.projectiles = projectiles;
    this.onHealth = onHealth;
    this.onGameOver = onGameOver;
    this.config = gameData.player;
    this.movement = this.config.movement;
    this.jumpPhysics = deriveJumpPhysics(this.movement);
    this.health = this.config.maxHealth;
    this.facing = 1;
    this.enabled = true;
    this.isDead = false;
    this.invulnerableUntil = 0;
    this.lastGroundedAt = -Infinity;
    this.jumpBufferedUntil = -Infinity;
    this.nextAttackAt = 0;
    this.attackUntil = -Infinity;
    this.hurtUntil = -Infinity;
    this.controlLockedUntil = -Infinity;
    this.lastUpdateAt = null;
    this.jumpHeldSinceJump = false;
    this.wasGrounded = false;
    this.previousVerticalVelocity = 0;
    this.checkpoint = { x, y };
    this.virtual = { left: false, right: false, jump: false, attack: false, down: false };
    this.virtualPressed = { jump: false, attack: false, down: false };
    this.droppingThrough = new Set();
    this.hasDroppedThrough = false;
    this.keyboardPressed = { jump: false, attack: false, drop: false };
    this.suppressedUntilKeyUp = new Set();
    this.keyReleaseHandlers = new Map();
    this.keyPressHandlers = new Map();
    this.audio = scene.registry.get('audio');

    this.body = scene.physics.add.sprite(x, y, 'player_hitbox').setVisible(false);
    this.body.setDepth(10).setCollideWorldBounds(true);
    this.body.body.setSize(this.config.hitbox.width, this.config.hitbox.height, true);
    // Horizontal speed is shaped by playerMovement.js; the physics cap only
    // bounds knockback impulses and terminal fall speed.
    this.body.body.setMaxVelocity(900, this.movement.maxFallSpeed);
    this.body.setDragX(0);
    // A slightly larger landing window than enemies/coins forgives a jump
    // whose feet barely miss the top edge of a one-way platform.
    const landingTolerance = this.movement.landingTolerancePx;
    this.collider = scene.physics.add.collider(
      this.body,
      platforms,
      null,
      (first, second) => shouldCollideWithTerrain(first, second, {
        tolerance: landingTolerance,
        ignore: this.droppingThrough,
      }),
    );

    this.avatar = new BabitoAvatar(scene, x, y, save.appearance, save.size);
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.J,
      attackAlt: Phaser.Input.Keyboard.KeyCodes.X,
    });
    for (const [name, key] of Object.entries(this.keys)) {
      const release = () => this.suppressedUntilKeyUp.delete(name);
      const press = (_key, event) => {
        // A real fresh press clears a stale latch left by browser blur. A held
        // key's OS auto-repeat stays suppressed until its physical keyup.
        if (!event?.repeat) this.suppressedUntilKeyUp.delete(name);
      };
      key?.on?.('down', press);
      key?.on?.('up', release);
      this.keyPressHandlers.set(name, press);
      this.keyReleaseHandlers.set(name, release);
    }
    this.keyboardHandlers = {
      jump: (event) => {
        if (this.enabled && !event?.repeat && !eventTargetsControl(event)) {
          this.keyboardPressed.jump = true;
        }
      },
      attack: (event) => {
        if (this.enabled && !event?.repeat && !eventTargetsControl(event)) {
          this.keyboardPressed.attack = true;
        }
      },
      drop: (event) => {
        if (this.enabled && !event?.repeat && !eventTargetsControl(event)) {
          this.keyboardPressed.drop = true;
        }
      },
    };
    for (const eventName of ['keydown-SPACE', 'keydown-UP', 'keydown-W']) {
      scene.input.keyboard?.on(eventName, this.keyboardHandlers.jump);
    }
    for (const eventName of ['keydown-J', 'keydown-X']) {
      scene.input.keyboard?.on(eventName, this.keyboardHandlers.attack);
    }
    for (const eventName of ['keydown-DOWN', 'keydown-S']) {
      scene.input.keyboard?.on(eventName, this.keyboardHandlers.drop);
    }
  }

  setVirtualControl(control, active) {
    if (active && !this.virtual[control]) this.virtualPressed[control] = true;
    this.virtual[control] = active;
  }

  clearPendingInput({ resetKeys = true, resetVirtual = true } = {}) {
    this.jumpBufferedUntil = -Infinity;
    this.keyboardPressed.jump = false;
    this.keyboardPressed.attack = false;
    this.keyboardPressed.drop = false;
    this.virtualPressed.jump = false;
    this.virtualPressed.attack = false;
    this.virtualPressed.down = false;

    if (resetVirtual) {
      this.virtual.left = false;
      this.virtual.right = false;
      this.virtual.jump = false;
      this.virtual.attack = false;
      this.virtual.down = false;
    }

    if (resetKeys) {
      for (const [name, key] of Object.entries(this.keys ?? {})) {
        if (key?.isDown) this.suppressedUntilKeyUp.add(name);
        else if (key?.originalEvent?.type === 'keyup') this.suppressedUntilKeyUp.delete(name);
        key?.reset?.();
      }
    }
  }

  isPhysicalControlDown(name) {
    return !this.suppressedUntilKeyUp.has(name) && Boolean(this.keys[name]?.isDown);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    // Phaser updates Key._justDown before dispatching scene listeners. A menu
    // can therefore re-enable the player from the same Space event that
    // activated CONTINUAR / REINTENTAR. Reset every edge and held state at the
    // boundary so that event cannot leak into the first gameplay frame.
    this.clearPendingInput();
    if (!this.enabled) {
      this.body.setAccelerationX(0);
      this.body.setVelocityX(0);
      this.jumpHeldSinceJump = false;
    }
  }

  update(time) {
    if (!this.body.active) return;
    const dtSeconds = this.lastUpdateAt == null ? 0 : Math.max(0, (time - this.lastUpdateAt) / 1000);
    this.lastUpdateAt = time;
    const grounded = this.body.body.blocked.down || this.body.body.touching.down;
    const landedHard = grounded && !this.wasGrounded && this.previousVerticalVelocity > 180;
    let jumpedThisFrame = false;
    if (grounded) this.lastGroundedAt = time;

    const left = this.isPhysicalControlDown('left')
      || this.isPhysicalControlDown('a')
      || this.virtual.left;
    const right = this.isPhysicalControlDown('right')
      || this.isPhysicalControlDown('d')
      || this.virtual.right;
    const queuedJump = this.consumeKeyboardPress('jump');
    const queuedAttack = this.consumeKeyboardPress('attack');
    const queuedDrop = this.consumeKeyboardPress('drop');
    // Evaluate every JustDown call even when the event listener already queued
    // the same press. Otherwise short-circuiting leaves Phaser's edge flag set
    // and the action is observed again on the following frame.
    const justDownJump = [
      consumeGameplayJustDown(this.keys.space, this.suppressedUntilKeyUp.has('space')),
      consumeGameplayJustDown(this.keys.up, this.suppressedUntilKeyUp.has('up')),
      consumeGameplayJustDown(this.keys.w, this.suppressedUntilKeyUp.has('w')),
    ].some(Boolean);
    const justDownAttack = [
      consumeGameplayJustDown(this.keys.attack, this.suppressedUntilKeyUp.has('attack')),
      consumeGameplayJustDown(this.keys.attackAlt, this.suppressedUntilKeyUp.has('attackAlt')),
    ].some(Boolean);
    const justDownDrop = [
      consumeGameplayJustDown(this.keys.down, this.suppressedUntilKeyUp.has('down')),
      consumeGameplayJustDown(this.keys.s, this.suppressedUntilKeyUp.has('s')),
    ].some(Boolean);
    const dropPressed = queuedDrop || justDownDrop || this.consumeVirtualPress('down');
    const virtualJump = this.consumeVirtualPress('jump');
    const virtualAttack = this.consumeVirtualPress('attack');
    const jumpPressed = queuedJump || justDownJump || virtualJump;
    const attackPressed = queuedAttack || justDownAttack || virtualAttack;

    if (jumpPressed) this.jumpBufferedUntil = time + this.config.jumpBufferMs;

    const jumpHeld = this.isPhysicalControlDown('space')
      || this.isPhysicalControlDown('up')
      || this.isPhysicalControlDown('w')
      || this.virtual.jump;
    const controlLocked = time < this.controlLockedUntil;
    let axis = 0;

    if (this.enabled) {
      axis = controlLocked ? 0 : Number(right) - Number(left);
      if (axis !== 0) this.facing = axis;

      const canUseCoyote = time - this.lastGroundedAt <= this.config.coyoteMs;
      if (this.jumpBufferedUntil >= time && canUseCoyote && !controlLocked) {
        jumpedThisFrame = true;
        this.body.setVelocityY(-this.jumpPhysics.launchVelocity);
        this.lastGroundedAt = -Infinity;
        this.jumpBufferedUntil = -Infinity;
        this.jumpHeldSinceJump = true;
        this.avatar.pulseJump?.();
        this.audio?.play('jump');
        spawnDust(this.scene, this.body.x, this.body.body.bottom, { count: 4, spread: 10 });
      }

      if (dropPressed && grounded && !jumpedThisFrame && !controlLocked) this.dropThroughPlatform();
      if (attackPressed) this.attack(time);
    }
    for (const platform of this.droppingThrough) {
      if (hasClearedPlatform(this.body.body, platform, this.movement.landingTolerancePx)) {
        this.droppingThrough.delete(platform);
      }
    }

    // Variable height only applies to a jump the player started: releasing the
    // button switches to a heavier rising gravity, independent of frame rate.
    if (!jumpHeld || this.body.body.velocity.y >= 0) this.jumpHeldSinceJump = false;
    const springRising = this.springGuaranteedTopY != null
      && this.body.body.velocity.y < 0
      && this.body.y > this.springGuaranteedTopY;
    if (!springRising) this.springGuaranteedTopY = null;
    if (this.body.body.velocity.y >= 0 && this.body.body.maxVelocity.y !== this.movement.maxFallSpeed) {
      this.body.body.maxVelocity.y = this.movement.maxFallSpeed;
    }
    // Knockback keeps the full rising arc so the hit reads as a clear hop;
    // the KO bounce keeps plain world gravity.
    const gravity = this.isDead
      ? (this.scene.physics.world.gravity?.y ?? 0)
      : getPlayerGravity({
        velocityY: this.body.body.velocity.y,
        jumpHeld: this.jumpHeldSinceJump || controlLocked || springRising,
        tuning: this.movement,
      });
    this.body.body.setGravityY(gravity - (this.scene.physics.world.gravity?.y ?? 0));

    if (!controlLocked) {
      this.body.setAccelerationX(0);
      this.body.setVelocityX(stepHorizontalVelocity({
        velocityX: this.body.body.velocity.x,
        axis,
        grounded,
        dtSeconds,
        tuning: this.movement,
      }));
    }

    if (landedHard && !jumpedThisFrame && time >= this.hurtUntil) {
      this.avatar.pulseLanding?.(this.previousVerticalVelocity);
      if (this.previousVerticalVelocity > 420) {
        spawnDust(this.scene, this.body.x, this.body.body.bottom, { count: 6, spread: 14 });
      }
    }

    // Animation priority is intentionally independent from movement input.
    // A fatal/hurt/attack pose must not be overwritten by residual velocity.
    const motion = this.isDead
      ? 'dead'
      : (time < this.hurtUntil
        ? 'hurt'
        : (time < this.attackUntil
          ? 'attack'
          : (jumpedThisFrame || !grounded
            ? (this.body.body.velocity.y < 0 ? 'jump' : 'fall')
            : selectBabitoLocomotionState(this.body.body.velocity.x))));
    this.syncBodyVisual(motion);

    const blinking = time < this.invulnerableUntil && Math.floor(time / 75) % 2 === 0;
    this.avatar.setAlpha(blinking ? 0.25 : 1);
    this.wasGrounded = grounded;
    this.previousVerticalVelocity = this.body.body.velocity.y;
  }

  syncBodyVisual(motion = null) {
    if (!this.body?.active || !this.avatar?.active) return;
    const grounded = this.body.body.blocked.down || this.body.body.touching.down;
    const resolvedMotion = motion ?? (this.isDead
      ? 'dead'
      : (!grounded
        ? (this.body.body.velocity.y < 0 ? 'jump' : 'fall')
        : selectBabitoLocomotionState(this.body.body.velocity.x)));
    this.avatar.setPosition(this.body.x, this.body.y + 2);
    this.avatar.setFacing(this.facing);
    this.avatar.setMotion?.(resolvedMotion, this.body.body.velocity);
  }

  isStandingOnOneWayPlatform() {
    const body = this.body?.body;
    if (!body?.touching.down) return false;
    return findOneWayPlatformsUnder(body, this.platforms?.getChildren?.() ?? []).length > 0;
  }

  /**
   * Bounce from a spring mushroom. Holding jump reaches `height`; releasing it
   * cuts the rise like a normal jump, so the bounce stays under control.
   */
  launchFromSpring(height = 240) {
    if (!this.body?.active || this.isDead || !this.enabled) return false;
    const { riseGravity } = this.jumpPhysics;
    const launchSpeed = Math.sqrt(2 * riseGravity * Math.max(40, height));
    // Arcade's max velocity is symmetric: lift the cap for this rise only,
    // update() restores the terminal fall speed once the Babito descends.
    this.body.body.maxVelocity.y = Math.max(this.movement.maxFallSpeed, launchSpeed);
    this.body.setVelocityY(-launchSpeed);
    this.jumpHeldSinceJump = true;
    // Without holding jump the bounce still clears this much before cutting.
    this.springGuaranteedTopY = this.body.y - height * SPRING_MIN_RISE_RATIO;
    this.lastGroundedAt = -Infinity;
    this.jumpBufferedUntil = -Infinity;
    this.avatar.pulseJump?.();
    return true;
  }

  /** ↓ on a one-way platform drops through it; on solid ground it does nothing. */
  dropThroughPlatform() {
    const under = findOneWayPlatformsUnder(this.body.body, this.platforms?.getChildren?.() ?? []);
    if (!under.length) return false;
    for (const platform of under) this.droppingThrough.add(platform);
    this.hasDroppedThrough = true;
    this.body.setVelocityY(DROP_THROUGH_VELOCITY);
    // No coyote jump from a platform the player chose to leave.
    this.lastGroundedAt = -Infinity;
    this.jumpBufferedUntil = -Infinity;
    return true;
  }

  consumeVirtualPress(control) {
    const pressed = this.virtualPressed[control];
    this.virtualPressed[control] = false;
    return pressed;
  }

  consumeKeyboardPress(control) {
    const pressed = this.keyboardPressed[control];
    this.keyboardPressed[control] = false;
    return pressed;
  }

  attack(time) {
    const power = getPower(this.save.selectedPower);
    if (time < this.nextAttackAt) return;
    this.nextAttackAt = time + power.cooldownMs;
    const projectile = launchPower(this.scene, this.projectiles, {
      x: this.body.x + this.facing * 26,
      y: this.body.y - 4,
      facing: this.facing,
      powerId: power.id,
    });
    this.attackUntil = time + Math.min(ATTACK_ANIMATION_MS, power.cooldownMs);
    const detune = power.id === 'lightning' ? 160 : (power.id === 'rock' ? -170 : 0);
    this.audio?.play('attack', { detune });
    this.avatar.setFacing(this.facing);
    this.avatar.pulseAttack?.();
    return projectile;
  }

  /** Pushes the Babito without damage, briefly overriding horizontal input. */
  applyKnockback(velocityX, velocityY = null, lockMs = this.movement.hurtControlLockMs) {
    this.controlLockedUntil = getGameplayTime(this.scene) + Math.max(0, lockMs);
    this.body.setVelocityX(velocityX);
    if (velocityY != null) this.body.setVelocityY(velocityY);
  }

  takeDamage(sourceX = this.body.x, amount = 1) {
    const time = getGameplayTime(this.scene);
    if (!this.enabled || this.isDead || time < this.invulnerableUntil) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = time + this.config.invulnerabilityMs;
    this.hurtUntil = time + HURT_ANIMATION_MS;
    this.controlLockedUntil = time + this.movement.hurtControlLockMs;
    this.jumpHeldSinceJump = false;
    this.avatar.cancelMotionPulses?.();
    const knockback = this.body.x < sourceX ? -220 : 220;
    this.body.setVelocity(knockback, -265);
    this.scene.cameras.main.shake(110, 0.006);
    hitStop(this.scene, 80);
    this.audio?.play('hit');
    this.onHealth?.(this.health, this.config.maxHealth);
    if (this.health <= 0) this.die();
    return true;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.setEnabled(false);
    this.attackUntil = -Infinity;
    this.hurtUntil = -Infinity;
    this.avatar.cancelMotionPulses?.();
    this.body.setAcceleration(0);
    this.body.setVelocity(0, -180);
    this.avatar.setMotion?.('dead', this.body.body.velocity);
    this.scene.time.delayedCall(DEAD_ANIMATION_MS, () => this.onGameOver?.());
  }

  /** Same protection as a respawn, for the first frames after entering a level. */
  grantSpawnGrace(durationMs = RESPAWN_INVULNERABILITY_MS) {
    this.invulnerableUntil = getGameplayTime(this.scene) + durationMs;
  }

  setCheckpoint(x, y) {
    this.checkpoint = { x, y };
  }

  respawn({ restoreHealth = true } = {}) {
    if (restoreHealth) this.health = this.config.maxHealth;
    this.isDead = false;
    this.enabled = true;
    this.invulnerableUntil = getGameplayTime(this.scene) + RESPAWN_INVULNERABILITY_MS;
    this.attackUntil = -Infinity;
    this.hurtUntil = -Infinity;
    this.controlLockedUntil = -Infinity;
    this.droppingThrough.clear();
    this.jumpHeldSinceJump = false;
    this.wasGrounded = false;
    this.previousVerticalVelocity = 0;
    this.clearPendingInput();
    this.avatar.cancelMotionPulses?.();
    this.avatar.setMotion?.('idle', { x: 0, y: 0 });
    this.body.enableBody(true, this.checkpoint.x, this.checkpoint.y, true, true);
    this.body.setAcceleration(0);
    this.body.setVelocity(0);
    this.body.setAngularVelocity(0);
    this.avatar.setPosition(this.checkpoint.x, this.checkpoint.y + 2);
    this.avatar.setAlpha(1);
    this.onHealth?.(this.health, this.config.maxHealth);
  }

  restoreHealth() {
    this.health = this.config.maxHealth;
    this.onHealth?.(this.health, this.config.maxHealth);
  }

  destroy() {
    for (const [name, key] of Object.entries(this.keys ?? {})) {
      key?.off?.('down', this.keyPressHandlers.get(name));
      key?.off?.('up', this.keyReleaseHandlers.get(name));
    }
    this.keyPressHandlers.clear();
    this.keyReleaseHandlers.clear();
    this.suppressedUntilKeyUp.clear();
    for (const eventName of ['keydown-SPACE', 'keydown-UP', 'keydown-W']) {
      this.scene.input.keyboard?.off(eventName, this.keyboardHandlers.jump);
    }
    for (const eventName of ['keydown-J', 'keydown-X']) {
      this.scene.input.keyboard?.off(eventName, this.keyboardHandlers.attack);
    }
    for (const eventName of ['keydown-DOWN', 'keydown-S']) {
      this.scene.input.keyboard?.off(eventName, this.keyboardHandlers.drop);
    }
    this.collider?.destroy();
    this.avatar?.destroy();
    this.body?.destroy();
  }
}
