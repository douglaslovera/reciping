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
          style={[styles.filter, { backgroundColor: theme.accent }]}>
          <Ionicons color="white" name="options-outline" size={15} />
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  search: {
    borderRadius: 10,
    height: 44,
  },
  searchButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 13,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 10,
  },
  filter: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
