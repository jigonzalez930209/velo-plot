<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'

const presets = ['bollinger', 'ema', 'sma', 'rsi', 'macd', 'stochastic'] as const
type Preset = (typeof presets)[number]

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const active = ref<Preset>('rsi')
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let stack: any = null

async function build(preset: Preset) {
  if (!containerRef.value) return
  stack?.destroy?.()
  active.value = preset
  const data = generateBusinessDayOhlcv(100)
  const { createStackedChart } = await import('@src/trading')
  stack = createStackedChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
    panes: [
      {
        id: 'price',
        height: 0.5,
        series: [{ id: 'ohlc', type: 'candlestick', data }],
      },
    ],
  })
  await stack.whenReady?.()
  const overlay = preset === 'bollinger' || preset === 'ema' || preset === 'sma'
  await stack.addIndicator(preset, {
    period: 14,
    sourceSeriesId: 'ohlc',
    pane: overlay ? 'inline' : 'new',
    paneHeight: 0.28,
  })
  stack.fitAll?.()
}

onMounted(() => { build('rsi') })
onUnmounted(() => { stack?.destroy?.() })
watch(isDark, () => { build(active.value) })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button
        v-for="p in presets"
        :key="p"
        class="btn"
        :class="{ active: active === p }"
        @click="build(p)"
      >
        {{ p }}
      </button>
    </div>
    <div ref="containerRef" class="chart-container" style="height: 480px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 10px; font-size: 11px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer; text-transform: uppercase;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
</style>
