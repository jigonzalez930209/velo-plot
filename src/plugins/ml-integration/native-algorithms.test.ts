import { describe, it, expect } from "vitest";
import { NativeLinearRegression, matrixInverse } from "./native-algorithms";

describe("matrixInverse (3.17 fix)", () => {
  it("inverts a 3x3 matrix correctly (not just identity)", () => {
    const A = [
      [2, 0, 0],
      [0, 4, 0],
      [0, 0, 5],
    ];
    const inv = matrixInverse(A);
    expect(inv[0][0]).toBeCloseTo(0.5, 6);
    expect(inv[1][1]).toBeCloseTo(0.25, 6);
    expect(inv[2][2]).toBeCloseTo(0.2, 6);
  });

  it("returns identity fallback for singular matrices", () => {
    const singular = [
      [1, 2],
      [2, 4],
    ];
    const inv = matrixInverse(singular);
    expect(inv).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });
});

describe("NativeLinearRegression training (3.17)", () => {
  it("recovers a known univariate line y = 3x + 2", () => {
    const model = new NativeLinearRegression({ id: "m", name: "m", type: "linear-regression" });
    const x = [[0], [1], [2], [3], [4]];
    const y = [2, 5, 8, 11, 14];
    const result = model.train({ x, y });

    expect(result.intercept).toBeCloseTo(2, 4);
    expect(result.coefficients[0]).toBeCloseTo(3, 4);
    expect(result.r2).toBeCloseTo(1, 4);
    expect(result.residuals.every((r) => Math.abs(r) < 1e-6)).toBe(true);
  });

  it("fits a multivariate model and exposes residuals", () => {
    const model = new NativeLinearRegression({ id: "m2", name: "m2", type: "linear-regression" });
    // y = 1 + 2*a + 3*b
    const x = [
      [1, 1],
      [2, 1],
      [1, 2],
      [3, 2],
      [2, 3],
    ];
    const y = x.map(([a, b]) => 1 + 2 * a + 3 * b);
    const result = model.train({ x, y });
    expect(result.coefficients[0]).toBeCloseTo(2, 3);
    expect(result.coefficients[1]).toBeCloseTo(3, 3);
    expect(result.residuals).toHaveLength(5);
    expect(result.rmse).toBeLessThan(1e-3);
  });

  it("predicts univariate scalars after training", async () => {
    const model = new NativeLinearRegression({ id: "m3", name: "m3", type: "linear-regression" });
    model.train({ x: [[0], [1], [2]], y: [1, 3, 5] });
    const pred = await model.predict({ data: [10] });
    expect(pred.output[0]).toBeCloseTo(21, 3); // 1 + 2*10
  });
});
