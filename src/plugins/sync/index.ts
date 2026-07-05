/**
 * SciPlot Engine - Chart Sync Plugin
 * 
 * Provides synchronization between multiple chart instances.
 * 
 * @module plugins/sync
 */

export * from "../../core/sync";

import type { PluginManifest, ChartPlugin, PluginContext } from "../types";

export interface PluginSyncConfig {
    /** Group ID to join */
    groupId?: string;
    /** Sync axes: 'x' | 'y' | 'both' */
    syncAxes?: "x" | "y" | "both";
}

const manifestSync: PluginManifest = {
    name: "velo-plot-sync",
    version: "1.0.0",
    description: "Multi-chart synchronization for velo-plot",
    provides: ["interaction"],
    tags: ["sync", "multi-chart", "coordination"],
};

/**
 * SciPlot Sync Plugin
 *
 * @deprecated Use `ChartGroup` / `createChartGroup` from `velo-plot` (or `velo-plot/full`) instead.
 * This plugin stub does not perform synchronization. Kept for backward-compatible imports only.
 */
export function PluginSync(config: PluginSyncConfig = {}): ChartPlugin<PluginSyncConfig> {
  void config;
  return {
    manifest: manifestSync,

    onInit(_ctx: PluginContext) {
      console.warn(
        "[PluginSync] Deprecated: use ChartGroup / createChartGroup from the core sync module instead.",
      );
    },

    onDestroy(_ctx: PluginContext) {
    },
  };
}

export default PluginSync;
