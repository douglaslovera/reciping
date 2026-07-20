import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { useDatabaseContext } from '@/db/provider';
import { translate } from '@/i18n';
import { useAppTheme } from '@/theme';

type GlassSearchProps = {
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onFilterPress?: () => void;
};

export function GlassSearch({ placeholder, value, onChangeText, onFilterPress }: GlassSearchProps) {
  const theme = useAppTheme();
  const { settings } = useDatabaseContext();

  return (
    <GlassSurface effect="clear" interactive style={styles.search}>
      <View style={styles.searchButton}>
        <Ionicons color={theme.muted} name="search" size={19} />
        <TextInput
          accessibilityLabel={placeholder}
          onChangeText={onChangeText}
          placeholder={translate(settings.language, placeholder)}
          placeholderTextColor={theme.muted}
          returnKeyType="search"
          style={[styles.input, { color: theme.text }]}
          value={value}
        />
        <Pressable
          accessibilityLabel="Filter"
          accessibilityRole="button"
          disabled={!onFilterPress}
          hitSlop={7}
          onPress={onFilterPress}
          style={[styles.filter, { backgroundColor: theme.accentSoft }]}>
          <Ionicons color={theme.accent} name="options-outline" size={17} />
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  search: {
    borderRadius: 19,
    height: 52,
  },
  searchButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  filter: {
    alignItems: 'center',
    borderRadius: 15,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
