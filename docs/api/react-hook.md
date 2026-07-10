---
title: useVeloPlot React Hook
description: Master the useVeloPlot hook for imperative control over your charts in React, enabling direct access to the Chart instance and custom interaction logic.
---

# useVeloPlot Hook

Low-level React hook for imperative chart control.

## Import

```tsx
import { useVeloPlot } from 'velo-plot/react'
// or
import { useVeloPlot } from 'velo-plot'
```

## Signature

```typescript
function useVeloPlot(options?: UseVeloPlotOptions): UseVeloPlotReturn
```

## Options

```typescript
interface UseVeloPlotOptions {
  xAxis?: AxisOptions
  yAxis?: AxisOptions
  theme?: string | ChartTheme
  background?: string
  showControls?: boolean
  showLegend?: boolean
}
```

Axis options accept the same fields as `createChart`, including `invertAxis` for descending scales.
The hook also inherits `layout`, so `layout.xAxisLayout.titleGap` and `layout.yAxisLayout.titleGap` can move axis labels away from the plot border.

## Returns

```typescript
interface UseVeloPlotReturn {
  containerRef: React.RefObject<HTMLDivElement>
  chart: Chart | null
  isReady: boolean
  addSeries: (options: SeriesOptions) => void
  updateSeries: (id: string, data: SeriesUpdateData) => void
  removeSeries: (id: string) => void
  zoom: (options: ZoomOptions) => void
  resetZoom: () => void
  bounds: Bounds
}
```

## Basic Usage

```tsx
import { useVeloPlot } from 'velo-plot/react'

function MyChart() {
  const { containerRef, addSeries, isReady } = useVeloPlot({
    xAxis: { label: 'Wavenumber (cm^-1)', auto: true, invertAxis: true },
    yAxis: { label: 'Y', auto: true },
    layout: {
      xAxisLayout: { titleGap: 48 },
      yAxisLayout: { titleGap: 24 },
    },
  })

  useEffect(() => {
    if (isReady) {
      addSeries({
        id: 'data',
        type: 'line',
        data: {
          x: new Float32Array([0, 1, 2, 3, 4]),
          y: new Float32Array([0, 1, 4, 9, 16]),
        },
        style: { color: '#00f2ff' },
      })
    }
  }, [isReady, addSeries])

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '400px' }}
    />
  )
}
```

## Real-time Updates

```tsx
function RealtimeChart() {
  const { containerRef, updateSeries, addSeries, isReady } = useVeloPlot()
  const dataRef = useRef({ x: new Float32Array(0), y: new Float32Array(0) })
  const tRef = useRef(0)

  useEffect(() => {
    if (!isReady) return

    addSeries({
      id: 'stream',
      type: 'line',
      data: dataRef.current,
      style: { color: '#00f2ff' },
    })

    const interval = setInterval(() => {
      const prev = dataRef.current
      const newX = new Float32Array(prev.x.length + 10)
      const newY = new Float32Array(prev.y.length + 10)
      newX.set(prev.x)
      newY.set(prev.y)

      for (let i = 0; i < 10; i++) {
        const idx = prev.x.length + i
        newX[idx] = tRef.current
        newY[idx] = Math.sin(tRef.current * 0.1)
        tRef.current += 0.1
      }

      dataRef.current = { x: newX, y: newY }
      updateSeries('stream', { x: newX, y: newY })
    }, 50)

    return () => clearInterval(interval)
  }, [isReady, addSeries, updateSeries])

  return <div ref={containerRef} style={{ height: '400px' }} />
}
```

## Accessing Chart Instance

```tsx
function ChartWithControls() {
  const { containerRef, chart, isReady, bounds } = useVeloPlot()

  const handleExport = () => {
    if (chart) {
      const dataUrl = chart.exportImage('png')
      const link = document.createElement('a')
      link.download = 'chart.png'
      link.href = dataUrl
      link.click()
    }
  }

  return (
    <div>
      <div>
        <button onClick={handleExport} disabled={!isReady}>
          Export PNG
        </button>
        <span>
          View: X[{bounds.xMin.toFixed(2)}, {bounds.xMax.toFixed(2)}]
        </span>
      </div>
      <div ref={containerRef} style={{ height: '400px' }} />
    </div>
  )
}
```

## When to Use

Use `useVeloPlot` when you need:
- Full control over chart lifecycle
- Custom container styling
- Direct access to chart instance
- Integration with complex state management

Use `<VeloPlot>` component when you want:
- Simpler declarative API
- Automatic series management
- Less boilerplate code

## useStackedPlot Hook

Multi-pane TradingView-style layouts in React.

### Import

```tsx
import { useStackedPlot } from 'velo-plot/react'
```

### Signature

```typescript
function useStackedPlot(options: UseStackedPlotOptions): UseStackedPlotReturn
```

### Returns

```typescript
interface UseStackedPlotReturn {
  containerRef: React.RefObject<HTMLDivElement>
  stack: StackedChart | null
  isReady: boolean
  fitAll: (options?: { x?: Range; padding?: number }) => void
  resetAll: () => void
}
```

### Example

```tsx
import { useEffect } from 'react'
import { useStackedPlot } from 'velo-plot/react'

function MarketCharts() {
  const { containerRef, stack, isReady, fitAll } = useStackedPlot({
    masterPaneId: 'price',
    sharedXAxis: 'bottom',
    resizable: true,
    sync: true,
    theme: 'midnight',
    panes: [
      {
        id: 'price',
        height: 0.55,
        chart: { xAxis: { type: 'time' }, yAxis: { label: 'Price' } },
        series: [{ id: 'ohlc', type: 'candlestick', data: ohlcv }],
      },
      {
        id: 'volume',
        height: 0.22,
        chart: { yAxis: { label: 'Volume', prefix: 'M' } },
        series: [{ id: 'vol', type: 'bar', data: volumeData }],
      },
      {
        id: 'rsi',
        height: 0.23,
        yRange: [0, 100],
        series: [{ id: 'rsi', type: 'line', data: rsiData }],
      },
    ],
  })

  useEffect(() => {
    if (isReady) fitAll()
  }, [isReady, fitAll])

  useEffect(() => {
    if (!stack) return
    stack.setSyncAxis('x')
    // stack.getPane('volume')?.updateSeries(...)
  }, [stack])

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />
}
```

See [Multi-Pane Example](/examples/pane-stack) and [Stacked Chart API](/api/stacked-chart).
