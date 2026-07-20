import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createAuth, createAuthenticate } from './auth.js';
import { readConfig } from './config.js';

const config = readConfig();
const authBundle = createAuth(config);
const app = createApp({
  appOrigin: config.appOrigin,
  authenticate: createAuthenticate(authBundle),
  providers: {
    auth: Boolean(authBundle),
    ai: false,
    storage: false,
  },
});

if (authBundle) {
  app.on(['POST', 'GET'], '/api/auth/*', (context) => authBundle.auth.handler(context.req.raw));
}

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Reciping API listening on http://localhost:${info.port}`);
  if (!authBundle) {
    console.log('Auth is in scaffold mode. Add local DATABASE_URL and BETTER_AUTH_SECRET to enable it.');
  }
});
