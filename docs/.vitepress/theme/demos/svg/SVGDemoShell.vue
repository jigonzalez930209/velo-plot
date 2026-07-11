<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import type { Component } from 'vue'
import type { SvgMirrorEntry, SvgMirrorStatus } from './svgMirrorRegistry'
import { DEMO_RENDERER_KEY, docsHref } from './demoChartOptions'
import SVGTypeDemo from './SVGTypeDemo.vue'

const props = withDefaults(
  defineProps<{
    entry: SvgMirrorEntry
    height?: string
  }>(),
  {
    height: '400px',
  },
)

const renderer = ref<'svg' | 'webgl'>('svg')
provide(DEMO_RENDERER_KEY, renderer)

const statusLabel = computed(() => {
  const map: Record<SvgMirrorStatus, string> = {
    svg: 'Live SVG',
    'svg-lite': 'SVG (lite dataset)',
    'webgl-only': 'WebGL only',
  }
  return map[props.entry.status]
})

const statusClass = computed(() => props.entry.status)

const canvasHref = computed(() => docsHref(props.entry.canvasExample))

const componentProps = computed(() => {
  const base = { height: props.height, renderer: 'svg' as const, ...(props.entry.componentProps ?? {}) }
  if (props.entry.kind === 'chart-demo' && props.entry.chartDemoType) {
    return { ...base, type: props.entry.chartDemoType }
  }
  if (props.entry.kind === 'series-type' && props.entry.seriesDemoId) {
    return { demoId: props.entry.seriesDemoId, compact: true, showToolbar: false, height: props.height }
  }
  return base
})

const activeComponent = computed<Component | null>(() => {
  if (props.entry.status === 'webgl-only') return null
  if (props.entry.kind === 'series-type') return SVGTypeDemo
  return props.entry.component ?? null
})
</script>

<template>
  <section class="svg-demo-shell" :id="entry.id">
    <header class="shell-head">
      <div>
        <h3 class="shell-title">{{ entry.title }}</h3>
        <p v-if="entry.description" class="shell-desc">{{ entry.description }}</p>
      </div>
      <div class="shell-meta">
        <span class="status-badge" :class="statusClass">{{ statusLabel }}</span>
        <a v-if="canvasHref" class="canvas-link" :href="canvasHref">Canvas example →</a>
      </div>
    </header>

    <div v-if="entry.status === 'webgl-only'" class="webgl-only-panel">
      <p>{{ entry.webglNote ?? 'This demo requires WebGL and is not available in the SVG mirror.' }}</p>
      <a v-if="canvasHref" class="btn" :href="canvasHref">Open WebGL example</a>
    </div>

    <div v-else-if="entry.status === 'svg-lite' && entry.liteNote" class="lite-note">
      {{ entry.liteNote }}
    </div>

    <component
      v-if="activeComponent"
      :is="activeComponent"
      v-bind="componentProps"
    />
  </section>
</template>

<style scoped>
.svg-demo-shell {
  margin: 0 0 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.shell-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.shell-title {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
}

.shell-desc {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.shell-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-weight: 600;
}

.status-badge.svg {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.status-badge.svg-lite {
  background: rgba(250, 204, 21, 0.15);
  color: #ca8a04;
}

.status-badge.webgl-only {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.canvas-link {
  font-size: 0.82rem;
  color: var(--vp-c-brand-1);
}

.lite-note,
.webgl-only-panel {
  margin: 0;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}

.webgl-only-panel .btn {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.82rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: var(--vp-c-text-1);
}
</style>
