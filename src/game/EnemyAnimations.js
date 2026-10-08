const makeBounds = (values) => Object.freeze(values);

/**
 * COME and VUELA use approved authored atlases. DA VUELTAS is still built at
 * runtime on exact 64px cells so no generated-art boundary can clip a pose.
 */
export const ENEMY_SHEET_ASSETS = Object.freeze({
  come: Object.freeze({
    key: 'enemy_come_sheet_v3',
    url: 'assets/characters/enemy-come-sheet-v3.png',
    xBounds: makeBounds([0, 229, 458, 687, 916, 1145, 1374]),
    yBounds: makeBounds([0, 229, 458, 687, 916, 1145]),
  }),
  vuela: Object.freeze({
    key: 'enemy_vuela_sheet_v4',
    url: 'assets/characters/enemy-vuela-sheet-v4.png',
    xBounds: makeBounds([0, 256, 512, 768, 1024, 1280, 1536]),
    yBounds: makeBounds([0, 256, 512, 768, 1024, 1280, 1536]),
  }),
  da_vueltas: Object.freeze({
    key: 'enemy_da_vueltas_sheet_v3',
    procedural: true,
    xBounds: makeBounds([0, 64, 128, 192, 256, 320, 384]),
    yBounds: makeBounds([0, 64, 128, 192, 256, 320]),
  }),
});

export const ENEMY_ANIMATION_CLIPS = Object.freeze({
  come: Object.freeze({
    idle: Object.freeze({ row: 0, frameRate: 5, repeat: -1 }),
    walk: Object.freeze({ row: 1, frameRate: 9, repeat: -1 }),
    windup: Object.freeze({ row: 2, columns: Object.freeze([0, 1, 2]), frameRate: 7, repeat: 0 }),
    attack: Object.freeze({ row: 2, columns: Object.freeze([2, 3, 4, 5]), frameRate: 15, repeat: 0 }),
    hurt: Object.freeze({ row: 3, frameRate: 11, repeat: 0 }),
    defeat: Object.freeze({ row: 4, frameRate: 9, repeat: 0 }),
  }),
  vuela: Object.freeze({
    idle: Object.freeze({ row: 0, frameRate: 8, repeat: -1 }),
    fly: Object.freeze({ row: 1, frameRate: 11, repeat: -1 }),
    dive: Object.freeze({ row: 2, frameRate: 13, repeat: 0 }),
    attack: Object.freeze({ row: 3, frameRate: 14, repeat: 0 }),
    hurt: Object.freeze({ row: 4, frameRate: 12, repeat: 0 }),
    defeat: Object.freeze({ row: 5, frameRate: 9, repeat: 0 }),
  }),
  da_vueltas: Object.freeze({
    idle: Object.freeze({ row: 0, frameRate: 5, repeat: -1 }),
    roll: Object.freeze({ row: 1, frameRate: 14, repeat: -1 }),
    windup: Object.freeze({ row: 2, frameRate: 10, repeat: -1 }),
    hurt: Object.freeze({ row: 3, frameRate: 10, repeat: 0 }),
    defeat: Object.freeze({ row: 4, frameRate: 9, repeat: 0 }),
  }),
});

export const ENEMY_STATE_CLIPS = Object.freeze({
  come: Object.freeze({
    PATROL: 'walk',
    CHASE: 'walk',
    WINDUP: 'windup',
    BITE: 'attack',
    RECOVER: 'idle',
  }),
  vuela: Object.freeze({
    AIR_PATROL: 'fly',
    TARGET: 'idle',
    WINDUP: 'attack',
    DIVE: 'dive',
    RETURN: 'fly',
  }),
  da_vueltas: Object.freeze({
    // DA VUELTAS always travels by rolling; the faster SPIN state reuses the
    // same authored cycle while Arcade Physics controls the actual speed.
    PATROL: 'roll',
    WINDUP: 'windup',
    SPIN: 'roll',
    DIZZY: 'hurt',
  }),
});

const ENEMY_STATE_TINTS = Object.freeze({
  come: Object.freeze({
    WINDUP: 0xffcf4a,
    RECOVER: 0x9df0ff,
  }),
  vuela: Object.freeze({
    // Preserve VUELA's distinctive magenta dive warning on the visible layer.
    WINDUP: 0xff78da,
  }),
  da_vueltas: Object.freeze({
    WINDUP: 0xffcf4a,
    DIZZY: 0x9df0ff,
  }),
});

export function getEnemyAnimationKey(type, clip) {
  return `enemy-${type}-${clip}-v3`;
}

export function getEnemyFrameName(type, row, column) {
  return `${type}-${row}-${column}`;
}

export function getEnemyClipForState(type, state) {
  return ENEMY_STATE_CLIPS[type]?.[state] ?? 'idle';
}

export function getEnemyClipDurationMs(type, clip) {
  const settings = ENEMY_ANIMATION_CLIPS[type]?.[clip];
  if (!settings) return 0;
  const frameCount = settings.columns?.length
    ?? (ENEMY_SHEET_ASSETS[type]?.xBounds.length - 1);
  if (!frameCount) return 0;
  return (frameCount * 1000) / settings.frameRate;
}

export function getEnemyStateAfterHit(type, state) {
  if (type === 'come' && ['WINDUP', 'BITE'].includes(state)) return 'RECOVER';
  if (type === 'vuela' && ['TARGET', 'WINDUP', 'DIVE'].includes(state)) return 'RETURN';
  return state;
}

export function enemyUsesPlatformCollision(type) {
  return type !== 'vuela';
}

export function resolveEnemyQaPresentation(type, requestedState) {
  const clips = ENEMY_ANIMATION_CLIPS[type];
  const states = ENEMY_STATE_CLIPS[type];
  if (!clips || !states) return null;

  const raw = String(requestedState ?? '').trim();
  const state = raw.toUpperCase();
  if (state && Object.hasOwn(states, state)) {
    return Object.freeze({ state, clip: states[state] });
  }

  const clip = raw.toLowerCase() || states[Object.keys(states)[0]];
  if (!Object.hasOwn(clips, clip)) return null;
  return Object.freeze({ state: null, clip });
}

export function getEnemyTintForState(type, state) {
  return ENEMY_STATE_TINTS[type]?.[state] ?? null;
}

/**
 * Phaser's second Sprite.play argument means "ignore if already playing".
 * A requested restart must therefore invert that flag.
 */
export function shouldIgnoreEnemyClipIfPlaying(restart = false) {
  return !restart;
}

export function resetEnemyVisualForDefeat(visual, baseScale = { x: 1, y: 1 }) {
  if (!visual?.active) return false;
  visual
    .setScale(baseScale.x, baseScale.y)
    .setRotation(0)
    .setAlpha(1)
    .clearTint();
  return true;
}

export function buildEnemyFrameRectangles(type) {
  const asset = ENEMY_SHEET_ASSETS[type];
  if (!asset) return [];
  const frames = [];
  for (let row = 0; row < asset.yBounds.length - 1; row += 1) {
    for (let column = 0; column < asset.xBounds.length - 1; column += 1) {
      const x = asset.xBounds[column];
      const y = asset.yBounds[row];
      frames.push(Object.freeze({
        name: getEnemyFrameName(type, row, column),
        row,
        column,
        x,
        y,
        width: asset.xBounds[column + 1] - x,
        height: asset.yBounds[row + 1] - y,
      }));
    }
  }
  return frames;
}

export function registerEnemyAnimations(scene) {
  for (const [type, asset] of Object.entries(ENEMY_SHEET_ASSETS)) {
    const texture = scene.textures.get(asset.key);
    if (!texture || texture.key === '__MISSING') continue;
    texture.setFilter?.(1);

    const frameRectangles = buildEnemyFrameRectangles(type);
    for (const frame of frameRectangles) {
      if (!texture.has(frame.name)) {
        texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
      }
    }

    for (const [clip, settings] of Object.entries(ENEMY_ANIMATION_CLIPS[type])) {
      const key = getEnemyAnimationKey(type, clip);
      if (scene.anims.exists(key)) continue;
      const columns = settings.columns
        ?? Array.from({ length: asset.xBounds.length - 1 }, (_, column) => column);
      scene.anims.create({
        key,
        frames: columns.map((column) => ({
          key: asset.key,
          frame: getEnemyFrameName(type, settings.row, column),
        })),
        frameRate: settings.frameRate,
        repeat: settings.repeat,
      });
    }
  }
}
