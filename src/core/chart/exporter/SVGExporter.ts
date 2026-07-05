/**
 * SVG Export Support
 */
import { Series } from "../../Series";
import type { AxisOptions, Bounds, PlotArea } from "../../../types";
import { Scale } from "../../../scales";
import { ChartTheme } from "../../../theme";
import { formatXTickValue, formatYTickValue } from "../../format/axisFormat";
import { snapLabelCoord, snapLineCoord } from "../../render/pixelSnap";

export interface SVGExportOptions {
  xAxis?: AxisOptions;
  yAxis?: AxisOptions;
  primaryYAxisId?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function primaryYScale(yAxes: Map<string, Scale>, primaryYAxisId?: string): Scale | undefined {
  if (primaryYAxisId && yAxes.has(primaryYAxisId)) {
    return yAxes.get(primaryYAxisId);
  }
  return yAxes.get("default") ?? yAxes.values().next().value;
}

export function exportToSVG(
  series: Series[],
  _viewBounds: Bounds,
  plotArea: PlotArea,
  xAxis: Scale,
  yAxes: Map<string, Scale>,
  theme: ChartTheme,
  width: number,
  height: number,
  axisOptions: SVGExportOptions = {},
): string {
  const yScale = primaryYScale(yAxes, axisOptions.primaryYAxisId);
  if (!yScale) {
    throw new Error("SVG export requires at least one Y scale");
  }

  const svg = [
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.xAxis.fontFamily || "sans-serif"}">`,
    `<rect width="100%" height="100%" fill="${theme.backgroundColor}" />`,
    `<g transform="translate(0,0)">`,
  ];

  drawSVGGrid(svg, plotArea, xAxis, yScale, theme);
  drawSeriesSVG(svg, series, plotArea, xAxis, yAxes, axisOptions.primaryYAxisId);
  drawSVGAxes(svg, plotArea, xAxis, yScale, theme);
  drawSVGTickLabels(svg, plotArea, xAxis, yScale, theme, axisOptions);

  svg.push("</g>");
  svg.push("</svg>");
  return svg.join("\n");
}

function drawSeriesSVG(
  svg: string[],
  series: Series[],
  plotArea: PlotArea,
  xAxis: Scale,
  yAxes: Map<string, Scale>,
  primaryYAxisId?: string,
): void {
  for (const s of series) {
    if (!s.isVisible()) continue;
    const yScale =
      yAxes.get(s.getYAxisId() || primaryYAxisId || "default") ??
      primaryYScale(yAxes, primaryYAxisId);
    if (!yScale) continue;

    const data = s.getData();
    if (!data || data.x.length === 0) continue;

    const style = s.getStyle() as Record<string, unknown>;
    const type = s.getType();

    if (type === "line" || type === "step") {
      const points: string[] = [];
      const stepMode = (style.stepMode as string) || "after";
      for (let i = 0; i < data.x.length; i++) {
        const px = xAxis.transform(data.x[i]);
        const py = yScale.transform(data.y[i]);
        if (i > 0 && type === "step") {
          const prevPx = xAxis.transform(data.x[i - 1]);
          const prevPy = yScale.transform(data.y[i - 1]);
          if (stepMode === "after") points.push(`${px.toFixed(1)},${prevPy.toFixed(1)}`);
          else if (stepMode === "before") points.push(`${prevPx.toFixed(1)},${py.toFixed(1)}`);
          else if (stepMode === "center") {
            const midX = (prevPx + px) / 2;
            points.push(`${midX.toFixed(1)},${prevPy.toFixed(1)}`);
            points.push(`${midX.toFixed(1)},${py.toFixed(1)}`);
          }
        }
        points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }
      svg.push(
        `<polyline points="${points.join(" ")}" fill="none" stroke="${style.color}" stroke-width="${style.width || 1.5}" stroke-opacity="${style.opacity || 1}" stroke-linejoin="round" />`,
      );
    } else if (type === "scatter") {
      for (let i = 0; i < data.x.length; i++) {
        const px = xAxis.transform(data.x[i]);
        const py = yScale.transform(data.y[i]);
        svg.push(
          `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(((style.pointSize as number) || 4) / 2).toFixed(1)}" fill="${style.color}" fill-opacity="${style.opacity || 1}" />`,
        );
      }
    } else if (type === "bar") {
      const barWidth =
        ((style.barWidth as number) || 5) *
        (plotArea.width / (xAxis.domain[1] - xAxis.domain[0]));
      for (let i = 0; i < data.x.length; i++) {
        const px = xAxis.transform(data.x[i]);
        const py = yScale.transform(data.y[i]);
        const p0 = yScale.transform(0);
        const yTop = Math.min(py, p0);
        const yHeight = Math.abs(py - p0);
        svg.push(
          `<rect x="${(px - barWidth / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${yHeight.toFixed(1)}" fill="${style.color}" fill-opacity="${style.opacity || 1}" />`,
        );
      }
    } else if (type === "band" || type === "area") {
      const y2 =
        type === "area"
          ? new Float32Array(data.x.length).fill(0)
          : data.y2 || new Float32Array(data.x.length).fill(0);
      const points: string[] = [];
      for (let i = 0; i < data.x.length; i++) {
        points.push(
          `${xAxis.transform(data.x[i]).toFixed(1)},${yScale.transform(data.y[i]).toFixed(1)}`,
        );
      }
      for (let i = data.x.length - 1; i >= 0; i--) {
        points.push(
          `${xAxis.transform(data.x[i]).toFixed(1)},${yScale.transform(y2[i]).toFixed(1)}`,
        );
      }
      svg.push(
        `<polygon points="${points.join(" ")}" fill="${style.color}" fill-opacity="${(Number(style.opacity) || 1) * 0.3}" stroke="${style.color}" stroke-width="${style.width || 1}" />`,
      );
    } else if (type === "candlestick") {
      const bw =
        ((style.barWidth as number) || 5) *
        (plotArea.width / (xAxis.domain[1] - xAxis.domain[0]));
      const bullishColor = (style.bullishColor as string) || "#26a69a";
      const bearishColor = (style.bearishColor as string) || "#ef5350";
      if (data.open && data.high && data.low && data.close) {
        for (let i = 0; i < data.x.length; i++) {
          const isBull = data.close[i] >= data.open[i];
          const px = xAxis.transform(data.x[i]);
          const pyOpen = yScale.transform(data.open[i]);
          const pyClose = yScale.transform(data.close[i]);
          const pyHigh = yScale.transform(data.high[i]);
          const pyLow = yScale.transform(data.low[i]);
          const color = isBull ? bullishColor : bearishColor;
          svg.push(
            `<line x1="${px.toFixed(1)}" y1="${pyHigh.toFixed(1)}" x2="${px.toFixed(1)}" y2="${pyLow.toFixed(1)}" stroke="${color}" stroke-width="1" />`,
          );
          const yTop = Math.min(pyOpen, pyClose);
          const yHeight = Math.max(1, Math.abs(pyOpen - pyClose));
          svg.push(
            `<rect x="${(px - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${yHeight.toFixed(1)}" fill="${color}" />`,
          );
        }
      }
    }
  }
}

function drawSVGAxes(
  svg: string[],
  plotArea: PlotArea,
  _xAxis: Scale,
  _yScale: Scale,
  theme: ChartTheme,
): void {
  const axisY = snapLineCoord(plotArea.y + plotArea.height);
  const axisX = snapLineCoord(plotArea.x);
  svg.push(
    `<line x1="${plotArea.x}" y1="${axisY}" x2="${plotArea.x + plotArea.width}" y2="${axisY}" stroke="${theme.xAxis.lineColor}" stroke-width="${theme.xAxis.lineWidth || 2}" />`,
  );
  svg.push(
    `<line x1="${axisX}" y1="${plotArea.y}" x2="${axisX}" y2="${plotArea.y + plotArea.height}" stroke="${theme.yAxis.lineColor}" stroke-width="${theme.yAxis.lineWidth || 2}" />`,
  );
}

function drawSVGTickLabels(
  svg: string[],
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  theme: ChartTheme,
  options: SVGExportOptions,
): void {
  const xOpts = options.xAxis;
  const yOpts = options.yAxis;
  const xTickCount = xOpts?.tickCount ?? 8;
  const yTickCount = yOpts?.tickCount ?? 6;
  const domainSpan = xScale.domain[1] - xScale.domain[0];
  const axisY = plotArea.y + plotArea.height;
  const axisX = plotArea.x;
  const xFont = theme.xAxis;
  const yFont = theme.yAxis;

  if (xOpts?.showLabels !== false) {
    xScale.ticks(xTickCount).forEach((tick) => {
      const x = snapLabelCoord(xScale.transform(tick));
      if (x < plotArea.x || x > plotArea.x + plotArea.width) return;
      const label = formatXTickValue(tick, xOpts, domainSpan);
      const y = axisY + (xFont.tickLength ?? 4) + xFont.labelSize * 0.75;
      svg.push(
        `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${xFont.labelColor}" font-size="${xFont.labelSize}" text-anchor="middle">${escapeXml(label)}</text>`,
      );
    });
  }

  if (yOpts?.showLabels !== false) {
    yScale.ticks(yTickCount).forEach((tick) => {
      const y = snapLabelCoord(yScale.transform(tick));
      if (y < plotArea.y || y > plotArea.y + plotArea.height) return;
      const label = formatYTickValue(tick, yOpts);
      const x = axisX - (yFont.tickLength ?? 4) - 4;
      svg.push(
        `<text x="${x.toFixed(1)}" y="${(y + yFont.labelSize * 0.35).toFixed(1)}" fill="${yFont.labelColor}" font-size="${yFont.labelSize}" text-anchor="end">${escapeXml(label)}</text>`,
      );
    });
  }
}

function drawSVGGrid(
  svg: string[],
  plotArea: PlotArea,
  xAxis: Scale,
  yScale: Scale,
  theme: ChartTheme,
): void {
  if (!theme.grid.visible) return;
  xAxis.ticks(10).forEach((tick) => {
    const px = snapLineCoord(xAxis.transform(tick));
    if (px >= plotArea.x && px <= plotArea.x + plotArea.width) {
      svg.push(
        `<line x1="${px.toFixed(1)}" y1="${plotArea.y}" x2="${px.toFixed(1)}" y2="${plotArea.y + plotArea.height}" stroke="${theme.grid.majorColor}" stroke-opacity="0.1" stroke-dasharray="2,2" />`,
      );
    }
  });
  yScale.ticks(10).forEach((tick) => {
    const py = snapLineCoord(yScale.transform(tick));
    if (py >= plotArea.y && py <= plotArea.y + plotArea.height) {
      svg.push(
        `<line x1="${plotArea.x}" y1="${py.toFixed(1)}" x2="${plotArea.x + plotArea.width}" y2="${py.toFixed(1)}" stroke="${theme.grid.majorColor}" stroke-opacity="0.1" stroke-dasharray="2,2" />`,
      );
    }
  });
}
