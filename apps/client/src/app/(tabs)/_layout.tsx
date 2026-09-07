import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ActivityIndicator, DynamicColorIOS, Platform, View } from 'react-native';

import { FirstRecipeOnboarding } from '@/components/first-recipe-onboarding';
import { EmptyState, PrimaryButton } from '@/components/ui';
import { isNewCollection } from '@/db/repository';
import { useAppTheme } from '@/theme';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { translate } from '@/i18n';

export default function TabLayout() {
  const { settings, refresh } = useDatabaseContext();
  const theme = useAppTheme();
  const { data: firstVisit, loading, error } = useDataQuery(isNewCollection, true);

  // Render before mounting NativeTabs so onboarding has no navigation chrome.
  if ((loading && firstVisit) || error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: theme.background }}>
        {error ? <EmptyState icon="alert-circle-outline" title="Could not load recipes"
          message="Try opening your collection again."
          action={<PrimaryButton label="Try again" onPress={refresh} />} /> : <ActivityIndicator color={theme.accent} />}
      </View>
    );
  }
  if (firstVisit) return <FirstRecipeOnboarding />;

  const selectedColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ dark: '#D8587C', light: '#A72D50' })
      : '#A72D50';
  const defaultColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ dark: '#9B999D', light: '#97979B' })
      : '#97979B';

  return (
    <NativeTabs
      blurEffect="systemChromeMaterialLight"
      iconColor={{ default: defaultColor, selected: selectedColor }}
      labelStyle={{
        default: { color: defaultColor, fontSize: 11, fontWeight: '500' },
        selected: { color: selectedColor, fontSize: 11, fontWeight: '600' },
      }}
      minimizeBehavior="onScrollDown"
      tintColor={selectedColor}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{translate(settings.language, 'Recipes')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="menu_book"
          sf={{ default: 'book.closed', selected: 'book.closed.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journal">
        <NativeTabs.Trigger.Label>{translate(settings.language, 'Journal')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="history"
          sf={{ default: 'clock', selected: 'clock.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>{translate(settings.language, 'Saved')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: 'bookmark_border', selected: 'bookmark' }}
          sf={{ default: 'bookmark', selected: 'bookmark.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
