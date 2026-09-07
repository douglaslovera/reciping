import { Ionicons } from '@expo/vector-icons';
import { forwardRef, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  contentStyle,
  scroll = true,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
}>) {
  const theme = useAppTheme();
  const content = (
    <View style={[styles.pageContent, !scroll && styles.pageContentFixed, contentStyle]}>
      {children}
    </View>
  );
  return (
    <View style={[styles.page, { backgroundColor: theme.chrome }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <View style={[styles.nav, { backgroundColor: theme.chrome }]}>
          <View style={styles.navSide}>{left}</View>
          <View style={styles.navTitleWrap}>
            <Text numberOfLines={2} style={[styles.navTitle, { color: '#F7F5F6' }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.navSubtitle, { color: theme.chromeMuted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.navSide, styles.navRight]}>{right}</View>
        </View>
        {scroll ? (
          <ScrollView
            style={[styles.contentSurface, { backgroundColor: theme.background }]}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.contentSurface, { backgroundColor: theme.background }]}>{content}</View>
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
  return (
    <GlassSurface effect="clear" interactive style={styles.iconGlass}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onPress}
        style={styles.iconButton}>
        <Ionicons color={color ?? '#F7F5F6'} name={icon} size={22} />
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

export const Field = forwardRef<TextInput, TextInputProps & { label: string; hint?: string }>(
  function Field({ label, hint, multiline, ...props }, ref) {
    const theme = useAppTheme();
    const { settings } = useDatabaseContext();
    const scale =
      settings.readingScale === 'extra-large'
        ? 1.24
        : settings.readingScale === 'large'
          ? 1.12
          : 1;
    return (
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
        <TextInput
          {...props}
          multiline={multiline}
          ref={ref}
          placeholder={
            typeof props.placeholder === 'string'
              ? translate(settings.language, props.placeholder)
              : props.placeholder
          }
          placeholderTextColor={theme.muted}
          style={[
            styles.input,
            multiline && styles.multiline,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
              fontSize: 16 * scale,
            },
            props.style,
          ]}
        />
        {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
      </View>
    );
  },
);

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
    minHeight: 66,
    paddingHorizontal: 16,
  },
  navSide: { alignItems: 'flex-start', minWidth: 48 },
  navRight: { alignItems: 'flex-end' },
  navTitleWrap: { alignItems: 'center', flex: 1 },
  navTitle: { fontSize: 20, fontWeight: '800', lineHeight: 22, maxWidth: 240 },
  navSubtitle: { fontSize: 9, marginTop: 2 },
  contentSurface: { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  pageContent: { flexGrow: 1, flexShrink: 0, gap: 14 },
  pageContentFixed: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 14, paddingBottom: 72 },
  iconGlass: { backgroundColor: '#2A2B30', borderRadius: 9, height: 34, width: 34 },
  iconButton: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  primary: {
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '700' },
  secondaryGlass: { borderRadius: 9, minHeight: 46 },
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
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 17 },
  section: { gap: 7 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  empty: {
    alignItems: 'center',
    borderRadius: 12,
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
