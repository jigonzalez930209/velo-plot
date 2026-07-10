<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'
import { createChart } from '@src/trading'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const fired = ref(0)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  fired.value = 0
  const data = generateBusinessDayOhlcv(50)
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
  })
  chart.addSeries({ id: 'ohlc', type: 'candlestick', data })
  chart.on('alert', () => { fired.value++ })
  const target = data.close[data.close.length - 1]
  chart.addAlert({ price: target, direction: 'above' })
  chart.fit?.()
}

function trigger() {
  if (!chart) return
  const s = chart.getSeries('ohlc')
  const d = s?.getData()
  if (!d?.close?.length) return
  const n = d.close.length
  const close = Float32Array.from(d.close)
  close[n - 1] = close[n - 1] + 3
  chart.updateSeries('ohlc', { close })
  chart.render()
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button class="btn" @click="trigger">Simulate price spike</button>
      <span class="badge">Alerts fired: {{ fired }}</span>
    </div>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.badge { font-size: 13px; color: var(--vp-c-brand); }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
</style>
