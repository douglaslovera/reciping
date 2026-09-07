import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassStyle,
} from 'expo-glass-effect';
import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/theme';

type GlassSurfaceProps = PropsWithChildren<
  ViewProps & {
    effect?: GlassStyle;
    interactive?: boolean;
    tintColor?: string;
  }
>;

export function GlassSurface({
  children,
  effect = 'regular',
  interactive = false,
  style,
  tintColor,
  ...viewProps
}: GlassSurfaceProps) {
  const theme = useAppTheme();
  const nativeGlassAvailable =
    Platform.OS === 'ios' &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable() &&
    Boolean(tintColor);

  if (nativeGlassAvailable) {
    return (
      <GlassView
        {...viewProps}
        glassEffectStyle={effect}
        isInteractive={interactive}
        style={[styles.surface, style]}
        tintColor={tintColor}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      {...viewProps}
      style={[
        styles.surface,
        {
          backgroundColor: theme.glassFallback,
          borderColor: theme.glassBorder,
          borderWidth: StyleSheet.hairlineWidth,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
});
