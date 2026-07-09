/**
 * PluginReplay — bar-by-bar playback (Stage 2.17 MVP).
 */

import type { ChartPlugin, PluginContext, PluginManifest } from "../types";

export interface PluginReplayConfig {
  /** Series id to replay */
  seriesId: string;
  /** Milliseconds between frames at 1x speed */
  frameMs?: number;
}

export interface ReplayAPI {
  play(speed?: number): void;
  pause(): void;
  step(count?: number): void;
  seek(index: number): void;
  getIndex(): number;
  getLength(): number;
  isPlaying(): boolean;
}

const manifest: PluginManifest = {
  name: "velo-plot-replay",
  version: "1.0.0",
  description: "Bar-by-bar chart replay with speed control",
  provides: ["replay"],
  tags: ["replay", "trading"],
};

interface ReplayBuffer {
  x: Float32Array;
  open?: Float32Array;
  high?: Float32Array;
  low?: Float32Array;
  close?: Float32Array;
  y?: Float32Array;
}

export function PluginReplay(config: PluginReplayConfig): ChartPlugin<PluginReplayConfig> {
  let ctx: PluginContext | null = null;
  let buffer: ReplayBuffer | null = null;
  let index = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let speed = 1;
  const frameMs = config.frameMs ?? 250;

  function applyWindow(end: number): void {
    const n = Math.min(end + 1, buffer!.x.length);
    const slice = (arr?: Float32Array) => (arr ? arr.subarray(0, n) : undefined);
    ctx.chart.updateSeries(config.seriesId, {
      x: slice(buffer.x)!,
      y: slice(buffer.y),
      open: slice(buffer.open),
      high: slice(buffer.high),
      low: slice(buffer.low),
      close: slice(buffer.close),
    });
  }

  const api: ReplayAPI & Record<string, unknown> = {
    play(s = 1) {
      if (!buffer) return;
      speed = Math.max(0.1, s);
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (!ctx || !buffer) {
          api.pause();
          return;
        }
        if (index >= buffer.x.length - 1) {
          api.pause();
          return;
        }
        index++;
        applyWindow(index);
      }, frameMs / speed);
    },
    pause() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    step(count = 1) {
      if (!buffer) return;
      index = Math.min(buffer.x.length - 1, index + count);
      applyWindow(index);
    },
    seek(i) {
      if (!buffer) return;
      index = Math.max(0, Math.min(buffer.x.length - 1, i));
      applyWindow(index);
    },
    getIndex() {
      return index;
    },
    getLength() {
      return buffer?.x.length ?? 0;
    },
    isPlaying() {
      return timer != null;
    },
  };

  return {
    manifest,
    api,
    onInit(pluginCtx) {
      ctx = pluginCtx;
      const series = ctx.chart.getSeries(config.seriesId);
      if (!series) {
        console.warn(`[PluginReplay] Series "${config.seriesId}" not found`);
        return;
      }
      const d = series.getData();
      buffer = {
        x: Float32Array.from(d.x),
        y: d.y ? Float32Array.from(d.y) : undefined,
        open: d.open ? Float32Array.from(d.open) : undefined,
        high: d.high ? Float32Array.from(d.high) : undefined,
        low: d.low ? Float32Array.from(d.low) : undefined,
        close: d.close ? Float32Array.from(d.close) : undefined,
      };
      index = Math.max(0, buffer.x.length - 1);
    },
    onDestroy() {
      api.pause();
      ctx = null;
      buffer = null;
    },
  };
}

export default PluginReplay;
