/**
 * Core series buffer updates (line, scatter, step, band, area, error).
 */
import { Series } from "../../Series";
import {
  interleaveBandData,
  interleaveData,
  interleaveErrorData,
  interleaveStepData,
} from "../../../renderer/native/utilsCore";

export function updateSeriesBufferLite(ctx: {
  renderer: { createBuffer(id: string, data: Float32Array): void } | null;
}, s: Series): void {
  if (!ctx.renderer) return;

  const d = s.getData();
  const seriesType = s.getType();
  if (!d || d.x.length === 0) return;
  const seriesId = s.getId();

  if (seriesType === "band" || seriesType === "area") {
    const y2 =
      seriesType === "area"
        ? new Float32Array(d.x.length).fill(0)
        : d.y2 || new Float32Array(d.x.length).fill(0);
    ctx.renderer.createBuffer(seriesId, interleaveBandData(d.x, d.y, y2));
  } else {
    ctx.renderer.createBuffer(seriesId, interleaveData(d.x, d.y));
  }

  if (s.hasErrorData()) {
    const errData = interleaveErrorData(
      d.x,
      d.y,
      {
        yError: d.yError,
        yErrorMinus: d.yErrorMinus,
        yErrorPlus: d.yErrorPlus,
      },
      {
        xError: d.xError,
        xErrorMinus: d.xErrorMinus,
        xErrorPlus: d.xErrorPlus,
      },
    );
    ctx.renderer.createBuffer(`${seriesId}_errors`, errData);
  }

  if (seriesType === "step" || seriesType === "step+scatter") {
    const stepMode = s.getStyle().stepMode ?? "after";
    ctx.renderer.createBuffer(
      `${seriesId}_step`,
      interleaveStepData(d.x, d.y, stepMode),
    );
  }
  s.resetLastAppendCount();
}

export function refreshStackLite(
  ctx: {
    renderer: { createBuffer(id: string, data: Float32Array): void } | null;
    series: Map<string, Series>;
  },
  stackId: string,
): void {
  const stackSeries = Array.from(ctx.series.values()).filter(
    (s) => s.getStackId() === stackId,
  );

  let cumulativeY: Float32Array | null = null;
  for (const s of stackSeries) {
    const d = s.getData();
    if (d.x.length === 0) continue;
    if (!cumulativeY) cumulativeY = new Float32Array(d.y.length).fill(0);

    const yBaseline = new Float32Array(cumulativeY);
    for (let i = 0; i < d.y.length; i++) cumulativeY[i] += d.y[i];

    ctx.renderer?.createBuffer(
      s.getId(),
      interleaveBandData(d.x, cumulativeY, yBaseline),
    );
    s.resetLastAppendCount();
  }
}
