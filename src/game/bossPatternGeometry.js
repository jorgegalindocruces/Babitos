function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Place one complete, evenly-spaced volley inside the arena.
 *
 * The group is shifted as a unit near either edge. Clamping each meteor
 * independently would compress the warning gaps and make the attack unfair.
 */
export function getVolleyPositions({
  center,
  count,
  spacing,
  minX,
  maxX,
  offset = 0,
}) {
  const safeCount = Math.max(1, Math.trunc(finiteNumber(count, 1)));
  const safeSpacing = Math.max(0, finiteNumber(spacing, 0));
  const left = finiteNumber(minX, 0);
  const right = finiteNumber(maxX, left);
  if (right < left) throw new RangeError('maxX must be greater than or equal to minX.');

  const span = safeSpacing * (safeCount - 1);
  if (span > right - left) {
    throw new RangeError('The volley does not fit inside the requested bounds.');
  }

  const halfSpan = span / 2;
  const requestedCenter = finiteNumber(center, (left + right) / 2) + finiteNumber(offset, 0);
  const boundedCenter = Math.max(left + halfSpan, Math.min(right - halfSpan, requestedCenter));

  return Array.from(
    { length: safeCount },
    (_entry, index) => boundedCenter + (index - (safeCount - 1) / 2) * safeSpacing,
  );
}
