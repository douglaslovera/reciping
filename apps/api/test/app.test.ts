import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { assertSafePublicUrl } from '../src/security.js';

const user = async () => ({ id: 'user_1', email: 'cook@example.com' });

describe('Reciping API', () => {
  it('reports provider state without credentials', async () => {
    const response = await createApp().request('/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      providers: { auth: false, ai: false, storage: false },
    });
  });

  it('rejects private routes without a session', async () => {
    const response = await createApp().request('/v1/import/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'url', url: 'https://example.com/recipe' }),
    });
    expect(response.status).toBe(401);
  });

  it('validates route payloads', async () => {
    const response = await createApp({ authenticate: user }).request('/v1/backups/manifests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: '' }),
    });
    expect(response.status).toBe(400);
  });

  it('fails gracefully when deferred providers are not configured', async () => {
    const response = await createApp({ authenticate: user }).request('/v1/import/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'text', text: 'A short recipe' }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'PROVIDER_NOT_CONFIGURED' },
    });
  });
});

describe('URL ingestion safety', () => {
  it.each([
    'http://localhost/recipe',
    'http://127.0.0.1/recipe',
    'http://10.0.0.2/recipe',
    'http://192.168.1.4/recipe',
    'http://169.254.169.254/latest/meta-data',
    'ftp://example.com/recipe',
  ])('blocks %s', (url) => {
    expect(() => assertSafePublicUrl(url)).toThrow();
  });

  it('allows a public HTTPS URL', () => {
    expect(assertSafePublicUrl('https://example.com/recipe').hostname).toBe('example.com');
  });
});
