/**
 * VeloPlot - React Component for Scientific Charts
 */

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
  type CSSProperties,
} from "react";
import { useVeloPlot, type UseVeloPlotOptions } from "./useVeloPlot";
import type { ZoomOptions, CursorOptions, Bounds } from "../types";
import type { Chart } from "../core/Chart";
import {
  diffSeries,
  applyChartA11y,
  updateA11y,
  type VeloPlotSeries,
} from "../bindings/shared";

export type { VeloPlotSeries } from "../bindings/shared";

export interface VeloPlotProps extends UseVeloPlotOptions {
  series?: VeloPlotSeries[];
  zoom?: ZoomOptions;
  onZoomChange?: (bounds: Bounds) => void;
  cursor?: CursorOptions;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  debug?: boolean;
  /** Custom aria-label for accessibility */
  ariaLabel?: string;
  /** Enable keyboard navigation (default: true) */
  keyboardNav?: boolean;
}

export interface VeloPlotRef {
  getChart: () => Chart | null;
  resetZoom: () => void;
  getBounds: () => Bounds | null;
}

export const VeloPlot = forwardRef<VeloPlotRef, VeloPlotProps>(
  function VeloPlot(
    {
      series = [],
      zoom: zoomProp,
      onZoomChange,
      cursor,
      width = "100%",
      height = 400,
      className = "",
      style = {},
      debug = false,
      ariaLabel,
      keyboardNav = true,
      ...chartOptions
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousSeriesRef = useRef<Map<string, VeloPlotSeries>>(new Map());
    const a11yRef = useRef<ReturnType<typeof applyChartA11y> | null>(null);

    const {
      chart,
      isReady,
      bounds,
      addSeries,
      updateSeries,
      removeSeries,
      resetZoom,
    } = useVeloPlot(containerRef, chartOptions);

    useImperativeHandle(
      ref,
      () => ({
        getChart: () => chart,
        resetZoom,
        getBounds: () => bounds,
      }),
      [chart, resetZoom, bounds],
    );

    useEffect(() => {
      if (!isReady || !chart) return;
      previousSeriesRef.current = diffSeries(
        { addSeries, updateSeries, removeSeries, autoScale: () => chart.autoScale() },
        series,
        previousSeriesRef.current,
      );
    }, [series, isReady, chart, addSeries, updateSeries, removeSeries]);

    useEffect(() => {
      if (!isReady || !chart || !zoomProp) return;
      chart.zoom(zoomProp);
    }, [isReady, chart, zoomProp]);

    useEffect(() => {
      if (!isReady || !chart || !onZoomChange) return;
      const handler = (event: { x: [number, number]; y: [number, number] }) => {
        onZoomChange({
          xMin: event.x[0],
          xMax: event.x[1],
          yMin: event.y[0],
          yMax: event.y[1],
        });
      };
      chart.on("zoom", handler);
      return () => chart.off("zoom", handler);
    }, [isReady, chart, onZoomChange]);

    useEffect(() => {
      if (!isReady || !chart) return;
      if (cursor?.enabled) {
        chart.enableCursor(cursor);
      } else {
        chart.disableCursor();
      }
    }, [isReady, chart, cursor]);

    useEffect(() => {
      const el = containerRef.current;
      if (!isReady || !chart || !el) return;

      a11yRef.current = applyChartA11y(el, chart, {
        label: ariaLabel,
        series,
        bounds,
        enableKeyboard: keyboardNav,
      });

      return () => {
        a11yRef.current?.cleanup();
        a11yRef.current = null;
      };
    }, [isReady, chart, keyboardNav, ariaLabel]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el || !a11yRef.current) return;
      updateA11y(el, a11yRef.current.srTable, {
        label: ariaLabel,
        series,
        bounds,
      });
    }, [series, bounds, ariaLabel]);

    const containerStyle = useMemo<CSSProperties>(
      () => ({
        position: "relative",
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        outline: "none",
        ...style,
      }),
      [width, height, style],
    );

    return (
      <div
        ref={containerRef}
        className={`velo-plot-container ${className}`}
        style={containerStyle}
      >
        {debug && bounds && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0,0,0,0.7)",
              color: "#0f0",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "monospace",
              pointerEvents: "none",
            }}
          >
            <div>
              X: [{bounds.xMin.toFixed(3)}, {bounds.xMax.toFixed(3)}]
            </div>
            <div>
              Y: [{bounds.yMin.toExponential(2)}, {bounds.yMax.toExponential(2)}]
            </div>
            <div>Series: {series.length}</div>
          </div>
        )}
      </div>
    );
  },
);

export default VeloPlot;
