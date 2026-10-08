import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { configureTextQuality } from '../ui/textQuality.js';
import {
  ENEMY_ANIMATION_CLIPS,
  ENEMY_SHEET_ASSETS,
  getEnemyClipDurationMs,
  getEnemyAnimationKey,
  getEnemyClipForState,
  getEnemyFrameName,
  getEnemyStateAfterHit,
  getEnemyTintForState,
  resolveEnemyQaPresentation,
  resetEnemyVisualForDefeat,
  shouldIgnoreEnemyClipIfPlaying,
} from './EnemyAnimations.js';
import { getEnemyPatrolDirection, getEnemyWallDirection } from './EnemyBehavior.js';
import { getEnemyVisualAnchor, getEnemyVisualTop } from './EnemyPresentation.js';

const TEXTURES = {
  come: 'enemy_come',
  vuela: 'enemy_vuela',
  da_vueltas: 'enemy_da_vueltas',
};

const VISUAL_SIZES = Object.freeze({
  come: Object.freeze({ width: 118, height: 118 }),
  // 256px atlas cells render at an exact 1/4 scale for crisp pixel edges.
  vuela: Object.freeze({ width: 64, height: 64 }),
  da_vueltas: Object.freeze({ width: 82, height: 82 }),
});

function setWorldBodySize(sprite, width, height) {
  const scaleX = Math.max(0.001, Math.abs(sprite.scaleX));
  const scaleY = Math.max(0.001, Math.abs(sprite.scaleY));
  sprite.body.setSize(width / scaleX, height / scaleY, true);
}

function setWorldBodyCircle(sprite, radius) {
  const scale = Math.max(0.001, Math.abs(sprite.scaleX));
  const rawRadius = radius / scale;
  const diameter = rawRadius * 2;
  sprite.body.setCircle(
    rawRadius,
    Math.max(0, (sprite.width - diameter) / 2),
    Math.max(0, (sprite.height - diameter) / 2),
  );
}

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
    this.stateStartedAt = this.now;
    this.nextDecisionAt = this.now + Phaser.Math.Between(800, 1400);

    this.sprite = scene.physics.add.sprite(definition.x, definition.y, TEXTURES[this.type]);
    this.sprite.setDepth(9).setData('controller', this).setVisible(false);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(this.type === 'da_vueltas' ? 0.45 : 0);
    if (this.type === 'come') {
      // COME must tower over a Babito, as in the canonical character sheet.
      this.sprite.setDisplaySize(118, 118);
      setWorldBodySize(this.sprite, 82, 68);
    }
    if (this.type === 'vuela') {
      // VUELA is deliberately the smallest enemy and reads as a quick nuisance.
      this.sprite.setDisplaySize(74, 74);
      this.sprite.body.allowGravity = false;
      setWorldBodySize(this.sprite, 54, 32);
    }
    if (this.type === 'da_vueltas') {
      this.sprite.setDisplaySize(78, 78);
      setWorldBodyCircle(this.sprite, 29);
    }
    const visualSize = VISUAL_SIZES[this.type];
    const sheet = ENEMY_SHEET_ASSETS[this.type];
    this.visual = scene.add.sprite(
      definition.x,
      definition.y,
      sheet.key,
      getEnemyFrameName(this.type, 0, 0),
    ).setDepth(10).setDisplaySize(visualSize.width, visualSize.height);
    const visualAnchor = getEnemyVisualAnchor(this.type, this.sprite);
    this.visual.setOrigin(0.5, visualAnchor.originY);
    this.visualBaseScale = { x: this.visual.scaleX, y: this.visual.scaleY };
    this.activeClip = null;
    this.hurtUntil = 0;
    this.qaPresentation = null;
    this.playVisualClip(getEnemyClipForState(this.type, this.state));
    this.syncVisual();

    const showDebugState = import.meta.env.DEV
      && typeof location !== 'undefined'
      && new URLSearchParams(location.search).get('debugAI') === '1';
    this.stateBadge = null;
    if (showDebugState) {
      this.stateBadge = scene.add.text(definition.x, definition.y - 48, this.state, {
        fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#dff8ff',
        backgroundColor: '#071326bb', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(20).setAlpha(0.78);
      configureTextQuality(this.stateBadge);
    }
  }

  setState(next) {
    if (this.state === next || this.dead || !this.config.states.includes(next)) return false;
    const previousClip = getEnemyClipForState(this.type, this.state);
    this.state = next;
    this.stateStartedAt = this.now;
    this.stateBadge?.setText(next);
    this.setVisualScale();
    this.applyStateTint();
    this.updateVisualAnimation(previousClip !== getEnemyClipForState(this.type, next));
    if (this.type === 'vuela' && next === 'DIVE') this.startVuelaDive();
    return true;
  }

  get now() {
    const value = this.scene?.getGameplayTime?.();
    return Number.isFinite(value) ? value : (this.scene?.time?.now ?? 0);
  }

  get elapsed() { return this.now - this.stateStartedAt; }

  get isHurt() { return !this.dead && this.now < this.hurtUntil; }

  setVisualScale(x = 1, y = x) {
    this.visual?.setScale(this.visualBaseScale.x * x, this.visualBaseScale.y * y);
    return this;
  }

  applyStateTint() {
    if (!this.visual?.active) return;
    this.visual.clearTint();
    const tint = getEnemyTintForState(this.type, this.state);
    if (tint != null) this.visual.setTint(tint);
  }

  playVisualClip(clip, restart = false) {
    if (!this.visual?.active) return;
    if (!restart && this.activeClip === clip) return;
    this.activeClip = clip;
    this.visual.play(
      getEnemyAnimationKey(this.type, clip),
      shouldIgnoreEnemyClipIfPlaying(restart),
    );
  }

  updateVisualAnimation(restart = false) {
    const clip = this.isHurt
      ? 'hurt'
      : getEnemyClipForState(this.type, this.state);
    this.playVisualClip(clip, restart);
  }

  setQaPresentation(requestedState, requestedFrame = null) {
    const presentation = resolveEnemyQaPresentation(this.type, requestedState);
    if (!presentation) return false;
    const settings = ENEMY_ANIMATION_CLIPS[this.type][presentation.clip];
    const columns = settings.columns
      ?? Array.from(
        { length: ENEMY_SHEET_ASSETS[this.type].xBounds.length - 1 },
        (_, column) => column,
      );
    const frameIndex = Number.isInteger(requestedFrame)
      ? Phaser.Math.Clamp(requestedFrame, 0, columns.length - 1)
      : null;

    this.qaPresentation = {
      ...presentation,
      frame: frameIndex == null ? null : columns[frameIndex],
      row: settings.row,
    };
    if (presentation.state) this.state = presentation.state;
    this.stateBadge?.setText(`QA · ${presentation.state ?? presentation.clip.toUpperCase()}`);
    this.sprite.body.allowGravity = false;
    this.sprite.setVelocity(0, 0).setAngularVelocity(0).setAngle(0);
    this.setVisualScale();
    this.applyStateTint();
    this.playVisualClip(presentation.clip, true);
    this.applyQaPresentation();
    return true;
  }

  applyQaPresentation() {
    if (!this.qaPresentation) return;
    this.sprite.setVelocity(0, 0).setAngularVelocity(0).setAngle(0);
    if (this.qaPresentation.frame == null) {
      this.playVisualClip(this.qaPresentation.clip);
    } else {
      this.visual.anims.stop();
      this.visual.setFrame(getEnemyFrameName(
        this.type,
        this.qaPresentation.row,
        this.qaPresentation.frame,
      ));
    }
    this.syncVisual();
  }

  syncVisual() {
    if (!this.visual?.active || !this.sprite?.active) return;
    const anchor = getEnemyVisualAnchor(this.type, this.sprite);
    this.visual
      .setPosition(this.sprite.x, anchor.y)
      .setRotation(this.sprite.rotation)
      .setFlipX(this.direction < 0);
    this.stateBadge?.setPosition(
      this.sprite.x,
      getEnemyVisualTop(this.visual.y, this.visual.displayHeight, this.visual.originY) - 12,
    );
    this.stateBadge?.setFlipX(false);
  }

  update() {
    if (this.dead || !this.sprite.active) return;
    if (this.qaPresentation) {
      this.applyQaPresentation();
      return;
    }
    if (this.isHurt) {
      this.updateVisualAnimation();
      this.syncVisual();
      return;
    }
    if (this.type === 'come') this.updateCome();
    else if (this.type === 'vuela') this.updateVuela();
    else this.updateDaVueltas();
    this.updateVisualAnimation();
    this.syncVisual();
  }

  updateCome() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    if (this.state === 'PATROL') {
      this.direction = getEnemyPatrolDirection(this.sprite.x, this.home.x, 180, this.direction);
      this.sprite.setVelocityX(this.direction * this.config.speed * 0.72);
      if (absolute < 330) this.setState('CHASE');
    } else if (this.state === 'CHASE') {
      this.direction = Math.sign(distance) || this.direction;
      this.sprite.setVelocityX(this.direction * this.config.speed);
      if (absolute < 82) this.setState('WINDUP');
      else if (absolute > 470) this.setState('PATROL');
    } else if (this.state === 'WINDUP') {
      this.sprite.setVelocityX(0);
      this.setVisualScale(1.04, 0.94);
      if (this.elapsed > 430) this.setState('BITE');
    } else if (this.state === 'BITE') {
      this.setVisualScale(1.12, 0.9);
      this.sprite.setVelocityX(this.direction * 235);
      if (this.elapsed > 260) this.setState('RECOVER');
    } else if (this.state === 'RECOVER') {
      this.sprite.setVelocityX(-this.direction * 36);
      this.setVisualScale();
      if (this.elapsed > 720) this.setState('PATROL');
    }
  }

  updateVuela() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    if (this.state === 'AIR_PATROL') {
      this.sprite.setVelocity(
        Math.cos(this.now / 650 + this.home.x) * this.config.speed * 0.55,
        Math.sin(this.now / 420 + this.home.x) * 34,
      );
      if (absolute < 390 && this.now > this.nextDecisionAt) this.setState('TARGET');
    } else if (this.state === 'TARGET') {
      this.direction = Math.sign(distance) || this.direction;
      this.sprite.setVelocity(0, -20);
      if (this.elapsed > 360) this.setState('WINDUP');
    } else if (this.state === 'WINDUP') {
      this.direction = Math.sign(distance) || this.direction;
      this.sprite.setVelocity(0, -35);
      if (this.elapsed > 420) this.setState('DIVE');
    } else if (this.state === 'DIVE') {
      if (this.elapsed > 900 || this.sprite.y > 465) this.setState('RETURN');
    } else if (this.state === 'RETURN') {
      this.scene.physics.moveTo(this.sprite, this.home.x, this.home.y, this.config.speed * 1.1);
      if (Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.home.x, this.home.y) < 24) {
        this.sprite.setPosition(this.home.x, this.home.y).setVelocity(0, 0);
        this.nextDecisionAt = this.now + Phaser.Math.Between(900, 1600);
        this.setState('AIR_PATROL');
      }
    }
    if (Math.abs(this.sprite.body.velocity.x) > 1) {
      this.direction = this.sprite.body.velocity.x < 0 ? -1 : 1;
    }
  }

  startVuelaDive() {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.player.x,
      this.player.y,
    );
    const speed = Math.max(255, this.config.speed * 2.45);
    this.sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (Math.abs(this.sprite.body.velocity.x) > 1) {
      this.direction = this.sprite.body.velocity.x < 0 ? -1 : 1;
    }
  }

  updateDaVueltas() {
    if (this.state === 'PATROL') {
      this.direction = getEnemyPatrolDirection(this.sprite.x, this.home.x, 170, this.direction);
      this.sprite.setAngularVelocity(0).setVelocityX(this.direction * this.config.speed);
      if (this.elapsed > 1800) this.setState('WINDUP');
    } else if (this.state === 'WINDUP') {
      this.sprite.setVelocityX(0).setAngularVelocity(280);
      this.setVisualScale(1.1, 0.9);
      if (this.elapsed > 650) this.setState('SPIN');
    } else if (this.state === 'SPIN') {
      this.setVisualScale();
      this.sprite.setAngularVelocity(880);
      this.direction = getEnemyWallDirection(this.sprite.body.blocked, this.direction);
      this.sprite.setVelocityX(this.direction * this.config.spinSpeed);
      if (this.elapsed > 2100) this.setState('DIZZY');
    } else if (this.state === 'DIZZY') {
      this.sprite.setAngularVelocity(0).setVelocityX(0).setAngle(Math.sin(this.now / 75) * 9);
      if (this.elapsed > 1900) {
        this.sprite.setAngle(0);
        this.setState('PATROL');
      }
    }
  }

  canHurtPlayer() {
    if (this.dead || this.qaPresentation || this.isHurt) return false;
    if (this.type === 'come') return this.state === 'BITE';
    if (this.type === 'vuela') return this.state === 'DIVE';
    return this.state === 'SPIN';
  }

  canTakeDamage() {
    if (this.dead || this.qaPresentation || this.isHurt) return false;
    return this.type !== 'da_vueltas' || this.state === 'DIZZY';
  }

  takeDamage(amount, hitX) {
    if (this.dead || !this.canTakeDamage()) {
      if (this.visual?.active) {
        this.visual.setTint(0x85dfff);
        this.scene.time.delayedCall(90, () => this.visual?.active && this.applyStateTint());
      }
      return false;
    }
    this.health -= amount;
    if (this.health <= 0) {
      this.defeat();
      return true;
    }

    const hurtDuration = getEnemyClipDurationMs(this.type, 'hurt');
    this.hurtUntil = this.now + hurtDuration;
    const recoveryState = getEnemyStateAfterHit(this.type, this.state);
    if (recoveryState !== this.state) this.setState(recoveryState);
    else this.updateVisualAnimation(true);
    // State timers start after the complete one-shot hurt reaction, so an
    // enemy cannot advance into an attack while it visibly recoils.
    this.stateStartedAt = this.hurtUntil;
    const knockbackDirection = Math.sign(this.sprite.x - hitX) || -this.direction;
    if (this.type === 'vuela') this.sprite.setVelocity(knockbackDirection * 54, -68);
    else if (this.type === 'come') this.sprite.setVelocity(knockbackDirection * 72, -90);
    else this.sprite.setVelocity(0, 0);
    this.visual?.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.visual?.active && !this.dead && this.applyStateTint());
    return true;
  }

  defeat() {
    if (this.dead) return;
    this.dead = true;
    this.sprite.body.enable = false;
    this.stateBadge?.destroy();
    // A fatal hit can land during COME's squash/stretch poses. Reset the
    // presentation before the defeat row so its silhouette is never warped.
    resetEnemyVisualForDefeat(this.visual, this.visualBaseScale);
    this.playVisualClip('defeat', true);
    const defeatDuration = getEnemyClipDurationMs(this.type, 'defeat');
    this.scene.tweens.add({
      targets: this.visual,
      y: this.visual.y + 8,
      alpha: 0,
      delay: Math.max(0, Math.round(defeatDuration - 180)),
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.visual?.destroy();
        this.sprite?.destroy();
      },
    });
    this.onDefeat?.(this, Phaser.Math.Between(0, 2));
  }

  destroy() {
    this.stateBadge?.destroy();
    this.visual?.destroy();
    this.sprite?.destroy();
  }
}
