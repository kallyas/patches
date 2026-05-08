import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Difficulty } from '@/game/types';

const STORAGE_KEY = '@patches/stats/v1';

export interface DifficultyStats {
  played: number;
  solved: number;
  bestTimeMs: number | null;
  totalTimeMs: number;
}

export interface Stats {
  byDifficulty: Record<Difficulty, DifficultyStats>;
  totalSolved: number;
  currentStreak: number;
  bestStreak: number;
  /** Next sequential puzzle number to assign — see claimPuzzleNumber. */
  nextPuzzleNumber: number;
}

const EMPTY_DIFF: DifficultyStats = {
  played: 0,
  solved: 0,
  bestTimeMs: null,
  totalTimeMs: 0,
};

const EMPTY_STATS: Stats = {
  byDifficulty: {
    easy: { ...EMPTY_DIFF },
    medium: { ...EMPTY_DIFF },
    hard: { ...EMPTY_DIFF },
  },
  totalSolved: 0,
  currentStreak: 0,
  bestStreak: 0,
  nextPuzzleNumber: 1,
};

function clone(stats: Stats): Stats {
  return {
    byDifficulty: {
      easy: { ...stats.byDifficulty.easy },
      medium: { ...stats.byDifficulty.medium },
      hard: { ...stats.byDifficulty.hard },
    },
    totalSolved: stats.totalSolved,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    nextPuzzleNumber: stats.nextPuzzleNumber,
  };
}

export function avgTimeMs(d: DifficultyStats): number | null {
  if (d.solved === 0) return null;
  return d.totalTimeMs / d.solved;
}

export function formatTime(ms: number | null): string {
  if (ms == null) return '—';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);
  // Mirror stats in a ref so claimPuzzleNumber can read+write atomically
  // even when called outside of React's update cycle.
  const statsRef = useRef<Stats>(EMPTY_STATS);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        let merged: Stats = EMPTY_STATS;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Stats;
            // Defensive merge so missing fields fall back to defaults.
            merged = {
              ...EMPTY_STATS,
              ...parsed,
              byDifficulty: {
                easy: { ...EMPTY_DIFF, ...parsed.byDifficulty?.easy },
                medium: { ...EMPTY_DIFF, ...parsed.byDifficulty?.medium },
                hard: { ...EMPTY_DIFF, ...parsed.byDifficulty?.hard },
              },
            };
          } catch {
            merged = EMPTY_STATS;
          }
        }
        statsRef.current = merged;
        setStats(merged);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const persist = useCallback((next: Stats) => {
    setStats(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const recordWin = useCallback(
    (difficulty: Difficulty, timeMs: number) => {
      setStats((prev) => {
        const next = clone(prev);
        const d = next.byDifficulty[difficulty];
        d.played += 1;
        d.solved += 1;
        d.totalTimeMs += timeMs;
        d.bestTimeMs = d.bestTimeMs == null ? timeMs : Math.min(d.bestTimeMs, timeMs);
        next.totalSolved += 1;
        next.currentStreak += 1;
        next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const recordAbandon = useCallback(() => {
    setStats((prev) => {
      if (prev.currentStreak === 0) return prev;
      const next = clone(prev);
      next.currentStreak = 0;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /**
   * Reserve the next sequential puzzle number and persist the increment.
   * Returns the number assigned to the new puzzle (e.g. 52 → "Patches #52").
   * Synchronous, so callers can use the returned value immediately.
   */
  const claimPuzzleNumber = useCallback((): number => {
    const cur = statsRef.current;
    const num = cur.nextPuzzleNumber;
    const next = clone(cur);
    next.nextPuzzleNumber = num + 1;
    statsRef.current = next;
    setStats(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return num;
  }, []);

  const reset = useCallback(() => {
    persist(EMPTY_STATS);
  }, [persist]);

  return {
    stats,
    loaded,
    recordWin,
    recordAbandon,
    claimPuzzleNumber,
    reset,
  };
}
