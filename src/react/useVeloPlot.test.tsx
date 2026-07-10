import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { useVeloPlot } from "./useVeloPlot";
import { buildMockChart } from "../bindings/test-utils";
import * as shared from "../bindings/shared";

const mockChart = buildMockChart();
let lifecycleCallbacks: { onBoundsChange?: (b: unknown) => void; onError?: (e: Error) => void } = {};

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn((_el, _opts, callbacks = {}) => {
    lifecycleCallbacks = callbacks;
    return {
      chart: mockChart,
      getBounds: () => mockChart.getViewBounds(),
      destroy: mockChart.destroy,
    };
  }),
}));

vi.spyOn(shared, "optionsChanged");
vi.spyOn(shared, "syncChartOptions");

function Harness({
  options = {},
}: {
  options?: object;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useVeloPlot(ref, options);
  return (
    <div>
      <div ref={ref} data-testid="container" style={{ width: 400, height: 300 }} />
      <span data-testid="ready">{api.isReady ? "yes" : "no"}</span>
      <span data-testid="error">{api.error?.message ?? ""}</span>
      <button type="button" onClick={() => api.addSeries({ id: "s", type: "line", data: { x: new Float32Array(), y: new Float32Array() } })}>add</button>
      <button type="button" onClick={() => api.updateSeries("s", { x: new Float32Array(), y: new Float32Array() })}>update</button>
      <button type="button" onClick={() => api.removeSeries("s")}>remove</button>
      <button type="button" onClick={() => api.zoom({ x: [0, 1] })}>zoom</button>
      <button type="button" onClick={() => api.resetZoom()}>reset</button>
    </div>
  );
}

describe("useVeloPlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(shared.optionsChanged).mockReturnValue(false);
    lifecycleCallbacks = {};
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("skips mount when container ref is null", () => {
    function NullHarness() {
      const ref = useRef<HTMLDivElement>(null);
      useVeloPlot(ref, {});
      return <span data-testid="null">null</span>;
    }
    render(<NullHarness />);
  });

  it("syncs options when unchanged skips syncChartOptions", async () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(false);
    function OptionsHarness() {
      const [theme, setTheme] = useState("dark");
      const ref = useRef<HTMLDivElement>(null);
      useVeloPlot(ref, { theme } as never);
      return (
        <div>
          <div ref={ref} style={{ width: 400, height: 300 }} />
          <button type="button" onClick={() => setTheme("dark")}>same</button>
        </div>
      );
    }
    const { getByText } = render(<OptionsHarness />);
    await waitFor(() => expect(mockChart).toBeTruthy());
    vi.mocked(shared.syncChartOptions).mockClear();
    getByText("same").click();
    expect(shared.syncChartOptions).not.toHaveBeenCalled();
  });

  it("records Error instances from mount failures", async () => {
    const { createChartLifecycle } = await import("../bindings/shared/chartLifecycle");
    vi.mocked(createChartLifecycle).mockImplementationOnce(() => {
      throw new Error("native mount failure");
    });
    function ErrHarness() {
      const ref = useRef<HTMLDivElement>(null);
      const api = useVeloPlot(ref, {});
      return (
        <div>
          <div ref={ref} style={{ width: 400, height: 300 }} />
          <span data-testid="error">{api.error?.message ?? ""}</span>
        </div>
      );
    }
    const { getByTestId } = render(<ErrHarness />);
    await waitFor(() => expect(getByTestId("error").textContent).toBe("native mount failure"));
  });

  it("wraps non-error mount failures", async () => {
    const { createChartLifecycle } = await import("../bindings/shared/chartLifecycle");
    vi.mocked(createChartLifecycle).mockImplementationOnce(() => {
      throw "string mount failure";
    });
    function ErrHarness() {
      const ref = useRef<HTMLDivElement>(null);
      const api = useVeloPlot(ref, {});
      return (
        <div>
          <div ref={ref} style={{ width: 400, height: 300 }} />
          <span data-testid="error">{api.error?.message ?? ""}</span>
        </div>
      );
    }
    const { getByTestId } = render(<ErrHarness />);
    await waitFor(() => expect(getByTestId("error").textContent).toBe("string mount failure"));
  });

  it("mounts chart and destroys on unmount", async () => {
    const { unmount } = render(<Harness />);
    await waitFor(() => expect(mockChart.destroy).not.toHaveBeenCalled());
    unmount();
    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it("syncs options when they change", async () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(true);
    function OptionsHarness() {
      const [theme, setTheme] = useState("dark");
      const ref = useRef<HTMLDivElement>(null);
      useVeloPlot(ref, { theme } as never);
      return (
        <div>
          <div ref={ref} style={{ width: 400, height: 300 }} />
          <button type="button" onClick={() => setTheme("light")}>theme</button>
        </div>
      );
    }
    const { getByText } = render(<OptionsHarness />);
    await waitFor(() => expect(mockChart).toBeTruthy());
    getByText("theme").click();
    await waitFor(() => expect(shared.syncChartOptions).toHaveBeenCalled());
  });

  it("handles lifecycle callbacks and mount errors", async () => {
    const { createChartLifecycle } = await import("../bindings/shared/chartLifecycle");
    render(<Harness />);
    await waitFor(() => expect(lifecycleCallbacks.onBoundsChange).toBeTruthy());
    lifecycleCallbacks.onBoundsChange?.(mockChart.getViewBounds());
    lifecycleCallbacks.onError?.(new Error("chart error"));

    vi.mocked(createChartLifecycle).mockImplementationOnce(() => {
      throw "bad mount";
    });
    render(<Harness />);
    await waitFor(() => {
      expect(document.body.textContent).toContain("bad mount");
    });
  });

  it("exposes imperative chart API", async () => {
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(mockChart).toBeTruthy());
    getByText("add").click();
    getByText("update").click();
    getByText("remove").click();
    getByText("zoom").click();
    getByText("reset").click();
    expect(mockChart.addSeries).toHaveBeenCalled();
    expect(mockChart.updateSeries).toHaveBeenCalled();
    expect(mockChart.removeSeries).toHaveBeenCalled();
    expect(mockChart.zoom).toHaveBeenCalled();
    expect(mockChart.resetZoom).toHaveBeenCalled();
  });
});
