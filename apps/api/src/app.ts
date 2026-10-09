import { Hono } from 'hono';
import { VaultRepository } from './repository/vault-repository.js';
import { createVaultRoutes } from './routes/vault.routes.js';
import { createEntriesRoutes } from './routes/entries.routes.js';
import { createMetadataRoutes } from './routes/metadata.routes.js';
import { createFixturesRoutes } from './routes/fixtures.routes.js';
import { createImportRoutes } from './routes/import.routes.js';
import { AiAdapter } from './ai/adapter.js';
import { SafeLogger, defaultLogger } from '@app/shared';

export interface AppOptions {
  repository?: VaultRepository;
  logger?: SafeLogger;
  aiAdapter?: AiAdapter;
}

export function createApp(options: AppOptions = {}): { app: Hono; repo: VaultRepository } {
  const repo = options.repository ?? new VaultRepository();
  const logger = options.logger ?? defaultLogger;
  const aiAdapter = options.aiAdapter ?? new AiAdapter();

  const app = new Hono();

  // Safe request logging middleware: zero payload contents logged
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    logger.info('HTTP_REQUEST', {
      meta: {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: duration,
      },
    });
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'verma-api', timestamp: Date.now() });
  });

  // Mount API modules
  app.route('/api/vault', createVaultRoutes(repo));
  app.route('/api/entries', createEntriesRoutes(repo));
  app.route('/api/metadata', createMetadataRoutes(repo));
  app.route('/api/fixtures', createFixturesRoutes(repo));
  app.route('/api/import', createImportRoutes(repo, aiAdapter));

  return { app, repo };
}
