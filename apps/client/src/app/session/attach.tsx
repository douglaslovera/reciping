import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { EmptyState, IconButton, Page, Section } from '@/components/ui';
import { Text } from '@/components/localized-text';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { attachCookingLogToRecipe, listRecipes } from '@/db/repository';
import type { Recipe } from '@/db/types';
import { useAppTheme } from '@/theme';

export default function AttachSessionScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { refresh } = useDatabaseContext();
  const { data: recipes } = useDataQuery(() => listRecipes({ drafts: false }), [] as Recipe[]);

  return (
    <Page
      left={<IconButton icon="close" label="Close" onPress={router.back} />}
      title="Attach to recipe">
      {recipes.length ? (
        <Section title="Choose a recipe">
          {recipes.map((recipe) => (
            <Pressable
              key={recipe.id}
              onPress={async () => {
                await attachCookingLogToRecipe(logId, recipe.id);
                refresh();
                router.back();
              }}
              style={[styles.row, { borderColor: theme.border }]}>
              <Ionicons color={theme.accent} name="restaurant-outline" size={21} />
              <Text style={[styles.title, { color: theme.text }]}>{recipe.title}</Text>
              <Ionicons color={theme.muted} name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </Section>
      ) : (
        <EmptyState
          icon="restaurant-outline"
          message="Create a saved recipe first, then return to attach this entry."
          title="No recipes yet"
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 11, minHeight: 58 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
});
