import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { BabitoAvatar } from './BabitoAvatar.js';
import { getPower, launchPower } from './PowerSystem.js';

export class PlayerController {
  constructor(scene, { x, y, save, platforms, projectiles, onHealth, onGameOver }) {
    this.scene = scene;
    this.save = save;
    this.platforms = platforms;
    this.projectiles = projectiles;
    this.onHealth = onHealth;
    this.onGameOver = onGameOver;
    this.config = gameData.player;
    this.health = this.config.maxHealth;
    this.facing = 1;
    this.enabled = true;
    this.invulnerableUntil = 0;
    this.lastGroundedAt = -Infinity;
    this.jumpBufferedUntil = -Infinity;
    this.nextAttackAt = 0;
    this.checkpoint = { x, y };
    this.virtual = { left: false, right: false, jump: false, attack: false };
    this.virtualPressed = { jump: false, attack: false };
    this.keyboardPressed = { jump: false, attack: false };

    this.body = scene.physics.add.sprite(x, y, 'player_hitbox').setVisible(false);
    this.body.setDepth(10).setCollideWorldBounds(true);
    this.body.body.setSize(this.config.hitbox.width, this.config.hitbox.height, true);
    this.body.body.setMaxVelocity(360, 760);
    this.body.setDragX(1350);
    this.collider = scene.physics.add.collider(this.body, platforms);

    this.avatar = new BabitoAvatar(scene, x, y, save.appearance, save.size);
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.J,
      attackAlt: Phaser.Input.Keyboard.KeyCodes.X,
    });
    this.keyboardHandlers = {
      jump: (event) => {
        if (this.enabled && !event?.repeat) this.keyboardPressed.jump = true;
      },
      attack: (event) => {
        if (this.enabled && !event?.repeat) this.keyboardPressed.attack = true;
      },
    };
    for (const eventName of ['keydown-SPACE', 'keydown-UP', 'keydown-W']) {
      scene.input.keyboard?.on(eventName, this.keyboardHandlers.jump);
    }
    for (const eventName of ['keydown-J', 'keydown-X']) {
      scene.input.keyboard?.on(eventName, this.keyboardHandlers.attack);
    }
  }

  setVirtualControl(control, active) {
    if (active && !this.virtual[control]) this.virtualPressed[control] = true;
    this.virtual[control] = active;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.body.setVelocityX(0);
  }

  update(time) {
    if (!this.body.active) return;
    const grounded = this.body.body.blocked.down || this.body.body.touching.down;
    if (grounded) this.lastGroundedAt = time;

    const left = this.keys.left.isDown || this.keys.a.isDown || this.virtual.left;
    const right = this.keys.right.isDown || this.keys.d.isDown || this.virtual.right;
    const queuedJump = this.consumeKeyboardPress('jump');
    const queuedAttack = this.consumeKeyboardPress('attack');
    const jumpPressed = queuedJump
      || Phaser.Input.Keyboard.JustDown(this.keys.space)
      || Phaser.Input.Keyboard.JustDown(this.keys.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.w)
      || this.consumeVirtualPress('jump');
    const attackPressed = queuedAttack
      || Phaser.Input.Keyboard.JustDown(this.keys.attack)
      || Phaser.Input.Keyboard.JustDown(this.keys.attackAlt)
      || this.consumeVirtualPress('attack');

    if (jumpPressed) this.jumpBufferedUntil = time + this.config.jumpBufferMs;

    if (this.enabled) {
      const axis = Number(right) - Number(left);
      if (axis !== 0) {
        this.body.setAccelerationX(axis * 1450);
        this.facing = axis;
      } else {
        this.body.setAccelerationX(0);
      }

      const canUseCoyote = time - this.lastGroundedAt <= this.config.coyoteMs;
      if (this.jumpBufferedUntil >= time && canUseCoyote) {
        this.body.setVelocityY(-this.config.jumpVelocity);
        this.lastGroundedAt = -Infinity;
        this.jumpBufferedUntil = -Infinity;
        this.scene.tweens.add({ targets: this.avatar.container, scaleY: 1.08, scaleX: 0.92, duration: 80, yoyo: true });
      }

      const jumpHeld = this.keys.space.isDown || this.keys.up.isDown || this.keys.w.isDown || this.virtual.jump;
      if (!jumpHeld && this.body.body.velocity.y < -190) this.body.setVelocityY(this.body.body.velocity.y * 0.68);

      if (attackPressed) this.attack(time);
    } else {
      this.body.setAccelerationX(0);
    }

    const motion = !grounded
      ? (this.body.body.velocity.y < 0 ? 'jump' : 'fall')
      : (Math.abs(this.body.body.velocity.x) > 20 ? 'run' : 'idle');
    this.avatar.setPosition(this.body.x, this.body.y + 2);
    this.avatar.setFacing(this.facing);
    this.avatar.setMotion?.(motion, this.body.body.velocity);

    const blinking = time < this.invulnerableUntil && Math.floor(time / 75) % 2 === 0;
    this.avatar.setAlpha(blinking ? 0.25 : 1);
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
    this.avatar.pulseAttack?.();
    return projectile;
  }

  takeDamage(sourceX = this.body.x, amount = 1) {
    if (!this.enabled || this.scene.time.now < this.invulnerableUntil) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = this.scene.time.now + this.config.invulnerabilityMs;
    const knockback = this.body.x < sourceX ? -220 : 220;
    this.body.setVelocity(knockback, -265);
    this.scene.cameras.main.shake(110, 0.006);
    this.onHealth?.(this.health, this.config.maxHealth);
    if (this.health <= 0) this.die();
    return true;
  }

  die() {
    this.enabled = false;
    this.body.setVelocity(0, -260);
    this.avatar.setMotion?.('hurt', this.body.body.velocity);
    this.scene.time.delayedCall(650, () => this.onGameOver?.());
  }

  setCheckpoint(x, y) {
    this.checkpoint = { x, y };
  }

  respawn({ restoreHealth = true } = {}) {
    if (restoreHealth) this.health = this.config.maxHealth;
    this.enabled = true;
    this.invulnerableUntil = this.scene.time.now + 1500;
    this.body.enableBody(true, this.checkpoint.x, this.checkpoint.y, true, true);
    this.body.setVelocity(0);
    this.onHealth?.(this.health, this.config.maxHealth);
  }

  restoreHealth() {
    this.health = this.config.maxHealth;
    this.onHealth?.(this.health, this.config.maxHealth);
  }

  destroy() {
    for (const eventName of ['keydown-SPACE', 'keydown-UP', 'keydown-W']) {
      this.scene.input.keyboard?.off(eventName, this.keyboardHandlers.jump);
    }
    for (const eventName of ['keydown-J', 'keydown-X']) {
      this.scene.input.keyboard?.off(eventName, this.keyboardHandlers.attack);
    }
    this.collider?.destroy();
    this.avatar?.destroy();
    this.body?.destroy();
  }
}
