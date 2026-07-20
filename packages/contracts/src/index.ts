import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const healthResponseSchema = z.object({
  name: z.literal('reciping-api'),
  status: z.literal('ok'),
  providers: z.object({
    auth: z.boolean(),
    ai: z.boolean(),
    storage: z.boolean(),
  }),
});

export const importRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('url'),
    url: z.url(),
  }),
  z.object({
    kind: z.literal('text'),
    text: z.string().min(1).max(150_000),
    sourceUrl: z.url().optional(),
  }),
]);

export const extractedRecipeSourceSchema = z.object({
  title: z.string().nullable(),
  sourceUrl: z.url().nullable(),
  sourceName: z.string().nullable(),
  content: z.string(),
  extractionMethod: z.enum(['json-ld', 'readable-html', 'plain-text']),
});

export const ingredientDraftSchema = z.object({
  groupName: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  name: z.string(),
  preparation: z.string().nullable().optional(),
  originalLine: z.string().nullable().optional(),
});

export const recipeDraftSchema = z.object({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  servings: z.number().positive().nullable(),
  servingUnit: z.string(),
  prepMinutes: z.number().int().nonnegative().nullable(),
  cookMinutes: z.number().int().nonnegative().nullable(),
  sourceName: z.string().nullable(),
  sourceUrl: z.url().nullable(),
  ingredients: z.array(ingredientDraftSchema),
  originalText: z.string(),
  uncertainty: z.array(z.string()),
});

export const backupManifestSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  snapshotAt: z.number().int().nonnegative(),
  schemaVersion: z.number().int().positive(),
  checksum: z.string().min(16),
  objectKey: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  counts: z.object({
    recipes: z.number().int().nonnegative(),
    cookingLogs: z.number().int().nonnegative(),
    savedItems: z.number().int().nonnegative(),
    media: z.number().int().nonnegative(),
  }),
});

export const backupManifestResponseSchema = backupManifestSchema.extend({
  createdAt: z.number().int().nonnegative(),
  status: z.enum(['pending', 'available', 'failed']),
});

export const presignRequestSchema = z.object({
  operation: z.enum(['upload', 'download']),
  objectKey: z.string().min(1),
  contentType: z.string().min(1).optional(),
  byteSize: z.number().int().positive().optional(),
});

export const presignResponseSchema = z.object({
  url: z.url(),
  expiresAt: z.number().int().positive(),
  headers: z.record(z.string(), z.string()),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type RecipeDraft = z.infer<typeof recipeDraftSchema>;
