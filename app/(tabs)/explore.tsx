import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameColors } from '@/game/colors';
import { Difficulty } from '@/game/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DifficultyStats,
  avgTimeMs,
  formatTime,
  useStats,
} from '@/hooks/useStats';

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function StatsScreen() {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[scheme];
  const { stats, reset } = useStats();

  const onReset = () => {
    Alert.alert('Reset stats?', 'This will clear your records. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.title, { color: c.text }]}>Stats</Text>

          <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.cellBorder }]}>
            <SummaryStat label="Total solved" value={`${stats.totalSolved}`} scheme={scheme} />
            <View style={[styles.divider, { backgroundColor: c.cellBorder }]} />
            <SummaryStat label="Current streak" value={`${stats.currentStreak}`} scheme={scheme} />
            <View style={[styles.divider, { backgroundColor: c.cellBorder }]} />
            <SummaryStat label="Best streak" value={`${stats.bestStreak}`} scheme={scheme} />
          </View>

          {DIFFICULTIES.map((d) => (
            <DifficultyCard
              key={d.value}
              label={d.label}
              data={stats.byDifficulty[d.value]}
              scheme={scheme}
            />
          ))}

          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              styles.resetBtn,
              {
                borderColor: c.cellBorder,
                backgroundColor: pressed ? c.dangerSoft : c.surface,
              },
            ]}
          >
            <Text style={[styles.resetLabel, { color: c.danger }]}>Reset stats</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SummaryStat({
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
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

function DifficultyCard({
  label,
  data,
  scheme,
}: {
  label: string;
  data: DifficultyStats;
  scheme: 'light' | 'dark';
}) {
  const c = GameColors[scheme];
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cellBorder }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{label}</Text>
      <View style={styles.cardRow}>
        <Row label="Played" value={`${data.played}`} scheme={scheme} />
        <Row label="Solved" value={`${data.solved}`} scheme={scheme} />
      </View>
      <View style={styles.cardRow}>
        <Row label="Best time" value={formatTime(data.bestTimeMs)} scheme={scheme} />
        <Row label="Average" value={formatTime(avgTimeMs(data))} scheme={scheme} />
      </View>
    </View>
  );
}

function Row({ label, value, scheme }: { label: string; value: string; scheme: 'light' | 'dark' }) {
  const c = GameColors[scheme];
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  summaryCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    marginHorizontal: 6,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
