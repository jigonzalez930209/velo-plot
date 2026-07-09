import { createEffect } from "solid-js";
import { useVeloPlot, type UseVeloPlotOptions } from "./useVeloPlot";
import { useStackedPlot } from "./useStackedPlot";
import { diffSeries, type VeloPlotSeries } from "../bindings/shared";

export interface VeloPlotProps extends UseVeloPlotOptions {
  series?: VeloPlotSeries[];
  width?: number | string;
  height?: number | string;
  class?: string;
}

export function VeloPlot(props: VeloPlotProps) {
  const api = useVeloPlot(() => props);
  let previous = new Map<string, VeloPlotSeries>();

  createEffect(() => {
    if (!api.isReady() || !api.chart()) return;
    previous = diffSeries(
      {
        addSeries: api.addSeries,
        updateSeries: api.updateSeries,
        removeSeries: api.removeSeries,
        autoScale: () => api.chart()!.autoScale(),
      },
      props.series ?? [],
      previous,
    );
  });

  return (
    <div
      ref={(el) => api.setContainerRef(el)}
      className={`velo-plot-container${props.class ? ` ${props.class}` : ""}`}
      role="img"
      style={{
        position: "relative",
        width: typeof props.width === "number" ? `${props.width}px` : props.width ?? "100%",
        height: typeof props.height === "number" ? `${props.height}px` : props.height ?? "400px",
      }}
    />
  );
}

export function StackedPlot(
  props: {
    panes: import("../core/stacked").StackedPaneConfig[];
    width?: number | string;
    height?: number | string;
    class?: string;
  } & Omit<import("../core/stacked").StackedChartOptions, "container" | "panes">,
) {
  const api = useStackedPlot(() => props);
  createEffect(() => api.sync());

  return (
    <div
      ref={(el) => api.setContainerRef(el)}
      className={`velo-plot-stacked${props.class ? ` ${props.class}` : ""}`}
      role="img"
      style={{
        position: "relative",
        width: typeof props.width === "number" ? `${props.width}px` : props.width ?? "100%",
        height: typeof props.height === "number" ? `${props.height}px` : props.height ?? "480px",
      }}
    />
  );
}
