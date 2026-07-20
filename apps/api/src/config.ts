export type ApiConfig = {
  port: number;
  appOrigin: string;
  databaseUrl: string | null;
  authSecret: string | null;
  authUrl: string;
  googleClientId: string | null;
  googleClientSecret: string | null;
  appleClientId: string | null;
  appleClientSecret: string | null;
};

function optional(value: string | undefined) {
  return value?.trim() || null;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    port: Number(env.PORT || 8787),
    appOrigin: env.APP_ORIGIN || 'http://localhost:8081',
    databaseUrl: optional(env.DATABASE_URL),
    authSecret: optional(env.BETTER_AUTH_SECRET),
    authUrl: env.BETTER_AUTH_URL || 'http://localhost:8787',
    googleClientId: optional(env.GOOGLE_CLIENT_ID),
    googleClientSecret: optional(env.GOOGLE_CLIENT_SECRET),
    appleClientId: optional(env.APPLE_CLIENT_ID),
    appleClientSecret: optional(env.APPLE_CLIENT_SECRET),
  };
}
