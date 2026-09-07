import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/localized-text';
import { useAppTheme } from '@/theme';

export function FirstRecipeOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAppTheme();
  const darkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.accent }]}>
      {pathname === '/' && <StatusBar style={darkMode ? 'dark' : 'light'} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introduction}>
          <View style={[styles.icon, { backgroundColor: theme.background }]}>
            <Ionicons color={theme.accent} name="book-outline" size={34} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.background }]}>
            Start with a recipe you love
          </Text>
          <Text style={[styles.copy, { color: theme.background }]}>
            Keep the ingredients and steps here. Make it yours each time you cook.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/recipe/new')}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.background, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.buttonText, { color: theme.accent }]}>Add your first recipe</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  introduction: { alignItems: 'center', alignSelf: 'center', maxWidth: 340, width: '100%' },
  icon: { alignItems: 'center', justifyContent: 'center', height: 72, width: 72, borderRadius: 24, marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.9, lineHeight: 39, maxWidth: 290, textAlign: 'center' },
  copy: { fontSize: 16, lineHeight: 25, textAlign: 'center', marginTop: 18, maxWidth: 300 },
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, width: '100%', maxWidth: 520, alignSelf: 'center' },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 58, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16 },
  buttonText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
