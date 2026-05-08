import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClueChip } from '@/components/game/ClueChip';
import { PatchesLogo } from '@/components/PatchesLogo';
import { GameColors, patchColor } from '@/game/colors';
import { clearSavedGame } from '@/game/storage';
import { Difficulty, ShapeType } from '@/game/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSavedGame } from '@/hooks/useSavedGame';
import { avgTimeMs, formatTime, useStats } from '@/hooks/useStats';

const DIFFICULTIES: {
  value: Difficulty;
  label: string;
  blurb: string;
  /** Sample chips shown in the difficulty card to telegraph the puzzle feel. */
  sample: { shape: ShapeType; area: number; colorIndex: number }[];
}[] = [
  {
    value: 'easy',
    label: 'Easy',
    blurb: 'Smaller, shape-locked',
    sample: [
      { shape: 'square', area: 2, colorIndex: 0 },
      { shape: 'wide', area: 3, colorIndex: 2 },
      { shape: 'square', area: 4, colorIndex: 4 },
    ],
  },
  {
    value: 'medium',
    label: 'Medium',
    blurb: 'Balanced mix',
    sample: [
      { shape: 'tall', area: 3, colorIndex: 1 },
      { shape: 'square', area: 4, colorIndex: 6 },
      { shape: 'wide', area: 6, colorIndex: 3 },
    ],
  },
  {
    value: 'hard',
    label: 'Hard',
    blurb: 'Bigger, freer clues',
    sample: [
      { shape: 'any', area: 6, colorIndex: 7 },
      { shape: 'tall', area: 8, colorIndex: 5 },
      { shape: 'any', area: 9, colorIndex: 10 },
    ],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[scheme];
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const { stats, recordAbandon } = useStats();
  const { savedGame, refresh: refreshSavedGame } = useSavedGame();

  const onContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({ pathname: '/game', params: { resume: 'true' } });
  };

  const startFresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({ pathname: '/game', params: { difficulty } });
  };

  const onNewGame = () => {
    if (!savedGame) {
      startFresh();
      return;
    }
    // Abandoning an unfinished puzzle costs the streak — confirm first.
    Alert.alert(
      'Abandon current puzzle?',
      `You'll lose your progress on Patches #${savedGame.puzzleNumber} and reset your streak.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New game',
          style: 'destructive',
          onPress: async () => {
            recordAbandon();
            await clearSavedGame();
            await refreshSavedGame();
            startFresh();
          },
        },
      ],
    );
  };

  const diffStats = stats.byDifficulty[difficulty];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push('/about')}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialIcons name="info-outline" size={22} color={c.textMuted} />
          </Pressable>
        </View>

        <View style={styles.container}>
          <Animated.View
            entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}
            style={styles.hero}
          >
            <PatchesLogo size={150} scheme={scheme} />
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: c.text }]}>Patches</Text>
              <Text style={[styles.subtitle, { color: c.textMuted }]}>
                Tile the grid. One clue per patch.
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(200).duration(360)}
            style={styles.section}
          >
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Difficulty</Text>
            <View style={styles.diffRow}>
              {DIFFICULTIES.map((d) => {
                const selected = difficulty === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setDifficulty(d.value);
                    }}
                    style={({ pressed }) => [
                      styles.diffCard,
                      {
                        backgroundColor: selected ? c.accentSoft : c.surface,
                        borderColor: selected ? c.accent : c.cellBorder,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.diffSample}>
                      {d.sample.map((s, i) => (
                        <View key={i} style={styles.diffSampleSlot}>
                          <ClueChip
                            shape={s.shape}
                            area={s.area}
                            cellSize={28}
                            color={patchColor(s.colorIndex, scheme)}
                          />
                        </View>
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.diffLabel,
                        { color: selected ? c.accent : c.text },
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Text style={[styles.diffBlurb, { color: c.textMuted }]}>{d.blurb}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(280).duration(360)}
            style={styles.section}
          >
            <View style={styles.statsHeader}>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
                {DIFFICULTIES.find((d) => d.value === difficulty)?.label} stats
              </Text>
              {stats.currentStreak >= 1 ? (
                <View style={[styles.streakPill, { backgroundColor: c.accentSoft }]}>
                  <MaterialIcons name="local-fire-department" size={14} color={c.accent} />
                  <Text style={[styles.streakText, { color: c.accent }]}>
                    {stats.currentStreak}
                  </Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.statsCard,
                { backgroundColor: c.surface, borderColor: c.cellBorder },
              ]}
            >
              <Stat label="Solved" value={`${diffStats.solved}`} scheme={scheme} />
              <View style={[styles.statDivider, { backgroundColor: c.cellBorder }]} />
              <Stat label="Best" value={formatTime(diffStats.bestTimeMs)} scheme={scheme} />
              <View style={[styles.statDivider, { backgroundColor: c.cellBorder }]} />
              <Stat
                label="Average"
                value={formatTime(avgTimeMs(diffStats))}
                scheme={scheme}
              />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(360).duration(360)}
            style={styles.playWrap}
          >
            {savedGame ? (
              <ResumeBlock
                scheme={scheme}
                puzzleNumber={savedGame.puzzleNumber}
                difficulty={savedGame.difficulty}
                placed={savedGame.patches.length}
                total={savedGame.puzzle.clues.length}
                elapsedMs={savedGame.elapsedMs}
                onContinue={onContinue}
                onNewGame={onNewGame}
              />
            ) : (
              <Pressable
                onPress={startFresh}
                style={({ pressed }) => [
                  styles.playBtn,
                  {
                    backgroundColor: c.accent,
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <Text style={styles.playLabel}>Play</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Stat({
  label,
  value,
  scheme,
}: {
  label: string;
  value: string;
  scheme: 'light' | 'dark';
}) {
  const c = GameColors[scheme];
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

function ResumeBlock({
  scheme,
  puzzleNumber,
  difficulty,
  placed,
  total,
  elapsedMs,
  onContinue,
  onNewGame,
}: {
  scheme: 'light' | 'dark';
  puzzleNumber: number;
  difficulty: Difficulty;
  placed: number;
  total: number;
  elapsedMs: number;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  const c = GameColors[scheme];
  const diffLabel = difficulty[0].toUpperCase() + difficulty.slice(1);
  return (
    <View style={styles.resumeWrap}>
      <Pressable
        onPress={onContinue}
        style={({ pressed }) => [
          styles.continueBtn,
          {
            backgroundColor: c.accent,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={styles.continueText}>
          <Text style={styles.continueLabel}>Continue</Text>
          <Text style={styles.continueMeta}>
            #{puzzleNumber} · {diffLabel} · {placed}/{total} · {formatTime(elapsedMs)}
          </Text>
        </View>
        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
      </Pressable>
      <Pressable
        onPress={onNewGame}
        style={({ pressed }) => [
          styles.newGameBtn,
          {
            backgroundColor: c.surface,
            borderColor: c.cellBorder,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.newGameLabel, { color: c.text }]}>New game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  iconBtn: {
    padding: 6,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  diffSample: {
    flexDirection: 'row',
    height: 32,
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  diffSampleSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  diffBlurb: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  playWrap: {
    marginTop: 'auto',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  playLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resumeWrap: {
    gap: 8,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  continueText: {
    flex: 1,
    gap: 2,
  },
  continueLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  continueMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  newGameBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  newGameLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
