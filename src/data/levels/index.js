import babilandia from './babilandia.json' with { type: 'json' };
import jungla from './jungla.json' with { type: 'json' };

/**
 * Playable side-scrolling levels. The JSON files hold geometry and encounters;
 * this registry holds what GameScene needs to present and chain each level.
 */
export const LEVELS = Object.freeze({
  babilandia: Object.freeze({
    id: 'babilandia',
    data: babilandia,
    theme: 'babilandia',
    backgroundAsset: 'babilandiaV2',
    cameraColor: '#7cccf1',
    progressScene: 'babilandia',
    coinRewardPrefix: 'babilandia:coin:',
    announcement: 'Babilandia. Muévete, salta, derrota a los Bicharracos y recoge monedas.',
    tiles: Object.freeze({ ground: 'tile_ground', platform: 'tile_platform' }),
    boss: Object.freeze({
      scene: 'BossScene',
      progressScene: 'boss1',
      checkpoint: 'boss_gate',
      announcement: 'Comienza el combate contra Babito Corrupto',
    }),
  }),
  jungla: Object.freeze({
    id: 'jungla',
    data: jungla,
    theme: 'jungle',
    backgroundAsset: null,
    cameraColor: '#1d5554',
    progressScene: 'jungla',
    coinRewardPrefix: 'jungla:coin:',
    announcement: 'La Jungla. Salta los fosos del río, usa las setas y derrota a los Bicharracos.',
    introToast: 'LA JUNGLA · Caer al río cuesta un corazón',
    tiles: Object.freeze({ ground: 'tile_jungle_ground', platform: 'tile_branch' }),
    boss: Object.freeze({
      scene: 'DarknessBossScene',
      progressScene: 'boss2',
      checkpoint: 'portal_oscuro',
      announcement: 'Comienza el combate contra La Oscuridad',
    }),
  }),
});

export const PLATFORM_STYLE_TEXTURES = Object.freeze({
  branch: 'tile_branch',
  bridge: 'tile_bridge',
  ruin: 'tile_ruin',
  stone: 'tile_stone',
});

/**
 * Merges touching base ground segments into continuous spans. Gaps between
 * spans are pits; styled ground (ruin pillars) is scenery on top of a span.
 */
export function getGroundSpans(platforms = []) {
  const segments = platforms
    .filter((platform) => platform.kind === 'ground' && !platform.style)
    .map((platform) => ({ left: platform.x - platform.width / 2, right: platform.x + platform.width / 2 }))
    .sort((first, second) => first.left - second.left);
  const spans = [];
  for (const segment of segments) {
    const last = spans.at(-1);
    if (last && segment.left <= last.right + 1) last.right = Math.max(last.right, segment.right);
    else spans.push({ ...segment });
  }
  return spans;
}

/** Maps a saved progress scene (or a level id) to its playable level. */
export function resolveLevelId(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'jungla' || key === 'jungle') return 'jungla';
  return 'babilandia';
}

export function getLevel(value) {
  return LEVELS[resolveLevelId(value)];
}
