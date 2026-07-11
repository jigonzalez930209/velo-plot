import type { SankeyData, SankeyStyle, PlotArea, SankeyNode } from "../types";
import { computeSankeyLayout } from "./sankeyLayout";

export function drawSankey(
  ctx: CanvasRenderingContext2D,
  data: SankeyData,
  style: SankeyStyle,
  plotArea: PlotArea,
): void {
  const layout = computeSankeyLayout(data, style, plotArea);
  if (!layout) return;

  const { nodeRegistry, links, nodeOutValue, nodeInValue, workingArea } = layout;
  const { linkOpacity, showLabels, nodeWidth } = layout.style;

  ctx.save();

  links.forEach((entry) => {
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

    const gradient = ctx.createLinearGradient(x0, (y0 + y1) / 2, x2, (y2 + y3) / 2);
    gradient.addColorStop(0, src.color);
    gradient.addColorStop(1, dst.color);

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + cpOffset, y0, x2 - cpOffset, y2, x2, y2);
    ctx.lineTo(x2, y3);
    ctx.bezierCurveTo(x2 - cpOffset, y3, x0 + cpOffset, y1, x0, y1);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.globalAlpha = linkOpacity;
    ctx.fill();

    ctx.strokeStyle = src.color;
    ctx.globalAlpha = linkOpacity * 0.3;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 1.0;

  nodeRegistry.forEach((node) => {
    ctx.fillStyle = node.color;
    ctx.fillRect(node.x, node.y, node.width, node.height);

    const grad = ctx.createLinearGradient(node.x, node.y, node.x + node.width, node.y);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.15)");
    ctx.fillStyle = grad;
    ctx.fillRect(node.x, node.y, node.width, node.height);
  });

  ctx.restore();

  if (showLabels) {
    ctx.save();
    ctx.font = "bold 11px Inter, -apple-system, sans-serif";
    ctx.textBaseline = "middle";

    nodeRegistry.forEach((node, id) => {
      let nodeName = String(id);
      const found = (data.nodes as SankeyNode[]).find((n) => n.id === id);
      if (found?.name) nodeName = found.name;

      const isFirstLayer = node.x <= workingArea.x + 5;
      const isLastLayer = node.x >= workingArea.x + workingArea.width - nodeWidth - 5;

      ctx.shadowBlur = 3;
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.fillStyle = "#ffffff";

      if (isFirstLayer) {
        ctx.textAlign = "right";
        ctx.fillText(nodeName, node.x - 10, node.y + node.height / 2);
      } else if (isLastLayer) {
        ctx.textAlign = "left";
        ctx.fillText(nodeName, node.x + node.width + 10, node.y + node.height / 2);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(nodeName, node.x + node.width / 2, node.y - 10);
      }
    });

    ctx.restore();
  }
}

export { computeSankeyLayout } from "./sankeyLayout";
