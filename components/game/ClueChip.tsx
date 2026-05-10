import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ShapeType } from '@/game/types';

interface Props {
  shape: ShapeType;
  /** Area to display as the chip number; pass null to render no number (e.g. legend). */
  area: number | null;
  cellSize: number;
  color: string;
}

/**
 * Map shape constraint -> chip dimensions as fractions of the cell. Square
 * is the most common case; wide/tall use asymmetric ratios so the
 * constraint reads at a glance.
 */
function chipFractions(shape: ShapeType): { w: number; h: number } {
  switch (shape) {
    case 'wide':
      return { w: 0.78, h: 0.5 };
    case 'tall':
      return { w: 0.5, h: 0.78 };
    case 'square':
    case 'any':
    default:
      return { w: 0.66, h: 0.66 };
  }
}

/**
 * The colored shape-shaped tile that represents a clue. The chip's color
 * matches the patch color for that clue, so when a patch is placed the
 * chip sits inside its own patch's fill.
 */
function ClueChipImpl({ shape, area, cellSize, color }: Props) {
  const { w, h } = chipFractions(shape);
  const chipW = cellSize * w;
  const chipH = cellSize * h;
  const radius = Math.min(chipW, chipH) * 0.22;
  const fontSize = Math.max(13, Math.min(chipW, chipH) * 0.55);

  return (
    <View
      style={[
        styles.chip,
        {
          width: chipW,
          height: chipH,
          backgroundColor: color,
          borderRadius: radius,
        },
      ]}
    >
      {shape === 'any' ? <AnyMarkers size={Math.min(chipW, chipH) * 0.16} /> : null}
      {area != null ? (
        <Text
          style={[
            styles.chipText,
            {
              fontSize,
              lineHeight: fontSize * 1.05,
            },
          ]}
        >
          {area}
        </Text>
      ) : null}
    </View>
  );
}

export const ClueChip = React.memo(ClueChipImpl);

/** 2x2 dot pattern on an "any" chip — mirrors the LinkedIn legend cue. */
function AnyMarkers({ size }: { size: number }) {
  const dot: ViewStyle = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size,
    backgroundColor: 'rgba(255,255,255,0.55)',
  };
  const inset = size * 0.55;
  return (
    <>
      <View style={[dot, { top: inset, left: inset }]} />
      <View style={[dot, { top: inset, right: inset }]} />
      <View style={[dot, { bottom: inset, left: inset }]} />
      <View style={[dot, { bottom: inset, right: inset }]} />
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chipText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
});
