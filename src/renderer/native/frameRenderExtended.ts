import { parseColor } from "./utilsCore";
import { renderBar, renderBoxPlot, renderHeatmap } from "./drawExtended";
import { registerFrameRenderer } from "./frameRenderRegistry";
import type { FrameRenderContext } from "./frameRenderRegistry";
import type { NativeSeriesRenderData } from "./types";

function renderHeatmapSeries(
  ctx: FrameRenderContext,
  s: NativeSeriesRenderData,
  seriesUniforms: { scale: [number, number]; translate: [number, number] },
): void {
  renderHeatmap(
    ctx.gl,
    ctx.programs.heatmapProgram,
    s.buffer,
    s.count,
    seriesUniforms,
    s.zBounds,
    s.colormapTexture,
  );
}

function renderBarSeries(
  ctx: FrameRenderContext,
  s: NativeSeriesRenderData,
  seriesUniforms: { scale: [number, number]; translate: [number, number] },
  color: [number, number, number, number],
): void {
  renderBar(
    ctx.gl,
    ctx.programs.lineProgram,
    s.buffer,
    s.count,
    seriesUniforms,
    color,
  );
}

function renderBoxplotSeries(
  ctx: FrameRenderContext,
  s: NativeSeriesRenderData,
  seriesUniforms: { scale: [number, number]; translate: [number, number] },
): void {
  if (s.boxBuffer && s.boxLinesBuffer) {
    renderBoxPlot(
      ctx.gl,
      { line: ctx.programs.lineProgram, point: ctx.programs.pointProgram },
      {
        boxBuffer: s.boxBuffer,
        boxCount: s.boxCount || 0,
        linesBuffer: s.boxLinesBuffer,
        linesCount: s.boxLinesCount || 0,
      },
      seriesUniforms,
      s.style,
    );
  }
}

function renderWaterfallSeries(
  ctx: FrameRenderContext,
  s: NativeSeriesRenderData,
  seriesUniforms: { scale: [number, number]; translate: [number, number] },
): void {
  const { gl, programs, dpr } = ctx;
  const positiveColor = parseColor(s.style.positiveColor || "#22c55e");
  const negativeColor = parseColor(s.style.negativeColor || "#ef4444");
  const subtotalColor = parseColor(s.style.subtotalColor || "#3b82f6");
  const connectorColor = parseColor(s.style.connectorColor || "#64748b");

  if (s.wfPositiveBuffer && s.wfPositiveCount && s.wfPositiveCount > 0) {
    gl.useProgram(programs.lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.wfPositiveBuffer);
    gl.enableVertexAttribArray(programs.lineProgram.attributes.position);
    gl.vertexAttribPointer(
      programs.lineProgram.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uScale,
      seriesUniforms.scale[0],
      seriesUniforms.scale[1],
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uTranslate,
      seriesUniforms.translate[0],
      seriesUniforms.translate[1],
    );
    gl.uniform4f(
      programs.lineProgram.uniforms.uColor!,
      positiveColor[0],
      positiveColor[1],
      positiveColor[2],
      0.9,
    );
    gl.drawArrays(gl.TRIANGLES, 0, s.wfPositiveCount);
  }

  if (s.wfNegativeBuffer && s.wfNegativeCount && s.wfNegativeCount > 0) {
    gl.useProgram(programs.lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.wfNegativeBuffer);
    gl.enableVertexAttribArray(programs.lineProgram.attributes.position);
    gl.vertexAttribPointer(
      programs.lineProgram.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uScale,
      seriesUniforms.scale[0],
      seriesUniforms.scale[1],
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uTranslate,
      seriesUniforms.translate[0],
      seriesUniforms.translate[1],
    );
    gl.uniform4f(
      programs.lineProgram.uniforms.uColor!,
      negativeColor[0],
      negativeColor[1],
      negativeColor[2],
      0.9,
    );
    gl.drawArrays(gl.TRIANGLES, 0, s.wfNegativeCount);
  }

  if (s.wfSubtotalBuffer && s.wfSubtotalCount && s.wfSubtotalCount > 0) {
    gl.useProgram(programs.lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.wfSubtotalBuffer);
    gl.enableVertexAttribArray(programs.lineProgram.attributes.position);
    gl.vertexAttribPointer(
      programs.lineProgram.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uScale,
      seriesUniforms.scale[0],
      seriesUniforms.scale[1],
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uTranslate,
      seriesUniforms.translate[0],
      seriesUniforms.translate[1],
    );
    gl.uniform4f(
      programs.lineProgram.uniforms.uColor!,
      subtotalColor[0],
      subtotalColor[1],
      subtotalColor[2],
      0.9,
    );
    gl.drawArrays(gl.TRIANGLES, 0, s.wfSubtotalCount);
  }

  if (
    s.style.showConnectors !== false &&
    s.wfConnectorBuffer &&
    s.wfConnectorCount &&
    s.wfConnectorCount > 0
  ) {
    gl.useProgram(programs.lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.wfConnectorBuffer);
    gl.enableVertexAttribArray(programs.lineProgram.attributes.position);
    gl.vertexAttribPointer(
      programs.lineProgram.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uScale,
      seriesUniforms.scale[0],
      seriesUniforms.scale[1],
    );
    gl.uniform2f(
      programs.lineProgram.uniforms.uTranslate,
      seriesUniforms.translate[0],
      seriesUniforms.translate[1],
    );
    gl.uniform4f(
      programs.lineProgram.uniforms.uColor!,
      connectorColor[0],
      connectorColor[1],
      connectorColor[2],
      0.6,
    );
    gl.lineWidth(1);
    gl.drawArrays(gl.LINES, 0, s.wfConnectorCount);
  }

  gl.disableVertexAttribArray(programs.lineProgram.attributes.position);
  void dpr;
}

let registered = false;

export function registerExtendedFrameRenderers(): void {
  if (registered) return;
  registered = true;

  registerFrameRenderer("heatmap", (ctx, s, uniforms) =>
    renderHeatmapSeries(ctx, s, uniforms),
  );
  registerFrameRenderer("bar", (ctx, s, uniforms, color) =>
    renderBarSeries(ctx, s, uniforms, color),
  );
  registerFrameRenderer("boxplot", (ctx, s, uniforms) =>
    renderBoxplotSeries(ctx, s, uniforms),
  );
  registerFrameRenderer("waterfall", (ctx, s, uniforms) =>
    renderWaterfallSeries(ctx, s, uniforms),
  );
}
