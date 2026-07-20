import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { MarkdownBody } from '@/components/markdown-body';
import {
  EmptyState,
  Field,
  IconButton,
  LoadingState,
  Page,
  PrimaryButton,
  SecondaryButton,
  Section,
} from '@/components/ui';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import {
  completeCookingLog,
  createId,
  createVariationFromLog,
  getCookingLog,
  repeatCookingLog,
  replaceCookingLogSnapshotWithCurrentRecipe,
  softDeleteCookingLog,
  updateCookingLog,
} from '@/db/repository';
import type { CookingChange, CookingLog, CookingPhoto, CostItem } from '@/db/types';
import { persistJournalImage, removeJournalImage } from '@/media-storage';
import { useAppTheme } from '@/theme';

const changeKinds: { key: CookingChange['kind']; label: string }[] = [
  { key: 'replace', label: 'Replace' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'omit', label: 'Leave out' },
  { key: 'add', label: 'Add' },
  { key: 'preparation', label: 'Method' },
];

export default function CookingSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/journal'));
  const query = useDataQuery(() => getCookingLog(id), null as CookingLog | null, [id]);

  if (query.loading) {
    return (
      <Page left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} title="Cooking session">
        <LoadingState />
      </Page>
    );
  }
  if (!query.data) {
    return (
      <Page left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} title="Cooking session">
        <EmptyState icon="alert-circle-outline" message="This entry could not be found." title="Missing session" />
      </Page>
    );
  }
  return query.data.state === 'active' ? (
    <ActiveSession initial={query.data} />
  ) : (
    <CompletedSession initial={query.data} />
  );
}

function ActiveSession({ initial }: { initial: CookingLog }) {
  useKeepAwake('active-cooking-session');
  return <SessionEditor initial={initial} active />;
}

function CompletedSession({ initial }: { initial: CookingLog }) {
  return <SessionEditor initial={initial} active={false} />;
}

function SessionEditor({ initial, active }: { initial: CookingLog; active: boolean }) {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/journal'));
  const theme = useAppTheme();
  const { refresh, settings } = useDatabaseContext();
  const [log, setLog] = useState(initial);
  const [changeKind, setChangeKind] = useState<CookingChange['kind']>('replace');
  const [changeText, setChangeText] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const currency = log.currency || settings.currency;
  const scale =
    log.snapshot.servings && log.servings ? log.servings / log.snapshot.servings : 1;

  useEffect(() => setLog(initial), [initial]);

  const persist = async (patch: Partial<CookingLog>) => {
    const next = { ...log, ...patch };
    setLog(next);
    await updateCookingLog(log.id, {
      title: patch.title,
      checkedItems: patch.checkedItems,
      servings: patch.servings,
      rating: patch.rating,
      wouldMakeAgain: patch.wouldMakeAgain,
      notes: patch.notes,
      costMode: patch.costMode,
      currency: patch.currency,
      costTotal: patch.costTotal,
      changes: patch.changes,
      costItems: patch.costItems,
      photos: patch.photos,
    });
    refresh();
  };

  const addChange = async () => {
    const selectedIngredient = log.snapshot.ingredients.find(
      (ingredient) => ingredient.id === selectedIngredientId,
    );
    const resultingValue =
      changeKind === 'omit' && selectedIngredient
        ? selectedIngredient.name
        : changeText.trim();
    if (!resultingValue) return;
    const originalValue = selectedIngredient
      ? changeKind === 'quantity'
        ? selectedIngredient.quantity
        : changeKind === 'preparation'
          ? selectedIngredient.preparation
          : selectedIngredient.name
      : null;
    const change: CookingChange = {
      id: createId('change'),
      kind: changeKind,
      ingredientId: selectedIngredientId,
      originalValue,
      resultingValue,
    };
    await persist({ changes: [...log.changes, change] });
    setChangeText('');
    setSelectedIngredientId(null);
  };

  const addCostItem = async () => {
    const amount = Number(costAmount);
    if (!costLabel.trim() || !Number.isFinite(amount)) return;
    const item: CostItem = { id: createId('cost'), label: costLabel.trim(), amount };
    await persist({
      costMode: 'itemized',
      currency,
      costItems: [...log.costItems, item],
      costTotal: [...log.costItems, item].reduce((sum, value) => sum + value.amount, 0),
    });
    setCostLabel('');
    setCostAmount('');
  };

  const addPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access is needed', 'Allow access to keep cooking photos in this session.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled) return;
    const additions: CookingPhoto[] = await Promise.all(
      result.assets.map(async (asset) => {
        const id = createId('photo');
        return {
          id,
          uri: await persistJournalImage(asset.uri, id),
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType ?? null,
        };
      }),
    );
    await persist({ photos: [...log.photos, ...additions] });
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateCookingLog(log.id, {
        title: log.title,
        checkedItems: log.checkedItems,
        servings: log.servings,
        rating: log.rating,
        wouldMakeAgain: log.wouldMakeAgain,
        notes: log.notes,
        costMode: log.costMode,
        currency: log.costMode === 'none' ? null : currency,
        costTotal: log.costTotal,
        changes: log.changes,
        costItems: log.costMode === 'itemized' ? log.costItems : undefined,
        photos: log.photos,
      });
      await completeCookingLog(log.id);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const saveVariation = () => {
    const create = async (name: string) => {
      await createVariationFromLog(log.id, name);
      refresh();
      Alert.alert('Variation saved', 'It stays under the original recipe and can be selected next time.');
    };
    if (Platform.OS === 'ios') {
      Alert.prompt('Save variation', 'Name this version of the recipe.', create, 'plain-text', 'My variation');
    } else {
      void create(`Variation · ${formatDate(Date.now())}`);
    }
  };

  const remove = () =>
    Alert.alert('Move this entry to Recently Deleted?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move',
        style: 'destructive',
        onPress: async () => {
          await softDeleteCookingLog(log.id);
          refresh();
          router.dismissAll();
        },
      },
    ]);

  const cookAgain = async () => {
    const newLogId = await repeatCookingLog(log.id);
    refresh();
    router.push(`/session/${newLogId}`);
  };

  const manageSnapshot = () =>
    Alert.alert(
      'Replace this saved snapshot?',
      'This deliberately replaces the ingredients and preparation captured for this log with the current base recipe. Existing changes and notes stay. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirm snapshot replacement',
              'The historical recipe snapshot for this cooking entry will be changed.',
              [
                { text: 'Keep snapshot', style: 'cancel' },
                {
                  text: 'Replace snapshot',
                  style: 'destructive',
                  onPress: async () => {
                    await replaceCookingLogSnapshotWithCurrentRecipe(log.id);
                    refresh();
                  },
                },
              ],
            ),
        },
      ],
    );

  const total = log.costMode === 'itemized'
    ? log.costItems.reduce((sum, item) => sum + item.amount, 0)
    : log.costTotal;

  return (
    <Page
      left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />}
      right={
        active ? (
          <View style={[styles.live, { backgroundColor: theme.accentSoft }]}>
            <View style={[styles.liveDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.liveText, { color: theme.accent }]}>ACTIVE</Text>
          </View>
        ) : undefined
      }
      subtitle={active ? 'Saved locally as you make changes' : formatDate(log.cookedAt)}
      title={log.title}>
      {!active ? (
        <GlassSurface effect="clear" style={styles.completedBanner}>
          <Ionicons color={theme.accent} name="checkmark-circle" size={21} />
          <Text style={[styles.completedText, { color: theme.text }]}>Completed cooking session</Text>
        </GlassSurface>
      ) : null}

      <View style={styles.servingRow}>
        <View style={styles.flex}>
          <Field
            editable={active}
            keyboardType="decimal-pad"
            label="Cooking quantity"
            onChangeText={(value) => {
              const servings = value ? Number(value) : null;
              if (!Number.isNaN(servings)) setLog((current) => ({ ...current, servings }));
            }}
            onEndEditing={() => persist({ servings: log.servings })}
            value={log.servings?.toString() ?? ''}
          />
        </View>
        {scale !== 1 ? (
          <View style={[styles.scaleBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.scaleText, { color: theme.accent }]}>{scale.toFixed(2)}×</Text>
          </View>
        ) : null}
      </View>

      <GlassSurface effect="clear" style={styles.snapshotCard}>
        <View style={styles.flex}>
          <Text style={[styles.snapshotTitle, { color: theme.text }]}>Recipe snapshot</Text>
          <Text style={[styles.snapshotMeta, { color: theme.muted }]}>
            {settings.language === 'es' ? 'Capturada' : 'Captured'}{' '}
            {formatDate(log.snapshot.capturedAt, settings.language)} ·{' '}
            {settings.language === 'es' ? 'registro actualizado' : 'log updated'}{' '}
            {formatDate(log.updatedAt, settings.language)}
          </Text>
        </View>
        {log.recipeId ? (
          <Pressable accessibilityRole="button" onPress={manageSnapshot} style={styles.manage}>
            <Text style={[styles.manageText, { color: theme.muted }]}>Manage</Text>
          </Pressable>
        ) : null}
      </GlassSurface>

      <Section title="Ingredients">
        {log.snapshot.ingredients.length ? (
          log.snapshot.ingredients.map((ingredient) => {
            const checked = log.checkedItems.includes(ingredient.id);
            const quantity = scaleQuantity(ingredient.quantity, scale);
            return (
              <Pressable
                disabled={!active}
                key={ingredient.id}
                onPress={() =>
                  persist({
                    checkedItems: checked
                      ? log.checkedItems.filter((value) => value !== ingredient.id)
                      : [...log.checkedItems, ingredient.id],
                  })
                }
                style={[styles.checkRow, { borderColor: theme.border }]}>
                <Ionicons
                  color={checked ? theme.accent : theme.muted}
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                />
                <Text style={[styles.checkAmount, { color: theme.accent }]}>
                  {[quantity, ingredient.unit].filter(Boolean).join(' ') || '—'}
                </Text>
                <Text
                  style={[
                    styles.checkName,
                    { color: checked ? theme.muted : theme.text },
                    checked && styles.checked,
                  ]}>
                  {ingredient.name}
                  {ingredient.preparation ? `, ${ingredient.preparation}` : ''}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={[styles.muted, { color: theme.muted }]}>
            This standalone entry has no ingredient snapshot.
          </Text>
        )}
      </Section>

      {log.snapshot.body ? (
        <Section title="Preparation">
          <MarkdownBody value={log.snapshot.body} />
        </Section>
      ) : null}

      <Section title="What changed">
        {log.changes.map((change, index) => (
          <View key={change.id ?? index} style={[styles.changeRow, { borderColor: theme.border }]}>
            <View style={[styles.kindBadge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.kindText, { color: theme.accent }]}>
                {changeKinds.find((item) => item.key === change.kind)?.label}
              </Text>
            </View>
            <Text style={[styles.changeValue, { color: theme.text }]}>{change.resultingValue}</Text>
            {active ? (
              <Pressable
                onPress={() => persist({ changes: log.changes.filter((_, itemIndex) => itemIndex !== index) })}>
                <Ionicons color={theme.muted} name="close-circle" size={21} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {active ? (
          <>
            <View style={styles.chips}>
              {changeKinds.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.key}
                  onPress={() => setChangeKind(item.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: changeKind === item.key ? theme.accentSoft : theme.surface },
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: changeKind === item.key ? theme.accent : theme.muted },
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {changeKind !== 'add' && log.snapshot.ingredients.length ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Ingredient (optional)</Text>
                <View style={styles.chips}>
                  {log.snapshot.ingredients.map((ingredient) => (
                    <Pressable
                      accessibilityRole="button"
                      key={ingredient.id}
                      onPress={() =>
                        setSelectedIngredientId((current) =>
                          current === ingredient.id ? null : ingredient.id,
                        )
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedIngredientId === ingredient.id
                              ? theme.accentSoft
                              : theme.surface,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              selectedIngredientId === ingredient.id
                                ? theme.accent
                                : theme.muted,
                          },
                        ]}>
                        {ingredient.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Field
              label="Describe the change"
              onChangeText={setChangeText}
              editable={changeKind !== 'omit' || !selectedIngredientId}
              placeholder={
                changeKind === 'replace'
                  ? 'oat milk'
                  : changeKind === 'omit'
                    ? 'What did you leave out?'
                    : changeKind === 'quantity'
                      ? '1 ½'
                      : changeKind === 'preparation'
                        ? 'finely diced'
                    : 'What was different?'
              }
              value={changeText}
            />
            <SecondaryButton icon="add" label="Add change" onPress={addChange} />
          </>
        ) : null}
      </Section>

      <Section title="Notes & rating">
        <Field
          editable
          label="Final notes"
          multiline
          onChangeText={(notes) => setLog((current) => ({ ...current, notes }))}
          onEndEditing={() => persist({ notes: log.notes })}
          placeholder="How did it feel? What should you remember?"
          value={log.notes}
        />
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Your rating</Text>
        <View style={styles.rating}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              accessibilityLabel={
                settings.language === 'es'
                  ? `${value} ${value === 1 ? 'estrella' : 'estrellas'}`
                  : `${value} ${value === 1 ? 'star' : 'stars'}`
              }
              accessibilityRole="button"
              key={value}
              onPress={() => persist({ rating: log.rating === value ? null : value })}>
              <Ionicons
                color={value <= (log.rating ?? 0) ? '#E6AD37' : theme.muted}
                name={value <= (log.rating ?? 0) ? 'star' : 'star-outline'}
                size={31}
              />
            </Pressable>
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Would you make it again?</Text>
        <View style={styles.yesNo}>
          <Choice
            label="Yes"
            selected={log.wouldMakeAgain === true}
            onPress={() => persist({ wouldMakeAgain: log.wouldMakeAgain === true ? null : true })}
          />
          <Choice
            label="No"
            selected={log.wouldMakeAgain === false}
            onPress={() => persist({ wouldMakeAgain: log.wouldMakeAgain === false ? null : false })}
          />
        </View>
      </Section>

      <Section title="Cost">
        <View style={styles.chips}>
          {(['none', 'quick', 'itemized'] as const).map((mode) => (
            <Pressable
              accessibilityRole="button"
              key={mode}
              onPress={() => persist({ costMode: mode, currency })}
              style={[
                styles.chip,
                { backgroundColor: log.costMode === mode ? theme.accentSoft : theme.surface },
              ]}>
              <Text style={[styles.chipText, { color: log.costMode === mode ? theme.accent : theme.muted }]}>
                {mode === 'none' ? 'Skip' : mode === 'quick' ? 'Quick total' : 'Per item'}
              </Text>
            </Pressable>
          ))}
        </View>
        {log.costMode === 'quick' ? (
          <Field
            keyboardType="decimal-pad"
            label={`${settings.language === 'es' ? 'Total gastado' : 'Total spent'} (${currency})`}
            onChangeText={(value) =>
              setLog((current) => ({ ...current, costTotal: value ? Number(value) : null, currency }))
            }
            onEndEditing={() => persist({ costMode: 'quick', costTotal: log.costTotal, currency })}
            placeholder="0.00"
            value={log.costTotal?.toString() ?? ''}
          />
        ) : null}
        {log.costMode === 'itemized' ? (
          <>
            {log.costItems.map((item, index) => (
              <View key={item.id ?? index} style={styles.costRow}>
                <Text style={[styles.changeValue, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.costValue, { color: theme.text }]}>{money(item.amount, currency)}</Text>
                <Pressable
                  onPress={() => persist({ costItems: log.costItems.filter((_, itemIndex) => itemIndex !== index) })}>
                  <Ionicons color={theme.muted} name="close-circle" size={21} />
                </Pressable>
              </View>
            ))}
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field label="Item" onChangeText={setCostLabel} placeholder="Vegetables" value={costLabel} />
              </View>
              <View style={styles.amountField}>
                <Field
                  keyboardType="decimal-pad"
                  label={currency}
                  onChangeText={setCostAmount}
                  placeholder="0.00"
                  value={costAmount}
                />
              </View>
            </View>
            <SecondaryButton icon="add" label="Add cost item" onPress={addCostItem} />
          </>
        ) : null}
        {total != null ? (
          <GlassSurface effect="clear" style={styles.total}>
            <View>
              <Text style={[styles.totalLabel, { color: theme.muted }]}>Total</Text>
              {log.servings ? (
                <Text style={[styles.perServing, { color: theme.muted }]}>
                  {money(total / log.servings, currency)}{' '}
                  {settings.language === 'es' ? 'por porción' : `per ${log.snapshot.servingUnit.replace(/s$/, '')}`}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.totalValue, { color: theme.text }]}>{money(total, currency)}</Text>
          </GlassSurface>
        ) : null}
      </Section>

      <Section title="Photos">
        {log.photos.length ? (
          <View style={styles.photos}>
            {log.photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <Pressable
                  onPress={async () => {
                    await removeJournalImage(photo.uri);
                    await persist({ photos: log.photos.filter((_, itemIndex) => itemIndex !== index) });
                  }}
                  style={styles.photoRemove}>
                  <Ionicons color="white" name="close" size={17} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <SecondaryButton icon="images-outline" label="Add cooking photos" onPress={addPhoto} />
      </Section>

      <View style={styles.actions}>
        {active ? (
          <PrimaryButton
            disabled={saving}
            icon="checkmark"
            label={saving ? 'Finishing…' : 'Finish cooking session'}
            onPress={finish}
          />
        ) : (
          <>
            <PrimaryButton icon="refresh-outline" label="Cook this again" onPress={cookAgain} />
            {log.recipeId ? (
              <SecondaryButton icon="git-branch-outline" label="Save these changes as a variation" onPress={saveVariation} />
            ) : (
              <>
                <SecondaryButton
                  icon="link-outline"
                  label="Attach to an existing recipe"
                  onPress={() => router.push(`/session/attach?logId=${log.id}`)}
                />
                <SecondaryButton
                  icon="restaurant-outline"
                  label="Create a recipe from this entry"
                  onPress={() => router.push('/recipe/new')}
                />
              </>
            )}
          </>
        )}
        <SecondaryButton destructive icon="trash-outline" label="Move to Recently Deleted" onPress={remove} />
      </View>
    </Page>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? theme.accentSoft : theme.surface,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}>
      <Text style={[styles.choiceText, { color: selected ? theme.accent : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function scaleQuantity(value: string | null, scale: number) {
  if (!value || scale === 1) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * scale * 100) / 100}` : value;
}

function formatDate(value: number, language?: 'en' | 'es') {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { currency, style: 'currency' }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const styles = StyleSheet.create({
  live: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { borderRadius: 4, height: 7, width: 7 },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  completedBanner: { alignItems: 'center', borderRadius: 17, flexDirection: 'row', gap: 9, padding: 13 },
  completedText: { fontSize: 14, fontWeight: '600' },
  servingRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  scaleBadge: { borderRadius: 14, marginBottom: 2, paddingHorizontal: 11, paddingVertical: 14 },
  scaleText: { fontSize: 14, fontWeight: '700' },
  snapshotCard: { alignItems: 'center', borderRadius: 17, flexDirection: 'row', gap: 10, padding: 13 },
  snapshotTitle: { fontSize: 14, fontWeight: '700' },
  snapshotMeta: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  manage: { padding: 8 },
  manageText: { fontSize: 12, fontWeight: '700' },
  checkRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 56, paddingVertical: 8 },
  checkAmount: { fontSize: 14, fontWeight: '700', minWidth: 62 },
  checkName: { flex: 1, fontSize: 15, lineHeight: 20 },
  checked: { textDecorationLine: 'line-through' },
  muted: { fontSize: 14, lineHeight: 20 },
  changeRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 9, paddingVertical: 9 },
  kindBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  kindText: { fontSize: 10, fontWeight: '700' },
  changeValue: { flex: 1, fontSize: 14, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  rating: { flexDirection: 'row', gap: 10 },
  yesNo: { flexDirection: 'row', gap: 10 },
  choice: { alignItems: 'center', borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, flex: 1, padding: 13 },
  choiceText: { fontSize: 14, fontWeight: '700' },
  costRow: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 38 },
  costValue: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  amountField: { width: 112 },
  total: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', padding: 15 },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  perServing: { fontSize: 11, marginTop: 3 },
  totalValue: { fontSize: 22, fontWeight: '700' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { height: 100, width: '31%' },
  photo: { borderRadius: 15, height: '100%', width: '100%' },
  photoRemove: { alignItems: 'center', backgroundColor: '#00000088', borderRadius: 13, height: 25, justifyContent: 'center', position: 'absolute', right: 5, top: 5, width: 25 },
  actions: { gap: 10, marginTop: 5 },
});
