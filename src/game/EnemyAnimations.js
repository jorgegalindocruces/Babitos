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
  // La Jungla v2 atlases keep v1's 256px-tall cells and baselines, but use
  // wider cells so long poses (spear thrust, vomit, fallen tree) are never
  // sliced, and every pose shares one horizontal pivot at the cell centre.
  garbanzo_loco: Object.freeze({
    key: 'enemy_garbanzo_loco_sheet_v2',
    url: 'assets/characters/enemy-garbanzo-loco-sheet-v2.png',
    revision: 'v2',
    xBounds: makeBounds([0, 352, 704, 1056, 1408]),
    yBounds: makeBounds([0, 256, 512]),
  }),
  arbol_pocho: Object.freeze({
    key: 'enemy_arbol_pocho_sheet_v2',
    url: 'assets/characters/enemy-arbol-pocho-sheet-v2.png',
    revision: 'v2',
    xBounds: makeBounds([0, 288, 576, 864, 1152]),
    yBounds: makeBounds([0, 256, 512]),
  }),
  sapo_pota: Object.freeze({
    key: 'enemy_sapo_pota_sheet_v2',
    url: 'assets/characters/enemy-sapo-pota-sheet-v2.png',
    revision: 'v2',
    xBounds: makeBounds([0, 400, 800, 1200, 1600]),
    yBounds: makeBounds([0, 256, 512]),
  }),
  // Phase 3 production sheets are transparent 4 × 2 atlases. Every cell is
  // exactly 443 px so runtime frames never include a neighbour or a label.
  drone_bot: Object.freeze({
    key: 'enemy_drone_bot_sheet_v1',
    url: 'assets/enemies/city/drone-bot-sheet-v1.png',
    revision: 'v1',
    xBounds: makeBounds([0, 443, 886, 1329, 1772]),
    yBounds: makeBounds([0, 443, 886]),
  }),
  robot_elice: Object.freeze({
    key: 'enemy_robot_elice_sheet_v1',
    url: 'assets/enemies/city/robot-elice-sheet-v1.png',
    revision: 'v1',
    xBounds: makeBounds([0, 443, 886, 1329, 1772]),
    yBounds: makeBounds([0, 443, 886]),
  }),
  ive_robot: Object.freeze({
    key: 'enemy_ive_robot_sheet_v1',
    url: 'assets/enemies/city/ive-robot-sheet-v1.png',
    revision: 'v1',
    xBounds: makeBounds([0, 443, 886, 1329, 1772]),
    yBounds: makeBounds([0, 443, 886]),
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
  garbanzo_loco: Object.freeze({
    idle: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: -1 }),
    walk: Object.freeze({ row: 0, columns: Object.freeze([1, 2]), frameRate: 8, repeat: -1 }),
    windup: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 7, repeat: 0 }),
    attack: Object.freeze({ row: 1, columns: Object.freeze([0]), frameRate: 12, repeat: 0 }),
    hurt: Object.freeze({ row: 1, columns: Object.freeze([1]), frameRate: 8, repeat: 0, durationMs: 360 }),
    recover: Object.freeze({ row: 1, columns: Object.freeze([2]), frameRate: 6, repeat: 0 }),
    defeat: Object.freeze({ row: 1, columns: Object.freeze([3]), frameRate: 7, repeat: 0, durationMs: 520 }),
  }),
  arbol_pocho: Object.freeze({
    idle: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: -1 }),
    wake: Object.freeze({ row: 0, columns: Object.freeze([1]), frameRate: 7, repeat: 0 }),
    angry: Object.freeze({ row: 0, columns: Object.freeze([2]), frameRate: 6, repeat: -1 }),
    // The authored row 1 pose reaches left and row 0 reaches right.
    punch_left: Object.freeze({ row: 1, columns: Object.freeze([0]), frameRate: 12, repeat: 0 }),
    punch_right: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 12, repeat: 0 }),
    recover: Object.freeze({ row: 1, columns: Object.freeze([1]), frameRate: 6, repeat: 0 }),
    hurt: Object.freeze({ row: 1, columns: Object.freeze([2]), frameRate: 8, repeat: 0, durationMs: 380 }),
    defeat: Object.freeze({ row: 1, columns: Object.freeze([3]), frameRate: 7, repeat: 0, durationMs: 560 }),
  }),
  sapo_pota: Object.freeze({
    underwater: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: -1 }),
    emerge: Object.freeze({ row: 0, columns: Object.freeze([1]), frameRate: 7, repeat: 0 }),
    idle: Object.freeze({ row: 0, columns: Object.freeze([2]), frameRate: 5, repeat: -1 }),
    windup: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 7, repeat: 0 }),
    vomit: Object.freeze({ row: 1, columns: Object.freeze([0]), frameRate: 12, repeat: 0 }),
    hurt: Object.freeze({ row: 1, columns: Object.freeze([1]), frameRate: 8, repeat: 0, durationMs: 400 }),
    submerge: Object.freeze({ row: 1, columns: Object.freeze([2]), frameRate: 7, repeat: 0 }),
    defeat: Object.freeze({ row: 1, columns: Object.freeze([3]), frameRate: 7, repeat: 0, durationMs: 580 }),
    // The authored idle pose doubles as the post-vomit breathing pose. It is
    // registered separately so RECOVER remains a semantic animation state.
    recover: Object.freeze({ row: 0, columns: Object.freeze([2]), frameRate: 5, repeat: 0 }),
  }),
  drone_bot: Object.freeze({
    idle: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: -1 }),
    patrol: Object.freeze({ row: 0, columns: Object.freeze([1, 2]), frameRate: 7, repeat: -1 }),
    detect: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 6, repeat: 0 }),
    charge: Object.freeze({ row: 1, columns: Object.freeze([0]), frameRate: 8, repeat: 0 }),
    electric_attack: Object.freeze({ row: 1, columns: Object.freeze([1]), frameRate: 10, repeat: 0 }),
    hurt: Object.freeze({ row: 1, columns: Object.freeze([2]), frameRate: 8, repeat: 0, durationMs: 360 }),
    recover: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: 0 }),
    defeat: Object.freeze({ row: 1, columns: Object.freeze([3]), frameRate: 8, repeat: 0, durationMs: 620 }),
  }),
  robot_elice: Object.freeze({
    idle: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: -1 }),
    patrol: Object.freeze({ row: 0, columns: Object.freeze([1, 2]), frameRate: 8, repeat: -1 }),
    detect: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 7, repeat: 0 }),
    spin_windup: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 8, repeat: 0 }),
    spin_attack: Object.freeze({ row: 1, columns: Object.freeze([0]), frameRate: 14, repeat: -1 }),
    spin_recover: Object.freeze({ row: 1, columns: Object.freeze([1]), frameRate: 7, repeat: 0 }),
    hurt: Object.freeze({ row: 1, columns: Object.freeze([2]), frameRate: 8, repeat: 0, durationMs: 380 }),
    defeat: Object.freeze({ row: 1, columns: Object.freeze([3]), frameRate: 8, repeat: 0, durationMs: 620 }),
  }),
  ive_robot: Object.freeze({
    idle: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: -1 }),
    patrol: Object.freeze({ row: 0, columns: Object.freeze([1, 2]), frameRate: 7, repeat: -1 }),
    detect: Object.freeze({ row: 0, columns: Object.freeze([2]), frameRate: 6, repeat: 0 }),
    scythe_windup: Object.freeze({ row: 0, columns: Object.freeze([3]), frameRate: 7, repeat: 0 }),
    scythe_attack: Object.freeze({ row: 1, columns: Object.freeze([0]), frameRate: 12, repeat: 0 }),
    grab_attack: Object.freeze({ row: 1, columns: Object.freeze([1]), frameRate: 12, repeat: 0 }),
    recover: Object.freeze({ row: 0, columns: Object.freeze([0]), frameRate: 5, repeat: 0 }),
    hurt: Object.freeze({ row: 1, columns: Object.freeze([2]), frameRate: 8, repeat: 0, durationMs: 420 }),
    defeat: Object.freeze({ row: 1, columns: Object.freeze([3]), frameRate: 7, repeat: 0, durationMs: 680 }),
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
  garbanzo_loco: Object.freeze({
    PATROL: 'walk',
    CHASE: 'walk',
    ATTACK_WINDUP: 'windup',
    SPEAR_ATTACK: 'attack',
    RECOVER: 'recover',
    HURT: 'hurt',
    DEFEAT: 'defeat',
  }),
  arbol_pocho: Object.freeze({
    TREE_IDLE: 'idle',
    WAKE_UP: 'wake',
    ANGRY_IDLE: 'angry',
    PUNCH_LEFT: 'punch_left',
    PUNCH_RIGHT: 'punch_right',
    RECOVER: 'recover',
    HURT: 'hurt',
    DEFEAT: 'defeat',
  }),
  sapo_pota: Object.freeze({
    UNDERWATER: 'underwater',
    EMERGE: 'emerge',
    IDLE: 'idle',
    ATTACK_WINDUP: 'windup',
    TOXIC_VOMIT: 'vomit',
    RECOVER: 'recover',
    HURT: 'hurt',
    SUBMERGE: 'submerge',
    DEFEAT: 'defeat',
  }),
  drone_bot: Object.freeze({
    IDLE: 'idle',
    PATROL: 'patrol',
    DETECT: 'detect',
    CHARGE: 'charge',
    ELECTRIC_ATTACK: 'electric_attack',
    RECOVER: 'recover',
    HURT: 'hurt',
    EXPLODE: 'defeat',
  }),
  robot_elice: Object.freeze({
    PATROL: 'patrol',
    DETECT: 'detect',
    SPIN_WINDUP: 'spin_windup',
    SPIN_ATTACK: 'spin_attack',
    SPIN_RECOVER: 'spin_recover',
    VULNERABLE: 'spin_recover',
    HURT: 'hurt',
    DEFEAT: 'defeat',
  }),
  ive_robot: Object.freeze({
    IDLE: 'idle',
    PATROL: 'patrol',
    DETECT: 'detect',
    SCYTHE_WINDUP: 'scythe_windup',
    SCYTHE_ATTACK: 'scythe_attack',
    GRAB_ATTACK: 'grab_attack',
    RECOVER: 'recover',
    HURT: 'hurt',
    DEFEAT: 'defeat',
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
  garbanzo_loco: Object.freeze({
    ATTACK_WINDUP: 0xffcf4a,
    RECOVER: 0x9df0ff,
  }),
  arbol_pocho: Object.freeze({
    WAKE_UP: 0xffcf4a,
    RECOVER: 0x9df0ff,
  }),
  sapo_pota: Object.freeze({
    ATTACK_WINDUP: 0xffcf4a,
    RECOVER: 0x9df0ff,
  }),
  drone_bot: Object.freeze({
    DETECT: 0xffcf4a,
    CHARGE: 0x5fe8ff,
    RECOVER: 0x9df0ff,
  }),
  robot_elice: Object.freeze({
    DETECT: 0xffcf4a,
    SPIN_WINDUP: 0xff6b7f,
    SPIN_ATTACK: 0xff315c,
    VULNERABLE: 0x9df0ff,
  }),
  ive_robot: Object.freeze({
    DETECT: 0xffcf4a,
    SCYTHE_WINDUP: 0xff6b7f,
    RECOVER: 0x9df0ff,
  }),
});

export function getEnemyAnimationKey(type, clip) {
  const revision = ENEMY_SHEET_ASSETS[type]?.revision ?? 'v3';
  return `enemy-${type}-${clip}-${revision}`;
}

/** Size of one atlas cell; Jungle cells are wider than they are tall. */
export function getEnemyCellSize(type) {
  const asset = ENEMY_SHEET_ASSETS[type];
  if (!asset) return null;
  return {
    width: asset.xBounds[1] - asset.xBounds[0],
    height: asset.yBounds[1] - asset.yBounds[0],
  };
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
  if (Number.isFinite(settings.durationMs)) return settings.durationMs;
  const frameCount = settings.columns?.length
    ?? (ENEMY_SHEET_ASSETS[type]?.xBounds.length - 1);
  if (!frameCount) return 0;
  return (frameCount * 1000) / settings.frameRate;
}

export function getEnemyStateAfterHit(type, state) {
  if (type === 'come' && ['WINDUP', 'BITE'].includes(state)) return 'RECOVER';
  if (type === 'vuela' && ['TARGET', 'WINDUP', 'DIVE'].includes(state)) return 'RETURN';
  if (type === 'garbanzo_loco' && ['ATTACK_WINDUP', 'SPEAR_ATTACK', 'HURT'].includes(state)) {
    return 'RECOVER';
  }
  if (type === 'arbol_pocho' && [
    'WAKE_UP', 'ANGRY_IDLE', 'PUNCH_LEFT', 'PUNCH_RIGHT', 'HURT',
  ].includes(state)) return 'RECOVER';
  if (type === 'sapo_pota' && [
    'EMERGE', 'IDLE', 'ATTACK_WINDUP', 'TOXIC_VOMIT', 'HURT',
  ].includes(state)) return 'RECOVER';
  if (type === 'drone_bot' && ['DETECT', 'CHARGE', 'ELECTRIC_ATTACK', 'HURT'].includes(state)) {
    return 'RECOVER';
  }
  if (type === 'robot_elice') return 'VULNERABLE';
  if (type === 'ive_robot' && [
    'DETECT', 'SCYTHE_WINDUP', 'SCYTHE_ATTACK', 'GRAB_ATTACK', 'HURT',
  ].includes(state)) return 'RECOVER';
  return state;
}

export function enemyUsesPlatformCollision(type) {
  return !['vuela', 'arbol_pocho', 'sapo_pota', 'drone_bot'].includes(type);
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
