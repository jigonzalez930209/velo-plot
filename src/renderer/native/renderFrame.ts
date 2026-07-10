import type {
  NativeRenderOptions,
  NativeSeriesRenderData,
  ProgramBundle,
} from "./types";
import {
  calculateUniforms,
  computeSeriesColor,
  renderBand,
  renderErrorBars,
  renderLine,
  renderPoints,
} from "./drawCore";
import { getFrameRenderer } from "./frameRenderRegistry";

export function renderFrame(
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  dpr: number,
  programs: ProgramBundle,
  series: NativeSeriesRenderData[],
  options: NativeRenderOptions
): void {
  const { bounds, backgroundColor = [0.1, 0.1, 0.18, 1], plotArea } = options;

  const canvasHeight = canvas.height;
  const canvasWidth = canvas.width;

  const pa = plotArea
    ? {
        x: plotArea.x * dpr,
        y: canvasHeight - (plotArea.y + plotArea.height) * dpr,
        width: plotArea.width * dpr,
        height: plotArea.height * dpr,
      }
    : {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
      };

  gl.viewport(0, 0, canvasWidth, canvasHeight);
  gl.disable(gl.SCISSOR_TEST);
  gl.clearColor(
    backgroundColor[0],
    backgroundColor[1],
    backgroundColor[2],
    backgroundColor[3]
  );
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.viewport(pa.x, pa.y, pa.width, pa.height);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(pa.x, pa.y, pa.width, pa.height);

  if (options.plotAreaBackground) {
    gl.clearColor(
      options.plotAreaBackground[0],
      options.plotAreaBackground[1],
      options.plotAreaBackground[2],
      options.plotAreaBackground[3]
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  const uniforms = calculateUniforms(bounds, options.invertX);
  const frameCtx = {
    gl,
    canvas,
    dpr,
    programs,
    options,
    bounds,
    pa,
  };

  for (const s of series) {
    if (!s.visible) continue;
    if (s.count === 0 && s.type !== "boxplot" && s.type !== "waterfall") continue;

    const yMin = s.yBounds ? s.yBounds.min : bounds.yMin;
    const yMax = s.yBounds ? s.yBounds.max : bounds.yMax;
    const yRange = yMax - yMin;

    const yScale = yRange > 0 ? 2 / yRange : 1;
    const yTrans = -1 - yMin * yScale;

    const seriesUniforms = {
      scale: [uniforms.scale[0], yScale] as [number, number],
      translate: [uniforms.translate[0], yTrans] as [number, number],
    };

    const color = computeSeriesColor(s.style);

    const extended = getFrameRenderer(s.type);
    if (extended) {
      extended(frameCtx, s, seriesUniforms, color);
    } else if (s.type === "scatter") {
      renderPoints(
        gl,
        programs.pointProgram,
        s.buffer,
        s.count,
        seriesUniforms,
        color,
        (s.style.pointSize ?? 4) * dpr,
        s.style.symbol
      );
    } else if (s.type === "line") {
      renderLine(
        gl,
        programs.lineProgram,
        s.buffer,
        s.count,
        seriesUniforms,
        color,
        (s.style.width ?? 1) * dpr
      );
    } else if (s.type === "line+scatter") {
      renderLine(
        gl,
        programs.lineProgram,
        s.buffer,
        s.count,
        seriesUniforms,
        color,
        (s.style.width ?? 1) * dpr
      );
      renderPoints(
        gl,
        programs.pointProgram,
        s.buffer,
        s.count,
        seriesUniforms,
        color,
        (s.style.pointSize ?? 4) * dpr,
        s.style.symbol
      );
    } else if (s.type === "step" || s.type === "step+scatter") {
      if (s.stepBuffer && s.stepCount) {
        renderLine(
          gl,
          programs.lineProgram,
          s.stepBuffer,
          s.stepCount,
          seriesUniforms,
          color,
          (s.style.width ?? 1) * dpr
        );
      } else {
        renderLine(
          gl,
          programs.lineProgram,
          s.buffer,
          s.count,
          seriesUniforms,
          color,
          (s.style.width ?? 1) * dpr
        );
      }

      if (s.type === "step+scatter") {
        renderPoints(
          gl,
          programs.pointProgram,
          s.buffer,
          s.count,
          seriesUniforms,
          color,
          (s.style.pointSize ?? 4) * dpr,
          s.style.symbol
        );
      }
    } else if (s.type === "band") {
      renderBand(
        gl,
        programs.lineProgram,
        s.buffer,
        s.count,
        seriesUniforms,
        color
      );
    }

    if (s.errorBuffer && s.errorCount) {
      const errStyle = s.style.errorBars || {};
      const errColor = errStyle.color
        ? computeSeriesColor({ color: errStyle.color, opacity: errStyle.opacity ?? 0.7 })
        : color;

      renderErrorBars(
        gl,
        programs.lineProgram,
        s.errorBuffer,
        s.errorCount,
        seriesUniforms,
        errColor as [number, number, number, number],
        errStyle.width ?? 1
      );
    }
  }
}
