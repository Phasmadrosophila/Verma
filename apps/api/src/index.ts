import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { SqliteVaultStorage } from './storage/sqlite-vault-storage.js';
import { VaultRepository } from './repository/vault-repository.js';
import { defaultLogger } from '@app/shared';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = process.env.DB_PATH || 'vault.db';

const storage = new SqliteVaultStorage(DB_PATH);
const repository = new VaultRepository(storage, defaultLogger);
const { app } = createApp({ repository, logger: defaultLogger });

defaultLogger.info('SERVER_STARTING', {
  meta: {
    port: PORT,
    dbPath: DB_PATH === ':memory:' ? ':memory:' : 'file-backed',
  },
});

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    defaultLogger.info('SERVER_LISTENING', {
      meta: {
        port: info.port,
        address: info.address,
      },
    });
  }
);

export { app, repository };
