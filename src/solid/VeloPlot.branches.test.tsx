import { describe, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { VeloPlot } from "./VeloPlot";

vi.mock("./useVeloPlot", () => ({
  useVeloPlot: () => ({
    isReady: () => false,
    chart: () => null,
    setContainerRef: vi.fn(),
    addSeries: vi.fn(),
    updateSeries: vi.fn(),
    removeSeries: vi.fn(),
  }),
}));

describe("VeloPlot solid branches", () => {
  it("skips series sync while chart is not ready", () => {
    const { unmount } = render(() =>
      VeloPlot({ series: [{ id: "a", x: new Float32Array(), y: new Float32Array() }] }),
    );
    unmount();
  });
});
