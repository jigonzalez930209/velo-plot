<script setup lang="ts">
import { ref, computed } from 'vue'
import { SVG_SERIES_DEMOS, SVG_DEMO_CATEGORIES, type SvgDemoCategory } from './seriesDemoData'
import SVGTypeDemo from './SVGTypeDemo.vue'

const props = withDefaults(
  defineProps<{
    /** Pre-select a demo id (from URL hash or prop) */
    initialDemo?: string
    height?: string
  }>(),
  {
    height: '380px',
  },
)

const category = ref<SvgDemoCategory | 'all'>('all')
const selectedId = ref(props.initialDemo ?? SVG_SERIES_DEMOS[0]?.id ?? 'line')

const filtered = computed(() =>
  category.value === 'all'
    ? SVG_SERIES_DEMOS
    : SVG_SERIES_DEMOS.filter((d) => d.category === category.value),
)

function selectDemo(id: string) {
  selectedId.value = id
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', `#${id}`)
  }
}

if (typeof window !== 'undefined' && window.location.hash) {
  const hash = window.location.hash.slice(1)
  if (SVG_SERIES_DEMOS.some((d) => d.id === hash)) {
    selectedId.value = hash
  }
}
</script>

<template>
  <div class="svg-gallery">
    <div class="filters">
      <button
        class="pill"
        :class="{ active: category === 'all' }"
        type="button"
        @click="category = 'all'"
      >
        All ({{ SVG_SERIES_DEMOS.length }})
      </button>
      <button
        v-for="cat in SVG_DEMO_CATEGORIES"
        :key="cat.id"
        class="pill"
        :class="{ active: category === cat.id }"
        type="button"
        @click="category = cat.id"
      >
        {{ cat.label }}
      </button>
    </div>

    <div class="type-grid">
      <button
        v-for="demo in filtered"
        :key="demo.id"
        class="type-card"
        :class="{ active: selectedId === demo.id }"
        type="button"
        @click="selectDemo(demo.id)"
      >
        <span class="type-name">{{ demo.title }}</span>
        <span class="type-kind">{{ demo.type }}</span>
      </button>
    </div>

    <SVGTypeDemo :key="selectedId" :demo-id="selectedId" :height="height" />
  </div>
</template>

<style scoped>
.svg-gallery {
  margin: 1.5rem 0;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.pill {
  font-size: 0.82rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.pill.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  text-align: left;
}

.type-card.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.type-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.type-kind {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
</style>
