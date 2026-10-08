function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export const TUTORIAL_SIGN_STYLE = Object.freeze({
  minBoardWidth: 128,
  maxBoardWidth: 224,
  minBoardHeight: 36,
  textPaddingX: 12,
  textPaddingY: 7,
  postHeight: 22,
  postWidth: 10,
});

/** Convert a centered level platform into horizontal bounds and its top edge. */
export function getSurfaceBounds(platform) {
  const x = finiteNumber(platform?.x);
  const y = finiteNumber(platform?.y);
  const width = finiteNumber(platform?.width);
  const height = finiteNumber(platform?.height);
  if (x === null || y === null || width === null || height === null || width <= 0 || height < 0) {
    return null;
  }

  return {
    left: x - width / 2,
    right: x + width / 2,
    surfaceY: y - height / 2,
  };
}

/**
 * Find the highest physical surface that contains the complete horizontal
 * footprint. Smaller Y values are visually higher in Phaser coordinates.
 */
export function findSupportingSurface(platforms, options = {}) {
  const x = finiteNumber(options.x);
  const width = Math.max(0, finiteNumber(options.width) ?? 0);
  const originX = Math.max(0, Math.min(1, finiteNumber(options.originX) ?? 0.5));
  if (x === null || !Array.isArray(platforms)) return null;

  const footprintLeft = x - width * originX;
  const footprintRight = x + width * (1 - originX);
  const allowedKinds = Array.isArray(options.kinds) && options.kinds.length > 0
    ? new Set(options.kinds)
    : null;

  let support = null;
  for (const platform of platforms) {
    if (allowedKinds && !allowedKinds.has(platform?.kind)) continue;
    const bounds = getSurfaceBounds(platform);
    if (!bounds || footprintLeft < bounds.left || footprintRight > bounds.right) continue;

    if (!support || bounds.surfaceY < support.surfaceY) {
      support = { platform, ...bounds };
    }
  }

  return support;
}

/** Position an object's origin so that its bottom edge rests on a surface. */
export function placeOnSurface(platforms, options = {}) {
  const x = finiteNumber(options.x);
  const height = Math.max(0, finiteNumber(options.height) ?? 0);
  const originY = Math.max(0, Math.min(1, finiteNumber(options.originY) ?? 1));
  const gap = finiteNumber(options.gap) ?? 0;
  if (x === null) return null;

  const support = findSupportingSurface(platforms, options);
  if (!support) return null;

  return {
    x,
    y: support.surfaceY - gap - height * (1 - originY),
    surfaceY: support.surfaceY,
    support,
  };
}
