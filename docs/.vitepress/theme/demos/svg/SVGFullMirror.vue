<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  SVG_MIRROR_CATEGORIES,
  SVG_MIRROR_REGISTRY,
  mirrorEntriesByCategory,
  type SvgMirrorCategory,
} from './svgMirrorRegistry'
import SVGDemoShell from './SVGDemoShell.vue'

const props = withDefaults(
  defineProps<{
    initialDemo?: string
    height?: string
  }>(),
  {
    height: '400px',
  },
)

const category = ref<SvgMirrorCategory | 'all'>('all')
const selectedId = ref(props.initialDemo ?? SVG_MIRROR_REGISTRY[0]?.id ?? 'basic')

const filtered = computed(() => mirrorEntriesByCategory(category.value))

const activeEntry = computed(() => SVG_MIRROR_REGISTRY.find((e) => e.id === selectedId.value))

function selectDemo(id: string) {
  selectedId.value = id
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', `#${id}`)
    document.getElementById('mirror-chart')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function syncFromHash() {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.slice(1)
  if (hash && SVG_MIRROR_REGISTRY.some((e) => e.id === hash)) {
    selectedId.value = hash
  }
}

onMounted(() => {
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
})

watch(category, () => {
  const first = filtered.value[0]
  if (first && !filtered.value.some((e) => e.id === selectedId.value)) {
    selectedId.value = first.id
  }
})
</script>

<template>
  <div class="svg-full-mirror">
    <header class="mirror-nav">
      <div class="nav-filters">
        <button
          class="pill"
          :class="{ active: category === 'all' }"
          type="button"
          @click="category = 'all'"
        >
          All ({{ SVG_MIRROR_REGISTRY.length }})
        </button>
        <button
          v-for="cat in SVG_MIRROR_CATEGORIES"
          :key="cat.id"
          class="pill"
          :class="{ active: category === cat.id }"
          type="button"
          @click="category = cat.id"
        >
          {{ cat.label }}
        </button>
      </div>

      <nav class="demo-picker" aria-label="SVG mirror examples">
        <button
          v-for="entry in filtered"
          :key="entry.id"
          class="demo-chip"
          :class="{ active: selectedId === entry.id, [`status-${entry.status}`]: true }"
          type="button"
          @click="selectDemo(entry.id)"
        >
          <span class="chip-title">{{ entry.title }}</span>
          <span v-if="entry.status !== 'svg'" class="chip-badge">{{ entry.status === 'webgl-only' ? 'WebGL' : 'Lite' }}</span>
        </button>
      </nav>
    </header>

    <section id="mirror-chart" class="mirror-chart">
      <SVGDemoShell v-if="activeEntry" :key="activeEntry.id" :entry="activeEntry" :height="height" />
      <p v-else class="missing">Demo not found.</p>
    </section>
  </div>
</template>

<style scoped>
.svg-full-mirror {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin: 1.5rem 0 2rem;
}

.mirror-nav {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: var(--vp-c-bg-soft);
}

.nav-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.pill {
  font-size: 0.72rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.pill.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: rgba(99, 102, 241, 0.08);
}

.demo-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-height: 9.5rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.demo-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.demo-chip:hover {
  border-color: var(--vp-c-brand-2);
}

.demo-chip.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.demo-chip.status-webgl-only {
  opacity: 0.85;
}

.chip-badge {
  font-size: 0.62rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.demo-chip.active .chip-badge {
  background: rgba(99, 102, 241, 0.12);
  color: var(--vp-c-brand-1);
}

.mirror-chart {
  min-width: 0;
  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 1rem);
}

.missing {
  color: var(--vp-c-danger-1);
}
</style>
