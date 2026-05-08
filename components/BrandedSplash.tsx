import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GameColors } from '@/game/colors';
import { PatchesLogo } from './PatchesLogo';

interface Props {
  scheme: 'light' | 'dark';
  /** Called once the splash has finished its dismiss animation. */
  onDone: () => void;
  /** How long to hold the logo before fading out. Default 700ms. */
  hold?: number;
}

/**
 * In-app branded splash overlay shown after the native splash hides. The
 * Patches logo animates in (handled inside PatchesLogo), holds briefly,
 * then fades out and unmounts.
 */
export function BrandedSplash({ scheme, onDone, hold = 700 }: Props) {
  const c = GameColors[scheme];
  const opacity = useSharedValue(1);
  const titleY = useSharedValue(8);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    titleY.value = withDelay(380, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    titleOpacity.value = withDelay(380, withTiming(1, { duration: 420 }));

    // Animate dismiss after logo + title settle, then call onDone.
    const dismissDelay = 380 + 420 + hold;
    opacity.value = withDelay(
      dismissDelay,
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [opacity, titleY, titleOpacity, hold, onDone]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: c.bg }, wrapStyle]}
    >
      <View style={styles.center}>
        <PatchesLogo size={160} scheme={scheme} />
        <Animated.View style={titleStyle}>
          <Text style={[styles.title, { color: c.text }]}>Patches</Text>
          <Text style={[styles.tagline, { color: c.textMuted }]}>Tile the grid.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  center: {
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
