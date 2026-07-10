<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'

const MS_DAY = 86_400_000
/** Bars visible in fixed-window (scroll) mode */
const WINDOW_BARS = 60

type LiveMode = 'window' | 'expand'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const barCount = ref(0)
const symbol = ref('—')
const live = ref(false)
const liveMode = ref<LiveMode>('window')
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null
let timer: ReturnType<typeof setInterval> | null = null
let lastTime = 0
let lastClose = 0
let windowSpanMs = WINDOW_BARS * MS_DAY

async function load() {
  if (!containerRef.value) return
  chart?.destroy?.()
  stopLive()
  const { createChart, createMockDatafeed, barsToOhlc } = await import('@src/trading')
  // Daily bars keep timestamps far enough apart to render precisely on a
  // continuous time axis (intraday bars would collapse under float precision).
  const feed = createMockDatafeed({ seed: 42, barMs: MS_DAY })
  const info = await feed.resolveSymbol('MOCK')
  symbol.value = info.name
  const bars = await feed.getBars({
    symbol: 'MOCK',
    resolution: 'D',
    from: Date.UTC(2024, 0, 1),
    to: Date.UTC(2024, 4, 1),
  })
  barCount.value = bars.length
  lastTime = bars[bars.length - 1].time
  lastClose = bars[bars.length - 1].close
  const ohlc = barsToOhlc(bars)
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    autoScroll: liveMode.value === 'window',
    xAxis: { type: 'time', timeScale: { calendar: 'continuous' }, auto: liveMode.value === 'expand' },
  })
  chart.addSeries({
    id: 'ohlc',
    type: 'candlestick',
    data: ohlc,
    style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
  })
  applyViewMode(true)
}

function applyViewMode(fitFirst = false) {
  if (!chart) return
  const fixed = liveMode.value === 'window'
  chart.setAutoScroll?.(fixed)
  // expand: grow X with all history via axis.auto on append
  chart.updateXAxis?.({ auto: !fixed })

  if (fitFirst || !fixed) {
    chart.fit?.()
  }

  if (fixed) {
    const series = chart.getSeries?.('ohlc')
    const bounds = series?.getBounds?.()
    if (bounds) {
      const span = Math.min(windowSpanMs, Math.max(bounds.xMax - bounds.xMin, MS_DAY))
      windowSpanMs = span
      chart.zoom?.({
        x: [bounds.xMax - span, bounds.xMax],
        animate: false,
      })
    }
  }
}

function setLiveMode(mode: LiveMode) {
  if (liveMode.value === mode) return
  liveMode.value = mode
  applyViewMode(true)
}

function startLive() {
  if (timer || !chart) return
  live.value = true
  applyViewMode(false)
  timer = setInterval(() => {
    lastTime += MS_DAY
    const open = lastClose
    const close = Math.max(1, open + (Math.random() - 0.5) * 3)
    const high = Math.max(open, close) + Math.random()
    const low = Math.min(open, close) - Math.random()
    lastClose = close
    // append + autoScroll (window) or xAxis.auto (expand) — never fit() each tick
    chart?.updateSeries('ohlc', {
      x: new Float64Array([lastTime]),
      open: new Float32Array([open]),
      high: new Float32Array([high]),
      low: new Float32Array([low]),
      close: new Float32Array([close]),
      append: true,
    })
    barCount.value++
  }, 600)
}

function stopLive() {
  if (timer) clearInterval(timer)
  timer = null
  live.value = false
}

function toggleLive() {
  if (timer) stopLive()
  else startLive()
}

onMounted(() => { load() })
onUnmounted(() => {
  stopLive()
  chart?.destroy?.()
})
watch(isDark, () => { load() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button class="btn" :class="{ active: live }" @click="toggleLive">
        {{ live ? 'Stop live feed' : 'Start live feed' }}
      </button>
      <span class="mode-group">
        <button
          class="btn"
          :class="{ active: liveMode === 'window' }"
          @click="setLiveMode('window')"
        >
          Fixed window
        </button>
        <button
          class="btn"
          :class="{ active: liveMode === 'expand' }"
          @click="setLiveMode('expand')"
        >
          Expand X
        </button>
      </span>
      <span class="demo-hint">
        <template v-if="liveMode === 'window'">
          Scroll ~{{ WINDOW_BARS }} bars · keep latest in view
        </template>
        <template v-else>
          Fit all history as bars arrive
        </template>
        · <strong>{{ barCount }}</strong> bars · <strong>{{ symbol }}</strong>
      </span>
    </div>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.mode-group { display: inline-flex; gap: 0.35rem; }
.demo-hint { font-size: 13px; color: var(--vp-c-text-2); }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
.btn.active:hover { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); filter: brightness(1.05); }
</style>
