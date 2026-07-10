/**
 * StackedPlot - Declarative React component for multi-pane charts
 */

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  type CSSProperties,
} from "react";
import { useStackedPlot, type UseStackedPlotOptions } from "./useStackedPlot";
import type { StackedChart } from "../core/stacked";
import type { Bounds } from "../types";
import type { AddIndicatorOptions } from "../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../core/indicator/indicatorPresets";

export interface StackedPlotIndicator extends AddIndicatorOptions {
  type: IndicatorPresetName;
}

export interface StackedPlotProps extends UseStackedPlotOptions {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  indicators?: StackedPlotIndicator[];
  onCrosshairMove?: (event: { price?: number; x: number }) => void;
  drawingTools?: string[];
  ariaLabel?: string;
}

export interface StackedPlotRef {
  getStack: () => StackedChart | null;
  fitAll: () => void;
  resetAll: () => void;
  getBounds: () => Bounds | null;
}

export const StackedPlot = forwardRef<StackedPlotRef, StackedPlotProps>(
  function StackedPlot(
    {
      width = "100%",
      height = 480,
      className = "",
      style = {},
      indicators: _indicators,
      onCrosshairMove: _onCrosshairMove,
      drawingTools: _drawingTools,
      ariaLabel,
      panes,
      ...stackOptions
    },
    ref,
  ) {
    const { containerRef, stack, isReady, fitAll, resetAll } = useStackedPlot({
      panes,
      ...stackOptions,
    });

    useImperativeHandle(
      ref,
      () => ({
        getStack: () => stack,
        fitAll: () => fitAll(),
        resetAll,
        getBounds: () => stack?.getMaster().getViewBounds() ?? null,
      }),
      [stack, fitAll, resetAll],
    );

    const containerStyle = useMemo<CSSProperties>(
      () => ({
        position: "relative",
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }),
      [width, height, style],
    );

    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`velo-plot-stacked ${className}`}
        style={containerStyle}
        role="img"
        aria-label={ariaLabel ?? `Stacked chart with ${panes.length} panes`}
        data-ready={isReady ? "true" : "false"}
      />
    );
  },
);

export default StackedPlot;
