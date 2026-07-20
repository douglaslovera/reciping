import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { GlassSearch } from '@/components/glass-search';
import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { EmptyState, PrimaryButton } from '@/components/ui';
import { ScreenShell } from '@/components/screen-shell';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { listRecipes } from '@/db/repository';
import type { Recipe } from '@/db/types';
import { useAppTheme } from '@/theme';

type Filter = 'all' | 'favorites' | 'drafts';

export default function RecipesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { settings } = useDatabaseContext();
  const { data: recipes, loading } = useDataQuery(() => listRecipes(), [] as Recipe[]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return recipes.filter((recipe) => {
      if (filter === 'favorites' && !recipe.favorite) return false;
      if (filter === 'drafts' && recipe.status !== 'draft') return false;
      return (
        !needle ||
        recipe.title.toLocaleLowerCase().includes(needle) ||
        recipe.categories.some((category) => category.toLocaleLowerCase().includes(needle)) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLocaleLowerCase().includes(needle),
        )
      );
    });
  }, [filter, recipes, search]);

  const openImportInfo = () =>
    Alert.alert(
      'AI imports come later',
      'Link importing and AI organization are intentionally deferred. You can create a recipe manually or paste the original text into an editable draft now.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Create draft', onPress: () => router.push('/recipe/new?mode=paste') },
      ],
    );

  return (
    <ScreenShell
      eyebrow="MY RECIPE BOOK"
      onMenuPress={() => router.push('/settings')}
      title="Recipes">
      <GlassSearch
        onChangeText={setSearch}
        onFilterPress={() =>
          setFilter((current) =>
            current === 'all' ? 'favorites' : current === 'favorites' ? 'drafts' : 'all',
          )
        }
        placeholder={`Search recipes${filter === 'all' ? '' : ` · ${filter}`}`}
        value={search}
      />

      {recipes.length ? (
        <View style={styles.listArea}>
          <View style={styles.listHeader}>
            <Text style={[styles.count, { color: theme.muted }]}>
              {visible.length}{' '}
              {settings.language === 'es'
                ? visible.length === 1
                  ? 'receta'
                  : 'recetas'
                : visible.length === 1
                  ? 'recipe'
                  : 'recipes'}
            </Text>
            <Pressable onPress={() => router.push('/recipe/new')} style={styles.inlineAdd}>
              <Ionicons color={theme.accent} name="add" size={18} />
              <Text style={[styles.inlineAddText, { color: theme.accent }]}>New</Text>
            </Pressable>
          </View>
          <FlatList
            contentContainerStyle={styles.list}
            data={visible}
            key={settings.libraryView}
            keyExtractor={(item) => item.id}
            numColumns={settings.libraryView === 'grid' ? 2 : 1}
            renderItem={({ item }) => (
              <RecipeCard
                grid={settings.libraryView === 'grid'}
                onPress={() => router.push(`/recipe/${item.id}`)}
                recipe={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.emptyArea}>
          <EmptyState
            action={
              <View style={styles.emptyActions}>
                <PrimaryButton
                  icon="pencil-outline"
                  label="Create manually"
                  onPress={() => router.push('/recipe/new')}
                />
                <Pressable accessibilityRole="button" onPress={openImportInfo}>
                  <Text style={[styles.importLink, { color: theme.accent }]}>
                    Paste or import a recipe
                  </Text>
                </Pressable>
              </View>
            }
            icon={loading ? 'hourglass-outline' : 'restaurant-outline'}
            message="Write one from scratch or paste the original into an editable draft."
            title={loading ? 'Opening your collection…' : 'Start your collection'}
          />
        </View>
      )}
    </ScreenShell>
  );
}

function RecipeCard({
  recipe,
  onPress,
  grid,
}: {
  recipe: Recipe;
  onPress: () => void;
  grid: boolean;
}) {
  const theme = useAppTheme();
  const { settings } = useDatabaseContext();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        grid ? styles.gridCell : styles.listCell,
        { opacity: pressed ? 0.72 : 1 },
      ]}>
      <GlassSurface effect="regular" style={[styles.card, grid ? styles.gridCard : styles.rowCard]}>
        <View style={[styles.cardIcon, { backgroundColor: theme.accentSoft }]}>
          <Ionicons color={theme.accent} name="restaurant-outline" size={grid ? 24 : 20} />
        </View>
        <View style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
              {recipe.title}
            </Text>
            {recipe.favorite ? <Ionicons color={theme.accent} name="heart" size={16} /> : null}
          </View>
          <Text numberOfLines={2} style={[styles.cardMeta, { color: theme.muted }]}>
            {recipe.status === 'draft'
              ? 'Draft'
              : recipe.servings
                ? `${recipe.servings} ${
                    settings.language === 'es' && recipe.servingUnit === 'servings'
                      ? 'porciones'
                      : recipe.servingUnit
                  }`
                : `${recipe.ingredients.length} ingredients`}
          </Text>
        </View>
        {!grid ? <Ionicons color={theme.muted} name="chevron-forward" size={18} /> : null}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listArea: { flex: 1, marginTop: 15 },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  count: { fontSize: 13, fontWeight: '600' },
  inlineAdd: { alignItems: 'center', flexDirection: 'row', gap: 3, padding: 5 },
  inlineAddText: { fontSize: 14, fontWeight: '700' },
  list: { gap: 10, paddingBottom: 120 },
  gridCell: { flex: 1, margin: 4, maxWidth: '50%' },
  listCell: { width: '100%' },
  card: { borderRadius: 22 },
  gridCard: { gap: 12, minHeight: 174, padding: 15 },
  rowCard: { alignItems: 'center', flexDirection: 'row', gap: 13, minHeight: 78, padding: 13 },
  cardIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  cardCopy: { flex: 1, gap: 6 },
  cardTitleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 5 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 20 },
  cardMeta: { fontSize: 12, lineHeight: 16 },
  emptyArea: { flex: 1, justifyContent: 'center', paddingBottom: 35 },
  emptyActions: { gap: 14, marginTop: 8, width: 210 },
  importLink: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
