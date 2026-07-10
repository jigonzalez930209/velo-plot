import type { NativeSeriesRenderData, ProgramBundle } from "./types";
import type { NativeRenderOptions } from "./types";

export interface FrameRenderContext {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  dpr: number;
  programs: ProgramBundle;
  options: NativeRenderOptions;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  pa: { x: number; y: number; width: number; height: number };
}

export type ExtendedFrameRenderer = (
  ctx: FrameRenderContext,
  s: NativeSeriesRenderData,
  seriesUniforms: { scale: [number, number]; translate: [number, number] },
  color: [number, number, number, number],
) => void;

const extendedRenderers = new Map<string, ExtendedFrameRenderer>();

export function registerFrameRenderer(
  type: string,
  fn: ExtendedFrameRenderer,
): void {
  extendedRenderers.set(type, fn);
}

export function getFrameRenderer(
  type: string,
): ExtendedFrameRenderer | undefined {
  return extendedRenderers.get(type);
}
