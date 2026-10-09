---
name: android-dev
description: >-
  Architectural guide and standards for Verma's Android implementation (P2
  Roadmap). Covers WebView-wrapped SPA architecture, Kotlin Native bridges for
  QUIC UDP device sync, Android Keystore & BiometricPrompt integration, and
  mobile on-device AI considerations.
---

# Android Development Guide (Verma Roadmap)

Authoritative architectural guide for the Android mobile application for
**Verma** based on `docs/prd.md`.

> **Important Scope Note:** Android implementation is designated as **P2
> (Roadmap, Post-Hackathon)** in `docs/prd.md`. Do not implement mobile clients
> during the hackathon overnight build window. This skill guides architectural
> compatibility and post-hackathon mobile development.

## 1. Mobile Architecture

- **Shell:** Kotlin / Android Native container hosting an optimized WebView for the Verma SPA.
- **Native Bridge:** JavaScript interface bridging web frontend with Android native capabilities:
  - Raw UDP / QUIC networking (browsers cannot open raw UDP sockets).
  - Android Keystore & Hardware Security Module (HSM).
  - Biometric authentication (`BiometricPrompt`).
  - Local encrypted SQLite / SQLCipher file storage.

## 2. Security & Keystore Integration

- **Master Key Protection:** Master vault keys must be protected using `AndroidKeyStore` with user authentication requirements (`setUserAuthenticationRequired(true)`).
- **Biometric Unlock:** Support Fingerprint and Face unlock via `androidx.biometric:biometric`.
- **Memory Safety:** Clear decrypted keys and secret byte arrays immediately after use; avoid keeping secrets in String objects.
- **Screen Protection:** Enforce `FLAG_SECURE` in Android WindowManager to prevent screenshots, screen recording, and app switcher secret leaks.

## 3. Direct Sync on Mobile

- Run the QUIC sync engine in a native Kotlin coroutine / background service.
- Handle mobile network transitions (Wi-Fi to mobile data, background throttling, Doze mode).
- Relay-assisted local pairing via mDNS or QR code scanning using Android CameraX.

## 4. Mobile Local AI Considerations

- When running inference on-device, utilize small quantized models (e.g., 1B parameters or GGUF Q4) via `llama.cpp` Android NDK bindings or mobile NPU accelerators (e.g. NNAPI / ExecuTorch).
- Fallback mode: Route redacted metadata queries to a paired local desktop node when mobile hardware resources are constrained.
- Maintain strict zero secret-field redaction in the native bridge layer before inference.

## 5. Web/Mobile Compatibility Rules

- Keep the web SPA UI touch-friendly, responsive, and free of browser-specific assumptions.
- Maintain clean separation between the frontend state machine and the native storage/sync bridge.
