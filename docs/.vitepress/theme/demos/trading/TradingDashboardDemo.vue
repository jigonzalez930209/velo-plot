<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv, findLowestBarIndex } from './tradingData'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const magnet = ref(true)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let stack: any = null

async function build() {
  if (!containerRef.value) return
  stack?.destroy?.()
  const {
    createStackedChart,
    PluginAnnotations,
    PluginDrawingTools,
    PluginReplay,
    PluginKeyboard,
  } = await import('@src/trading')
  const data = generateBusinessDayOhlcv(80, { seed: 42 })
  stack = createStackedChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    panes: [
      {
        id: 'price',
        height: 0.45,
        series: [{
          id: 'ohlc',
          type: 'candlestick',
          data,
          style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
        }],
      },
      {
        id: 'volume',
        height: 0.15,
        series: [{
          id: 'vol',
          type: 'bar',
          data: { x: data.x, y: data.volume },
          style: { color: 'rgba(56, 189, 248, 0.65)' },
        }],
      },
    ],
    xAxis: {
      type: 'time',
      timeScale: { calendar: 'business-day', session: '24x7' },
    },
  })
  await stack.whenReady?.()
  const priceChart = stack.getChart('price')
  await priceChart.use(PluginAnnotations())
  await stack.addIndicator('rsi', { period: 14, pane: 'new' })
  await stack.addIndicator('macd', { pane: 'new', paneHeight: 0.2 })
  const buyIdx = findLowestBarIndex(data.low)
  const entry = data.close[buyIdx]
  priceChart.getSeries('ohlc')?.setMarkers([
    { time: buyIdx, shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
  ])
  priceChart.addPositionLine({ price: entry, style: 'entry' })
  priceChart.addPositionLine({ price: entry * 0.97, style: 'sl' })
  priceChart.addPositionLine({ price: entry * 1.04, style: 'tp' })
  await priceChart.use(PluginDrawingTools({
    color: '#38bdf8',
    magnet: magnet.value,
    autoDeselect: true,
  }))
  await priceChart.use(PluginKeyboard())
  await priceChart.use(PluginReplay({ seriesId: 'ohlc', frameMs: 120 }))
  priceChart.setDrawingMode('trendline')
  stack.fitAll?.()
}

function toggleMagnet() {
  magnet.value = !magnet.value
  const priceChart = stack?.getChart?.('price')
  priceChart?.getPlugin('velo-plot-drawing-tools')?.setMagnet?.(magnet.value)
}

onMounted(() => { build() })
onUnmounted(() => { stack?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button class="btn" :class="{ active: magnet }" @click="toggleMagnet">Magnet</button>
    </div>
    <p class="demo-hint">Price + volume + RSI + MACD · business-day axis · markers · position lines · live drawing preview</p>
    <div ref="containerRef" class="chart-container" style="height: 560px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.demo-hint { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 0.75rem; }
.chart-container {
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.btn {
  padding: 4px 10px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
</style>
