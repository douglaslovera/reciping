import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Field, IconButton, Page, PrimaryButton, Section } from '@/components/ui';
import { Text } from '@/components/localized-text';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { createCookingSession, listRecipes } from '@/db/repository';
import type { Recipe } from '@/db/types';
import { useAppTheme } from '@/theme';

export default function NewSessionScreen() {
  const { past } = useLocalSearchParams<{ past?: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { refresh } = useDatabaseContext();
  const { data: recipes } = useDataQuery(() => listRecipes({ drafts: false }), [] as Recipe[]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [standaloneTitle, setStandaloneTitle] = useState('');
  const [servings, setServings] = useState('');
  const [saving, setSaving] = useState(false);
  const isPast = past === '1';
  const visible = useMemo(
    () =>
      recipes.filter((recipe) =>
        recipe.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    [recipes, search],
  );

  const create = async () => {
    setSaving(true);
    try {
      const logId = await createCookingSession({
        recipeId: selectedId,
        title: selectedId ? undefined : standaloneTitle,
        servings: servings ? Number(servings) : undefined,
        completed: isPast,
      });
      refresh();
      router.dismiss();
      router.push(`/session/${logId}`);
    } catch (error) {
      Alert.alert('Could not create entry', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      left={<IconButton icon="close" label="Close" onPress={router.back} />}
      title={isPast ? 'Add past cooking' : 'Start cooking'}>
      <Section title="Choose a recipe">
        <Field
          label="Search your library"
          onChangeText={setSearch}
          placeholder="Recipe name"
          value={search}
        />
        <View style={styles.recipeList}>
          {visible.slice(0, 12).map((recipe) => {
            const selected = selectedId === recipe.id;
            return (
              <Pressable
                key={recipe.id}
                onPress={() => setSelectedId(selected ? null : recipe.id)}
                style={[
                  styles.recipe,
                  {
                    backgroundColor: selected ? theme.accentSoft : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Ionicons
                  color={selected ? theme.accent : theme.muted}
                  name={selected ? 'checkmark-circle' : 'restaurant-outline'}
                  size={21}
                />
                <View style={styles.flex}>
                  <Text style={[styles.recipeTitle, { color: theme.text }]}>{recipe.title}</Text>
                  <Text style={[styles.recipeMeta, { color: theme.muted }]}>
                    {recipe.servings ? `${recipe.servings} ${recipe.servingUnit}` : 'Serving size not set'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Or create a standalone log">
        <Field
          editable={!selectedId}
          hint="You can keep this without a recipe, though attaching one gives you reusable ingredients and history."
          label="What did you cook?"
          onChangeText={setStandaloneTitle}
          placeholder="Sunday breakfast"
          value={standaloneTitle}
        />
      </Section>

      <Field
        keyboardType="decimal-pad"
        label="Serving quantity (optional)"
        onChangeText={setServings}
        placeholder="4"
        value={servings}
      />

      <PrimaryButton
        disabled={saving || (!selectedId && !standaloneTitle.trim())}
        icon={isPast ? 'journal-outline' : 'flame-outline'}
        label={saving ? 'Creating…' : isPast ? 'Create journal entry' : 'Start session'}
        onPress={create}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  recipeList: { gap: 8 },
  recipe: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 11,
    minHeight: 60,
    padding: 12,
  },
  flex: { flex: 1 },
  recipeTitle: { fontSize: 15, fontWeight: '600' },
  recipeMeta: { fontSize: 12, marginTop: 3 },
});
