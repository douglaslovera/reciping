import type { BackupManifest, ImportRequest } from '@reciping/contracts';

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type Authenticate = (headers: Headers) => Promise<AuthenticatedUser | null>;

export interface RecipeExtractor {
  extract(input: ImportRequest): Promise<{
    title: string | null;
    sourceUrl: string | null;
    sourceName: string | null;
    content: string;
    extractionMethod: 'json-ld' | 'readable-html' | 'plain-text';
  }>;
}

export interface BackupStore {
  saveManifest(userId: string, manifest: BackupManifest): Promise<BackupManifest & {
    createdAt: number;
    status: 'pending' | 'available' | 'failed';
  }>;
}

export interface ObjectStorage {
  presign(input: {
    userId: string;
    operation: 'upload' | 'download';
    objectKey: string;
    contentType?: string;
    byteSize?: number;
  }): Promise<{ url: string; expiresAt: number; headers: Record<string, string> }>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured. Provider integration is deferred to milestone 5.`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export const unavailableExtractor: RecipeExtractor = {
  async extract() {
    throw new ProviderNotConfiguredError('Recipe extraction');
  },
};

export const unavailableBackupStore: BackupStore = {
  async saveManifest() {
    throw new ProviderNotConfiguredError('Cloud backup');
  },
};

export const unavailableObjectStorage: ObjectStorage = {
  async presign() {
    throw new ProviderNotConfiguredError('Object storage');
  },
};
