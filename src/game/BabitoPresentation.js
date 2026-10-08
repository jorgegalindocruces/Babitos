export const BABITO_BASELINE = 20;

// Each 64 px animation cell still resolves to an integer display size:
// 64 px, 80 px and 96 px respectively.
export const BABITO_SIZE_SCALES = Object.freeze({
  small: 1,
  normal: 1.25,
  large: 1.5,
});

export function getBabitoBaselineOffset(scale = 1, baseline = BABITO_BASELINE) {
  const numericScale = Number(scale);
  const safeScale = Number.isFinite(numericScale) && numericScale > 0 ? numericScale : 1;
  const numericBaseline = Number(baseline);
  const safeBaseline = Number.isFinite(numericBaseline) ? numericBaseline : BABITO_BASELINE;
  return (safeBaseline / safeScale) - safeBaseline;
}
