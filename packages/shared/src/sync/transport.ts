import { createSocket, Socket } from 'node:dgram';
import { DeviceIdentity } from './identity.js';
import {
  DirectTransportMessage,
  HandshakeInitMessage,
  HandshakeAckMessage,
  SyncDataMessage,
  SyncAckMessage,
  SyncErrorMessage,
} from './types.js';
import { UnauthorizedPeerError, CorruptedPayloadError, SyncInterruptedError } from './errors.js';
import { encryptSymmetric, decryptSymmetricUtf8, deriveKey, sha256 } from '../crypto/symmetric.js';
import { verifyDeviceId } from '../crypto/device-id.js';

export interface TransportOptions {
  port?: number;
  host?: string;
  simulateDropRate?: number;
  simulateCorruptPayload?: boolean;
}

export class DirectSyncTransport {
  private identity: DeviceIdentity;
  private socket: Socket | null = null;
  private port: number = 0;
  private host: string = '127.0.0.1';
  private isListening = false;
  private activeSessions = new Map<string, { peerDeviceId: string; sessionKey: Uint8Array; sequence: number }>();
  private messageHandlers: Array<(msg: DirectTransportMessage, rinfo: { address: string; port: number }) => Promise<void> | void> = [];
  private simulateDrop = false;
  private simulateCorrupt = false;

  constructor(identity: DeviceIdentity, options?: TransportOptions) {
    this.identity = identity;
    this.port = options?.port ?? 0;
    this.host = options?.host ?? '127.0.0.1';
    this.simulateDrop = (options?.simulateDropRate ?? 0) > 0;
    this.simulateCorrupt = options?.simulateCorruptPayload ?? false;
  }

  setSimulateDrop(drop: boolean) {
    this.simulateDrop = drop;
  }

  setSimulateCorrupt(corrupt: boolean) {
    this.simulateCorrupt = corrupt;
  }

  getPort(): number {
    return this.port;
  }

  getHost(): string {
    return this.host;
  }

  getSessionKey(sessionId: string): Uint8Array | undefined {
    return this.activeSessions.get(sessionId)?.sessionKey;
  }

  async start(): Promise<number> {
    if (this.isListening) return this.port;

    return new Promise((resolve, reject) => {
      const s = createSocket('udp4');
      this.socket = s;

      s.on('error', (err) => {
        if (!this.isListening) {
          reject(err);
        }
      });

      s.on('message', async (msgBuf, rinfo) => {
        try {
          await this.handleIncomingDatagram(msgBuf, rinfo);
        } catch {
          // Handled or rejected
        }
      });

      s.bind(this.port, this.host, () => {
        const addr = s.address();
        this.port = addr.port;
        this.isListening = true;
        resolve(this.port);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isListening || !this.socket) return;
    return new Promise((resolve) => {
      this.socket?.close(() => {
        this.isListening = false;
        this.socket = null;
        resolve();
      });
    });
  }

  onMessage(handler: (msg: DirectTransportMessage, rinfo: { address: string; port: number }) => Promise<void> | void) {
    this.messageHandlers.push(handler);
  }

  private async handleIncomingDatagram(msgBuf: Buffer, rinfo: { address: string; port: number }) {
    let parsed: DirectTransportMessage;
    try {
      parsed = JSON.parse(msgBuf.toString('utf8'));
    } catch {
      return;
    }

    if (parsed.type === 'HANDSHAKE_INIT') {
      await this.handleHandshakeInit(parsed, rinfo);
      return;
    }

    for (const handler of this.messageHandlers) {
      await handler(parsed, rinfo);
    }
  }

  private async handleHandshakeInit(msg: HandshakeInitMessage, rinfo: { address: string; port: number }) {
    const { senderDeviceId, senderPublicKeyHex, timestamp, nonce, signatureHex } = msg;

    // 1. Verify device identity matches public key hash (AC-D-M2-01-03)
    const rawPubKeyBuf = Buffer.from(senderPublicKeyHex, 'hex');
    if (!verifyDeviceId(senderDeviceId, rawPubKeyBuf)) {
      await this.sendErrorMessage(rinfo, 'INVALID_IDENTITY', 'Device ID does not match public key hash');
      throw new UnauthorizedPeerError(senderDeviceId, 'Device ID mismatch');
    }

    // 2. Reject unpaired peer (AC-D-M2-01-04)
    if (!this.identity.isPeerPaired(senderDeviceId)) {
      await this.sendErrorMessage(rinfo, 'UNAUTHORIZED_PEER', 'Peer is not in paired trust store');
      throw new UnauthorizedPeerError(senderDeviceId, 'Peer not paired');
    }

    // 3. Verify signature
    const challenge = `verma-handshake-v1:${senderDeviceId}:${timestamp}:${nonce}`;
    const isValid = this.identity.verify(challenge, signatureHex, senderPublicKeyHex);
    if (!isValid) {
      await this.sendErrorMessage(rinfo, 'INVALID_SIGNATURE', 'Handshake signature verification failed');
      throw new UnauthorizedPeerError(senderDeviceId, 'Invalid signature');
    }

    // 4. Accept handshake and return HANDSHAKE_ACK
    const sessionToken = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const ackTimestamp = Date.now();
    const ackChallenge = `verma-handshake-ack:${this.identity.getDeviceId()}:${sessionToken}:${ackTimestamp}`;
    const ackSignature = this.identity.sign(ackChallenge);

    const sessionKey = deriveKey(
      senderPublicKeyHex + this.identity.getPublicKeyHex(),
      sessionToken,
      'verma-session-enc-v1'
    );

    this.activeSessions.set(sessionToken, {
      peerDeviceId: senderDeviceId,
      sessionKey,
      sequence: 0,
    });

    const ackMessage: HandshakeAckMessage = {
      type: 'HANDSHAKE_ACK',
      responderDeviceId: this.identity.getDeviceId(),
      responderPublicKeyHex: this.identity.getPublicKeyHex(),
      sessionToken,
      timestamp: ackTimestamp,
      signatureHex: ackSignature,
    };

    await this.sendDatagram(ackMessage, rinfo.port, rinfo.address);
  }

  async initiateHandshake(targetHost: string, targetPort: number, expectedPeerDeviceId: string): Promise<{ sessionToken: string; sessionKey: Uint8Array }> {
    if (!this.identity.isPeerPaired(expectedPeerDeviceId)) {
      throw new UnauthorizedPeerError(expectedPeerDeviceId, 'Cannot initiate connection: peer is not in paired trust store.');
    }

    const timestamp = Date.now();
    const nonce = Math.random().toString(36).slice(2, 10);
    const challenge = `verma-handshake-v1:${this.identity.getDeviceId()}:${timestamp}:${nonce}`;
    const signatureHex = this.identity.sign(challenge);

    const initMsg: HandshakeInitMessage = {
      type: 'HANDSHAKE_INIT',
      protocolVersion: 'verma-quic-v1',
      senderDeviceId: this.identity.getDeviceId(),
      senderPublicKeyHex: this.identity.getPublicKeyHex(),
      timestamp,
      nonce,
      signatureHex,
    };

    return new Promise<{ sessionToken: string; sessionKey: Uint8Array }>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new SyncInterruptedError('Handshake timed out - peer did not respond', expectedPeerDeviceId));
      }, 3000);

      const responseHandler = async (msg: DirectTransportMessage) => {
        if (msg.type === 'SYNC_ERROR') {
          clearTimeout(timeoutId);
          this.removeMessageHandler(responseHandler);
          if (msg.code === 'UNAUTHORIZED_PEER') {
            reject(new UnauthorizedPeerError(expectedPeerDeviceId, msg.message));
          } else {
            reject(new Error(`Handshake error: ${msg.message}`));
          }
          return;
        }

        if (msg.type === 'HANDSHAKE_ACK') {
          clearTimeout(timeoutId);
          this.removeMessageHandler(responseHandler);

          if (msg.responderDeviceId !== expectedPeerDeviceId) {
            reject(new UnauthorizedPeerError(msg.responderDeviceId, 'Handshake returned unexpected device ID'));
            return;
          }

          const rawRespPub = Buffer.from(msg.responderPublicKeyHex, 'hex');
          if (!verifyDeviceId(msg.responderDeviceId, rawRespPub)) {
            reject(new UnauthorizedPeerError(msg.responderDeviceId, 'Responder device ID mismatch with public key'));
            return;
          }

          const ackChallenge = `verma-handshake-ack:${msg.responderDeviceId}:${msg.sessionToken}:${msg.timestamp}`;
          const isValid = this.identity.verify(ackChallenge, msg.signatureHex, msg.responderPublicKeyHex);
          if (!isValid) {
            reject(new UnauthorizedPeerError(msg.responderDeviceId, 'Invalid responder handshake signature'));
            return;
          }

          const sessionKey = deriveKey(
            this.identity.getPublicKeyHex() + msg.responderPublicKeyHex,
            msg.sessionToken,
            'verma-session-enc-v1'
          );

          this.activeSessions.set(msg.sessionToken, {
            peerDeviceId: expectedPeerDeviceId,
            sessionKey,
            sequence: 0,
          });

          resolve({ sessionToken: msg.sessionToken, sessionKey });
        }
      };

      this.onMessage(responseHandler);
      this.sendDatagram(initMsg, targetPort, targetHost).catch(reject);
    });
  }

  async sendSyncData(
    targetHost: string,
    targetPort: number,
    sessionToken: string,
    sessionKey: Uint8Array,
    plaintextPayload: string
  ): Promise<SyncAckMessage> {
    if (this.simulateDrop) {
      throw new SyncInterruptedError('Network connection dropped mid-transfer (simulated drop)', undefined, true);
    }

    const payloadToEncrypt = this.simulateCorrupt
      ? plaintextPayload + ' [CORRUPTED_BYTES]'
      : plaintextPayload;

    const encrypted = encryptSymmetric(payloadToEncrypt, sessionKey);
    const checksum = sha256(plaintextPayload);

    const syncMsg: SyncDataMessage = {
      type: 'SYNC_DATA',
      sessionId: sessionToken,
      senderDeviceId: this.identity.getDeviceId(),
      encryptedChangeset: encrypted,
      checksum,
      sequence: 1,
      isLastChunk: true,
    };

    return new Promise<SyncAckMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new SyncInterruptedError('Sync ACK timed out - connection interrupted', undefined, true));
      }, 3000);

      const ackHandler = (msg: DirectTransportMessage) => {
        if (msg.type === 'SYNC_ACK' && msg.sessionId === sessionToken) {
          clearTimeout(timeout);
          this.removeMessageHandler(ackHandler);
          resolve(msg);
        } else if (msg.type === 'SYNC_ERROR' && msg.sessionId === sessionToken) {
          clearTimeout(timeout);
          this.removeMessageHandler(ackHandler);
          reject(new CorruptedPayloadError(msg.message));
        }
      };

      this.onMessage(ackHandler);
      this.sendDatagram(syncMsg, targetPort, targetHost).catch(reject);
    });
  }

  decryptSyncData(msg: SyncDataMessage, sessionKey: Uint8Array): string {
    const decrypted = decryptSymmetricUtf8(msg.encryptedChangeset, sessionKey);
    const calculatedChecksum = sha256(decrypted);

    if (calculatedChecksum !== msg.checksum) {
      throw new CorruptedPayloadError(`Checksum verification failed: expected ${msg.checksum}, got ${calculatedChecksum}`);
    }

    return decrypted;
  }

  async sendErrorMessage(rinfo: { address: string; port: number }, code: string, message: string, sessionId?: string) {
    const err: SyncErrorMessage = {
      type: 'SYNC_ERROR',
      code,
      message,
      sessionId,
    };
    await this.sendDatagram(err, rinfo.port, rinfo.address);
  }

  async sendDatagram(message: DirectTransportMessage, port: number, host: string): Promise<void> {
    if (!this.socket || !this.isListening) {
      throw new Error('Transport socket is not open');
    }
    const data = Buffer.from(JSON.stringify(message), 'utf8');
    return new Promise((resolve, reject) => {
      this.socket?.send(data, 0, data.length, port, host, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private removeMessageHandler(handler: (msg: DirectTransportMessage, rinfo: { address: string; port: number }) => Promise<void> | void) {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }
}
