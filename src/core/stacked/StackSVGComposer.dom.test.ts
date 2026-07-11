import { describe, it, expect } from "vitest";
import { composeStackSVG, buildStackPaneLayouts, exportStackSVG } from "./StackSVGComposer";
import { mockSeries, testScales, testTheme } from "../chart/exporter/svg/__tests__/testFixtures";

function mockPaneChart(showLegend = true) {
  const { xScale, yScale } = testScales();
  const series = mockSeries("line");
  return {
    theme: testTheme,
    showLegend,
    getAllSeries: () => [series],
    viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
    getPlotArea: () => ({ x: 0, y: 0, width: 400, height: 150 }),
    xScale,
    yScales: new Map([["default", yScale]]),
    container: { getBoundingClientRect: () => ({ width: 400, height: 150 }) },
    xAxisOptions: {},
    yAxisOptionsMap: new Map([["default", {}]]),
    primaryYAxisId: "default",
  };
}

function mockContainer(width = 400, height = 300) {
  const container = document.createElement("div");
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width, height, right: width, bottom: height }),
  });
  document.body.appendChild(container);
  return container;
}

describe("buildStackPaneLayouts", () => {
  it("computes pane offsets from wrapper positions", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 }),
    });
    document.body.appendChild(container);

    const wrapper = document.createElement("div");
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 50, width: 400, height: 150, right: 400, bottom: 200 }),
    });
    container.appendChild(wrapper);

    const layouts = buildStackPaneLayouts(container, [wrapper], [{} as never]);
    expect(layouts[0].offsetY).toBe(50);
    expect(layouts[0].height).toBe(150);

    container.remove();
  });
});

describe("composeStackSVG", () => {
  it("composes empty stack SVG structure", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 }),
    });
    document.body.appendChild(container);

    const svg = composeStackSVG(container, [], [], [], { backgroundColor: "#000" });
    expect(svg).toContain("<svg");
    expect(svg).toContain('fill="#000"');

    container.remove();
  });

  it("uses pane chart theme when backgroundColor is omitted", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 }),
    });
    document.body.appendChild(container);

    const svg = composeStackSVG(
      container,
      [],
      [{ theme: { backgroundColor: "#abc123" } } as never],
      [],
      {},
    );
    expect(svg).toContain('fill="#abc123"');

    container.remove();
  });

  it("draws horizontal and vertical divider lines", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 }),
    });
    document.body.appendChild(container);

    const hDivider = document.createElement("div");
    Object.defineProperty(hDivider, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 120, width: 400, height: 4, right: 400, bottom: 124 }),
    });

    const vDivider = document.createElement("div");
    Object.defineProperty(vDivider, "getBoundingClientRect", {
      value: () => ({ left: 200, top: 0, width: 4, height: 300, right: 204, bottom: 300 }),
    });

    const svg = composeStackSVG(container, [], [], [hDivider, vDivider], {
      backgroundColor: "#000",
      includeDividers: true,
    });
    expect(svg).toContain("<line");
    expect(svg.match(/<line/g)?.length).toBe(2);

    container.remove();
  });

  it("exportStackSVG forwards background color", () => {
    const container = mockContainer(200, 100);

    const svg = exportStackSVG(container, [], [], [], "#222");
    expect(svg).toContain('fill="#222"');

    const overridden = exportStackSVG(container, [], [], [], "#222", { backgroundColor: "#333" });
    expect(overridden).toContain('fill="#333"');

    container.remove();
  });

  it("embeds pane chart SVG and respects export toggles", () => {
    const container = mockContainer();
    const wrapper = document.createElement("div");
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 150, right: 400, bottom: 150 }),
    });
    container.appendChild(wrapper);

    const chart = mockPaneChart(true);
    const svg = composeStackSVG(container, [wrapper], [chart as never], [], {
      includeBackground: false,
      includeDividers: false,
      includeLegend: false,
    });
    expect(svg).toContain("<g transform=");
    expect(svg).toContain("<polyline");
    expect(svg).toMatch(/<svg[^>]*>\s*<g transform=/);

    const hDivider = document.createElement("div");
    Object.defineProperty(hDivider, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 120, width: 400, height: 4, right: 400, bottom: 124 }),
    });
    const noDividers = composeStackSVG(container, [wrapper], [chart as never], [hDivider], {
      includeDividers: false,
    });
    expect(noDividers).not.toContain('stroke="rgba(128,128,128,0.5)"');

    container.remove();
  });

  it("falls back to default background when no pane charts exist", () => {
    const container = mockContainer();
    const svg = composeStackSVG(container, [], [], [], {});
    expect(svg).toContain('fill="#111111"');
    container.remove();
  });
});
