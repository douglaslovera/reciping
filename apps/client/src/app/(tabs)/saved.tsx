import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { GlassSearch } from '@/components/glass-search';
import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { EmptyState, PrimaryButton } from '@/components/ui';
import { ScreenShell } from '@/components/screen-shell';
import { useDataQuery } from '@/db/provider';
import { listSavedItems } from '@/db/repository';
import type { SavedItem } from '@/db/types';
import { useAppTheme } from '@/theme';

type Filter = 'all' | SavedItem['kind'];

export default function SavedScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { data: items, loading } = useDataQuery(() => listSavedItems(), [] as SavedItem[]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return items.filter(
      (item) =>
        (filter === 'all' || item.kind === filter) &&
        (!needle ||
          item.title.toLocaleLowerCase().includes(needle) ||
          item.body.toLocaleLowerCase().includes(needle)),
    );
  }, [filter, items, search]);

  return (
    <ScreenShell
      eyebrow="TECHNIQUES & IDEAS"
      onMenuPress={() => router.push('/settings')}
      title="Saved">
      <GlassSearch onChangeText={setSearch} placeholder="Search saved items" value={search} />
      <View style={styles.chips}>
        {([
          ['all', 'All'],
          ['video', 'Videos'],
          ['article', 'Articles'],
          ['tip', 'Tips'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.chip,
              { backgroundColor: filter === key ? theme.accentSoft : 'transparent' },
            ]}>
            <Text style={[styles.chipText, { color: filter === key ? theme.accent : theme.muted }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {items.length ? (
        <View style={styles.listArea}>
          <Pressable onPress={() => router.push('/saved/new')} style={styles.add}>
            <Ionicons color={theme.accent} name="add" size={18} />
            <Text style={[styles.addText, { color: theme.accent }]}>Save something</Text>
          </Pressable>
          <FlatList
            contentContainerStyle={styles.list}
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/saved/${item.id}`)}>
                <GlassSurface effect="regular" style={styles.card}>
                  <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
                    <Ionicons
                      color={theme.accent}
                      name={item.kind === 'video' ? 'play-outline' : item.kind === 'article' ? 'reader-outline' : 'bulb-outline'}
                      size={22}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.meta, { color: theme.muted }]}>
                      {item.platform || item.kind}
                      {item.recipeIds.length ? ` · ${item.recipeIds.length} linked recipe${item.recipeIds.length === 1 ? '' : 's'}` : ''}
                    </Text>
                  </View>
                  <Ionicons color={theme.muted} name="chevron-forward" size={18} />
                </GlassSurface>
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.emptyArea}>
          <EmptyState
            action={
              <PrimaryButton icon="add" label="Save something" onPress={() => router.push('/saved/new')} />
            }
            icon={loading ? 'hourglass-outline' : 'bulb-outline'}
            message="Keep video links, articles, and personal cooking tips without turning them into recipes."
            title={loading ? 'Opening saved items…' : 'A place for useful discoveries'}
          />
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 3, marginTop: 10 },
  chip: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  listArea: { flex: 1 },
  add: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 3, paddingVertical: 12 },
  addText: { fontSize: 13, fontWeight: '700' },
  list: { gap: 10, paddingBottom: 120 },
  card: { alignItems: 'center', borderRadius: 22, flexDirection: 'row', gap: 12, minHeight: 78, padding: 13 },
  icon: { alignItems: 'center', borderRadius: 16, height: 46, justifyContent: 'center', width: 46 },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  meta: { fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  emptyArea: { flex: 1, justifyContent: 'center', paddingBottom: 35 },
});
