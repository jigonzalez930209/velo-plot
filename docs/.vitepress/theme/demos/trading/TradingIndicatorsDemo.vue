<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'
import { createStackedChart } from '@src/trading'

const presets = ['bollinger', 'ema', 'sma', 'rsi', 'macd', 'stochastic'] as const
type Preset = (typeof presets)[number]

const OVERLAY = new Set<Preset>(['bollinger', 'ema', 'sma'])

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const active = ref<Preset>('rsi')
const status = ref('')
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let stack: any = null
let buildToken = 0

async function build(preset: Preset) {
  if (!containerRef.value) return
  const token = ++buildToken
  stack?.destroy?.()
  stack = null
  active.value = preset
  status.value = ''

  const data = generateBusinessDayOhlcv(100)
  if (token !== buildToken) return

  const isOverlay = OVERLAY.has(preset)
  stack = createStackedChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    resizable: true,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
    // Overlay presets: one pane fills the host. Oscillators: price starts tall;
    // addIndicator(pane:'new') will rebalance when the second pane mounts.
    panes: [
      {
        id: 'price',
        height: isOverlay ? 1 : 0.72,
        series: [{ id: 'ohlc', type: 'candlestick', data }],
      },
    ],
  })

  try {
    await stack.whenReady?.()
    if (token !== buildToken) return

    await stack.addIndicator(preset, {
      period: preset === 'bollinger' ? 20 : 14,
      sourceSeriesId: 'ohlc',
      pane: isOverlay ? 'inline' : 'new',
      paneHeight: 0.28,
    })
    if (token !== buildToken) return

    stack.fitAll?.()
    stack.resize?.()
  } catch (err) {
    console.error('[TradingIndicatorsDemo]', preset, err)
    status.value = `${preset} failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

onMounted(() => { build('rsi') })
onUnmounted(() => {
  buildToken++
  stack?.destroy?.()
  stack = null
})
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
    <p v-if="status" class="status">{{ status }}</p>
    <div class="chart-shell">
      <div ref="containerRef" class="chart-container" />
    </div>
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.status { color: #ef5350; font-size: 12px; margin: 0 0 0.5rem; }
.chart-shell {
  width: 100%;
  height: 480px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.btn {
  padding: 4px 10px; font-size: 11px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer; text-transform: uppercase;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
.btn.active:hover { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); filter: brightness(1.05); }
</style>
