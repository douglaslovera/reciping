import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';

import {
  accounts,
  createServerDatabase,
  sessions,
  users,
  verifications,
} from '@reciping/server-db';

import type { ApiConfig } from './config.js';
import type { Authenticate } from './services.js';

export function createAuth(config: ApiConfig) {
  if (!config.databaseUrl || !config.authSecret) return null;
  const database = createServerDatabase(config.databaseUrl);
  const socialProviders = {
    ...(config.googleClientId && config.googleClientSecret
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
          },
        }
      : {}),
    ...(config.appleClientId && config.appleClientSecret
      ? {
          apple: {
            clientId: config.appleClientId,
            clientSecret: config.appleClientSecret,
          },
        }
      : {}),
  };
  const auth = betterAuth({
    appName: 'Reciping',
    baseURL: config.authUrl,
    secret: config.authSecret,
    database: drizzleAdapter(database.db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    socialProviders,
    plugins: [
      magicLink({
        async sendMagicLink() {
          throw new Error('Magic-link email delivery is not configured yet.');
        },
      }),
    ],
    trustedOrigins: [config.appOrigin],
  });
  return { auth, database };
}

export function createAuthenticate(authBundle: ReturnType<typeof createAuth>): Authenticate {
  return async (headers) => {
    if (!authBundle) return null;
    const session = await authBundle.auth.api.getSession({ headers });
    if (!session) return null;
    return { id: session.user.id, email: session.user.email };
  };
}
