/**
 * Sci Plot - Keyboard Shortcuts Plugin
 */

import { KeyBindingManager, DEFAULT_KEY_BINDINGS } from "../../core/keybindings";
import type { KeyBinding, KeyBindingManagerOptions } from "../../core/keybindings";
import type { PluginManifest, ChartPlugin, PluginContext } from "../types";

export interface PluginKeyboardConfig extends Partial<KeyBindingManagerOptions> {
  extraShortcuts?: KeyBinding[];
}

const manifestKeyboard: PluginManifest = {
  name: "velo-plot-keyboard",
  version: "1.0.0",
  description: "Keyboard shortcut management for velo-plot",
  provides: ["interaction"],
  tags: ["keyboard", "shortcuts", "interaction", "accessibility"],
};

export function PluginKeyboard(config: PluginKeyboardConfig = {}): ChartPlugin<PluginKeyboardConfig> {
  let manager: KeyBindingManager | null = null;

  return {
    manifest: manifestKeyboard,

    onInit(ctx: PluginContext) {
      const chart = ctx.chart as any;
      const drawing = ctx.getPlugin?.("velo-plot-drawing-tools") as { api?: { undo?: () => boolean; redo?: () => boolean } } | undefined;

      manager = new KeyBindingManager({
        target: ctx.ui.container,
        bindings: [...(config.bindings ?? []), ...(config.extraShortcuts ?? [])],
        replaceDefaults: config.replaceDefaults,
        callbacks: {
          onResetZoom: () => chart.resetZoom?.(),
          onAutoScale: () => chart.autoScale?.(false),
          onEscape: () => chart.clearSelection?.(),
          onExportImage: () => {
            try {
              const url = chart.exportImage?.("png");
              if (url) {
                const a = document.createElement("a");
                a.href = url;
                a.download = "chart.png";
                a.click();
              }
            } catch {
              /* ignore */
            }
          },
          onUndo: () => drawing?.api?.undo?.(),
          onRedo: () => drawing?.api?.redo?.(),
          ...config.callbacks,
        },
      });
    },

    onDestroy() {
      manager?.destroy();
      manager = null;
    },
  };
}

export { KeyBindingManager, DEFAULT_KEY_BINDINGS };
export default PluginKeyboard;
