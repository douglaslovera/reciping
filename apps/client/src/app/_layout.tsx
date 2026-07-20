import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { DatabaseProvider } from '@/db/provider';
import { WelcomeGate } from '@/components/welcome-gate';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recipe/[id]/index" />
          <Stack.Screen name="recipe/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="session/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="session/attach" options={{ presentation: 'modal' }} />
          <Stack.Screen name="session/[id]" />
          <Stack.Screen name="saved/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="saved/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="deleted" />
        </Stack>
        <WelcomeGate />
        <StatusBar style="auto" />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
