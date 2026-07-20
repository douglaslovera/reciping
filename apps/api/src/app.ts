import {
  apiErrorSchema,
  backupManifestResponseSchema,
  backupManifestSchema,
  extractedRecipeSourceSchema,
  healthResponseSchema,
  importRequestSchema,
  presignRequestSchema,
  presignResponseSchema,
} from '@reciping/contracts';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { assertSafePublicUrl } from './security.js';
import {
  type Authenticate,
  type AuthenticatedUser,
  type BackupStore,
  type ObjectStorage,
  ProviderNotConfiguredError,
  type RecipeExtractor,
  unavailableBackupStore,
  unavailableExtractor,
  unavailableObjectStorage,
} from './services.js';

type Dependencies = {
  authenticate?: Authenticate;
  extractor?: RecipeExtractor;
  backupStore?: BackupStore;
  storage?: ObjectStorage;
  appOrigin?: string;
  providers?: { auth: boolean; ai: boolean; storage: boolean };
};

export function createApp(dependencies: Dependencies = {}) {
  const authenticate = dependencies.authenticate ?? (async () => null);
  const extractor = dependencies.extractor ?? unavailableExtractor;
  const backupStore = dependencies.backupStore ?? unavailableBackupStore;
  const storage = dependencies.storage ?? unavailableObjectStorage;
  const app = new Hono<{ Variables: { user: AuthenticatedUser } }>();

  app.use('*', cors({ origin: dependencies.appOrigin ?? 'http://localhost:8081', credentials: true }));

  app.get('/health', (context) =>
    context.json(
      healthResponseSchema.parse({
        name: 'reciping-api',
        status: 'ok',
        providers: dependencies.providers ?? { auth: false, ai: false, storage: false },
      }),
    ),
  );

  app.use('/v1/*', async (context, next) => {
    const user = await authenticate(context.req.raw.headers);
    if (!user) {
      return context.json(
        apiErrorSchema.parse({
          error: { code: 'UNAUTHENTICATED', message: 'Sign in is required for this action.' },
        }),
        401,
      );
    }
    context.set('user', user);
    await next();
  });

  app.post('/v1/import/extract', async (context) => {
    const parsed = importRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationError(context, parsed.error.message);
    if (parsed.data.kind === 'url') {
      try {
        assertSafePublicUrl(parsed.data.url);
      } catch (error) {
        return validationError(context, error instanceof Error ? error.message : 'Unsafe URL.');
      }
    }
    try {
      return context.json(extractedRecipeSourceSchema.parse(await extractor.extract(parsed.data)));
    } catch (error) {
      return providerError(context, error);
    }
  });

  app.post('/v1/backups/manifests', async (context) => {
    const parsed = backupManifestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationError(context, parsed.error.message);
    try {
      const user = context.get('user') as { id: string };
      return context.json(backupManifestResponseSchema.parse(await backupStore.saveManifest(user.id, parsed.data)), 201);
    } catch (error) {
      return providerError(context, error);
    }
  });

  app.post('/v1/backups/presign', async (context) => {
    const parsed = presignRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationError(context, parsed.error.message);
    try {
      const user = context.get('user') as { id: string };
      return context.json(presignResponseSchema.parse(await storage.presign({ userId: user.id, ...parsed.data })));
    } catch (error) {
      return providerError(context, error);
    }
  });

  app.notFound((context) =>
    context.json(apiErrorSchema.parse({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }), 404),
  );

  return app;
}

function validationError(context: Parameters<Parameters<ReturnType<typeof createApp>['onError']>[0]>[1], message: string) {
  return context.json(apiErrorSchema.parse({ error: { code: 'VALIDATION_ERROR', message } }), 400);
}

function providerError(context: Parameters<Parameters<ReturnType<typeof createApp>['onError']>[0]>[1], error: unknown) {
  if (error instanceof ProviderNotConfiguredError) {
    return context.json(apiErrorSchema.parse({ error: { code: 'PROVIDER_NOT_CONFIGURED', message: error.message } }), 503);
  }
  throw error;
}
