import babilandia from './babilandia.json' with { type: 'json' };
import jungla from './jungla.json' with { type: 'json' };
import city from './city.json' with { type: 'json' };

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
    backgroundAsset: 'jungleV1',
    cameraColor: '#1d5554',
    progressScene: 'jungla',
    coinRewardPrefix: 'jungla:coin:',
    announcement: 'La Jungla. Salta los fosos del río, usa las setas y derrota a los Bicharracos.',
    introToast: 'LA JUNGLA · Caer al río cuesta un corazón',
    // Rope bridges and branches are thin walkways: Babito shots (including
    // lobbed rocks) cross them like the toxic vomit does. Only solid ground
    // and ruin pillars stop a projectile.
    walkwaysStopShots: false,
    tiles: Object.freeze({ ground: 'tile_jungle_ground', platform: 'tile_branch' }),
    boss: Object.freeze({
      scene: 'DarknessBossScene',
      progressScene: 'boss2',
      checkpoint: 'portal_oscuro',
      announcement: 'Comienza el combate contra La Oscuridad',
    }),
  }),
  city: Object.freeze({
    id: 'city',
    data: city,
    theme: 'city',
    backgroundAsset: 'cityV1',
    cameraColor: '#10172b',
    progressScene: 'city',
    coinRewardPrefix: 'city:coin:',
    announcement: 'Ciudad de los Bicharracos. Cruza fábricas y supera a los tres robots de Momo.',
    introToast: 'FASE 3 · Las zonas eléctricas dañan y las plataformas mecánicas se mueven',
    walkwaysStopShots: false,
    portalLabel: 'FORTALEZA SELLADA',
    portalOpenLabel: 'FORTALEZA SUPERADA',
    portalSuccessToast: '¡Ciudad superada! La puerta del Boss Total está abierta.',
    tiles: Object.freeze({ ground: 'tile_city_ground', platform: 'tile_city_platform' }),
    boss: Object.freeze({
      scene: 'ComingSoonScene',
      progressScene: 'boss_total',
      checkpoint: 'fortress_gate',
      announcement: 'Próximamente: Boss Total',
      data: Object.freeze({ world: 'boss-total' }),
      progress: Object.freeze({ phase3Complete: true }),
    }),
  }),
});

/** Top edge of the river water drawn in every La Jungla pit. */
export const JUNGLE_WATER_SURFACE_Y = 494;

export const PLATFORM_STYLE_TEXTURES = Object.freeze({
  branch: 'tile_branch',
  bridge: 'tile_bridge',
  ruin: 'tile_ruin',
  stone: 'tile_stone',
  metal: 'tile_city_platform',
  pipe: 'tile_city_pipe',
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

/**
 * Stretches a walker can patrol: ground spans with the solid styled ground
 * (ruin pillars) cut out, since a walker can neither cross nor climb them.
 */
export function getWalkSpans(platforms = []) {
  const obstacles = platforms
    .filter((platform) => platform.kind === 'ground' && platform.style)
    .map((platform) => ({ left: platform.x - platform.width / 2, right: platform.x + platform.width / 2 }));
  let spans = getGroundSpans(platforms);
  for (const obstacle of obstacles) {
    spans = spans.flatMap((span) => {
      if (obstacle.right <= span.left || obstacle.left >= span.right) return [span];
      return [
        { left: span.left, right: obstacle.left },
        { left: obstacle.right, right: span.right },
      ].filter((piece) => piece.right > piece.left);
    });
  }
  return spans.sort((first, second) => first.left - second.left);
}

/** Maps a saved progress scene (or a level id) to its playable level. */
export function resolveLevelId(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'jungla' || key === 'jungle') return 'jungla';
  if (['city', 'ciudad', 'ciudad-bicharraca', 'ciudad_bicharraca'].includes(key)) return 'city';
  return 'babilandia';
}

export function getLevel(value) {
  return LEVELS[resolveLevelId(value)];
}
