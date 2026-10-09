import {
  generateDeviceKeypair,
  DeviceKeypair,
  signData,
  verifySignature,
} from '../crypto/ed25519.js';
import { verifyDeviceId } from '../crypto/device-id.js';
import { DevicePeer } from './types.js';

export class DeviceIdentity {
  private keypair: DeviceKeypair;
  private deviceName: string;
  private pairedPeers: Map<string, DevicePeer> = new Map();

  constructor(deviceName: string, existingKeypair?: DeviceKeypair) {
    this.deviceName = deviceName;
    this.keypair = existingKeypair ?? generateDeviceKeypair();
  }

  getDeviceId(): string {
    return this.keypair.deviceId;
  }

  getDeviceName(): string {
    return this.deviceName;
  }

  getPublicKeyRaw(): Uint8Array {
    return this.keypair.publicKeyRaw;
  }

  getPublicKeyHex(): string {
    return Buffer.from(this.keypair.publicKeyRaw).toString('hex');
  }

  getKeypair(): DeviceKeypair {
    return this.keypair;
  }

  /**
   * Sign arbitrary data with device's private key.
   */
  sign(data: Uint8Array | Buffer | string): string {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    const sig = signData(buf, this.keypair.privateKeyPem);
    return Buffer.from(sig).toString('hex');
  }

  /**
   * Verify signature against a peer's public key or provided public key bytes.
   */
  verify(data: Uint8Array | Buffer | string, signatureHex: string, publicKeyRawOrHex: Uint8Array | string): boolean {
    const rawPub = typeof publicKeyRawOrHex === 'string'
      ? Buffer.from(publicKeyRawOrHex, 'hex')
      : publicKeyRawOrHex;
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    const sig = Buffer.from(signatureHex, 'hex');
    return verifySignature(buf, sig, rawPub);
  }

  /**
   * Verify signature using the stored public key of a paired peer.
   */
  verifyPeerSignature(peerDeviceId: string, data: Uint8Array | Buffer | string, signatureHex: string): boolean {
    const peer = this.pairedPeers.get(peerDeviceId);
    if (!peer || peer.status !== 'paired') {
      return false;
    }
    return this.verify(data, signatureHex, peer.publicKeyHex);
  }

  /**
   * Add a peer to the paired trust store.
   */
  pairPeer(peer: Omit<DevicePeer, 'pairedAt' | 'status'> & { pairedAt?: number; status?: 'paired' | 'unpaired' | 'revoked' }): DevicePeer {
    // Validate device identity invariant: Device ID must equal SHA-256(publicKey)
    const pubKeyBuf = Buffer.from(peer.publicKeyHex, 'hex');
    if (!verifyDeviceId(peer.deviceId, pubKeyBuf)) {
      throw new Error(`Device ID mismatch: ${peer.deviceId} does not match SHA-256 of public key.`);
    }

    const pairedPeer: DevicePeer = {
      deviceId: peer.deviceId,
      name: peer.name,
      publicKeyHex: peer.publicKeyHex,
      pairedAt: peer.pairedAt ?? Date.now(),
      status: peer.status ?? 'paired',
      host: peer.host,
      port: peer.port,
      lastSeenAt: peer.lastSeenAt ?? Date.now(),
    };

    this.pairedPeers.set(pairedPeer.deviceId, pairedPeer);
    return pairedPeer;
  }

  isPeerPaired(deviceId: string): boolean {
    const peer = this.pairedPeers.get(deviceId);
    return peer !== undefined && peer.status === 'paired';
  }

  getPairedPeer(deviceId: string): DevicePeer | undefined {
    return this.pairedPeers.get(deviceId);
  }

  listPairedPeers(): DevicePeer[] {
    return Array.from(this.pairedPeers.values()).filter((p) => p.status === 'paired');
  }

  unpairPeer(deviceId: string): boolean {
    const peer = this.pairedPeers.get(deviceId);
    if (!peer) return false;
    peer.status = 'unpaired';
    return true;
  }
}
