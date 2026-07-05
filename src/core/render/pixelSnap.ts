/**
 * Canvas pixel-alignment helpers for crisp 1px lines and sharper text.
 * Coordinates are in CSS/logical space (before or after setTransform(dpr)).
 */

/** Snap a coordinate to the center of a physical pixel (crisp 1px strokes). */
export function snapLineCoord(value: number): number {
  return Math.floor(value) + 0.5;
}

/** Snap label positions to whole pixels (reduces sub-pixel blur on fillText). */
export function snapLabelCoord(value: number): number {
  return Math.round(value);
}
