import { Ionicons } from '@expo/vector-icons';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform } from 'react-native';

import { useDatabaseContext } from '@/db/provider';
import { translate } from '@/i18n';

export default function TabLayout() {
  const { settings } = useDatabaseContext();
  const selectedColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ dark: '#78C4D6', light: '#286D80' })
      : '#286D80';
  const defaultColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ dark: '#B7C3C8', light: '#5E6A72' })
      : '#5E6A72';

  return (
    <NativeTabs
      backgroundColor={null}
      blurEffect="systemUltraThinMaterial"
      iconColor={{ default: defaultColor, selected: selectedColor }}
      labelStyle={{
        default: { color: defaultColor, fontSize: 11, fontWeight: '500' },
        selected: { color: selectedColor, fontSize: 11, fontWeight: '600' },
      }}
      minimizeBehavior="onScrollDown"
      tintColor={selectedColor}>
      <NativeTabs.Trigger name="index">
        <Label>{translate(settings.language, 'Recipes')}</Label>
        <Icon
          androidSrc={<VectorIcon family={Ionicons} name="book-outline" />}
          sf={{ default: 'book.closed', selected: 'book.closed.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journal">
        <Label>{translate(settings.language, 'Journal')}</Label>
        <Icon
          androidSrc={<VectorIcon family={Ionicons} name="time-outline" />}
          sf={{ default: 'clock', selected: 'clock.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Label>{translate(settings.language, 'Saved')}</Label>
        <Icon
          androidSrc={<VectorIcon family={Ionicons} name="bookmark-outline" />}
          sf={{ default: 'bookmark', selected: 'bookmark.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
