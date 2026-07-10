import type { Bounds } from "../../types";
import type { ShaderProgram } from "./types";
import { parseColor } from "./utilsCore";

export function calculateUniforms(
  bounds: Bounds,
  invertX: boolean = false
): {
  scale: [number, number];
  translate: [number, number];
} {
  const dataWidth = bounds.xMax - bounds.xMin;
  const dataHeight = bounds.yMax - bounds.yMin;

  const scaleX = dataWidth > 0 ? (invertX ? -2 : 2) / dataWidth : 1;
  const scaleY = dataHeight > 0 ? 2 / dataHeight : 1;

  const translateX = invertX ? 1 - bounds.xMin * scaleX : -1 - bounds.xMin * scaleX;
  const translateY = -1 - bounds.yMin * scaleY;

  return {
    scale: [scaleX, scaleY],
    translate: [translateX, translateY],
  };
}

export function renderLine(
  gl: WebGLRenderingContext,
  prog: ShaderProgram,
  buffer: WebGLBuffer,
  count: number,
  uniforms: { scale: [number, number]; translate: [number, number] },
  color: [number, number, number, number],
  width: number = 1
): void {
  gl.useProgram(prog.program);
  gl.lineWidth(width);
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

  gl.drawArrays(gl.LINE_STRIP, 0, count);
  gl.disableVertexAttribArray(prog.attributes.position);
}

export function renderBand(
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

  const alpha = color[3] * 0.4;
  gl.uniform4f(prog.uniforms.uColor!, color[0], color[1], color[2], alpha);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
  gl.disableVertexAttribArray(prog.attributes.position);
}

export function renderPoints(
  gl: WebGLRenderingContext,
  prog: ShaderProgram,
  buffer: WebGLBuffer,
  count: number,
  uniforms: { scale: [number, number]; translate: [number, number] },
  color: [number, number, number, number],
  pointSize: number,
  symbol: string = "circle"
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

  if (prog.uniforms.uPointSize)
    gl.uniform1f(prog.uniforms.uPointSize, pointSize);

  if (prog.uniforms.uSymbol) {
    const symbolMap: Record<string, number> = {
      circle: 0,
      square: 1,
      diamond: 2,
      triangle: 3,
      triangleDown: 4,
      cross: 5,
      x: 6,
      star: 7,
    };
    gl.uniform1i(prog.uniforms.uSymbol, symbolMap[symbol] ?? 0);
  }

  gl.drawArrays(gl.POINTS, 0, count);
  gl.disableVertexAttribArray(prog.attributes.position);
}

export function renderErrorBars(
  gl: WebGLRenderingContext,
  prog: ShaderProgram,
  buffer: WebGLBuffer,
  count: number,
  uniforms: { scale: [number, number]; translate: [number, number] },
  color: [number, number, number, number],
  width: number = 1
): void {
  gl.useProgram(prog.program);
  gl.lineWidth(width);
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

  gl.drawArrays(gl.LINES, 0, count);
  gl.disableVertexAttribArray(prog.attributes.position);
}

export function computeSeriesColor(
  style: { color?: string; opacity?: number }
): [number, number, number, number] {
  const color = parseColor(style.color ?? "#ff0055");
  color[3] = style.opacity ?? 1;
  return color;
}
