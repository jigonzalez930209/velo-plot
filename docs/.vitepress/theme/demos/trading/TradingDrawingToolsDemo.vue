<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'

const modes = ['trendline', 'horizontal', 'rectangle', 'fibonacci', 'measure'] as const
type Mode = (typeof modes)[number]
type ActiveMode = Mode | 'none'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const mode = ref<ActiveMode>('trendline')
const magnet = ref(true)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  const { createChart, PluginAnnotations, PluginDrawingTools, PluginKeyboard } = await import('@src/trading')
  const data = generateBusinessDayOhlcv(60, { seed: 7 })
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
  })
  chart.addSeries({ id: 'ohlc', type: 'candlestick', data })
  await chart.use(PluginAnnotations())
  await chart.use(PluginDrawingTools({
    color: '#38bdf8',
    magnet: magnet.value,
    onModeChange: (m) => { mode.value = m === 'none' ? 'none' : m as Mode },
  }))
  await chart.use(PluginKeyboard())
  chart.setDrawingMode(mode.value === 'none' ? 'trendline' : mode.value)
  if (mode.value === 'none') {
    chart.getPlugin('velo-plot-drawing-tools')?.setMode?.('none')
  }
  chart.fit?.()
}

function setMode(m: Mode) {
  mode.value = m
  chart?.setDrawingMode(m)
}

function toggleMagnet() {
  magnet.value = !magnet.value
  chart?.getPlugin('velo-plot-drawing-tools')?.setMagnet?.(magnet.value)
}

function undo() {
  chart?.getPlugin('velo-plot-drawing-tools')?.undo()
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button v-for="m in modes" :key="m" class="btn" :class="{ active: mode === m }" @click="setMode(m)">
        {{ m }}
      </button>
      <button class="btn" :class="{ active: magnet }" @click="toggleMagnet">Magnet</button>
      <button class="btn" @click="undo">Undo (Ctrl+Z)</button>
    </div>
    <p class="demo-hint">
      Drag to draw — the shape previews under the cursor and commits on release, then pan returns.
      Two clicks also work for trendline / rectangle / fibonacci / measure. The measure tool shows
      the price change and % (green up, red down). Magnet snaps to candle O/H/L/C.
    </p>
    <div ref="containerRef" class="chart-container" style="height: 420px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.demo-hint { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 0.75rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 10px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
.btn.active { background: var(--vp-c-brand); color: var(--vp-c-bg); border-color: var(--vp-c-brand); }
</style>
