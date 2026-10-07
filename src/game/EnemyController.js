import Phaser from 'phaser';
import gameData from '../data/game-data.json';

const TEXTURES = {
  come: 'enemy_come',
  vuela: 'enemy_vuela',
  da_vueltas: 'enemy_da_vueltas',
};

export class EnemyController {
  constructor(scene, definition, playerBody, onDefeat) {
    this.scene = scene;
    this.id = definition.id;
    this.type = definition.type;
    this.config = gameData.enemies[this.type];
    this.player = playerBody;
    this.onDefeat = onDefeat;
    this.home = new Phaser.Math.Vector2(definition.x, definition.y);
    this.direction = definition.flip ? -1 : 1;
    this.health = this.config.health;
    this.dead = false;
    this.state = this.config.states[0];
    this.stateStartedAt = scene.time.now;
    this.nextDecisionAt = scene.time.now + Phaser.Math.Between(800, 1400);

    this.sprite = scene.physics.add.sprite(definition.x, definition.y, TEXTURES[this.type]);
    this.sprite.setDepth(10).setData('controller', this);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(this.type === 'da_vueltas' ? 0.45 : 0);
    if (this.type === 'come') this.sprite.body.setSize(62, 52).setOffset(9, 10);
    if (this.type === 'vuela') {
      this.sprite.body.allowGravity = false;
      this.sprite.body.setSize(38, 26).setOffset(5, 8);
    }
    if (this.type === 'da_vueltas') this.sprite.body.setCircle(24, 5, 5);

    this.stateBadge = scene.add.text(definition.x, definition.y - 48, this.state, {
      fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#dff8ff',
      backgroundColor: '#071326bb', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(20).setAlpha(0.78);
  }

  setState(next) {
    if (this.state === next || this.dead) return;
    this.state = next;
    this.stateStartedAt = this.scene.time.now;
    this.stateBadge?.setText(next);
    this.sprite.clearTint();
    if (next === 'WINDUP') this.sprite.setTint(0xffcf4a);
    if (next === 'DIZZY' || next === 'RECOVER') this.sprite.setTint(0x9df0ff);
  }

  get elapsed() { return this.scene.time.now - this.stateStartedAt; }

  update() {
    if (this.dead || !this.sprite.active) return;
    this.stateBadge.setPosition(this.sprite.x, this.sprite.y - this.sprite.displayHeight * 0.65 - 12);
    this.stateBadge.setFlipX(false);
    if (this.type === 'come') this.updateCome();
    else if (this.type === 'vuela') this.updateVuela();
    else this.updateDaVueltas();
  }

  updateCome() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    if (this.state === 'PATROL') {
      this.sprite.setVelocityX(this.direction * this.config.speed * 0.72);
      if (Math.abs(this.sprite.x - this.home.x) > 180) this.direction *= -1;
      if (absolute < 330) this.setState('CHASE');
    } else if (this.state === 'CHASE') {
      this.direction = Math.sign(distance) || this.direction;
      this.sprite.setVelocityX(this.direction * this.config.speed);
      if (absolute < 82) this.setState('WINDUP');
      else if (absolute > 470) this.setState('PATROL');
    } else if (this.state === 'WINDUP') {
      this.sprite.setVelocityX(0);
      this.sprite.setScale(1.04, 0.94);
      if (this.elapsed > 430) this.setState('BITE');
    } else if (this.state === 'BITE') {
      this.sprite.setScale(1.12, 0.9);
      this.sprite.setVelocityX(this.direction * 235);
      if (this.elapsed > 260) this.setState('RECOVER');
    } else if (this.state === 'RECOVER') {
      this.sprite.setVelocityX(-this.direction * 36);
      this.sprite.setScale(1);
      if (this.elapsed > 720) this.setState('PATROL');
    }
    this.sprite.setFlipX(this.direction < 0);
  }

  updateVuela() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    if (this.state === 'AIR_PATROL') {
      this.sprite.setVelocity(
        Math.cos(this.scene.time.now / 650 + this.home.x) * this.config.speed * 0.55,
        Math.sin(this.scene.time.now / 420 + this.home.x) * 34,
      );
      if (absolute < 390 && this.scene.time.now > this.nextDecisionAt) this.setState('TARGET');
    } else if (this.state === 'TARGET') {
      this.sprite.setVelocity(0, -20);
      if (this.elapsed > 360) this.setState('WINDUP');
    } else if (this.state === 'WINDUP') {
      this.sprite.setTint(0xff78da).setVelocity(0, -35);
      if (this.elapsed > 420) this.setState('DIVE');
    } else if (this.state === 'DIVE') {
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y);
      if (this.elapsed < 100) this.sprite.setVelocity(Math.cos(angle) * 255, Math.sin(angle) * 255);
      if (this.elapsed > 900 || this.sprite.y > 465) this.setState('RETURN');
    } else if (this.state === 'RETURN') {
      this.scene.physics.moveTo(this.sprite, this.home.x, this.home.y, this.config.speed * 1.1);
      if (Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.home.x, this.home.y) < 24) {
        this.nextDecisionAt = this.scene.time.now + Phaser.Math.Between(900, 1600);
        this.setState('AIR_PATROL');
      }
    }
    this.sprite.setFlipX(this.sprite.body.velocity.x < 0);
  }

  updateDaVueltas() {
    if (this.state === 'PATROL') {
      this.sprite.setAngularVelocity(0).setVelocityX(this.direction * this.config.speed);
      if (Math.abs(this.sprite.x - this.home.x) > 170) this.direction *= -1;
      if (this.elapsed > 1800) this.setState('WINDUP');
    } else if (this.state === 'WINDUP') {
      this.sprite.setVelocityX(0).setAngularVelocity(280);
      this.sprite.setScale(1.1, 0.9);
      if (this.elapsed > 650) this.setState('SPIN');
    } else if (this.state === 'SPIN') {
      this.sprite.setScale(1).setAngularVelocity(880);
      this.sprite.setVelocityX(this.direction * this.config.spinSpeed);
      if (this.sprite.body.blocked.left || this.sprite.body.blocked.right) this.direction *= -1;
      if (this.elapsed > 2100) this.setState('DIZZY');
    } else if (this.state === 'DIZZY') {
      this.sprite.setAngularVelocity(0).setVelocityX(0).setAngle(Math.sin(this.scene.time.now / 75) * 9);
      if (this.elapsed > 1900) {
        this.sprite.setAngle(0);
        this.setState('PATROL');
      }
    }
  }

  canHurtPlayer() {
    if (this.type === 'come') return this.state === 'BITE';
    if (this.type === 'vuela') return this.state === 'DIVE';
    return this.state === 'SPIN';
  }

  canTakeDamage() {
    return this.type !== 'da_vueltas' || this.state === 'DIZZY';
  }

  takeDamage(amount, hitX) {
    if (this.dead || !this.canTakeDamage()) {
      this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + (this.sprite.x < hitX ? -6 : 6), yoyo: true, duration: 55 });
      return false;
    }
    this.health -= amount;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite?.active && this.sprite.clearTint());
    if (this.health <= 0) this.defeat();
    return true;
  }

  defeat() {
    if (this.dead) return;
    this.dead = true;
    this.sprite.body.enable = false;
    this.stateBadge.destroy();
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 28,
      angle: this.type === 'da_vueltas' ? 120 : 0,
      scale: 0.2,
      alpha: 0,
      duration: 330,
      ease: 'Back.In',
      onComplete: () => this.sprite.destroy(),
    });
    this.onDefeat?.(this, Phaser.Math.Between(0, 2));
  }

  destroy() {
    this.stateBadge?.destroy();
    this.sprite?.destroy();
  }
}
