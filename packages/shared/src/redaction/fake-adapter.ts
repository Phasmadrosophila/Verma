import type { RedactedEntryMetadata } from '../types/metadata.js';
import { DENIED_SECRET_FIELD_KEYS } from './constants.js';

export interface AiInferenceRequest {
  prompt: string;
  context: RedactedEntryMetadata[];
}

export interface AiInferenceResponse {
  result: string;
  structuredJson?: Record<string, unknown>;
}

export interface LocalAiAdapter {
  infer(request: AiInferenceRequest): Promise<AiInferenceResponse>;
}

/**
 * Fake Local AI Model Adapter for unit and integration testing.
 * Inspects all incoming payloads to verify zero secret-field leakage
 * and records inference history for test assertions.
 */
export class FakeLocalAiAdapter implements LocalAiAdapter {
  public recordedRequests: AiInferenceRequest[] = [];
  public customHandler?: (request: AiInferenceRequest) => Promise<AiInferenceResponse>;

  async infer(request: AiInferenceRequest): Promise<AiInferenceResponse> {
    // Record request for test inspection
    this.recordedRequests.push(request);

    // Verify invariant: incoming context items MUST NEVER contain denied keys
    for (const item of request.context) {
      for (const deniedKey of DENIED_SECRET_FIELD_KEYS) {
        if (deniedKey in item) {
          throw new Error(`Security Violation: Denied secret key "${deniedKey}" reached AI Adapter!`);
        }
      }
    }

    if (this.customHandler) {
      return this.customHandler(request);
    }

    return {
      result: `Processed query with ${request.context.length} metadata records`,
      structuredJson: {
        matchedCount: request.context.length,
        matchedIds: request.context.map((c) => c.id),
      },
    };
  }

  getCallCount(): number {
    return this.recordedRequests.length;
  }

  getLastRequest(): AiInferenceRequest | undefined {
    return this.recordedRequests[this.recordedRequests.length - 1];
  }

  reset(): void {
    this.recordedRequests = [];
    this.customHandler = undefined;
  }
}
