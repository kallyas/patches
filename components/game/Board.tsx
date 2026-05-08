import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Patch, Puzzle, Rect, rectContains, rectsEqual } from '@/game/types';
import { validatePlacement } from '@/game/validator';
import { GameColors, patchColor, patchFill } from '@/game/colors';
import { ClueChip } from './ClueChip';
import { StripedOverlay } from './StripedOverlay';

interface Props {
  width: number;
  puzzle: Puzzle;
  patches: Patch[];
  hintRect: Rect | null;
  errorRect: Rect | null;
  flashTick: number;
  scheme: 'light' | 'dark';
  onPlace: (rect: Rect) => void;
  onRemovePatch: (patchId: string) => void;
}

/**
 * The interactive game board. Layers, bottom to top:
 *
 *   1. Board background + grid lines
 *   2. Placed patches (color fill, plus a diagonal-dot overlay if wrong)
 *   3. Hint highlights
 *   4. Clue chips — only visible for clues whose patch isn't correctly placed
 *   5. Error flash + drag preview
 *
 * Two interactions:
 *   - Drag from an empty cell to draw a new patch.
 *   - Tap on a placed patch to remove it (corrections).
 *   Drags that begin on a filled cell are ignored.
 */
export function Board({
  width,
  puzzle,
  patches,
  hintRect,
  errorRect,
  flashTick,
  scheme,
  onPlace,
  onRemovePatch,
}: Props) {
  const { size } = puzzle;
  const cellSize = width / size;
  const c = GameColors[scheme];

  // cell index -> patch covering it (null if empty). Used both for blocking
  // drags from filled cells and finding the patch under a tap.
  const cellOwner = useMemo(() => {
    const arr = new Array<Patch | null>(size * size).fill(null);
    for (const p of patches) {
      for (let r = p.row; r < p.row + p.height; r++) {
        for (let cc = p.col; cc < p.col + p.width; cc++) {
          arr[r * size + cc] = p;
        }
      }
    }
    return arr;
  }, [patches, size]);

  // Solution rectangle by clue index (parallel-indexed with puzzle.clues).
  const solutionByClue = puzzle.solution;

  // Patch correctness lookup. A placed patch is "correct" iff it matches
  // the unique solution rectangle for its clue.
  const patchCorrectness = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of patches) {
      const expected = solutionByClue[p.clueIndex];
      map.set(p.id, expected ? rectsEqual(p, expected) : false);
    }
    return map;
  }, [patches, solutionByClue]);

  // Set of clue indices whose patch is placed AND correct. Their chips hide.
  const solvedClues = useMemo(() => {
    const set = new Set<number>();
    for (const p of patches) {
      if (patchCorrectness.get(p.id)) set.add(p.clueIndex);
    }
    return set;
  }, [patches, patchCorrectness]);

  // Mirror occupancy into two 32-bit bitmasks so the worklet can check a
  // cell with a single bitwise op. Reanimated 4 + new arch have flaky
  // support for array-typed shared values on iOS — this primitive-only
  // path is rock-solid and covers grids up to 8x8 (64 cells).
  const occupiedLo = useSharedValue(0);
  const occupiedHi = useSharedValue(0);
  React.useEffect(() => {
    let lo = 0;
    let hi = 0;
    for (let i = 0; i < cellOwner.length; i++) {
      if (!cellOwner[i]) continue;
      if (i < 32) lo |= 1 << i;
      else hi |= 1 << (i - 32);
    }
    occupiedLo.value = lo;
    occupiedHi.value = hi;
  }, [cellOwner, occupiedLo, occupiedHi]);

  // Shared values driving the drag preview.
  const startRow = useSharedValue(-1);
  const startCol = useSharedValue(-1);
  const endRow = useSharedValue(-1);
  const endCol = useSharedValue(-1);
  const isActive = useSharedValue(0); // 1 once Pan activates (vs touched-down)
  /** 0 = unknown, 1 = valid, -1 = invalid. */
  const validity = useSharedValue(0);

  const validateDrag = useCallback(
    (sr: number, sc: number, er: number, ec: number) => {
      const r = Math.min(sr, er);
      const cIdx = Math.min(sc, ec);
      const h = Math.abs(er - sr) + 1;
      const w = Math.abs(ec - cIdx) + 1;
      const rect: Rect = { row: r, col: cIdx, width: w, height: h };
      const result = validatePlacement(rect, puzzle, patches);
      validity.value = result.ok ? 1 : -1;
    },
    [puzzle, patches, validity],
  );

  useAnimatedReaction(
    () => ({
      sr: startRow.value,
      sc: startCol.value,
      er: endRow.value,
      ec: endCol.value,
    }),
    (cur, prev) => {
      if (cur.sr < 0) {
        validity.value = 0;
        return;
      }
      if (
        prev &&
        prev.sr === cur.sr &&
        prev.sc === cur.sc &&
        prev.er === cur.er &&
        prev.ec === cur.ec
      ) {
        return;
      }
      runOnJS(validateDrag)(cur.sr, cur.sc, cur.er, cur.ec);
    },
    [validateDrag],
  );

  const onTryPlace = useCallback(
    (sr: number, sc: number, er: number, ec: number) => {
      const r = Math.min(sr, er);
      const cIdx = Math.min(sc, ec);
      const h = Math.abs(er - sr) + 1;
      const w = Math.abs(ec - cIdx) + 1;
      const rect: Rect = { row: r, col: cIdx, width: w, height: h };
      const result = validatePlacement(rect, puzzle, patches);
      if (result.ok) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => {},
        );
      }
      onPlace(rect);
    },
    [puzzle, patches, onPlace],
  );

  const handleTapAt = useCallback(
    (x: number, y: number) => {
      const r = Math.floor(y / cellSize);
      const cIdx = Math.floor(x / cellSize);
      if (r < 0 || r >= size || cIdx < 0 || cIdx >= size) return;
      for (const p of patches) {
        if (rectContains(p, r, cIdx)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onRemovePatch(p.id);
          return;
        }
      }
    },
    [patches, cellSize, size, onRemovePatch],
  );

  const composed = useMemo(() => {
    // NOTE: the worklets below MUST NOT call any non-worklet JS function.
    // react-native-worklets 0.5 (Reanimated 4) throws a JSI error on the
    // UI runtime if a worklet calls a regular JS closure, which Hermes
    // surfaces as an uncaught C++ exception → SIGABRT on iOS. Keep the
    // bodies to primitives, Math.*, bitwise ops, and shared-value reads.
    const max = size - 1;
    const cs = cellSize;

    const pan = Gesture.Pan()
      .minDistance(6)
      .averageTouches(false)
      .maxPointers(1)
      .onBegin((e) => {
        'worklet';
        const r = Math.max(0, Math.min(max, Math.floor(e.y / cs)));
        const ci = Math.max(0, Math.min(max, Math.floor(e.x / cs)));
        // Block drag from filled cells (bitmask check, see occupiedLo/Hi).
        const idx = r * size + ci;
        const occBit =
          idx < 32
            ? (occupiedLo.value >>> idx) & 1
            : (occupiedHi.value >>> (idx - 32)) & 1;
        if (occBit) {
          startRow.value = -1;
          startCol.value = -1;
          return;
        }
        startRow.value = r;
        startCol.value = ci;
        endRow.value = r;
        endCol.value = ci;
      })
      .onStart(() => {
        'worklet';
        isActive.value = 1;
      })
      .onUpdate((e) => {
        'worklet';
        if (startRow.value < 0) return;
        endRow.value = Math.max(0, Math.min(max, Math.floor(e.y / cs)));
        endCol.value = Math.max(0, Math.min(max, Math.floor(e.x / cs)));
      })
      .onEnd(() => {
        'worklet';
        if (startRow.value >= 0 && isActive.value) {
          runOnJS(onTryPlace)(
            startRow.value,
            startCol.value,
            endRow.value,
            endCol.value,
          );
        }
      })
      .onFinalize(() => {
        'worklet';
        startRow.value = -1;
        startCol.value = -1;
        endRow.value = -1;
        endCol.value = -1;
        isActive.value = 0;
        validity.value = 0;
      });

    const tap = Gesture.Tap()
      .maxDuration(280)
      .maxDistance(8)
      .onEnd((e, success) => {
        'worklet';
        if (success) {
          runOnJS(handleTapAt)(e.x, e.y);
        }
      });

    return Gesture.Race(tap, pan);
  }, [
    cellSize,
    size,
    onTryPlace,
    handleTapAt,
    startRow,
    startCol,
    endRow,
    endCol,
    isActive,
    validity,
    occupiedLo,
    occupiedHi,
  ]);

  const previewStyle = useAnimatedStyle(() => {
    if (!isActive.value || startRow.value < 0) {
      return { opacity: 0, width: 0, height: 0 };
    }
    const r = Math.min(startRow.value, endRow.value);
    const cIdx = Math.min(startCol.value, endCol.value);
    const h = Math.abs(endRow.value - startRow.value) + 1;
    const w = Math.abs(endCol.value - startCol.value) + 1;
    const v = validity.value;
    let bg = 'rgba(120,120,120,0.18)';
    let border = scheme === 'dark' ? '#888' : '#555';
    if (v === 1) {
      bg = c.dragValid;
      border = c.dragValidBorder;
    } else if (v === -1) {
      bg = c.dragInvalid;
      border = c.dragInvalidBorder;
    }
    return {
      opacity: 1,
      transform: [{ translateX: cIdx * cellSize }, { translateY: r * cellSize }],
      width: w * cellSize,
      height: h * cellSize,
      backgroundColor: bg,
      borderColor: border,
    };
  });

  const errorOpacity = useSharedValue(0);
  React.useEffect(() => {
    if (errorRect) {
      cancelAnimation(errorOpacity);
      errorOpacity.value = 0;
      errorOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 380 }),
      );
    }
  }, [errorRect, flashTick, errorOpacity]);
  const errorStyle = useAnimatedStyle(() => ({ opacity: errorOpacity.value }));

  const hintOpacity = useSharedValue(0);
  React.useEffect(() => {
    if (hintRect) {
      cancelAnimation(hintOpacity);
      hintOpacity.value = 0;
      hintOpacity.value = withSequence(
        withTiming(1, { duration: 220 }),
        withTiming(0.55, { duration: 380 }),
        withTiming(0.95, { duration: 380 }),
        withTiming(0, { duration: 600 }),
      );
    } else {
      hintOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [hintRect, flashTick, hintOpacity]);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  // Stripe stroke color: dark on light, light on dark, with enough contrast.
  const stripeColor = scheme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(20,20,20,0.45)';

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[
          styles.board,
          {
            width,
            height: width,
            backgroundColor: c.cellBg,
            borderColor: c.cellBorder,
          },
        ]}
      >
        {/* Layer 1: grid lines */}
        <GridLines size={size} cellSize={cellSize} color={c.gridLine} />

        {/* Layer 2: placed patches + stripe overlays for incorrect ones */}
        {patches.map((p) => {
          const correct = patchCorrectness.get(p.id) === true;
          const pw = p.width * cellSize - 4;
          const ph = p.height * cellSize - 4;
          return (
            <View
              key={p.id}
              pointerEvents="none"
              style={[
                styles.patch,
                {
                  left: p.col * cellSize + 2,
                  top: p.row * cellSize + 2,
                  width: pw,
                  height: ph,
                  backgroundColor: patchFill(p.colorIndex, scheme),
                  borderColor: patchColor(p.colorIndex, scheme),
                  overflow: 'hidden',
                },
              ]}
            >
              {!correct ? (
                <StripedOverlay
                  patternId={`stripes-${p.id}`}
                  width={pw}
                  height={ph}
                  color={stripeColor}
                  radius={9}
                />
              ) : null}
            </View>
          );
        })}

        {/* Layer 3: hint highlight (under chips) */}
        {hintRect ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.hint,
              {
                left: hintRect.col * cellSize,
                top: hintRect.row * cellSize,
                width: hintRect.width * cellSize,
                height: hintRect.height * cellSize,
                borderColor: c.accent,
                backgroundColor: c.accentSoft,
              },
              hintStyle,
            ]}
          />
        ) : null}

        {/* Layer 4: clue chips. Hidden once that clue's patch is correctly
            placed; for incorrect placements the chip stays so the user can
            see what was supposed to fit there. */}
        {puzzle.clues.map((clue, i) => {
          if (solvedClues.has(i)) return null;
          return (
            <View
              key={`chip-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: clue.col * cellSize,
                top: clue.row * cellSize,
                width: cellSize,
                height: cellSize,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClueChip
                shape={clue.shape}
                area={clue.area}
                cellSize={cellSize}
                color={patchColor(i, scheme)}
              />
            </View>
          );
        })}

        {/* Layer 5a: error flash (above chips so the user sees the offender) */}
        {errorRect ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.errorFlash,
              {
                left: errorRect.col * cellSize,
                top: errorRect.row * cellSize,
                width: errorRect.width * cellSize,
                height: errorRect.height * cellSize,
                backgroundColor: c.dragInvalid,
                borderColor: c.dragInvalidBorder,
              },
              errorStyle,
            ]}
          />
        ) : null}

        {/* Layer 5b: drag preview */}
        <Animated.View pointerEvents="none" style={[styles.preview, previewStyle]} />
      </View>
    </GestureDetector>
  );
}

const GridLines = React.memo(function GridLines({
  size,
  cellSize,
  color,
}: {
  size: number;
  cellSize: number;
  color: string;
}) {
  const lines: React.ReactElement[] = [];
  for (let i = 1; i < size; i++) {
    lines.push(
      <View
        key={`v-${i}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: i * cellSize - 0.5,
          top: 0,
          width: 1,
          height: size * cellSize,
          backgroundColor: color,
        }}
      />,
    );
    lines.push(
      <View
        key={`h-${i}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: i * cellSize - 0.5,
          left: 0,
          height: 1,
          width: size * cellSize,
          backgroundColor: color,
        }}
      />,
    );
  }
  return <>{lines}</>;
});

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
  },
  patch: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  preview: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    left: 0,
    top: 0,
  },
  hint: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  errorFlash: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
  },
});
