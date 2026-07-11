<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'
import { createChart } from '@src/trading'
import { useDemoRenderer } from '../svg/demoChartOptions'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const hollow = ref(true)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
const props = defineProps<{ renderer?: 'svg' | 'webgl' }>()
const activeRenderer = computed(() => props.renderer ?? useDemoRenderer())
let chart: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  const data = generateBusinessDayOhlcv(65)
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },

    renderer: activeRenderer.value,
  })
  chart.addSeries({
    id: 'c',
    type: 'candlestick',
    data,
    style: {
      hollow: hollow.value,
      bullishColor: '#22c55e',
      bearishColor: '#ef4444',
      barWidth: 0.72,
    },
  })
  chart.fit?.()
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch([isDark, hollow], () => { build() })
</script>

<template>
  <div class="trading-demo">
    <label class="toolbar">
      <input v-model="hollow" type="checkbox" />
      Hollow bullish candles
    </label>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; align-items: center; gap: 0.5rem; font-size: 13px; margin-bottom: 0.75rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
</style>
