export class UnauthorizedPeerError extends Error {
  public readonly peerDeviceId: string;

  constructor(peerDeviceId: string, reason = 'Peer is not in paired trust store or signature verification failed.') {
    super(`[Security] Transport rejected unauthorized peer ${peerDeviceId}: ${reason}`);
    this.name = 'UnauthorizedPeerError';
    this.peerDeviceId = peerDeviceId;
  }
}

export class SyncInterruptedError extends Error {
  public readonly peerDeviceId?: string;
  public readonly transactionRolledBack: boolean;

  constructor(message: string, peerDeviceId?: string, transactionRolledBack = true) {
    super(`[Sync] Sync interrupted: ${message}. Local vault state preserved (rollback=${transactionRolledBack}).`);
    this.name = 'SyncInterruptedError';
    this.peerDeviceId = peerDeviceId;
    this.transactionRolledBack = transactionRolledBack;
  }
}

export class PairingFailedError extends Error {
  constructor(reason: string) {
    super(`[Pairing] Pairing failed: ${reason}`);
    this.name = 'PairingFailedError';
  }
}

export class CorruptedPayloadError extends Error {
  constructor(details: string) {
    super(`[Sync] Integrity check failed on received sync payload: ${details}`);
    this.name = 'CorruptedPayloadError';
  }
}
