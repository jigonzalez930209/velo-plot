<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv, findLowestBarIndex, findHighestBarIndex } from './tradingData'
import { PluginAnnotations, createChart } from '@src/trading'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  const data = generateBusinessDayOhlcv(55, { seed: 42 })
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
  })
  await chart.use(PluginAnnotations())
  chart.addSeries({
    id: 'ohlc',
    type: 'candlestick',
    data,
    style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
  })
  const buyIdx = findLowestBarIndex(data.low)
  const sellIdx = findHighestBarIndex(data.high)
  const entry = data.close[buyIdx]
  chart.getSeries('ohlc')?.setMarkers([
    { time: buyIdx, shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
    { time: sellIdx, shape: 'arrowDown', position: 'aboveBar', text: 'Sell', color: '#ef4444' },
  ])
  chart.addPositionLine({ price: entry, style: 'entry' })
  chart.addPositionLine({ price: entry * 0.96, style: 'sl' })
  chart.addPositionLine({ price: entry * 1.05, style: 'tp' })
  chart.fit?.()
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <p class="demo-hint">Buy/sell markers on candles · entry (blue) · SL (red) · TP (green)</p>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.demo-hint { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 0.75rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
</style>
