/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { attachPaneResize } from "./paneResize";

function sizedDiv(width: number, height: number): HTMLDivElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: height, configurable: true });
  el.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return el;
}

describe("attachPaneResize (DOM)", () => {
  it("returns no dividers for a single pane", () => {
    const container = sizedDiv(400, 300);
    const pane = sizedDiv(400, 300);
    container.appendChild(pane);

    const ctrl = attachPaneResize(container, [pane], ["a"], [1]);
    expect(ctrl.dividers).toHaveLength(0);
    ctrl.destroy();
  });

  it("inserts vertical dividers and reports resize ratios", () => {
    const container = sizedDiv(400, 300);
    const p1 = sizedDiv(400, 150);
    const p2 = sizedDiv(400, 150);
    container.append(p1, p2);

    const ratios = [0.5, 0.5];
    const onResize = vi.fn();

    const ctrl = attachPaneResize(
      container,
      [p1, p2],
      ["top", "bottom"],
      ratios,
      {
        onDragStart: () => [150, 150],
        onDragMove: () => {},
        onDragEnd: () => {},
        onResize,
      },
    );

    expect(ctrl.dividers).toHaveLength(1);
    expect(ctrl.dividers[0].dataset.direction).toBe("vertical");

    const divider = ctrl.dividers[0];
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 150, bubbles: true, pointerId: 1 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointermove", { clientY: 170, bubbles: true, pointerId: 1 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 170, bubbles: true, pointerId: 1 }),
    );

    expect(onResize).toHaveBeenCalled();
    ctrl.destroy();
    expect(container.querySelector(".velo-pane-divider")).toBeNull();
  });

  it("uses horizontal dividers when direction is horizontal", () => {
    const container = sizedDiv(600, 200);
    const p1 = sizedDiv(300, 200);
    const p2 = sizedDiv(300, 200);
    container.append(p1, p2);

    const ctrl = attachPaneResize(
      container,
      [p1, p2],
      ["left", "right"],
      [0.5, 0.5],
      { direction: "horizontal" },
    );

    expect(ctrl.dividers[0].dataset.direction).toBe("horizontal");
    ctrl.destroy();
  });
});
