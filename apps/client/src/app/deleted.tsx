import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, IconButton, Page, Section } from '@/components/ui';
import { Text } from '@/components/localized-text';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import {
  listCookingLogs,
  listRecipes,
  listSavedItems,
  restoreCookingLog,
  restoreRecipe,
  restoreSavedItem,
} from '@/db/repository';
import type { CookingLog, Recipe, SavedItem } from '@/db/types';
import { useAppTheme } from '@/theme';

export default function DeletedScreen() {
  const router = useRouter();
  const { refresh } = useDatabaseContext();
  const recipes = useDataQuery(() => listRecipes({ deleted: true }), [] as Recipe[]);
  const logs = useDataQuery(() => listCookingLogs({ deleted: true }), [] as CookingLog[]);
  const saved = useDataQuery(() => listSavedItems({ deleted: true }), [] as SavedItem[]);
  const empty = !recipes.data.length && !logs.data.length && !saved.data.length;

  return (
    <Page
      left={<IconButton icon="chevron-back" label="Back" onPress={router.back} />}
      subtitle="Items remain here until you restore them"
      title="Recently Deleted">
      {empty ? (
        <EmptyState icon="trash-outline" message="Deleted items will appear here." title="Nothing here" />
      ) : null}
      {recipes.data.length ? (
        <Section title="Recipes">
          {recipes.data.map((recipe) => (
            <DeletedRow
              key={recipe.id}
              label={recipe.title}
              onRestore={async () => {
                await restoreRecipe(recipe.id);
                refresh();
              }}
            />
          ))}
        </Section>
      ) : null}
      {logs.data.length ? (
        <Section title="Journal entries">
          {logs.data.map((log) => (
            <DeletedRow
              key={log.id}
              label={log.title}
              onRestore={async () => {
                await restoreCookingLog(log.id);
                refresh();
              }}
            />
          ))}
        </Section>
      ) : null}
      {saved.data.length ? (
        <Section title="Saved items">
          {saved.data.map((item) => (
            <DeletedRow
              key={item.id}
              label={item.title}
              onRestore={async () => {
                await restoreSavedItem(item.id);
                refresh();
              }}
            />
          ))}
        </Section>
      ) : null}
    </Page>
  );
}

function DeletedRow({ label, onRestore }: { label: string; onRestore: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <Ionicons color={theme.muted} name="trash-outline" size={20} />
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onRestore} style={styles.restore}>
        <Text style={[styles.restoreText, { color: theme.accent }]}>Restore</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 55 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  restore: { padding: 9 },
  restoreText: { fontSize: 13, fontWeight: '700' },
});
