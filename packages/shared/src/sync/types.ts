import { EncryptedPayload } from '../crypto/symmetric.js';

export interface DevicePeer {
  deviceId: string;
  name: string;
  publicKeyHex: string;
  pairedAt: number;
  status: 'paired' | 'unpaired' | 'revoked';
  lastSeenAt?: number;
  host?: string;
  port?: number;
}

export type SyncEngineState = 'idle' | 'pairing' | 'connecting' | 'syncing' | 'error' | 'interrupted';

export type TransportMessageType =
  | 'HANDSHAKE_INIT'
  | 'HANDSHAKE_ACK'
  | 'SYNC_DATA'
  | 'SYNC_ACK'
  | 'SYNC_ERROR'
  | 'PING'
  | 'PONG';

export interface HandshakeInitMessage {
  type: 'HANDSHAKE_INIT';
  protocolVersion: string;
  senderDeviceId: string;
  senderPublicKeyHex: string;
  timestamp: number;
  nonce: string;
  signatureHex: string;
}

export interface HandshakeAckMessage {
  type: 'HANDSHAKE_ACK';
  responderDeviceId: string;
  responderPublicKeyHex: string;
  sessionToken: string;
  timestamp: number;
  signatureHex: string;
}

export interface SyncDataMessage {
  type: 'SYNC_DATA';
  sessionId: string;
  senderDeviceId: string;
  encryptedChangeset: EncryptedPayload;
  checksum: string; // SHA-256 of decrypted payload for integrity verification
  sequence: number;
  isLastChunk: boolean;
}

export interface SyncAckMessage {
  type: 'SYNC_ACK';
  sessionId: string;
  sequence: number;
  status: 'ok' | 'rejected';
  appliedCount: number;
}

export interface SyncErrorMessage {
  type: 'SYNC_ERROR';
  sessionId?: string;
  code: string;
  message: string;
}

export type DirectTransportMessage =
  | HandshakeInitMessage
  | HandshakeAckMessage
  | SyncDataMessage
  | SyncAckMessage
  | SyncErrorMessage;
