import 'server-only';

import { AIProviderError, type AIProviderRequest, type AIProviderResponse } from '../types';
import type { AIProvider } from './ai-provider';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ text?: string }>;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(input: AIProviderRequest): Promise<AIProviderResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          store: false,
          ...(input.responseMimeType ? { max_output_tokens: 6000 } : {}),
          instructions: input.systemInstruction,
          input: [
            ...input.history.map((message) => ({ role: message.role, content: message.content })),
            { role: 'user', content: input.message },
          ],
          ...(input.responseMimeType ? { text: { format: { type: 'json_object' } } } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({})) as OpenAIResponse;
      if (!response.ok) {
        console.warn('[ai] OpenAI generation failed', { status: response.status, reason: payload.error?.code || 'unknown' });
        throw new AIProviderError(response.status === 429 ? 'quota' : 'unavailable');
      }
      const answer = payload.output_text || payload.output
        ?.flatMap((item) => item.content || [])
        .map((part) => part.text || '')
        .join('')
        .trim();
      if (!answer) throw new AIProviderError('invalid_response');
      return { answer, provider: 'openai' };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError('unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
