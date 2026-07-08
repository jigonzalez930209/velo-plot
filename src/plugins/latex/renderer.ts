/**
 * @fileoverview LaTeX renderer using native Canvas API
 * @module plugins/latex/renderer
 */

import { LaTeXNode, LaTeXRenderContext, LaTeXDimensions } from './types';

/**
 * Render a list of LaTeX nodes to canvas
 */
export function renderNodes(
  nodes: LaTeXNode[],
  ctx: LaTeXRenderContext
): LaTeXDimensions {
  let currentX = ctx.x;
  let maxAscent = 0;
  let maxDescent = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Check if we have adjacent subscript and superscript (stacking)
    const isSub = node.type === 'subscript';
    const isSuper = node.type === 'superscript';
    const nextNode = nodes[i + 1];
    const isNextSub = nextNode?.type === 'subscript';
    const isNextSuper = nextNode?.type === 'superscript';

    if ((isSub && isNextSuper) || (isSuper && isNextSub)) {
      // Stack subscript and superscript at the same X coordinate
      const dims1 = renderNode(node, { ...ctx, x: currentX });
      const dims2 = renderNode(nextNode, { ...ctx, x: currentX });

      const width = Math.max(dims1.width, dims2.width);
      currentX += width + (ctx.fontSize * 0.15); // Scaled padding after scripts

      maxAscent = Math.max(maxAscent, dims1.baseline, dims2.baseline);
      maxDescent = Math.max(maxDescent, dims1.height - dims1.baseline, dims2.height - dims2.baseline);
      i++; // Skip next node
    } else {
      const dims = renderNode(node, { ...ctx, x: currentX });
      currentX += dims.width;

      // Add a small gap after scripts to prevent overlap with next character (Chemistry fix)
      if (isSub || isSuper) {
        currentX += ctx.fontSize * 0.12;
      }

      maxAscent = Math.max(maxAscent, dims.baseline);
      maxDescent = Math.max(maxDescent, dims.height - dims.baseline);
    }
  }

  return {
    width: currentX - ctx.x,
    height: maxAscent + maxDescent,
    baseline: maxAscent,
  };
}

/**
 * Render a single LaTeX node
 */
function renderNode(node: LaTeXNode, ctx: LaTeXRenderContext): LaTeXDimensions {
  switch (node.type) {
    case 'text':
      return renderText(node.content || '', ctx);

    case 'textgroup':
      return renderText(node.content || '', ctx);

    case 'symbol':
      return renderSymbol(node.content || '', ctx);

    case 'superscript':
      return renderSuperscript(node.children || [], ctx);

    case 'subscript':
      return renderSubscript(node.children || [], ctx);

    case 'fraction':
      return renderFraction(
        node.numerator || [],
        node.denominator || [],
        ctx
      );

    case 'sqrt':
      return renderSqrt(node.children || [], ctx);

    case 'group':
      return renderNodes(node.children || [], ctx);

    case 'matrix':
      return renderMatrix(node.rows || [], node.delimiters || ['', ''], ctx);

    default:
      return { width: 0, height: 0, baseline: 0 };
  }
}

/**
 * Render a matrix environment (\begin{pmatrix}...\end{pmatrix}).
 * The matrix is vertically centered on the current baseline.
 */
function renderMatrix(
  rows: LaTeXNode[][][],
  delimiters: [string, string],
  ctx: LaTeXRenderContext
): LaTeXDimensions {
  const nRows = rows.length;
  const nCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  if (nRows === 0 || nCols === 0) {
    return { width: 0, height: 0, baseline: 0 };
  }

  const cellPadX = ctx.fontSize * 0.35;
  const cellPadY = ctx.fontSize * 0.25;
  const delimW = ctx.fontSize * 0.35;

  // Measure every cell
  const cellDims: LaTeXDimensions[][] = rows.map((r) => r.map((cell) => measureNodes(cell, ctx)));

  const colW = new Array(nCols).fill(0);
  const rowAsc = new Array(nRows).fill(0);
  const rowDesc = new Array(nRows).fill(0);

  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const d = cellDims[r][c];
      colW[c] = Math.max(colW[c], d.width);
      rowAsc[r] = Math.max(rowAsc[r], d.baseline);
      rowDesc[r] = Math.max(rowDesc[r], d.height - d.baseline);
    }
  }
  const rowH = rowAsc.map((a, i) => a + rowDesc[i]);

  const totalH = rowH.reduce((s, h) => s + h, 0) + cellPadY * 2 * nRows;
  const contentW = colW.reduce((s, w) => s + w, 0) + cellPadX * 2 * nCols;
  const totalW = contentW + delimW * 2;

  const top = ctx.y - totalH / 2;

  // Delimiters
  drawDelimiter(ctx, delimiters[0], ctx.x, top, totalH, delimW, 'left');
  drawDelimiter(ctx, delimiters[1], ctx.x + totalW - delimW, top, totalH, delimW, 'right');

  // Cells
  let cellTop = top + cellPadY;
  for (let r = 0; r < nRows; r++) {
    let cellX = ctx.x + delimW + cellPadX;
    for (let c = 0; c < nCols; c++) {
      const cell = rows[r][c];
      if (cell) {
        const d = cellDims[r][c];
        const x = cellX + (colW[c] - d.width) / 2;
        const baselineY = cellTop + rowAsc[r];
        renderNodes(cell, { ...ctx, x, y: baselineY });
      }
      cellX += colW[c] + cellPadX * 2;
    }
    cellTop += rowH[r] + cellPadY * 2;
  }

  return { width: totalW, height: totalH, baseline: totalH / 2 };
}

/**
 * Draw a stretchable matrix delimiter using geometric strokes.
 */
function drawDelimiter(
  ctx: LaTeXRenderContext,
  ch: string,
  x: number,
  top: number,
  height: number,
  width: number,
  side: 'left' | 'right'
): void {
  if (!ch) return;
  const c = ctx.ctx;
  c.save();
  c.strokeStyle = ctx.color;
  c.lineWidth = Math.max(1, ctx.fontSize * 0.05);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const bottom = top + height;
  const tipInset = width * 0.7;

  const drawParen = (open: boolean) => {
    c.beginPath();
    if (open) {
      c.moveTo(x + width, top);
      c.quadraticCurveTo(x, (top + bottom) / 2, x + width, bottom);
    } else {
      c.moveTo(x, top);
      c.quadraticCurveTo(x + width, (top + bottom) / 2, x, bottom);
    }
    c.stroke();
  };

  const drawBracket = (open: boolean) => {
    c.beginPath();
    if (open) {
      c.moveTo(x + tipInset, top);
      c.lineTo(x, top);
      c.lineTo(x, bottom);
      c.lineTo(x + tipInset, bottom);
    } else {
      c.moveTo(x + width - tipInset, top);
      c.lineTo(x + width, top);
      c.lineTo(x + width, bottom);
      c.lineTo(x + width - tipInset, bottom);
    }
    c.stroke();
  };

  const drawBar = (offset: number) => {
    c.beginPath();
    c.moveTo(x + offset, top);
    c.lineTo(x + offset, bottom);
    c.stroke();
  };

  const drawBrace = (open: boolean) => {
    const midY = (top + bottom) / 2;
    const bx = open ? x + width : x;
    const tx = open ? x : x + width;
    c.beginPath();
    c.moveTo(bx, top);
    c.quadraticCurveTo(tx, top + height * 0.25, (bx + tx) / 2, top + height * 0.4);
    c.quadraticCurveTo(tx, midY - 1, tx, midY);
    c.quadraticCurveTo(tx, midY + 1, (bx + tx) / 2, bottom - height * 0.4);
    c.quadraticCurveTo(tx, bottom - height * 0.25, bx, bottom);
    c.stroke();
  };

  switch (ch) {
    case '(':
      drawParen(true);
      break;
    case ')':
      drawParen(false);
      break;
    case '[':
      drawBracket(true);
      break;
    case ']':
      drawBracket(false);
      break;
    case '{':
      drawBrace(true);
      break;
    case '}':
      drawBrace(false);
      break;
    case '|':
      drawBar(side === 'left' ? width * 0.5 : width * 0.5);
      break;
    case '‖':
      drawBar(width * 0.3);
      drawBar(width * 0.7);
      break;
    default:
      break;
  }

  c.restore();
}

/**
 * Render plain text
 */
function renderText(text: string, ctx: LaTeXRenderContext): LaTeXDimensions {
  ctx.ctx.save();
  ctx.ctx.font = `${ctx.fontSize}px ${ctx.fontFamily}`;
  ctx.ctx.fillStyle = ctx.color;
  ctx.ctx.textAlign = 'left';
  ctx.ctx.textBaseline = 'alphabetic';

  const metrics = ctx.ctx.measureText(text);
  ctx.ctx.fillText(text, ctx.x, ctx.y);

  ctx.ctx.restore();

  const height = ctx.fontSize;
  const baseline = height * 0.75; // Approximate baseline

  return {
    width: metrics.width,
    height,
    baseline,
  };
}

/**
 * Render mathematical symbol
 */
function renderSymbol(symbol: string, ctx: LaTeXRenderContext): LaTeXDimensions {
  // Use larger font size for symbols
  ctx.ctx.save();
  ctx.ctx.font = `${ctx.fontSize * 1.1}px ${ctx.fontFamily}`;
  ctx.ctx.fillStyle = ctx.color;
  ctx.ctx.textAlign = 'left';
  ctx.ctx.textBaseline = 'alphabetic';

  const metrics = ctx.ctx.measureText(symbol);
  ctx.ctx.fillText(symbol, ctx.x, ctx.y);

  ctx.ctx.restore();

  const height = ctx.fontSize * 1.1;
  const baseline = height * 0.75;

  return {
    width: metrics.width,
    height,
    baseline,
  };
}

/**
 * Render superscript (exponent)
 */
function renderSuperscript(
  nodes: LaTeXNode[],
  ctx: LaTeXRenderContext
): LaTeXDimensions {
  const scaledFontSize = ctx.fontSize * 0.7;
  const yOffset = -ctx.fontSize * 0.4;

  const dims = renderNodes(nodes, {
    ...ctx,
    fontSize: scaledFontSize,
    y: ctx.y + yOffset,
  });

  const subAscent = dims.baseline;
  const subDescent = dims.height - dims.baseline;

  return {
    width: dims.width,
    height: (subAscent - yOffset) + (subDescent + yOffset),
    baseline: subAscent - yOffset,
  };
}

/**
 * Render subscript
 */
function renderSubscript(
  nodes: LaTeXNode[],
  ctx: LaTeXRenderContext
): LaTeXDimensions {
  const scaledFontSize = ctx.fontSize * 0.7;
  const yOffset = ctx.fontSize * 0.3;

  const dims = renderNodes(nodes, {
    ...ctx,
    fontSize: scaledFontSize,
    y: ctx.y + yOffset,
  });

  const subAscent = dims.baseline;
  const subDescent = dims.height - dims.baseline;

  return {
    width: dims.width,
    height: (subAscent - yOffset) + (subDescent + yOffset),
    baseline: subAscent - yOffset,
  };
}

/**
 * Render fraction
 */
function renderFraction(
  numerator: LaTeXNode[],
  denominator: LaTeXNode[],
  ctx: LaTeXRenderContext
): LaTeXDimensions {
  const scaledFontSize = ctx.fontSize * 0.85;
  const lineThickness = Math.max(1, ctx.fontSize * 0.05);
  const padding = ctx.fontSize * 0.1;

  // Measure both parts
  const numDims = measureNodes(numerator, {
    ...ctx,
    fontSize: scaledFontSize,
  });
  const denDims = measureNodes(denominator, {
    ...ctx,
    fontSize: scaledFontSize,
  });

  const maxWidth = Math.max(numDims.width, denDims.width);
  const totalHeight = numDims.height + denDims.height + padding * 2 + lineThickness;

  // Render numerator (centered)
  const numX = ctx.x + (maxWidth - numDims.width) / 2;
  const numY = ctx.y - padding - lineThickness / 2;
  renderNodes(numerator, {
    ...ctx,
    x: numX,
    y: numY,
    fontSize: scaledFontSize,
  });

  // Draw fraction line
  ctx.ctx.fillStyle = ctx.color;
  ctx.ctx.fillRect(
    ctx.x,
    ctx.y - lineThickness / 2,
    maxWidth,
    lineThickness
  );

  // Render denominator (centered)
  const denX = ctx.x + (maxWidth - denDims.width) / 2;
  const denY = ctx.y + denDims.baseline + padding + lineThickness / 2;
  renderNodes(denominator, {
    ...ctx,
    x: denX,
    y: denY,
    fontSize: scaledFontSize,
  });

  return {
    width: maxWidth,
    height: totalHeight,
    baseline: totalHeight / 2,
  };
}

/**
 * Render square root
 */
function renderSqrt(nodes: LaTeXNode[], ctx: LaTeXRenderContext): LaTeXDimensions {
  const contentDims = renderNodes(nodes, {
    ...ctx,
    x: ctx.x + ctx.fontSize * 0.4,
  });

  const totalWidth = contentDims.width + ctx.fontSize * 0.5;
  const totalHeight = contentDims.height * 1.1;

  // Draw radical symbol
  ctx.ctx.save();
  ctx.ctx.strokeStyle = ctx.color;
  ctx.ctx.lineWidth = Math.max(1, ctx.fontSize * 0.05);
  ctx.ctx.lineCap = 'round';
  ctx.ctx.lineJoin = 'miter';

  ctx.ctx.beginPath();
  // Left tick
  ctx.ctx.moveTo(ctx.x, ctx.y - totalHeight * 0.3);
  ctx.ctx.lineTo(ctx.x + ctx.fontSize * 0.15, ctx.y);
  // Down stroke
  ctx.ctx.lineTo(ctx.x + ctx.fontSize * 0.3, ctx.y - totalHeight * 0.9);
  // Top bar
  ctx.ctx.lineTo(ctx.x + totalWidth, ctx.y - totalHeight * 0.9);
  ctx.ctx.stroke();

  ctx.ctx.restore();

  return {
    width: totalWidth,
    height: totalHeight,
    baseline: contentDims.baseline,
  };
}

/**
 * Measure nodes without rendering
 */
function measureNodes(
  nodes: LaTeXNode[],
  ctx: LaTeXRenderContext
): LaTeXDimensions {
  // Create an offscreen canvas for measurement
  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d');
  if (!measureCtx) {
    return { width: 0, height: 0, baseline: 0 };
  }

  return renderNodes(nodes, { ...ctx, ctx: measureCtx, x: 0, y: 0 });
}
