import type { Series } from "../../../../Series";
import type { PlotArea } from "../../../../../types";
import type { SankeyNode } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt, escapeXml } from "../SVGDocumentBuilder";
import { computeSankeyLayout } from "../../../../../renderer/sankeyLayout";

export function exportSankeySeries(
  series: Series,
  plotArea: PlotArea,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getSankeyData?.();
  const style = series.getSankeyStyle?.() ?? series.getStyle();
  if (!data?.links?.length) return;

  const layout = computeSankeyLayout(data, style as import("../../../../../types").SankeyStyle, plotArea);
  if (!layout) return;

  const { nodeRegistry, links, nodeOutValue, nodeInValue, workingArea } = layout;
  const { linkOpacity, showLabels, nodeWidth } = layout.style;

  const clipId = "vp-clip-sankey";
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (const entry of links) {
    const src = entry.source;
    const dst = entry.target;
    const sOffset = entry.sourceOffset;
    const tOffset = entry.targetOffset;

    const sValue = nodeOutValue.get(entry.link.source) || 1;
    const tValue = nodeInValue.get(entry.link.target) || 1;

    const srcFlowHeight = (entry.link.value / sValue) * src.height;
    const dstFlowHeight = (entry.link.value / tValue) * dst.height;

    const x0 = src.x + src.width;
    const y0 = src.y + sOffset;
    const y1 = y0 + srcFlowHeight;
    const x2 = dst.x;
    const y2 = dst.y + tOffset;
    const y3 = y2 + dstFlowHeight;
    const cpOffset = (x2 - x0) * 0.5;

    const gradId = builder.registerLinearGradient(x0, (y0 + y1) / 2, x2, (y2 + y3) / 2, [
      { offset: "0%", color: src.color },
      { offset: "100%", color: dst.color },
    ]);

    builder.push(
      "series",
      `<path clip-path="url(#${clipId})" d="M ${fmt(x0)} ${fmt(y0)} C ${fmt(x0 + cpOffset)} ${fmt(y0)}, ${fmt(x2 - cpOffset)} ${fmt(y2)}, ${fmt(x2)} ${fmt(y2)} L ${fmt(x2)} ${fmt(y3)} C ${fmt(x2 - cpOffset)} ${fmt(y3)}, ${fmt(x0 + cpOffset)} ${fmt(y1)}, ${fmt(x0)} ${fmt(y1)} Z" fill="url(#${gradId})" fill-opacity="${linkOpacity}" stroke="${src.color}" stroke-opacity="${linkOpacity * 0.3}" stroke-width="0.5"/>`,
    );
  }

  nodeRegistry.forEach((node) => {
    builder.push(
      "series",
      `<rect clip-path="url(#${clipId})" x="${fmt(node.x)}" y="${fmt(node.y)}" width="${fmt(node.width)}" height="${fmt(node.height)}" fill="${node.color}"/>`,
    );
  });

  if (showLabels) {
    nodeRegistry.forEach((node, id) => {
      let nodeName = String(id);
      const found = (data.nodes as SankeyNode[]).find((n) => n.id === id);
      if (found?.name) nodeName = found.name;

      const isFirstLayer = node.x <= workingArea.x + 5;
      const isLastLayer = node.x >= workingArea.x + workingArea.width - nodeWidth - 5;

      if (isFirstLayer) {
        builder.push(
          "series",
          `<text clip-path="url(#${clipId})" x="${fmt(node.x - 10)}" y="${fmt(node.y + node.height / 2)}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="end" dominant-baseline="middle">${escapeXml(nodeName)}</text>`,
        );
      } else if (isLastLayer) {
        builder.push(
          "series",
          `<text clip-path="url(#${clipId})" x="${fmt(node.x + node.width + 10)}" y="${fmt(node.y + node.height / 2)}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="start" dominant-baseline="middle">${escapeXml(nodeName)}</text>`,
        );
      } else {
        builder.push(
          "series",
          `<text clip-path="url(#${clipId})" x="${fmt(node.x + node.width / 2)}" y="${fmt(node.y - 10)}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">${escapeXml(nodeName)}</text>`,
        );
      }
    });
  }
}
