import * as FileSystem from 'expo-file-system/legacy';

const mediaDirectory = `${FileSystem.documentDirectory}journal-media/`;

export async function persistJournalImage(sourceUri: string, id: string) {
  if (sourceUri.startsWith(mediaDirectory)) return sourceUri;
  await FileSystem.makeDirectoryAsync(mediaDirectory, { intermediates: true });
  const sourcePath = sourceUri.split('?')[0];
  const rawExtension = sourcePath.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  const extension = rawExtension && ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExtension)
    ? rawExtension
    : 'jpg';
  const destination = `${mediaDirectory}${id}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function removeJournalImage(uri: string) {
  if (!uri.startsWith(mediaDirectory)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function removeAllJournalImages() {
  if (!__DEV__) throw new Error('Photo reset is only available in development.');
  await FileSystem.deleteAsync(mediaDirectory, { idempotent: true });
}
