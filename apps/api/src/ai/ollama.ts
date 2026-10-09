import { z } from 'zod';
import type { RedactedEntryMetadata } from '@app/shared';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:0.6b';

const searchResponseSchema = z.object({
  ids: z.array(z.string()).max(3)
});

export async function askYourVaultOllama(
  query: string,
  metadata: RedactedEntryMetadata[]
): Promise<string[] | null> {
  if (metadata.length === 0) {
    return [];
  }

  const systemPrompt = `You are a secure vault assistant. Your job is to match a user's natural language query to a provided list of redacted entry metadata.
You must return the IDs of the best matching entries (up to 3).
Your output must be strictly valid JSON matching this schema: { "ids": ["id1", "id2"] }
Do not include any markdown formatting, explanation, or other text. Only the JSON object.`;

  const userPrompt = `User Query: "${query}"

Redacted Metadata List:
${JSON.stringify(metadata, null, 2)}

Return the top matching IDs in the requested JSON format.`;

  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS) || 1500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { response: string };

    // Parse the JSON string from the response
    const parsedData = JSON.parse(data.response);

    // Validate with zod
    const result = searchResponseSchema.safeParse(parsedData);

    if (result.success) {
      return result.data.ids;
    } else {
      return null;
    }
  } catch {
    // Model offline or timeout - quiet graceful degradation
    return null;
  }
}
