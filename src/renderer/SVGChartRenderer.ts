/**
 * No-op series renderer — vector output is produced by the SVG export pipeline each frame.
 */
export class SVGChartRenderer {
  readonly backend = "svg" as const;

  setDPR(_dpr: number): void {}

  resize(): void {}

  render(): void {}

  createBuffer(_id: string, _data: Float32Array): void {}

  updateBuffer(_id: string, _data: Float32Array, _offsetInBytes?: number): boolean {
    return false;
  }

  getBuffer(_id: string): WebGLBuffer | undefined {
    return undefined;
  }

  getTexture(_id: string): WebGLTexture | undefined {
    return undefined;
  }

  deleteBuffer(_id: string): void {}

  destroy(): void {}
}
