import { randomBytes, createHmac } from 'node:crypto';
import type { DeviceIdentity, PublicDeviceProfile } from './identity.js';
import {
  deriveDeviceIdFromPublicKey,
  signData,
  verifySignature,
  toPublicProfile,
} from './identity.js';

export interface PairedDevice {
  deviceId: string;
  deviceName: string;
  publicKeyPem: string;
  pairedAt: number;
  syncSecret: string; // Hex-encoded shared key for direct payload encryption
}

export interface PairingInvitation {
  pairingCode: string; // 6-digit confirmation code (e.g. "849201")
  initiatorProfile: PublicDeviceProfile;
  salt: string;
  expiresAt: number;
}

export interface PairingExchangeMessage {
  responderProfile: PublicDeviceProfile;
  challengeResponse: string;
  timestamp: number;
}

export interface PairingConfirmationMessage {
  initiatorProfile: PublicDeviceProfile;
  confirmationSignature: string;
  syncSecret: string;
}

export class PairingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PairingError';
  }
}

/**
 * Manages authenticated pairing between two desktop devices.
 */
export class PairingManager {
  private identity: DeviceIdentity;
  private pairedDevices = new Map<string, PairedDevice>();
  private activeInvitations = new Map<string, { invitation: PairingInvitation; syncSecret: string }>();

  constructor(identity: DeviceIdentity) {
    this.identity = identity;
  }

  getIdentity(): DeviceIdentity {
    return this.identity;
  }

  getPairedDevices(): PairedDevice[] {
    return Array.from(this.pairedDevices.values());
  }

  getPairedDevice(deviceId: string): PairedDevice | undefined {
    return this.pairedDevices.get(deviceId);
  }

  isDevicePaired(deviceId: string): boolean {
    return this.pairedDevices.has(deviceId);
  }

  addPairedDevice(device: PairedDevice): void {
    this.pairedDevices.set(device.deviceId, device);
  }

  removePairedDevice(deviceId: string): boolean {
    return this.pairedDevices.delete(deviceId);
  }

  /**
   * Device A: Create a pairing invitation with a 6-digit confirmation code.
   */
  createInvitation(ttlMs = 300_000): { invitation: PairingInvitation; pairingCode: string } {
    const codeNum = Math.floor(100000 + Math.random() * 900000);
    const pairingCode = codeNum.toString();
    const salt = randomBytes(16).toString('hex');
    const syncSecret = randomBytes(32).toString('hex');

    const invitation: PairingInvitation = {
      pairingCode,
      initiatorProfile: toPublicProfile(this.identity),
      salt,
      expiresAt: Date.now() + ttlMs,
    };

    this.activeInvitations.set(pairingCode, { invitation, syncSecret });
    return { invitation, pairingCode };
  }

  /**
   * Device B: Accepts an invitation using the pairing code and produces the exchange message.
   */
  acceptInvitation(
    invitation: PairingInvitation,
    enteredCode: string
  ): { exchangeMessage: PairingExchangeMessage; pairingProof: string } {
    if (invitation.pairingCode !== enteredCode) {
      throw new PairingError('Invalid pairing confirmation code');
    }
    if (Date.now() > invitation.expiresAt) {
      throw new PairingError('Pairing invitation has expired');
    }

    // Verify initiator device ID matches their public key hash
    const derivedId = deriveDeviceIdFromPublicKey(invitation.initiatorProfile.publicKeyPem);
    if (derivedId !== invitation.initiatorProfile.deviceId) {
      throw new PairingError('Initiator device ID does not match public key hash');
    }

    // Sign challenge incorporating pairing code, salt, and responder identity
    const challengeData = `${invitation.pairingCode}:${invitation.salt}:${this.identity.deviceId}:${invitation.initiatorProfile.deviceId}`;
    const challengeResponse = signData(challengeData, this.identity.privateKeyPem);

    const exchangeMessage: PairingExchangeMessage = {
      responderProfile: toPublicProfile(this.identity),
      challengeResponse,
      timestamp: Date.now(),
    };

    return { exchangeMessage, pairingProof: challengeData };
  }

  /**
   * Device A: Verifies responder exchange message and confirms the pairing.
   */
  confirmPairing(
    pairingCode: string,
    exchangeMessage: PairingExchangeMessage
  ): { confirmation: PairingConfirmationMessage; pairedDevice: PairedDevice } {
    const active = this.activeInvitations.get(pairingCode);
    if (!active) {
      throw new PairingError('Pairing session not found or already completed');
    }

    const { invitation, syncSecret } = active;
    if (Date.now() > invitation.expiresAt) {
      this.activeInvitations.delete(pairingCode);
      throw new PairingError('Pairing invitation has expired');
    }

    const { responderProfile, challengeResponse } = exchangeMessage;

    // 1. Verify responder device ID matches public key hash
    const derivedResponderId = deriveDeviceIdFromPublicKey(responderProfile.publicKeyPem);
    if (derivedResponderId !== responderProfile.deviceId) {
      throw new PairingError('Responder device ID does not match public key hash');
    }

    // 2. Verify responder's signature on challenge
    const expectedChallengeData = `${pairingCode}:${invitation.salt}:${responderProfile.deviceId}:${this.identity.deviceId}`;
    const isValidSignature = verifySignature(
      expectedChallengeData,
      challengeResponse,
      responderProfile.publicKeyPem
    );

    if (!isValidSignature) {
      throw new PairingError('Cryptographic signature verification failed for peer device');
    }

    // 3. Store responder in paired devices list
    const pairedDevice: PairedDevice = {
      deviceId: responderProfile.deviceId,
      deviceName: responderProfile.deviceName,
      publicKeyPem: responderProfile.publicKeyPem,
      pairedAt: Date.now(),
      syncSecret,
    };
    this.pairedDevices.set(pairedDevice.deviceId, pairedDevice);
    this.activeInvitations.delete(pairingCode);

    // 4. Generate confirmation signature for responder
    const confirmData = `CONFIRM:${pairedDevice.deviceId}:${syncSecret}`;
    const confirmationSignature = signData(confirmData, this.identity.privateKeyPem);

    const confirmation: PairingConfirmationMessage = {
      initiatorProfile: toPublicProfile(this.identity),
      confirmationSignature,
      syncSecret,
    };

    return { confirmation, pairedDevice };
  }

  /**
   * Device B: Finalizes pairing after receiving confirmation from Device A.
   */
  finalizePairing(
    invitation: PairingInvitation,
    confirmation: PairingConfirmationMessage
  ): PairedDevice {
    // Verify initiator signature
    const confirmData = `CONFIRM:${this.identity.deviceId}:${confirmation.syncSecret}`;
    const isValid = verifySignature(
      confirmData,
      confirmation.confirmationSignature,
      invitation.initiatorProfile.publicKeyPem
    );

    if (!isValid) {
      throw new PairingError('Initiator confirmation signature verification failed');
    }

    const pairedDevice: PairedDevice = {
      deviceId: invitation.initiatorProfile.deviceId,
      deviceName: invitation.initiatorProfile.deviceName,
      publicKeyPem: invitation.initiatorProfile.publicKeyPem,
      pairedAt: Date.now(),
      syncSecret: confirmation.syncSecret,
    };

    this.pairedDevices.set(pairedDevice.deviceId, pairedDevice);
    return pairedDevice;
  }
}
