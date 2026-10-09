---
name: android-dev
description: >-
  Architectural guide and standards for Verma's Android implementation (P2
  Roadmap). Covers Expo (https://expo.dev/) mobile architecture, Expo Modules &
  Config Plugins for QUIC UDP device sync, Expo SecureStore & LocalAuthentication
  integration, and mobile on-device AI considerations.
---

# Android Development Guide (Verma Roadmap)

Authoritative architectural guide for the Android mobile application for
**Verma** based on `docs/prd.md`.

> **Important Scope Note:** Android implementation is designated as **P2
> (Roadmap, Post-Hackathon)** in `docs/prd.md`. Do not implement mobile clients
> during the hackathon overnight build window. This skill guides architectural
> compatibility and post-hackathon mobile development.

## 1. Mobile Architecture

- **Framework:** [Expo](https://expo.dev/) (React Native with TypeScript) located in `apps/mobile`. The current mobile API integration is tracked by issue #55 and is an explicit scope deviation from the hackathon P2 boundary; desktop web remains the primary release path.
- **Current implementation:** `apps/mobile` is a React Native client that talks to the Hono backend over HTTP via `apiClient.ts`. The native modules listed below are **not currently installed**; they are planned, not present.

### Post-hackathon roadmap (native modules — not yet installed)

- **Expo Modules & Native Integrations:**
  - **Encrypted Storage:** `expo-sqlite` (or SQLCipher / libsodium-backed store via custom Expo Module) for encrypted local vault storage.
  - **Hardware Security & Keystore:** `expo-secure-store` backed by `AndroidKeyStore` / Hardware Security Module (HSM).
  - **Biometrics:** `expo-local-authentication` for fingerprint and facial authentication.
  - **Screen Protection:** `expo-screen-capture` (`preventScreenCaptureAsync`) enforcing Android `FLAG_SECURE` to prevent screenshots, screen recordings, and app switcher leaks.
  - **Camera / QR Pairing:** `expo-camera` for QR code scanning during device pairing.
  - **Networking / Direct Sync:** Custom Expo Module / Config Plugin for raw UDP socket and QUIC networking (running the Syncthing-style direct sync engine).

## 2. Security & Keystore Integration

- **Master Key Protection:** Master vault keys and device keys must be protected using `expo-secure-store` with hardware-backed encryption (`AndroidKeyStore`) and biometric authentication requirements.
- **Biometric Unlock:** Support Fingerprint and Face unlock via `expo-local-authentication` (`LocalAuthentication.authenticateAsync`).
- **Memory Safety:** Clear decrypted keys and secret byte arrays immediately after use; avoid keeping secrets in persistent JavaScript memory or String objects.
- **Screen Protection:** Enforce screen capture prevention via `expo-screen-capture` on sensitive screens to prevent screenshots, screen recording, and app switcher secret leaks.

## 3. Direct Sync on Mobile

- Run the QUIC sync engine via an Expo Module background task or native service.
- Handle mobile network transitions (Wi-Fi to mobile data, background throttling, Doze mode).
- Relay-assisted local pairing via mDNS or QR code scanning using `expo-camera`.

## 4. Mobile Local AI Considerations

- When running inference on-device, utilize small quantized models (e.g., 1B parameters or GGUF Q4) via `llama.cpp` mobile bindings, ONNX Runtime, or ExecuTorch integrated via an Expo Module.
- Fallback mode: Route redacted metadata queries to a paired local desktop node when mobile hardware resources are constrained.
- Maintain strict zero secret-field redaction in the trusted application layer before inference.

## 5. Cross-Platform & Code Sharing Rules

- Maximize shared code, cryptographic utilities, schemas, and state logic between the desktop SPA and the Expo mobile application.
- Maintain clean separation between the UI presentation, core vault state machine, and platform-specific storage/sync modules.
