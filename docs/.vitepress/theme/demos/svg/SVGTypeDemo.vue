<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { createChart } from '@src/index'
import { getSvgDemo } from './seriesDemoData'
import { docsHref } from './demoChartOptions'

const props = withDefaults(
  defineProps<{
    demoId: string
    height?: string
    /** Live vector renderer (default) or WebGL for side-by-side comparison */
    renderer?: 'svg' | 'webgl'
    showToolbar?: boolean
    compact?: boolean
  }>(),
  {
    height: '360px',
    renderer: 'svg',
    showToolbar: true,
    compact: false,
  },
)

const { isDark } = useData()
const chartContainer = ref<HTMLElement | null>(null)
const activeRenderer = ref(props.renderer)
const isReady = ref(false)
const status = ref('')

let chart: any = null

const demo = computed(() => getSvgDemo(props.demoId))
const canvasHref = computed(() => docsHref(demo.value?.canvasExample))
const chartTheme = computed(() => (isDark.value ? 'midnight' : 'light'))

async function mountChart() {
  if (typeof window === 'undefined' || !chartContainer.value || !demo.value) return

  if (chart) {
    chart.destroy()
    chart = null
  }

  chart = createChart({
    container: chartContainer.value,
    theme: chartTheme.value,
    showControls: !props.compact,
    showLegend: false,
    animations: false,
    renderer: activeRenderer.value,
    xAxis: { auto: true, tickCount: 5 },
    yAxis: { auto: true, tickCount: 5 },
  })

  await demo.value.populate(chart)

  // Wait for init queue + autoScale from addSeries before first SVG frame
  await new Promise<void>((resolve) => {
    const finish = () => {
      chart.autoScale(false)
      chart.resize()
      chart.render()
      resolve()
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(finish))
    } else {
      setTimeout(finish, 50)
    }
  })
  isReady.value = true
  status.value =
    activeRenderer.value === 'svg'
      ? 'Chart interactivo SVG — pan, zoom e interacciones igual que canvas'
      : 'Referencia WebGL (canvas)'
}

async function toggleRenderer() {
  activeRenderer.value = activeRenderer.value === 'svg' ? 'webgl' : 'svg'
  isReady.value = false
  await mountChart()
}

onMounted(() => {
  void mountChart()
})

onUnmounted(() => {
  chart?.destroy()
})

watch(isDark, () => {
  if (chart) {
    chart.setTheme(chartTheme.value)
    setTimeout(() => {
      chart.resize()
      chart.render()
    }, 80)
  }
})

watch(
  () => props.demoId,
  () => {
    isReady.value = false
    void mountChart()
  },
)
</script>

<template>
  <div v-if="demo" class="svg-type-demo" :class="{ compact }">
    <div v-if="!compact" class="demo-head">
      <div>
        <h3 v-if="demo.title" class="demo-title">{{ demo.title }}</h3>
        <p class="demo-desc">{{ demo.description }}</p>
      </div>
      <div v-if="showToolbar" class="demo-toolbar">
        <button class="btn" type="button" :disabled="!isReady" @click="toggleRenderer">
          {{ activeRenderer === 'svg' ? 'Ver en WebGL (canvas)' : 'Volver a SVG' }}
        </button>
        <a v-if="canvasHref" class="btn link" :href="canvasHref">Ejemplo canvas →</a>
      </div>
    </div>

    <div
      ref="chartContainer"
      class="chart-host"
      :style="{ height }"
      :data-renderer="activeRenderer"
    />

    <p v-if="status && showToolbar" class="status">{{ status }}</p>
  </div>
  <p v-else class="missing">Unknown SVG demo: {{ demoId }}</p>
</template>

<style scoped>
.svg-type-demo {
  margin: 1rem 0 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.svg-type-demo.compact {
  border: none;
  background: transparent;
  margin: 0;
}

.demo-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-title {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
}

.demo-desc {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.btn {
  font-size: 0.82rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.btn.link {
  text-decoration: none;
}

.chart-host {
  width: 100%;
  min-height: 200px;
}

.status {
  margin: 0;
  padding: 0.45rem 1rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  border-top: 1px solid var(--vp-c-divider);
}

.missing {
  color: var(--vp-c-danger-1);
}
</style>
