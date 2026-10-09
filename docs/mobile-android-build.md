# Mobile Android Build Pipeline

> **Scope note (P2, user-approved deviation).** Mobile is P2 / out of hackathon
> scope per `AGENTS.md` §4 and the `android-dev` skill. Desktop web remains the
> primary hackathon release path. These build paths exist as an explicit,
> user-approved post-MVP deviation (issue #55) and must not displace P0 desktop,
> offline, AI, or sync acceptance criteria.
>
> **Nothing here is run automatically.** Every build path is manual-trigger only.

App: `apps/mobile` (Expo SDK ^57, RN 0.86.3, managed workflow).
Android package: `com.phasmadrosophila.verma`.

## Build config in this repo

| File | Purpose |
| --- | --- |
| `apps/mobile/eas.json` | EAS profiles: `preview` (APK, internal) / `production` (AAB). |
| `apps/mobile/app.json` | `android.versionCode`, `extra.eas.projectId` placeholder. |
| `.github/workflows/mobile-build.yml` | Manual (`workflow_dispatch`) EAS cloud build. |
| `apps/mobile/Dockerfile.build` | Local-build image for self-hosted Komodo. |

## Blockers — clear these before a first successful build

A build **cannot** succeed until all of these are resolved. In order:

1. **`eas init`** — populates `extra.eas.projectId` in `app.json` and links the
   Expo project. The committed value is `REPLACE_VIA_EAS_INIT`; do not hand-edit
   the projectId. Also add top-level `"owner": "<expo-account>"` in the `expo`
   block (see `_owner_note` in `app.json`).
2. **`EXPO_TOKEN`** — an Expo access token. For Actions, set it as a repo secret
   (Settings > Secrets and variables > Actions). For Komodo/local, pass at runtime.
3. **Android signing credentials** —
   - EAS cloud: EAS manages signing on first `production` build (interactive
     `eas credentials`, run once by the user).
   - Local gradle / `eas build --local`: a release keystore plus its alias and
     passwords, referenced by **name** only:
     `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
     `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
     The keystore is **mounted at runtime, never committed or baked** into an image.
4. **Pinned base-image digest** (Komodo path only) — replace
   `REPLACE_WITH_PINNED_DIGEST` in `Dockerfile.build` with a resolved
   `eclipse-temurin:21-jdk-jammy` digest.

## Path 1 — EAS cloud via GitHub Actions (recommended)

Manual trigger, builds on Expo's infrastructure.

- Trigger: Actions tab > "Mobile Android Build (EAS)" > Run workflow > pick
  `preview` or `production`.
- A guard step fails fast with a clear message if `EXPO_TOKEN` is unset.
- Underlying command the workflow runs:
  ```
  eas build -p android --profile preview --non-interactive --no-wait
  ```

## Path 2 — EAS local via self-hosted Komodo

Builds the APK on your own hardware (no Expo cloud compute). Komodo in this repo
only does docker-compose stack deploys (`scripts/komodo-deploy.sh`,
`docs/komodo-deployment.md`), so register the build explicitly:

1. Pin the base-image digest in `apps/mobile/Dockerfile.build` (blocker #4).
2. Register as a **Komodo Build** (or a Procedure that `docker build`s + runs it)
   pointing at `apps/mobile/Dockerfile.build`.
3. Provide secrets at **runtime** by name only — never in image layers:
   - `EXPO_TOKEN` (required)
   - `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
     `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (local signing)
   Mount the keystore read-only, e.g. `-v /secrets/verma.keystore:/keys/verma.keystore:ro`.
4. The container runs (manually):
   ```
   pnpm install --frozen-lockfile
   pnpm dlx eas-cli build --local -p android --profile preview \
     --non-interactive --output ./build-output/verma.apk
   ```
   Collect the APK from the mounted output volume.

## Path 3 — Bare prebuild + gradle (fallback, no EAS)

If EAS is unavailable, generate native projects and build with Gradle directly
inside the same image / toolchain. Commands (NOT run here):

```
pnpm --filter @app/mobile exec expo prebuild -p android --clean
cd apps/mobile/android
./gradlew assembleRelease     # APK  -> app/build/outputs/apk/release/
./gradlew bundleRelease       # AAB  -> app/build/outputs/bundle/release/
```

Signing is read from `android/gradle.properties` / `~/.gradle/gradle.properties`
populated from the keystore secret NAMES above at runtime. The generated
`apps/mobile/android/` directory is build output; do not commit it.

## Security invariants (all paths)

- Secrets referenced by **name** only; no values in this repo or any image layer.
- Keystores mounted at runtime, never committed, never baked.
- Docker image runs non-root (`builder`), base image pinned by digest.
- Builds are manual-trigger only; nothing runs on push/PR.
