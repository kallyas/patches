import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GameColors } from '@/game/colors';
import { Rect } from '@/game/types';

interface Props {
  cellSize: number;
  /** Cell of the active clue chip — ghost finger starts here. */
  clueRow: number;
  clueCol: number;
  /** Solution rectangle for the active clue — outlined as the drag target. */
  targetRect: Rect;
  /** When false, only the dashed outline shows (used for the final clue). */
  showFinger: boolean;
  scheme: 'light' | 'dark';
}

const FINGER_SIZE = 38;

/**
 * Tutorial coach. Renders absolutely above the Board (pointerEvents=none so
 * touches pass through). Two layers:
 *   1. A pulsing dashed rectangle outlining the solution rect.
 *   2. A ghost-finger glyph that loops a diagonal drag from the clue cell
 *      to the opposite corner of the solution rect, telegraphing the
 *      drag-to-draw gesture.
 */
function CoachOverlayImpl({
  cellSize,
  clueRow,
  clueCol,
  targetRect,
  showFinger,
  scheme,
}: Props) {
  const c = GameColors[scheme];

  const t = useSharedValue(0);
  const pulse = useSharedValue(0);

  // Restart the finger drag whenever the target changes (next clue).
  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }),
        withDelay(500, withTiming(1, { duration: 0 })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [t, targetRect.row, targetRect.col, targetRect.width, targetRect.height]);

  // Continuous pulse for the dashed outline.
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const startX = (clueCol + 0.5) * cellSize;
  const startY = (clueRow + 0.5) * cellSize;
  // Drag ends at the cell diagonally opposite the clue cell within the
  // solution rect. For our tutorial puzzle the clue is always at the
  // top-left of its rect, so this is the bottom-right cell.
  const endCellRow = targetRect.row + targetRect.height - 1;
  const endCellCol = targetRect.col + targetRect.width - 1;
  const endX = (endCellCol + 0.5) * cellSize;
  const endY = (endCellRow + 0.5) * cellSize;

  const fingerStyle = useAnimatedStyle(() => {
    const x = startX + (endX - startX) * t.value;
    const y = startY + (endY - startY) * t.value;
    const opacity =
      t.value < 0.05 ? t.value * 20 : t.value > 0.9 ? 1 - (t.value - 0.9) * 10 : 1;
    return {
      transform: [
        { translateX: x - FINGER_SIZE / 2 },
        { translateY: y - FINGER_SIZE / 2 },
      ],
      opacity,
    };
  });

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.outline,
          {
            left: targetRect.col * cellSize,
            top: targetRect.row * cellSize,
            width: targetRect.width * cellSize,
            height: targetRect.height * cellSize,
            borderColor: c.accent,
          },
          outlineStyle,
        ]}
      />
      {showFinger ? (
        <Animated.View
          style={[
            styles.finger,
            {
              backgroundColor: c.accent,
              shadowColor: scheme === 'dark' ? '#000' : '#0A2540',
            },
            fingerStyle,
          ]}
        >
          <MaterialIcons name="touch-app" size={22} color="#fff" />
        </Animated.View>
      ) : null}
    </View>
  );
}

export const CoachOverlay = React.memo(CoachOverlayImpl);

const styles = StyleSheet.create({
  outline: {
    position: 'absolute',
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  finger: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FINGER_SIZE,
    height: FINGER_SIZE,
    borderRadius: FINGER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
