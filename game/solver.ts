import { Clue, Rect, ShapeType, classifyShape, shapeMatches } from './types';

/**
 * Enumerate every axis-aligned rectangle that:
 *   - contains the clue cell (clue.row, clue.col)
 *   - has area exactly clue.area
 *   - has a shape compatible with clue.shape
 *   - fits within the grid
 */
export function rectsForClue(clue: Clue, size: number): Rect[] {
  const out: Rect[] = [];
  for (let h = 1; h <= clue.area; h++) {
    if (clue.area % h !== 0) continue;
    const w = clue.area / h;
    if (w > size || h > size) continue;
    if (!shapeMatches(classifyShape(w, h), clue.shape)) continue;

    // Candidate top-left positions so the rectangle covers (clue.row, clue.col)
    const rMin = Math.max(0, clue.row - h + 1);
    const rMax = Math.min(size - h, clue.row);
    const cMin = Math.max(0, clue.col - w + 1);
    const cMax = Math.min(size - w, clue.col);
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        out.push({ row: r, col: c, width: w, height: h });
      }
    }
  }
  return out;
}

interface SolveContext {
  size: number;
  clues: Clue[];
  /** Precomputed candidate rectangles per clue, ordered by index. */
  candidates: Rect[][];
  /** Bitmask grid of occupied cells. */
  occupied: Uint8Array;
  /** Found-so-far solutions (we stop once we have 2). */
  solutions: Rect[][];
  /** Containing-clue lookup: cell -> index of clue at that cell, or -1. */
  cellToClueIdx: Int8Array;
  limit: number;
}

function placeRect(ctx: SolveContext, rect: Rect, mark: 1 | 0): void {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    const base = r * ctx.size;
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      ctx.occupied[base + c] = mark;
    }
  }
}

function rectClear(ctx: SolveContext, rect: Rect): boolean {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    const base = r * ctx.size;
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      if (ctx.occupied[base + c]) return false;
    }
  }
  return true;
}

/**
 * The rectangle for clue `i` must not overlap any other clue cell. Catches
 * conflicts early and prunes the search tree.
 */
function rectContainsOnlyOwnClue(
  ctx: SolveContext,
  rect: Rect,
  clueIdx: number,
): boolean {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    const base = r * ctx.size;
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      const idx = ctx.cellToClueIdx[base + c];
      if (idx !== -1 && idx !== clueIdx) return false;
    }
  }
  return true;
}

function findFirstEmpty(ctx: SolveContext): number {
  for (let i = 0; i < ctx.occupied.length; i++) {
    if (!ctx.occupied[i]) return i;
  }
  return -1;
}

function recurse(
  ctx: SolveContext,
  remainingClueIndices: number[],
  assignment: Rect[],
): void {
  if (ctx.solutions.length >= ctx.limit) return;

  // Pick the clue whose rectangle should cover the first empty cell.
  // This drastically prunes vs. iterating clues in order, because every
  // empty cell must be covered by exactly one clue's rect.
  const firstEmpty = findFirstEmpty(ctx);
  if (firstEmpty === -1) {
    if (remainingClueIndices.length === 0) {
      ctx.solutions.push(assignment.slice());
    }
    return;
  }

  const fr = (firstEmpty / ctx.size) | 0;
  const fc = firstEmpty % ctx.size;

  for (let k = 0; k < remainingClueIndices.length; k++) {
    if (ctx.solutions.length >= ctx.limit) return;
    const clueIdx = remainingClueIndices[k];
    const cands = ctx.candidates[clueIdx];
    for (const rect of cands) {
      // Rect must cover the first empty cell.
      if (
        fr < rect.row ||
        fr >= rect.row + rect.height ||
        fc < rect.col ||
        fc >= rect.col + rect.width
      ) {
        continue;
      }
      if (!rectClear(ctx, rect)) continue;
      if (!rectContainsOnlyOwnClue(ctx, rect, clueIdx)) continue;

      placeRect(ctx, rect, 1);
      assignment.push(rect);
      const next = remainingClueIndices.slice(0, k).concat(remainingClueIndices.slice(k + 1));
      recurse(ctx, next, assignment);
      assignment.pop();
      placeRect(ctx, rect, 0);

      if (ctx.solutions.length >= ctx.limit) return;
    }
  }
}

/**
 * Find up to `limit` solutions for the given clue set. Returns an array of
 * solutions where each solution is a Rect[] parallel-indexed with the clues.
 *
 * Use limit=2 to verify uniqueness — if you get exactly 1 result, it's unique.
 */
export function solve(clues: Clue[], size: number, limit = 2): Rect[][] {
  // Sanity: total area must equal grid size, otherwise no solution.
  const totalArea = clues.reduce((s, c) => s + c.area, 0);
  if (totalArea !== size * size) return [];

  const cellToClueIdx = new Int8Array(size * size).fill(-1);
  for (let i = 0; i < clues.length; i++) {
    cellToClueIdx[clues[i].row * size + clues[i].col] = i;
  }

  const candidates = clues.map((c) => rectsForClue(c, size));
  if (candidates.some((cs) => cs.length === 0)) return [];

  const ctx: SolveContext = {
    size,
    clues,
    candidates,
    occupied: new Uint8Array(size * size),
    solutions: [],
    cellToClueIdx,
    limit,
  };

  const order = clues.map((_, i) => i);
  recurse(ctx, order, []);
  return ctx.solutions;
}

/** Convenience: returns true iff the puzzle has exactly one solution. */
export function hasUniqueSolution(clues: Clue[], size: number): boolean {
  return solve(clues, size, 2).length === 1;
}
