import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { Field, IconButton, Page, PrimaryButton, Section } from '@/components/ui';
import { useDatabaseContext } from '@/db/provider';
import { resetAppDataForDevelopment } from '@/db/reset';
import { translate } from '@/i18n';
import { setSetting } from '@/db/repository';
import type { AppSettings } from '@/db/types';
import { useAppTheme } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { refresh, settings } = useDatabaseContext();
  const [resetting, setResetting] = useState(false);
  const resetInProgress = useRef(false);

  const resetData = async () => {
    if (!__DEV__ || Platform.OS === 'web' || resetInProgress.current) return;
    resetInProgress.current = true;
    setResetting(true);
    try {
      const { photosRemoved } = await resetAppDataForDevelopment();
      refresh();
      router.dismissAll();
      router.replace('/');
      if (!photosRemoved) {
        Alert.alert(
          translate(settings.language, 'Content reset'),
          translate(settings.language, 'Your content and settings were cleared, but some local photos could not be removed. Run reset again to retry photo cleanup.'),
        );
      }
    } catch {
      Alert.alert(
        translate(settings.language, 'Could not reset app data'),
        translate(settings.language, 'Try again.'),
      );
    } finally {
      resetInProgress.current = false;
      setResetting(false);
    }
  };

  const confirmReset = () => Alert.alert(
    translate(settings.language, 'Reset app data?'),
    translate(settings.language, 'Permanently delete all recipes, cooking logs, saved items, local photos, and settings, including Recently Deleted. This cannot be undone.'),
    [
      { text: translate(settings.language, 'Cancel'), style: 'cancel' },
      { text: translate(settings.language, 'Reset app data'), style: 'destructive', onPress: () => { void resetData(); } },
    ],
  );

  const choose = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await setSetting(key, value);
    refresh();
  };

  const deferred = () =>
    Alert.alert(
      'Cloud backup comes later',
      'Account sign-in and optional backup to your own Reciping cloud are intentionally deferred. Your data is currently owned by this device.',
    );

  return (
    <Page
      contentStyle={styles.settingsContent}
      left={<IconButton icon="close" label="Close" onPress={router.back} />}
      title="Settings">
      <Section style={styles.settingsSection} title="Your data">
        <GlassSurface effect="regular" style={styles.dataCard}>
          <View style={[styles.dataIcon, { backgroundColor: theme.accentSoft }]}>
            <Ionicons color={theme.accent} name="phone-portrait-outline" size={24} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Stored on this device</Text>
            <Text style={[styles.cardCopy, { color: theme.muted }]}>
              The app works without an account. Recipes, sessions, and saved items stay local.
            </Text>
          </View>
        </GlassSurface>
        <Pressable onPress={deferred} style={[styles.row, { borderColor: theme.border }]}>
          <Ionicons color={theme.accent} name="cloud-outline" size={22} />
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Cloud backup</Text>
            <Text style={[styles.rowMeta, { color: theme.muted }]}>Not connected · available later</Text>
          </View>
          <Ionicons color={theme.muted} name="chevron-forward" size={18} />
        </Pressable>
        <Text style={[styles.privacy, { color: theme.muted }]}>
          Future cloud backups will be encrypted in transit and at rest, but will not use end-to-end encryption.
        </Text>
      </Section>

      <Section style={styles.settingsSection} title="Recipe book">
        <ChoiceRow
          label="Library layout"
          options={[
            ['grid', 'Grid'],
            ['list', 'List'],
          ]}
          selected={settings.libraryView}
          onSelect={(value) => choose('libraryView', value as AppSettings['libraryView'])}
        />
        <Field
          autoCapitalize="characters"
          hint="Used for new cooking logs. Existing logs keep their original currency snapshot."
          label="Global currency"
          maxLength={3}
          onEndEditing={(event) => choose('currency', event.nativeEvent.text.toUpperCase() || 'USD')}
          placeholder="USD"
          defaultValue={settings.currency}
        />
      </Section>

      <Section style={styles.settingsSection} title="Reading">
        <ChoiceRow
          label="Text size"
          options={[
            ['standard', 'Standard'],
            ['large', 'Large'],
            ['extra-large', 'Extra large'],
          ]}
          selected={settings.readingScale}
          onSelect={(value) => choose('readingScale', value as AppSettings['readingScale'])}
        />
        <ChoiceRow
          label="Language"
          options={[
            ['en', 'English'],
            ['es', 'Español'],
          ]}
          selected={settings.language}
          onSelect={(value) => choose('language', value as AppSettings['language'])}
        />
        <Text style={[styles.privacy, { color: theme.muted }]}>
          Recipe text always stays in its original language. Changing the app language never translates your content.
        </Text>
      </Section>

      <Section style={styles.settingsSection} title="Storage">
        <Pressable onPress={() => router.push('/deleted')} style={[styles.row, { borderColor: theme.border }]}>
          <Ionicons color={theme.muted} name="trash-outline" size={22} />
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Recently Deleted</Text>
            <Text style={[styles.rowMeta, { color: theme.muted }]}>Restore recipes, journal entries, or saved items</Text>
          </View>
          <Ionicons color={theme.muted} name="chevron-forward" size={18} />
        </Pressable>
      </Section>

      {__DEV__ && Platform.OS !== 'web' && (
        <Section style={styles.settingsSection} title="Developer">
          <Text style={[styles.privacy, { color: theme.muted }]}>
            Clear this app and return to first-time onboarding. Only available in development builds.
          </Text>
          <PrimaryButton
            destructive
            disabled={resetting}
            icon="refresh-outline"
            label={resetting ? 'Resetting…' : 'Reset app data'}
            onPress={confirmReset}
          />
        </Section>
      )}
    </Page>
  );
}

function ChoiceRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly (readonly [string, string])[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.choiceGroup}>
      <Text style={[styles.choiceLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.choices}>
        {options.map(([value, title]) => {
          const active = value === selected;
          return (
            <Pressable
              accessibilityRole="button"
              key={value}
              onPress={() => onSelect(value)}
              style={[
                styles.choice,
                { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.border },
              ]}>
              <Text style={[styles.choiceText, { color: active ? theme.accent : theme.text }]}>{title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsContent: { gap: 26, paddingTop: 6 },
  settingsSection: { gap: 14 },
  dataCard: { alignItems: 'center', borderRadius: 21, flexDirection: 'row', gap: 16, padding: 18 },
  dataIcon: { alignItems: 'center', borderRadius: 17, height: 49, justifyContent: 'center', width: 49 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardCopy: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 14, minHeight: 72, paddingVertical: 13 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  privacy: { fontSize: 12, lineHeight: 19 },
  choiceGroup: { gap: 12 },
  choiceLabel: { fontSize: 14, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, paddingVertical: 10 },
  choiceText: { fontSize: 13, fontWeight: '700' },
});
