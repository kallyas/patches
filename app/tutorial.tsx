import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board } from '@/components/game/Board';
import { CoachOverlay } from '@/components/game/CoachOverlay';
import { GameColors } from '@/game/colors';
import { SavedGame } from '@/game/storage';
import { TUTORIAL_PUZZLE } from '@/game/tutorial';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameState } from '@/hooks/useGameState';
import { useIntroSeen } from '@/hooks/useIntroSeen';

const STEP_TIPS = [
  'Drag from the chip across to the dashed outline. The number on a chip is the patch’s area.',
  'Same idea — drag a 2×2 square that wraps the next chip.',
  'Last one: drag a wide 4×2 patch across the bottom row. You’ve got it.',
];

const COMPLETE_TIP = 'That’s the whole game. Tap below to play your first real puzzle.';

export default function TutorialScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[scheme];
  const { markSeen } = useIntroSeen();

  // Reuse the real Board by feeding useGameState a stable "saved" snapshot
  // pointed at the hand-crafted tutorial puzzle. This avoids forking the
  // game state machine while keeping the gesture/validation behaviour
  // identical to live play, so the muscle-memory transfers.
  const fakeSaved: SavedGame = useMemo(
    () => ({
      puzzle: TUTORIAL_PUZZLE,
      patches: [],
      moves: 0,
      redraws: 0,
      hintsUsed: 0,
      elapsedMs: 0,
      puzzleNumber: 0,
      difficulty: 'easy',
    }),
    [],
  );

  const game = useGameState('easy', TUTORIAL_PUZZLE.size, fakeSaved);
  const { state, place, removePatch } = game;

  const [boardWidth, setBoardWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    // Tutorial board is intentionally smaller than the real one so the
    // tooltip and CTA fit comfortably on a single screen.
    const cap = Math.min(width, 340);
    const snapped = Math.floor(cap / TUTORIAL_PUZZLE.size) * TUTORIAL_PUZZLE.size;
    setBoardWidth(snapped);
  }, []);

  const placedClueIds = useMemo(
    () => new Set(state.patches.map((p) => p.clueIndex)),
    [state.patches],
  );

  const nextClueIndex = useMemo(() => {
    for (let i = 0; i < TUTORIAL_PUZZLE.clues.length; i++) {
      if (!placedClueIds.has(i)) return i;
    }
    return null;
  }, [placedClueIds]);

  const completed = nextClueIndex === null;
  const cellSize = boardWidth > 0 ? boardWidth / TUTORIAL_PUZZLE.size : 0;
  const remaining = TUTORIAL_PUZZLE.clues.length - state.patches.length;
  // Last unsolved clue: drop the finger animation so the player commits
  // the gesture themselves before being released into the real game.
  const showFinger = remaining > 1;

  const winFiredRef = useRef(false);
  useEffect(() => {
    if (completed && !winFiredRef.current) {
      winFiredRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [completed]);

  const onFinish = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await markSeen();
    router.replace('/(tabs)');
  }, [markSeen, router]);

  const onSkip = useCallback(async () => {
    await markSeen();
    router.replace('/(tabs)');
  }, [markSeen, router]);

  const onPlace = useCallback((rect: Parameters<typeof place>[0]) => place(rect), [place]);

  const tip = completed
    ? COMPLETE_TIP
    : STEP_TIPS[Math.min(state.patches.length, STEP_TIPS.length - 1)];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: c.textMuted }]}>How to play</Text>
            <Text style={[styles.title, { color: c.text }]}>Welcome to Patches</Text>
          </View>
          {!completed ? (
            <Pressable onPress={onSkip} hitSlop={10} style={styles.skipBtn}>
              <Text style={[styles.skipLabel, { color: c.textMuted }]}>Skip</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.progressRow}>
          {TUTORIAL_PUZZLE.clues.map((_, i) => {
            const done = placedClueIds.has(i);
            return (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: done ? c.accent : c.cellBorder,
                    width: done ? 28 : 16,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.boardWrap} onLayout={onLayout}>
          {boardWidth > 0 ? (
            <View style={{ width: boardWidth, height: boardWidth }}>
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
              {!completed && nextClueIndex !== null ? (
                <CoachOverlay
                  cellSize={cellSize}
                  clueRow={TUTORIAL_PUZZLE.clues[nextClueIndex].row}
                  clueCol={TUTORIAL_PUZZLE.clues[nextClueIndex].col}
                  targetRect={TUTORIAL_PUZZLE.solution[nextClueIndex]}
                  showFinger={showFinger}
                  scheme={scheme}
                />
              ) : null}
            </View>
          ) : null}
        </View>

        <Animated.View
          // Soft fade so swapping tip text doesn't pop. Keyed on the tip
          // so each new step animates in.
          key={tip}
          entering={FadeIn.duration(220)}
          style={styles.tipWrap}
        >
          <Text style={[styles.tip, { color: c.text }]}>{tip}</Text>
          {!completed ? (
            <Text style={[styles.subtip, { color: c.textMuted }]}>
              Tap a placed patch to remove it if you change your mind.
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.bottomWrap}>
          {completed ? (
            <Pressable
              onPress={onFinish}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: c.accent, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={styles.primaryLabel}>Start playing</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tipWrap: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tip: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
  subtip: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    minHeight: 64,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
