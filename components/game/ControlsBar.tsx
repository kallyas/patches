import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { GameColors } from '@/game/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  scheme: 'light' | 'dark';
  variant?: 'default' | 'primary' | 'danger';
}

function ControlButton({ label, onPress, disabled, scheme, variant = 'default' }: ButtonProps) {
  const c = GameColors[scheme];
  const bg =
    variant === 'primary' ? c.accent : variant === 'danger' ? c.dangerSoft : c.surface;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? c.danger : c.text;
  const border = variant === 'primary' ? c.accent : c.cellBorder;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

interface Props {
  scheme: 'light' | 'dark';
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
  onCheck: () => void;
  canUndo: boolean;
}

export function ControlsBar({ scheme, onUndo, onReset, onHint, onCheck, canUndo }: Props) {
  return (
    <View style={styles.row}>
      <ControlButton label="Undo" onPress={onUndo} disabled={!canUndo} scheme={scheme} />
      <ControlButton label="Hint" onPress={onHint} scheme={scheme} />
      <ControlButton label="Check" onPress={onCheck} scheme={scheme} />
      <ControlButton label="Reset" onPress={onReset} scheme={scheme} variant="danger" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
