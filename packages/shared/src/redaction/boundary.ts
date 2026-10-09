import type { VaultEntry } from '../types/entry.js';
import type { RedactedEntryMetadata } from '../types/metadata.js';
import {
  projectEntriesMetadata,
  assertSafeMetadata,
  type ProjectionOptions,
} from './projection.js';
import type { LocalAiAdapter, AiInferenceResponse } from './fake-adapter.js';

export class VaultLockedError extends Error {
  constructor(message = 'Vault is locked. AI metadata access is strictly revoked.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}

export class RedactionSecurityError extends Error {
  public violations: string[];

  constructor(violations: string[]) {
    super(`Redaction Security Violation: ${violations.join('; ')}`);
    this.name = 'RedactionSecurityError';
    this.violations = violations;
  }
}

export interface LockStateProvider {
  isLocked(): boolean;
}

/**
 * Trusted Application Redaction Boundary.
 *
 * Implements the non-negotiable security boundary between the encrypted vault
 * and the Local AI process (PRD §9, AGENTS.md §3.1).
 *
 * Invariants:
 * 1. Executes in a separate trusted application layer prior to inference.
 * 2. Revokes metadata access immediately when vault is locked.
 * 3. Enforces allowlist-only metadata projection with zero secret fields.
 * 4. Explicitly excludes crypto wallet entries and metadata.
 */
export class TrustedRedactionBoundary {
  private adapter?: LocalAiAdapter;
  private lockProvider?: LockStateProvider;

  constructor(options: { adapter?: LocalAiAdapter; lockProvider?: LockStateProvider } = {}) {
    this.adapter = options.adapter;
    this.lockProvider = options.lockProvider;
  }

  /**
   * Projects raw vault entries into safe metadata for AI inference.
   * Throws VaultLockedError immediately if vault is locked.
   * Throws RedactionSecurityError if any secret field or pattern is detected.
   */
  prepareContext(
    entries: VaultEntry[],
    isLocked?: boolean,
    optionsMap?: Map<string, ProjectionOptions>
  ): RedactedEntryMetadata[] {
    const locked = isLocked !== undefined ? isLocked : (this.lockProvider?.isLocked() ?? false);

    if (locked) {
      throw new VaultLockedError();
    }

    const projected = projectEntriesMetadata(entries, optionsMap);

    // Verify every projected metadata item against its original entry
    const entryMap = new Map<string, VaultEntry>();
    for (const e of entries) {
      entryMap.set(e.id, e);
    }

    for (const meta of projected) {
      const original = entryMap.get(meta.id);
      if (original) {
        const check = assertSafeMetadata(meta, original);
        if (!check.isSafe) {
          throw new RedactionSecurityError(check.violations);
        }
      }
    }

    return projected;
  }

  /**
   * Invokes Local AI model inference with trusted redaction enforcement.
   * The model adapter receives ONLY the redacted metadata context.
   */
  async invokeModel(
    prompt: string,
    entries: VaultEntry[],
    isLocked?: boolean,
    optionsMap?: Map<string, ProjectionOptions>
  ): Promise<AiInferenceResponse> {
    if (!this.adapter) {
      throw new Error('No AI Model Adapter configured in TrustedRedactionBoundary');
    }

    // Step 1: Enforce lock state & project safe metadata in trusted layer
    const safeContext = this.prepareContext(entries, isLocked, optionsMap);

    // Step 2: Invoke model with allowlisted metadata projection only
    return await this.adapter.infer({
      prompt,
      context: safeContext,
    });
  }
}
