import { useCallback, useMemo, useReducer, useRef } from 'react';
import { generatePuzzle } from '@/game/generator';
import { SavedGame } from '@/game/storage';
import { Difficulty, Patch, Puzzle, Rect } from '@/game/types';
import { isComplete, validatePlacement, PlacementError } from '@/game/validator';

interface State {
  puzzle: Puzzle;
  patches: Patch[];
  history: Patch[][];
  startedAt: number;
  finishedAt: number | null;
  moves: number;
  /** Number of patches the player removed (corrections / redraws). */
  redraws: number;
  hintsUsed: number;
  hintRect: Rect | null;
  errorRect: Rect | null;
  errorReason: PlacementError | null;
  /** Bumps when a flash effect should retrigger. */
  flashTick: number;
}

type Action =
  | { type: 'place'; rect: Rect; clueIndex: number }
  | { type: 'remove'; patchId: string }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'newPuzzle'; puzzle: Puzzle }
  | { type: 'flashError'; rect: Rect; reason: PlacementError }
  | { type: 'clearFlash' }
  | { type: 'showHint'; rect: Rect }
  | { type: 'clearHint' }
  | { type: 'finish' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'place': {
      const id = `${action.rect.row}-${action.rect.col}-${action.rect.width}-${action.rect.height}-${state.moves}`;
      const patch: Patch = {
        ...action.rect,
        id,
        clueIndex: action.clueIndex,
        // Color tied to the clue (not placement order), so a clue's chip
        // and its placed patch always share the same color.
        colorIndex: action.clueIndex,
      };
      return {
        ...state,
        patches: [...state.patches, patch],
        history: [...state.history, state.patches],
        moves: state.moves + 1,
        errorRect: null,
        errorReason: null,
        hintRect: null,
      };
    }
    case 'remove': {
      const next = state.patches.filter((p) => p.id !== action.patchId);
      if (next.length === state.patches.length) return state;
      return {
        ...state,
        patches: next,
        history: [...state.history, state.patches],
        moves: state.moves + 1,
        redraws: state.redraws + 1,
        finishedAt: null,
      };
    }
    case 'undo': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...state,
        patches: prev,
        history: state.history.slice(0, -1),
        finishedAt: null,
      };
    }
    case 'reset': {
      return {
        ...state,
        patches: [],
        history: [],
        moves: 0,
        redraws: 0,
        finishedAt: null,
        startedAt: Date.now(),
        hintRect: null,
        errorRect: null,
        errorReason: null,
      };
    }
    case 'newPuzzle': {
      return {
        puzzle: action.puzzle,
        patches: [],
        history: [],
        startedAt: Date.now(),
        finishedAt: null,
        moves: 0,
        redraws: 0,
        hintsUsed: 0,
        hintRect: null,
        errorRect: null,
        errorReason: null,
        flashTick: 0,
      };
    }
    case 'flashError': {
      return {
        ...state,
        errorRect: action.rect,
        errorReason: action.reason,
        flashTick: state.flashTick + 1,
      };
    }
    case 'clearFlash': {
      return { ...state, errorRect: null, errorReason: null };
    }
    case 'showHint': {
      return {
        ...state,
        hintRect: action.rect,
        hintsUsed: state.hintsUsed + 1,
        flashTick: state.flashTick + 1,
      };
    }
    case 'clearHint': {
      return { ...state, hintRect: null };
    }
    case 'finish': {
      return { ...state, finishedAt: Date.now() };
    }
    default:
      return state;
  }
}

function init(puzzle: Puzzle): State {
  return {
    puzzle,
    patches: [],
    history: [],
    startedAt: Date.now(),
    finishedAt: null,
    moves: 0,
    redraws: 0,
    hintsUsed: 0,
    hintRect: null,
    errorRect: null,
    errorReason: null,
    flashTick: 0,
  };
}

/**
 * Reconstitute a State from a persisted SavedGame snapshot. We back-date
 * `startedAt` so the timer continues from where the player left off; the
 * undo history is intentionally not persisted (rebuilt from scratch).
 */
function fromSaved(s: SavedGame): State {
  return {
    puzzle: s.puzzle,
    patches: s.patches,
    history: [],
    startedAt: Date.now() - s.elapsedMs,
    finishedAt: null,
    moves: s.moves,
    redraws: s.redraws,
    hintsUsed: s.hintsUsed,
    hintRect: null,
    errorRect: null,
    errorReason: null,
    flashTick: 0,
  };
}

export function useGameState(
  initialDifficulty: Difficulty,
  size = 6,
  resumeFrom?: SavedGame | null,
) {
  // Either restore from the saved snapshot or generate a fresh puzzle. We
  // resolve once via a ref + lazy reducer init so React never regenerates
  // mid-render under Strict Mode.
  const initial = useRef<State | null>(null);
  if (!initial.current) {
    initial.current = resumeFrom
      ? fromSaved(resumeFrom)
      : init(generatePuzzle({ size, difficulty: initialDifficulty }));
  }
  const [state, dispatch] = useReducer(reducer, initial.current, (s) => s);

  const place = useCallback(
    (rect: Rect): { ok: true } | { ok: false; reason: PlacementError } => {
      const result = validatePlacement(rect, state.puzzle, state.patches);
      if (!result.ok) {
        dispatch({ type: 'flashError', rect, reason: result.error! });
        return { ok: false, reason: result.error! };
      }
      dispatch({ type: 'place', rect, clueIndex: result.clueIndex! });
      return { ok: true };
    },
    [state.puzzle, state.patches],
  );

  const removePatch = useCallback(
    (patchId: string) => dispatch({ type: 'remove', patchId }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const clearFlash = useCallback(() => dispatch({ type: 'clearFlash' }), []);
  const clearHint = useCallback(() => dispatch({ type: 'clearHint' }), []);
  const showHint = useCallback(
    (rect: Rect) => dispatch({ type: 'showHint', rect }),
    [],
  );
  const finish = useCallback(() => dispatch({ type: 'finish' }), []);
  const loadPuzzle = useCallback((puzzle: Puzzle) => {
    dispatch({ type: 'newPuzzle', puzzle });
  }, []);

  const newPuzzle = useCallback(
    (difficulty: Difficulty) => {
      const puzzle = generatePuzzle({ size, difficulty });
      dispatch({ type: 'newPuzzle', puzzle });
      return puzzle;
    },
    [size],
  );

  const complete = useMemo(() => isComplete(state.puzzle, state.patches), [
    state.puzzle,
    state.patches,
  ]);

  return {
    state,
    complete,
    place,
    removePatch,
    undo,
    reset,
    newPuzzle,
    showHint,
    clearHint,
    clearFlash,
    finish,
    loadPuzzle,
    canUndo: state.history.length > 0,
  };
}
