import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { initializeDatabase } from '@/db/database';
import { getSettings } from '@/db/repository';
import type { AppSettings } from '@/db/types';
import { useAppTheme } from '@/theme';

const defaults: AppSettings = {
  currency: 'USD',
  language: 'en',
  libraryView: 'grid',
  readingScale: 'standard',
};

type DatabaseContextValue = {
  error: Error | null;
  ready: boolean;
  refresh: () => void;
  revision: number;
  settings: AppSettings;
};

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const [ready, setReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState(defaults);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    initializeDatabase()
      .then(async () => {
        const nextSettings = await getSettings();
        if (!mounted) return;
        setSettings(nextSettings);
        setReady(true);
      })
      .catch((reason: unknown) => {
        if (!mounted) return;
        setError(reason instanceof Error ? reason : new Error('Could not open the journal.'));
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    getSettings().then(setSettings).catch(() => undefined);
  }, [ready, revision]);

  const value = useMemo(
    () => ({ error, ready, refresh, revision, settings }),
    [error, ready, refresh, revision, settings],
  );

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Your journal could not open</Text>
        <Text style={[styles.message, { color: theme.muted }]}>{error.message}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={[styles.message, { color: theme.muted }]}>Opening your recipe book…</Text>
      </View>
    );
  }

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabaseContext() {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error('useDatabaseContext must be used inside DatabaseProvider.');
  return value;
}

export function useDataQuery<T>(loader: () => Promise<T>, fallback: T, keys: unknown[] = []) {
  const { ready, revision } = useDatabaseContext();
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(Platform.OS !== 'web');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ready || Platform.OS === 'web') {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    loader()
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!mounted) return;
        setError(reason instanceof Error ? reason : new Error('Could not load this content.'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
    // Callers pass stable primitive keys; loader is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, revision, ...keys]);

  return { data, error, loading, setData };
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
