/**
 * Fake Local AI Model Adapter
 * Test double used for verifying boundary isolation, zero leakage, and lock revocation.
 */

import { LocalAIAdapter, ModelInferenceOptions } from './adapter.js';

export interface RecordedCall<TInput> {
  input: TInput;
  options?: ModelInferenceOptions;
  timestamp: number;
}

export class FakeLocalAIAdapter<TInput = unknown, TOutput = unknown>
  implements LocalAIAdapter<TInput, TOutput>
{
  readonly modelName: string;
  private calls: Array<RecordedCall<TInput>> = [];
  private cannedResponse?: TOutput;
  private responseHandler?: (input: TInput, options?: ModelInferenceOptions) => Promise<TOutput> | TOutput;

  constructor(options?: {
    modelName?: string;
    cannedResponse?: TOutput;
    responseHandler?: (input: TInput, options?: ModelInferenceOptions) => Promise<TOutput> | TOutput;
  }) {
    this.modelName = options?.modelName ?? 'fake-local-llama-3b';
    this.cannedResponse = options?.cannedResponse;
    this.responseHandler = options?.responseHandler;
  }

  async execute(input: TInput, options?: ModelInferenceOptions): Promise<TOutput> {
    this.calls.push({
      input,
      options,
      timestamp: Date.now(),
    });

    if (this.responseHandler) {
      return this.responseHandler(input, options);
    }

    if (this.cannedResponse !== undefined) {
      return this.cannedResponse;
    }

    return {
      status: 'ok',
      message: 'mock inference response',
    } as unknown as TOutput;
  }

  getCallCount(): number {
    return this.calls.length;
  }

  getCalls(): ReadonlyArray<RecordedCall<TInput>> {
    return [...this.calls];
  }

  getLastInput(): TInput | undefined {
    return this.calls[this.calls.length - 1]?.input;
  }

  clear(): void {
    this.calls = [];
  }

  /**
   * Asserts that none of the given secret strings appear anywhere in the
   * serialized history of inputs received by this fake model adapter.
   */
  assertZeroSecretExposure(secretStrings: string[]): void {
    const serializedHistory = JSON.stringify(this.calls);

    for (const secret of secretStrings) {
      if (!secret || typeof secret !== 'string') continue;
      if (secret.length < 3) continue; // Skip trivial substrings

      if (serializedHistory.includes(secret)) {
        throw new Error(
          `Security violation: Secret string was leaked to model adapter: '${secret}'`
        );
      }
    }
  }
}
