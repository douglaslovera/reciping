import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Pressable, StyleSheet, View } from 'react-native';

import { GlassSearch } from '@/components/glass-search';
import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { EmptyState, LoadingState, PrimaryButton } from '@/components/ui';
import { ScreenShell } from '@/components/screen-shell';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { listRecipes } from '@/db/repository';
import type { Recipe } from '@/db/types';
import { useAppTheme } from '@/theme';

type Filter = 'all' | 'favorites' | 'drafts';

export default function RecipesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { settings, refresh } = useDatabaseContext();
  const { data: recipes, loading, error } = useDataQuery(listRecipes, [] as Recipe[]);
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

  return (
    <ScreenShell
      onMenuPress={() => router.push('/settings')}
      title="Recipes">
      {recipes.length > 0 && <GlassSearch
        onChangeText={setSearch}
        onFilterPress={() =>
          setFilter((current) =>
            current === 'all' ? 'favorites' : current === 'favorites' ? 'drafts' : 'all',
          )
        }
        placeholder={`Search recipes${filter === 'all' ? '' : ` · ${filter}`}`}
        value={search}
      />}

      {loading ? <LoadingState /> : error ? (
        <EmptyState icon="alert-circle-outline" title="Could not load recipes"
          message="Try opening your collection again."
          action={<PrimaryButton label="Try again" onPress={refresh} />} />
      ) : recipes.length ? (
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
            ListEmptyComponent={<EmptyState icon="search-outline" title="No matching recipes"
              message="Try another search or clear your filters."
              action={<PrimaryButton label="Clear filters" onPress={() => { setSearch(''); setFilter('all'); }} />} />}
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
        <ScrollView contentContainerStyle={styles.emptyArea} showsVerticalScrollIndicator={false}>
          <View style={styles.onboarding}>
            <View style={[styles.bookIcon, { backgroundColor: theme.accentSoft }]}>
              <Ionicons color={theme.accent} name="book-outline" size={30} />
            </View>
            <Text accessibilityRole="header" style={[styles.welcomeTitle, { color: theme.text }]}>
              Add a recipe
            </Text>
            <Text style={[styles.welcomeCopy, { color: theme.muted }]}>
              Keep the ingredients and steps here. Make it yours each time you cook.
            </Text>
            <View style={styles.emptyActions}>
              <PrimaryButton label="Add a recipe"
                onPress={() => router.push('/recipe/new')} />
            </View>
          </View>
        </ScrollView>
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
        <View style={[styles.cardIcon, { backgroundColor: '#F0F0F0' }]}>
          <Ionicons color="#C8C8CA" name="restaurant-outline" size={grid ? 22 : 18} />
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
  listArea: { flex: 1, marginTop: 10 },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  count: { fontSize: 13, fontWeight: '600' },
  inlineAdd: { alignItems: 'center', flexDirection: 'row', gap: 3, padding: 5 },
  inlineAddText: { fontSize: 14, fontWeight: '700' },
  list: { gap: 7, paddingBottom: 120 },
  gridCell: { flex: 1, margin: 4, maxWidth: '50%' },
  listCell: { width: '100%' },
  card: { borderRadius: 10 },
  gridCard: { gap: 9, minHeight: 150, padding: 12 },
  rowCard: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 66, padding: 8 },
  cardIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  cardCopy: { flex: 1, gap: 3 },
  cardTitleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 5 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 17 },
  cardMeta: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4, lineHeight: 13, textTransform: 'uppercase' },
  emptyArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: 40, paddingBottom: 110 },
  onboarding: { alignItems: 'center', alignSelf: 'center', maxWidth: 340, width: '100%' },
  bookIcon: { alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, marginBottom: 24 },
  welcomeTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7, lineHeight: 34, textAlign: 'center', maxWidth: 280 },
  welcomeCopy: { fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 14, maxWidth: 290 },
  emptyActions: { gap: 6, marginTop: 30, width: '100%', maxWidth: 270 },
});
