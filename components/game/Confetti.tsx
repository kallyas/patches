import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#FFD6A5', '#CAFFBF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFADAD', '#FDFFB6'];

interface PieceProps {
  color: string;
  startX: number;
  delay: number;
  width: number;
  height: number;
  drift: number;
  rotateBy: number;
  size: number;
  duration: number;
}

function Piece({ color, startX, delay, width, height, drift, rotateBy, size, duration }: PieceProps) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [t, delay, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + drift * t.value },
      { translateY: -size + (height + size * 2) * t.value },
      { rotate: `${rotateBy * t.value}deg` },
    ],
    opacity: t.value < 0.05 ? t.value * 20 : t.value > 0.85 ? 1 - (t.value - 0.85) * 6 : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size * 0.45,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

interface Props {
  active: boolean;
  count?: number;
}

export function Confetti({ active, count = 40 }: Props) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: count }).map((_, i) => {
      const size = 7 + Math.random() * 8;
      return {
        key: `${i}-${Math.random()}`,
        color: COLORS[i % COLORS.length],
        startX: Math.random() * width,
        delay: Math.random() * 600,
        drift: (Math.random() - 0.5) * 200,
        rotateBy: (Math.random() - 0.5) * 720,
        size,
        duration: 1800 + Math.random() * 1400,
      };
    });
  }, [active, count, width]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} width={width} height={height} />
      ))}
    </View>
  );
}
