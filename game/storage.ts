import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, Patch, Puzzle } from './types';

const KEY = '@patches/current-game/v1';

/**
 * Snapshot of an in-progress puzzle persisted to disk so the player can
 * resume after backgrounding the app or navigating home. Cleared when the
 * puzzle is solved or the player explicitly starts a new game.
 *
 * `elapsedMs` is the running clock (ms) at the moment of save — on resume
 * we set startedAt = now - elapsedMs so the timer continues correctly.
 */
export interface SavedGame {
  puzzle: Puzzle;
  patches: Patch[];
  moves: number;
  redraws: number;
  hintsUsed: number;
  elapsedMs: number;
  puzzleNumber: number;
  difficulty: Difficulty;
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed?.puzzle?.clues || !Array.isArray(parsed.patches)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveGame(game: SavedGame): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(game));
  } catch {}
}

export async function clearSavedGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
