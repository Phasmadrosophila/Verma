import { z } from 'zod';
import {
  RedactedEntryMetadata,
  ColumnMapping,
  suggestColumnMappings,
} from '@app/shared';

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
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.getFallbackResponse();
      }

      const data = await response.json();
      return this.parseAndValidateResponse((data as any).response);
    } catch {
      // Return fallback on timeout or fetch error
      return this.getFallbackResponse();
    }
  }

  /**
   * Suggest column mappings and tags for Smart Import.
   * Enforces zero secret leakage and local-only endpoint denial.
   */
  async suggestImportMappings(
    columns: string[],
    sampleRows: Record<string, string>[] = []
  ): Promise<{ mappings: ColumnMapping[]; suggestedTags: string[] }> {
    // Network denial: strictly enforce localhost/127.0.0.1
    if (!this.isLocalUrl(this.config.apiUrl)) {
      throw new Error('AI Adapter network denial: only local endpoints are permitted');
    }

    if (!this.config.enabled) {
      return {
        mappings: suggestColumnMappings(columns),
        suggestedTags: [],
      };
    }

    // Redaction boundary: never pass raw password/secret values or note bodies to AI
    const sanitizedSamples = sampleRows.slice(0, 3).map((row) => {
      const safeRow: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        const normKey = key.toLowerCase().replace(/[\s_\-]+/g, '');
        const isSecretKey = [
          'password',
          'pass',
          'pwd',
          'secret',
          'totp',
          'token',
          'key',
          'seed',
          'phrase',
          'pin',
          'code',
          'private',
        ].some((pattern) => normKey.includes(pattern));
        const isNoteKey = [
          'note',
          'desc',
          'comment',
          'memo',
          'content',
          'body',
        ].some((pattern) => normKey.includes(pattern));

        if (isSecretKey) {
          safeRow[key] = '[REDACTED_SECRET]';
        } else if (isNoteKey) {
          safeRow[key] = '[REDACTED_NOTE]';
        } else {
          safeRow[key] = val;
        }
      }
      return safeRow;
    });

    const prompt = this.buildImportPrompt(columns, sanitizedSamples);

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
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          mappings: suggestColumnMappings(columns),
          suggestedTags: [],
        };
      }

      const data = await response.json();
      return this.parseAndValidateImportResponse((data as any).response, columns);
    } catch {
      return {
        mappings: suggestColumnMappings(columns),
        suggestedTags: [],
      };
    }
  }

  private isLocalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^\[|\]$/g, '');
      return host === '127.0.0.1' || host === 'localhost' || host === '::1';
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

  private buildImportPrompt(columns: string[], sampleRows: Record<string, string>[]): string {
    return `You are a secure, local, read-only AI vault assistant.
You have no tools and cannot access the internet or filesystem.
Analyze these CSV column headers and non-secret samples to suggest column mappings for Verma vault fields.
Valid target fields: "title", "username", "password", "url", "notes", "tags", "ignore".

CSV Columns:
${JSON.stringify(columns)}

Non-Secret Sample Metadata:
${JSON.stringify(sampleRows)}

Respond ONLY with a valid JSON object in the following format:
{
  "mappings": [
    { "sourceColumn": "columnName", "targetField": "title", "confidence": "high" }
  ],
  "suggestedTags": ["tag1", "tag2"]
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
    } catch {
      return this.getFallbackResponse();
    }
  }

  private parseAndValidateImportResponse(
    jsonString: string,
    columns: string[]
  ): { mappings: ColumnMapping[]; suggestedTags: string[] } {
    try {
      const parsed = JSON.parse(jsonString);
      const schema = z.object({
        mappings: z.array(
          z.object({
            sourceColumn: z.string(),
            targetField: z.enum(['title', 'username', 'password', 'url', 'notes', 'tags', 'ignore']),
            confidence: z.enum(['high', 'medium', 'low']).default('high'),
          })
        ),
        suggestedTags: z.array(z.string()).default([]),
      });

      const validated = schema.parse(parsed);
      const mappedColSet = new Set(validated.mappings.map((m) => m.sourceColumn));

      const finalMappings: ColumnMapping[] = validated.mappings.map((m) => ({
        sourceColumn: m.sourceColumn,
        targetField: m.targetField,
        confidence: m.confidence,
        suggestedBy: 'ai',
      }));

      // Fallback for any columns omitted by the AI
      const heuristics = suggestColumnMappings(columns);
      for (const h of heuristics) {
        if (!mappedColSet.has(h.sourceColumn)) {
          finalMappings.push(h);
        }
      }

      return {
        mappings: finalMappings,
        suggestedTags: validated.suggestedTags,
      };
    } catch {
      return {
        mappings: suggestColumnMappings(columns),
        suggestedTags: [],
      };
    }
  }

  private getFallbackResponse() {
    return {
      answer: 'AI inference is currently unavailable or disabled. Fallback to basic search.',
      relevantEntryIds: [],
    };
  }
}
