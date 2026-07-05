/**
 * VS Code–style drag dividers between stacked chart panes.
 */

import { STACKED_DEFAULT_MIN_PANE_RATIO } from "./types";

export interface PaneResizeOptions {
  /** Min pane height as fraction of available height (default 1/6) */
  minPaneRatio?: number;
  /** Absolute min pane height in px — used when larger than ratio-based min */
  minPanePx?: number;
  /** Divider hit area height (default 6) */
  dividerSize?: number;
  /** Called while dragging with normalized flex ratios keyed by pane id */
  onResize?: (ratiosById: Record<string, number>) => void;
  /** Called when divider drag starts — return initial pane heights for this drag session */
  onDragStart?: (topIdx: number, bottomIdx: number) => number[];
  /** Called each pointer move (batched to rAF by consumer) with updated heights */
  onDragMove?: (
    heightsPx: number[],
    topIdx: number,
    bottomIdx: number,
  ) => void;
  /** Called when divider drag ends — perform chart resize here */
  onDragEnd?: (finalHeightsPx: number[]) => void;
}

const DIVIDER_CLASS = "velo-pane-divider";
const RESIZING_CLASS = "velo-pane-resizing";

function injectDividerStyles(): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById("velo-pane-divider-styles") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "velo-pane-divider-styles";
    document.head.appendChild(style);
  }
  style.textContent = `
    .${DIVIDER_CLASS} {
      flex: 0 0 var(--velo-divider-size, 6px);
      position: relative;
      cursor: ns-resize;
      touch-action: none;
      z-index: 20;
      background: transparent;
      user-select: none;
    }
    .${DIVIDER_CLASS}::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 1px;
      background: rgba(128, 128, 128, 0.35);
      transition: background 0.15s, height 0.15s;
    }
    .${DIVIDER_CLASS}:hover::after,
    .${RESIZING_CLASS} .${DIVIDER_CLASS}::after {
      height: 2px;
      background: rgba(0, 242, 255, 0.65);
    }
    .${DIVIDER_CLASS}-handle {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s;
      pointer-events: none;
      color: rgba(0, 242, 255, 0.9);
      font-size: 10px;
      line-height: 1;
    }
    .${DIVIDER_CLASS}:hover .${DIVIDER_CLASS}-handle,
    .${RESIZING_CLASS} .${DIVIDER_CLASS}-handle {
      opacity: 1;
    }
    .${RESIZING_CLASS} {
      cursor: ns-resize !important;
    }
    .${RESIZING_CLASS} * {
      cursor: ns-resize !important;
    }
    .${RESIZING_CLASS} [data-pane-id] {
      position: relative !important;
      overflow: hidden !important;
    }
  `;
}

function createDividerElement(index: number, size: number): HTMLDivElement {
  const divider = document.createElement("div");
  divider.className = DIVIDER_CLASS;
  divider.dataset.dividerIndex = String(index);
  divider.style.setProperty("--velo-divider-size", `${size}px`);

  const handle = document.createElement("div");
  handle.className = `${DIVIDER_CLASS}-handle`;
  handle.textContent = "⇕";
  divider.appendChild(handle);

  return divider;
}

export interface PaneResizeController {
  dividers: HTMLDivElement[];
  destroy: () => void;
}

function paneFlexStyle(height: number | string): string {
  if (typeof height === "number") {
    return `flex:${height} 1 0;min-height:0;`;
  }
  return `flex:1 1 ${height};min-height:0;`;
}

/** Resolve per-pane minimum height in px for the current available stack height. */
export function resolveMinPaneHeightPx(
  availHeight: number,
  paneCount: number,
  minPaneRatio = STACKED_DEFAULT_MIN_PANE_RATIO,
  minPanePx = 0,
): number {
  if (paneCount < 1 || availHeight <= 0) return 1;
  const byRatio = availHeight * minPaneRatio;
  const minH = Math.max(minPanePx, byRatio);
  return Math.min(minH, availHeight / paneCount);
}

/**
 * Scale pane heights to exactly fill available space (fixes sub-pixel gaps during drag).
 */
export function normalizePaneHeights(heightsPx: number[], targetTotal: number): number[] {
  const n = heightsPx.length;
  if (n === 0) return heightsPx;
  const total = Math.max(1, Math.round(targetTotal));
  const sum = heightsPx.reduce((s, h) => s + h, 0);
  if (sum <= 0) {
    const even = Math.floor(total / n);
    const out = heightsPx.map(() => even);
    out[n - 1] = total - even * (n - 1);
    return out;
  }

  const scaled = heightsPx.map((h) => (h / sum) * total);
  const out: number[] = [];
  let allocated = 0;
  for (let i = 0; i < n - 1; i++) {
    out.push(Math.max(1, Math.round(scaled[i])));
    allocated += out[i];
  }
  out.push(Math.max(1, total - allocated));
  return out;
}

export function attachPaneResize(
  container: HTMLDivElement,
  paneWrappers: HTMLDivElement[],
  paneIds: string[],
  ratios: number[],
  options: PaneResizeOptions = {},
): PaneResizeController {
  injectDividerStyles();

  const minPaneRatio = options.minPaneRatio ?? STACKED_DEFAULT_MIN_PANE_RATIO;
  const minPanePx = options.minPanePx ?? 0;
  const dividerSize = options.dividerSize ?? 6;
  const paneCount = paneWrappers.length;

  const minPaneHeight = (avail: number) =>
    resolveMinPaneHeightPx(avail, paneCount, minPaneRatio, minPanePx);
  const dividers: HTMLDivElement[] = [];
  const cleanups: (() => void)[] = [];

  if (paneWrappers.length < 2) {
    return { dividers, destroy: () => {} };
  }

  const availableHeight = (): number => {
    const dividerTotal = dividers.length * dividerSize;
    return Math.max(1, container.clientHeight - dividerTotal);
  };

  const applyRatios = (
    topIdx: number,
    bottomIdx: number,
    deltaY: number,
    heightsPx: number[],
  ) => {
    const avail = availableHeight();
    const minH = minPaneHeight(avail);

    const othersSum = heightsPx.reduce(
      (s, h, idx) => (idx === topIdx || idx === bottomIdx ? s : s + h),
      0,
    );
    const pairTotal = avail - othersSum;

    let topH = heightsPx[topIdx] + deltaY;
    topH = Math.max(minH, Math.min(pairTotal - minH, topH));
    const bottomH = pairTotal - topH;

    heightsPx[topIdx] = topH;
    heightsPx[bottomIdx] = bottomH;

    const total = ratios.reduce((s, r) => s + r, 0);
    ratios[topIdx] = (topH / avail) * total;
    ratios[bottomIdx] = (bottomH / avail) * total;

    options.onDragMove?.(heightsPx, topIdx, bottomIdx);

    if (options.onResize) {
      const byId: Record<string, number> = {};
      for (let i = 0; i < paneIds.length; i++) {
        byId[paneIds[i]] = ratios[i];
      }
      options.onResize(byId);
    }
  };

  for (let i = 0; i < paneWrappers.length - 1; i++) {
    const divider = createDividerElement(i, dividerSize);
    const topWrapper = paneWrappers[i];
    topWrapper.after(divider);
    dividers.push(divider);

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      divider.setPointerCapture(e.pointerId);
      container.classList.add(RESIZING_CLASS);

      const heightsPx =
        options.onDragStart?.(i, i + 1) ??
        paneWrappers.map((w) => w.getBoundingClientRect().height);

      options.onDragMove?.(heightsPx, i, i + 1);

      let lastY = e.clientY;

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - lastY;
        lastY = ev.clientY;
        if (dy !== 0) applyRatios(i, i + 1, dy, heightsPx);
      };

      const onUp = (ev: PointerEvent) => {
        divider.releasePointerCapture(ev.pointerId);
        container.classList.remove(RESIZING_CLASS);
        divider.removeEventListener("pointermove", onMove);
        divider.removeEventListener("pointerup", onUp);
        divider.removeEventListener("pointercancel", onUp);
        options.onDragEnd?.(heightsPx);
      };

      divider.addEventListener("pointermove", onMove);
      divider.addEventListener("pointerup", onUp);
      divider.addEventListener("pointercancel", onUp);
    };

    divider.addEventListener("pointerdown", onPointerDown);
    cleanups.push(() => divider.removeEventListener("pointerdown", onPointerDown));
  }

  return {
    dividers,
    destroy: () => {
      for (const fn of cleanups) fn();
      for (const d of dividers) d.remove();
      container.classList.remove(RESIZING_CLASS);
    },
  };
}

export function applyPaneFlexRatios(
  paneWrappers: HTMLDivElement[],
  ratios: number[],
): void {
  for (let i = 0; i < paneWrappers.length; i++) {
    paneWrappers[i].style.cssText = `${paneFlexStyle(ratios[i])}position:relative;overflow:hidden;`;
  }
}

export function initialPaneRatio(height: number | string): number {
  return typeof height === "number" ? height : 1;
}
