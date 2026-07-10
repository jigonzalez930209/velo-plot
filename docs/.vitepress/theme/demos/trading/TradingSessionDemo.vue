<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'
import { createChart } from '@src/trading'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const calendar = ref<'business-day' | 'continuous'>('business-day')
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  const data = generateBusinessDayOhlcv(35)
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: {
      type: 'time',
      timeScale: { calendar: calendar.value, session: '24x7' },
    },
    yAxis: { label: 'Price', scientific: false },
  })
  chart.addSeries({
    id: 'c',
    type: 'candlestick',
    data,
    style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
  })
  chart.fit?.()
}

function setCalendar(mode: 'business-day' | 'continuous') {
  calendar.value = mode
  build()
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button class="btn" :class="{ active: calendar === 'business-day' }" @click="setCalendar('business-day')">
        Business-day
      </button>
      <button class="btn" :class="{ active: calendar === 'continuous' }" @click="setCalendar('continuous')">
        Continuous
      </button>
    </div>
    <p class="demo-hint">
      Business-day skips weekends on the X axis; continuous keeps calendar gaps. Data includes Sat/Sun timestamps.
    </p>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.demo-hint { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 0.75rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
.btn.active:hover { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); filter: brightness(1.05); }
</style>
