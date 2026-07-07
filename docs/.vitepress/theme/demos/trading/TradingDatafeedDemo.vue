<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'

const MS_DAY = 86_400_000

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const barCount = ref(0)
const symbol = ref('—')
const live = ref(false)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null
let timer: ReturnType<typeof setInterval> | null = null
let lastTime = 0
let lastClose = 0

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
    xAxis: { type: 'time', timeScale: { calendar: 'continuous' } },
  })
  chart.addSeries({
    id: 'ohlc',
    type: 'candlestick',
    data: ohlc,
    style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
  })
  chart.fit?.()
}

function startLive() {
  if (timer || !chart) return
  live.value = true
  timer = setInterval(() => {
    lastTime += MS_DAY
    const open = lastClose
    const close = Math.max(1, open + (Math.random() - 0.5) * 3)
    const high = Math.max(open, close) + Math.random()
    const low = Math.min(open, close) - Math.random()
    lastClose = close
    chart?.updateSeries('ohlc', {
      x: new Float64Array([lastTime]),
      open: new Float32Array([open]),
      high: new Float32Array([high]),
      low: new Float32Array([low]),
      close: new Float32Array([close]),
      append: true,
    })
    chart?.fit?.()
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
      <button class="btn" @click="toggleLive">{{ live ? 'Stop live feed' : 'Start live feed' }}</button>
      <span class="demo-hint">
        Loaded <strong>{{ barCount }}</strong> bars · symbol <strong>{{ symbol }}</strong>
      </span>
    </div>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.demo-hint { font-size: 13px; color: var(--vp-c-text-2); }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
</style>
