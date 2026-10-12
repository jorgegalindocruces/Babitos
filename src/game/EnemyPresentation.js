export function isEnemyFootAnchored(type) {
  return [
    'come',
    'garbanzo_loco',
    'arbol_pocho',
    'sapo_pota',
    'robot_elice',
    'ive_robot',
  ].includes(type);
}

const AUTHORED_BASELINE_OFFSETS = Object.freeze({
  // Transparent cell padding below the last opaque pixel at production size.
  garbanzo_loco: 6,
  arbol_pocho: 5,
  sapo_pota: 7,
  robot_elice: 8,
  ive_robot: 12,
});

/**
 * Sapo Pota sits this far below the river surface. The opaque water layer
 * hides its lower body, so the seated poses read as half-submerged and the
 * UNDERWATER eyes rest exactly on the surface instead of floating above it.
 */
export const SAPO_SUBMERGE_DEPTH = 16;
// Height of the open mouth's centre above the vomit pose's last opaque row.
const SAPO_MOUTH_HEIGHT = 52;
// Seated body that player shots can hit: from the top of the head (idle pose)
// down to just below the river surface.
export const SAPO_BODY_SIZE = Object.freeze({ width: 100, height: 74 });
// Below the river layer (depth 3) and the bridges/terrain (depth 4).
export const SAPO_VISUAL_DEPTH = 2.5;

/** World Y of the last opaque row of every Sapo pose (its seated baseline). */
export function getSapoBaselineY(waterlineY) {
  return Number(waterlineY) + SAPO_SUBMERGE_DEPTH;
}

/** World Y where the toxic glob leaves the open mouth. */
export function getSapoMouthY(waterlineY) {
  return getSapoBaselineY(waterlineY) - SAPO_MOUTH_HEIGHT;
}

/** Arcade body centre: the visible part of the seated body above water. */
export function getSapoBodyCenterY(waterlineY) {
  return Number(waterlineY) - SAPO_BODY_SIZE.height / 2 - 4;
}

export function getEnemyVisualAnchor(type, sprite = {}, options = {}) {
  const centerY = Number(sprite.y);
  const bodyBottom = Number(sprite.body?.bottom);
  const footAnchored = isEnemyFootAnchored(type);
  const waterlineY = Number(options.waterlineY);

  if (type === 'sapo_pota' && options.waterlineY != null && Number.isFinite(waterlineY)) {
    return {
      originY: 1,
      y: getSapoBaselineY(waterlineY) + AUTHORED_BASELINE_OFFSETS.sapo_pota,
    };
  }

  return {
    originY: footAnchored ? 1 : 0.5,
    y: footAnchored && Number.isFinite(bodyBottom)
      ? bodyBottom + (AUTHORED_BASELINE_OFFSETS[type] ?? 0)
      : (Number.isFinite(centerY) ? centerY : 0),
  };
}

export function shouldFlipEnemyVisual(type, direction) {
  if (type === 'arbol_pocho') return false;
  // The approved Sapo sheet faces left; the other directional sheets face right.
  if (type === 'sapo_pota') return Number(direction) > 0;
  return Number(direction) < 0;
}

export function getEnemyVisualTop(y, displayHeight, originY = 0.5) {
  const safeY = Number.isFinite(Number(y)) ? Number(y) : 0;
  const safeHeight = Math.max(0, Number.isFinite(Number(displayHeight)) ? Number(displayHeight) : 0);
  const safeOrigin = Math.max(0, Math.min(1, Number.isFinite(Number(originY)) ? Number(originY) : 0.5));
  return safeY - safeHeight * safeOrigin;
}
