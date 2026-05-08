import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GameColors, patchColor, patchFill } from '@/game/colors';
import { ClueChip } from './game/ClueChip';
import { ShapeType } from '@/game/types';

/** Hand-tiled mini layout used as the brand mark. The same tile data
 *  feeds the splash, the home logo, and the about screen. */
interface Tile {
  row: number;
  col: number;
  w: number;
  h: number;
  shape: ShapeType;
  area: number;
  colorIndex: number;
}

const GRID = 4;
const TILES: Tile[] = [
  { row: 0, col: 0, w: 2, h: 1, shape: 'wide', area: 2, colorIndex: 0 },
  { row: 0, col: 2, w: 1, h: 2, shape: 'tall', area: 2, colorIndex: 1 },
  { row: 0, col: 3, w: 1, h: 1, shape: 'square', area: 1, colorIndex: 2 },
  { row: 1, col: 0, w: 1, h: 2, shape: 'tall', area: 2, colorIndex: 3 },
  { row: 1, col: 1, w: 1, h: 1, shape: 'any', area: 1, colorIndex: 4 },
  { row: 1, col: 3, w: 1, h: 1, shape: 'square', area: 1, colorIndex: 5 },
  { row: 2, col: 1, w: 2, h: 1, shape: 'wide', area: 2, colorIndex: 6 },
  { row: 2, col: 3, w: 1, h: 2, shape: 'tall', area: 2, colorIndex: 7 },
  { row: 3, col: 0, w: 1, h: 1, shape: 'square', area: 1, colorIndex: 8 },
  { row: 3, col: 1, w: 2, h: 1, shape: 'wide', area: 2, colorIndex: 9 },
];

interface Props {
  size: number;
  scheme: 'light' | 'dark';
  /** Hide the chip numbers — used on the About screen header. */
  hideNumbers?: boolean;
  /** Skip the staggered entrance animation. */
  static?: boolean;
}

export function PatchesLogo({ size, scheme, hideNumbers, static: isStatic }: Props) {
  const c = GameColors[scheme];
  const cellSize = size / GRID;

  return (
    <View
      style={[
        styles.board,
        {
          width: size,
          height: size,
          backgroundColor: c.cellBg,
          borderColor: c.cellBorder,
        },
      ]}
    >
      {/* Patch fills */}
      {TILES.map((t, i) => (
        <PatchTile
          key={`fill-${i}`}
          tile={t}
          cellSize={cellSize}
          scheme={scheme}
          delay={isStatic ? 0 : 60 + i * 50}
          isStatic={!!isStatic}
        />
      ))}

      {/* Chips */}
      {TILES.map((t, i) => {
        const cx = t.col + t.w / 2;
        const cy = t.row + t.h / 2;
        return (
          <ChipTile
            key={`chip-${i}`}
            cx={cx}
            cy={cy}
            cellSize={cellSize}
            shape={t.shape}
            area={hideNumbers ? null : t.area}
            color={patchColor(t.colorIndex, scheme)}
            delay={isStatic ? 0 : 200 + i * 50}
            isStatic={!!isStatic}
          />
        );
      })}
    </View>
  );
}

function PatchTile({
  tile,
  cellSize,
  scheme,
  delay,
  isStatic,
}: {
  tile: Tile;
  cellSize: number;
  scheme: 'light' | 'dark';
  delay: number;
  isStatic: boolean;
}) {
  const t = useSharedValue(isStatic ? 1 : 0);
  useEffect(() => {
    if (!isStatic) {
      t.value = withDelay(delay, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    }
  }, [t, delay, isStatic]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.6 + 0.4 * t.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: tile.col * cellSize + 2,
          top: tile.row * cellSize + 2,
          width: tile.w * cellSize - 4,
          height: tile.h * cellSize - 4,
          borderRadius: 8,
          backgroundColor: patchFill(tile.colorIndex, scheme),
          borderWidth: 1.2,
          borderColor: patchColor(tile.colorIndex, scheme),
        },
        style,
      ]}
    />
  );
}

function ChipTile({
  cx,
  cy,
  cellSize,
  shape,
  area,
  color,
  delay,
  isStatic,
}: {
  cx: number;
  cy: number;
  cellSize: number;
  shape: ShapeType;
  area: number | null;
  color: string;
  delay: number;
  isStatic: boolean;
}) {
  const t = useSharedValue(isStatic ? 1 : 0);
  useEffect(() => {
    if (!isStatic) {
      t.value = withDelay(delay, withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.5)) }));
    }
  }, [t, delay, isStatic]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.4 + 0.6 * t.value }],
  }));

  // Position the chip so its center aligns with the patch center.
  const chipBox = useMemo(() => cellSize, [cellSize]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cx * cellSize - chipBox / 2,
          top: cy * cellSize - chipBox / 2,
          width: chipBox,
          height: chipBox,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <ClueChip shape={shape} area={area} cellSize={cellSize} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
  },
});
