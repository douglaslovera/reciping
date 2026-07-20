import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/localized-text';
import { useDatabaseContext } from '@/db/provider';
import { useAppTheme } from '@/theme';

export function MarkdownBody({ value }: { value: string }) {
  const theme = useAppTheme();
  const { settings } = useDatabaseContext();
  const scale =
    settings.readingScale === 'extra-large' ? 1.28 : settings.readingScale === 'large' ? 1.14 : 1;
  const lines = value.split('\n');
  return (
    <View style={styles.body}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={index} style={styles.space} />;
        if (trimmed.startsWith('### ')) {
          return (
            <Text key={index} style={[styles.h3, { color: theme.text, fontSize: 18 * scale }]}>
              {trimmed.slice(4)}
            </Text>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={index} style={[styles.h2, { color: theme.text, fontSize: 22 * scale }]}>
              {trimmed.slice(3)}
            </Text>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={index} style={[styles.h1, { color: theme.text, fontSize: 25 * scale }]}>
              {trimmed.slice(2)}
            </Text>
          );
        }
        const list = /^([-*]|\d+\.)\s/.test(trimmed);
        return (
          <Text
            key={index}
            style={[
              styles.line,
              list && styles.list,
              { color: theme.text, fontSize: 16 * scale, lineHeight: 24 * scale },
            ]}>
            {trimmed
              .replace(/^[-*]\s/, '• ')
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/_(.*?)_/g, '$1')
              .replace(/\*(.*?)\*/g, '$1')}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 5 },
  h1: { fontWeight: '800', marginBottom: 4, marginTop: 10 },
  h2: { fontWeight: '700', marginBottom: 3, marginTop: 9 },
  h3: { fontWeight: '700', marginBottom: 2, marginTop: 7 },
  line: { fontWeight: '400' },
  list: { paddingLeft: 6 },
  space: { height: 7 },
});
