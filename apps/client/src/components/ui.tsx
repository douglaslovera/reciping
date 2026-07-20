import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/localized-text';
import { useDatabaseContext } from '@/db/provider';
import { translate } from '@/i18n';
import { useAppTheme } from '@/theme';

export function Page({
  children,
  title,
  subtitle,
  left,
  right,
  scroll = true,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  scroll?: boolean;
}>) {
  const theme = useAppTheme();
  const content = <View style={styles.pageContent}>{children}</View>;
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <View style={styles.nav}>
          <View style={styles.navSide}>{left}</View>
          <View style={styles.navTitleWrap}>
            <Text numberOfLines={1} style={[styles.navTitle, { color: theme.text }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.navSubtitle, { color: theme.muted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.navSide, styles.navRight]}>{right}</View>
        </View>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const theme = useAppTheme();
  return (
    <GlassSurface effect="clear" interactive style={styles.iconGlass}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onPress}
        style={styles.iconButton}>
        <Ionicons color={color ?? theme.text} name={icon} size={22} />
      </Pressable>
    </GlassSurface>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const theme = useAppTheme();
  const color = destructive ? '#C13E4A' : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: color, opacity: disabled ? 0.42 : pressed ? 0.8 : 1 },
      ]}>
      {icon ? <Ionicons color="white" name={icon} size={19} /> : null}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useAppTheme();
  const color = destructive ? '#C13E4A' : theme.text;
  return (
    <GlassSurface effect="clear" interactive style={styles.secondaryGlass}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondary}>
        {icon ? <Ionicons color={color} name={icon} size={18} /> : null}
        <Text style={[styles.secondaryText, { color }]}>{label}</Text>
      </Pressable>
    </GlassSurface>
  );
}

export function Field({
  label,
  hint,
  multiline,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const theme = useAppTheme();
  const { settings } = useDatabaseContext();
  const scale = settings.readingScale === 'extra-large' ? 1.24 : settings.readingScale === 'large' ? 1.12 : 1;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholder={
          typeof props.placeholder === 'string'
            ? translate(settings.language, props.placeholder)
            : props.placeholder
        }
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontSize: 16 * scale },
          props.style,
        ]}
      />
      {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Section({
  title,
  action,
  children,
  style,
}: PropsWithChildren<{ title: string; action?: ReactNode; style?: ViewStyle }>) {
  const theme = useAppTheme();
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <GlassSurface effect="regular" style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
        <Ionicons color={theme.accent} name={icon} size={27} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: theme.muted }]}>{message}</Text>
      {action}
    </GlassSurface>
  );
}

export function LoadingState() {
  const theme = useAppTheme();
  return <ActivityIndicator color={theme.accent} style={styles.loading} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  safe: { flex: 1 },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 60,
    paddingHorizontal: 16,
  },
  navSide: { alignItems: 'flex-start', minWidth: 48 },
  navRight: { alignItems: 'flex-end' },
  navTitleWrap: { alignItems: 'center', flex: 1 },
  navTitle: { fontSize: 17, fontWeight: '700', maxWidth: 240 },
  navSubtitle: { fontSize: 11, marginTop: 2 },
  pageContent: { flex: 1, gap: 20 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  iconGlass: { borderRadius: 20, height: 40, width: 40 },
  iconButton: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  primary: {
    alignItems: 'center',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
  },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryGlass: { borderRadius: 17, minHeight: 46 },
  secondary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryText: { fontSize: 15, fontWeight: '600' },
  field: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: {
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 17 },
  section: { gap: 12 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  empty: {
    alignItems: 'center',
    borderRadius: 28,
    gap: 9,
    paddingHorizontal: 27,
    paddingVertical: 31,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 56,
    justifyContent: 'center',
    marginBottom: 5,
    width: 56,
  },
  emptyTitle: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { fontSize: 14, lineHeight: 20, marginBottom: 8, textAlign: 'center' },
  loading: { marginVertical: 45 },
});

export const uiStyles = styles;
