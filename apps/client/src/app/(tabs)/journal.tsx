import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { EmptyState, LoadingState, PrimaryButton } from '@/components/ui';
import { ScreenShell } from '@/components/screen-shell';
import { useDatabaseContext, useDataQuery } from '@/db/provider';
import { listCookingLogs } from '@/db/repository';
import type { CookingLog } from '@/db/types';
import { useAppTheme } from '@/theme';

type Filter = 'all' | 'active' | 'make-again';

export default function JournalScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { data: logs, loading, error } = useDataQuery(() => listCookingLogs(), [] as CookingLog[]);
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
      onMenuPress={() => router.push('/settings')}
      title="Journal">
      {logs.length > 0 && <View style={styles.filters}>
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
      </View>}

      {loading ? <LoadingState /> : error ? (
        <EmptyState icon="alert-circle-outline" title="Could not load content" message="Try opening this tab again." />
      ) : logs.length ? (
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
            ListEmptyComponent={<EmptyState icon="search-outline" title="No matching items"
              message="Try another search or clear your filters."
              action={<PrimaryButton label="Clear filters" onPress={() => { setFilter('all'); }} />} />}
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
            icon="sparkles-outline"
            message="Keep notes on what worked and what you would change."
            title="Remember what you cooked"
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
            {log.costTotal != null
              ? ` · ${money(log.costTotal, log.currency, settings.language)}`
              : ''}
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

function money(amount: number, currency: string | null, language: 'en' | 'es') {
  try {
    return new Intl.NumberFormat(language, { currency: currency || 'USD', style: 'currency' }).format(
      amount,
    );
  } catch {
    return `${currency || ''} ${amount.toFixed(2)}`.trim();
  }
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  filter: { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6 },
  filterText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  listArea: { flex: 1 },
  actions: { flexDirection: 'row', gap: 18, justifyContent: 'flex-end', paddingVertical: 10 },
  actionLink: { fontSize: 13, fontWeight: '700' },
  list: { gap: 7, paddingBottom: 120 },
  card: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 10, minHeight: 72, padding: 9 },
  cardIcon: { alignItems: 'center', borderRadius: 8, height: 46, justifyContent: 'center', width: 46 },
  flex: { flex: 1 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  active: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  meta: { fontSize: 10, lineHeight: 15 },
  emptyArea: { flex: 1, justifyContent: 'center', paddingBottom: 35 },
  emptyActions: { gap: 13, marginTop: 7, width: 210 },
  pastLink: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
