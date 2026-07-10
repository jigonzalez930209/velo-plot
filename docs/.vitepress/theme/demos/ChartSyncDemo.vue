<template>
  <div class="sync-demo">
    <div class="info-bar">
      <span class="badge">{{ syncMode }}</span>
      <span class="description">Zoom or pan one chart — the other follows via ChartGroup</span>
    </div>
    
    <div class="sync-controls">
      <button 
        v-for="mode in modes" 
        :key="mode.value"
        :class="{ active: syncMode === mode.value }"
        @click="setSyncMode(mode.value)"
      >
        {{ mode.label }}
      </button>
      <button class="reset-btn" @click="resetCharts">Reset View</button>
    </div>
    
    <div class="charts-container">
      <div class="chart-wrapper">
        <div class="chart-label">Chart 1 - Temperature</div>
        <div ref="chart1Container" class="chart"></div>
      </div>
      <div class="chart-wrapper">
        <div class="chart-label">Chart 2 - Humidity</div>
        <div ref="chart2Container" class="chart"></div>
      </div>
    </div>
    
    <div class="status-bar">
      <span>Cursor Sync: <strong>{{ cursorSync ? 'ON' : 'OFF' }}</strong></span>
      <label class="toggle">
        <input type="checkbox" v-model="cursorSync" @change="applyCursorSync">
        <span class="slider"></span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const chart1Container = ref<HTMLDivElement | null>(null)
const chart2Container = ref<HTMLDivElement | null>(null)
const syncMode = ref<'x' | 'y' | 'xy' | 'none'>('x')
const cursorSync = ref(true)

let chart1: any = null
let chart2: any = null
let group: any = null

const modes = [
  { value: 'x' as const, label: 'X-Axis Sync' },
  { value: 'y' as const, label: 'Y-Axis Sync' },
  { value: 'xy' as const, label: 'Both Axes' },
  { value: 'none' as const, label: 'No Sync' },
]

function generateData(points: number, baseValue: number, variance: number) {
  const x = new Float32Array(points)
  const y = new Float32Array(points)
  
  let value = baseValue
  for (let i = 0; i < points; i++) {
    x[i] = i
    value += (Math.random() - 0.5) * variance + Math.sin(i / 30) * variance * 0.5
    y[i] = value
  }
  
  return { x, y }
}

function setSyncMode(mode: 'x' | 'y' | 'xy' | 'none') {
  syncMode.value = mode
  group?.syncAxis(mode)
  const enabled = mode !== 'none'
  group?.syncZoom(enabled)
  group?.syncPan(enabled)
}

function applyCursorSync() {
  group?.syncCursor(cursorSync.value)
}

function resetCharts() {
  group?.resetAll()
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  if (!chart1Container.value || !chart2Container.value) return
  
  const { createChart, linkCharts } = await import('@src/index')
  
  chart1 = createChart({
    container: chart1Container.value,
    xAxis: { label: 'Time (s)' },
    yAxis: { label: 'Temperature (°C)' },
    theme: 'midnight',
    showControls: false,
    animation: { enabled: false },
  })
  
  if (chart1.setAnimationConfig) {
    chart1.setAnimationConfig({ enabled: false })
  }
  
  const tempData = generateData(300, 25, 3)
  chart1.addSeries({
    id: 'temp',
    type: 'line',
    data: { x: tempData.x, y: tempData.y },
    style: { color: '#ff6b6b', width: 1.5 },
  })
  
  chart1.autoScale(false)
  
  chart2 = createChart({
    container: chart2Container.value,
    xAxis: { label: 'Time (s)' },
    yAxis: { label: 'Humidity (%)' },
    theme: 'midnight',
    showControls: false,
    animation: { enabled: false },
  })
  
  if (chart2.setAnimationConfig) {
    chart2.setAnimationConfig({ enabled: false })
  }
  
  const humidityData = generateData(300, 60, 5)
  chart2.addSeries({
    id: 'humidity',
    type: 'line',
    data: { x: humidityData.x, y: humidityData.y },
    style: { color: '#4ecdc4', width: 1.5 },
  })
  
  chart2.autoScale(false)
  
  group = linkCharts(chart1, chart2, {
    axis: syncMode.value,
    syncCursor: cursorSync.value,
    syncZoom: true,
    syncPan: true,
    bidirectional: true,
  })
})

onUnmounted(() => {
  group?.destroy()
  chart1?.destroy()
  chart2?.destroy()
})
</script>

<style scoped>
.sync-demo {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 16px;
}

.info-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.badge {
  background: linear-gradient(135deg, #00f2ff, #4ecdc4);
  color: #000;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.description {
  color: #a0aec0;
  font-size: 14px;
}

.sync-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.sync-controls button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #a0aec0;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.sync-controls button:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.sync-controls button.active {
  background: rgba(0, 242, 255, 0.15);
  border-color: #00f2ff;
  color: #00f2ff;
}

.reset-btn {
  margin-left: auto;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-wrapper {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
}

.chart-label {
  color: #718096;
  font-size: 12px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart {
  height: 250px;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  color: #718096;
  font-size: 13px;
}

.status-bar strong {
  color: #00f2ff;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #718096;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: rgba(0, 242, 255, 0.3);
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: #00f2ff;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
