const frame = (duration, x, y, scaleX, scaleY, angle = 0) => Object.freeze({
  duration,
  x,
  y,
  scaleX,
  scaleY,
  angle,
});

function getGameplayTime(scene) {
  const value = scene?.getGameplayTime?.();
  return Number.isFinite(value) ? value : (scene?.time?.now ?? 0);
}

/**
 * Hand-authored, stepped poses for the corrupt boss. Keeping these as discrete
 * frames preserves the game's pixel-art cadence while the physics sprite stays
 * at a constant size beneath the visual.
 */
export const BOSS_POSE_CLIPS = Object.freeze({
  INTRO: Object.freeze([
    frame(190, 0, 0, 1, 1, -1),
    frame(190, 0, -3, 1.02, 0.98, 1),
    frame(190, 0, -1, 1, 1, 0),
    frame(190, 0, -4, 0.99, 1.02, 1),
  ]),
  FIREBALL: Object.freeze([
    frame(130, -2, 2, 1.08, 0.92, -5),
    frame(130, -4, 4, 1.14, 0.86, -8),
    frame(95, 5, -2, 0.9, 1.1, 5),
    frame(95, 9, -1, 0.86, 1.14, 8),
    frame(130, 1, 0, 1.03, 0.97, 1),
  ]),
  FROM_ABOVE: Object.freeze([
    frame(105, 0, 3, 1.12, 0.88, -3),
    frame(105, 0, -4, 0.9, 1.12, 2),
    frame(85, 0, -9, 0.84, 1.18, 0),
    frame(85, 0, -4, 0.92, 1.09, 0),
  ]),
  FURY_CHARGE: Object.freeze([
    frame(85, -7, 2, 1.12, 0.9, -7),
    frame(85, -3, 0, 1.04, 0.96, 4),
    frame(70, 7, -1, 0.88, 1.08, 8),
    frame(70, 11, 0, 0.84, 1.12, 5),
  ]),
  RECOVER: Object.freeze([
    frame(180, 0, 7, 1.13, 0.82, -8),
    frame(180, -2, 9, 1.17, 0.78, -10),
    frame(180, 1, 6, 1.1, 0.85, -7),
    frame(180, 0, 8, 1.15, 0.8, -9),
  ]),
});

export function sampleBossPose(state, elapsedMs) {
  const clip = BOSS_POSE_CLIPS[state] ?? BOSS_POSE_CLIPS.INTRO;
  const duration = clip.reduce((total, pose) => total + pose.duration, 0);
  let cursor = Math.max(0, Number(elapsedMs) || 0) % duration;
  for (const pose of clip) {
    if (cursor < pose.duration) return pose;
    cursor -= pose.duration;
  }
  return clip[clip.length - 1];
}

export class BossAnimator {
  constructor(scene, physicsBody, textureKey, width = 132, height = 132) {
    this.scene = scene;
    this.physicsBody = physicsBody;
    this.state = 'INTRO';
    this.stateStartedAt = getGameplayTime(scene);
    this.facing = -1;
    this.stateTint = null;
    this.purified = false;
    this.visual = scene.add.sprite(physicsBody.x, physicsBody.y, textureKey)
      .setDepth(14)
      .setDisplaySize(width, height);
    this.baseScale = { x: this.visual.scaleX, y: this.visual.scaleY };
    this.update(this.stateStartedAt);
  }

  setState(state, tint = null) {
    this.state = BOSS_POSE_CLIPS[state] ? state : 'INTRO';
    this.stateStartedAt = getGameplayTime(this.scene);
    this.stateTint = tint;
    this.applyTint();
    this.update(this.stateStartedAt);
  }

  setFacing(facing) {
    if (facing) this.facing = Math.sign(facing);
    this.visual?.setFlipX(this.facing > 0);
  }

  applyTint() {
    if (!this.visual?.active) return;
    this.visual.clearTint();
    if (this.stateTint) this.visual.setTint(this.stateTint);
  }

  update(time = getGameplayTime(this.scene)) {
    if (!this.visual?.active || !this.physicsBody?.active) return;
    if (this.purified) {
      this.visual
        .setPosition(this.physicsBody.x, this.physicsBody.y)
        .setAlpha(this.physicsBody.alpha);
      return;
    }
    const pose = sampleBossPose(this.state, time - this.stateStartedAt);
    const direction = this.facing || 1;
    this.visual
      .setPosition(
        this.physicsBody.x + pose.x * direction,
        this.physicsBody.y + pose.y,
      )
      .setScale(
        this.baseScale.x * pose.scaleX,
        this.baseScale.y * pose.scaleY,
      )
      .setAngle(pose.angle * direction)
      .setFlipX(direction > 0)
      .setAlpha(this.physicsBody.alpha);
  }

  setPurified(textureKey, width = 72, height = 72) {
    this.purified = true;
    this.stateTint = null;
    this.visual
      .stop()
      .setTexture(textureKey)
      .setPosition(this.physicsBody.x, this.physicsBody.y)
      .setDisplaySize(width, height)
      .setAngle(0)
      .setAlpha(1)
      .setFlipX(this.facing > 0)
      .clearTint();
  }

  destroy() {
    this.visual?.destroy();
    this.visual = null;
  }
}
