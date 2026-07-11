<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { PluginAnnotations, createChart, generateContours } from '@src/index'
import { useDemoRenderer } from './svg/demoChartOptions'

const props = defineProps<{
  height?: string
  renderer?: 'svg' | 'webgl'
}>()

const { isDark } = useData()
const chartContainer = ref<HTMLElement | null>(null)
const isInitialized = ref(false)
const levelCount = ref(9)
const showLabels = ref(true)

let chart: any = null
const lineIds: string[] = []
const labelIds: string[] = []

const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))
const activeRenderer = computed(() => props.renderer ?? useDemoRenderer())

const GRID = 60
const RANGE = 3

/** Smooth scalar field: a mixture of Gaussian bumps and dips. */
function field(x: number, y: number): number {
  const g = (cx: number, cy: number, s: number) =>
    Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s))
  return (
    120 * g(-1.1, -0.9, 0.9) +
    90 * g(1.3, 1.1, 1.1) -
    70 * g(1.0, -1.4, 0.8) +
    40 * g(-1.6, 1.3, 1.0)
  )
}

// Cool→warm color ramp for the isolines.
function levelColor(t: number): string {
  const stops = [
    [56, 189, 248], // sky
    [34, 197, 94], // green
    [250, 204, 21], // amber
    [239, 68, 68], // red
  ]
  const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)))
  const f = t * (stops.length - 1) - seg
  const a = stops[seg]
  const b = stops[seg + 1]
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  let attempts = 0
  while (!chartContainer.value && attempts < 20) {
    await new Promise((r) => setTimeout(r, 50))
    attempts++
  }
  try {
    chart = createChart({
      container: chartContainer.value!,
      theme: chartTheme.value,
      showControls: true,
      showLegend: false,
    renderer: activeRenderer.value,
  })
    await chart.use(PluginAnnotations())
    isInitialized.value = true
    await draw()
  } catch (err) {
    console.error('ContourDemo: init failed', err)
  }
})

async function draw() {
  if (!chart || !isInitialized.value) return

  // Clear previous isolines/labels.
  for (const id of lineIds.splice(0)) chart.removeSeries?.(id)
  for (const id of labelIds.splice(0)) chart.removeAnnotation(id)

  // Build the scalar field on a regular grid.
  const xs = Float32Array.from({ length: GRID }, (_, i) => -RANGE + (2 * RANGE * i) / (GRID - 1))
  const ys = Float32Array.from({ length: GRID }, (_, i) => -RANGE + (2 * RANGE * i) / (GRID - 1))
  const z = new Float32Array(GRID * GRID)
  let zMin = Infinity
  let zMax = -Infinity
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const v = field(xs[i], ys[j])
      z[j * GRID + i] = v
      if (v < zMin) zMin = v
      if (v > zMax) zMax = v
    }
  }

  const contours = generateContours(z, xs, ys, {
    numLevels: levelCount.value,
    labels: showLabels.value,
    minLabelLength: 8,
    labelFormatter: (lvl: number) => lvl.toFixed(0),
  })

  let idx = 0
  for (const line of contours) {
    const t = (line.level - zMin) / (zMax - zMin || 1)
    const color = levelColor(t)
    const polylines = line.polylines ?? [line.points]
    for (const pl of polylines) {
      if (pl.length < 2) continue
      const id = `iso-${idx++}`
      chart.addSeries({
        id,
        type: 'line',
        data: {
          x: Float32Array.from(pl.map((p: any) => p.x)),
          y: Float32Array.from(pl.map((p: any) => p.y)),
        },
        style: { color, width: 1.5 },
      })
      lineIds.push(id)
    }

    if (showLabels.value && line.labels) {
      for (const lab of line.labels) {
        const id = chart.addAnnotation({
          type: 'text',
          x: lab.x,
          y: lab.y,
          text: lab.text,
          rotation: (lab.angle * 180) / Math.PI,
          anchor: 'center',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#f8fafc',
          backgroundColor: 'rgba(2, 6, 23, 0.75)',
          padding: 3,
        })
        labelIds.push(id)
      }
    }
  }

  chart.autoScale?.()
  chart.render()
}

watch([levelCount, showLabels, isDark], () => {
  if (chart) {
    chart.setTheme(chartTheme.value)
    draw()
  }
})

onUnmounted(() => {
  if (chart) chart.destroy()
})
</script>

<template>
  <div class="contour-demo">
    <div class="demo-controls">
      <div class="control-group">
        <label>Levels: {{ levelCount }}</label>
        <input type="range" v-model.number="levelCount" min="4" max="16" step="1" :disabled="!isInitialized" />
      </div>
      <div class="control-group">
        <label>Isoline labels</label>
        <button class="btn" @click="showLabels = !showLabels" :disabled="!isInitialized">
          {{ showLabels ? 'On' : 'Off' }}
        </button>
      </div>
    </div>

    <div ref="chartContainer" class="main-chart" :style="{ height: height || '460px' }"></div>

    <p class="footnote">
      Isolines are drawn from a marching-squares field; each label follows the local
      isoline direction with a contrasting halo so it stays readable. Zoom/pan with the
      chart controls — labels stay attached to the isolines and legible at every zoom (3.13).
    </p>
  </div>
</template>

<style scoped>
.contour-demo {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.demo-controls {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
}
.control-group { display: flex; flex-direction: column; gap: 0.4rem; }
.control-group label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #64748b; }
input[type='range'] { width: 160px; }
.btn {
  background: #334155; color: white; border: none; padding: 8px 16px;
  border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn:hover { background: #475569; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.main-chart {
  background: #020617; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);
}
.footnote { font-size: 0.78rem; color: #64748b; margin: 0; }
</style>
