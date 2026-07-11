import type { Component } from 'vue'
import ChartDemo from '../../ChartDemo.vue'
import WaterfallDemo from '../WaterfallDemo.vue'
import PolarChartDemo from '../PolarChartDemo.vue'
import InvertedAxisDemo from '../InvertedAxisDemo.vue'
import RadarDemo from '../RadarDemo.vue'
import ProcessMonitoringDemo from '../2d/ProcessMonitoringDemo.vue'
import ContourDemo from '../ContourDemo.vue'
import PaneStackDemo from '../PaneStackDemo.vue'
import AnalysisAdvancedChart from '../../components/charts/AnalysisAdvancedChart.vue'
import SineWavesChart from '../../components/charts/SineWavesChart.vue'
import SquareWavesChart from '../../components/charts/SquareWavesChart.vue'
import TriangleWavesChart from '../../components/charts/TriangleWavesChart.vue'
import ComplexFFTDemo from '../../components/charts/ComplexFFTDemo.vue'
import SingleFreqFilterDemo from '../2d/SingleFreqFilterDemo.vue'
import RegressionDemo from '../RegressionDemo.vue'
import MLIntegrationDemo from '../MLIntegrationDemo.vue'
import ScientificDemo from '../ScientificDemo.vue'
import ForecastingDemo from '../ForecastingDemo.vue'
import ChartSyncDemo from '../ChartSyncDemo.vue'
import ThemeEditorDemo from '../ThemeEditorDemo.vue'
import WaveformsDemo from '../WaveformsDemo.vue'
import BackpressureDemo from '../BackpressureDemo.vue'
import I18nDemo from '../I18nDemo.vue'
import SnapshotDemo from '../SnapshotDemo.vue'
import DataExportDemo from '../DataExportDemo.vue'
import VideoRecorderDemo from '../VideoRecorderDemo.vue'
import ContextMenuDemo from '../ContextMenuDemo.vue'
import AnomalyDetectionDemo from '../AnomalyDetectionDemo.vue'
import LaTeXDemo from '../LaTeXDemo.vue'
import DragEditDemo from '../DragEditDemo.vue'
import CachingDemo from '../CachingDemo.vue'
import LazyLoadDemo from '../LazyLoadDemo.vue'
import RoiDemo from '../RoiDemo.vue'
import OffscreenDemo from '../OffscreenDemo.vue'
import BrokenAxisDemo from '../BrokenAxisDemo.vue'
import VirtualizationDemo from '../VirtualizationDemo.vue'
import PatternRecognitionDemo from '../PatternRecognitionDemo.vue'
import IndicatorsDemo from '../IndicatorsDemo.vue'
import TradingDashboardDemo from '../trading/TradingDashboardDemo.vue'
import TradingSessionDemo from '../trading/TradingSessionDemo.vue'
import TradingIndicatorsDemo from '../trading/TradingIndicatorsDemo.vue'
import TradingDrawingToolsDemo from '../trading/TradingDrawingToolsDemo.vue'
import TradingHeikinAshiDemo from '../trading/TradingHeikinAshiDemo.vue'
import TradingHollowCandlesDemo from '../trading/TradingHollowCandlesDemo.vue'
import TradingMarkersPositionsDemo from '../trading/TradingMarkersPositionsDemo.vue'
import TradingAlertsDemo from '../trading/TradingAlertsDemo.vue'
import TradingReplayDemo from '../trading/TradingReplayDemo.vue'
import TradingDatafeedDemo from '../trading/TradingDatafeedDemo.vue'
import { SVG_SERIES_DEMOS } from './seriesDemoData'

export type SvgMirrorCategory =
  | 'fundamental'
  | 'trading'
  | 'scientific'
  | 'analysis'
  | 'performance'
  | 'interaction'
  | 'dx'
  | 'series'

export type SvgMirrorStatus = 'svg' | 'svg-lite' | 'webgl-only'

export type SvgMirrorKind = 'chart-demo' | 'series-type' | 'component'

export interface SvgMirrorEntry {
  id: string
  title: string
  description?: string
  category: SvgMirrorCategory
  status: SvgMirrorStatus
  kind: SvgMirrorKind
  canvasExample?: string
  chartDemoType?: string
  seriesDemoId?: string
  component?: Component
  componentProps?: Record<string, unknown>
  liteNote?: string
  webglNote?: string
}

export const SVG_MIRROR_CATEGORIES: { id: SvgMirrorCategory; label: string }[] = [
  { id: 'fundamental', label: 'Fundamental Charts' },
  { id: 'trading', label: 'Trading Experience' },
  { id: 'scientific', label: 'Scientific & Specialized' },
  { id: 'analysis', label: 'Advanced Analysis' },
  { id: 'performance', label: 'Performance (SVG lite)' },
  { id: 'interaction', label: 'Interaction & UI' },
  { id: 'dx', label: 'Developer Experience' },
  { id: 'series', label: 'All Series Types' },
]

function chartEntry(
  id: string,
  title: string,
  type: string,
  category: SvgMirrorCategory,
  canvasExample: string,
  description?: string,
  extra?: Partial<SvgMirrorEntry>,
): SvgMirrorEntry {
  return {
    id,
    title,
    description,
    category,
    status: 'svg',
    kind: 'chart-demo',
    chartDemoType: type,
    component: ChartDemo,
    canvasExample,
    ...extra,
  }
}

function componentEntry(
  id: string,
  title: string,
  component: Component,
  category: SvgMirrorCategory,
  canvasExample: string,
  description?: string,
  extra?: Partial<SvgMirrorEntry>,
): SvgMirrorEntry {
  return {
    id,
    title,
    description,
    category,
    status: 'svg',
    kind: 'component',
    component,
    canvasExample,
    ...extra,
  }
}

const FUNDAMENTAL: SvgMirrorEntry[] = [
  chartEntry('basic', 'Basic Chart', 'basic', 'fundamental', '/examples/basic', 'Line chart with 10K points'),
  chartEntry('area', 'Area Charts', 'area', 'fundamental', '/examples/area-charts'),
  chartEntry('bar', 'Bar Charts', 'bar', 'fundamental', '/examples/bar-charts'),
  componentEntry('waterfall', 'Waterfall Chart', WaterfallDemo, 'fundamental', '/examples/waterfall-chart'),
  chartEntry('step', 'Step Charts', 'step', 'fundamental', '/examples/step-charts'),
  chartEntry('stacked', 'Stacked Charts', 'stacked', 'fundamental', '/examples/stacked-charts'),
  chartEntry('multi-axis', 'Multiple Y-Axes', 'multi-axis', 'fundamental', '/examples/multiple-y-axes'),
]

const TRADING: SvgMirrorEntry[] = [
  componentEntry('trading-dashboard', 'Trading Dashboard', TradingDashboardDemo, 'trading', '/examples/trading/dashboard'),
  componentEntry('trading-session', 'Session Time Scale', TradingSessionDemo, 'trading', '/examples/trading/session'),
  componentEntry('trading-indicators', 'addIndicator()', TradingIndicatorsDemo, 'trading', '/examples/trading/indicators'),
  componentEntry('trading-drawing-tools', 'Drawing Tools', TradingDrawingToolsDemo, 'trading', '/examples/trading/drawing-tools'),
  componentEntry('trading-heikin-ashi', 'Heikin-Ashi', TradingHeikinAshiDemo, 'trading', '/examples/trading/heikin-ashi'),
  componentEntry('trading-hollow-candles', 'Hollow Candles', TradingHollowCandlesDemo, 'trading', '/examples/trading/hollow-candles'),
  componentEntry('trading-markers-positions', 'Markers & Positions', TradingMarkersPositionsDemo, 'trading', '/examples/trading/markers-positions'),
  componentEntry('trading-alerts', 'Price Alerts', TradingAlertsDemo, 'trading', '/examples/trading/alerts'),
  componentEntry('trading-replay', 'Bar Replay', TradingReplayDemo, 'trading', '/examples/trading/replay'),
  componentEntry('trading-datafeed', 'Mock Datafeed', TradingDatafeedDemo, 'trading', '/examples/trading/datafeed'),
]

const SCIENTIFIC: SvgMirrorEntry[] = [
  chartEntry('heatmap', 'Heatmaps', 'heatmap', 'scientific', '/examples/heatmap'),
  chartEntry('candlestick', 'Candlestick', 'candlestick', 'scientific', '/examples/candlestick'),
  componentEntry('pane-stack', 'Multi-Pane Stack', PaneStackDemo, 'scientific', '/examples/pane-stack', 'Stacked panes with SVG renderer'),
  chartEntry('error-bars', 'Error Bars', 'errorbars', 'scientific', '/examples/error-bars'),
  chartEntry('scatter-symbols', 'Scatter Symbols', 'symbols', 'scientific', '/examples/scatter-symbols'),
  chartEntry('crosshair', 'Crosshair Cursor', 'crosshair', 'scientific', '/examples/crosshair'),
  componentEntry('polar', 'Polar Charts', PolarChartDemo, 'scientific', '/examples/polar-charts'),
  componentEntry('inverted-axis', 'Inverted Axes', InvertedAxisDemo, 'scientific', '/examples/inverted-axis'),
  componentEntry('radar', 'Radar Charts', RadarDemo, 'scientific', '/examples/radar-charts'),
  componentEntry('gauge-sankey', 'Gauge & Sankey', ProcessMonitoringDemo, 'scientific', '/examples/gauge-sankey'),
  {
    id: 'ternary',
    title: 'Ternary Charts',
    description: 'Three-component simplex plot',
    category: 'scientific',
    status: 'svg',
    kind: 'series-type',
    seriesDemoId: 'ternary',
    canvasExample: '/examples/ternary-charts',
  },
  componentEntry('contour', 'Contour Lines', ContourDemo, 'scientific', '/examples/contour-lines'),
]

const ANALYSIS: SvgMirrorEntry[] = [
  componentEntry('analysis-advanced', 'Math Functions', AnalysisAdvancedChart, 'analysis', '/examples/analysis-advanced'),
  chartEntry('fft-waveforms', 'FFT Waveforms', 'fft-waveforms', 'analysis', '/examples/fft-waveforms'),
  componentEntry('sine-waves', 'Sine Waves', SineWavesChart, 'analysis', '/examples/sine-waves'),
  componentEntry('square-waves', 'Square Waves', SquareWavesChart, 'analysis', '/examples/square-waves'),
  componentEntry('triangle-waves', 'Triangle Waves', TriangleWavesChart, 'analysis', '/examples/triangle-waves'),
  componentEntry('complex-fft', 'Complex FFT', ComplexFFTDemo, 'analysis', '/examples/complex-fft'),
  chartEntry('curve-fitting', 'Curve Fitting', 'fitting', 'analysis', '/examples/curve-fitting'),
  componentEntry('regression', 'Regression Plugin', RegressionDemo, 'analysis', '/examples/regression-plugin'),
  componentEntry('ml-integration', 'AI Integration', MLIntegrationDemo, 'analysis', '/examples/ml-integration'),
  chartEntry('peak-analysis', 'Peak Analysis', 'analysis', 'analysis', '/examples/analysis'),
  componentEntry('single-freq-filter', 'Single Frequency Filter', SingleFreqFilterDemo, 'analysis', '/examples/single-frequency-filter'),
  chartEntry('statistics', 'Statistics Panel', 'statistics', 'analysis', '/examples/statistics'),
  componentEntry('scientific-analysis', 'Scientific Analysis', ScientificDemo, 'analysis', '/examples/scientific-analysis'),
  componentEntry('forecasting', 'Forecasting', ForecastingDemo, 'analysis', '/examples/forecasting'),
]

const PERFORMANCE: SvgMirrorEntry[] = [
  {
    ...chartEntry('realtime', 'Real-time Streaming', 'realtime', 'performance', '/examples/realtime', undefined, {
      status: 'svg-lite',
      liteNote: 'SVG live renderer with streaming — lower FPS than WebGL; same API.',
    }),
    id: 'realtime',
  },
  {
    ...chartEntry('cyclic-voltammetry', 'Cyclic Voltammetry', 'cyclic-voltammetry', 'performance', '/examples/cyclic-voltammetry', undefined, {
      status: 'svg-lite',
    }),
    id: 'cyclic-voltammetry',
  },
  {
    ...chartEntry('large-datasets', 'Large Datasets', 'large', 'performance', '/examples/large-datasets', undefined, {
      status: 'svg-lite',
      componentProps: { points: 10000 },
      liteNote: 'SVG mirror uses 10K points (canvas example uses 1M).',
    }),
    id: 'large-datasets',
  },
  {
    id: '10m-points',
    title: '30M Points Challenge',
    category: 'performance',
    status: 'webgl-only',
    kind: 'component',
    canvasExample: '/examples/10m-points',
    description: 'Extreme point count requires WebGL.',
    webglNote: 'Not available in SVG — use the WebGL challenge demo.',
  },
]

const INTERACTION: SvgMirrorEntry[] = [
  chartEntry('tooltips', 'Tooltip Showcase', 'tooltips', 'interaction', '/examples/tooltips'),
  chartEntry('annotations', 'Annotations', 'annotations', 'interaction', '/examples/annotations'),
  componentEntry('chart-sync', 'Chart Synchronization', ChartSyncDemo, 'interaction', '/examples/chart-sync'),
  chartEntry('selection', 'Selection', 'selection', 'interaction', '/api/selection'),
]

const DX: SvgMirrorEntry[] = [
  componentEntry('indicators', 'Financial Indicators', IndicatorsDemo, 'dx', '/examples/indicators'),
  componentEntry('theme-editor', 'Theme Editor', ThemeEditorDemo, 'dx', '/examples/theme-editor'),
  componentEntry('waveforms', 'Waveform Generators', WaveformsDemo, 'dx', '/examples/waveforms'),
  componentEntry('backpressure', 'Backpressure', BackpressureDemo, 'dx', '/examples/backpressure', undefined, { status: 'svg-lite' }),
  componentEntry('i18n', 'Internationalization', I18nDemo, 'dx', '/examples/i18n'),
  componentEntry('export-utilities', 'Export & Media (Snapshot)', SnapshotDemo, 'dx', '/examples/export-utilities'),
  componentEntry('data-export', 'Data Export', DataExportDemo, 'dx', '/examples/export-utilities'),
  componentEntry('video-recorder', 'Video Recorder', VideoRecorderDemo, 'dx', '/examples/export-utilities'),
  componentEntry('context-menu', 'Context Menu', ContextMenuDemo, 'dx', '/examples/context-menu'),
  componentEntry('anomaly-detection', 'Anomaly Detection', AnomalyDetectionDemo, 'dx', '/examples/anomaly-detection'),
  componentEntry('latex', 'LaTeX', LaTeXDemo, 'dx', '/examples/latex-rendering'),
  componentEntry('drag-edit', 'Drag & Drop Editing', DragEditDemo, 'dx', '/examples/drag-edit'),
  componentEntry('caching', 'Caching', CachingDemo, 'dx', '/examples/caching'),
  componentEntry('lazy-load', 'Lazy Loading', LazyLoadDemo, 'dx', '/examples/lazy-load'),
  componentEntry('roi', 'ROI Tools', RoiDemo, 'dx', '/examples/roi-tools'),
  {
    id: 'offscreen',
    title: 'Offscreen Rendering',
    category: 'dx',
    status: 'webgl-only',
    kind: 'component',
    component: OffscreenDemo,
    canvasExample: '/examples/offscreen',
    webglNote: 'Offscreen/WebGPU path — WebGL only.',
  },
  componentEntry('broken-axis', 'Broken Axis', BrokenAxisDemo, 'dx', '/examples/broken-axis'),
  componentEntry('virtualization', 'Virtualization', VirtualizationDemo, 'dx', '/api/plugin-virtualization', undefined, { status: 'svg-lite' }),
  componentEntry('pattern-recognition', 'Pattern Recognition', PatternRecognitionDemo, 'dx', '/api/plugin-pattern-recognition'),
  chartEntry('color-schemes', 'Color Schemes', 'multi', 'dx', '/examples/color-schemes', undefined, {
    componentProps: { points: undefined },
  }),
]

const SERIES_TYPES: SvgMirrorEntry[] = SVG_SERIES_DEMOS.map((d) => ({
  id: `series-${d.id}`,
  title: d.title,
  description: d.description,
  category: 'series' as SvgMirrorCategory,
  status: 'svg' as SvgMirrorStatus,
  kind: 'series-type' as SvgMirrorKind,
  seriesDemoId: d.id,
  canvasExample: d.canvasExample,
}))

export const SVG_MIRROR_REGISTRY: SvgMirrorEntry[] = [
  ...FUNDAMENTAL,
  ...TRADING,
  ...SCIENTIFIC,
  ...ANALYSIS,
  ...PERFORMANCE,
  ...INTERACTION,
  ...DX,
  ...SERIES_TYPES,
]

export function getMirrorEntry(id: string): SvgMirrorEntry | undefined {
  return SVG_MIRROR_REGISTRY.find((e) => e.id === id)
}

export function mirrorEntriesByCategory(category: SvgMirrorCategory | 'all'): SvgMirrorEntry[] {
  if (category === 'all') return SVG_MIRROR_REGISTRY
  return SVG_MIRROR_REGISTRY.filter((e) => e.category === category)
}
