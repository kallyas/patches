import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { GameColors } from '@/game/colors';
import { buildShareText } from '@/game/share';
import { Difficulty } from '@/game/types';
import { formatTime } from '@/hooks/useStats';
import { Confetti } from './Confetti';

interface Props {
  visible: boolean;
  scheme: 'light' | 'dark';
  difficulty: Difficulty;
  puzzleNumber: number;
  timeMs: number;
  moves: number;
  redraws: number;
  streak: number;
  onNext: () => void;
  onClose: () => void;
}

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function WinScreen({
  visible,
  scheme,
  difficulty,
  puzzleNumber,
  timeMs,
  moves,
  redraws,
  streak,
  onNext,
  onClose,
}: Props) {
  const c = GameColors[scheme];

  const onShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const message = buildShareText({ puzzleNumber, timeMs, redraws, streak });
    try {
      await Share.share({ message });
    } catch {
      // user dismissed or share unavailable — silent.
    }
  };

  return (
    <Modal animationType="fade" visible={visible} transparent statusBarTranslucent>
      <View
        style={[
          styles.backdrop,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,17,21,0.45)' },
        ]}
      >
        <Confetti active={visible} />
        <Animated.View
          entering={ZoomIn.duration(300)}
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.cellBorder }]}
        >
          <Animated.Text
            entering={FadeIn.delay(120)}
            style={[styles.heading, { color: c.text }]}
          >
            Solved!
          </Animated.Text>
          <Text style={[styles.puzzleNo, { color: c.textMuted }]}>
            Patches #{puzzleNumber} · {DIFF_LABEL[difficulty]}
          </Text>

          <View style={styles.statsRow}>
            <Stat label="Time" value={formatTime(timeMs)} scheme={scheme} />
            <View style={[styles.divider, { backgroundColor: c.cellBorder }]} />
            <Stat label="Moves" value={`${moves}`} scheme={scheme} />
            <View style={[styles.divider, { backgroundColor: c.cellBorder }]} />
            <Stat label="Redraws" value={`${redraws}`} scheme={scheme} />
          </View>

          {streak >= 2 ? (
            <View style={[styles.streakChip, { backgroundColor: c.accentSoft }]}>
              <MaterialIcons name="local-fire-department" size={14} color={c.accent} />
              <Text style={[styles.streakText, { color: c.accent }]}>
                {streak}-win streak
              </Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.shareBtn,
                {
                  backgroundColor: c.accentSoft,
                  borderColor: c.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <MaterialIcons name="ios-share" size={18} color={c.accent} />
              <Text style={[styles.shareLabel, { color: c.accent }]}>Share</Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryLabel}>Next</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </View>

          <Pressable onPress={onClose} style={styles.secondaryBtn}>
            <Text style={[styles.secondaryLabel, { color: c.textMuted }]}>Back to menu</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  puzzleNo: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    width: '100%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
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
  divider: {
    width: 1,
    height: 32,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 16,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.2,
    flex: 1,
  },
  shareLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1.4,
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
