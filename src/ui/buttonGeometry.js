const finiteNonNegative = (value) => (
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
);

/**
 * Phaser normalizes pointer coordinates into a Game Object's local, origin-
 * adjusted space before running the hit-area callback. For centered
 * Containers that means the visual top-left is (0, 0), not (-width / 2,
 * -height / 2).
 */
export function getButtonHitArea(width, height, shadowOffset = 0, hitSlop = 0) {
  const slop = finiteNonNegative(hitSlop);
  const edge = slop === 0 ? 0 : -slop;
  return Object.freeze({
    x: edge,
    y: edge,
    width: finiteNonNegative(width) + slop * 2,
    height: finiteNonNegative(height) + finiteNonNegative(shadowOffset) + slop * 2,
  });
}

export function buttonHitAreaContains(area, x, y) {
  if (!area) return false;
  return x >= area.x
    && x <= area.x + area.width
    && y >= area.y
    && y <= area.y + area.height;
}
