import { inject, type InjectionKey, type Ref } from 'vue'
import { withBase } from 'vitepress'

export type DemoRenderer = 'svg' | 'webgl'

export const DEMO_RENDERER_KEY: InjectionKey<Ref<DemoRenderer>> = Symbol('veloDemoRenderer')

/** Resolve a docs path against the VitePress site base (e.g. `/velo-plot/`). */
export function docsHref(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:|#|mailto:)/.test(path)) return path
  return withBase(path.startsWith('/') ? path : `/${path}`)
}

/** Read injected renderer from SVGDemoShell (defaults to webgl). */
export function useDemoRenderer(fallback: DemoRenderer = 'webgl'): DemoRenderer {
  const injected = inject(DEMO_RENDERER_KEY, null)
  return injected?.value ?? fallback
}

/** Merge chart options with an explicit renderer (call from Vue setup / onMounted). */
export function withDemoRenderer<T extends Record<string, unknown>>(
  options: T,
  renderer: DemoRenderer,
): T & { renderer: DemoRenderer } {
  return { ...options, renderer };
}

/** Apply renderer to each pane in a stacked chart config. */
export function applyRendererToStackPanes<T extends { chart?: Record<string, unknown> }>(
  panes: T[],
  renderer: DemoRenderer = 'svg',
): T[] {
  return panes.map((pane) => ({
    ...pane,
    chart: { ...pane.chart, renderer },
  }))
}
