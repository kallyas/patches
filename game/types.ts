export type ShapeType = 'square' | 'wide' | 'tall' | 'any';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Clue {
  row: number;
  col: number;
  area: number;
  shape: ShapeType;
}

export interface Rect {
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface Patch extends Rect {
  id: string;
  /** Index into puzzle.clues that this patch covers. */
  clueIndex: number;
  /** Index into the patch color palette. */
  colorIndex: number;
}

export interface Puzzle {
  size: number;
  clues: Clue[];
  /** Solution rectangles, parallel-indexed with clues (solution[i] is the rect for clues[i]). */
  solution: Rect[];
  difficulty: Difficulty;
  seed: number;
}

export function classifyShape(width: number, height: number): ShapeType {
  if (width === height) return 'square';
  if (width > height) return 'wide';
  return 'tall';
}

export function shapeMatches(actual: ShapeType, required: ShapeType): boolean {
  return required === 'any' || actual === required;
}

export function rectContains(rect: Rect, row: number, col: number): boolean {
  return (
    row >= rect.row &&
    row < rect.row + rect.height &&
    col >= rect.col &&
    col < rect.col + rect.width
  );
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return (
    a.row === b.row && a.col === b.col && a.width === b.width && a.height === b.height
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.col + a.width <= b.col ||
    b.col + b.width <= a.col ||
    a.row + a.height <= b.row ||
    b.row + b.height <= a.row
  );
}
