import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { useAppTheme } from '@/theme';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  onMenuPress?: () => void;
  trailing?: React.ReactNode;
}>;

export function ScreenShell({ children, title, onMenuPress, trailing }: ScreenShellProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.chrome }]}>
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
            <Text style={[styles.title, { color: '#F7F5F6' }]}>{title}</Text>
          </View>
          {trailing ?? <GlassSurface effect="clear" interactive style={styles.menuGlass}>
            <Pressable
              accessibilityLabel="More options"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onMenuPress}
              style={styles.menuButton}>
              <Ionicons color="#F7F5F6" name="ellipsis-horizontal" size={19} />
            </Pressable>
          </GlassSurface>}
        </View>
        <View style={[styles.body, { backgroundColor: theme.background }]}>{children}</View>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleGroup: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  menuGlass: {
    backgroundColor: '#2A2B30',
    borderRadius: 9,
    height: 32,
    width: 32,
  },
  menuButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  body: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
