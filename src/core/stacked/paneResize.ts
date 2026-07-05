/**
 * VS Code–style drag dividers between stacked chart panes (vertical or horizontal).
 */

import { STACKED_DEFAULT_MIN_PANE_RATIO } from "./types";
import type { StackDirection } from "./types";

export interface PaneResizeOptions {
  /** Stack layout direction */
  direction?: StackDirection;
  /** Min pane size as fraction of available stack dimension (default 1/6) */
  minPaneRatio?: number;
  /** Absolute min pane size in px */
  minPanePx?: number;
  /** Divider hit area size (default 6) */
  dividerSize?: number;
  onResize?: (ratiosById: Record<string, number>) => void;
  onDragStart?: (leadingIdx: number, trailingIdx: number) => number[];
  onDragMove?: (sizesPx: number[], leadingIdx: number, trailingIdx: number) => void;
  onDragEnd?: (finalSizesPx: number[]) => void;
}

const DIVIDER_CLASS = "velo-pane-divider";
const RESIZING_CLASS = "velo-pane-resizing";

function injectDividerStyles(direction: StackDirection): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById("velo-pane-divider-styles") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "velo-pane-divider-styles";
    document.head.appendChild(style);
  }

  const isHorizontal = direction === "horizontal";
  const cursor = isHorizontal ? "ew-resize" : "ns-resize";
  const handleGlyph = isHorizontal ? "⇔" : "⇕";

  style.textContent = `
    .${DIVIDER_CLASS} {
      flex: 0 0 var(--velo-divider-size, 6px);
      position: relative;
      cursor: ${cursor};
      touch-action: none;
      z-index: 20;
      background: transparent;
      user-select: none;
    }
    .${DIVIDER_CLASS}::after {
      content: "";
      position: absolute;
      background: rgba(128, 128, 128, 0.35);
      transition: background 0.15s;
    }
    .${DIVIDER_CLASS}[data-direction="vertical"]::after {
      left: 0;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 1px;
    }
    .${DIVIDER_CLASS}[data-direction="horizontal"]::after {
      top: 0;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
    }
    .${DIVIDER_CLASS}:hover::after,
    .${RESIZING_CLASS} .${DIVIDER_CLASS}::after {
      background: rgba(0, 242, 255, 0.65);
    }
    .${DIVIDER_CLASS}[data-direction="vertical"]:hover::after,
    .${RESIZING_CLASS} .${DIVIDER_CLASS}[data-direction="vertical"]::after {
      height: 2px;
    }
    .${DIVIDER_CLASS}[data-direction="horizontal"]:hover::after,
    .${RESIZING_CLASS} .${DIVIDER_CLASS}[data-direction="horizontal"]::after {
      width: 2px;
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
      cursor: ${cursor} !important;
    }
    .${RESIZING_CLASS} * {
      cursor: ${cursor} !important;
    }
    .${RESIZING_CLASS} [data-pane-id] {
      position: relative !important;
      overflow: hidden !important;
    }
  `;

  void handleGlyph;
}

function createDividerElement(index: number, size: number, direction: StackDirection): HTMLDivElement {
  const divider = document.createElement("div");
  divider.className = DIVIDER_CLASS;
  divider.dataset.dividerIndex = String(index);
  divider.dataset.direction = direction;
  divider.style.setProperty("--velo-divider-size", `${size}px`);

  const handle = document.createElement("div");
  handle.className = `${DIVIDER_CLASS}-handle`;
  handle.textContent = direction === "horizontal" ? "⇔" : "⇕";
  divider.appendChild(handle);

  return divider;
}

export interface PaneResizeController {
  dividers: HTMLDivElement[];
  destroy: () => void;
}

function paneFlexStyle(ratio: number | string, direction: StackDirection): string {
  const minDim = direction === "horizontal" ? "min-width:0;" : "min-height:0;";
  if (typeof ratio === "number") {
    return `flex:${ratio} 1 0;${minDim}`;
  }
  return `flex:1 1 ${ratio};${minDim}`;
}

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

export function resolveMinPaneWidthPx(
  availWidth: number,
  paneCount: number,
  minPaneRatio = STACKED_DEFAULT_MIN_PANE_RATIO,
  minPanePx = 0,
): number {
  return resolveMinPaneHeightPx(availWidth, paneCount, minPaneRatio, minPanePx);
}

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

export const normalizePaneWidths = normalizePaneHeights;

export function attachPaneResize(
  container: HTMLDivElement,
  paneWrappers: HTMLDivElement[],
  paneIds: string[],
  ratios: number[],
  options: PaneResizeOptions = {},
): PaneResizeController {
  const direction = options.direction ?? "vertical";
  const isHorizontal = direction === "horizontal";
  injectDividerStyles(direction);

  const minPaneRatio = options.minPaneRatio ?? STACKED_DEFAULT_MIN_PANE_RATIO;
  const minPanePx = options.minPanePx ?? 0;
  const dividerSize = options.dividerSize ?? 6;
  const paneCount = paneWrappers.length;

  const minPaneSize = (avail: number) =>
    isHorizontal
      ? resolveMinPaneWidthPx(avail, paneCount, minPaneRatio, minPanePx)
      : resolveMinPaneHeightPx(avail, paneCount, minPaneRatio, minPanePx);

  const dividers: HTMLDivElement[] = [];
  const cleanups: (() => void)[] = [];

  if (paneWrappers.length < 2) {
    return { dividers, destroy: () => {} };
  }

  const availableSize = (): number => {
    const dividerTotal = dividers.length * dividerSize;
    const main = isHorizontal ? container.clientWidth : container.clientHeight;
    return Math.max(1, main - dividerTotal);
  };

  const applyRatios = (
    leadingIdx: number,
    trailingIdx: number,
    delta: number,
    sizesPx: number[],
  ) => {
    const avail = availableSize();
    const minS = minPaneSize(avail);

    const othersSum = sizesPx.reduce(
      (s, h, idx) => (idx === leadingIdx || idx === trailingIdx ? s : s + h),
      0,
    );
    const pairTotal = avail - othersSum;

    let leadingSize = sizesPx[leadingIdx] + delta;
    leadingSize = Math.max(minS, Math.min(pairTotal - minS, leadingSize));
    const trailingSize = pairTotal - leadingSize;

    sizesPx[leadingIdx] = leadingSize;
    sizesPx[trailingIdx] = trailingSize;

    const total = ratios.reduce((s, r) => s + r, 0);
    ratios[leadingIdx] = (leadingSize / avail) * total;
    ratios[trailingIdx] = (trailingSize / avail) * total;

    options.onDragMove?.(sizesPx, leadingIdx, trailingIdx);

    if (options.onResize) {
      const byId: Record<string, number> = {};
      for (let i = 0; i < paneIds.length; i++) {
        byId[paneIds[i]] = ratios[i];
      }
      options.onResize(byId);
    }
  };

  for (let i = 0; i < paneWrappers.length - 1; i++) {
    const divider = createDividerElement(i, dividerSize, direction);
    const leadingWrapper = paneWrappers[i];
    leadingWrapper.after(divider);
    dividers.push(divider);

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      divider.setPointerCapture(e.pointerId);
      container.classList.add(RESIZING_CLASS);

      const sizesPx =
        options.onDragStart?.(i, i + 1) ??
        paneWrappers.map((w) =>
          isHorizontal ? w.getBoundingClientRect().width : w.getBoundingClientRect().height,
        );

      options.onDragMove?.(sizesPx, i, i + 1);

      let lastCoord = isHorizontal ? e.clientX : e.clientY;

      const onMove = (ev: PointerEvent) => {
        const coord = isHorizontal ? ev.clientX : ev.clientY;
        const d = coord - lastCoord;
        lastCoord = coord;
        if (d !== 0) applyRatios(i, i + 1, d, sizesPx);
      };

      const onUp = (ev: PointerEvent) => {
        divider.releasePointerCapture(ev.pointerId);
        container.classList.remove(RESIZING_CLASS);
        divider.removeEventListener("pointermove", onMove);
        divider.removeEventListener("pointerup", onUp);
        divider.removeEventListener("pointercancel", onUp);
        options.onDragEnd?.(sizesPx);
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
  direction: StackDirection = "vertical",
): void {
  for (let i = 0; i < paneWrappers.length; i++) {
    paneWrappers[i].style.cssText = `${paneFlexStyle(ratios[i], direction)}position:relative;overflow:hidden;`;
  }
}

export function initialPaneRatio(height: number | string): number {
  return typeof height === "number" ? height : 1;
}

export { paneFlexStyle };
