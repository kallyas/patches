import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PatchesLogo } from '@/components/PatchesLogo';
import { GameColors } from '@/game/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

const RULES: { title: string; body: string }[] = [
  {
    title: 'Tile the grid',
    body: 'Draw rectangles by dragging across the board. Cover every cell with no overlaps.',
  },
  {
    title: 'One clue per patch',
    body: 'Each rectangle must contain exactly one chip. The chip’s number is the patch’s area.',
  },
  {
    title: 'Match the shape',
    body: 'A chip’s shape tells you the patch shape: square, wide, tall, or any.',
  },
  {
    title: 'Tap to fix',
    body: 'Tap a placed patch to remove it. Wrong patches show diagonal stripes.',
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[scheme];
  const version =
    Constants.expoConfig?.version ?? (Constants.manifest as { version?: string })?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color={c.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <PatchesLogo size={140} scheme={scheme} hideNumbers static />
            <Text style={[styles.title, { color: c.text }]}>Patches</Text>
            <Text style={[styles.tagline, { color: c.textMuted }]}>
              A calm tiling puzzle for one clue at a time.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>How to play</Text>
            <View style={styles.rulesList}>
              {RULES.map((r, i) => (
                <View
                  key={r.title}
                  style={[
                    styles.ruleRow,
                    { backgroundColor: c.surface, borderColor: c.cellBorder },
                  ]}
                >
                  <View style={[styles.ruleNum, { backgroundColor: c.accentSoft }]}>
                    <Text style={[styles.ruleNumText, { color: c.accent }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: c.text }]}>{r.title}</Text>
                    <Text style={[styles.ruleBody, { color: c.textMuted }]}>{r.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Difficulty</Text>
            <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.cellBorder }]}>
              <InfoRow label="Easy" body="Smaller patches, mostly shape-locked clues." scheme={scheme} />
              <Divider scheme={scheme} />
              <InfoRow label="Medium" body="Mixed sizes, some unrestricted clues." scheme={scheme} />
              <Divider scheme={scheme} />
              <InfoRow label="Hard" body="Larger patches and many “any-shape” clues." scheme={scheme} />
            </View>
          </View>

          <View style={[styles.footer, { borderColor: c.cellBorder }]}>
            <Text style={[styles.footerText, { color: c.textMuted }]}>
              Inspired by LinkedIn’s Patches.
            </Text>
            <Text style={[styles.footerText, { color: c.textMuted }]}>v{version}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({
  label,
  body,
  scheme,
}: {
  label: string;
  body: string;
  scheme: 'light' | 'dark';
}) {
  const c = GameColors[scheme];
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: c.text }]}>{label}</Text>
      <Text style={[styles.infoBody, { color: c.textMuted }]}>{body}</Text>
    </View>
  );
}

function Divider({ scheme }: { scheme: 'light' | 'dark' }) {
  const c = GameColors[scheme];
  return <View style={{ height: 1, backgroundColor: c.cellBorder, marginVertical: 10 }} />;
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    padding: 4,
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -8,
  },
  section: {
    marginTop: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rulesList: {
    gap: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ruleNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ruleNumText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  ruleBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoBody: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  footer: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
