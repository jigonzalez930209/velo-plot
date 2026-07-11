import { buildIndicatorSeries } from '@src/index'
import type { SeriesType } from '@src/types'

export type SvgDemoCategory = 'cartesian' | 'trading' | 'scientific' | 'special'

export interface SvgSeriesDemo {
  id: string
  type: SeriesType | 'radar-plugin'
  title: string
  description: string
  category: SvgDemoCategory
  canvasExample?: string
  /** Populate series on an initialized chart (clears existing series first). */
  populate: (chart: any) => void | Promise<void>
}

const xy = {
  x: Float32Array.from([10, 30, 50, 70, 90]),
  y: Float32Array.from([12, 28, 40, 35, 18]),
}

export const SVG_SERIES_DEMOS: SvgSeriesDemo[] = [
  {
    id: 'line',
    type: 'line',
    title: 'Line',
    description: 'Continuous polylines with stroke styling.',
    category: 'cartesian',
    canvasExample: '/examples/basic',
    populate(chart) {
      chart.addSeries({
        id: 'line',
        type: 'line',
        data: xy,
        style: { color: '#00f2ff', width: 2 },
      })
    },
  },
  {
    id: 'scatter',
    type: 'scatter',
    title: 'Scatter',
    description: 'Discrete markers with symbol and size options.',
    category: 'cartesian',
    canvasExample: '/examples/scatter-symbols',
    populate(chart) {
      chart.addSeries({
        id: 'scatter',
        type: 'scatter',
        data: xy,
        style: { color: '#38bdf8', pointSize: 8, symbol: 'diamond' },
      })
    },
  },
  {
    id: 'line-scatter',
    type: 'line+scatter',
    title: 'Line + Scatter',
    description: 'Combined stroke path and point markers.',
    category: 'cartesian',
    canvasExample: '/examples/basic',
    populate(chart) {
      chart.addSeries({
        id: 'line-scatter',
        type: 'line+scatter',
        data: xy,
        style: { color: '#a78bfa', width: 2, pointSize: 6 },
      })
    },
  },
  {
    id: 'step',
    type: 'step',
    title: 'Step',
    description: 'Step interpolation (before / after / center).',
    category: 'cartesian',
    canvasExample: '/examples/step-charts',
    populate(chart) {
      chart.addSeries({
        id: 'step',
        type: 'step',
        data: xy,
        style: { color: '#4ade80', stepMode: 'after', width: 2 },
      })
    },
  },
  {
    id: 'step-scatter',
    type: 'step+scatter',
    title: 'Step + Scatter',
    description: 'Step path with visible vertices.',
    category: 'cartesian',
    canvasExample: '/examples/step-charts',
    populate(chart) {
      chart.addSeries({
        id: 'step-scatter',
        type: 'step+scatter',
        data: xy,
        style: { color: '#fbbf24', stepMode: 'center', pointSize: 5, width: 2 },
      })
    },
  },
  {
    id: 'band',
    type: 'band',
    title: 'Band',
    description: 'Filled region between upper and lower Y values.',
    category: 'cartesian',
    canvasExample: '/examples/area-charts',
    populate(chart) {
      chart.addSeries({
        id: 'band',
        type: 'band',
        data: {
          x: xy.x,
          y: Float32Array.from([18, 32, 45, 38, 22]),
          y2: Float32Array.from([8, 18, 30, 28, 12]),
        },
        style: { color: '#818cf8', opacity: 0.45 },
      })
    },
  },
  {
    id: 'area',
    type: 'area',
    title: 'Area',
    description: 'Area fill from baseline to Y values.',
    category: 'cartesian',
    canvasExample: '/examples/area-charts',
    populate(chart) {
      chart.addSeries({
        id: 'area',
        type: 'area',
        data: {
          x: xy.x,
          y: xy.y,
          y2: Float32Array.from([0, 0, 0, 0, 0]),
        },
        style: { color: '#22d3ee', opacity: 0.35 },
      })
    },
  },
  {
    id: 'bar',
    type: 'bar',
    title: 'Bar',
    description: 'Categorical / discrete bars with auto width.',
    category: 'cartesian',
    canvasExample: '/examples/bar-charts',
    populate(chart) {
      chart.addSeries({
        id: 'bar',
        type: 'bar',
        data: xy,
        style: { color: '#fb923c', barWidth: 8 },
      })
    },
  },
  {
    id: 'waterfall',
    type: 'waterfall',
    title: 'Waterfall',
    description: 'Signed bars with subtotals.',
    category: 'cartesian',
    canvasExample: '/examples/waterfall-chart',
    populate(chart) {
      chart.addSeries({
        id: 'waterfall',
        type: 'waterfall',
        data: {
          x: Float32Array.from([1, 2, 3, 4]),
          y: Float32Array.from([10, -5, 8, 0]),
        },
        style: {
          waterfallTypes: ['positive', 'negative', 'positive', 'subtotal'],
          positiveColor: '#22c55e',
          negativeColor: '#ef4444',
          subtotalColor: '#3b82f6',
        },
      })
    },
  },
  {
    id: 'boxplot',
    type: 'boxplot',
    title: 'Boxplot',
    description: 'Quartile boxes with whiskers.',
    category: 'cartesian',
    canvasExample: '/examples/scientific-analysis',
    populate(chart) {
      chart.addSeries({
        id: 'boxplot',
        type: 'boxplot',
        data: {
          x: Float32Array.from([25, 75]),
          y: Float32Array.from([20, 30]),
          y2: Float32Array.from([35, 45]),
          median: Float32Array.from([28, 38]),
          q1: Float32Array.from([22, 32]),
          q3: Float32Array.from([34, 44]),
          low: Float32Array.from([18, 28]),
          high: Float32Array.from([40, 50]),
        },
        style: { color: '#94a3b8' },
      })
    },
  },
  {
    id: 'error-bars',
    type: 'line',
    title: 'Error Bars',
    description: 'Symmetric Y error bars on line points.',
    category: 'cartesian',
    canvasExample: '/examples/error-bars',
    populate(chart) {
      chart.addSeries({
        id: 'errors',
        type: 'line',
        data: {
          x: Float32Array.from([20, 50, 80]),
          y: Float32Array.from([20, 35, 25]),
          yError: Float32Array.from([3, 4, 2]),
        },
        style: { color: '#f472b6', width: 2, pointSize: 5 },
      })
    },
  },
  {
    id: 'candlestick',
    type: 'candlestick',
    title: 'Candlestick',
    description: 'OHLC financial candles.',
    category: 'trading',
    canvasExample: '/examples/candlestick',
    populate(chart) {
      chart.addSeries({
        id: 'candles',
        type: 'candlestick',
        data: {
          x: Float32Array.from([30, 60, 90, 120]),
          open: Float32Array.from([20, 25, 30, 28]),
          high: Float32Array.from([32, 35, 38, 36]),
          low: Float32Array.from([18, 22, 26, 24]),
          close: Float32Array.from([28, 24, 34, 31]),
        },
        style: { barWidth: 10 },
      })
    },
  },
  {
    id: 'heikin-ashi',
    type: 'heikin-ashi',
    title: 'Heikin-Ashi',
    description: 'Smoothed OHLC candles.',
    category: 'trading',
    canvasExample: '/examples/trading/heikin-ashi',
    populate(chart) {
      chart.addSeries({
        id: 'ha',
        type: 'heikin-ashi',
        data: {
          x: Float32Array.from([30, 60, 90]),
          open: Float32Array.from([22, 26, 29]),
          high: Float32Array.from([30, 32, 35]),
          low: Float32Array.from([20, 24, 27]),
          close: Float32Array.from([28, 29, 33]),
        },
      })
    },
  },
  {
    id: 'indicator',
    type: 'indicator',
    title: 'Indicator pane',
    description: 'MACD-style histogram + lines via buildIndicatorSeries.',
    category: 'trading',
    canvasExample: '/examples/trading/indicators',
    populate(chart) {
      const x = Float32Array.from([0, 25, 50, 75, 100])
      const expanded = buildIndicatorSeries({
        id: 'macd',
        type: 'indicator',
        data: {
          x,
          lines: [
            { id: 'macd', y: Float32Array.from([-2, 1, 3, 0, -1]), color: '#3b82f6', width: 1.5 },
            { id: 'signal', y: Float32Array.from([-1, 0, 2, 1, 0]), color: '#f59e0b', width: 1 },
          ],
          histogram: {
            y: Float32Array.from([-1, 2, -3, 1, 0]),
            positiveColor: '#22c55e',
            negativeColor: '#ef4444',
          },
        },
      })
      for (const s of expanded) chart.addSeries(s)
    },
  },
  {
    id: 'heatmap',
    type: 'heatmap',
    title: 'Heatmap',
    description: '2D intensity grid with colormap.',
    category: 'scientific',
    canvasExample: '/examples/heatmap',
    populate(chart) {
      const w = 24
      const h = 16
      const xValues = Float32Array.from({ length: w }, (_, i) => i)
      const yValues = Float32Array.from({ length: h }, (_, i) => i)
      const zValues = new Float32Array(w * h)
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const dx = (i - w / 2) / 4
          const dy = (j - h / 2) / 4
          zValues[j * w + i] = Math.cos(dx * dx + dy * dy)
        }
      }
      chart.addHeatmap({
        id: 'heatmap',
        data: { xValues, yValues, zValues },
        style: { colorScale: { name: 'viridis', min: -1, max: 1 } },
      })
      chart.zoom({ x: [0, w - 1], y: [0, h - 1] })
    },
  },
  {
    id: 'polar',
    type: 'polar',
    title: 'Polar',
    description: 'R/θ series in polar coordinates.',
    category: 'scientific',
    canvasExample: '/examples/polar-charts',
    populate(chart) {
      chart.addSeries({
        id: 'polar',
        type: 'polar',
        data: {
          r: Float32Array.from([1, 2, 3, 2, 1]),
          theta: Float32Array.from([0, 72, 144, 216, 288]),
        },
        style: { color: '#e879f9', width: 2, fill: true, fillOpacity: 0.2 },
      })
    },
  },
  {
    id: 'ternary',
    type: 'ternary',
    title: 'Ternary',
    description: 'Three-component simplex plot (A, B, C).',
    category: 'scientific',
    canvasExample: '/examples/ternary-charts',
    populate(chart) {
      chart.addSeries({
        id: 'ternary',
        type: 'ternary',
        data: {
          x: Float32Array.from([0.2, 0.5, 0.8, 0.35]),
          y: Float32Array.from([0.3, 0.4, 0.1, 0.45]),
          y2: Float32Array.from([0.5, 0.1, 0.1, 0.2]),
        },
        style: { color: '#f97316', pointSize: 7 },
      })
    },
  },
  {
    id: 'gauge',
    type: 'gauge',
    title: 'Gauge',
    description: 'Single KPI dial.',
    category: 'special',
    canvasExample: '/examples/gauge-sankey',
    populate(chart) {
      chart.addSeries({
        id: 'gauge',
        type: 'gauge',
        data: { value: 68, min: 0, max: 100 },
        style: { color: '#3b82f6', trackColor: '#334155', label: 'Utilization %' },
      })
    },
  },
  {
    id: 'sankey',
    type: 'sankey',
    title: 'Sankey',
    description: 'Flow diagram between nodes.',
    category: 'special',
    canvasExample: '/examples/gauge-sankey',
    populate(chart) {
      chart.addSeries({
        id: 'sankey',
        type: 'sankey',
        data: {
          nodes: [
            { id: 'solar', name: 'Solar' },
            { id: 'grid', name: 'Grid' },
            { id: 'home', name: 'Home' },
          ],
          links: [
            { source: 'solar', target: 'home', value: 30 },
            { source: 'grid', target: 'home', value: 12 },
          ],
        },
        style: { linkOpacity: 0.55, showLabels: true },
      })
    },
  },
  {
    id: 'radar',
    type: 'radar-plugin',
    title: 'Radar (plugin)',
    description: 'Spider chart via PluginRadar — exported to SVG through the plugin pipeline.',
    category: 'special',
    canvasExample: '/examples/radar-charts',
    async populate(chart) {
      const { PluginRadar } = await import('@src/plugins')
      const plugin = PluginRadar({
        categories: ['Speed', 'Power', 'Reliability', 'Safety', 'Efficiency'],
        maxValue: 100,
      })
      await chart.use(plugin)
      plugin.api?.addSeries({
        id: 'product-a',
        name: 'Product A',
        points: [
          { category: 'Speed', value: 80 },
          { category: 'Power', value: 70 },
          { category: 'Reliability', value: 90 },
          { category: 'Safety', value: 60 },
          { category: 'Efficiency', value: 85 },
        ],
        style: { color: '#00f2ff', fillColor: 'rgba(0, 242, 255, 0.2)', width: 2 },
      })
    },
  },
]

export function getSvgDemo(id: string): SvgSeriesDemo | undefined {
  return SVG_SERIES_DEMOS.find((d) => d.id === id)
}

export const SVG_DEMO_CATEGORIES: { id: SvgDemoCategory; label: string }[] = [
  { id: 'cartesian', label: 'Cartesian' },
  { id: 'trading', label: 'Trading' },
  { id: 'scientific', label: 'Scientific' },
  { id: 'special', label: 'Gauge, Sankey & Radar' },
]
