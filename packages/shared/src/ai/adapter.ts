/**
 * Local AI Model Adapter Interface
 * Defines the contract for executing inferences locally (via llama.cpp / sandbox).
 */

export interface ModelInferenceOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  responseFormat?: 'json' | 'text';
}

export interface ModelInferenceResult<T = unknown> {
  rawOutput: string;
  parsedJson?: T;
  latencyMs: number;
  model: string;
}

export interface LocalAIAdapter<TInput = unknown, TOutput = unknown> {
  readonly modelName: string;
  execute(input: TInput, options?: ModelInferenceOptions): Promise<TOutput>;
}
