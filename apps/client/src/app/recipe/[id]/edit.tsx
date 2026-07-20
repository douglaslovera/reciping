import { useLocalSearchParams } from 'expo-router';

import { RecipeEditor } from '@/components/recipe-editor';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeEditor id={id} />;
}
