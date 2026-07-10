<template>
  <div class="pane-stack-demo">
    <div class="preset-row">
      <button
        v-for="p in presets"
        :key="p.id"
        class="preset-btn"
        :class="{ active: activePreset === p.id }"
        @click="selectPreset(p.id)"
      >
        {{ p.label }}
      </button>
    </div>

    <div class="info-panel">
      <span class="badge">{{ currentPreset.badge }}</span>
      <p class="description">{{ currentPreset.description }}</p>
      <ul class="tips">
        <li v-for="(tip, i) in currentPreset.tips" :key="i">{{ tip }}</li>
      </ul>
    </div>

    <div class="toolbar">
      <label v-if="currentPreset.showSyncControls" class="sync-label">
        Sync axis
        <select v-model="runtimeSyncAxis" @change="applyRuntimeSync">
          <option value="x">X only (Y independent)</option>
          <option value="y">Y only</option>
          <option value="xy">Both axes</option>
          <option value="none">None</option>
        </select>
      </label>
      <label v-if="currentPreset.showSyncControls" class="sync-label">
        <input type="checkbox" v-model="runtimeCursor" @change="applyRuntimeSync" />
        Cursor sync
      </label>
      <button class="btn" @click="fitAll">Fit All</button>
      <button class="btn" @click="resetAll">Reset</button>
      <span class="export-divider">Export stack:</span>
      <button class="btn export-btn" :disabled="!stack || isExporting" @click="exportStack('png')">
        PNG
      </button>
      <button class="btn export-btn" :disabled="!stack || isExporting" @click="exportStack('jpeg')">
        JPEG
      </button>
      <button class="btn export-btn" :disabled="!stack || isExporting" @click="exportStack('webp')">
        WebP
      </button>
    </div>

    <div
      ref="containerRef"
      class="stack-container"
      :style="{ height: `${currentPreset.height}px` }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useData } from 'vitepress'

type PresetId =
  | 'tradingview'
  | 'no-sync'
  | 'xy-sync'
  | 'y-sync'
  | 'master-only'
  | 'compact'
  | 'horizontal'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
const activePreset = ref<PresetId>('tradingview')
const runtimeSyncAxis = ref<'x' | 'y' | 'xy' | 'none'>('x')
const runtimeCursor = ref(true)

let stack: any = null
const isExporting = ref(false)

const presets = [
  {
    id: 'tradingview' as const,
    label: 'TradingView',
    badge: 'X sync · Y independent',
    height: 560,
    showSyncControls: true,
    description:
      'Four panes — candlesticks, volume, wave indicator, RSI. Pan or zoom on any pane: time (X) stays aligned, each Y scale is independent.',
    tips: [
      'Wheel on plot area: zoom X + Y on that pane; X propagates to all panes.',
      'Wheel on the Y-axis strip: zoom only that pane’s Y (not synced).',
      'Wave line: green above wt2 (buy), red below (sell).',
      'Drag dividers to resize panes without flicker.',
    ],
  },
  {
    id: 'horizontal' as const,
    label: 'Horizontal',
    badge: 'Side by side · Y sync',
    height: 360,
    showSyncControls: false,
    description:
      'Two panes laid out horizontally with a shared left Y axis. Pan or zoom on either pane — Y stays aligned, each X scale is independent.',
    tips: [
      'Drag the vertical divider to resize pane widths.',
      'Contrast with TradingView: here Y is shared, X is per-pane.',
      'Use stack.exportImage() to capture the full side-by-side layout.',
    ],
  },
  {
    id: 'compact' as const,
    label: 'Price + Volume',
    badge: '2 panes',
    height: 380,
    showSyncControls: false,
    description: 'Minimal two-pane stack. Try panning on the volume pane — price follows on X.',
    tips: [
      'Y-axis drag on volume zooms volume only.',
      'Fit All uses price pane X, each pane fits its own Y.',
    ],
  },
  {
    id: 'no-sync' as const,
    label: 'No sync',
    badge: 'Independent',
    height: 480,
    showSyncControls: false,
    description: 'Same layout but sync disabled — each pane is fully independent.',
    tips: [
      'Compare with TradingView preset: pan one pane, others stay put.',
      'Useful when panes show unrelated time ranges.',
    ],
  },
  {
    id: 'xy-sync' as const,
    label: 'XY sync',
    badge: 'Both axes',
    height: 360,
    showSyncControls: false,
    description: 'Two line panes with full X+Y synchronization (both axes linked).',
    tips: [
      'Zoom or pan on either pane — both X and Y match.',
      'Contrast with TradingView where only X is shared.',
    ],
  },
  {
    id: 'y-sync' as const,
    label: 'Y sync only',
    badge: 'Y axis',
    height: 360,
    showSyncControls: false,
    description: 'Two panes sharing only the Y axis — X can differ per pane.',
    tips: [
      'Rare layout; useful for aligned magnitude comparison with different X windows.',
    ],
  },
  {
    id: 'master-only' as const,
    label: 'Master only',
    badge: 'Master drives',
    height: 380,
    showSyncControls: false,
    description: 'Only the price pane drives X sync (classic master-slave). Volume/RSI do not push X to others.',
    tips: [
      'Pan volume — price X does not move.',
      'Pan price — volume and RSI follow on X.',
    ],
  },
]

const currentPreset = computed(
  () => presets.find((p) => p.id === activePreset.value) ?? presets[0],
)

function generateMarketData(n: number) {
  const x = new Float32Array(n)
  const open = new Float32Array(n)
  const high = new Float32Array(n)
  const low = new Float32Array(n)
  const close = new Float32Array(n)
  const volume = new Float32Array(n)

  const baseTime = Date.UTC(2024, 0, 1)
  let price = 100

  for (let i = 0; i < n; i++) {
    x[i] = baseTime + i * 86_400_000
    open[i] = price
    const change = (Math.random() - 0.48) * 4
    close[i] = price + change
    high[i] = Math.max(open[i], close[i]) + Math.random() * 2
    low[i] = Math.min(open[i], close[i]) - Math.random() * 2
    volume[i] = 500_000 + Math.random() * 2_000_000
    price = close[i]
  }

  const rsi = new Float32Array(n)
  const period = 14
  for (let i = period; i < n; i++) {
    let gains = 0
    let losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = close[j] - close[j - 1]
      if (diff >= 0) gains += diff
      else losses -= diff
    }
    const rs = losses === 0 ? 100 : gains / losses
    rsi[i] = 100 - 100 / (1 + rs)
  }

  return { x, open, high, low, close, volume, rsi }
}

function generateWaveIndicator(x: Float32Array) {
  const n = x.length
  const wt1 = new Float32Array(n)
  const wt2 = new Float32Array(n)
  const hist = new Float32Array(n)
  const upper = new Float32Array(n)
  const lower = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const t = i / 6
    wt1[i] = Math.sin(t) * 35 + Math.sin(t * 0.27) * 18
    wt2[i] = Math.cos(t * 0.9) * 30 + Math.sin(t * 0.17 + 1) * 14
    hist[i] = (wt1[i] - wt2[i]) * 0.45
    upper[i] = 55 + Math.sin(t * 0.11) * 22
    lower[i] = -55 + Math.sin(t * 0.11) * 22
  }

  return { wt1, wt2, hist, upper, lower }
}

function generateLinePair(n: number) {
  const x = new Float32Array(n)
  const y1 = new Float32Array(n)
  const y2 = new Float32Array(n)
  let v1 = 40
  let v2 = 70
  for (let i = 0; i < n; i++) {
    x[i] = i
    v1 += (Math.random() - 0.48) * 3 + Math.sin(i / 12) * 1.5
    v2 += (Math.random() - 0.52) * 2.5 + Math.cos(i / 18) * 1.2
    y1[i] = v1
    y2[i] = v2
  }
  return { x, y1, y2 }
}

function chartBase() {
  return { animations: false, loading: false }
}

function buildTradingViewPanes(data: ReturnType<typeof generateMarketData>, indicatorPane: any) {
  return [
    {
      id: 'price',
      height: 0.42,
      chart: {
        ...chartBase(),
        xAxis: { type: 'time', showLabels: false, showTicks: false, showLine: false },
        yAxis: { label: 'Price', scientific: false, tickCount: 5 },
      },
      series: [
        {
          id: 'ohlc',
          type: 'candlestick',
          data: {
            x: data.x,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
          },
          style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
        },
      ],
    },
    {
      id: 'volume',
      height: 0.14,
      chart: {
        ...chartBase(),
        yAxis: { label: 'Volume', scientific: false, prefix: 'M', tickCount: 4 },
        xAxis: { showLabels: false, showTicks: false, showLine: false },
      },
      series: [
        {
          id: 'vol',
          type: 'bar',
          data: { x: data.x, y: data.volume },
          style: { color: 'rgba(100, 181, 246, 0.7)' },
        },
      ],
    },
    indicatorPane,
    {
      id: 'rsi',
      height: 0.2,
      yRange: [0, 100],
      chart: {
        ...chartBase(),
        yAxis: { label: 'RSI', min: 0, max: 100, auto: false, tickCount: 5 },
        xAxis: { type: 'time', label: 'Date', showLabels: true, showTicks: true, tickCount: 6 },
      },
      series: [
        {
          id: 'rsi-line',
          type: 'line',
          data: { x: data.x, y: data.rsi },
          style: { color: '#ab47bc', width: 1.5 },
        },
      ],
    },
  ]
}

function buildCompactPanes(data: ReturnType<typeof generateMarketData>) {
  return [
    {
      id: 'price',
      height: 0.62,
      chart: {
        ...chartBase(),
        xAxis: { type: 'time', showLabels: false, showTicks: false, showLine: false },
        yAxis: { label: 'Price', tickCount: 5 },
      },
      series: [
        {
          id: 'ohlc',
          type: 'candlestick',
          data: {
            x: data.x,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
          },
          style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
        },
      ],
    },
    {
      id: 'volume',
      height: 0.38,
      chart: {
        ...chartBase(),
        yAxis: { label: 'Volume', prefix: 'M', tickCount: 4 },
        xAxis: { type: 'time', label: 'Date', tickCount: 6 },
      },
      series: [
        {
          id: 'vol',
          type: 'bar',
          data: { x: data.x, y: data.volume },
          style: { color: 'rgba(100, 181, 246, 0.7)' },
        },
      ],
    },
  ]
}

function buildLinePairPanes(
  lines: ReturnType<typeof generateLinePair>,
  labels: [string, string],
  layout: 'vertical' | 'horizontal' = 'vertical',
) {
  const perPaneXAxis =
    layout === 'horizontal'
      ? { label: 'Index', tickCount: 6, showLabels: true, showTicks: true, showLine: true }
      : null

  return [
    {
      id: 'pane-a',
      height: 0.5,
      chart: {
        ...chartBase(),
        xAxis: perPaneXAxis ?? {
          label: 'Index',
          showLabels: false,
          showTicks: false,
          showLine: false,
        },
        yAxis: { label: labels[0], tickCount: 5 },
      },
      series: [
        {
          id: 'line-a',
          type: 'line',
          data: { x: lines.x, y: lines.y1 },
          style: { color: '#ff6b6b', width: 1.5 },
        },
      ],
    },
    {
      id: 'pane-b',
      height: 0.5,
      chart: {
        ...chartBase(),
        xAxis: perPaneXAxis ?? { label: 'Index', tickCount: 8 },
        yAxis: { label: labels[1], tickCount: 5 },
      },
      series: [
        {
          id: 'line-b',
          type: 'line',
          data: { x: lines.x, y: lines.y2 },
          style: { color: '#4ecdc4', width: 1.5 },
        },
      ],
    },
  ]
}

function resolveSyncOptions(preset: PresetId) {
  switch (preset) {
    case 'no-sync':
      return false
    case 'horizontal':
      return { axis: 'y' as const, syncCursor: true }
    case 'xy-sync':
      return { axis: 'xy' as const, syncCursor: true }
    case 'y-sync':
      return { axis: 'y' as const, syncCursor: false }
    case 'master-only':
      return { axis: 'x' as const, bidirectional: false, syncCursor: true }
    default:
      return true
  }
}

function fitAll() {
  stack?.fitAll()
}

function resetAll() {
  stack?.resetAll()
}

async function exportStack(format: 'png' | 'jpeg' | 'webp') {
  if (!stack || isExporting.value) return
  isExporting.value = true
  try {
    await stack.exportImage({
      format,
      resolution: '2k',
      download: true,
      fileName: `velo-stack-${activePreset.value}`,
      includeDividers: true,
    })
  } catch (err) {
    console.error('[PaneStackDemo] export failed', err)
  } finally {
    isExporting.value = false
  }
}

function applyRuntimeSync() {
  if (!stack || activePreset.value !== 'tradingview') return
  const enabled = runtimeSyncAxis.value !== 'none'
  stack.setSyncAxis(runtimeSyncAxis.value)
  stack.setSyncOptions({
    syncZoom: enabled,
    syncPan: enabled,
    syncCursor: runtimeCursor.value,
  })
}

async function initStack() {
  if (!containerRef.value) return

  try {
    const { createStackedChart } = await import('@src/core/stacked')
    const { buildIndicatorPane, detectIndicatorMarkers } = await import('@src/core/indicator')

    stack?.destroy()
    const preset = activePreset.value
    const data = generateMarketData(120)
    const wave = generateWaveIndicator(data.x)
    const markers = detectIndicatorMarkers(data.x, wave.wt1, 4)
    const lines = generateLinePair(200)

    let panes: any[]
    let masterPaneId = 'price'
    let sharedXAxis: 'bottom' | 'none' = 'bottom'

    if (preset === 'tradingview' || preset === 'no-sync') {
      const indicatorPane = buildIndicatorPane({
        id: 'wave',
        height: 0.24,
        label: 'Wave',
        yRange: [-80, 80],
        tickCount: 5,
        data: {
          x: data.x,
          histogram: {
            y: wave.hist,
            positiveColor: '#26a69a',
            negativeColor: '#c62828',
          },
          lines: [
            {
              id: 'wt1',
              y: wave.wt1,
              width: 2,
              colorZones: {
                ref: 'wt2',
                aboveColor: '#26a69a',
                belowColor: '#ef5350',
              },
            },
            { id: 'wt2', y: wave.wt2, color: 'rgba(224, 64, 251, 0.55)', width: 1.5 },
          ],
          fills: [
            {
              upper: wave.upper,
              lower: wave.lower,
              color: 'rgba(80, 60, 140, 0.35)',
            },
          ],
          markers,
          referenceLines: [
            { y: 60, color: 'rgba(198, 40, 40, 0.45)' },
            { y: -60, color: 'rgba(38, 166, 154, 0.45)' },
          ],
        },
      })
      panes = buildTradingViewPanes(data, indicatorPane)
    } else if (preset === 'compact' || preset === 'master-only') {
      panes = buildCompactPanes(data)
    } else if (preset === 'horizontal') {
      masterPaneId = 'pane-a'
      panes = buildLinePairPanes(lines, ['Series A', 'Series B'], 'horizontal')
    } else {
      masterPaneId = 'pane-a'
      sharedXAxis = 'bottom'
      panes = buildLinePairPanes(lines, ['Series A', 'Series B'])
    }

    const syncOpt = resolveSyncOptions(preset)
    if (preset === 'tradingview') {
      runtimeSyncAxis.value = 'x'
      runtimeCursor.value = true
    }

    stack = createStackedChart({
      container: containerRef.value,
      masterPaneId,
      direction: preset === 'horizontal' ? 'horizontal' : 'vertical',
      sharedXAxis: preset === 'horizontal' ? 'none' : sharedXAxis,
      sharedYAxis: preset === 'horizontal' ? 'left' : undefined,
      gap: 0,
      resizable: preset !== 'xy-sync' && preset !== 'y-sync',
      showLegend: false,
      theme: chartTheme.value,
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      sync: syncOpt,
      panes,
    })

    await stack.whenReady()
    stack.fitAll()
  } catch (err) {
    console.error('[PaneStackDemo]', err)
  }
}

function selectPreset(id: PresetId) {
  if (activePreset.value === id) return
  activePreset.value = id
  initStack()
}

onMounted(() => {
  if (typeof window === 'undefined') return
  initStack()
})

onUnmounted(() => {
  stack?.destroy()
  stack = null
})

watch(chartTheme, (theme) => {
  if (!stack) return
  for (const chart of stack.getPanes()) {
    chart.setTheme(theme)
  }
  stack.resize()
})
</script>

<style scoped>
.pane-stack-demo {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.preset-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.preset-btn:hover:not(.active) {
  border-color: #00f2ff;
  color: var(--vp-c-text-1);
}

.preset-btn.active {
  border-color: #00f2ff;
  color: #00b8c4;
  background: rgba(0, 242, 255, 0.08);
}

.info-panel {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.badge {
  display: inline-block;
  background: linear-gradient(135deg, #00f2ff, #4ecdc4);
  color: #000;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.description {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.tips {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.sync-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.sync-label select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}

.btn:hover:not(.active) {
  border-color: #00f2ff;
}

.export-divider {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-left: 4px;
}

.export-btn {
  font-size: 12px;
  padding: 6px 10px;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stack-container {
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
}
</style>
