# Verma Direct Sync & Pairing Architecture

This document describes the serverless direct device-to-device synchronization and mutual pairing protocol implemented for Verma (Task `D-M2-01`, Feature `F-05`).

---

## 1. Security & Cryptographic Boundaries

1. **No Central Server Required:** Direct peer-to-peer authenticated synchronization across paired desktop devices.
2. **Device Identity (`identity.ts`):**
   - Every device generates an **Ed25519 keypair**.
   - `deviceId` is derived deterministically as the lowercase hex **SHA-256 hash** of the device's public key (`deriveDeviceIdFromPublicKey`).
   - Digital signatures are created using Ed25519 for envelope and handshake verification.
3. **Mutual Authenticated Pairing (`pairing.ts`):**
   - Pairing uses a short-lived **6-digit confirmation code** and mutual Ed25519 signature exchange.
   - Exchange messages verify that the responder's public key matches their claimed `deviceId`.
   - As implemented, the initiator generates the shared 256-bit `syncSecret` with `randomBytes(32)` and sends it inside the `PairingConfirmationMessage` to the responder. The secret is **not** HKDF-derived from the confirmation code and public profiles, and it is carried in that message in plaintext.
   - **Known gap:** sending the raw `syncSecret` in plaintext, rather than deriving it per device (e.g. via HKDF over the confirmation code and public profiles), is a security deficiency logged against this pairing flow. The 6-digit code is also drawn from `Math.random()` rather than a cryptographic source. These are tracked defects pending the intended authenticated derivation, not the target design.
4. **Transport Encryption & Integrity (`protocol.ts`):**
   - Sync deltas are encrypted using **AES-256-GCM** with the shared `syncSecret`.
   - Each `EncryptedSyncEnvelope` includes a unique 96-bit nonce, timestamp, sender/recipient IDs, and a digital signature created with the sender's Ed25519 private key.
   - Decryption fails if the envelope is tampered with or modified.
5. **Fault Tolerance & Integrity (`sync-engine.ts`):**
   - Inbound sync operations are atomic: if decryption, signature verification, or network transfer fails, `SyncInterruptedError` or `UnauthorizedPeerError` is thrown, and local vault state remains completely untampered.
6. **Transport (`transport.ts`):**
   - The implemented `DirectPeerTransport` is an **in-memory test harness** that connects two in-process device instances by binding one peer's receiver and handshake handler to the other. It does not open a real QUIC/UDP network connection; a production QUIC transport is not yet implemented. (The simulated-fault path references a "QUIC/peer stream" string, but no QUIC socket exists.)

---

## 2. Acceptance Criteria Mapping

| Acceptance Criteria | Implementation / Test |
| --- | --- |
| `AC-D-M2-01-01`: Two desktop devices pair using authenticated confirmation code | `packages/shared/src/sync/pairing.ts`, `packages/shared/test/pairing.test.ts` |
| `AC-D-M2-01-02`: Non-secret tag change syncs between devices without central server | `packages/shared/src/sync/sync-engine.ts`, `packages/shared/test/direct-sync.test.ts` |
| `AC-D-M2-01-03`: Ed25519 device identity and public-key hash derivation | `packages/shared/src/sync/identity.ts`, `packages/shared/test/device-identity.test.ts` |
| `AC-D-M2-01-04`: Transport authenticates paired peers and rejects rogue/unpaired nodes | `packages/shared/src/sync/sync-engine.ts`, `packages/shared/test/unauthorized-peer.test.ts` |
| `AC-D-M2-01-05`: Interrupted sync reports error and preserves local data integrity | `packages/shared/src/sync/sync-engine.ts`, `packages/shared/test/interrupted-sync.test.ts` |
