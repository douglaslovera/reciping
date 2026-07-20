import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { useAppTheme } from '@/theme';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  onMenuPress?: () => void;
  trailing?: React.ReactNode;
}>;

export function ScreenShell({ children, eyebrow, title, onMenuPress, trailing }: ScreenShellProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        pointerEvents="none"
        style={[styles.bloom, styles.skyBloom, { backgroundColor: theme.bloomSky }]}
      />
      <View
        pointerEvents="none"
        style={[styles.bloom, styles.mintBloom, { backgroundColor: theme.bloomMint }]}
      />
      <View
        pointerEvents="none"
        style={[styles.bloom, styles.irisBloom, { backgroundColor: theme.bloomIris }]}
      />

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          </View>
          {trailing ?? <GlassSurface effect="clear" interactive style={styles.menuGlass}>
            <Pressable
              accessibilityLabel="More options"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onMenuPress}
              style={styles.menuButton}>
              <Ionicons color={theme.text} name="ellipsis-horizontal" size={23} />
            </Pressable>
          </GlassSurface>}
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bloom: {
    borderRadius: 999,
    position: 'absolute',
  },
  skyBloom: {
    height: 260,
    right: -115,
    top: 80,
    width: 260,
  },
  mintBloom: {
    height: 230,
    left: -120,
    top: 370,
    width: 230,
  },
  irisBloom: {
    bottom: 25,
    height: 190,
    right: -75,
    width: 190,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
    paddingTop: 14,
  },
  titleGroup: {
    gap: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.45,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  menuGlass: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  menuButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});
