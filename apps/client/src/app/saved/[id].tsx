import { useLocalSearchParams } from 'expo-router';

import { SavedEditor } from '@/components/saved-editor';

export default function SavedItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SavedEditor id={id} />;
}
