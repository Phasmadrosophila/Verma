import { VaultStore } from '../vault/store.js';
import { VaultChangeset, VaultEntry } from '../vault/types.js';
import { DeviceIdentity } from './identity.js';
import { DirectSyncTransport } from './transport.js';
import { SyncEngineState, DirectTransportMessage, SyncDataMessage } from './types.js';
import { UnauthorizedPeerError } from './errors.js';

export interface SyncEngineOptions {
  port?: number;
  host?: string;
}

export class DirectSyncEngine {
  private store: VaultStore;
  private identity: DeviceIdentity;
  private transport: DirectSyncTransport;
  private state: SyncEngineState = 'idle';
  private lastError: Error | null = null;
  private activeSessionKeys = new Map<string, Uint8Array>();

  constructor(identity: DeviceIdentity, store: VaultStore, options?: SyncEngineOptions) {
    this.identity = identity;
    this.store = store;
    this.transport = new DirectSyncTransport(identity, {
      port: options?.port,
      host: options?.host,
    });

    this.transport.onMessage(async (msg, rinfo) => {
      await this.handleIncomingMessage(msg, rinfo);
    });
  }

  getIdentity(): DeviceIdentity {
    return this.identity;
  }

  getStore(): VaultStore {
    return this.store;
  }

  getTransport(): DirectSyncTransport {
    return this.transport;
  }

  getState(): SyncEngineState {
    return this.state;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  async start(): Promise<number> {
    const port = await this.transport.start();
    this.state = 'idle';
    return port;
  }

  async stop(): Promise<void> {
    await this.transport.stop();
    this.state = 'idle';
  }

  /**
   * Sync local vault records with a paired peer directly over local transport without a central server.
   * (AC-D-M2-01-02)
   */
  async syncWithPeer(peerDeviceId: string, targetHost: string, targetPort: number): Promise<{ success: boolean; appliedCount: number }> {
    this.state = 'connecting';
    this.lastError = null;

    try {
      // 1. Authenticated handshake
      const { sessionToken, sessionKey } = await this.transport.initiateHandshake(
        targetHost,
        targetPort,
        peerDeviceId
      );

      this.activeSessionKeys.set(sessionToken, sessionKey);
      this.state = 'syncing';

      // 2. Prepare local changeset
      const entries = this.store.listEntries();
      const changeset: VaultChangeset = {
        deviceId: this.identity.getDeviceId(),
        sequence: 1,
        timestamp: Date.now(),
        entries,
        deletedIds: [],
      };

      const payloadString = JSON.stringify(changeset);

      // 3. Send encrypted sync payload directly
      const ack = await this.transport.sendSyncData(
        targetHost,
        targetPort,
        sessionToken,
        sessionKey,
        payloadString
      );

      this.state = 'idle';
      return {
        success: ack.status === 'ok',
        appliedCount: ack.appliedCount,
      };
    } catch (err) {
      this.state = 'interrupted';
      this.lastError = err instanceof Error ? err : new Error(String(err));
      throw this.lastError;
    }
  }

  /**
   * Helper to perform a tag update locally and push the updated record directly to paired peer.
   * (AC-D-M2-01-02)
   */
  async updateTagAndSync(
    entryId: string,
    newTags: string[],
    targetHost: string,
    targetPort: number,
    peerDeviceId: string
  ): Promise<{ localEntry: VaultEntry; syncResult: { success: boolean; appliedCount: number } }> {
    // 1. Update tag locally in vault store
    const localEntry = this.store.updateTags(entryId, newTags);

    // 2. Push direct sync update to paired peer
    const syncResult = await this.syncWithPeer(peerDeviceId, targetHost, targetPort);

    return {
      localEntry,
      syncResult,
    };
  }

  /**
   * Handle incoming message over direct transport.
   * Enforces transactional application and atomic rollback on corruption / interruption (AC-D-M2-01-05).
   */
  private async handleIncomingMessage(msg: DirectTransportMessage, rinfo: { address: string; port: number }) {
    if (msg.type !== 'SYNC_DATA') return;

    const dataMsg = msg as SyncDataMessage;

    try {
      // Check authorization
      if (!this.identity.isPeerPaired(dataMsg.senderDeviceId)) {
        await this.transport.sendErrorMessage(
          rinfo,
          'UNAUTHORIZED_PEER',
          'Peer is not in paired trust store',
          dataMsg.sessionId
        );
        throw new UnauthorizedPeerError(dataMsg.senderDeviceId);
      }

      // Find session key from active transport sessions
      const sessionKey = this.transport.getSessionKey(dataMsg.sessionId) ?? this.activeSessionKeys.get(dataMsg.sessionId);
      if (!sessionKey) {
        throw new UnauthorizedPeerError(dataMsg.senderDeviceId, 'No active session key found for incoming sync');
      }

      // Decrypt and verify checksum
      const plaintext = this.transport.decryptSyncData(dataMsg, sessionKey);
      const changeset: VaultChangeset = JSON.parse(plaintext);

      // Apply changeset atomically in local vault store
      const result = this.store.applyChangeset(changeset);

      // Send ACK back
      await this.transport.sendDatagram(
        {
          type: 'SYNC_ACK',
          sessionId: dataMsg.sessionId,
          sequence: dataMsg.sequence,
          status: 'ok',
          appliedCount: result.applied,
        },
        rinfo.port,
        rinfo.address
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.transport.sendErrorMessage(
        rinfo,
        'CORRUPTED_OR_INTERRUPTED',
        errMsg,
        dataMsg.sessionId
      );
    }
  }
}
