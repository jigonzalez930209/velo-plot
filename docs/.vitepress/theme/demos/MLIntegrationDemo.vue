<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import { PluginMLIntegration, PluginTools, createChart } from '@src/index'

const props = defineProps<{
  height?: string
}>()

const { isDark } = useData()
const chartContainer = ref<HTMLElement | null>(null)
const isInitialized = ref(false)
const isPredicting = ref(false)
const fit = ref<{ r2?: number; rmse?: number; slope?: number; intercept?: number } | null>(null)

let chart: any = null
let mlApi: any = null

const chartTheme = computed(() => isDark.value ? 'midnight' : 'light')

onMounted(async () => {
  if (typeof window === 'undefined') return
  
  // Wait for container
  let attempts = 0;
  while (!chartContainer.value && attempts < 20) {
    await new Promise(r => setTimeout(r, 50));
    attempts++;
  }

  try {
    
    chart = createChart({
      container: chartContainer.value!,
      theme: chartTheme.value,
      showControls: true
    })

    await chart.use(PluginTools())
    
    const mlPlugin = PluginMLIntegration({
      defaultVisualization: {
        showConfidenceInterval: true,
        intervalOpacity: 0.15,
        lineStyle: { width: 3, color: '#3b82f6' }
      }
    })
    
    await chart.use(mlPlugin)
    mlApi = mlPlugin.api

    isInitialized.value = true
    initDemo()
  } catch (err) {
    console.error('MLDemo: Error during initialization', err)
  }
})

const historical = { x: [] as number[], y: [] as number[] }

function initDemo() {
  if (!chart) return

  historical.x = []
  historical.y = []
  for (let i = 0; i < 100; i++) {
    const val = i * 0.1;
    // Linear trend + oscillation + noise, so a native linear fit is meaningful.
    historical.x.push(val);
    historical.y.push(1.8 * val + Math.sin(val * 2) * 3 + (Math.random() - 0.5) * 2);
  }

  chart.addSeries({
    id: 'historical-data',
    name: 'Historical Data',
    type: 'line',
    data: { x: historical.x, y: historical.y },
    style: { color: isDark.value ? '#94a3b8' : '#64748b', width: 2 }
  })
}

async function runInference() {
    if (!mlApi || isPredicting.value) return;

    isPredicting.value = true;
    try {
        // Train a native linear-regression model in-browser (Stage 3 API).
        const training = mlApi.trainModel('native-lr', {
            x: historical.x.map((v) => [v]),
            y: historical.y
        });

        fit.value = {
            r2: training.r2,
            rmse: training.rmse,
            slope: training.coefficients[0],
            intercept: training.intercept
        };

        // Project the fitted line forward and wrap a residual-based band.
        const lastX = historical.x[historical.x.length - 1];
        const xValues: number[] = [];
        const output: number[] = [];
        const confidence: number[] = [];
        for (let i = 0; i <= 50; i++) {
            const nx = lastX + i * 0.1;
            xValues.push(nx);
            output.push(training.intercept + training.coefficients[0] * nx);
            confidence.push(1.96 * training.rmse);
        }

        mlApi.visualizePredictions(
            {
                modelId: 'native-lr',
                output: Float32Array.from(output),
                xValues: Float64Array.from(xValues),
                outputShape: [output.length],
                timestamp: Date.now(),
                processingTime: 0,
                confidence
            },
            { showConfidenceInterval: true, lineStyle: { color: '#3b82f6', width: 3 } }
        );
        chart.render();
    } catch (err) {
        console.error('Inference failed', err);
    } finally {
        isPredicting.value = false;
    }
}

function clear() {
    mlApi?.clearResults();
    fit.value = null;
}

watch(isDark, (val) => {
  if (chart) {
    chart.setTheme(chartTheme.value)
    chart.render()
  }
})

onUnmounted(() => {
  if (chart) chart.destroy()
})
</script>

<template>
  <div class="ml-demo" :class="{ dark: isDark }">
    <div class="demo-controls">
        <div class="info">
            <h3 class="title">Native Regression</h3>
            <p class="desc">In-browser linear-regression training with a residual-based confidence band.</p>
        </div>
        <div class="actions">
            <button @click="runInference" :disabled="isPredicting" class="btn-api primary">
                {{ isPredicting ? '⌛ Training...' : '📈 Train & Predict' }}
            </button>
            <button @click="clear" class="btn-api secondary">🗑️ Clear</button>
        </div>
    </div>
    <div ref="chartContainer" class="main-chart" :style="{ height: height || '400px' }"></div>
    <div v-if="fit" class="fit-info">
        <span><strong>y</strong> = {{ fit.slope?.toFixed(3) }}·x + {{ fit.intercept?.toFixed(3) }}</span>
        <span><strong>R²</strong> {{ fit.r2?.toFixed(4) }}</span>
        <span><strong>RMSE</strong> {{ fit.rmse?.toFixed(3) }}</span>
        <span>band = ±1.96·RMSE</span>
    </div>
  </div>
</template>

<style scoped>
.ml-demo {
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.demo-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(to right, #60a5fa, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.desc {
    margin: 4px 0 0 0;
    font-size: 0.85rem;
    color: #94a3b8;
}

.actions {
    display: flex;
    gap: 0.75rem;
}

.btn-api {
    border: none;
    padding: 10px 18px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-api:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-api.primary {
    background: #3b82f6;
    color: white;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.btn-api.primary:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-api.secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-api.secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.main-chart {
    background: transparent;
    border-radius: 16px;
    overflow: hidden;
}

.fit-info {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #94a3b8;
}

.fit-info strong {
    color: #60a5fa;
}
</style>
