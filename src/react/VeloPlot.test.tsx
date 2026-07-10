import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { VeloPlot } from "./VeloPlot";
import { buildMockChart } from "../bindings/test-utils";

const mockChart = buildMockChart();

const mockResetZoom = vi.fn();

vi.mock("./useVeloPlot", () => ({
  useVeloPlot: () => ({
    chart: mockChart,
    isReady: true,
    bounds: mockChart.getViewBounds(),
    addSeries: vi.fn(),
    updateSeries: vi.fn(),
    removeSeries: vi.fn(),
    resetZoom: mockResetZoom,
  }),
}));

describe("VeloPlot", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders chart container with a11y", () => {
    const { x, y } = { x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) };
    const { container } = render(
      <VeloPlot series={[{ id: "a", x, y }]} height={300} ariaLabel="Test chart" keyboardNav={false} />,
    );
    expect(container.querySelector(".velo-plot-container")).toBeTruthy();
    expect(container.querySelector("table")).toBeTruthy();
  });

  it("exposes chart via ref with bounds", async () => {
    const ref = { current: null as import("./VeloPlot").VeloPlotRef | null };
    render(<VeloPlot ref={(r) => { ref.current = r; }} height={200} keyboardNav={false} />);
    await waitFor(() => expect(ref.current?.getChart()).toBe(mockChart));
    expect(ref.current?.getBounds()).toEqual(mockChart.getViewBounds());
    ref.current?.resetZoom();
    expect(mockResetZoom).toHaveBeenCalled();
  });

  it("reapplies a11y when keyboardNav toggles", async () => {
    const { container, rerender } = render(
      <VeloPlot
        keyboardNav={false}
        ariaLabel="Chart"
        series={[{ id: "a", x: new Float32Array([0]), y: new Float32Array([1]) }]}
      />,
    );
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());
    rerender(
      <VeloPlot
        keyboardNav
        ariaLabel="Chart"
        series={[{ id: "a", x: new Float32Array([0]), y: new Float32Array([1]) }]}
      />,
    );
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());
  });

  it("renders string height dimensions", () => {
    const { container } = render(
      <VeloPlot height="50vh" width="80%" keyboardNav={false} series={[]} />,
    );
    const el = container.querySelector(".velo-plot-container") as HTMLElement;
    expect(el.style.height).toBe("50vh");
    expect(el.style.width).toBe("80%");
  });

  it("renders debug overlay and custom dimensions", () => {
    const { container } = render(
      <VeloPlot
        debug
        width={500}
        height={200}
        className="custom"
        keyboardNav={false}
        series={[{ id: "a", x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) }]}
      />,
    );
    expect(container.textContent).toContain("Series:");
    expect(container.querySelector(".velo-plot-container.custom")).toBeTruthy();
  });

  it("wires zoom, cursor, and zoom change handlers", async () => {
    const onZoomChange = vi.fn();
    const { rerender } = render(
      <VeloPlot
        height={200}
        keyboardNav={false}
        zoom={{ x: [0, 1] }}
        onZoomChange={onZoomChange}
        cursor={{ enabled: true }}
        series={[]}
      />,
    );
    expect(mockChart.zoom).toHaveBeenCalled();
    const zoomHandler = mockChart.on.mock.calls.find((c) => c[0] === "zoom")?.[1];
    zoomHandler?.({ x: [0, 1], y: [-1, 1] });
    expect(onZoomChange).toHaveBeenCalled();
    expect(mockChart.enableCursor).toHaveBeenCalled();
    rerender(<VeloPlot height={200} keyboardNav={false} cursor={{ enabled: false }} series={[]} />);
    expect(mockChart.disableCursor).toHaveBeenCalled();
    rerender(
      <VeloPlot
        height={200}
        keyboardNav={false}
        series={[{ id: "b", x: new Float32Array([0]), y: new Float32Array([1]) }]}
      />,
    );
  });
});
