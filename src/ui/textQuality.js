export const MAX_UI_TEXT_RESOLUTION = 2;
export const TEXT_METRICS_REFRESH_EVENT = 'babitos-text-metrics-refresh';
const WIDTH_FIT_STATE = Symbol('babitos.textWidthFit');

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * Return the internal texture resolution used by every Phaser Text object.
 * Keeping this in one place prevents controls and transient UI from silently
 * falling back to Phaser's resolution 1 on high-density displays.
 */
export function getUiTextResolution(
  pixelRatio = globalThis.devicePixelRatio ?? 1,
  maxResolution = MAX_UI_TEXT_RESOLUTION,
) {
  const ratio = positiveNumber(pixelRatio, 1);
  const maximum = positiveNumber(maxResolution, MAX_UI_TEXT_RESOLUTION);
  return Math.max(1, Math.min(maximum, Math.ceil(ratio)));
}

/** Apply the shared high-density rendering policy to a Phaser Text object. */
export function configureTextQuality(textObject, options = {}) {
  if (
    !textObject
    || options.resolution === false
    || typeof textObject.setResolution !== 'function'
  ) {
    return textObject;
  }

  const requestedResolution = Number(options.resolution);
  const resolution = Number.isFinite(requestedResolution) && requestedResolution > 0
    ? requestedResolution
    : getUiTextResolution(options.pixelRatio, options.maxResolution);
  textObject.setResolution(resolution);
  return textObject;
}

/**
 * Fit a label without scaling its already-rasterized texture by a fractional
 * amount. Phaser re-renders the glyphs at an integer font size instead.
 */
export function fitTextToWidth(textObject, maxWidth, options = {}) {
  const widthLimit = Number(maxWidth);
  if (
    !textObject
    || !Number.isFinite(widthLimit)
    || widthLimit <= 0
    || !Number.isFinite(textObject.width)
    || typeof textObject.setFontSize !== 'function'
  ) {
    return textObject;
  }

  const currentSize = Number.parseFloat(textObject.style?.fontSize);
  if (!Number.isFinite(currentSize) || currentSize <= 0) return textObject;

  const minimum = Math.max(1, Math.floor(positiveNumber(options.minFontSize, 8)));
  const previousFit = textObject[WIDTH_FIT_STATE];
  textObject[WIDTH_FIT_STATE] = {
    maxWidth: widthLimit,
    minFontSize: minimum,
    originalFontSize: previousFit?.originalFontSize ?? currentSize,
  };

  if (textObject.width <= widthLimit) return textObject;

  let nextSize = Math.max(minimum, Math.floor(currentSize * (widthLimit / textObject.width)));

  textObject.setFontSize(nextSize);
  while (textObject.width > widthLimit && nextSize > minimum) {
    nextSize -= 1;
    textObject.setFontSize(nextSize);
  }

  return textObject;
}

/** Recalculate fallback metrics and width fitting after a web font arrives. */
export function refreshTextAfterFontLoad(textObject) {
  if (!textObject) return textObject;

  const fit = textObject[WIDTH_FIT_STATE];
  if (fit && typeof textObject.setFontSize === 'function') {
    textObject.setFontSize(fit.originalFontSize);
  }

  if (typeof textObject.style?.update === 'function') {
    textObject.style.update(true);
  } else if (typeof textObject.updateText === 'function') {
    textObject.updateText();
  }

  if (fit) {
    fitTextToWidth(textObject, fit.maxWidth, { minFontSize: fit.minFontSize });
  }

  textObject.emit?.(TEXT_METRICS_REFRESH_EVENT, textObject);

  return textObject;
}
