/**
 * WebGL grid spike — batched GL_LINES renderer for axis grid lines.
 * Labels remain on Canvas 2D; this spike covers grid lines only.
 * @module renderer/spike/WebGLGridSpike
 */

export interface GridLineSpec {
  /** Plot area in CSS pixels */
  plotArea: { x: number; y: number; width: number; height: number };
  /** Pixel X positions for vertical grid lines */
  xLines: number[];
  /** Pixel Y positions for horizontal grid lines */
  yLines: number[];
  /** Canvas width (physical pixels) */
  width: number;
  /** Canvas height (physical pixels) */
  height: number;
  /** Line color RGBA 0–1 */
  color?: [number, number, number, number];
  /** Line width in pixels */
  lineWidth?: number;
}

const VERT_SRC = `
  attribute vec2 aPosition;
  uniform vec2 uResolution;
  void main() {
    vec2 clip = (aPosition / uResolution) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

/** Build interleaved [x,y] vertex pairs for GL_LINES from tick pixel positions */
export function buildGridLineVertices(spec: GridLineSpec): Float32Array {
  const { plotArea, xLines, yLines } = spec;
  const y0 = plotArea.y;
  const y1 = plotArea.y + plotArea.height;
  const x0 = plotArea.x;
  const x1 = plotArea.x + plotArea.width;

  const vertCount = (xLines.length + yLines.length) * 2;
  const out = new Float32Array(vertCount * 2);
  let o = 0;

  for (const x of xLines) {
    out[o++] = x;
    out[o++] = y0;
    out[o++] = x;
    out[o++] = y1;
  }

  for (const y of yLines) {
    out[o++] = x0;
    out[o++] = y;
    out[o++] = x1;
    out[o++] = y;
  }

  return out;
}

export class WebGLGridSpike {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private aPosition: number;
  private uResolution: WebGLUniformLocation;
  private uColor: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL not available for grid spike");

    this.gl = gl;
    this.program = createProgram(gl);
    this.aPosition = gl.getAttribLocation(this.program, "aPosition");
    this.uResolution = gl.getUniformLocation(this.program, "uResolution")!;
    this.uColor = gl.getUniformLocation(this.program, "uColor")!;

    const buf = gl.createBuffer();
    if (!buf) throw new Error("createBuffer failed");
    this.buffer = buf;
  }

  /** Upload vertices and draw grid lines */
  draw(spec: GridLineSpec): number {
    const gl = this.gl;
    const vertices = buildGridLineVertices(spec);
    const lineSegments = vertices.length / 4;

    gl.viewport(0, 0, spec.width, spec.height);
    gl.clearColor(0.04, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.uResolution, spec.width, spec.height);
    const c = spec.color ?? [0.2, 0.22, 0.3, 0.6];
    gl.uniform4f(this.uColor, c[0], c[1], c[2], c[3]);
    gl.lineWidth(spec.lineWidth ?? 1);

    gl.drawArrays(gl.LINES, 0, vertices.length / 2);
    return lineSegments;
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
  }
}
