import type { ShaderProgram } from "./types";
import { computeSeriesColor } from "./drawCore";

export function renderHeatmap(
  gl: WebGLRenderingContext,
  prog: ShaderProgram,
  buffer: WebGLBuffer,
  count: number,
  uniforms: { scale: [number, number]; translate: [number, number] },
  zBounds: { min: number; max: number } = { min: 0, max: 1 },
  texture?: WebGLTexture
): void {
  gl.useProgram(prog.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.enableVertexAttribArray(prog.attributes.position);
  gl.vertexAttribPointer(prog.attributes.position, 2, gl.FLOAT, false, 12, 0);

  if (prog.attributes.value !== undefined && prog.attributes.value !== -1) {
    gl.enableVertexAttribArray(prog.attributes.value);
    gl.vertexAttribPointer(prog.attributes.value, 1, gl.FLOAT, false, 12, 8);
  }

  gl.uniform2f(prog.uniforms.uScale, uniforms.scale[0], uniforms.scale[1]);
  gl.uniform2f(
    prog.uniforms.uTranslate,
    uniforms.translate[0],
    uniforms.translate[1]
  );

  if (prog.uniforms.uMinValue)
    gl.uniform1f(prog.uniforms.uMinValue, zBounds.min);
  if (prog.uniforms.uMaxValue)
    gl.uniform1f(prog.uniforms.uMaxValue, zBounds.max);

  if (texture && prog.uniforms.uColormap) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(prog.uniforms.uColormap, 0);
  } else if (prog.uniforms.uColormap) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  gl.drawArrays(gl.TRIANGLES, 0, count);

  gl.disableVertexAttribArray(prog.attributes.position);
  if (prog.attributes.value !== undefined && prog.attributes.value !== -1) {
    gl.disableVertexAttribArray(prog.attributes.value);
  }
}

export function renderBar(
  gl: WebGLRenderingContext,
  prog: ShaderProgram,
  buffer: WebGLBuffer,
  count: number,
  uniforms: { scale: [number, number]; translate: [number, number] },
  color: [number, number, number, number]
): void {
  gl.useProgram(prog.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(prog.attributes.position);
  gl.vertexAttribPointer(prog.attributes.position, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(prog.uniforms.uScale, uniforms.scale[0], uniforms.scale[1]);
  gl.uniform2f(
    prog.uniforms.uTranslate,
    uniforms.translate[0],
    uniforms.translate[1]
  );
  gl.uniform4f(prog.uniforms.uColor!, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, count);
  gl.disableVertexAttribArray(prog.attributes.position);
}

export function renderBoxPlot(
  gl: WebGLRenderingContext,
  programs: { line: ShaderProgram; point: ShaderProgram },
  data: {
    boxBuffer: WebGLBuffer;
    boxCount: number;
    linesBuffer: WebGLBuffer;
    linesCount: number;
  },
  uniforms: { scale: [number, number]; translate: [number, number] },
  style: { color?: string; opacity?: number; width?: number }
): void {
  const color = computeSeriesColor(style);

  gl.useProgram(programs.line.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, data.boxBuffer);
  gl.enableVertexAttribArray(programs.line.attributes.position);
  gl.vertexAttribPointer(programs.line.attributes.position, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(programs.line.uniforms.uScale, uniforms.scale[0], uniforms.scale[1]);
  gl.uniform2f(
    programs.line.uniforms.uTranslate,
    uniforms.translate[0],
    uniforms.translate[1]
  );

  const fillColor = [...color] as [number, number, number, number];
  fillColor[3] *= 0.5;
  gl.uniform4f(programs.line.uniforms.uColor!, fillColor[0], fillColor[1], fillColor[2], fillColor[3]);

  gl.drawArrays(gl.TRIANGLES, 0, data.boxCount);

  gl.uniform4f(programs.line.uniforms.uColor!, color[0], color[1], color[2], color[3]);
  gl.lineWidth(style.width || 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, data.linesBuffer);
  gl.vertexAttribPointer(programs.line.attributes.position, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.LINES, 0, data.linesCount);

  gl.disableVertexAttribArray(programs.line.attributes.position);
}
