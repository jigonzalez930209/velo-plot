/**
 * GPU Renderer Facade - Drop-in replacement for NativeWebGLRenderer
 * 
 * Provides the same interface as NativeWebGLRenderer but uses the
 * backend-agnostic GPU abstraction layer. Supports both WebGPU and WebGL.
 */

import type { GpuBackend, RGBA } from "../types";
import type { DrawList, DrawCall, PointStyle } from "../drawList";
import type { FrameUniforms } from "../frame";
import { WebGPUBackend } from "../backends/webgpu/WebGPUBackend";
import { WebGLBackend } from "../backends/webgl/WebGLBackend";
import { SeriesAdapter, parseColorToRGBA } from "./seriesAdapter";
import type { SeriesStyle } from "./seriesAdapter";
import type { NativeSeriesRenderData } from "../../renderer/native/types";

/**
 * Bounds interface matching the original
 */
export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Series render data matching NativeSeriesRenderData
 */
export interface GpuSeriesRenderData {
  id: string;
  type: "line" | "scatter" | "line+scatter" | "step" | "step+scatter" | "band" | "bar" | "heatmap";
  visible: boolean;
  style: SeriesStyle;
  
  /** Y-bounds for multi-axis support */
  yBounds?: { min: number; max: number };
  
  /** Heatmap specific */
  zBounds?: { min: number; max: number };
  colormap?: string;
}

/**
 * Render options matching NativeRenderOptions
 */
export interface GpuRenderOptions {
  bounds: Bounds;
  backgroundColor?: [number, number, number, number];
  plotArea?: { x: number; y: number; width: number; height: number };
}

export interface GpuNativeRenderOptions extends GpuRenderOptions {
  invertX?: boolean;
  plotAreaBackground?: [number, number, number, number];
  dpr?: number;
}

/**
 * Backend preference
 */
export type BackendPreference = "webgpu" | "webgl" | "auto";

/**
 * GPU Renderer options
 */
export interface GpuRendererOptions {
  backend?: BackendPreference;
  powerPreference?: "low-power" | "high-performance";
}

/**
 * GPU Renderer - Unified renderer using the GPU abstraction layer
 */
export class GpuRenderer {
  private canvas: HTMLCanvasElement;
  private options: GpuRendererOptions;
  private backend: GpuBackend | null = null;
  private adapter: SeriesAdapter | null = null;
  
  private dpr: number;
  private isInitialized = false;
  private backendType: "webgpu" | "webgl" | null = null;
  
  // Buffer management
  private bufferDataMap = new Map<string, Float32Array>();
  private stepBufferDataMap = new Map<string, Float32Array>();
  private colormapDataMap = new Map<string, Uint8Array>();
  
  constructor(canvas: HTMLCanvasElement, options: GpuRendererOptions = {}) {
    this.canvas = canvas;
    this.options = options;
    this.dpr = window.devicePixelRatio || 1;
  }
  
  /**
   * Initialize the renderer
   */
  async init(): Promise<boolean> {
    const preference = this.options.backend ?? "auto";
    
    // Try WebGPU first if preferred or auto
    if (preference === "webgpu" || preference === "auto") {
      if (WebGPUBackend.isSupported()) {
        try {
          const backend = new WebGPUBackend(this.canvas, {
            powerPreference: this.options.powerPreference ?? "high-performance",
          });
          await backend.init();
          
          this.backend = backend;
          this.backendType = "webgpu";
          this.adapter = new SeriesAdapter(backend);
          this.isInitialized = true;
          
          this.resize();
          return true;
        } catch (e) {
          console.warn("[GpuRenderer] WebGPU init failed:", e);
        }
      }
    }
    
    // Fallback to WebGL
    if (preference === "webgl" || preference === "auto") {
      if (WebGLBackend.isSupported()) {
        try {
          const backend = new WebGLBackend(this.canvas, {
            powerPreference: this.options.powerPreference ?? "high-performance",
          });
          await backend.init();
          
          this.backend = backend;
          this.backendType = "webgl";
          this.adapter = new SeriesAdapter(backend);
          this.isInitialized = true;
          
          this.resize();
          console.info("[GpuRenderer] Using WebGL backend (WebGPU not available)");
          return true;
        } catch (e) {
          console.warn("[GpuRenderer] WebGL init failed:", e);
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if renderer is available
   */
  get available(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get the active backend type
   */
  get activeBackend(): "webgpu" | "webgl" | null {
    return this.backendType;
  }
  
  /**
   * Set device pixel ratio
   */
  setDPR(dpr: number): void {
    this.dpr = dpr;
    this.resize();
  }
  
  /**
   * Check if vertex data exists for a buffer id
   */
  hasBuffer(id: string): boolean {
    return this.bufferDataMap.has(id) || this.stepBufferDataMap.has(id);
  }

  hasColormap(id: string): boolean {
    return this.colormapDataMap.has(id);
  }

  /**
   * Render from NativeWebGLRenderer-compatible series descriptors (chart integration path).
   */
  renderNativeSeries(
    series: NativeSeriesRenderData[],
    options: GpuNativeRenderOptions,
  ): void {
    if (!this.isInitialized || !this.backend) return;

    const items: DrawCall[] = [];

    for (const s of series) {
      if (!s.visible) continue;

      if (s.type === "boxplot") {
        this.appendBoxplotDraws(s, items);
        continue;
      }
      if (s.type === "waterfall") {
        this.appendWaterfallDraws(s, items);
        continue;
      }

      if (s.count === 0) continue;

      const data = this.bufferDataMap.get(s.id);
      if (!data) continue;

      this.backend.createOrUpdateBuffer(s.id, data, { usage: "vertex" });

      const baseColor = parseColorToRGBA(
        typeof s.style?.color === "string" ? s.style.color : "#00f2ff",
      );
      const opacity = s.style?.opacity ?? 1;
      const color: [number, number, number, number] = [
        baseColor[0],
        baseColor[1],
        baseColor[2],
        baseColor[3] * opacity,
      ];

      const kind = this.mapNativeDrawKind(s.type);
      const drawCall: DrawCall = {
        id: s.id,
        kind,
        bufferId: s.id,
        count: s.count,
        visible: true,
        yBounds: s.yBounds,
      };

      if (
        kind === "scatter" ||
        kind === "line+scatter" ||
        kind === "step+scatter" ||
        kind === "points"
      ) {
        drawCall.style = {
          color: color as RGBA,
          opacity,
          pointSize: s.style?.pointSize ?? 4,
          symbol: (s.style?.symbol ?? "circle") as PointStyle["symbol"],
        };
      } else if (kind === "heatmap") {
        drawCall.textureId = `${s.id}_colormap`;
        drawCall.style = {
          zBounds: s.zBounds,
          colormap: s.colormap,
        };
        const colormapData = this.colormapDataMap.get(`${s.id}_colormap`);
        if (colormapData) {
          this.backend.createOrUpdateTexture1D(drawCall.textureId, colormapData, {
            width: colormapData.length / 4,
          });
        }
      } else {
        drawCall.style = {
          color: color as RGBA,
          opacity,
          lineWidth: s.style?.width ?? s.style?.lineWidth ?? 1,
        };
      }

      if ((kind === "step" || kind === "step+scatter") && s.stepBuffer && s.stepCount) {
        const stepId = `${s.id}_step`;
        const stepData = this.stepBufferDataMap.get(stepId);
        if (stepData) {
          this.backend.createOrUpdateBuffer(stepId, stepData, { usage: "vertex" });
          drawCall.stepBufferId = stepId;
          drawCall.stepCount = s.stepCount;
        }
      }

      items.push(drawCall);
    }

    const dpr = options.dpr ?? this.dpr;
    const frame: FrameUniforms = {
      viewport: {
        width: this.canvas.clientWidth,
        height: this.canvas.clientHeight,
        dpr,
      },
      clearColor: (options.backgroundColor ?? [0.1, 0.1, 0.18, 1]) as RGBA,
      bounds: options.bounds,
      plotArea: options.plotArea,
    };

    if ("renderWithBounds" in this.backend) {
      (this.backend as GpuBackend & {
        renderWithBounds: (
          drawList: DrawList,
          frame: FrameUniforms,
          bounds: GpuRenderOptions["bounds"],
        ) => void;
      }).renderWithBounds({ items }, frame, options.bounds);
    } else {
      this.backend.render({ items }, frame);
    }
  }

  private appendBoxplotDraws(s: NativeSeriesRenderData, items: DrawCall[]): void {
    const color = this.seriesColor(s.style);
    const lineStyle = { color, opacity: s.style?.opacity ?? 1, lineWidth: s.style?.width ?? 1 };
    const fillStyle = { color, opacity: (s.style?.opacity ?? 1) * 0.85, lineWidth: 1 };

    this.pushDraw(items, `${s.id}_box_faces`, "bar", s.boxCount ?? 0, fillStyle, s.yBounds);
    this.pushDraw(items, `${s.id}_box_lines`, "line", s.boxLinesCount ?? 0, lineStyle, s.yBounds);
  }

  private appendWaterfallDraws(s: NativeSeriesRenderData, items: DrawCall[]): void {
    const style = s.style ?? {};
    const positive = this.colorFromHex(style.positiveColor ?? "#22c55e", 0.9);
    const negative = this.colorFromHex(style.negativeColor ?? "#ef4444", 0.9);
    const subtotal = this.colorFromHex(style.subtotalColor ?? "#3b82f6", 0.9);
    const connector = this.colorFromHex(style.connectorColor ?? "#64748b", 0.6);

    this.pushDraw(items, `${s.id}_wf_positive`, "bar", s.wfPositiveCount ?? 0, { color: positive, opacity: 0.9, lineWidth: 1 }, s.yBounds);
    this.pushDraw(items, `${s.id}_wf_negative`, "bar", s.wfNegativeCount ?? 0, { color: negative, opacity: 0.9, lineWidth: 1 }, s.yBounds);
    this.pushDraw(items, `${s.id}_wf_subtotal`, "bar", s.wfSubtotalCount ?? 0, { color: subtotal, opacity: 0.9, lineWidth: 1 }, s.yBounds);
    if (style.showConnectors !== false) {
      this.pushDraw(items, `${s.id}_wf_connectors`, "line", s.wfConnectorCount ?? 0, { color: connector, opacity: 0.6, lineWidth: 1 }, s.yBounds);
    }
  }

  private pushDraw(
    items: DrawCall[],
    bufferId: string,
    kind: DrawCall["kind"],
    count: number,
    style: DrawCall["style"],
    yBounds?: { min: number; max: number },
  ): void {
    if (count <= 0) return;
    const data = this.bufferDataMap.get(bufferId);
    if (!data || !this.backend) return;
    this.backend.createOrUpdateBuffer(bufferId, data, { usage: "vertex" });
    items.push({
      id: bufferId,
      kind,
      bufferId,
      count,
      visible: true,
      style,
      yBounds,
    });
  }

  private seriesColor(style: NativeSeriesRenderData["style"]): [number, number, number, number] {
    const base = parseColorToRGBA(typeof style?.color === "string" ? style.color : "#00f2ff");
    const opacity = style?.opacity ?? 1;
    return [base[0], base[1], base[2], base[3] * opacity];
  }

  private colorFromHex(hex: string, opacity: number): [number, number, number, number] {
    const c = parseColorToRGBA(hex);
    return [c[0], c[1], c[2], c[3] * opacity];
  }

  private mapNativeDrawKind(
    type: NativeSeriesRenderData["type"],
  ): DrawCall["kind"] {
    switch (type) {
      case "scatter":
        return "scatter";
      case "line+scatter":
        return "line+scatter";
      case "step":
        return "step";
      case "step+scatter":
        return "step+scatter";
      case "band":
        return "band";
      case "bar":
        return "bar";
      case "heatmap":
        return "heatmap";
      default:
        return "line";
    }
  }

  /**
   * Create or update a buffer
   */
  createBuffer(id: string, data: Float32Array): void {
    this.bufferDataMap.set(id, data);
  }
  
  /**
   * Update a buffer partially
   */
  updateBuffer(id: string, data: Float32Array, offsetInBytes: number): boolean {
    const existing = this.bufferDataMap.get(id);
    if (!existing) return false;
    
    const offsetFloats = offsetInBytes / 4;
    existing.set(data, offsetFloats);
    return true;
  }
  
  /**
   * Get a buffer's data
   */
  getBuffer(id: string): Float32Array | undefined {
    return this.bufferDataMap.get(id);
  }
  
  /**
   * Delete a buffer
   */
  deleteBuffer(id: string): void {
    this.bufferDataMap.delete(id);
    if (this.backend) {
      this.backend.deleteBuffer(id);
    }
  }
  
  /**
   * Create or update a step buffer
   */
  createStepBuffer(id: string, data: Float32Array): void {
    this.stepBufferDataMap.set(id, data);
  }
  
  /**
   * Create colormap texture
   */
  createColormapTexture(id: string, data: Uint8Array): void {
    this.colormapDataMap.set(id, data);
    if (this.backend) {
      this.backend.createOrUpdateTexture1D(id, data, {
        width: data.length / 4,
      });
    }
  }
  
  /**
   * Render a frame
   */
  render(series: GpuSeriesRenderData[], options: GpuRenderOptions): void {
    if (!this.isInitialized || !this.backend) return;
    
    // Build draw list
    const drawList = this.buildDrawList(series);
    
    // Create frame uniforms
    const frame: FrameUniforms = {
      viewport: {
        width: this.canvas.clientWidth,
        height: this.canvas.clientHeight,
        dpr: this.dpr,
      },
      clearColor: (options.backgroundColor ?? [0.1, 0.1, 0.18, 1]) as RGBA,
      bounds: options.bounds,
      plotArea: options.plotArea,
    };
    
    // Render using the backend
    if ("renderWithBounds" in this.backend) {
      (this.backend as any).renderWithBounds(drawList, frame, options.bounds);
    } else {
      this.backend.render(drawList, frame);
    }
  }
  
  /**
   * Build draw list from series data
   */
  private buildDrawList(series: GpuSeriesRenderData[]): DrawList {
    const items: DrawCall[] = [];
    
    for (const s of series) {
      const bufferData = this.bufferDataMap.get(s.id);
      if (!bufferData) continue;
      
      // Upload buffer to GPU
      this.backend!.createOrUpdateBuffer(s.id, bufferData, { usage: "vertex" });
      
      const pointCount = s.type === "heatmap" 
        ? bufferData.length / 3 
        : bufferData.length / 2;
      
      const baseColor = parseColorToRGBA(s.style.color);
      const opacity = s.style.opacity ?? 1;
      const color: [number, number, number, number] = [
        baseColor[0], 
        baseColor[1], 
        baseColor[2], 
        baseColor[3] * opacity
      ];
      
      const drawCall: DrawCall = {
        id: s.id,
        kind: s.type,
        bufferId: s.id,
        count: pointCount,
        visible: s.visible,
        yBounds: s.yBounds,
      };
      
      // Set style based on type
      if (s.type === "scatter" || s.type === "line+scatter" || s.type === "step+scatter") {
        drawCall.style = {
          color: color as RGBA,
          opacity,
          pointSize: s.style.pointSize ?? 4,
          symbol: (s.style.symbol ?? "circle") as PointStyle["symbol"],
        };
      } else if (s.type === "heatmap") {
        drawCall.textureId = `colormap:${s.id}`;
        drawCall.style = {
          zBounds: s.zBounds,
          colormap: s.colormap,
        };
        
        // Upload colormap if available
        const colormapData = this.colormapDataMap.get(s.id);
        if (colormapData) {
          this.backend!.createOrUpdateTexture1D(drawCall.textureId, colormapData, {
            width: colormapData.length / 4,
          });
        }
      } else {
        drawCall.style = {
          color: color as RGBA,
          opacity,
          lineWidth: s.style.lineWidth ?? 1,
        };
      }
      
      // Handle step buffer
      if ((s.type === "step" || s.type === "step+scatter") && this.stepBufferDataMap.has(s.id)) {
        const stepData = this.stepBufferDataMap.get(s.id)!;
        const stepBufferId = `${s.id}:step`;
        this.backend!.createOrUpdateBuffer(stepBufferId, stepData, { usage: "vertex" });
        drawCall.stepBufferId = stepBufferId;
        drawCall.stepCount = stepData.length / 2;
      }
      
      items.push(drawCall);
    }
    
    return { items };
  }
  
  /**
   * Handle canvas resize
   */
  resize(): void {
    if (!this.backend) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.backend.setViewport({
      width: rect.width,
      height: rect.height,
      dpr: this.dpr,
    });
  }
  
  /**
   * Get renderer limits
   */
  getLimits(): Record<string, unknown> {
    return {
      backend: this.backendType,
      available: this.isInitialized,
    };
  }
  
  /**
   * Destroy the renderer
   */
  destroy(): void {
    this.adapter?.destroy();
    this.backend?.destroy();
    
    this.bufferDataMap.clear();
    this.stepBufferDataMap.clear();
    this.colormapDataMap.clear();
    
    this.adapter = null;
    this.backend = null;
    this.isInitialized = false;
    this.backendType = null;
  }
}

/**
 * Create a GPU renderer (async)
 */
export async function createGpuRenderer(
  canvas: HTMLCanvasElement,
  options?: GpuRendererOptions
): Promise<GpuRenderer | null> {
  const renderer = new GpuRenderer(canvas, options);
  const success = await renderer.init();
  return success ? renderer : null;
}
