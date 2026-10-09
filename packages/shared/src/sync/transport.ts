import type {
  EncryptedSyncEnvelope,
  HandshakeMessage,
} from './protocol.js';

export interface DirectSyncTransport {
  send(envelope: EncryptedSyncEnvelope): Promise<EncryptedSyncEnvelope | null>;
  handshake(message: HandshakeMessage): Promise<HandshakeMessage>;
}

/**
 * In-memory direct transport connecting two desktop device instances without a central server.
 */
export class DirectPeerTransport implements DirectSyncTransport {
  private peerReceiver?: (envelope: EncryptedSyncEnvelope) => Promise<EncryptedSyncEnvelope | null>;
  private peerHandshakeHandler?: (message: HandshakeMessage) => Promise<HandshakeMessage>;
  public simulateNetworkFault = false;

  bindPeer(
    receiver: (envelope: EncryptedSyncEnvelope) => Promise<EncryptedSyncEnvelope | null>,
    handshakeHandler: (message: HandshakeMessage) => Promise<HandshakeMessage>
  ): void {
    this.peerReceiver = receiver;
    this.peerHandshakeHandler = handshakeHandler;
  }

  async handshake(message: HandshakeMessage): Promise<HandshakeMessage> {
    if (this.simulateNetworkFault) {
      throw new Error('Connection reset by peer (simulated network fault)');
    }
    if (!this.peerHandshakeHandler) {
      throw new Error('Direct transport peer is not reachable / unbound');
    }
    return await this.peerHandshakeHandler(message);
  }

  async send(envelope: EncryptedSyncEnvelope): Promise<EncryptedSyncEnvelope | null> {
    if (this.simulateNetworkFault) {
      throw new Error('Direct QUIC/peer stream disconnected unexpectedly');
    }
    if (!this.peerReceiver) {
      throw new Error('Direct transport peer is not reachable / unbound');
    }
    return await this.peerReceiver(envelope);
  }
}
