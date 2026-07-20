import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { EmptyState, PrimaryButton } from '@/components/ui';
import { ScreenShell } from '@/components/screen-shell';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { listCookingLogs } from '@/db/repository';
import type { CookingLog } from '@/db/types';
import { useAppTheme } from '@/theme';

type Filter = 'all' | 'active' | 'make-again';

export default function JournalScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { data: logs, loading } = useDataQuery(() => listCookingLogs(), [] as CookingLog[]);
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(
    () =>
      logs.filter((log) => {
        if (filter === 'active') return log.state === 'active';
        if (filter === 'make-again') return log.wouldMakeAgain === true;
        return true;
      }),
    [filter, logs],
  );

  return (
    <ScreenShell
      eyebrow="COOKING HISTORY"
      onMenuPress={() => router.push('/settings')}
      title="Journal">
      <View style={styles.filters}>
        {([
          ['all', 'All'],
          ['active', 'Active'],
          ['make-again', 'Make again'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.filter,
              { backgroundColor: filter === key ? theme.accentSoft : 'transparent' },
            ]}>
            <Text style={[styles.filterText, { color: filter === key ? theme.accent : theme.muted }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {logs.length ? (
        <View style={styles.listArea}>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push('/session/new')}>
              <Text style={[styles.actionLink, { color: theme.accent }]}>Start cooking</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/session/new?past=1')}>
              <Text style={[styles.actionLink, { color: theme.accent }]}>Add past cooking</Text>
            </Pressable>
          </View>
          <FlatList
            contentContainerStyle={styles.list}
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LogCard log={item} onPress={() => router.push(`/session/${item.id}`)} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.emptyArea}>
          <EmptyState
            action={
              <View style={styles.emptyActions}>
                <PrimaryButton
                  icon="flame-outline"
                  label="Start cooking"
                  onPress={() => router.push('/session/new')}
                />
                <Pressable onPress={() => router.push('/session/new?past=1')}>
                  <Text style={[styles.pastLink, { color: theme.accent }]}>Add past cooking</Text>
                </Pressable>
              </View>
            }
            icon={loading ? 'hourglass-outline' : 'sparkles-outline'}
            message="Each session keeps its recipe snapshot, changes, notes, rating, photos, and costs together."
            title={loading ? 'Opening your journal…' : 'Your cooking story begins here'}
          />
        </View>
      )}
    </ScreenShell>
  );
}

function LogCard({ log, onPress }: { log: CookingLog; onPress: () => void }) {
  const theme = useAppTheme();
  const { settings } = useDatabaseContext();
  const servingsLabel = settings.language === 'es' ? 'porciones' : 'servings';
  const changesLabel =
    settings.language === 'es'
      ? log.changes.length === 1
        ? 'cambio'
        : 'cambios'
      : log.changes.length === 1
        ? 'change'
        : 'changes';
  return (
    <Pressable onPress={onPress}>
      <GlassSurface effect="regular" style={styles.card}>
        <View style={[styles.cardIcon, { backgroundColor: theme.accentSoft }]}>
          <Ionicons
            color={theme.accent}
            name={log.state === 'active' ? 'flame' : 'checkmark-circle-outline'}
            size={23}
          />
        </View>
        <View style={styles.flex}>
          <View style={styles.cardTitleRow}>
            <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.text }]}>{log.title}</Text>
            {log.state === 'active' ? (
              <Text style={[styles.active, { color: theme.accent }]}>ACTIVE</Text>
            ) : null}
          </View>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {formatDate(log.cookedAt)}
            {log.servings ? ` · ${log.servings} ${servingsLabel}` : ''}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>
            {log.rating ? `${'★'.repeat(log.rating)} · ` : ''}
            {log.changes.length} {changesLabel}
            {log.costTotal != null ? ` · ${money(log.costTotal, log.currency)}` : ''}
          </Text>
        </View>
        <Ionicons color={theme.muted} name="chevron-forward" size={18} />
      </GlassSurface>
    </Pressable>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value);
}

function money(amount: number, currency: string | null) {
  try {
    return new Intl.NumberFormat(undefined, { currency: currency || 'USD', style: 'currency' }).format(amount);
  } catch {
    return `${currency || ''} ${amount.toFixed(2)}`.trim();
  }
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  filter: { borderRadius: 15, paddingHorizontal: 13, paddingVertical: 9 },
  filterText: { fontSize: 13, fontWeight: '700' },
  listArea: { flex: 1 },
  actions: { flexDirection: 'row', gap: 18, justifyContent: 'flex-end', paddingVertical: 10 },
  actionLink: { fontSize: 13, fontWeight: '700' },
  list: { gap: 10, paddingBottom: 120 },
  card: { alignItems: 'center', borderRadius: 22, flexDirection: 'row', gap: 12, minHeight: 84, padding: 13 },
  cardIcon: { alignItems: 'center', borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  flex: { flex: 1 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  active: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  meta: { fontSize: 12, lineHeight: 17 },
  emptyArea: { flex: 1, justifyContent: 'center', paddingBottom: 35 },
  emptyActions: { gap: 13, marginTop: 7, width: 210 },
  pastLink: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
