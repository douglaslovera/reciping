import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

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
import { getRecipe, saveRecipe } from '@/db/repository';
import type { IngredientInput, RecipeInput } from '@/db/types';
import { persistJournalImage } from '@/media-storage';
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
  const { refresh } = useDatabaseContext();
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
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
      .finally(() => setLoading(false));
  }, [id]);

  const updateIngredient = (index: number, patch: Partial<IngredientInput>) =>
    setIngredients((current) =>
      current.map((ingredient, itemIndex) =>
        itemIndex === index ? { ...ingredient, ...patch } : ingredient,
      ),
    );

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
    setSaving(true);
    try {
      const recipeId = await saveRecipe(
        {
          title,
          summary,
          body,
          servings: servings ? Number(servings) : null,
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
      router.replace(`/recipe/${recipeId}`);
    } catch (error) {
      Alert.alert('Could not save recipe', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      left={<IconButton icon="close" label="Close" onPress={() => router.back()} />}
      right={
        <Pressable disabled={saving} onPress={() => save('saved')}>
          <Text style={[styles.saveText, { color: theme.accent }]}>Save</Text>
        </Pressable>
      }
      subtitle={loading ? 'Loading…' : id ? 'Changes stay local' : 'Start with only a title'}
      title={id ? 'Edit recipe' : 'New recipe'}>
      {coverUri ? <Image source={{ uri: coverUri }} style={styles.cover} /> : null}
      <SecondaryButton
        icon="image-outline"
        label={coverUri ? 'Change cover photo' : 'Add cover photo'}
        onPress={pickCover}
      />

      <Section title="Recipe">
        <Field
          autoFocus={!id}
          label="Title"
          onChangeText={setTitle}
          placeholder="Grandma’s tomato pasta"
          value={title}
        />
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

      <Section
        action={
          <Pressable
            onPress={() => setIngredients((current) => [...current, emptyIngredient()])}
            style={styles.addIngredient}>
            <Ionicons color={theme.accent} name="add" size={18} />
            <Text style={[styles.addText, { color: theme.accent }]}>Ingredient</Text>
          </Pressable>
        }
        title="Ingredients">
        {ingredients.map((ingredient, index) => (
          <View key={ingredient.id ?? index} style={[styles.ingredient, { borderColor: theme.border }]}>
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
              {ingredients.length > 1 ? (
                <Pressable
                  accessibilityLabel="Remove ingredient"
                  onPress={() =>
                    setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  style={styles.remove}>
                  <Ionicons color={theme.muted} name="close-circle" size={22} />
                </Pressable>
              ) : null}
            </View>
            <Field
              label="Ingredient"
              onChangeText={(value) => updateIngredient(index, { name: value })}
              placeholder="whole milk"
              value={ingredient.name}
            />
            <Field
              label="Preparation (optional)"
              onChangeText={(value) => updateIngredient(index, { preparation: value })}
              placeholder="room temperature"
              value={ingredient.preparation ?? ''}
            />
          </View>
        ))}
      </Section>

      <Section title={pasteMode ? 'Original text or preparation' : 'Preparation'}>
        <Field
          hint="Basic Markdown is supported: headings, bold, italics, lists, and links."
          label={pasteMode ? 'Paste here, then edit freely' : 'Steps and notes'}
          multiline
          onChangeText={setBody}
          placeholder={'## Preparation\n1. Heat the pan…'}
          value={body}
        />
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
          onPress={() => save('draft')}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  saveText: { fontSize: 16, fontWeight: '700', padding: 9 },
  cover: { borderRadius: 24, height: 210, width: '100%' },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  addIngredient: { alignItems: 'center', flexDirection: 'row', gap: 3, padding: 7 },
  addText: { fontSize: 14, fontWeight: '700' },
  ingredient: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 11,
    paddingBottom: 17,
  },
  quantityRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 9 },
  quantity: { flex: 1 },
  unit: { flex: 1.2 },
  remove: { paddingBottom: 12, paddingHorizontal: 3 },
  bottomActions: { gap: 11, marginTop: 8 },
});
