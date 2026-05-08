import { createRng, randomSeed, shuffle } from './random';
import { hasUniqueSolution } from './solver';
import { Clue, Difficulty, Puzzle, Rect, ShapeType, classifyShape } from './types';

interface GenOptions {
  size: number;
  difficulty: Difficulty;
  /** Optional seed; if omitted, a random one is picked. */
  seed?: number;
  /** Max attempts before giving up (very rare). */
  maxAttempts?: number;
}

/**
 * Difficulty controls how the random tiling is shaped and how many shape
 * constraints we hide:
 *   - easy: many small patches, almost every clue carries a shape constraint.
 *   - medium: balanced.
 *   - hard: bigger patches, more "any" clues — so the solver has more freedom.
 */
/**
 * Area weights per difficulty. Note: in a 6×6 grid the set of feasible areas
 * is constrained by which W×H rectangles fit. Area 7 is genuinely impossible
 * (7 is prime → only 1×7, which doesn't fit in 6 cells). Areas 10, 11, 13+
 * are also infeasible or constrained. Area 5 is only achievable as a 1×5
 * strip and is included here at a low weight so it appears occasionally.
 */
const DIFFICULTY_PROFILES: Record<
  Difficulty,
  { areaWeights: Record<number, number>; anyChance: number; minPatches: number; maxPatches: number }
> = {
  easy: {
    areaWeights: { 2: 7, 3: 5, 4: 5, 5: 1, 6: 2, 8: 1, 9: 1 },
    anyChance: 0.05,
    minPatches: 7,
    maxPatches: 11,
  },
  medium: {
    areaWeights: { 2: 4, 3: 4, 4: 5, 5: 2, 6: 4, 8: 2, 9: 2 },
    anyChance: 0.2,
    minPatches: 6,
    maxPatches: 9,
  },
  hard: {
    areaWeights: { 2: 2, 3: 3, 4: 4, 5: 2, 6: 5, 8: 3, 9: 3, 12: 1 },
    anyChance: 0.45,
    minPatches: 4,
    maxPatches: 8,
  },
};

interface GridState {
  size: number;
  occupied: Uint8Array; // 0 = empty, otherwise rectIndex+1
}

function newGrid(size: number): GridState {
  return { size, occupied: new Uint8Array(size * size) };
}

function firstEmptyCell(g: GridState): { row: number; col: number } | null {
  for (let i = 0; i < g.occupied.length; i++) {
    if (!g.occupied[i]) {
      return { row: (i / g.size) | 0, col: i % g.size };
    }
  }
  return null;
}

function canPlace(g: GridState, rect: Rect): boolean {
  if (rect.row < 0 || rect.col < 0) return false;
  if (rect.row + rect.height > g.size) return false;
  if (rect.col + rect.width > g.size) return false;
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    const base = r * g.size;
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      if (g.occupied[base + c]) return false;
    }
  }
  return true;
}

function place(g: GridState, rect: Rect, value: number): void {
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    const base = r * g.size;
    for (let c = rect.col; c < rect.col + rect.width; c++) {
      g.occupied[base + c] = value;
    }
  }
}

/**
 * Generate candidate rectangles whose top-left lies at `start`, where `start`
 * is the first empty cell scanned in row-major order. Because of the scan
 * order, the rectangle's top-left must equal `start` (anything above-or-left
 * is already filled, so any rectangle covering `start` necessarily has its
 * top-left at `start`).
 */
function candidateRects(
  g: GridState,
  start: { row: number; col: number },
  rng: () => number,
  profile: (typeof DIFFICULTY_PROFILES)[Difficulty],
): Rect[] {
  const allowedAreas = Object.keys(profile.areaWeights).map(Number);
  const out: { rect: Rect; weight: number }[] = [];
  for (const area of allowedAreas) {
    const weight = profile.areaWeights[area];
    // Enumerate (w, h) pairs with w*h == area
    for (let h = 1; h <= area; h++) {
      if (area % h !== 0) continue;
      const w = area / h;
      if (w > g.size || h > g.size) continue;
      const rect: Rect = { row: start.row, col: start.col, width: w, height: h };
      if (canPlace(g, rect)) {
        out.push({ rect, weight });
      }
    }
  }

  // Weighted shuffle: bigger weights tend to appear earlier.
  // Simple approach: assign each item a random key = -log(rand)/weight
  // (lower key = earlier). Standard weighted reservoir-style ordering.
  const ordered = out
    .map((c) => ({ ...c, key: -Math.log(Math.max(rng(), 1e-9)) / c.weight }))
    .sort((a, b) => a.key - b.key)
    .map((c) => c.rect);
  return ordered;
}

/** Greedy/backtracking tile of the grid into rectangles. */
function tile(
  g: GridState,
  rng: () => number,
  profile: (typeof DIFFICULTY_PROFILES)[Difficulty],
  rects: Rect[],
  depth = 0,
): boolean {
  if (depth > 200) return false;
  const start = firstEmptyCell(g);
  if (!start) return true;

  const candidates = candidateRects(g, start, rng, profile);
  for (const rect of candidates) {
    place(g, rect, rects.length + 1);
    rects.push(rect);
    if (tile(g, rng, profile, rects, depth + 1)) return true;
    rects.pop();
    place(g, rect, 0);
  }
  return false;
}

/**
 * Pick a random cell within the rectangle as its clue location, and decide
 * whether to assign a shape constraint or "any".
 */
function buildClue(rect: Rect, rng: () => number, anyChance: number): Clue {
  const r = rect.row + Math.floor(rng() * rect.height);
  const c = rect.col + Math.floor(rng() * rect.width);
  let shape: ShapeType = classifyShape(rect.width, rect.height);
  if (rng() < anyChance) shape = 'any';
  return { row: r, col: c, area: rect.width * rect.height, shape };
}

/** Generate a puzzle, retrying until one with a unique solution is found. */
export function generatePuzzle(opts: GenOptions): Puzzle {
  const { size, difficulty } = opts;
  const profile = DIFFICULTY_PROFILES[difficulty];
  const maxAttempts = opts.maxAttempts ?? 80;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = (opts.seed ?? randomSeed()) + attempt * 1009;
    const rng = createRng(seed);

    const grid = newGrid(size);
    const rects: Rect[] = [];
    if (!tile(grid, rng, profile, rects)) continue;
    if (rects.length < profile.minPatches || rects.length > profile.maxPatches) continue;

    // Build clues. We may need to retry the "any" decisions if uniqueness
    // fails: sometimes constraints are too loose.
    let clues: Clue[] | null = null;
    let solution: Rect[] | null = null;
    for (let inner = 0; inner < 6; inner++) {
      const candidate: Clue[] = rects.map((r) => buildClue(r, rng, profile.anyChance));
      // Order clues to match rects so the solution stays parallel.
      if (hasUniqueSolution(candidate, size)) {
        clues = candidate;
        solution = rects.slice();
        break;
      }
    }
    if (!clues || !solution) {
      // Last resort: lock all shape constraints (no "any") and try once more.
      const strict: Clue[] = rects.map((r) => {
        const c = buildClue(r, rng, 0);
        return c;
      });
      if (hasUniqueSolution(strict, size)) {
        clues = strict;
        solution = rects.slice();
      } else {
        continue;
      }
    }

    return {
      size,
      clues,
      solution,
      difficulty,
      seed,
    };
  }

  throw new Error(`Failed to generate puzzle after ${maxAttempts} attempts`);
}
