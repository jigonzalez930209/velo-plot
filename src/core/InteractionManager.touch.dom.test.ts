import { describe, it, expect, vi } from "vitest";
import { InteractionManager } from "./InteractionManager";

describe("InteractionManager touch", () => {
  it("calls onDoubleTap on rapid double touchend", () => {
    const onDoubleTap = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const manager = new InteractionManager(
      container,
      {
        onZoom: vi.fn(),
        onPan: vi.fn(),
        onBoxZoom: vi.fn(),
        onCursorMove: vi.fn(),
        onCursorLeave: vi.fn(),
        onDoubleTap,
      },
      () => ({ x: 0, y: 0, width: 400, height: 300 }),
      () => ({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 }),
      () => [],
    );

    const end = new TouchEvent("touchend", { touches: [] });
    container.dispatchEvent(end);
    container.dispatchEvent(end);
    expect(onDoubleTap).toHaveBeenCalled();

    manager.destroy();
    container.remove();
  });
});
