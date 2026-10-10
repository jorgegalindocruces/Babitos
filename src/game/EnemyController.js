import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { configureTextQuality } from '../ui/textQuality.js';
import {
  ENEMY_ANIMATION_CLIPS,
  ENEMY_SHEET_ASSETS,
  getEnemyCellSize,
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
import {
  getEnemyVisualAnchor,
  getEnemyVisualTop,
  getSapoBodyCenterY,
  getSapoMouthY,
  SAPO_BODY_SIZE,
  SAPO_VISUAL_DEPTH,
  shouldFlipEnemyVisual,
} from './EnemyPresentation.js';

const TEXTURES = {
  come: 'enemy_come',
  vuela: 'enemy_vuela',
  da_vueltas: 'enemy_da_vueltas',
  // The Arcade sprites are invisible collision bodies. Reusing the existing
  // primitives keeps collision independent from the authored 256px artwork.
  garbanzo_loco: 'enemy_come',
  arbol_pocho: 'enemy_come',
  sapo_pota: 'enemy_vuela',
};

export const JUNGLE_ENEMY_TYPES = Object.freeze([
  'garbanzo_loco',
  'arbol_pocho',
  'sapo_pota',
]);

const JUNGLE_ENEMY_TYPE_SET = new Set(JUNGLE_ENEMY_TYPES);

const DA_VUELTAS_ENGAGE_RANGE = 460;
// Below the playable floor: a walker that somehow fell is sent home.
const ENEMY_FALL_RESET_Y = 600;

const VISUAL_SIZES = Object.freeze({
  come: Object.freeze({ width: 118, height: 118 }),
  // 256px atlas cells render at an exact 1/4 scale for crisp pixel edges.
  vuela: Object.freeze({ width: 64, height: 64 }),
  da_vueltas: Object.freeze({ width: 82, height: 82 }),
});

// La Jungla cells are wider than tall, so they render by a uniform scale of
// the 256px cell height rather than a square display size. Garbanzo uses an
// exact 1/2 for crisp nearest-neighbour pixels and reads slightly taller than
// the 80px Babito avatar.
export const JUNGLE_VISUAL_SCALES = Object.freeze({
  garbanzo_loco: 0.5,
  arbol_pocho: 172 / 256,
  sapo_pota: 148 / 256,
});

export function getEnemyVisualSize(type) {
  const scale = JUNGLE_VISUAL_SCALES[type];
  if (scale == null) return VISUAL_SIZES[type];
  const cell = getEnemyCellSize(type);
  return { width: cell.width * scale, height: cell.height * scale };
}

// Once the Babito is in reach the Árbol commits to a punch: before the branch
// strikes it holds its raised-arms pose tinted amber as the anticipation.
const ARBOL_CHARGE_TINT = 0xffcf4a;
// Vertical distance between body centres at which Garbanzo's horizontal spear
// can still meet the Babito (standing, landing or on a low bridge step).
const GARBANZO_LEVEL_TOLERANCE = 72;

function getPositiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function getDirection(value, fallback = 1) {
  return Math.sign(Number(value)) || (fallback < 0 ? -1 : 1);
}

function setWorldBodySize(sprite, width, height) {
  const scaleX = Math.max(0.001, Math.abs(sprite.scaleX));
  const scaleY = Math.max(0.001, Math.abs(sprite.scaleY));
  sprite.body.setSize(width / scaleX, height / scaleY, true);
  // setDisplaySize changes the Game Object scale before Arcade Physics has
  // taken its first step. Synchronise now so spawn and QA placement read the
  // requested world-space body instead of the source texture dimensions.
  sprite.body.updateFromGameObject();
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
  sprite.body.updateFromGameObject();
}

export class EnemyController {
  constructor(scene, definition, playerBody, onDefeat, services = {}) {
    this.scene = scene;
    this.id = definition.id;
    this.type = definition.type;
    this.config = gameData.enemies[this.type];
    this.player = playerBody;
    this.onDefeat = onDefeat;
    this.services = services ?? {};
    this.definition = definition;
    this.waterlineY = Number.isFinite(Number(definition.waterlineY))
      ? Number(definition.waterlineY)
      : null;
    this.volleyCount = Phaser.Math.Clamp(
      Math.round(getPositiveNumber(definition.volleyCount, 1)),
      1,
      3,
    );
    // Sapo Pota lives on the river surface: its body centre derives from the
    // waterline so data, presentation and hit area can never disagree.
    const homeY = this.type === 'sapo_pota' && this.waterlineY != null
      ? getSapoBodyCenterY(this.waterlineY)
      : definition.y;
    this.home = new Phaser.Math.Vector2(definition.x, homeY);
    // Horizontal extent of the ground segment a walker lives on. Pits beyond
    // it are never crossed: COME waits at the edge instead of jumping in.
    this.walkBounds = definition.walkBounds ?? null;
    this.direction = definition.flip ? -1 : 1;
    this.health = this.config.health;
    this.dead = false;
    this.state = this.config.states[0];
    this.stateStartedAt = this.now;
    this.nextDecisionAt = this.now + Phaser.Math.Between(800, 1400);
    this.attackEventSent = false;
    this.hurtReturnState = null;
    this.hurtResumeStartedAt = null;
    this.punchChargeStartedAt = null;

    this.sprite = scene.physics.add.sprite(this.home.x, this.home.y, TEXTURES[this.type]);
    this.sprite.setDepth(9).setData('controller', this).setVisible(false);
    this.configureBody();
    const visualSize = getEnemyVisualSize(this.type);
    const sheet = ENEMY_SHEET_ASSETS[this.type];
    this.visual = scene.add.sprite(
      this.home.x,
      this.home.y,
      sheet.key,
      getEnemyFrameName(this.type, 0, 0),
    ).setDepth(this.type === 'sapo_pota' ? SAPO_VISUAL_DEPTH : 10)
      .setDisplaySize(visualSize.width, visualSize.height);
    const visualAnchor = this.getVisualAnchor();
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
        fontFamily: 'Silkscreen, monospace', fontSize: '12px', color: '#dff8ff',
        backgroundColor: '#071326bb', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(20).setAlpha(0.78);
      configureTextQuality(this.stateBadge);
    }
  }

  /**
   * Applies the per-type Arcade body. An Arcade Group resets gravity, bounce,
   * world bounds and immovability of every member it adds, so the scene calls
   * this again after grouping; otherwise rooted and aquatic enemies would
   * slowly sink through the floor under world gravity.
   */
  configureBody() {
    this.sprite.body.allowGravity = true;
    this.sprite.setImmovable(false);
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
    if (this.type === 'garbanzo_loco') {
      this.sprite.setDisplaySize(106, 106);
      setWorldBodySize(this.sprite, 58, 76);
    }
    if (this.type === 'arbol_pocho') {
      this.sprite.setDisplaySize(112, 150);
      this.sprite.body.allowGravity = false;
      this.sprite.setImmovable(true);
      setWorldBodySize(this.sprite, 74, 150);
    }
    if (this.type === 'sapo_pota') {
      this.sprite.setDisplaySize(SAPO_BODY_SIZE.width, SAPO_BODY_SIZE.height);
      this.sprite.body.allowGravity = false;
      this.sprite.setImmovable(true);
      setWorldBodySize(this.sprite, SAPO_BODY_SIZE.width, SAPO_BODY_SIZE.height);
    }
    return this;
  }

  getVisualAnchor() {
    return getEnemyVisualAnchor(this.type, this.sprite, { waterlineY: this.waterlineY });
  }

  /** Árbol has committed to a punch and is showing its amber anticipation. */
  get isChargingPunch() {
    return this.type === 'arbol_pocho' && this.punchChargeStartedAt != null;
  }

  /** Player shots pass over a Sapo that is fully underwater. */
  blocksPlayerProjectiles() {
    if (this.dead) return false;
    return !(this.type === 'sapo_pota' && this.state === 'UNDERWATER');
  }

  /**
   * Garbanzo never leaves its stretch of ground. It only engages a Babito it
   * could actually reach from there, instead of pressing against a pillar or
   * the river bank while the Babito stands on the far side.
   */
  canReachPlayer(margin = 0) {
    if (!this.walkBounds) return true;
    const x = Number(this.player?.x);
    return x >= this.walkBounds.left - margin && x <= this.walkBounds.right + margin;
  }

  setState(next) {
    if (this.state === next || this.dead || !this.config.states.includes(next)) return false;
    const previousState = this.state;
    const previousClip = getEnemyClipForState(this.type, this.state);
    this.state = next;
    this.stateStartedAt = this.now;
    this.attackEventSent = false;
    this.stateBadge?.setText(next);
    this.setVisualScale();
    this.applyStateTint();
    this.updateVisualAnimation(previousClip !== getEnemyClipForState(this.type, next));
    if (this.type === 'vuela' && next === 'DIVE') this.startVuelaDive();
    this.services.onStateChange?.(this, next, previousState);
    return true;
  }

  get now() {
    const value = this.scene?.getGameplayTime?.();
    return Number.isFinite(value) ? value : (this.scene?.time?.now ?? 0);
  }

  get elapsed() { return this.now - this.stateStartedAt; }

  get isHurt() { return !this.dead && this.now < this.hurtUntil; }

  get isJungleEnemy() { return JUNGLE_ENEMY_TYPE_SET.has(this.type); }

  tuning(name, fallback) {
    return getPositiveNumber(
      this.definition?.[name],
      getPositiveNumber(this.config?.[name], fallback),
    );
  }

  setVisualScale(x = 1, y = x) {
    this.visual?.setScale(this.visualBaseScale.x * x, this.visualBaseScale.y * y);
    return this;
  }

  applyStateTint() {
    if (!this.visual?.active) return;
    this.visual.clearTint();
    const tint = this.isChargingPunch
      ? ARBOL_CHARGE_TINT
      : getEnemyTintForState(this.type, this.state);
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
    const anchor = this.getVisualAnchor();
    this.visual
      .setPosition(this.sprite.x, anchor.y)
      .setRotation(this.sprite.rotation)
      // EL ÁRBOL POCHO has authored left/right punches. Mirroring it would
      // swap the telegraphed branch and the actual hit area.
      .setFlipX(shouldFlipEnemyVisual(this.type, this.direction));
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
    if (this.sprite.y > ENEMY_FALL_RESET_Y) {
      this.resetToHome();
      return;
    }
    this.keepInsideWalkBounds();
    if (this.isHurt) {
      this.updateVisualAnimation();
      this.syncVisual();
      return;
    }
    if (this.isJungleEnemy && this.state === 'HURT') {
      const resumeStartedAt = this.hurtResumeStartedAt;
      this.setState(this.hurtReturnState ?? 'RECOVER');
      // A hit that returns to the state it interrupted resumes its clock:
      // repeated hits never extend RECOVER into a permanent vulnerable stun.
      if (resumeStartedAt != null) this.stateStartedAt = resumeStartedAt;
      this.hurtReturnState = null;
      this.hurtResumeStartedAt = null;
    }
    if (this.type === 'come') this.updateCome();
    else if (this.type === 'vuela') this.updateVuela();
    else if (this.type === 'da_vueltas') this.updateDaVueltas();
    else if (this.type === 'garbanzo_loco') this.updateGarbanzoLoco();
    else if (this.type === 'arbol_pocho') this.updateArbolPocho();
    else if (this.type === 'sapo_pota') this.updateSapoPota();
    this.keepInsideWalkBounds();
    this.updateVisualAnimation();
    this.syncVisual();
  }

  /** Stops (or turns a patrol/spin around) at the edge of the walk bounds. */
  keepInsideWalkBounds() {
    if (!this.walkBounds || !this.sprite.body) return;
    const halfWidth = this.sprite.body.width / 2;
    const minX = this.walkBounds.left + halfWidth;
    const maxX = this.walkBounds.right - halfWidth;
    const velocityX = this.sprite.body.velocity.x;
    const outward = (this.sprite.x <= minX && velocityX < 0) || (this.sprite.x >= maxX && velocityX > 0);
    if (!outward) return;
    this.sprite.setX(Phaser.Math.Clamp(this.sprite.x, minX, maxX));
    const turnsAround = this.state === 'PATROL' || this.state === 'SPIN';
    if (turnsAround) {
      this.direction = this.sprite.x <= minX ? 1 : -1;
      this.sprite.setVelocityX(Math.abs(velocityX) * this.direction);
    } else {
      this.sprite.setVelocityX(0);
    }
  }

  updateCome() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    if (this.state === 'PATROL') {
      this.direction = getEnemyWallDirection(
        this.sprite.body.blocked,
        getEnemyPatrolDirection(this.sprite.x, this.home.x, 180, this.direction),
      );
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
    const distance = this.player.x - this.sprite.x;
    if (this.state === 'PATROL') {
      this.direction = getEnemyWallDirection(
        this.sprite.body.blocked,
        getEnemyPatrolDirection(this.sprite.x, this.home.x, 170, this.direction),
      );
      this.sprite.setAngularVelocity(0).setVelocityX(this.direction * this.config.speed);
      // Only wind up when the Babito is close enough to read the threat; a
      // spin aimed at empty space off-screen teaches nothing.
      if (this.elapsed > 1800 && Math.abs(distance) < DA_VUELTAS_ENGAGE_RANGE) this.setState('WINDUP');
    } else if (this.state === 'WINDUP') {
      // Face the Babito throughout the telegraph so the roll is predictable.
      this.direction = Math.sign(distance) || this.direction;
      this.sprite.setVelocityX(0).setAngularVelocity(280 * this.direction);
      this.setVisualScale(1.1, 0.9);
      if (this.elapsed > 650) this.setState('SPIN');
    } else if (this.state === 'SPIN') {
      this.setVisualScale();
      this.sprite.setAngularVelocity(880 * this.direction);
      this.direction = getEnemyWallDirection(this.sprite.body.blocked, this.direction);
      this.sprite.setVelocityX(this.direction * this.config.spinSpeed);
      if (this.elapsed > 1700) this.setState('DIZZY');
    } else if (this.state === 'DIZZY') {
      this.sprite.setAngularVelocity(0).setVelocityX(0).setAngle(Math.sin(this.now / 75) * 9);
      if (this.elapsed > 1900) {
        this.sprite.setAngle(0);
        this.setState('PATROL');
      }
    }
  }

  emitMeleeAttack(kind, settings) {
    if (this.attackEventSent || this.dead || this.qaPresentation) return false;
    this.attackEventSent = true;
    this.services.onMeleeAttack?.(this, Object.freeze({
      kind,
      direction: getDirection(settings.direction, this.direction),
      reach: getPositiveNumber(settings.reach, 96),
      width: getPositiveNumber(settings.width, 96),
      height: getPositiveNumber(settings.height, 52),
      offsetY: Number(settings.offsetY) || 0,
      durationMs: getPositiveNumber(settings.durationMs, 150),
      damage: getPositiveNumber(settings.damage, this.config.damage ?? 1),
    }));
    return true;
  }

  emitToxicVolley() {
    if (this.attackEventSent || this.dead || this.qaPresentation) return false;
    this.attackEventSent = true;
    this.services.onToxicVolley?.(this, Object.freeze({
      direction: getDirection(this.direction),
      count: this.volleyCount,
      projectileSpeed: this.tuning('projectileSpeed', 275),
      damage: this.tuning('damage', 1),
      intervalMs: 115,
      originOffsetX: 48,
      originOffsetY: 18,
      // The glob is born in the open mouth of the vomit pose.
      mouthY: this.waterlineY != null ? getSapoMouthY(this.waterlineY) : this.sprite.y,
      targetY: Number(this.player?.body?.center?.y ?? this.player?.y),
    }));
    return true;
  }

  updateGarbanzoLoco() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    const detectRange = this.tuning('detectRange', 380);
    const attackRange = this.tuning('attackRange', 96);
    const reachable = this.canReachPlayer(attackRange);

    if (this.state === 'PATROL') {
      this.direction = getEnemyWallDirection(
        this.sprite.body.blocked,
        getEnemyPatrolDirection(this.sprite.x, this.home.x, 175, this.direction),
      );
      this.sprite.setVelocityX(this.direction * this.tuning('speed', 74) * 0.72);
      if (absolute < detectRange && reachable) this.setState('CHASE');
    } else if (this.state === 'CHASE') {
      this.direction = getDirection(distance, this.direction);
      this.sprite.setVelocityX(this.direction * this.tuning('speed', 74));
      // The thrust is horizontal: never wind up under a Babito on a ledge.
      const level = Math.abs(Number(this.player.y) - this.sprite.y) <= GARBANZO_LEVEL_TOLERANCE;
      if (absolute <= attackRange && level) this.setState('ATTACK_WINDUP');
      else if (absolute > detectRange + 150 || !reachable) this.setState('PATROL');
    } else if (this.state === 'ATTACK_WINDUP') {
      // The thrust direction is locked when the anticipation starts: jumping
      // over Garbanzo to his back is a real dodge, never a landing in the spear.
      this.sprite.setVelocityX(0);
      this.setVisualScale(1.04, 0.94);
      if (this.elapsed >= this.tuning('windupMs', 520)) this.setState('SPEAR_ATTACK');
    } else if (this.state === 'SPEAR_ATTACK') {
      const attackDuration = this.tuning('attackMs', 260);
      this.setVisualScale(1.06, 0.96);
      this.sprite.setVelocityX(this.direction * 42);
      this.emitMeleeAttack('spear', {
        direction: this.direction,
        // Ends at the painted spear tip (82 px from the body centre).
        reach: this.tuning('spearReach', 60),
        width: 126,
        height: 48,
        offsetY: -8,
        durationMs: Math.max(40, attackDuration - this.elapsed),
        damage: this.config.damage,
      });
      if (this.elapsed >= attackDuration) this.setState('RECOVER');
    } else if (this.state === 'RECOVER') {
      this.setVisualScale();
      this.sprite.setVelocityX(-this.direction * 24);
      if (this.elapsed >= this.tuning('recoverMs', 720)) {
        this.setState(absolute <= detectRange ? 'CHASE' : 'PATROL');
      }
    }
  }

  updateArbolPocho() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    const detectRange = this.tuning('detectRange', 250);
    const attackRange = this.tuning('attackRange', 96);
    this.sprite.setVelocity(0, 0);

    if (this.state === 'TREE_IDLE') {
      if (absolute <= detectRange) this.setState('WAKE_UP');
    } else if (this.state === 'WAKE_UP') {
      this.direction = getDirection(distance, this.direction);
      this.setVisualScale(1.03, 0.98);
      if (this.elapsed >= this.tuning('wakeMs', 680)) this.setState('ANGRY_IDLE');
    } else if (this.state === 'ANGRY_IDLE') {
      this.direction = getDirection(distance, this.direction);
      if (this.isChargingPunch) {
        // Committed anticipation: stepping back now makes the branch whiff
        // and opens the vulnerable RECOVER window.
        this.setVisualScale(1.04, 0.97);
        if (this.now - this.punchChargeStartedAt >= this.tuning('punchWindupMs', 300)) {
          this.punchChargeStartedAt = null;
          this.setState(distance < 0 ? 'PUNCH_LEFT' : 'PUNCH_RIGHT');
        }
      } else if (absolute > detectRange + 110) {
        this.setVisualScale();
        this.setState('TREE_IDLE');
      } else if (absolute <= attackRange && this.elapsed >= this.tuning('angryIdleMs', 420)) {
        this.punchChargeStartedAt = this.now;
        this.applyStateTint();
      } else {
        this.setVisualScale();
      }
    } else if (this.state === 'PUNCH_LEFT' || this.state === 'PUNCH_RIGHT') {
      const punchDirection = this.state === 'PUNCH_LEFT' ? -1 : 1;
      const punchDuration = this.tuning('punchMs', 340);
      this.direction = punchDirection;
      this.emitMeleeAttack('branch', {
        direction: punchDirection,
        // Ends just past the painted fist (62 px from the trunk centre).
        reach: this.tuning('punchReach', 34),
        width: 148,
        height: 68,
        // The rooted body's centre sits well above the floor; lower the branch
        // hit window to overlap a grounded Babito instead of passing overhead.
        offsetY: 28,
        durationMs: Math.max(40, punchDuration - this.elapsed),
        damage: this.config.damage,
      });
      if (this.elapsed >= punchDuration) this.setState('RECOVER');
    } else if (this.state === 'RECOVER') {
      this.setVisualScale(0.98, 1.02);
      if (this.elapsed >= this.tuning('recoverMs', 980)) {
        this.setVisualScale();
        this.setState(absolute <= detectRange ? 'ANGRY_IDLE' : 'TREE_IDLE');
      }
    }
  }

  updateSapoPota() {
    const distance = this.player.x - this.sprite.x;
    const absolute = Math.abs(distance);
    const detectRange = this.tuning('detectRange', 520);
    const attackRange = this.tuning('attackRange', 500);
    this.sprite.setVelocity(0, 0);

    if (this.state === 'UNDERWATER') {
      if (absolute <= detectRange && this.elapsed >= this.tuning('underwaterMs', 900)) {
        this.setState('EMERGE');
      }
    } else if (this.state === 'EMERGE') {
      this.direction = getDirection(distance, this.direction);
      if (this.elapsed >= this.tuning('emergeMs', 720)) this.setState('IDLE');
    } else if (this.state === 'IDLE') {
      this.direction = getDirection(distance, this.direction);
      if (absolute > detectRange + 120 && this.elapsed >= 350) this.setState('SUBMERGE');
      else if (absolute <= attackRange && this.elapsed >= 460) this.setState('ATTACK_WINDUP');
    } else if (this.state === 'ATTACK_WINDUP') {
      this.direction = getDirection(distance, this.direction);
      this.setVisualScale(1.04, 0.96);
      if (this.elapsed >= this.tuning('windupMs', 620)) this.setState('TOXIC_VOMIT');
    } else if (this.state === 'TOXIC_VOMIT') {
      this.setVisualScale(1.05, 0.97);
      this.emitToxicVolley();
      if (this.elapsed >= this.tuning('vomitMs', 440)) this.setState('RECOVER');
    } else if (this.state === 'RECOVER') {
      this.setVisualScale();
      if (this.elapsed >= this.tuning('recoverMs', 1150)) {
        this.setState(absolute <= detectRange + 80 ? 'IDLE' : 'SUBMERGE');
      }
    } else if (this.state === 'SUBMERGE') {
      if (this.elapsed >= this.tuning('submergeMs', 620)) this.setState('UNDERWATER');
    }
  }

  /**
   * Returns a living enemy to its spawn in a neutral state. Used when the
   * Babito respawns nearby, so a checkpoint never drops them into an attack.
   */
  resetToHome() {
    if (this.dead || !this.sprite?.active || this.qaPresentation) return;
    this.hurtUntil = 0;
    this.hurtReturnState = null;
    this.hurtResumeStartedAt = null;
    this.punchChargeStartedAt = null;
    this.attackEventSent = false;
    this.sprite.setPosition(this.home.x, this.home.y)
      .setVelocity(0, 0)
      .setAngularVelocity(0)
      .setAngle(0);
    this.sprite.body.reset(this.home.x, this.home.y);
    this.setState(this.config.states[0]);
    this.stateStartedAt = this.now;
    this.nextDecisionAt = this.now + 1200;
    this.setVisualScale();
    this.applyStateTint();
    this.updateVisualAnimation(true);
    this.syncVisual();
  }

  canHurtPlayer() {
    if (this.dead || this.qaPresentation || this.isHurt) return false;
    if (this.type === 'come') return this.state === 'BITE';
    if (this.type === 'vuela') return this.state === 'DIVE';
    if (this.type === 'da_vueltas') return this.state === 'SPIN';
    // Phase 2 attacks use authored directional windows or projectiles. Body
    // overlap must never damage from the rear or canopy side of the pose.
    if (this.isJungleEnemy) return false;
    return false;
  }

  canTakeDamage() {
    if (this.dead || this.qaPresentation || this.isHurt) return false;
    if (this.type === 'da_vueltas') return this.state === 'DIZZY';
    if (this.type === 'arbol_pocho') return this.state === 'RECOVER';
    if (this.type === 'sapo_pota') {
      return ['EMERGE', 'IDLE', 'ATTACK_WINDUP', 'TOXIC_VOMIT', 'RECOVER'].includes(this.state);
    }
    return true;
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
    const recoveryState = getEnemyStateAfterHit(this.type, this.state);
    this.hurtUntil = this.now + hurtDuration;
    if (this.isJungleEnemy) {
      this.hurtReturnState = recoveryState;
      this.hurtResumeStartedAt = recoveryState === this.state ? this.stateStartedAt : null;
      this.setState('HURT');
    } else {
      if (recoveryState !== this.state) this.setState(recoveryState);
      else this.updateVisualAnimation(true);
      // Legacy enemies do not expose HURT as an AI state. Their destination
      // timer begins once the complete one-shot reaction has played.
      this.stateStartedAt = this.hurtUntil;
    }
    const knockbackDirection = Math.sign(this.sprite.x - hitX) || -this.direction;
    if (this.type === 'vuela') this.sprite.setVelocity(knockbackDirection * 54, -68);
    else if (this.type === 'come') this.sprite.setVelocity(knockbackDirection * 72, -90);
    else if (this.type === 'garbanzo_loco') this.sprite.setVelocity(knockbackDirection * 64, -78);
    else this.sprite.setVelocity(0, 0);
    this.visual?.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.visual?.active && !this.dead && this.applyStateTint());
    return true;
  }

  defeat() {
    if (this.dead) return;
    const previousState = this.state;
    if (this.config.states.includes('DEFEAT')) {
      this.state = 'DEFEAT';
      this.stateStartedAt = this.now;
      this.attackEventSent = true;
      this.stateBadge?.setText('DEFEAT');
      this.services.onStateChange?.(this, 'DEFEAT', previousState);
    }
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
