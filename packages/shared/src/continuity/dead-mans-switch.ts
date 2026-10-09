import { createHash, randomUUID } from 'node:crypto';
import { decryptJson, encryptJson } from '../crypto/cipher.js';
import type { EncryptedPayload } from '../types/crypto.js';

export type SwitchState = 'ACTIVE' | 'WARNING' | 'CANCELLED' | 'RELEASED';
export type SwitchEventType = 'PACKAGE_APPROVED' | 'HEARTBEAT_MISSED' | 'WARNING_ENTERED' | 'CANCELLED' | 'RELEASE_AUTHORIZED';

export interface EmergencyPackage {
  packageId: string;
  recipientId: string;
  encryptedContent: EncryptedPayload;
  approvedAt: number;
}

export interface SwitchEvent {
  eventId: string;
  type: SwitchEventType;
  timestamp: number;
  state: SwitchState;
  packageId: string;
}

export interface SwitchSnapshot {
  package: EmergencyPackage;
  state: SwitchState;
  lastHeartbeatAt: number;
  events: SwitchEvent[];
}

export interface ReleaseReceipt {
  packageId: string;
  recipientId: string;
  encryptedContent: EncryptedPayload;
  eventId: string;
}

export interface DeadMansSwitchOptions {
  now?: () => number;
  heartbeatTimeoutMs: number;
  gracePeriodMs: number;
}

export class DeadMansSwitch {
  private readonly now: () => number;
  private readonly heartbeatTimeoutMs: number;
  private readonly gracePeriodMs: number;
  private snapshot?: SwitchSnapshot;

  public constructor(options: DeadMansSwitchOptions) {
    if (options.heartbeatTimeoutMs <= 0 || options.gracePeriodMs <= 0) {
      throw new Error('Heartbeat timeout and grace period must be positive');
    }
    this.now = options.now ?? Date.now;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs;
    this.gracePeriodMs = options.gracePeriodMs;
  }

  public approvePackage(recipientId: string, emergencyContent: string, key: Buffer): EmergencyPackage {
    if (!recipientId || !emergencyContent || key.length !== 32) {
      throw new Error('Recipient, emergency content, and a 32-byte key are required');
    }
    if (this.snapshot) throw new Error('Emergency package already approved');
    const timestamp = this.now();
    const emergencyPackage: EmergencyPackage = {
      packageId: randomUUID(),
      recipientId,
      encryptedContent: encryptJson({ emergencyContent }, key),
      approvedAt: timestamp,
    };
    this.snapshot = {
      package: emergencyPackage,
      state: 'ACTIVE',
      lastHeartbeatAt: timestamp,
      events: [this.event('PACKAGE_APPROVED', timestamp, 'ACTIVE', emergencyPackage.packageId)],
    };
    return emergencyPackage;
  }

  public heartbeat(): void {
    const snapshot = this.requireSnapshot();
    if (snapshot.state !== 'ACTIVE') throw new Error('Heartbeat is only accepted while active');
    snapshot.lastHeartbeatAt = this.now();
  }

  public evaluate(): SwitchState {
    const snapshot = this.requireSnapshot();
    const elapsed = this.now() - snapshot.lastHeartbeatAt;
    if (snapshot.state === 'ACTIVE' && elapsed >= this.heartbeatTimeoutMs) {
      snapshot.state = 'WARNING';
      snapshot.events.push(this.event('HEARTBEAT_MISSED', this.now(), 'WARNING', snapshot.package.packageId));
      snapshot.events.push(this.event('WARNING_ENTERED', this.now(), 'WARNING', snapshot.package.packageId));
    }
    return snapshot.state;
  }

  public cancel(): void {
    const snapshot = this.requireSnapshot();
    this.evaluate();
    if (snapshot.state !== 'WARNING') throw new Error('Switch can only be cancelled during warning');
    snapshot.state = 'CANCELLED';
    snapshot.events.push(this.event('CANCELLED', this.now(), 'CANCELLED', snapshot.package.packageId));
  }

  public authorizeRelease(recipientId: string, proof: string): ReleaseReceipt {
    const snapshot = this.requireSnapshot();
    this.evaluate();
    if (snapshot.state !== 'WARNING') throw new Error('Release requires warning state');
    if (this.now() - snapshot.events.find((event) => event.type === 'WARNING_ENTERED')!.timestamp < this.gracePeriodMs) {
      throw new Error('Grace period has not elapsed');
    }
    if (recipientId !== snapshot.package.recipientId || !this.validProof(recipientId, proof)) {
      throw new Error('Recipient authentication failed');
    }
    snapshot.state = 'RELEASED';
    const event = this.event('RELEASE_AUTHORIZED', this.now(), 'RELEASED', snapshot.package.packageId);
    snapshot.events.push(event);
    return {
      packageId: snapshot.package.packageId,
      recipientId: snapshot.package.recipientId,
      encryptedContent: snapshot.package.encryptedContent,
      eventId: event.eventId,
    };
  }

  public getSnapshot(): SwitchSnapshot {
    const snapshot = this.requireSnapshot();
    return structuredClone(snapshot);
  }

  public static decryptRelease(receipt: ReleaseReceipt, key: Buffer): { emergencyContent: string } {
    return decryptJson<{ emergencyContent: string }>(receipt.encryptedContent, key);
  }

  public static recipientProof(recipientId: string): string {
    return createHash('sha256').update(`verma-dead-mans-switch:${recipientId}`).digest('hex');
  }

  private validProof(recipientId: string, proof: string): boolean {
    return proof === DeadMansSwitch.recipientProof(recipientId);
  }

  private requireSnapshot(): SwitchSnapshot {
    if (!this.snapshot) throw new Error('Emergency package has not been approved');
    return this.snapshot;
  }

  private event(type: SwitchEventType, timestamp: number, state: SwitchState, packageId: string): SwitchEvent {
    return { eventId: randomUUID(), type, timestamp, state, packageId };
  }
}
