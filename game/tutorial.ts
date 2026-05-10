import { Puzzle } from './types';

/**
 * Hand-crafted 4×4 tutorial puzzle used by the first-launch onboarding.
 * Three clues, three simple shapes, deterministic — so the coach overlay
 * can target a known sequence and the player gets a guaranteed first win.
 *
 *   A A B B      A: 2×2 square (clue at 0,0)
 *   A A B B      B: 2×2 square (clue at 0,2)
 *   C C C C      C: 4×2 wide   (clue at 2,0)
 *   C C C C
 */
export const TUTORIAL_PUZZLE: Puzzle = {
  size: 4,
  difficulty: 'easy',
  seed: 0,
  clues: [
    { row: 0, col: 0, area: 4, shape: 'square' },
    { row: 0, col: 2, area: 4, shape: 'square' },
    { row: 2, col: 0, area: 8, shape: 'wide' },
  ],
  solution: [
    { row: 0, col: 0, width: 2, height: 2 },
    { row: 0, col: 2, width: 2, height: 2 },
    { row: 2, col: 0, width: 4, height: 2 },
  ],
};
