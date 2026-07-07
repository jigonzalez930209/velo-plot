/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { InteractionManager, type InteractionCallbacks } from "./InteractionManager";

function makeCallbacks(overrides: Partial<InteractionCallbacks> = {}): InteractionCallbacks {
  return {
    onZoom: vi.fn(),
    onPan: vi.fn(),
    onBoxZoom: vi.fn(),
    onCursorMove: vi.fn(),
    onCursorLeave: vi.fn(),
    ...overrides,
  };
}

function setup(callbacks: InteractionCallbacks) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON() {} }) as DOMRect;
  const plotArea = { x: 0, y: 0, width: 200, height: 200 };
  const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  const im = new InteractionManager(
    container,
    callbacks,
    () => plotArea,
    () => bounds,
    () => [],
  );
  return { container, im };
}

describe("InteractionManager click detection", () => {
  it("fires onPointClick for a stationary mousedown/up inside the plot area", () => {
    const onPointClick = vi.fn();
    const { container } = setup(makeCallbacks({ onPointClick }));

    container.dispatchEvent(new MouseEvent("mousedown", { clientX: 50, clientY: 60, bubbles: true }));
    container.dispatchEvent(new MouseEvent("mouseup", { clientX: 51, clientY: 61, bubbles: true }));

    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick).toHaveBeenCalledWith(51, 61, false, false);
  });

  it("does not fire onPointClick when the pointer is dragged", () => {
    const onPointClick = vi.fn();
    const { container } = setup(makeCallbacks({ onPointClick }));

    container.dispatchEvent(new MouseEvent("mousedown", { clientX: 20, clientY: 20, bubbles: true }));
    container.dispatchEvent(new MouseEvent("mouseup", { clientX: 120, clientY: 90, bubbles: true }));

    expect(onPointClick).not.toHaveBeenCalled();
  });
});
