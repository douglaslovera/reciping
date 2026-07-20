import { useLocalSearchParams } from 'expo-router';

import { RecipeEditor } from '@/components/recipe-editor';

export default function NewRecipeScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <RecipeEditor pasteMode={mode === 'paste'} />;
}
