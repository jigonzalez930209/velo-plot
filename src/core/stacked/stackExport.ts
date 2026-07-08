/**
 * Full-stack snapshot export — composes all pane charts at exact layout positions.
 */

import type { Chart } from "../chart/types";

export type StackExportFormat = "png" | "jpeg" | "webp";
export type StackExportResolution = "standard" | "2k" | "4k" | "8k" | number;

export interface StackExportOptions {
  format?: StackExportFormat;
  quality?: number;
  resolution?: StackExportResolution;
  includeBackground?: boolean;
  includeDividers?: boolean;
  transparent?: boolean;
}

/** @internal Exported for unit tests */
export function stackResolutionScale(res: StackExportResolution): number {
  if (typeof res === "number") return res;
  switch (res) {
    case "8k":
      return 8;
    case "4k":
      return 4;
    case "2k":
      return 2;
    default:
      return 1;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function relativeRect(
  el: HTMLElement,
  containerRect: DOMRect,
): { x: number; y: number; width: number; height: number } {
  const r = el.getBoundingClientRect();
  return {
    x: r.left - containerRect.left,
    y: r.top - containerRect.top,
    width: r.width,
    height: r.height,
  };
}

/**
 * Compose every pane chart into one raster image matching the on-screen stack layout.
 */
export async function exportStackImage(
  container: HTMLDivElement,
  paneWrappers: HTMLDivElement[],
  paneCharts: Chart[],
  dividers: HTMLDivElement[],
  backgroundColor: string,
  options: StackExportOptions = {},
): Promise<string> {
  const {
    format = "png",
    quality = 0.92,
    resolution = "standard",
    includeBackground = true,
    includeDividers = true,
    transparent = false,
  } = options;

  const scale = stackResolutionScale(resolution);
  const baseDpr = paneCharts[0]?.getDPR() ?? (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  const exportDpr = baseDpr * scale;
  const originalDprs = paneCharts.map((c) => c.getDPR());

  try {
    if (scale > 1) {
      for (const chart of paneCharts) {
        // Lock the DPR so the enlarged backing store survives the resize() that
        // setDPR/exportImage would otherwise revert (see ChartCore.resize).
        if (typeof chart.setDevicePixelRatioOverride === "function") {
          chart.setDevicePixelRatioOverride(exportDpr);
        } else {
          chart.setDPR(exportDpr);
        }
        chart.render();
      }
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 50));
    }

    const containerRect = container.getBoundingClientRect();
    const outW = Math.max(1, Math.round(containerRect.width * exportDpr));
    const outH = Math.max(1, Math.round(containerRect.height * exportDpr));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create export canvas");

    if (!transparent && includeBackground) {
      ctx.fillStyle = backgroundColor || "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }

    const imageType = format === "jpeg" ? "jpeg" : "png";

    for (let i = 0; i < paneWrappers.length; i++) {
      const rect = relativeRect(paneWrappers[i], containerRect);
      const dataUrl = paneCharts[i].exportImage(imageType);
      const img = await loadImage(dataUrl);
      ctx.drawImage(
        img,
        Math.round(rect.x * exportDpr),
        Math.round(rect.y * exportDpr),
        Math.round(rect.width * exportDpr),
        Math.round(rect.height * exportDpr),
      );
    }

    if (includeDividers && dividers.length) {
      ctx.fillStyle = "rgba(128, 128, 128, 0.35)";
      for (const divider of dividers) {
        const rect = relativeRect(divider, containerRect);
        ctx.fillRect(
          Math.round(rect.x * exportDpr),
          Math.round(rect.y * exportDpr),
          Math.max(1, Math.round(rect.width * exportDpr)),
          Math.max(1, Math.round(rect.height * exportDpr)),
        );
      }
    }

    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    return canvas.toDataURL(mime, quality);
  } finally {
    if (scale > 1) {
      for (let i = 0; i < paneCharts.length; i++) {
        if (typeof paneCharts[i].setDevicePixelRatioOverride === "function") {
          paneCharts[i].setDevicePixelRatioOverride!(null);
        } else {
          paneCharts[i].setDPR(originalDprs[i]);
        }
        paneCharts[i].render();
      }
    }
  }
}
