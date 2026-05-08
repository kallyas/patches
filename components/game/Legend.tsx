import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameColors } from '@/game/colors';
import { ShapeType } from '@/game/types';
import { ClueChip } from './ClueChip';

interface Props {
  scheme: 'light' | 'dark';
}

const ITEMS: { shape: ShapeType; label: string }[] = [
  { shape: 'square', label: 'Square' },
  { shape: 'tall', label: 'Tall' },
  { shape: 'wide', label: 'Wide' },
  { shape: 'any', label: 'Any' },
];

/**
 * Legend explaining the four chip shapes. Mirrors the explanatory footer in
 * the LinkedIn Patches screenshot.
 */
export function Legend({ scheme }: Props) {
  const c = GameColors[scheme];
  return (
    <View>
      <View style={styles.row}>
        {ITEMS.map((item) => (
          <View key={item.shape} style={styles.item}>
            <View style={styles.chipBox}>
              <ClueChip shape={item.shape} area={null} cellSize={36} color={c.textMuted} />
            </View>
            <Text style={[styles.label, { color: c.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.note, { color: c.textMuted }]}>
        The number on a chip is the size of its patch.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  chipBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  note: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
});
