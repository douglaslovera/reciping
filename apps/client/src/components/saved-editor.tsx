import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/localized-text';
import { Field, IconButton, Page, PrimaryButton, SecondaryButton, Section } from '@/components/ui';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { getSavedItem, listRecipes, saveSavedItem, softDeleteSavedItem } from '@/db/repository';
import type { Recipe, SavedItem } from '@/db/types';
import { useAppTheme } from '@/theme';

export function SavedEditor({ id }: { id?: string }) {
  const router = useRouter();
  const theme = useAppTheme();
  const { refresh } = useDatabaseContext();
  const { data: recipes } = useDataQuery(() => listRecipes(), [] as Recipe[]);
  const [kind, setKind] = useState<SavedItem['kind']>('video');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('');
  const [body, setBody] = useState('');
  const [recipeIds, setRecipeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSavedItem(id).then((item) => {
      if (!item) return;
      setKind(item.kind);
      setTitle(item.title);
      setUrl(item.url ?? '');
      setPlatform(item.platform ?? '');
      setBody(item.body);
      setRecipeIds(item.recipeIds);
    });
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSavedItem(
        { kind, title, url, platform, body, thumbnailUri: null, recipeIds },
        id,
      );
      refresh();
      router.back();
    } catch (error) {
      Alert.alert('Could not save item', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    id &&
    Alert.alert('Move to Recently Deleted?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move',
        style: 'destructive',
        onPress: async () => {
          await softDeleteSavedItem(id);
          refresh();
          router.back();
        },
      },
    ]);

  return (
    <Page
      left={<IconButton icon="close" label="Close" onPress={router.back} />}
      right={
        <Pressable disabled={saving} onPress={save}>
          <Text style={[styles.save, { color: theme.accent }]}>Save</Text>
        </Pressable>
      }
      subtitle="Links only—videos are not uploaded"
      title={id ? 'Edit saved item' : 'Save something'}>
      <Section title="Type">
        <View style={styles.types}>
          {([
            ['video', 'play-outline', 'Video'],
            ['article', 'reader-outline', 'Article'],
            ['tip', 'bulb-outline', 'Tip'],
          ] as const).map(([value, icon, label]) => (
            <Pressable
              key={value}
              onPress={() => setKind(value)}
              style={[
                styles.type,
                {
                  backgroundColor: kind === value ? theme.accentSoft : theme.surface,
                  borderColor: kind === value ? theme.accent : theme.border,
                },
              ]}>
              <Ionicons color={kind === value ? theme.accent : theme.muted} name={icon} size={21} />
              <Text style={[styles.typeText, { color: kind === value ? theme.accent : theme.text }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Field label="Title" onChangeText={setTitle} placeholder="How to dice an onion" value={title} />
      {kind !== 'tip' ? (
        <>
          <Field
            autoCapitalize="none"
            keyboardType="url"
            label="Link"
            onChangeText={setUrl}
            placeholder="https://youtube.com/…"
            value={url}
          />
          <Field
            label="Platform or source"
            onChangeText={setPlatform}
            placeholder="YouTube"
            value={platform}
          />
        </>
      ) : null}
      <Field
        label={kind === 'tip' ? 'Tip' : 'Your notes'}
        multiline
        onChangeText={setBody}
        placeholder="What do you want to remember?"
        value={body}
      />

      {recipes.length ? (
        <Section title="Link to recipes (optional)">
          {recipes.map((recipe) => {
            const selected = recipeIds.includes(recipe.id);
            return (
              <Pressable
                key={recipe.id}
                onPress={() =>
                  setRecipeIds((current) =>
                    selected ? current.filter((value) => value !== recipe.id) : [...current, recipe.id],
                  )
                }
                style={[styles.recipeRow, { borderColor: theme.border }]}>
                <Ionicons
                  color={selected ? theme.accent : theme.muted}
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={21}
                />
                <Text style={[styles.recipeTitle, { color: theme.text }]}>{recipe.title}</Text>
              </Pressable>
            );
          })}
        </Section>
      ) : null}

      <PrimaryButton disabled={saving || !title.trim()} icon="bookmark-outline" label={saving ? 'Saving…' : 'Save item'} onPress={save} />
      {url ? <SecondaryButton icon="open-outline" label="Open link" onPress={() => Linking.openURL(url)} /> : null}
      {id ? <SecondaryButton destructive icon="trash-outline" label="Move to Recently Deleted" onPress={remove} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  save: { fontSize: 16, fontWeight: '700', padding: 9 },
  types: { flexDirection: 'row', gap: 8 },
  type: { alignItems: 'center', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flex: 1, gap: 5, padding: 12 },
  typeText: { fontSize: 12, fontWeight: '700' },
  recipeRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 48 },
  recipeTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
});
