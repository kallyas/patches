import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board } from '@/components/game/Board';
import { ControlsBar } from '@/components/game/ControlsBar';
import { Legend } from '@/components/game/Legend';
import { WinScreen } from '@/components/game/WinScreen';
import { GameColors } from '@/game/colors';
import { SavedGame, clearSavedGame, loadSavedGame, saveGame } from '@/game/storage';
import { Difficulty, Rect } from '@/game/types';
import { findIncorrectPatch, isComplete, nextHint } from '@/game/validator';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameState } from '@/hooks/useGameState';
import { formatTime, useStats } from '@/hooks/useStats';

/**
 * Top-level game route. Acts as a bootstrap: depending on the `resume`
 * route param it either loads the persisted game snapshot from disk or
 * clears any stale snapshot (so a fresh "Play" press always starts new).
 *
 * The actual game UI lives in <GameView/>, mounted only after bootstrap.
 * This avoids a race where the reducer initializes with a stale puzzle
 * before the saved-game read completes.
 */
export default function GameScreen() {
  const params = useLocalSearchParams<{ resume?: string; difficulty?: string }>();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[scheme];

  const wantsResume = params.resume === 'true';
  const requestedDifficulty: Difficulty =
    params.difficulty === 'easy' || params.difficulty === 'hard'
      ? params.difficulty
      : 'medium';

  const [bootstrap, setBootstrap] = useState<{
    resumeFrom: SavedGame | null;
    difficulty: Difficulty;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (wantsResume) {
      loadSavedGame().then((saved) => {
        if (cancelled) return;
        // Resuming inherits the saved difficulty so the puzzle/clue counts
        // line up with the snapshot, not whatever was selected on Home.
        setBootstrap({
          resumeFrom: saved,
          difficulty: saved?.difficulty ?? requestedDifficulty,
        });
      });
    } else {
      // Fresh game: drop any stale snapshot so the upcoming first save
      // doesn't race with leftover data.
      clearSavedGame().finally(() => {
        if (cancelled) return;
        setBootstrap({ resumeFrom: null, difficulty: requestedDifficulty });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [wantsResume, requestedDifficulty]);

  if (!bootstrap) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  return (
    <GameView
      key={bootstrap.resumeFrom ? `resume-${bootstrap.resumeFrom.puzzleNumber}` : 'fresh'}
      difficulty={bootstrap.difficulty}
      resumeFrom={bootstrap.resumeFrom}
    />
  );
}

interface GameViewProps {
  difficulty: Difficulty;
  resumeFrom: SavedGame | null;
}

function GameView({ difficulty, resumeFrom }: GameViewProps) {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[scheme];

  const { stats, loaded: statsLoaded, recordWin, claimPuzzleNumber } = useStats();
  const game = useGameState(difficulty, 6, resumeFrom);
  const {
    state,
    complete,
    place,
    removePatch,
    undo,
    reset,
    newPuzzle,
    showHint,
    clearHint,
    finish,
  } = game;

  const [boardWidth, setBoardWidth] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  /** Sequential number for the current puzzle ("Patches #N"). 0 until claimed. */
  const [puzzleNumber, setPuzzleNumber] = useState(resumeFrom?.puzzleNumber ?? 0);

  // For fresh starts, claim a puzzle number once stats hydrate. Resumed
  // games already carry their original number from disk.
  useEffect(() => {
    if (resumeFrom) return;
    if (!statsLoaded || puzzleNumber !== 0) return;
    setPuzzleNumber(claimPuzzleNumber());
  }, [resumeFrom, statsLoaded, puzzleNumber, claimPuzzleNumber]);

  // Persist the current game whenever something visible changes. Debounced
  // so rapid placements don't hammer AsyncStorage.
  useEffect(() => {
    if (state.finishedAt) return; // win clears storage separately
    if (puzzleNumber === 0) return; // wait until we have a number
    const id = setTimeout(() => {
      const snapshot: SavedGame = {
        puzzle: state.puzzle,
        patches: state.patches,
        moves: state.moves,
        redraws: state.redraws,
        hintsUsed: state.hintsUsed,
        elapsedMs: Math.max(0, Date.now() - state.startedAt),
        puzzleNumber,
        difficulty,
      };
      saveGame(snapshot);
    }, 220);
    return () => clearTimeout(id);
  }, [
    state.puzzle,
    state.patches,
    state.moves,
    state.redraws,
    state.hintsUsed,
    state.startedAt,
    state.finishedAt,
    puzzleNumber,
    difficulty,
  ]);

  // Tick the timer once per second.
  useEffect(() => {
    if (state.finishedAt) return;
    const id = setInterval(() => setElapsed(Date.now() - state.startedAt), 1000);
    setElapsed(Date.now() - state.startedAt);
    return () => clearInterval(id);
  }, [state.startedAt, state.finishedAt]);

  // Detect win.
  const winRecorded = useRef(false);
  useEffect(() => {
    if (complete && !state.finishedAt) {
      finish();
      const time = Date.now() - state.startedAt;
      if (!winRecorded.current) {
        winRecorded.current = true;
        recordWin(difficulty, time);
        clearSavedGame();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  }, [complete, state.finishedAt, state.startedAt, finish, recordWin, difficulty]);

  useEffect(() => {
    winRecorded.current = false;
  }, [state.puzzle]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    const cap = Math.min(width, 520);
    const snapped = Math.floor(cap / 6) * 6;
    setBoardWidth(snapped);
  }, []);

  const onPlace = useCallback((rect: Rect) => place(rect), [place]);

  const onUndo = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    undo();
  }, [undo]);

  const onReset = useCallback(() => {
    if (state.patches.length === 0) return;
    Alert.alert('Reset board?', 'This will clear your placed patches.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          reset();
        },
      },
    ]);
  }, [state.patches.length, reset]);

  const onHint = useCallback(() => {
    const wrong = findIncorrectPatch(state.puzzle, state.patches);
    if (wrong) {
      showHint({ row: wrong.row, col: wrong.col, width: wrong.width, height: wrong.height });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    const next = nextHint(state.puzzle, state.patches);
    if (next) {
      showHint(next.rect);
      Haptics.selectionAsync().catch(() => {});
    }
  }, [state.puzzle, state.patches, showHint]);

  const onCheck = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const wrong = findIncorrectPatch(state.puzzle, state.patches);
    if (wrong) {
      showHint({ row: wrong.row, col: wrong.col, width: wrong.width, height: wrong.height });
      return;
    }
    if (isComplete(state.puzzle, state.patches)) return;
    Alert.alert('Looking good', 'No mistakes yet — keep going.');
  }, [state.puzzle, state.patches, showHint]);

  useEffect(() => {
    if (!state.hintRect) return;
    const id = setTimeout(() => clearHint(), 1800);
    return () => clearTimeout(id);
  }, [state.hintRect, state.flashTick, clearHint]);

  // Going Home does NOT abandon — the snapshot is preserved so the player
  // can resume from the Home screen. Streak resets only on explicit
  // "New game" while a snapshot exists (handled on the Home screen).
  const onBack = useCallback(() => router.back(), [router]);

  const onNextPuzzle = useCallback(() => {
    newPuzzle(difficulty);
    setElapsed(0);
    setPuzzleNumber(claimPuzzleNumber());
  }, [newPuzzle, difficulty, claimPuzzleNumber]);

  const diffLabel = useMemo(
    () => difficulty[0].toUpperCase() + difficulty.slice(1),
    [difficulty],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <MaterialIcons name="chevron-left" size={26} color={c.text} />
          </Pressable>
          <View style={styles.topMeta}>
            <Text style={[styles.diffPill, { backgroundColor: c.accentSoft, color: c.accent }]}>
              {diffLabel}
            </Text>
            {puzzleNumber > 0 ? (
              <Text style={[styles.puzzleNo, { color: c.textMuted }]}>#{puzzleNumber}</Text>
            ) : null}
          </View>
          <View style={styles.topMetaRight}>
            <Text style={[styles.timer, { color: c.text }]}>{formatTime(elapsed)}</Text>
            <Text style={[styles.movesLabel, { color: c.textMuted }]}>
              {state.moves} {state.moves === 1 ? 'move' : 'moves'}
            </Text>
          </View>
        </View>

        <View style={styles.boardWrap} onLayout={onLayout}>
          {boardWidth > 0 ? (
            <Board
              width={boardWidth}
              puzzle={state.puzzle}
              patches={state.patches}
              hintRect={state.hintRect}
              errorRect={state.errorRect}
              flashTick={state.flashTick}
              scheme={scheme}
              onPlace={onPlace}
              onRemovePatch={removePatch}
            />
          ) : null}
        </View>

        <View style={styles.controlsWrap}>
          <ControlsBar
            scheme={scheme}
            onUndo={onUndo}
            onReset={onReset}
            onHint={onHint}
            onCheck={onCheck}
            canUndo={game.canUndo}
          />
          <View style={styles.legendWrap}>
            <Legend scheme={scheme} />
          </View>
        </View>
      </SafeAreaView>

      <WinScreen
        visible={!!state.finishedAt}
        scheme={scheme}
        difficulty={difficulty}
        puzzleNumber={puzzleNumber}
        timeMs={(state.finishedAt ?? Date.now()) - state.startedAt}
        moves={state.moves}
        redraws={state.redraws}
        streak={stats.currentStreak}
        onNext={onNextPuzzle}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 4,
  },
  topMeta: {
    flex: 1,
    alignItems: 'center',
  },
  topMetaRight: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  diffPill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  puzzleNo: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  movesLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  controlsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 14,
  },
  legendWrap: {
    paddingTop: 4,
  },
});
