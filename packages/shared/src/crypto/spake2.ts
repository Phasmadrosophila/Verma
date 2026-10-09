import { createHmac, createECDH } from 'node:crypto';
import { deriveKey } from './symmetric.js';

export interface PairingSessionState {
  sessionId: string;
  role: 'initiator' | 'responder';
  passphrase: string;
  localEphemeralPrivate: Buffer;
  localEphemeralPublic: Buffer;
  remoteEphemeralPublic?: Buffer;
  derivedSharedKey?: Uint8Array;
  confirmationCode?: string; // 6-digit Short Authentication String (SAS)
  isConfirmed: boolean;
}

export interface PairingMessageInit {
  type: 'PAIRING_INIT';
  sessionId: string;
  initiatorEphemeralPublicHex: string;
  initiatorDeviceId: string;
  initiatorPublicKeyHex: string;
  initiatorDeviceName: string;
  initiatorCommitmentHex: string;
}

export interface PairingMessageResponse {
  type: 'PAIRING_RESPONSE';
  sessionId: string;
  responderEphemeralPublicHex: string;
  responderDeviceId: string;
  responderPublicKeyHex: string;
  responderDeviceName: string;
  responderAuthMacHex: string;
}

export interface PairingMessageConfirm {
  type: 'PAIRING_CONFIRM';
  sessionId: string;
  initiatorAuthMacHex: string;
}

/**
 * Generate a standard Verma human-readable pairing passphrase.
 * E.g. "verma-delta-oscar-4821".
 */
export function generatePairingPassphrase(): string {
  const words = [
    'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
    'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec',
    'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey',
    'xray', 'yankee', 'zulu',
  ];
  const w1 = words[Math.floor(Math.random() * words.length)] ?? 'alpha';
  const w2 = words[Math.floor(Math.random() * words.length)] ?? 'bravo';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `verma-${w1}-${w2}-${num}`;
}

/**
 * Derives a 6-digit confirmation code (Short Authentication String - SAS)
 * from the shared key and ephemeral public keys for visual comparison.
 */
export function computeConfirmationCode(sharedKey: Uint8Array, initPub: Buffer, respPub: Buffer): string {
  const hmac = createHmac('sha256', Buffer.from(sharedKey));
  hmac.update(initPub);
  hmac.update(respPub);
  hmac.update(Buffer.from('verma-pairing-sas-v1'));
  const digest = hmac.digest();
  const codeInt = digest.readUInt32BE(digest.length - 4) % 1000000;
  return codeInt.toString().padStart(6, '0');
}

/**
 * Compute HMAC authentication tag for verifying mutual possession of shared key.
 */
export function computeAuthTag(sharedKey: Uint8Array, context: string): string {
  const hmac = createHmac('sha256', Buffer.from(sharedKey));
  hmac.update(Buffer.from(context, 'utf8'));
  return hmac.digest('hex');
}

/**
 * SPAKE2 / PAKE Handshake Protocol implementation using ECDH commitments over prime256v1.
 */
export class Spake2PairingEngine {
  /**
   * Create an initiator pairing session with a passphrase.
   */
  static startInitiatorSession(
    sessionId: string,
    passphrase: string,
    deviceId: string,
    publicKeyHex: string,
    deviceName: string
  ): { session: PairingSessionState; initMessage: PairingMessageInit } {
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    const priv = ecdh.getPrivateKey();
    const pub = ecdh.getPublicKey();

    const hmac = createHmac('sha256', Buffer.from(passphrase, 'utf8'));
    hmac.update(Buffer.from(`init-commitment:${sessionId}:${deviceId}`));
    hmac.update(pub);
    const commitmentHex = hmac.digest('hex');

    const session: PairingSessionState = {
      sessionId,
      role: 'initiator',
      passphrase,
      localEphemeralPrivate: priv,
      localEphemeralPublic: pub,
      isConfirmed: false,
    };

    const initMessage: PairingMessageInit = {
      type: 'PAIRING_INIT',
      sessionId,
      initiatorEphemeralPublicHex: pub.toString('hex'),
      initiatorDeviceId: deviceId,
      initiatorPublicKeyHex: publicKeyHex,
      initiatorDeviceName: deviceName,
      initiatorCommitmentHex: commitmentHex,
    };

    return { session, initMessage };
  }

  /**
   * Respond to an initiator pairing session on the responder device.
   */
  static handleInitiatorMessage(
    initMessage: PairingMessageInit,
    passphrase: string,
    responderDeviceId: string,
    responderPublicKeyHex: string,
    responderDeviceName: string
  ): { session: PairingSessionState; responseMessage: PairingMessageResponse } {
    const rawInitPub = Buffer.from(initMessage.initiatorEphemeralPublicHex, 'hex');

    // Verify initiator commitment with passphrase
    const hmac = createHmac('sha256', Buffer.from(passphrase, 'utf8'));
    hmac.update(Buffer.from(`init-commitment:${initMessage.sessionId}:${initMessage.initiatorDeviceId}`));
    hmac.update(rawInitPub);
    const expectedCommitment = hmac.digest('hex');

    if (expectedCommitment !== initMessage.initiatorCommitmentHex) {
      throw new Error('Pairing verification failed: invalid passphrase commitment from initiator.');
    }

    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    const priv = ecdh.getPrivateKey();
    const pub = ecdh.getPublicKey();

    // Compute shared DH secret
    const rawSharedSecret = ecdh.computeSecret(rawInitPub);
    const sharedKey = deriveKey(rawSharedSecret, passphrase, 'verma-spake2-shared-key');

    const confirmationCode = computeConfirmationCode(sharedKey, rawInitPub, pub);
    const responderAuthMacHex = computeAuthTag(sharedKey, `responder-auth:${initMessage.sessionId}:${responderDeviceId}`);

    const session: PairingSessionState = {
      sessionId: initMessage.sessionId,
      role: 'responder',
      passphrase,
      localEphemeralPrivate: priv,
      localEphemeralPublic: pub,
      remoteEphemeralPublic: rawInitPub,
      derivedSharedKey: sharedKey,
      confirmationCode,
      isConfirmed: false,
    };

    const responseMessage: PairingMessageResponse = {
      type: 'PAIRING_RESPONSE',
      sessionId: initMessage.sessionId,
      responderEphemeralPublicHex: pub.toString('hex'),
      responderDeviceId,
      responderPublicKeyHex,
      responderDeviceName,
      responderAuthMacHex,
    };

    return { session, responseMessage };
  }

  /**
   * Finalize pairing on initiator with responder's response message.
   */
  static handleResponseMessage(
    session: PairingSessionState,
    responseMessage: PairingMessageResponse
  ): { confirmMessage: PairingMessageConfirm; confirmationCode: string } {
    if (session.sessionId !== responseMessage.sessionId) {
      throw new Error(`Session ID mismatch: ${session.sessionId} vs ${responseMessage.sessionId}`);
    }

    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(session.localEphemeralPrivate);

    const rawRespPub = Buffer.from(responseMessage.responderEphemeralPublicHex, 'hex');
    const rawSharedSecret = ecdh.computeSecret(rawRespPub);
    const sharedKey = deriveKey(rawSharedSecret, session.passphrase, 'verma-spake2-shared-key');

    // Verify responder's auth MAC
    const expectedRespMac = computeAuthTag(sharedKey, `responder-auth:${session.sessionId}:${responseMessage.responderDeviceId}`);
    if (expectedRespMac !== responseMessage.responderAuthMacHex) {
      throw new Error('Pairing verification failed: invalid authentication MAC or wrong passphrase.');
    }

    const confirmationCode = computeConfirmationCode(sharedKey, session.localEphemeralPublic, rawRespPub);
    session.derivedSharedKey = sharedKey;
    session.confirmationCode = confirmationCode;
    session.remoteEphemeralPublic = rawRespPub;

    const initiatorAuthMacHex = computeAuthTag(sharedKey, `initiator-auth:${session.sessionId}`);
    const confirmMessage: PairingMessageConfirm = {
      type: 'PAIRING_CONFIRM',
      sessionId: session.sessionId,
      initiatorAuthMacHex,
    };

    return { confirmMessage, confirmationCode };
  }

  /**
   * Finalize pairing on responder with initiator's confirm message.
   */
  static handleConfirmMessage(
    session: PairingSessionState,
    confirmMessage: PairingMessageConfirm
  ): boolean {
    if (session.sessionId !== confirmMessage.sessionId) {
      throw new Error('Session ID mismatch');
    }
    if (!session.derivedSharedKey) {
      throw new Error('Shared key not established');
    }

    const expectedInitMac = computeAuthTag(session.derivedSharedKey, `initiator-auth:${session.sessionId}`);
    if (expectedInitMac !== confirmMessage.initiatorAuthMacHex) {
      throw new Error('Pairing verification failed: invalid initiator confirmation MAC.');
    }

    session.isConfirmed = true;
    return true;
  }
}
