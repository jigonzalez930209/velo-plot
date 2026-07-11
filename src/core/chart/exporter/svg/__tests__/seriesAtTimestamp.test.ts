import { describe, expect, it } from "vitest";
import { Series } from "../../../../Series";
import { filterSeriesAtTimestamp } from "../seriesAtTimestamp";

describe("filterSeriesAtTimestamp", () => {
  it("truncates series to points with x <= at", () => {
    const series = new Series({
      id: "s1",
      type: "line",
      data: {
        x: new Float32Array([1, 2, 3, 4, 5]),
        y: new Float32Array([10, 20, 30, 40, 50]),
      },
    });

    const filtered = filterSeriesAtTimestamp([series], 3);
    const data = filtered[0].getData();

    expect(data.x.length).toBe(3);
    expect(Array.from(data.x)).toEqual([1, 2, 3]);
    expect(Array.from(data.y!)).toEqual([10, 20, 30]);
  });

  it("keeps full series when at is beyond last x", () => {
    const series = new Series({
      id: "s1",
      type: "line",
      data: {
        x: new Float32Array([1, 2]),
        y: new Float32Array([10, 20]),
      },
    });

    const filtered = filterSeriesAtTimestamp([series], 100);
    expect(filtered[0].getData().x.length).toBe(2);
  });
});
