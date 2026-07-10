<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { PluginAnnotations, PluginPatternRecognition, createChart } from '@src/index'

const props = defineProps<{ height?: string }>()

const { isDark } = useData()
const chartContainer = ref<HTMLElement | null>(null)
const isInitialized = ref(false)
const selectedPattern = ref<'head-shoulders' | 'double-top' | 'double-bottom'>('head-shoulders')

interface SignalRow { name: string; direction: string; confidence: number; price: number }
interface AlertRow { level: number; direction: string; status: 'armed' | 'triggered'; at?: number }

const detected = ref<SignalRow[]>([])
const alerts = ref<AlertRow[]>([])

let chart: any = null
let offSignal: (() => void) | null = null
const annotationIds: string[] = []
// Armed alert level so the "trigger breakout" button knows which way to push.
let armed: { direction: 'above' | 'below'; level: number } | null = null

const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))

const PATTERN_COLORS: Record<string, string> = {
  'head-shoulders': '#ff6b6b',
  'double-top': '#ff9f43',
  'double-bottom': '#00d2d3',
}

// Key control points per pattern. Only these turning points are fed to the
// detector (it scans 5-7 point windows); the chart shows a dense interpolation.
function controlsFor(kind: string): [number, number][] {
  const jitter = () => (Math.random() - 0.5) * 4
  if (kind === 'double-top') {
    return [[0, 80], [12, 120 + jitter()], [24, 98], [36, 121 + jitter()], [48, 110]]
  }
  if (kind === 'double-bottom') {
    return [[0, 120], [12, 80 + jitter()], [24, 102], [36, 79 + jitter()], [48, 90]]
  }
  // head & shoulders (bearish): left shoulder, head, right shoulder, still above neckline
  return [[0, 80], [10, 110 + jitter()], [20, 95], [30, 130 + jitter()], [40, 96], [50, 111 + jitter()], [60, 105]]
}

/** Smooth dense curve through the control points, for display only. */
function densify(controls: [number, number][], perSeg = 16): { x: Float32Array; y: Float32Array } {
  const xs: number[] = []
  const ys: number[] = []
  for (let c = 0; c < controls.length - 1; c++) {
    const [x0, y0] = controls[c]
    const [x1, y1] = controls[c + 1]
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg
      // smoothstep easing keeps the turning points as the only extrema
      const e = t * t * (3 - 2 * t)
      xs.push(x0 + (x1 - x0) * t)
      ys.push(y0 + (y1 - y0) * e)
    }
  }
  xs.push(controls[controls.length - 1][0])
  ys.push(controls[controls.length - 1][1])
  return { x: Float32Array.from(xs), y: Float32Array.from(ys) }
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
    })

    await chart.use(PluginAnnotations())
    await chart.use(
      PluginPatternRecognition({
        // Lower thresholds so signals fire for every clean pattern, and widen
        // the alert types so the trading bridge covers all three demos.
        defaultParameters: {
          minConfidence: 0.5,
          patternTypes: ['head-shoulders', 'double-top', 'double-bottom'],
          sensitivity: 0.2,
          minPatternSize: 4,
          maxPatternSize: 60,
          overlapTolerance: 0.5,
        },
        notifications: {
          enableAlerts: true,
          minAlertConfidence: 0.5,
          alertTypes: ['head-shoulders', 'double-top', 'double-bottom'],
        },
      } as any),
    )

    // Trading signal bridge (3.8): each detected pattern emits a normalized signal.
    offSignal = chart.patterns.onSignal((sig: any) => {
      detected.value = [
        ...detected.value,
        {
          name: sig.patternName,
          direction: sig.direction,
          confidence: sig.confidence,
          price: sig.price,
        },
      ]
    })

    // Stage 2 alert system consumes the pattern and fires on breakout.
    chart.on('alert', (a: any) => {
      alerts.value = alerts.value.map((row) =>
        row.status === 'armed' ? { ...row, status: 'triggered', at: a.triggerPrice } : row,
      )
    })

    isInitialized.value = true
    await runDetection()
  } catch (err) {
    console.error('PatternRecognitionDemo: init failed', err)
  }
})

async function runDetection() {
  if (!chart || !isInitialized.value) return

  // Reset previous state
  detected.value = []
  alerts.value = []
  armed = null
  for (const id of annotationIds.splice(0)) chart.removeAnnotation(id)

  const controls = controlsFor(selectedPattern.value)
  const dense = densify(controls)

  if (chart.getSeries('price')) chart.updateSeries('price', dense)
  else
    chart.addSeries({
      id: 'price',
      name: 'Price',
      type: 'line',
      data: dense,
      style: { color: '#38bdf8', width: 2 },
    })

  // Key points overlay so the pattern structure is visible.
  const kp = { x: Float32Array.from(controls.map((c) => c[0])), y: Float32Array.from(controls.map((c) => c[1])) }
  if (chart.getSeries('keypts')) chart.updateSeries('keypts', kp)
  else
    chart.addSeries({
      id: 'keypts',
      name: 'Key points',
      type: 'scatter',
      data: kp,
      style: { color: '#f8fafc', size: 5 },
    })

  chart.autoScale?.()

  // Detection runs on the key points (the detector scans 5-7 point windows).
  const points = controls.map(([x, y]) => ({ x, y }))
  const result = await chart.patterns.detectPatterns('price', points)

  for (const m of result.matches) {
    const color = PATTERN_COLORS[m.pattern.type] ?? '#a78bfa'
    // 3.7: highlight the detected region on the overlay.
    const id = chart.addAnnotation({
      type: 'band',
      xMin: m.location.startPoint.x,
      xMax: m.location.endPoint.x,
      fillColor: color + '22',
      strokeColor: color,
      strokeWidth: 1.5,
      label: `${m.pattern.name} · ${(m.confidence * 100).toFixed(0)}%`,
    })
    annotationIds.push(id)

    // 3.8: arm a Stage 2 alert at the pattern's neckline.
    const ys = (m.validation.keyPoints ?? []).map((p: any) => p.y)
    const bearish = m.pattern.type === 'head-shoulders' || m.pattern.type === 'double-top'
    const level = bearish ? Math.min(...ys) : Math.max(...ys)
    const direction: 'above' | 'below' = bearish ? 'below' : 'above'
    chart.addAlert({ price: level, direction, seriesId: 'price', once: true })
    armed = { direction, level }
    alerts.value = [...alerts.value, { level, direction, status: 'armed' }]
  }

  chart.render()
}

/** Append a point that crosses the armed neckline so the alert fires live. */
function triggerBreakout() {
  if (!chart || !armed) return
  const s = chart.getSeries('price')
  const data = s?.getData?.()
  if (!data?.x?.length) return
  const lastX = data.x[data.x.length - 1]
  const target = armed.direction === 'below' ? armed.level - 30 : armed.level + 30
  chart.appendData('price', Float32Array.from([lastX + 3, lastX + 6]), Float32Array.from([target, target]))
  chart.autoScale?.()
  chart.render()
}

watch([selectedPattern, isDark], () => {
  if (chart) {
    chart.setTheme(chartTheme.value)
    runDetection()
  }
})

onUnmounted(() => {
  offSignal?.()
  if (chart) chart.destroy()
})
</script>

<template>
  <div class="pattern-demo">
    <div class="demo-controls">
      <div class="control-group">
        <label>Pattern</label>
        <select v-model="selectedPattern" :disabled="!isInitialized">
          <option value="head-shoulders">Head &amp; Shoulders (bearish)</option>
          <option value="double-top">Double Top (bearish)</option>
          <option value="double-bottom">Double Bottom (bullish)</option>
        </select>
      </div>
      <div class="control-group">
        <button class="btn" @click="runDetection" :disabled="!isInitialized">🎲 New data</button>
      </div>
      <div class="control-group">
        <button class="btn btn-accent" @click="triggerBreakout" :disabled="!isInitialized || !alerts.length">
          ⚡ Trigger breakout
        </button>
      </div>
    </div>

    <div class="demo-body">
      <div ref="chartContainer" class="main-chart" :style="{ height: height || '420px' }"></div>

      <div class="side-panels">
        <div class="panel">
          <h4>Signals <span class="tag">3.8 bridge</span></h4>
          <ul v-if="detected.length">
            <li v-for="(s, i) in detected" :key="i">
              <span class="dot" :class="s.direction"></span>
              <b>{{ s.name }}</b>
              <span class="muted">{{ s.direction }} · {{ (s.confidence * 100).toFixed(0) }}%</span>
            </li>
          </ul>
          <p v-else class="muted">No signals yet.</p>
        </div>

        <div class="panel">
          <h4>Stage 2 Alerts</h4>
          <ul v-if="alerts.length">
            <li v-for="(a, i) in alerts" :key="i">
              <span class="badge" :class="a.status">{{ a.status }}</span>
              {{ a.direction }} @ {{ a.level.toFixed(1) }}
              <span v-if="a.at != null" class="muted">→ {{ a.at.toFixed(1) }}</span>
            </li>
          </ul>
          <p v-else class="muted">No alerts armed.</p>
        </div>
      </div>
    </div>

    <p class="footnote">
      The detected region is highlighted on the chart overlay (3.7). Each pattern emits a normalized
      trading signal that arms a Stage 2 price alert at the neckline (3.8) — hit
      <b>Trigger breakout</b> to push price across the level and fire the alert.
    </p>
  </div>
</template>

<style scoped>
.pattern-demo {
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
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
}
.control-group { display: flex; flex-direction: column; gap: 0.4rem; }
.control-group label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #64748b; }
select {
  background: #1e293b; color: #f1f5f9; border: 1px solid #334155;
  padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; cursor: pointer;
}
.btn {
  background: #334155; color: white; border: none; padding: 8px 16px;
  border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn:hover { background: #475569; }
.btn-accent { background: #6366f1; }
.btn-accent:hover { background: #818cf8; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.demo-body { display: flex; gap: 1rem; flex-wrap: wrap; }
.main-chart {
  flex: 1 1 460px; min-width: 320px;
  background: #020617; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);
}
.side-panels { flex: 0 1 240px; display: flex; flex-direction: column; gap: 1rem; min-width: 220px; }
.panel {
  background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; padding: 0.9rem;
}
.panel h4 { margin: 0 0 0.6rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; }
.tag { font-size: 0.6rem; color: #94a3b8; background: rgba(148,163,184,0.15); padding: 2px 6px; border-radius: 6px; font-weight: 600; }
.panel ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
.panel li { font-size: 0.82rem; display: flex; align-items: center; gap: 0.4rem; }
.muted { color: #64748b; font-size: 0.78rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.bearish { background: #ff6b6b; }
.dot.bullish { background: #22c55e; }
.dot.neutral { background: #94a3b8; }
.badge {
  font-size: 0.62rem; text-transform: uppercase; font-weight: 700;
  padding: 2px 6px; border-radius: 6px;
}
.badge.armed { background: rgba(250, 204, 21, 0.15); color: #facc15; }
.badge.triggered { background: rgba(34, 197, 94, 0.18); color: #22c55e; }
.footnote { font-size: 0.78rem; color: #64748b; margin: 0; }
</style>
