<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'
import { createChart } from '@src/trading'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const showHa = ref(true)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  const data = generateBusinessDayOhlcv(70)
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
  })
  chart.addSeries({
    id: 'series',
    type: showHa.value ? 'heikin-ashi' : 'candlestick',
    data,
    style: { bullishColor: '#22c55e', bearishColor: '#ef4444', barWidth: 0.75 },
  })
  chart.fit?.()
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button class="btn" :class="{ active: showHa }" @click="showHa = true; build()">Heikin-Ashi</button>
      <button class="btn" :class="{ active: !showHa }" @click="showHa = false; build()">Regular OHLC</button>
    </div>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
.btn.active:hover { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); filter: brightness(1.05); }
</style>
