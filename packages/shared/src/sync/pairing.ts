import {
  Spake2PairingEngine,
  PairingSessionState,
  PairingMessageInit,
  PairingMessageResponse,
  PairingMessageConfirm,
  generatePairingPassphrase,
} from '../crypto/spake2.js';
import { DeviceIdentity } from './identity.js';
import { PairingFailedError } from './errors.js';

export interface PairingResult {
  pairedPeerDeviceId: string;
  pairedPeerName: string;
  confirmationCode: string;
  success: boolean;
}

export class DesktopPairingCoordinator {
  private identity: DeviceIdentity;
  private activeInitiatorSessions: Map<string, { session: PairingSessionState; passphrase: string }> = new Map();
  private activeResponderSessions: Map<string, { session: PairingSessionState; peerDeviceId: string; peerName: string; peerPublicKeyHex: string }> = new Map();

  constructor(identity: DeviceIdentity) {
    this.identity = identity;
  }

  /**
   * Device A: Initiate pairing and create an invitation code.
   */
  createPairingInvitation(customPassphrase?: string): { passphrase: string; initMessage: PairingMessageInit } {
    const sessionId = `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const passphrase = customPassphrase ?? generatePairingPassphrase();

    const { session, initMessage } = Spake2PairingEngine.startInitiatorSession(
      sessionId,
      passphrase,
      this.identity.getDeviceId(),
      this.identity.getPublicKeyHex(),
      this.identity.getDeviceName()
    );

    this.activeInitiatorSessions.set(sessionId, { session, passphrase });
    return { passphrase, initMessage };
  }

  /**
   * Device B: Enter pairing code and respond to invitation.
   */
  acceptPairingInvitation(
    initMessage: PairingMessageInit,
    passphrase: string,
    _responderHost?: string,
    _responderPort?: number
  ): { responseMessage: PairingMessageResponse; confirmationCode: string } {
    try {
      const { session, responseMessage } = Spake2PairingEngine.handleInitiatorMessage(
        initMessage,
        passphrase,
        this.identity.getDeviceId(),
        this.identity.getPublicKeyHex(),
        this.identity.getDeviceName()
      );

      this.activeResponderSessions.set(initMessage.sessionId, {
        session,
        peerDeviceId: initMessage.initiatorDeviceId,
        peerName: initMessage.initiatorDeviceName,
        peerPublicKeyHex: initMessage.initiatorPublicKeyHex,
      });

      return {
        responseMessage,
        confirmationCode: session.confirmationCode!,
      };
    } catch (err) {
      throw new PairingFailedError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Device A: Receive response, verify, get SAS code, and add peer to trust store.
   */
  completeInitiatorPairing(
    responseMessage: PairingMessageResponse,
    peerHost?: string,
    peerPort?: number
  ): { confirmMessage: PairingMessageConfirm; confirmationCode: string; pairedPeerId: string } {
    const sessionRecord = this.activeInitiatorSessions.get(responseMessage.sessionId);
    if (!sessionRecord) {
      throw new PairingFailedError(`No active initiator pairing session found for ${responseMessage.sessionId}`);
    }

    try {
      const { confirmMessage, confirmationCode } = Spake2PairingEngine.handleResponseMessage(
        sessionRecord.session,
        responseMessage
      );

      this.identity.pairPeer({
        deviceId: responseMessage.responderDeviceId,
        name: responseMessage.responderDeviceName,
        publicKeyHex: responseMessage.responderPublicKeyHex,
        host: peerHost,
        port: peerPort,
      });

      this.activeInitiatorSessions.delete(responseMessage.sessionId);
      return {
        confirmMessage,
        confirmationCode,
        pairedPeerId: responseMessage.responderDeviceId,
      };
    } catch (err) {
      this.activeInitiatorSessions.delete(responseMessage.sessionId);
      throw new PairingFailedError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Device B: Finalize pairing upon receiving confirm message from Device A.
   */
  completeResponderPairing(
    confirmMessage: PairingMessageConfirm,
    peerHost?: string,
    peerPort?: number
  ): PairingResult {
    const sessionRecord = this.activeResponderSessions.get(confirmMessage.sessionId);
    if (!sessionRecord) {
      throw new PairingFailedError(`No active responder pairing session found for ${confirmMessage.sessionId}`);
    }

    try {
      Spake2PairingEngine.handleConfirmMessage(sessionRecord.session, confirmMessage);

      this.identity.pairPeer({
        deviceId: sessionRecord.peerDeviceId,
        name: sessionRecord.peerName,
        publicKeyHex: sessionRecord.peerPublicKeyHex,
        host: peerHost,
        port: peerPort,
      });

      this.activeResponderSessions.delete(confirmMessage.sessionId);
      return {
        pairedPeerDeviceId: sessionRecord.peerDeviceId,
        pairedPeerName: sessionRecord.peerName,
        confirmationCode: sessionRecord.session.confirmationCode!,
        success: true,
      };
    } catch (err) {
      this.activeResponderSessions.delete(confirmMessage.sessionId);
      throw new PairingFailedError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Helper to perform high-level direct pairing between two devices in one coordinated flow.
   */
  static pairDevices(
    devA: DeviceIdentity,
    devB: DeviceIdentity,
    customPassphrase?: string
  ): { codeA: string; codeB: string; success: boolean } {
    const coordA = new DesktopPairingCoordinator(devA);
    const coordB = new DesktopPairingCoordinator(devB);

    const { passphrase, initMessage } = coordA.createPairingInvitation(customPassphrase);
    const { responseMessage, confirmationCode: codeB } = coordB.acceptPairingInvitation(initMessage, passphrase);

    const { confirmMessage, confirmationCode: codeA } = coordA.completeInitiatorPairing(responseMessage);
    coordB.completeResponderPairing(confirmMessage);

    if (codeA !== codeB) {
      throw new PairingFailedError(`Confirmation codes do not match: ${codeA} !== ${codeB}`);
    }

    return {
      codeA,
      codeB,
      success: true,
    };
  }
}
