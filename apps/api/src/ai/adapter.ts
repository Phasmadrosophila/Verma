import { z } from 'zod';
import { RedactedEntryMetadata } from '@app/shared';

export interface AiAdapterConfig {
  enabled: boolean;
  apiUrl: string;
  model: string;
  timeoutMs: number;
}

export const defaultConfig: AiAdapterConfig = {
  enabled: true,
  apiUrl: 'http://127.0.0.1:11434', // Ollama default
  model: 'llama3.2', // generic dev default, can be TBD
  timeoutMs: 10000,
};

export class AiAdapter {
  constructor(private config: AiAdapterConfig = defaultConfig) {}

  /**
   * Run Ask Your Vault inference.
   */
  async askVault(
    query: string,
    metadata: RedactedEntryMetadata[]
  ): Promise<{ answer: string; relevantEntryIds: string[] }> {
    if (!this.config.enabled) {
      return this.getFallbackResponse();
    }

    // Network denial: strictly enforce localhost/127.0.0.1
    if (!this.isLocalUrl(this.config.apiUrl)) {
      throw new Error('AI Adapter network denial: only local endpoints are permitted');
    }

    const prompt = this.buildPrompt(query, metadata);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(`${this.config.apiUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1, // low temperature for analytical tasks
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.getFallbackResponse();
      }

      const data = await response.json();
      return this.parseAndValidateResponse((data as any).response);
    } catch (error) {
      // Return fallback on timeout or fetch error
      return this.getFallbackResponse();
    }
  }

  private isLocalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1';
    } catch {
      return false;
    }
  }

  private buildPrompt(query: string, metadata: RedactedEntryMetadata[]): string {
    const safeMetadata = JSON.stringify(metadata, null, 2);
    return `You are a secure, local, read-only AI vault assistant.
You have no tools and cannot access the internet, filesystem, or vault secrets.
Analyze the following redacted metadata and answer the user's query.

Vault Metadata:
${safeMetadata}

User Query:
${query}

Respond ONLY with a valid JSON object in the following format:
{
  "answer": "your brief explanation here",
  "relevantEntryIds": ["id1", "id2"]
}`;
  }

  private parseAndValidateResponse(jsonString: string): { answer: string; relevantEntryIds: string[] } {
    try {
      const parsed = JSON.parse(jsonString);
      const schema = z.object({
        answer: z.string(),
        relevantEntryIds: z.array(z.string()),
      });
      return schema.parse(parsed);
    } catch (e) {
      // Malformed JSON or schema validation failure falls back safely
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse() {
    return {
      answer: 'AI inference is currently unavailable or disabled. Fallback to basic search.',
      relevantEntryIds: [],
    };
  }
}
