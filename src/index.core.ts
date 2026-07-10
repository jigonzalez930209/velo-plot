/**
 * Velo Plot - Core Bundle
 * 
 * Minimal bundle containing only the essential features for 2D charts.
 */

// ============================================
// Core exports
// ============================================
export { createChart } from "./core/Chart";
export { Series } from "./core/Series";
export { EventEmitter } from "./core/EventEmitter";
export type { Chart, ChartOptions, ExportOptions } from "./core/Chart";

// ============================================
// Basic Types
// ============================================
export type {
    AxisOptions,
    SeriesOptions,
    SeriesData,
    SeriesStyle,
    ZoomOptions,
    Point,
    Bounds,
    Range,
    ScaleType,
    SeriesType,
} from "./types";

// ============================================
// Essential Scales
// ============================================
export { LinearScale, LogScale, createScale } from "./scales";
export type { Scale } from "./scales";

// ============================================
// Principal Renderer
// ============================================
export {
    NativeWebGLRenderer,
    parseColor,
} from "./renderer/NativeWebGLRenderer";
export {
    createRenderer,
    createNativeRenderer,
} from "./renderer/RendererInterface";
export type {
    IWebGLRenderer,
    SeriesRenderData,
    RenderOptions,
} from "./renderer/RendererInterface";

// ============================================
// Core Themes
// ============================================
export {
    DARK_THEME,
    LIGHT_THEME,
    DEFAULT_THEME,
    createTheme,
    getThemeByName,
} from "./theme";
export type { ChartTheme, GridTheme, AxisTheme } from "./theme";

// ============================================
// Plugin System (Lightweight)
// ============================================
export { createPluginContext } from "./plugins/PluginContext";
export { PluginManagerImpl } from "./plugins/PluginManager";
export {
    getPluginRegistry,
    registerPlugin,
    definePlugin,
} from "./plugins/PluginRegistry";
export { createPlugin, createConfigurablePlugin } from "./plugins/createPlugin";

export type {
    PluginManifest,
    PluginContext,
    ChartPlugin,
    PluginFactory,
    PluginManager,
} from "./plugins/types";
