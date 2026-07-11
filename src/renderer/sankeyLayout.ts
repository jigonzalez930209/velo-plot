import type {
  SankeyData,
  SankeyStyle,
  PlotArea,
  SankeyNode,
  SankeyLink,
} from "../types";

export interface SankeyNodeLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  value: number;
}

export interface SankeyLinkLayout {
  source: SankeyNodeLayout;
  target: SankeyNodeLayout;
  sourceOffset: number;
  targetOffset: number;
  sourceTotal: number;
  targetTotal: number;
  value: number;
  link: SankeyLink;
}

export interface SankeyLayoutResult {
  workingArea: PlotArea;
  nodeRegistry: Map<string | number, SankeyNodeLayout>;
  links: SankeyLinkLayout[];
  nodeInValue: Map<string | number, number>;
  nodeOutValue: Map<string | number, number>;
  style: Required<
    Pick<SankeyStyle, "nodeWidth" | "nodePadding" | "palette" | "linkOpacity" | "showLabels">
  >;
}

export function computeSankeyLayout(
  data: SankeyData,
  style: SankeyStyle,
  plotArea: PlotArea,
): SankeyLayoutResult | null {
  const { nodes, links } = data;
  const {
    nodeWidth = 18,
    nodePadding = 12,
    palette = ["#6366f1", "#10b981", "#3b82f6", "#f43f5e", "#f59e0b"],
    linkOpacity = 0.4,
    showLabels = true,
  } = style;

  if (!links.length) return null;

  const zoomFactor = 1.8;
  const effectiveWidth = plotArea.width / zoomFactor;
  const effectiveHeight = plotArea.height / zoomFactor;
  const offsetX = (plotArea.width - effectiveWidth) / 2;
  const offsetY = (plotArea.height - effectiveHeight) / 2;

  const workingArea = {
    x: plotArea.x + offsetX,
    y: plotArea.y + offsetY,
    width: effectiveWidth,
    height: effectiveHeight,
  };

  const allNodeIds = new Set<string | number>();
  links.forEach((l: SankeyLink) => {
    allNodeIds.add(l.source);
    allNodeIds.add(l.target);
  });
  const nodeIds = Array.from(allNodeIds);

  const nodeLevels = new Map<string | number, number>();
  const targets = new Set(links.map((l: SankeyLink) => l.target));
  const roots = nodeIds.filter((id) => !targets.has(id));

  roots.forEach((id) => nodeLevels.set(id, 0));

  let changed = true;
  while (changed) {
    changed = false;
    links.forEach((l: SankeyLink) => {
      const srcLevel = nodeLevels.get(l.source);
      if (srcLevel !== undefined) {
        const currentDstLevel = nodeLevels.get(l.target);
        const newDstLevel = srcLevel + 1;
        if (currentDstLevel === undefined || newDstLevel > currentDstLevel) {
          nodeLevels.set(l.target, newDstLevel);
          changed = true;
        }
      }
    });
  }

  nodeIds.forEach((id) => {
    if (nodeLevels.get(id) === undefined) nodeLevels.set(id, 0);
  });

  const maxLevel = Math.max(...Array.from(nodeLevels.values()));
  const layers: (string | number)[][] = Array.from({ length: maxLevel + 1 }, () => []);
  nodeIds.forEach((id) => layers[nodeLevels.get(id)!].push(id));

  const nodeInValue = new Map<string | number, number>();
  const nodeOutValue = new Map<string | number, number>();

  links.forEach((l: SankeyLink) => {
    nodeOutValue.set(l.source, (nodeOutValue.get(l.source) || 0) + l.value);
    nodeInValue.set(l.target, (nodeInValue.get(l.target) || 0) + l.value);
  });

  const getNodeValue = (id: string | number) =>
    Math.max(nodeInValue.get(id) || 0, nodeOutValue.get(id) || 0);

  let maxLayerTotal = 0;
  layers.forEach((layerNodes) => {
    let layerTotal = 0;
    layerNodes.forEach((id) => {
      layerTotal += getNodeValue(id);
    });
    if (layerTotal > maxLayerTotal) maxLayerTotal = layerTotal;
  });

  const nodeRegistry = new Map<string | number, SankeyNodeLayout>();
  const numLayers = layers.length;
  const horizontalSpacing = (workingArea.width - nodeWidth) / Math.max(1, numLayers - 1);

  layers.forEach((layerNodes, lIdx) => {
    const x = workingArea.x + lIdx * horizontalSpacing;

    const nodeHeights: number[] = [];
    let layerHeightSum = 0;
    layerNodes.forEach((id) => {
      const val = getNodeValue(id);
      const h = maxLayerTotal > 0 ? (val / maxLayerTotal) * (workingArea.height * 0.9) : 20;
      nodeHeights.push(h);
      layerHeightSum += h;
    });

    const totalPadding = (layerNodes.length - 1) * nodePadding;
    const totalContentHeight = layerHeightSum + totalPadding;
    let currentY = workingArea.y + (workingArea.height - totalContentHeight) / 2;

    layerNodes.forEach((id, nIdx) => {
      const height = nodeHeights[nIdx];

      let color = palette[nIdx % palette.length];
      if (nodes.length > 0) {
        const found = (nodes as SankeyNode[]).find((n) => n.id === id);
        if (found?.color) color = found.color;
      }

      nodeRegistry.set(id, {
        x,
        y: currentY,
        width: nodeWidth,
        height,
        color,
        value: getNodeValue(id),
      });
      currentY += height + nodePadding;
    });
  });

  const sourceOffsets = new Map<string | number, number>();
  const targetOffsets = new Map<string | number, number>();
  const linkLayouts: SankeyLinkLayout[] = [];

  links.forEach((link: SankeyLink) => {
    const src = nodeRegistry.get(link.source);
    const dst = nodeRegistry.get(link.target);
    if (!src || !dst) return;

    const sOffset = sourceOffsets.get(link.source) || 0;
    const tOffset = targetOffsets.get(link.target) || 0;

    const sValue = nodeOutValue.get(link.source) || 1;
    const tValue = nodeInValue.get(link.target) || 1;

    const srcFlowHeight = (link.value / sValue) * src.height;
    const dstFlowHeight = (link.value / tValue) * dst.height;

    linkLayouts.push({
      source: src,
      target: dst,
      sourceOffset: sOffset,
      targetOffset: tOffset,
      sourceTotal: sValue,
      targetTotal: tValue,
      value: link.value,
      link,
    });

    sourceOffsets.set(link.source, sOffset + srcFlowHeight);
    targetOffsets.set(link.target, tOffset + dstFlowHeight);
  });

  return {
    workingArea,
    nodeRegistry,
    links: linkLayouts,
    nodeInValue,
    nodeOutValue,
    style: { nodeWidth, nodePadding, palette, linkOpacity, showLabels },
  };
}
