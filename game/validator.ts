import { Clue, Patch, Puzzle, Rect, classifyShape, rectContains, rectsOverlap, shapeMatches } from './types';

export type PlacementError =
  | 'too-small'
  | 'no-clue'
  | 'multiple-clues'
  | 'wrong-area'
  | 'wrong-shape'
  | 'overlap'
  | 'out-of-bounds';

export interface PlacementResult {
  ok: boolean;
  error?: PlacementError;
  /** Index into puzzle.clues that this rectangle covers, when applicable. */
  clueIndex?: number;
}

export function validatePlacement(
  rect: Rect,
  puzzle: Puzzle,
  existingPatches: Patch[],
): PlacementResult {
  const { size } = puzzle;
  if (
    rect.row < 0 ||
    rect.col < 0 ||
    rect.row + rect.height > size ||
    rect.col + rect.width > size ||
    rect.width < 1 ||
    rect.height < 1
  ) {
    return { ok: false, error: 'out-of-bounds' };
  }

  for (const p of existingPatches) {
    if (rectsOverlap(rect, p)) return { ok: false, error: 'overlap' };
  }

  const containedClues: number[] = [];
  for (let i = 0; i < puzzle.clues.length; i++) {
    if (rectContains(rect, puzzle.clues[i].row, puzzle.clues[i].col)) {
      containedClues.push(i);
    }
  }
  if (containedClues.length === 0) return { ok: false, error: 'no-clue' };
  if (containedClues.length > 1) return { ok: false, error: 'multiple-clues' };

  const clue: Clue = puzzle.clues[containedClues[0]];
  const area = rect.width * rect.height;
  if (area !== clue.area) return { ok: false, error: 'wrong-area' };
  if (!shapeMatches(classifyShape(rect.width, rect.height), clue.shape)) {
    return { ok: false, error: 'wrong-shape' };
  }

  return { ok: true, clueIndex: containedClues[0] };
}

export function isComplete(puzzle: Puzzle, patches: Patch[]): boolean {
  if (patches.length !== puzzle.clues.length) return false;
  let total = 0;
  for (const p of patches) total += p.width * p.height;
  if (total !== puzzle.size * puzzle.size) return false;
  // No overlaps already enforced at placement time, but double-check coverage
  // by confirming each clue is covered exactly once.
  const covered = new Uint8Array(puzzle.clues.length);
  for (const p of patches) covered[p.clueIndex] = 1;
  for (let i = 0; i < covered.length; i++) {
    if (!covered[i]) return false;
  }
  return true;
}

/**
 * Find a placed patch that doesn't match the unique solution. Used by the
 * "Check" button to point out the offender, and by Hint to know what's
 * still unsolved.
 */
export function findIncorrectPatch(puzzle: Puzzle, patches: Patch[]): Patch | null {
  const solByClue = new Map<number, Rect>();
  puzzle.solution.forEach((r, i) => solByClue.set(i, r));
  for (const p of patches) {
    const expected = solByClue.get(p.clueIndex);
    if (!expected) return p;
    if (
      expected.row !== p.row ||
      expected.col !== p.col ||
      expected.width !== p.width ||
      expected.height !== p.height
    ) {
      return p;
    }
  }
  return null;
}

/** Return one solution rectangle that is not yet placed, for the hint button. */
export function nextHint(puzzle: Puzzle, patches: Patch[]): { clueIndex: number; rect: Rect } | null {
  const placedClues = new Set(patches.map((p) => p.clueIndex));
  for (let i = 0; i < puzzle.clues.length; i++) {
    if (!placedClues.has(i)) return { clueIndex: i, rect: puzzle.solution[i] };
  }
  return null;
}
