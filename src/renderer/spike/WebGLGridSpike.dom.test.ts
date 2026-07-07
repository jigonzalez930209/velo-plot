/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebGLGridSpike, buildGridLineVertices } from "./WebGLGridSpike";

function createMockWebGL() {
  const state = { bufferData: vi.fn(), drawArrays: vi.fn() };
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    ARRAY_BUFFER: 0x8892,
    FLOAT: 0x1406,
    COLOR_BUFFER_BIT: 0x4000,
    LINES: 0x0001,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ""),
    deleteShader: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: state.bufferData,
    useProgram: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform2f: vi.fn(),
    uniform4f: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    lineWidth: vi.fn(),
    drawArrays: state.drawArrays,
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
  };
}

describe("WebGLGridSpike (DOM)", () => {
  beforeEach(() => {
    const gl = createMockWebGL();
    HTMLCanvasElement.prototype.getContext = vi.fn(function (
      this: HTMLCanvasElement,
      type: string,
    ) {
      if (type === "webgl") return gl as unknown as WebGLRenderingContext;
      return null;
    }) as typeof HTMLCanvasElement.prototype.getContext;
  });

  it("draw uploads vertices and returns segment count", () => {
    const canvas = document.createElement("canvas");
    const spike = new WebGLGridSpike(canvas);
    const segments = spike.draw({
      plotArea: { x: 10, y: 10, width: 200, height: 100 },
      xLines: [60, 120],
      yLines: [40],
      width: 400,
      height: 300,
      color: [1, 0, 0, 1],
      lineWidth: 2,
    });
    expect(segments).toBe(3);
    spike.destroy();
  });

  it("buildGridLineVertices handles empty line lists", () => {
    const verts = buildGridLineVertices({
      plotArea: { x: 0, y: 0, width: 100, height: 50 },
      xLines: [],
      yLines: [],
      width: 200,
      height: 100,
    });
    expect(verts.length).toBe(0);
  });

  it("throws when shader compile fails", () => {
    const gl = createMockWebGL();
    gl.getShaderParameter = vi.fn(() => false);
    gl.getShaderInfoLog = vi.fn(() => "compile error");
    HTMLCanvasElement.prototype.getContext = vi.fn(() => gl as unknown as WebGLRenderingContext);
    const canvas = document.createElement("canvas");
    expect(() => new WebGLGridSpike(canvas)).toThrow(/compile/i);
  });

  it("throws when program link fails", () => {
    const gl = createMockWebGL();
    gl.getProgramParameter = vi.fn(() => false);
    gl.getProgramInfoLog = vi.fn(() => "link error");
    HTMLCanvasElement.prototype.getContext = vi.fn(() => gl as unknown as WebGLRenderingContext);
    const canvas = document.createElement("canvas");
    expect(() => new WebGLGridSpike(canvas)).toThrow(/link/i);
  });

  it("throws when WebGL context is unavailable", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const canvas = document.createElement("canvas");
    expect(() => new WebGLGridSpike(canvas)).toThrow(/WebGL not available/i);
  });
});
