import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { MarkdownBody } from '@/components/markdown-body';
import {
  EmptyState,
  IconButton,
  LoadingState,
  Page,
  PrimaryButton,
  SecondaryButton,
  Section,
} from '@/components/ui';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import {
  createCookingSession,
  getRecipe,
  listCookingLogs,
  listVariations,
  setRecipeFavorite,
  softDeleteRecipe,
} from '@/db/repository';
import type { CookingLog, Recipe, Variation } from '@/db/types';
import { useAppTheme } from '@/theme';

export default function RecipeDetailScreen() {
  const { id, firstSaved } = useLocalSearchParams<{ id: string; firstSaved?: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { refresh, settings } = useDatabaseContext();
  const recipeQuery = useDataQuery(() => getRecipe(id), null as Recipe | null, [id]);
  const logQuery = useDataQuery(
    () => listCookingLogs({ recipeId: id, state: 'completed' }),
    [] as CookingLog[],
    [id],
  );
  const variationQuery = useDataQuery(() => listVariations(id), [] as Variation[], [id]);
  const recipe = recipeQuery.data;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const costs = useMemo(
    () => logQuery.data.filter((log) => log.costTotal !== null),
    [logQuery.data],
  );
  const averageCost = costs.length
    ? costs.reduce((sum, log) => sum + (log.costTotal ?? 0), 0) / costs.length
    : null;

  if (recipeQuery.loading) {
    return (
      <Page left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} title="Recipe">
        <LoadingState />
      </Page>
    );
  }
  if (!recipe) {
    return (
      <Page left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} title="Recipe">
        <EmptyState icon="alert-circle-outline" message="It may have been deleted." title="Recipe not found" />
      </Page>
    );
  }

  const startCooking = async (variationId?: string) => {
    try {
      const logId = await createCookingSession({ recipeId: recipe.id, variationId });
      refresh();
      router.push(`/session/${logId}`);
    } catch (error) {
      Alert.alert('Could not start cooking', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const confirmDelete = () =>
    Alert.alert(settings.language === 'es' ? '¿Eliminar receta?' : 'Delete recipe?', undefined, [
      { text: settings.language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
      {
        text: settings.language === 'es' ? 'Eliminar' : 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await softDeleteRecipe(recipe.id);
            refresh();
            goBack();
          } catch {
            Alert.alert(
              settings.language === 'es'
                ? 'No se pudo eliminar la receta'
                : 'Could not delete recipe',
              settings.language === 'es' ? 'Inténtalo de nuevo.' : 'Try again.',
            );
          }
        },
      },
    ]);

  return (
    <Page
      left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />}
      right={
        <IconButton
          icon={recipe.favorite ? 'heart' : 'heart-outline'}
          label={recipe.favorite ? 'Remove favorite' : 'Favorite'}
          onPress={async () => {
            await setRecipeFavorite(recipe.id, !recipe.favorite);
            refresh();
          }}
        />
      }
      subtitle={`Updated ${formatDate(recipe.updatedAt)}`}
      title={recipe.title}>
      {firstSaved && <Text accessibilityLiveRegion="polite" style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
        {firstSaved === 'draft' ? 'Your first draft is saved' : 'Your first recipe is saved'}
      </Text>}
      {recipe.coverUri ? <Image source={{ uri: recipe.coverUri }} style={styles.cover} /> : null}
      {recipe.summary ? <Text style={[styles.summary, { color: theme.muted }]}>{recipe.summary}</Text> : null}
      <PrimaryButton icon="flame-outline" label="Start cooking session" onPress={() => startCooking()} />

      <View style={styles.stats}>
        <Stat icon="people-outline" label="Makes" value={recipe.servings ? `${recipe.servings} ${recipe.servingUnit}` : 'Not set'} />
        <Stat
          icon="time-outline"
          label="Time"
          value={
            recipe.prepMinutes || recipe.cookMinutes
              ? `${(recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)} min`
              : 'Not set'
          }
        />
        <Stat
          icon="cash-outline"
          label="Latest cost"
          value={
            costs[0]?.costTotal != null
              ? money(costs[0].costTotal, costs[0].currency, settings.language)
              : 'Not set'
          }
        />
      </View>
      {averageCost !== null ? (
        <Text style={[styles.costNote, { color: theme.muted }]}>
          Average cost: {money(averageCost, costs[0]?.currency, settings.language)}
        </Text>
      ) : null}

      <Section title="Ingredients">
        {recipe.ingredients.length ? (
          recipe.ingredients.map((ingredient) => (
            <GlassSurface effect="clear" key={ingredient.id} style={styles.ingredient}>
              <Text style={[styles.amount, { color: theme.accent }]}>
                {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ') || '—'}
              </Text>
              <View style={styles.ingredientCopy}>
                <Text style={[styles.ingredientName, { color: theme.text }]}>{ingredient.name}</Text>
                {ingredient.preparation ? (
                  <Text style={[styles.preparation, { color: theme.muted }]}>
                    {ingredient.preparation}
                  </Text>
                ) : null}
              </View>
            </GlassSurface>
          ))
        ) : (
          <Text style={[styles.muted, { color: theme.muted }]}>No ingredients recorded.</Text>
        )}
      </Section>

      {recipe.body ? (
        <Section title="Preparation">
          <MarkdownBody value={recipe.body} />
        </Section>
      ) : null}

      {variationQuery.data.length ? (
        <Section title="Saved variations">
          {variationQuery.data.map((variation) => (
            <Pressable
              key={variation.id}
              onPress={() => startCooking(variation.id)}
              style={[styles.rowLink, { borderColor: theme.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{variation.name}</Text>
                <Text style={[styles.rowMeta, { color: theme.muted }]}>
                  Saved {formatDate(variation.createdAt)}
                </Text>
              </View>
              <Ionicons color={theme.accent} name="flame-outline" size={20} />
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section title="Cooking history">
        {logQuery.data.length ? (
          logQuery.data.slice(0, 5).map((log) => (
            <Pressable
              key={log.id}
              onPress={() => router.push(`/session/${log.id}`)}
              style={[styles.rowLink, { borderColor: theme.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{formatDate(log.cookedAt)}</Text>
                <Text style={[styles.rowMeta, { color: theme.muted }]}>
                  {log.rating ? `${'★'.repeat(log.rating)} · ` : ''}
                  {log.changes.length} {log.changes.length === 1 ? 'change' : 'changes'}
                </Text>
              </View>
              <Ionicons color={theme.muted} name="chevron-forward" size={18} />
            </Pressable>
          ))
        ) : (
          <Text style={[styles.muted, { color: theme.muted }]}>You have not cooked this recipe yet.</Text>
        )}
      </Section>

      {(recipe.sourceName || recipe.sourceUrl) && (
        <Section title="Source">
          <Pressable
            disabled={!recipe.sourceUrl}
            onPress={() => recipe.sourceUrl && Linking.openURL(recipe.sourceUrl)}
            style={[styles.rowLink, { borderColor: theme.border }]}>
            <Text style={[styles.rowTitle, styles.flex, { color: theme.text }]}>
              {recipe.sourceName || recipe.sourceUrl}
            </Text>
            {recipe.sourceUrl ? <Ionicons color={theme.accent} name="open-outline" size={18} /> : null}
          </Pressable>
        </Section>
      )}

      <View style={styles.actions}>
        <SecondaryButton icon="pencil-outline" label="Edit recipe" onPress={() => router.push(`/recipe/${recipe.id}/edit`)} />
        <SecondaryButton destructive icon="trash-outline" label="Delete" onPress={confirmDelete} />
      </View>
    </Page>
  );
}

function Stat({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <GlassSurface effect="clear" style={styles.stat}>
      <Ionicons color={theme.accent} name={icon} size={18} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </GlassSurface>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value);
}

function money(amount: number, currency: string | null | undefined, language: 'en' | 'es') {
  try {
    return new Intl.NumberFormat(language, { currency: currency || 'USD', style: 'currency' }).format(
      amount,
    );
  } catch {
    return `${currency || ''} ${amount.toFixed(2)}`.trim();
  }
}

const styles = StyleSheet.create({
  cover: { borderRadius: 10, height: 220, width: '100%' },
  summary: { fontSize: 16, lineHeight: 23 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { alignItems: 'center', borderRadius: 9, flex: 1, gap: 4, paddingHorizontal: 6, paddingVertical: 10 },
  statValue: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statLabel: { fontSize: 10, textAlign: 'center' },
  costNote: { fontSize: 12, marginTop: -10, textAlign: 'right' },
  ingredient: { alignItems: 'flex-start', borderRadius: 8, flexDirection: 'row', gap: 10, padding: 10 },
  amount: { fontSize: 12, fontWeight: '700', minWidth: 62 },
  ingredientCopy: { flex: 1, gap: 3 },
  ingredientName: { fontSize: 13, fontWeight: '600' },
  preparation: { fontSize: 10 },
  muted: { fontSize: 14, lineHeight: 20 },
  rowLink: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 58, paddingVertical: 9 },
  flex: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 3 },
  actions: { gap: 10, marginTop: 5 },
});
