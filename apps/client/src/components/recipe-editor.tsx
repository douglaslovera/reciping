import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import {
  Field,
  IconButton,
  Page,
  PrimaryButton,
  SecondaryButton,
  Section,
} from '@/components/ui';
import { useDatabaseContext } from '@/db/provider';
import { getRecipe, isNewCollection, saveRecipe } from '@/db/repository';
import type { IngredientInput, RecipeInput } from '@/db/types';
import { translate } from '@/i18n';
import { persistJournalImage } from '@/media-storage';
import { parseDecimalInput } from '@/number-input';
import { useAppTheme } from '@/theme';

const emptyIngredient = (): IngredientInput => ({
  quantity: '',
  unit: '',
  name: '',
  preparation: '',
});

export function RecipeEditor({ id, pasteMode }: { id?: string; pasteMode?: boolean }) {
  const router = useRouter();
  const theme = useAppTheme();
  const { refresh, settings } = useDatabaseContext();
  const ingredientNameRefs = useRef<(TextInput | null)[]>([]);
  const pendingIngredientFocus = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(Boolean(id));
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [servings, setServings] = useState('');
  const [servingUnit, setServingUnit] = useState('servings');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [categories, setCategories] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([emptyIngredient()]);

  useEffect(() => {
    const index = pendingIngredientFocus.current;
    if (index === null) return;
    pendingIngredientFocus.current = null;
    requestAnimationFrame(() => ingredientNameRefs.current[index]?.focus());
  }, [ingredients.length]);

  useEffect(() => {
    if (!id) return;
    getRecipe(id)
      .then((recipe) => {
        if (!recipe) return;
        setTitle(recipe.title);
        setSummary(recipe.summary);
        setBody(recipe.body);
        setServings(recipe.servings?.toString() ?? '');
        setServingUnit(recipe.servingUnit);
        setPrepMinutes(recipe.prepMinutes?.toString() ?? '');
        setCookMinutes(recipe.cookMinutes?.toString() ?? '');
        setSourceName(recipe.sourceName ?? '');
        setSourceUrl(recipe.sourceUrl ?? '');
        setCategories(recipe.categories.join(', '));
        setCoverUri(recipe.coverUri);
        setIngredients(recipe.ingredients.length ? recipe.ingredients : [emptyIngredient()]);
      })
      .catch((error: unknown) => {
        Alert.alert('Could not load recipe', error instanceof Error ? error.message : 'Try again.');
      });
  }, [id]);

  const updateIngredient = (index: number, patch: Partial<IngredientInput>) =>
    setIngredients((current) =>
      current.map((ingredient, itemIndex) =>
        itemIndex === index ? { ...ingredient, ...patch } : ingredient,
      ),
    );

  const addIngredient = () => {
    pendingIngredientFocus.current = ingredients.length;
    setIngredients((current) => [...current, emptyIngredient()]);
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access is needed', 'Allow photo access to choose a recipe cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) {
      const uri = await persistJournalImage(result.assets[0].uri, `cover_${Date.now()}`);
      setCoverUri(uri);
    }
  };

  const save = async (status: RecipeInput['status']) => {
    if (saving) return;
    setSaving(true);
    try {
      const firstRecipe = !id && await isNewCollection();
      const recipeId = await saveRecipe(
        {
          title,
          summary,
          body,
          servings: servings ? parseDecimalInput(servings) : null,
          servingUnit,
          prepMinutes: prepMinutes ? Number(prepMinutes) : null,
          cookMinutes: cookMinutes ? Number(cookMinutes) : null,
          sourceName,
          sourceUrl,
          coverUri,
          ingredients,
          categories: categories.split(',').map((value) => value.trim()).filter(Boolean),
          status,
        },
        id,
      );
      refresh();
      router.dismissAll();
      router.replace({ pathname: '/recipe/[id]', params: { id: recipeId, ...(firstRecipe ? { firstSaved: status } : {}) } });
    } catch {
      Alert.alert(
        translate(settings.language, 'Could not save recipe'),
        translate(settings.language, 'Your changes are still here. Try saving again.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const preparation = (
    <Section title={pasteMode ? 'Original text or preparation' : 'Preparation'}>
      <Field
        label={pasteMode ? 'Paste here, then edit freely' : 'Steps and notes'}
        multiline
        onChangeText={setBody}
        placeholder={'## Preparation\n1. Heat the pan…'}
        value={body}
      />
    </Section>
  );

  return (
    <Page
      left={<IconButton icon="close" label="Close" onPress={() => router.back()} />}
      right={
        <Pressable disabled={saving} onPress={() => save('saved')}>
          <Text style={[styles.saveText, { color: theme.accent }]}>Save</Text>
        </Pressable>
      }
      title={id ? 'Edit recipe' : 'New recipe'}>
      <Section title="Recipe">
        <Field
          autoFocus={!id}
          label="Title"
          onChangeText={setTitle}
          placeholder="Grandma’s tomato pasta"
          value={title}
        />
      </Section>

      {pasteMode && preparation}
      <Section title={pasteMode ? 'Ingredients (optional)' : 'Ingredients'}>
        {ingredients.map((ingredient, index) => (
          <GlassSurface effect="clear" key={ingredient.id ?? index} style={styles.ingredientCard}>
            <View style={styles.ingredientHeader}>
              <View style={[styles.ingredientNumber, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.ingredientNumberText, { color: theme.accent }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.ingredientTitle, { color: theme.text }]}>
                {translate(settings.language, 'Ingredient')} {index + 1}
              </Text>
              <Pressable
                accessibilityLabel={translate(settings.language, 'Remove ingredient')}
                hitSlop={10}
                onPress={() =>
                  setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                style={styles.remove}>
                <Ionicons color={theme.muted} name="trash-outline" size={19} />
              </Pressable>
            </View>
            <Field
              label="Ingredient"
              onChangeText={(value) => updateIngredient(index, { name: value })}
              placeholder="whole milk"
              ref={(input) => {
                ingredientNameRefs.current[index] = input;
              }}
              value={ingredient.name}
            />
            <View style={styles.quantityRow}>
              <View style={styles.quantity}>
                <Field
                  label="Quantity"
                  onChangeText={(value) => updateIngredient(index, { quantity: value })}
                  placeholder="1 ½"
                  value={ingredient.quantity ?? ''}
                />
              </View>
              <View style={styles.unit}>
                <Field
                  label="Unit"
                  onChangeText={(value) => updateIngredient(index, { unit: value })}
                  placeholder="cups"
                  value={ingredient.unit ?? ''}
                />
              </View>
            </View>
            <Field
              label="Preparation (optional)"
              onChangeText={(value) => updateIngredient(index, { preparation: value })}
              placeholder="room temperature"
              value={ingredient.preparation ?? ''}
            />
          </GlassSurface>
        ))}
        <SecondaryButton icon="add" label="Add ingredient" onPress={addIngredient} />
      </Section>

      {!pasteMode && preparation}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDetails }}
        onPress={() => setShowDetails((value) => !value)} style={styles.detailsToggle}>
        <Text style={{ color: theme.accent, fontWeight: '600' }}>{showDetails ? 'Hide details' : 'Add more details'}</Text>
        <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} color={theme.accent} size={18} />
      </Pressable>
      {showDetails && (
        <>
          {coverUri ? <Image source={{ uri: coverUri }} style={styles.cover} /> : null}
          <SecondaryButton
            icon="image-outline"
            label={coverUri ? 'Change cover photo' : 'Add cover photo'}
            onPress={pickCover}
          />

          <Section title="Details">
            <Field
              label="Short description"
              multiline
              onChangeText={setSummary}
              placeholder="What makes this recipe worth keeping?"
              value={summary}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field
                  keyboardType="decimal-pad"
                  label="Makes"
                  onChangeText={setServings}
                  placeholder="4"
                  value={servings}
                />
              </View>
              <View style={styles.flex}>
                <Field
                  label="Serving unit"
                  onChangeText={setServingUnit}
                  placeholder="servings"
                  value={servingUnit}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field
                  keyboardType="number-pad"
                  label="Prep minutes"
                  onChangeText={setPrepMinutes}
                  placeholder="15"
                  value={prepMinutes}
                />
              </View>
              <View style={styles.flex}>
                <Field
                  keyboardType="number-pad"
                  label="Cook minutes"
                  onChangeText={setCookMinutes}
                  placeholder="30"
                  value={cookMinutes}
                />
              </View>
            </View>
          </Section>
          <Section title="Organization & source">
            <Field
              hint="Separate categories with commas."
              label="Categories"
              onChangeText={setCategories}
              placeholder="Dinner, Pasta, Weeknight"
              value={categories}
            />
            <Field
              label="Source name"
              onChangeText={setSourceName}
              placeholder="Family notebook"
              value={sourceName}
            />
            <Field
              autoCapitalize="none"
              keyboardType="url"
              label="Source link"
              onChangeText={setSourceUrl}
              placeholder="https://…"
              value={sourceUrl}
            />
          </Section>

        </>
      )}

      <View style={styles.bottomActions}>
        <PrimaryButton
          disabled={saving}
          icon="checkmark"
          label={saving ? 'Saving…' : 'Save recipe'}
          onPress={() => save('saved')}
        />
        <SecondaryButton
          icon="document-outline"
          label="Save as draft"
          onPress={() => { if (!saving) void save('draft'); }}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  detailsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingVertical: 12 },
  saveText: { fontSize: 16, fontWeight: '700', padding: 9 },
  cover: { borderRadius: 24, height: 210, width: '100%' },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  ingredientCard: { borderRadius: 20, gap: 12, padding: 14 },
  ingredientHeader: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  ingredientNumber: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  ingredientNumberText: { fontSize: 12, fontWeight: '800' },
  ingredientTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  quantityRow: { flexDirection: 'row', gap: 9 },
  quantity: { flex: 1 },
  unit: { flex: 1.2 },
  remove: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  bottomActions: { gap: 11, marginTop: 8 },
});
