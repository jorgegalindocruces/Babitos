export const ONE_WAY_PLATFORM_KIND = 'platform';
export const ONE_WAY_LANDING_TOLERANCE = 4;

function readData(gameObject, key) {
  if (typeof gameObject?.getData === 'function') return gameObject.getData(key);
  return gameObject?.data?.values?.[key] ?? gameObject?.data?.[key];
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isOneWayPlatform(gameObject) {
  return readData(gameObject, 'kind') === ONE_WAY_PLATFORM_KIND;
}

function previousBodyBottom(body) {
  const previousY = finiteNumber(body?.prev?.y);
  const height = finiteNumber(body?.height);
  if (previousY !== null && height !== null) return previousY + height;
  return finiteNumber(body?.bottom);
}

/**
 * Phaser Arcade process callback for semisolid elevated platforms.
 *
 * Ground (and unclassified terrain) remains solid. An elevated platform only
 * separates a moving body when it is descending from above its top edge. This
 * keeps its underside and sides traversable without changing projectile rules.
 */
export function shouldCollideWithTerrain(first, second, options = {}) {
  const firstIsOneWay = isOneWayPlatform(first);
  const secondIsOneWay = isOneWayPlatform(second);
  if (!firstIsOneWay && !secondIsOneWay) return true;

  const platform = firstIsOneWay ? first : second;
  const mover = firstIsOneWay ? second : first;
  // A body dropping through (↓) ignores the platforms it stood on until clear.
  if (options.ignore?.has?.(platform)) return false;
  const moverBody = mover?.body;
  const platformBody = platform?.body;

  // Missing physics metadata should never turn known terrain into a hole.
  if (!moverBody || !platformBody) return true;

  const velocityY = finiteNumber(moverBody.velocity?.y);
  if (velocityY === null) return true;
  if (velocityY < 0) return false;

  const previousBottom = previousBodyBottom(moverBody);
  const platformTop = finiteNumber(platformBody.top) ?? finiteNumber(platformBody.y);
  if (previousBottom === null || platformTop === null) return true;

  const requestedTolerance = finiteNumber(options.tolerance);
  const tolerance = Math.max(0, requestedTolerance ?? ONE_WAY_LANDING_TOLERANCE);
  return previousBottom <= platformTop + tolerance;
}

/**
 * One-way platforms the body is standing on: its feet rest on their top edge
 * and they overlap horizontally. Used to start a drop-through with ↓.
 */
export function findOneWayPlatformsUnder(moverBody, platforms, tolerance = 2) {
  const bottom = finiteNumber(moverBody?.bottom);
  const left = finiteNumber(moverBody?.left);
  const right = finiteNumber(moverBody?.right);
  if (bottom === null || left === null || right === null) return [];
  return (platforms ?? []).filter((platform) => {
    const body = platform?.body;
    if (!isOneWayPlatform(platform) || !body) return false;
    const top = finiteNumber(body.top) ?? finiteNumber(body.y);
    const platformLeft = finiteNumber(body.left) ?? finiteNumber(body.x);
    const platformRight = finiteNumber(body.right);
    if (top === null || platformLeft === null || platformRight === null) return false;
    return Math.abs(bottom - top) <= tolerance && right > platformLeft && left < platformRight;
  });
}

/**
 * A dropping body keeps ignoring a platform until its feet are clearly below
 * the top edge, or it no longer overlaps the platform horizontally.
 */
export function hasClearedPlatform(moverBody, platform, tolerance = ONE_WAY_LANDING_TOLERANCE) {
  const body = platform?.body;
  if (!platform?.active || !body) return true;
  const bottom = finiteNumber(moverBody?.bottom);
  const top = finiteNumber(body.top) ?? finiteNumber(body.y);
  if (bottom === null || top === null) return true;
  const left = finiteNumber(moverBody?.left);
  const right = finiteNumber(moverBody?.right);
  const outside = left !== null && right !== null
    && (right <= finiteNumber(body.left) || left >= finiteNumber(body.right));
  return outside || bottom > top + tolerance;
}
