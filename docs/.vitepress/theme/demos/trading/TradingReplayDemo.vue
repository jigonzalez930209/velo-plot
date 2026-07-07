<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { generateBusinessDayOhlcv } from './tradingData'

const { isDark } = useData()
const containerRef = ref<HTMLDivElement | null>(null)
const index = ref(0)
const total = ref(0)
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
let chart: any = null
let replay: any = null

async function build() {
  if (!containerRef.value) return
  chart?.destroy?.()
  const { createChart, PluginReplay } = await import('@src/trading')
  const data = generateBusinessDayOhlcv(80)
  chart = createChart({
    container: containerRef.value,
    theme: chartTheme.value,
    animations: false,
    xAxis: { type: 'time', timeScale: { calendar: 'business-day' } },
  })
  chart.addSeries({ id: 'ohlc', type: 'candlestick', data })
  await chart.use(PluginReplay({ seriesId: 'ohlc', frameMs: 100 }))
  replay = chart.getPlugin('velo-plot-replay')
  total.value = replay?.getLength() ?? 0
  replay?.seek(0)
  index.value = replay?.getIndex() ?? 0
}

function play() { replay?.play(2) }
function pause() { replay?.pause() }
function step() {
  replay?.step(1)
  index.value = replay?.getIndex() ?? 0
}
function reset() {
  replay?.reset()
  index.value = replay?.getIndex() ?? 0
}

onMounted(() => { build() })
onUnmounted(() => { chart?.destroy?.() })
watch(isDark, () => { build() })
</script>

<template>
  <div class="trading-demo">
    <div class="toolbar">
      <button class="btn" @click="play">Play</button>
      <button class="btn" @click="pause">Pause</button>
      <button class="btn" @click="step">Step</button>
      <button class="btn" @click="reset">Reset</button>
      <span class="badge">Bar {{ index }} / {{ total }}</span>
    </div>
    <div ref="containerRef" class="chart-container" style="height: 400px" />
  </div>
</template>

<style scoped>
@import "../../demos.css";
.trading-demo { margin: 1rem 0 1.5rem; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; }
.badge { font-size: 13px; color: var(--vp-c-text-2); margin-left: 0.25rem; }
.chart-container { width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.btn {
  padding: 4px 10px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); cursor: pointer;
}
</style>
