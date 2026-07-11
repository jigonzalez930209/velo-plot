/**
 * SVG document construction utilities — XML escape, defs, gradients, clipPaths.
 */

let gradientIdCounter = 0;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export class SVGDocumentBuilder {
  private defs: string[] = [];
  private layers: Map<string, string[]> = new Map();

  constructor(
    private width: number,
    private height: number,
    private fontFamily: string,
  ) {}

  resetGradientCounter(): void {
    gradientIdCounter = 0;
  }

  addDef(content: string): string {
    const id = `vp-def-${++gradientIdCounter}`;
    this.defs.push(`<${content.includes("id=") ? content : `linearGradient id="${id}" ${content}`}>`);
    return id;
  }

  registerLinearGradient(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stops: Array<{ offset: string; color: string; opacity?: number }>,
  ): string {
    const id = `vp-grad-${++gradientIdCounter}`;
    const stopEls = stops
      .map(
        (s) =>
          `<stop offset="${s.offset}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ""}/>`,
      )
      .join("");
    this.defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopEls}</linearGradient>`,
    );
    return id;
  }

  registerClipPath(id: string, content: string): void {
    this.defs.push(`<clipPath id="${id}">${content}</clipPath>`);
  }

  registerArrowMarker(id: string, color: string): void {
    this.defs.push(
      `<marker id="${id}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">` +
        `<path d="M0,0 L8,3 L0,6 Z" fill="${escapeXml(color)}"/></marker>`,
    );
  }

  push(layer: string, element: string): void {
    if (!this.layers.has(layer)) this.layers.set(layer, []);
    this.layers.get(layer)!.push(element);
  }

  pushRaw(element: string): void {
    this.push("default", element);
  }

  openGroup(layer: string, transform?: string, attrs?: Record<string, string>): string {
    const attrStr = attrs
      ? " " + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ")
      : "";
    const el = `<g${transform ? ` transform="${transform}"` : ""}${attrStr}>`;
    this.push(layer, el);
    return layer;
  }

  closeGroup(layer: string): void {
    this.push(layer, "</g>");
  }

  build(backgroundColor: string, ariaLabel?: string): string {
    const layerOrder = [
      "background",
      "grid",
      "series",
      "errorBars",
      "plugins",
      "axes",
      "border",
      "title",
      "legend",
      "cursor",
    ];

    const svg: string[] = [
      `<svg width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg" font-family="${escapeXml(this.fontFamily)}"${ariaLabel ? ` role="img" aria-label="${escapeXml(ariaLabel)}"` : ""}>`,
    ];

    if (ariaLabel) {
      svg.push(`<title>${escapeXml(ariaLabel)}</title>`);
    }

    svg.push(`<rect width="100%" height="100%" fill="${backgroundColor}" />`);

    if (this.defs.length > 0) {
      svg.push(`<defs>${this.defs.join("")}</defs>`);
    }

    svg.push("<g>");
    for (const layer of layerOrder) {
      const items = this.layers.get(layer);
      if (items) svg.push(...items);
    }
    const defaultLayer = this.layers.get("default");
    if (defaultLayer) svg.push(...defaultLayer);
    svg.push("</g>");
    svg.push("</svg>");

    return svg.join("\n");
  }
}
