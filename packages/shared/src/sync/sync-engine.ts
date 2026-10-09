import type { DeviceIdentity } from './identity.js';
import type { PairingManager, PairedDevice } from './pairing.js';
import type {
  SyncDelta,
  EncryptedSyncEnvelope,
  HandshakeMessage,
  SyncSessionResult,
} from './protocol.js';
import {
  createSyncEnvelope,
  unpackSyncEnvelope,
  UnauthorizedPeerError,
  SyncInterruptedError,
} from './protocol.js';
import { signData, verifySignature } from './identity.js';
import type { DirectSyncTransport } from './transport.js';

export type DeltaApplyHandler = (deltas: SyncDelta[]) => Promise<void>;

/**
 * Desktop-to-desktop Direct Sync Engine.
 *
 * Implements serverless, authenticated direct synchronization over QUIC/native transport.
 * Enforces Ed25519 mutual authentication, AES-256-GCM transport encryption,
 * and transactional non-corrupting delta application.
 */
export class DesktopSyncEngine {
  private identity: DeviceIdentity;
  private pairingManager: PairingManager;
  private applyHandler?: DeltaApplyHandler;

  constructor(
    identity: DeviceIdentity,
    pairingManager: PairingManager,
    applyHandler?: DeltaApplyHandler
  ) {
    this.identity = identity;
    this.pairingManager = pairingManager;
    this.applyHandler = applyHandler;
  }

  setApplyHandler(handler: DeltaApplyHandler): void {
    this.applyHandler = handler;
  }

  getIdentity(): DeviceIdentity {
    return this.identity;
  }

  getPairingManager(): PairingManager {
    return this.pairingManager;
  }

  /**
   * Responds to inbound peer handshake request.
   */
  async handleInboundHandshake(message: HandshakeMessage): Promise<HandshakeMessage> {
    const paired = this.pairingManager.getPairedDevice(message.senderDeviceId);
    if (!paired) {
      throw new UnauthorizedPeerError(`Rejected handshake: peer "${message.senderDeviceId}" is not paired`);
    }

    const expectedData = `HANDSHAKE_INIT:${message.senderDeviceId}:${this.identity.deviceId}:${message.timestamp}:${message.nonce}`;
    const isValid = verifySignature(expectedData, message.signature, paired.publicKeyPem);
    if (!isValid) {
      throw new UnauthorizedPeerError('Peer handshake signature is invalid');
    }

    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    const ackData = `HANDSHAKE_ACK:${this.identity.deviceId}:${message.senderDeviceId}:${timestamp}:${nonce}`;
    const signature = signData(ackData, this.identity.privateKeyPem);

    return {
      type: 'HANDSHAKE_ACK',
      senderDeviceId: this.identity.deviceId,
      recipientDeviceId: message.senderDeviceId,
      timestamp,
      nonce,
      signature,
    };
  }

  /**
   * Responds to inbound encrypted sync envelope.
   */
  async handleInboundEnvelope(envelope: EncryptedSyncEnvelope): Promise<EncryptedSyncEnvelope | null> {
    const paired = this.pairingManager.getPairedDevice(envelope.senderDeviceId);
    if (!paired) {
      throw new UnauthorizedPeerError(`Rejected envelope: peer "${envelope.senderDeviceId}" is not paired`);
    }

    // Unpack, verify signature, and decrypt deltas
    const deltas = unpackSyncEnvelope(envelope, paired.publicKeyPem, paired.syncSecret);

    // Apply deltas atomically
    if (this.applyHandler && deltas.length > 0) {
      try {
        await this.applyHandler(deltas);
      } catch (err) {
        throw new SyncInterruptedError(`Failed to apply sync deltas: ${(err as Error).message}`);
      }
    }

    return null;
  }

  /**
   * Initiates outbound direct sync session with a paired desktop peer.
   */
  async syncToPeer(
    targetDeviceId: string,
    transport: DirectSyncTransport,
    deltas: SyncDelta[]
  ): Promise<SyncSessionResult> {
    const paired = this.pairingManager.getPairedDevice(targetDeviceId);
    if (!paired) {
      throw new UnauthorizedPeerError(`Cannot sync to unpaired device "${targetDeviceId}"`);
    }

    try {
      // Step 1: Mutual Handshake Authentication
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const initData = `HANDSHAKE_INIT:${this.identity.deviceId}:${targetDeviceId}:${timestamp}:${nonce}`;
      const initSignature = signData(initData, this.identity.privateKeyPem);

      const handshakeInit: HandshakeMessage = {
        type: 'HANDSHAKE_INIT',
        senderDeviceId: this.identity.deviceId,
        recipientDeviceId: targetDeviceId,
        timestamp,
        nonce,
        signature: initSignature,
      };

      const ack = await transport.handshake(handshakeInit);
      if (!ack || ack.type !== 'HANDSHAKE_ACK') {
        throw new UnauthorizedPeerError('Peer handshake acknowledgment was invalid or rejected');
      }

      const expectedAckData = `HANDSHAKE_ACK:${targetDeviceId}:${this.identity.deviceId}:${ack.timestamp}:${ack.nonce}`;
      const isAckValid = verifySignature(expectedAckData, ack.signature, paired.publicKeyPem);
      if (!isAckValid) {
        throw new UnauthorizedPeerError('Peer handshake acknowledgment signature is invalid');
      }

      // Step 2: Encrypt and send sync deltas
      const envelope = createSyncEnvelope(
        deltas,
        this.identity.privateKeyPem,
        this.identity.deviceId,
        targetDeviceId,
        paired.syncSecret
      );

      await transport.send(envelope);

      return {
        success: true,
        appliedCount: deltas.length,
        deltasReceived: 0,
      };
    } catch (err) {
      if (err instanceof UnauthorizedPeerError) {
        throw err;
      }
      throw new SyncInterruptedError(`Direct sync transmission failed: ${(err as Error).message}`);
    }
  }
}
