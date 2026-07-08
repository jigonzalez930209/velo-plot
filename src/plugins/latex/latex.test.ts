import { describe, it, expect } from "vitest";
import { parseLaTeX } from "./parser";
import { getSymbol, isSymbol, SYMBOL_COUNT, BLACKBOARD } from "./symbols";

describe("LaTeX vocabulary (3.9)", () => {
  it("exposes at least 300 mapped commands", () => {
    expect(SYMBOL_COUNT).toBeGreaterThanOrEqual(300);
  });

  it("resolves symbols across categories", () => {
    // Greek
    expect(getSymbol("alpha")).toBe("α");
    // Variant greek
    expect(getSymbol("varepsilon")).toBe("ϵ");
    // Arrows
    expect(getSymbol("longrightarrow")).toBe("⟶");
    expect(getSymbol("iff")).toBe("⟺");
    // Relations
    expect(getSymbol("sqsubseteq")).toBe("⊑");
    expect(getSymbol("therefore")).toBe("∴");
    // Big operators
    expect(getSymbol("bigoplus")).toBe("⨁");
    // Misc
    expect(getSymbol("aleph")).toBe("ℵ");
    // Delimiters
    expect(getSymbol("lfloor")).toBe("⌊");
    // Functions
    expect(getSymbol("arctan")).toBe("arctan");
  });

  it("reports membership correctly", () => {
    expect(isSymbol("nabla")).toBe(true);
    expect(isSymbol("definitely-not-a-symbol")).toBe(false);
  });
});

describe("LaTeX math alphabets (3.9)", () => {
  it("maps \\mathbb letters to double-struck unicode", () => {
    const nodes = parseLaTeX("\\mathbb{R}");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("text");
    expect(nodes[0].content).toBe(BLACKBOARD.R);
  });

  it("maps multi-letter \\mathbb groups", () => {
    const nodes = parseLaTeX("\\mathbb{RN}");
    expect(nodes[0].content).toBe(BLACKBOARD.R + BLACKBOARD.N);
  });
});

describe("LaTeX matrices (3.9)", () => {
  it("parses a pmatrix into rows and cells with delimiters", () => {
    const nodes = parseLaTeX("\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}");
    const matrix = nodes.find((n) => n.type === "matrix");
    expect(matrix).toBeDefined();
    expect(matrix!.delimiters).toEqual(["(", ")"]);
    expect(matrix!.rows).toHaveLength(2);
    expect(matrix!.rows![0]).toHaveLength(2);
    expect(matrix!.rows![1]).toHaveLength(2);
  });

  it("parses bmatrix delimiters", () => {
    const nodes = parseLaTeX("\\begin{bmatrix} 1 \\\\ 2 \\end{bmatrix}");
    const matrix = nodes.find((n) => n.type === "matrix");
    expect(matrix!.delimiters).toEqual(["[", "]"]);
    expect(matrix!.rows).toHaveLength(2);
  });

  it("handles a plain matrix environment with no delimiters", () => {
    const nodes = parseLaTeX("\\begin{matrix} x & y \\end{matrix}");
    const matrix = nodes.find((n) => n.type === "matrix");
    expect(matrix!.delimiters).toEqual(["", ""]);
    expect(matrix!.rows![0]).toHaveLength(2);
  });
});
