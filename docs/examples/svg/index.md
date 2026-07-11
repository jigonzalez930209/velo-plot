# SVG Mirror — Full Library Showcase

Un **único ejemplo interactivo** que replica todos los charts y demos 2D de Velo Plot con `renderer: 'svg'`. Misma API, mismos plugins y mismas interacciones que los ejemplos canvas/WebGL.

::: tip Bundle requirement
`renderer: 'svg'` requiere un entry extendido: `velo-plot/trading`, `velo-plot/scientific`, o `velo-plot/full`.
:::

## Uso

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({
  container: document.getElementById('chart')!,
  renderer: 'svg',
})
```

[API `renderer`](/api/chart#renderer-backend) · [Image export](/api/image-export#live-svg-renderer)

---

## Mirror completo (2D)

Navegá por categoría o usá el hash (`#trading-replay`, `#series-polar`, etc.).

<SVGFullMirror height="420px" />

---

## Fuera del mirror SVG

| Área | Motivo |
|------|--------|
| **Charts 3D** (13 ejemplos) | WebGL/WebGPU — sin homólogo vector |
| **30M points** | Solo WebGL |
| **Offscreen** | Pipeline WebGPU |

Los demos de **rendimiento extremo** aparecen como **SVG lite** (menos puntos, misma API).

---

## Stacks multi-pane

```typescript
import { createStackedChart } from 'velo-plot/trading'

const stack = createStackedChart({
  container,
  panes: [
    { id: 'price', height: 0.6, chart: { renderer: 'svg' } },
    { id: 'volume', height: 0.4, chart: { renderer: 'svg' } },
  ],
})
```
