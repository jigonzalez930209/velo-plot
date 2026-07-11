/**
 * Live SVG chart frame — mounts vector output into the chart DOM.
 */

/** Replace children of the live SVG root from a full SVG document string. */
export function mountSVGString(svgRoot: SVGSVGElement, svgString: string): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const parsed = doc.documentElement;
  if (!parsed || parsed.nodeName.toLowerCase() !== "svg") {
    console.warn("[VeloPlot] SVG renderer: invalid SVG document");
    return;
  }

  const attrs = ["width", "height", "viewBox", "xmlns", "font-family"] as const;
  for (const name of attrs) {
    const val = parsed.getAttribute(name);
    if (val != null) svgRoot.setAttribute(name, val);
  }

  while (svgRoot.firstChild) {
    svgRoot.removeChild(svgRoot.firstChild);
  }

  const nodes = Array.from(parsed.childNodes).map((child) =>
    svgRoot.ownerDocument!.importNode(child, true),
  );
  if (typeof svgRoot.replaceChildren === "function") {
    svgRoot.replaceChildren(...nodes);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    fragment.appendChild(node);
  }
  svgRoot.appendChild(fragment);
}
