import { Hono } from 'hono';
import { DirectSyncEngine } from '@app/shared';
import { VaultStore } from '@app/shared';
import { DeviceIdentity } from '@app/shared';
import { DesktopPairingCoordinator } from '@app/shared';

export function createApiApp(options?: { identity?: DeviceIdentity; store?: VaultStore; engine?: DirectSyncEngine }) {
  const identity = options?.identity ?? new DeviceIdentity('Desktop-Node');
  const store = options?.store ?? new VaultStore(identity.getDeviceId());
  const engine = options?.engine ?? new DirectSyncEngine(identity, store);
  const coordinator = new DesktopPairingCoordinator(identity);

  const app = new Hono();

  // Device & Status
  app.get('/api/device', (c) => {
    return c.json({
      deviceId: identity.getDeviceId(),
      deviceName: identity.getDeviceName(),
      publicKeyHex: identity.getPublicKeyHex(),
      status: engine.getState(),
      pairedPeersCount: identity.listPairedPeers().length,
    });
  });

  // List paired devices
  app.get('/api/sync/peers', (c) => {
    return c.json({
      peers: identity.listPairedPeers(),
    });
  });

  // Create pairing invitation
  app.post('/api/sync/pairing/invite', (c) => {
    const { passphrase, initMessage } = coordinator.createPairingInvitation();
    return c.json({
      passphrase,
      initMessage,
    });
  });

  // Vault entries
  app.get('/api/vault/entries', (c) => {
    const entries = store.listEntries();
    return c.json({
      entries: entries.map((e) => store.toRedactedMetadata(e)),
    });
  });

  // Update tags and sync to paired peer
  app.post('/api/vault/entries/:id/tags', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<{ tags: string[]; peerDeviceId?: string; peerHost?: string; peerPort?: number }>();

    const updated = store.updateTags(id, body.tags);

    let syncResult = null;
    if (body.peerDeviceId && body.peerHost && body.peerPort) {
      syncResult = await engine.syncWithPeer(body.peerDeviceId, body.peerHost, body.peerPort);
    }

    return c.json({
      entry: store.toRedactedMetadata(updated),
      syncResult,
    });
  });

  // Health probe
  app.get('/health', (c) => {
    return c.json({ status: 'healthy', timestamp: Date.now() });
  });

  return { app, identity, store, engine, coordinator };
}

const { app } = createApiApp();
export default app;
