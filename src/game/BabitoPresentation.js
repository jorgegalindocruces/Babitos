export const BABITO_BASELINE = 20;
export const BABITO_ART_BASELINE = 30;

// The anatomy sheets size Babitos 32, 48 and 64 px (2/3, 1 and 4/3). The
// nearest whole-pixel cells are 54, 80 and 106 px; normal still renders
// source pixels 1:1 without shimmer.
export const BABITO_SIZE_SCALES = Object.freeze({
  small: 0.675,
  normal: 1,
  large: 1.325,
});

export function getBabitoBaselineOffset(
  scale = 1,
  baseline = BABITO_BASELINE,
  artBaseline = BABITO_ART_BASELINE,
) {
  const numericScale = Number(scale);
  const safeScale = Number.isFinite(numericScale) && numericScale > 0 ? numericScale : 1;
  const numericBaseline = Number(baseline);
  const safeBaseline = Number.isFinite(numericBaseline) ? numericBaseline : BABITO_BASELINE;
  const numericArtBaseline = Number(artBaseline);
  const safeArtBaseline = Number.isFinite(numericArtBaseline)
    ? numericArtBaseline
    : BABITO_ART_BASELINE;
  return (safeBaseline / safeScale) - safeArtBaseline;
}
