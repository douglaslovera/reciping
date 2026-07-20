import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { PrimaryButton } from '@/components/ui';
import { useDatabaseContext } from '@/db/provider';
import { getRawSetting, setRawSetting } from '@/db/repository';
import { useAppTheme } from '@/theme';

export function WelcomeGate() {
  const theme = useAppTheme();
  const { refresh } = useDatabaseContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    getRawSetting('hasSeenWelcome')
      .then((value) => setVisible(value !== 'true'))
      .catch(() => undefined);
  }, []);

  const continueToApp = async () => {
    await setRawSetting('hasSeenWelcome', 'true');
    setVisible(false);
    refresh();
  };

  return (
    <Modal animationType="fade" presentationStyle="fullScreen" visible={visible}>
      <SafeAreaView style={[styles.page, { backgroundColor: theme.background }]}>
        <View style={[styles.bloom, { backgroundColor: theme.bloomSky }]} />
        <View style={styles.content}>
          <GlassSurface effect="regular" style={styles.card}>
            <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
              <Ionicons color={theme.accent} name="book-outline" size={34} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Your personal recipe journal</Text>
            <Text style={[styles.copy, { color: theme.muted }]}>
              Keep recipes, remember every time you cook, and save the small changes that make a dish yours.
            </Text>
            <View style={styles.points}>
              <Point icon="phone-portrait-outline" text="Works locally without an account" />
              <Point icon="layers-outline" text="Every cooking log keeps its own snapshot" />
              <Point icon="lock-closed-outline" text="Private by default, with no social features" />
            </View>
            <PrimaryButton icon="arrow-forward" label="Open my recipe book" onPress={continueToApp} />
            <Pressable onPress={continueToApp}>
              <Text style={[styles.small, { color: theme.muted }]}>
                Optional cloud backup and AI imports will be added later.
              </Text>
            </Pressable>
          </GlassSurface>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Point({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.point}>
      <Ionicons color={theme.accent} name={icon} size={20} />
      <Text style={[styles.pointText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bloom: { borderRadius: 999, height: 330, position: 'absolute', right: -130, top: 20, width: 330 },
  content: { flex: 1, justifyContent: 'center', padding: 22 },
  card: { borderRadius: 32, gap: 17, padding: 26 },
  icon: { alignItems: 'center', borderRadius: 23, height: 66, justifyContent: 'center', width: 66 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8, lineHeight: 35 },
  copy: { fontSize: 16, lineHeight: 23 },
  points: { gap: 14, marginVertical: 5 },
  point: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  pointText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  small: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
